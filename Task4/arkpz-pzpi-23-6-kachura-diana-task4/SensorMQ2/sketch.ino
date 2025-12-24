#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ==================== CONFIGURATION SECTION ====================
// WiFi Settings
const char* ssid = "Wokwi-GUEST";
const char* password = "";

// Server Settings
const char* serverUrl = "http://host.wokwi.internal:5195/sensor-readings";
const unsigned long POST_INTERVAL_MS = 30 * 1000 * 20;

// Sensor Settings
#define MQ2_PIN 34                    // GPIO pin for MQ2 analog output (ADC1_CH6 on ESP32)
#define HEATER_PIN 25                 // GPIO pin for MQ2 heater control (optional)
#define MQ2_POWER_PIN 26              // GPIO pin for MQ2 power control (optional)

// Calibration constants for MQ2
#define MQ2_RL 10.0                   // Load resistance on the board (in kilo ohms)
#define MQ2_RO_CLEAN_AIR 9.83         // Sensor resistance in clean air (Ro)
#define MQ2_VOLTAGE_RESOLUTION 3.3    // ESP32 ADC voltage resolution
#define MQ2_ADC_RESOLUTION 4095.0     // ESP32 12-bit ADC

// Sensor Metadata
const char* SENSOR_SERIAL = "MQ2-ESP32-001";      // Unique sensor identifier
const char* UNIT_AIR_QUALITY = "ppm";              // Parts per million
const char* DETECTED_GAS = "LPG/SMOKE/CO";         // Detected gases

// ==================== GLOBAL VARIABLES ====================
unsigned long lastPostTime = 0;
bool lastPostSuccessful = true;
unsigned long bootTime = 0;
float lastAirQuality = 0.0;
float lastGasConcentration = 0.0;
bool sensorWarmedUp = false;
unsigned long warmUpStart = 0;

// Predefined sensor data for testing
float sensorData[][3] = {
    {50.0, 100.0, 0},    // Good air quality
    {75.0, 250.0, 0},    // Moderate
    {120.0, 450.0, 1},   // Unhealthy for sensitive
    {180.0, 800.0, 1},   // Unhealthy
    {280.0, 1500.0, 2},  // Very unhealthy
    {350.0, 2500.0, 2},  // Hazardous
    {450.0, 4000.0, 2}   // Dangerous
};
int dataIndex = 0;

// Helper function to print separator line
void printSeparator(char symbol = '=', int length = 50) {
    for (int i = 0; i < length; i++) {
        Serial.print(symbol);
    }
    Serial.println();
}

// ==================== FUNCTION DECLARATIONS ====================
void initializeWiFi();
bool readMQ2Data(float &airQuality, float &gasConcentration, String &primaryGas);
void logSensorReading(float airQuality, float gasConcentration, const String& primaryGas, bool sensorHealthy);
void transmitSensorData(float airQuality, float gasConcentration, const String& primaryGas);
String constructJsonPayload(float airQuality, float gasConcentration, const String& primaryGas, float dataQuality = 1.0);
void parseServerResponse(String response, int httpCode);
void displaySystemStatus();
float calculateDataQuality(float gasConcentration, const String& primaryGas);
String detectPrimaryGas(float lpgConc, float smokeConc, float coConc);
void controlHeater(bool enable);
String getPrimaryGasFromIndex(int index);

// ==================== WIFI INITIALIZATION ====================
void initializeWiFi() {
    Serial.println("[WiFi] Initializing connection...");
    WiFi.begin(ssid, password, 6);
    
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
bool readMQ2Data(float &airQuality, float &gasConcentration, String &primaryGas) {
    unsigned long currentTime = millis();
    
    // First time initialization
    if (!sensorWarmedUp && warmUpStart == 0) {
        Serial.println("[Sensor] Warming up MQ2 sensor (30 seconds required)...");
        controlHeater(true);
        warmUpStart = currentTime;
        return false;
    }
    
    // Check if warm-up period is complete
    if (currentTime - warmUpStart < 30000) {
        unsigned long remaining = (30000 - (currentTime - warmUpStart)) / 1000;
        if (remaining % 5 == 0) {
            Serial.print("[Sensor] Warming up... ");
            Serial.print(remaining);
            Serial.println(" seconds remaining");
        }
        return false;
    }
    
    // Mark sensor as warmed up
    if (!sensorWarmedUp) {
        sensorWarmedUp = true;
        Serial.println("[Sensor] ✓ Warm-up complete!");
    }
    
    // Use predefined sensor data instead of analog readings
    if (dataIndex >= sizeof(sensorData)/sizeof(sensorData[0])) {
        dataIndex = 0;
    }
    
    // Get data from predefined array
    airQuality = sensorData[dataIndex][0];
    gasConcentration = sensorData[dataIndex][1];
    int gasIndex = (int)sensorData[dataIndex][2];
    
    primaryGas = getPrimaryGasFromIndex(gasIndex);
    
    // Move to next data point
    dataIndex++;
    
    // Update last readings
    lastAirQuality = airQuality;
    lastGasConcentration = gasConcentration;
    
    Serial.print("[Sensor] Generated data - AQI: ");
    Serial.print(airQuality);
    Serial.print(", Gas: ");
    Serial.print(gasConcentration);
    Serial.print(" ppm, Primary: ");
    Serial.println(primaryGas);
    
    return true;
}

String getPrimaryGasFromIndex(int index) {
    switch(index) {
        case 0: return "LPG";
        case 1: return "SMOKE";
        case 2: return "CO";
        default: return "LPG";
    }
}

// ==================== GAS DETECTION ====================
String detectPrimaryGas(float lpgConc, float smokeConc, float coConc) {
    if (lpgConc >= smokeConc && lpgConc >= coConc) {
        return "LPG";
    } else if (smokeConc >= lpgConc && smokeConc >= coConc) {
        return "SMOKE";
    } else {
        return "CO";
    }
}

// ==================== HEATER CONTROL ====================
void controlHeater(bool enable) {
#ifdef HEATER_PIN
    digitalWrite(HEATER_PIN, enable ? HIGH : LOW);
    if (enable) {
        Serial.println("[Sensor] MQ2 heater enabled");
    }
#endif
}

// ==================== DATA QUALITY ASSESSMENT ====================
float calculateDataQuality(float gasConcentration, const String& primaryGas) {
    float qualityScore = 1.0;
    
    if (gasConcentration > 10000) {
        qualityScore -= 0.5;
    }
    
    static float lastConcentration = 0;
    if (lastConcentration > 0) {
        float change = abs(gasConcentration - lastConcentration) / lastConcentration;
        if (change > 0.5) {
            qualityScore -= 0.2;
        }
    }
    lastConcentration = gasConcentration;
    
    if (millis() < 45000) {
        qualityScore -= 0.3;
    }
    
    return constrain(qualityScore, 0.0, 1.0);
}

// ==================== JSON PAYLOAD CONSTRUCTION ====================
String constructJsonPayload(float airQuality, float gasConcentration, const String& primaryGas, float dataQuality) {
    StaticJsonDocument<512> jsonDoc;
    
    jsonDoc["sensorSerialNumber"] = SENSOR_SERIAL;
    jsonDoc["sensorType"] = "AIR_QUALITY";
    jsonDoc["value"] = airQuality;
    jsonDoc["unit"] = "AQI";
    jsonDoc["quality"] = dataQuality;
    
    char timestampBuffer[25];
    sprintf(timestampBuffer, "2024-01-01T12:00:00.000Z");
    
    
    JsonObject metadata = jsonDoc.createNestedObject("metadata");
    metadata["gasConcentration"] = gasConcentration;
    metadata["gasConcentrationUnit"] = UNIT_AIR_QUALITY;
    metadata["primaryDetectedGas"] = primaryGas;
    metadata["detectedGases"] = DETECTED_GAS;
    metadata["sensorModel"] = "MQ-2";
    metadata["sensorHeaterStatus"] = "ON";
    metadata["firmwareVersion"] = "2.0.0";
    metadata["readingType"] = "air_quality";
    metadata["location"] = "indoor";
    
    JsonObject gasReadings = metadata.createNestedObject("gasReadings");
    gasReadings["lpg_ppm"] = gasConcentration * 0.4;
    gasReadings["smoke_ppm"] = gasConcentration * 0.3;
    gasReadings["co_ppm"] = gasConcentration * 0.3;
    
    JsonObject systemInfo = jsonDoc.createNestedObject("system");
    systemInfo["uptime"] = millis() / 1000;
    systemInfo["wifiRssi"] = WiFi.RSSI();
    systemInfo["freeHeap"] = ESP.getFreeHeap();
    systemInfo["sensorWarmupComplete"] = sensorWarmedUp;
    
    String payload;
    serializeJson(jsonDoc, payload);
    
    Serial.println("[JSON] Constructed payload:");
    serializeJsonPretty(jsonDoc, Serial);
    Serial.println();
    
    return payload;
}

// ==================== DATA TRANSMISSION ====================
void transmitSensorData(float airQuality, float gasConcentration, const String& primaryGas) {
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
    
    httpClient.begin(serverUrl);
    httpClient.addHeader("Content-Type", "application/json");
    httpClient.addHeader("Accept", "application/json");
    httpClient.addHeader("X-Sensor-Model", "MQ-2");
    httpClient.addHeader("X-Firmware-Version", "2.0.0");
    httpClient.addHeader("X-Gas-Sensor", "true");
    
    float dataQuality = calculateDataQuality(gasConcentration, primaryGas);
    String jsonPayload = constructJsonPayload(airQuality, gasConcentration, primaryGas, dataQuality);
    
    Serial.print("[HTTP] Payload size: ");
    Serial.print(jsonPayload.length());
    Serial.println(" bytes");
    Serial.println("[HTTP] Sending POST request...");
    
    int httpResponseCode = httpClient.POST(jsonPayload);
    
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
    
    httpClient.end();
    Serial.println("[HTTP] Connection closed");
}

// ==================== RESPONSE PARSING ====================
void parseServerResponse(String response, int httpCode) {
    if (httpCode == 201 || httpCode == 200) {
        DynamicJsonDocument responseDoc(512);
        DeserializationError error = deserializeJson(responseDoc, response);
        
        if (error) {
            Serial.print("[Response] ✗ Failed to parse JSON: ");
            Serial.println(error.c_str());
            return;
        }
        
        if (responseDoc.containsKey("id")) {
            Serial.print("[Response] ✓ Reading ID assigned: ");
            Serial.println(responseDoc["id"].as<String>());
        }
        
        if (responseDoc.containsKey("thresholdViolations")) {
            JsonArray violations = responseDoc["thresholdViolations"];
            if (violations.size() > 0) {
                Serial.println("[Response] ⚠️  GAS THRESHOLD VIOLATIONS DETECTED!");
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
                Serial.println("[Response] ✓ Air quality within safe limits");
            }
        }
        
        if (responseDoc.containsKey("quality")) {
            Serial.print("[Response] Data quality score: ");
            Serial.println(responseDoc["quality"].as<float>());
        }
    }
}

// ==================== SENSOR LOGGING ====================
void logSensorReading(float airQuality, float gasConcentration, const String& primaryGas, bool sensorHealthy) {
    Serial.println();
    printSeparator('=', 50);
    Serial.println("GAS SENSOR READING REPORT");
    printSeparator('=', 50);
    
    Serial.print("Sensor Serial: ");
    Serial.println(SENSOR_SERIAL);
    
    Serial.print("Sensor Status: ");
    Serial.println(sensorHealthy ? "HEALTHY ✓" : "UNHEALTHY ✗");
    
    Serial.print("Sensor Warmup: ");
    Serial.println(sensorWarmedUp ? "COMPLETE ✓" : "IN PROGRESS ⏳");
    
    if (sensorHealthy) {
        Serial.print("Air Quality Index: ");
        Serial.print(airQuality, 1);
        Serial.println(" AQI");
        
        Serial.print("Total Gas Concentration: ");
        Serial.print(gasConcentration, 1);
        Serial.print(" ");
        Serial.println(UNIT_AIR_QUALITY);
        
        Serial.print("Primary Detected Gas: ");
        Serial.println(primaryGas);
        
        Serial.print("Air Quality Level: ");
        if (airQuality <= 50) Serial.println("GOOD (Safe)");
        else if (airQuality <= 100) Serial.println("MODERATE (Acceptable)");
        else if (airQuality <= 150) Serial.println("UNHEALTHY for Sensitive Groups");
        else if (airQuality <= 200) Serial.println("UNHEALTHY");
        else if (airQuality <= 300) Serial.println("VERY UNHEALTHY");
        else Serial.println("HAZARDOUS ⚠️");
        
        Serial.print("Gas Level: ");
        if (gasConcentration < 300) Serial.println("NORMAL (Background level)");
        else if (gasConcentration < 1000) Serial.println("ELEVATED (Monitor)");
        else if (gasConcentration < 5000) Serial.println("HIGH (Check for leaks)");
        else Serial.println("DANGEROUS (Potential hazard!)");
        
        float quality = calculateDataQuality(gasConcentration, primaryGas);
        Serial.print("Data Quality Score: ");
        Serial.print(quality * 100);
        Serial.println("%");
    }
    
    printSeparator('-', 50);
}

// ==================== SYSTEM STATUS DISPLAY ====================
void displaySystemStatus() {
    printSeparator('=', 50);
    Serial.println("SYSTEM STATUS - MQ2 GAS MONITOR");
    printSeparator('=', 50);
    
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
    
    Serial.print("MQ2 Sensor: ");
    Serial.println(sensorWarmedUp ? "OPERATIONAL ✓" : "INITIALIZING ⏳");
    
    Serial.print("Sensor Warmup: ");
    if (!sensorWarmedUp && warmUpStart > 0) {
        unsigned long remaining = (30000 - (millis() - warmUpStart)) / 1000;
        if (remaining < 0) remaining = 0;
        Serial.print("IN PROGRESS (");
        Serial.print(remaining);
        Serial.println("s remaining)");
    } else if (sensorWarmedUp) {
        Serial.println("COMPLETE ✓");
    } else {
        Serial.println("NOT STARTED");
    }
    
    if (lastGasConcentration > 0) {
        Serial.print("Last Gas Reading: ");
        Serial.print(lastGasConcentration, 1);
        Serial.println(" ppm");
    }
    
    Serial.print("Last Transmission: ");
    Serial.println(lastPostSuccessful ? "SUCCESSFUL ✓" : "FAILED ✗");
    
    Serial.print("Free Heap Memory: ");
    Serial.print(ESP.getFreeHeap());
    Serial.println(" bytes");
    
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
    Serial.begin(115200);
    delay(1000);
    
    Serial.println();
    printSeparator('=', 50);
    Serial.println("ESP32 MQ2 GAS SENSOR MONITOR");
    Serial.println("Version 2.0.0 | Detects: LPG, Smoke, CO");
    Serial.println("Warm-up time: 30 seconds required");
    printSeparator('=', 50);
    
    bootTime = millis();
    warmUpStart = millis();
    
    Serial.println("[Init] Configuring MQ2 sensor pins...");
    pinMode(MQ2_PIN, INPUT);
    
#ifdef HEATER_PIN
    pinMode(HEATER_PIN, OUTPUT);
    Serial.println("[Init] MQ2 heater control enabled");
#endif
    
#ifdef MQ2_POWER_PIN
    pinMode(MQ2_POWER_PIN, OUTPUT);
    digitalWrite(MQ2_POWER_PIN, HIGH);
    Serial.println("[Init] MQ2 power control enabled");
#endif
    
    controlHeater(true);
    
    Serial.println("[Init] MQ2 sensor initializing (requires 30s warm-up)");
    
    initializeWiFi();
    
    displaySystemStatus();
    
    lastPostTime = millis() - POST_INTERVAL_MS;
    
    Serial.println("[Init] System initialization complete");
    Serial.println("[Init] Starting main monitoring loop...\n");
}

// ==================== MAIN LOOP ====================
void loop() {
    unsigned long currentTime = millis();
    
    if (!sensorWarmedUp && currentTime - warmUpStart < 30000) {
        static unsigned long lastWarmupMsg = 0;
        if (currentTime - lastWarmupMsg >= 5000) {
            unsigned long remaining = (30000 - (currentTime - warmUpStart)) / 1000;
            Serial.print("[Sensor] Warming up... ");
            Serial.print(remaining);
            Serial.println(" seconds remaining");
            lastWarmupMsg = currentTime;
        }
        delay(1000);
        return;
    }
    
    if (currentTime - lastPostTime >= POST_INTERVAL_MS) {
        Serial.println("\n[Schedule] Scheduled transmission initiated");
        
        float airQuality, gasConcentration;
        String primaryGas;
        bool sensorDataValid = readMQ2Data(airQuality, gasConcentration, primaryGas);
        
        if (sensorDataValid) {
            logSensorReading(airQuality, gasConcentration, primaryGas, true);
            transmitSensorData(airQuality, gasConcentration, primaryGas);
        } else {
            logSensorReading(0, 0, "NONE", false);
            Serial.println("[Schedule] Transmission skipped - invalid sensor data");
        }
        
        lastPostTime = currentTime;
        Serial.print("[Schedule] Next transmission in ");
        Serial.print(POST_INTERVAL_MS / 60000);
        Serial.println(" minutes");
    }
    
    static unsigned long lastStatusTime = 0;
    if (currentTime - lastStatusTime >= 60000) {
        displaySystemStatus();
        lastStatusTime = currentTime;
    }
    
    static unsigned long lastQuickCheck = 0;
    if (currentTime - lastQuickCheck >= 5000) {
        float airQuality, gasConcentration;
        String primaryGas;
        if (readMQ2Data(airQuality, gasConcentration, primaryGas)) {
            if (gasConcentration > 5000) {
                Serial.println("\n⚠️ ⚠️ ⚠️  EMERGENCY: HIGH GAS CONCENTRATION DETECTED!");
                Serial.print("Concentration: ");
                Serial.print(gasConcentration);
                Serial.println(" ppm");
                Serial.print("Primary Gas: ");
                Serial.println(primaryGas);
                Serial.println("Take immediate action!");
                printSeparator('!', 50);
            }
        }
        lastQuickCheck = currentTime;
    }
    
    delay(100);
}