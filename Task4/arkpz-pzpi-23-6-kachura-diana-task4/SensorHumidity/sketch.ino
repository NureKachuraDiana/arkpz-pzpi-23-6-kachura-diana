#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <DHT.h>

// ==================== CONFIGURATION SECTION ====================
// WiFi Settings
const char* ssid = "Wokwi-GUEST";
const char* password = "";

// Server Settings
const char* serverUrl = "http://host.wokwi.internal:5195/sensor-readings";
const unsigned long POST_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes in milliseconds

// Sensor Settings
#define DHT_PIN 4               // GPIO pin for DHT22 data connection
#define DHT_TYPE DHT22          // Sensor model
DHT dht(DHT_PIN, DHT_TYPE);

// Sensor Metadata
const char* SENSOR_SERIAL = "DHT22-ESP32-001";  // Unique sensor identifier
const char* UNIT_HUMIDITY = "%";                // Humidity measurement unit
const char* UNIT_TEMPERATURE = "°C";            // Temperature measurement unit

// ==================== GLOBAL VARIABLES ====================
unsigned long lastPostTime = 0;
bool lastPostSuccessful = true;
unsigned long bootTime = 0;

// Helper function to print separator line
void printSeparator(char symbol = '=', int length = 50) {
    for (int i = 0; i < length; i++) {
        Serial.print(symbol);
    }
    Serial.println();
}

// ==================== FUNCTION DECLARATIONS ====================
void initializeWiFi();
bool readDHT22Data(float &humidity, float &temperature);
void logSensorReading(float humidity, float temperature, bool sensorHealthy);
void transmitSensorData(float humidity, float temperature);
String constructJsonPayload(float humidity, float temperature, float dataQuality = 1.0);
void parseServerResponse(String response, int httpCode);
void displaySystemStatus();
float calculateDataQuality(float humidity, float temperature);

// ==================== WIFI INITIALIZATION ====================
void initializeWiFi() {
    Serial.println("[WiFi] Initializing connection...");
    WiFi.begin(ssid, password, 6); // Channel 6 for better stability
    
    Serial.print("[WiFi] Connecting to network");
    int connectionAttempts = 0;
    const int MAX_ATTEMPTS = 30;
    
    while (WiFi.status() != WL_CONNECTED && connectionAttempts < MAX_ATTEMPTS) {
        delay(500);
        Serial.print(".");
        connectionAttempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n[WiFi] ✓ Connection established successfully!");
        Serial.print("[WiFi] IP Address: ");
        Serial.println(WiFi.localIP());
        Serial.print("[WiFi] Signal Strength (RSSI): ");
        Serial.print(WiFi.RSSI());
        Serial.println(" dBm");
    } else {
        Serial.println("\n[WiFi] ✗ Failed to establish connection!");
        Serial.println("[WiFi] Check network settings and try again.");
    }
}

// ==================== SENSOR DATA READING ====================
bool readDHT22Data(float &humidity, float &temperature) {
    // Reading humidity and temperature from DHT22
    humidity = dht.readHumidity();
    temperature = dht.readTemperature(); // Celsius by default
    
    // Validate sensor readings
    if (isnan(humidity) || isnan(temperature)) {
        Serial.println("[Sensor] ✗ Failed to read data from DHT22!");
        Serial.println("[Sensor] Possible causes:");
        Serial.println("[Sensor]  - Sensor not properly connected");
        Serial.println("[Sensor]  - Missing pull-up resistor (4.7kΩ - 10kΩ)");
        Serial.println("[Sensor]  - Sensor damaged or unresponsive");
        return false;
    }
    
    // Validate data ranges (DHT22 specifications)
    bool humidityValid = (humidity >= 0.0 && humidity <= 100.0);
    bool temperatureValid = (temperature >= -40.0 && temperature <= 80.0);
    
    if (!humidityValid || !temperatureValid) {
        Serial.println("[Sensor] ⚠️  Reading outside sensor specifications:");
        if (!humidityValid) {
            Serial.print("[Sensor] Humidity out of range (0-100%): ");
            Serial.println(humidity);
        }
        if (!temperatureValid) {
            Serial.print("[Sensor] Temperature out of range (-40°C to 80°C): ");
            Serial.println(temperature);
        }
        return false;
    }
    
    return true;
}

// ==================== DATA QUALITY ASSESSMENT ====================
float calculateDataQuality(float humidity, float temperature) {
    float qualityScore = 1.0; // Start with perfect score
    
    // Deduct points for extreme humidity values
    if (humidity < 10.0 || humidity > 90.0) {
        qualityScore -= 0.2;
    }
    
    // Deduct points for extreme temperature values
    if (temperature < 0.0 || temperature > 50.0) {
        qualityScore -= 0.2;
    }
    
    // Deduct points if humidity is at saturation (common sensor error)
    if (humidity > 99.5) {
        qualityScore -= 0.3;
    }
    
    // Ensure quality stays within valid range [0.0, 1.0]
    return constrain(qualityScore, 0.0, 1.0);
}

// ==================== JSON PAYLOAD CONSTRUCTION ====================
String constructJsonPayload(float humidity, float temperature, float dataQuality) {
    StaticJsonDocument<384> jsonDoc; // Increased size for metadata
    
    // Required fields for your API
    jsonDoc["sensorSerialNumber"] = SENSOR_SERIAL;
    jsonDoc["value"] = humidity; // Primary value is humidity
    jsonDoc["unit"] = UNIT_HUMIDITY;
    jsonDoc["quality"] = dataQuality;
    
    // Generate ISO 8601 timestamp
    char timestampBuffer[25];
    // Note: For production, use proper time synchronization (NTP)
    sprintf(timestampBuffer, "2024-01-01T12:00:00.000Z");
  
    
    // Additional sensor metadata
    JsonObject metadata = jsonDoc.createNestedObject("metadata");
    metadata["temperature"] = temperature;
    metadata["temperatureUnit"] = UNIT_TEMPERATURE;
    metadata["sensorModel"] = "DHT22";
    metadata["firmwareVersion"] = "2.0.0";
    metadata["readingType"] = "humidity";
    metadata["location"] = "indoor"; // Change based on deployment
    
    // System diagnostics
    JsonObject systemInfo = jsonDoc.createNestedObject("system");
    systemInfo["uptime"] = millis() / 1000;
    systemInfo["wifiRssi"] = WiFi.RSSI();
    systemInfo["freeHeap"] = ESP.getFreeHeap();
    
    String payload;
    serializeJson(jsonDoc, payload);
    
    // Debug output
    Serial.println("[JSON] Constructed payload:");
    serializeJsonPretty(jsonDoc, Serial);
    Serial.println();
    
    return payload;
}

// ==================== DATA TRANSMISSION ====================
void transmitSensorData(float humidity, float temperature) {
    // Verify WiFi connection
    if (WiFi.status() != WL_CONNECTED) {
        Serial.println("[HTTP] ✗ WiFi not connected. Attempting reconnection...");
        initializeWiFi();
        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("[HTTP] ✗ Cannot send data - WiFi unavailable");
            return;
        }
    }
    
    HTTPClient httpClient;
    
    Serial.println("[HTTP] Initializing transmission...");
    Serial.print("[HTTP] Target URL: ");
    Serial.println(serverUrl);
    
    // Configure HTTP client
    httpClient.begin(serverUrl);
    httpClient.addHeader("Content-Type", "application/json");
    httpClient.addHeader("Accept", "application/json");
    httpClient.addHeader("X-Sensor-Model", "DHT22");
    httpClient.addHeader("X-Firmware-Version", "2.0.0");
    
    // Calculate data quality and construct payload
    float dataQuality = calculateDataQuality(humidity, temperature);
    String jsonPayload = constructJsonPayload(humidity, temperature, dataQuality);
    
    Serial.print("[HTTP] Payload size: ");
    Serial.print(jsonPayload.length());
    Serial.println(" bytes");
    Serial.println("[HTTP] Sending POST request...");
    
    // Execute POST request
    int httpResponseCode = httpClient.POST(jsonPayload);
    
    // Process response
    if (httpResponseCode > 0) {
        Serial.print("[HTTP] ✓ Server responded with code: ");
        Serial.println(httpResponseCode);
        
        String serverResponse = httpClient.getString();
        Serial.print("[HTTP] Response body: ");
        Serial.println(serverResponse);
        
        parseServerResponse(serverResponse, httpResponseCode);
        lastPostSuccessful = true;
        
    } else {
        Serial.print("[HTTP] ✗ Request failed with error: ");
        Serial.println(httpResponseCode);
        Serial.print("[HTTP] Error details: ");
        Serial.println(httpClient.errorToString(httpResponseCode));
        
        lastPostSuccessful = false;
    }
    
    // Cleanup
    httpClient.end();
    Serial.println("[HTTP] Connection closed");
}

// ==================== RESPONSE PARSING ====================
void parseServerResponse(String response, int httpCode) {
    // Successful creation (201) or OK (200)
    if (httpCode == 201 || httpCode == 200) {
        DynamicJsonDocument responseDoc(512);
        DeserializationError error = deserializeJson(responseDoc, response);
        
        if (error) {
            Serial.print("[Response] ✗ Failed to parse JSON: ");
            Serial.println(error.c_str());
            return;
        }
        
        // Extract reading ID
        if (responseDoc.containsKey("id")) {
            Serial.print("[Response] ✓ Reading ID assigned: ");
            Serial.println(responseDoc["id"].as<String>());
        }
        
        // Check for threshold violations
        if (responseDoc.containsKey("thresholdViolations")) {
            JsonArray violations = responseDoc["thresholdViolations"];
            if (violations.size() > 0) {
                Serial.println("[Response] ⚠️  Threshold violations detected:");
                for (JsonObject violation : violations) {
                    Serial.print("    - Type: ");
                    Serial.print(violation["type"].as<String>());
                    Serial.print(", Severity: ");
                    Serial.print(violation["severity"].as<String>());
                    if (violation.containsKey("message")) {
                        Serial.print(", Message: ");
                        Serial.print(violation["message"].as<String>());
                    }
                    Serial.println();
                }
            } else {
                Serial.println("[Response] ✓ No threshold violations");
            }
        }
        
        // Log quality score if provided
        if (responseDoc.containsKey("quality")) {
            Serial.print("[Response] Quality score: ");
            Serial.println(responseDoc["quality"].as<float>());
        }
    }
}

// ==================== SENSOR LOGGING ====================
void logSensorReading(float humidity, float temperature, bool sensorHealthy) {
    Serial.println();
    printSeparator('=', 50);
    Serial.println("SENSOR READING REPORT");
    printSeparator('=', 50);
    
    Serial.print("Sensor Serial: ");
    Serial.println(SENSOR_SERIAL);
    
    Serial.print("Sensor Status: ");
    Serial.println(sensorHealthy ? "HEALTHY ✓" : "UNHEALTHY ✗");
    
    if (sensorHealthy) {
        Serial.print("Humidity: ");
        Serial.print(humidity, 1); // 1 decimal place
        Serial.print(" ");
        Serial.println(UNIT_HUMIDITY);
        
        Serial.print("Temperature: ");
        Serial.print(temperature, 1);
        Serial.print(" ");
        Serial.println(UNIT_TEMPERATURE);
        
        // Humidity interpretation
        Serial.print("Humidity Level: ");
        if (humidity < 20.0) Serial.println("Very Dry");
        else if (humidity < 30.0) Serial.println("Dry");
        else if (humidity < 50.0) Serial.println("Comfortable");
        else if (humidity < 65.0) Serial.println("Moderate");
        else if (humidity < 80.0) Serial.println("Humid");
        else Serial.println("Very Humid (Risk of Condensation)");
        
        // Data quality assessment
        float quality = calculateDataQuality(humidity, temperature);
        Serial.print("Data Quality Score: ");
        Serial.print(quality * 100);
        Serial.println("%");
    }
    
    printSeparator('-', 50);
}

// ==================== SYSTEM STATUS DISPLAY ====================
void displaySystemStatus() {
    printSeparator('=', 50);
    Serial.println("SYSTEM STATUS");
    printSeparator('=', 50);
    
    // WiFi Status
    Serial.print("WiFi Connection: ");
    if (WiFi.status() == WL_CONNECTED) {
        Serial.print("CONNECTED ✓ (");
        Serial.print(WiFi.RSSI());
        Serial.println(" dBm)");
        Serial.print("IP Address: ");
        Serial.println(WiFi.localIP());
    } else {
        Serial.println("DISCONNECTED ✗");
    }
    
    // Sensor Status
    float testHumidity, testTemperature;
    bool sensorWorking = readDHT22Data(testHumidity, testTemperature);
    Serial.print("DHT22 Sensor: ");
    Serial.println(sensorWorking ? "OPERATIONAL ✓" : "FAILED ✗");
    
    // Transmission Status
    Serial.print("Last Transmission: ");
    Serial.println(lastPostSuccessful ? "SUCCESSFUL ✓" : "FAILED ✗");
    
    // Memory Status
    Serial.print("Free Heap Memory: ");
    Serial.print(ESP.getFreeHeap());
    Serial.println(" bytes");
    
    // Next Transmission
    unsigned long secondsUntilNext = (POST_INTERVAL_MS - (millis() - lastPostTime)) / 1000;
    if (secondsUntilNext > POST_INTERVAL_MS / 1000) {
        secondsUntilNext = 0;
    }
    Serial.print("Next Transmission in: ");
    Serial.print(secondsUntilNext / 60);
    Serial.print(" minutes ");
    Serial.print(secondsUntilNext % 60);
    Serial.println(" seconds");
    
    printSeparator('=', 50);
    Serial.println();
}

// ==================== SETUP FUNCTION ====================
void setup() {
    // Initialize Serial Communication
    Serial.begin(115200);
    delay(1000); // Wait for serial monitor initialization
    
    Serial.println();
    printSeparator('=', 50);
    Serial.println("ESP32 DHT22 HUMIDITY MONITOR");
    Serial.println("Version 2.0.0 | 4-Pin DHT22 Configuration");
    printSeparator('=', 50);
    
    bootTime = millis();
    
    // Initialize DHT22 Sensor
    Serial.println("[Init] Starting DHT22 sensor...");
    dht.begin();
    delay(2000); // DHT22 requires 2-second stabilization time
    Serial.println("[Init] DHT22 sensor ready");
    
    // Connect to WiFi
    initializeWiFi();
    
    // Initial sensor reading and log
    float initialHumidity, initialTemperature;
    if (readDHT22Data(initialHumidity, initialTemperature)) {
        logSensorReading(initialHumidity, initialTemperature, true);
    }
    
    // Schedule first transmission immediately
    lastPostTime = millis() - POST_INTERVAL_MS;
    
    Serial.println("[Init] System initialization complete");
    Serial.println("[Init] Starting main monitoring loop...\n");
}

// ==================== MAIN LOOP ====================
void loop() {
    unsigned long currentTime = millis();
    
    // Periodic data transmission (every 10 minutes)
    if (currentTime - lastPostTime >= POST_INTERVAL_MS) {
        Serial.println("\n[Schedule] Scheduled transmission initiated");
        
        float humidity, temperature;
        bool sensorDataValid = readDHT22Data(humidity, temperature);
        
        if (sensorDataValid) {
            logSensorReading(humidity, temperature, true);
            transmitSensorData(humidity, temperature);
        } else {
            logSensorReading(0, 0, false);
            Serial.println("[Schedule] Transmission skipped - invalid sensor data");
        }
        
        lastPostTime = currentTime;
        Serial.print("[Schedule] Next transmission in ");
        Serial.print(POST_INTERVAL_MS / 60000);
        Serial.println(" minutes");
    }
    
    // Periodic status display (every 60 seconds)
    static unsigned long lastStatusTime = 0;
    if (currentTime - lastStatusTime >= 60000) {
        displaySystemStatus();
        lastStatusTime = currentTime;
    }
    
    // Short delay to prevent watchdog timer issues
    delay(100);
}