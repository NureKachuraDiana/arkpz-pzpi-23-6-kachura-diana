#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

// ==================== CONFIGURATION SECTION ====================
// WiFi Settings
const char* ssid = "Wokwi-GUEST";
const char* password = "";

// Server Settings
const char* serverUrl = "http://host.wokwi.internal:5195/sensor-readings";
const unsigned long POST_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes in milliseconds

// Sensor Settings
#define TEMP_SENSOR_PIN 35          // GPIO pin for NTS analog output (ADC1_CH7 on ESP32)

// NTC sensor constants
#define TEMP_VOLTAGE_REF 3.3        // ESP32 ADC voltage reference
#define TEMP_ADC_RESOLUTION 4095.0  // ESP32 12-bit ADC
#define NTC_BETA 3950.0             // Beta coefficient for NTC thermistor
#define NTC_R0 10000.0              // Resistance at 25°C (10kΩ)
#define NTC_R_SERIES 10000.0        // Series resistor value (10kΩ)
#define NTC_T0 298.15               // Reference temperature in Kelvin (25°C)

// Temperature thresholds (°C)
#define TEMP_LOW_THRESHOLD 10.0     // Cold temperature
#define TEMP_HIGH_THRESHOLD 30.0    // Warm temperature
#define TEMP_CRITICAL_THRESHOLD 65.0 // Critical temperature

// Sensor Metadata
const char* SENSOR_SERIAL = "NTS-ESP32-001";   // Unique sensor identifier
const char* UNIT_TEMPERATURE = "°C";           // Degrees Celsius
const char* SENSOR_TYPE = "TEMPERATURE";       // Sensor type

// ==================== GLOBAL VARIABLES ====================
unsigned long lastPostTime = 0;
bool lastPostSuccessful = true;
unsigned long bootTime = 0;
float lastTemperature = 0.0;
bool sensorInitialized = false;
bool usingSimulatedData = false;
bool firstTransmissionDone = false;

// Backup temperature values for validation fails
float backupTemperatures[] = {-2.0, 2.0, 3.0, 1.0, 0.0, 5.0};
const int BACKUP_COUNT = sizeof(backupTemperatures) / sizeof(backupTemperatures[0]);

// Simulated temperature data for when sensor fails
float simulatedTemperatures[] = {
    18.5, 20.0, 22.3, 25.1, 28.7, 31.2, 35.8, 19.8, 23.5, 27.9
};
const int SIMULATED_COUNT = sizeof(simulatedTemperatures) / sizeof(simulatedTemperatures[0]);

// Helper function to print separator line
void printSeparator(char symbol = '=', int length = 50) {
    for (int i = 0; i < length; i++) {
        Serial.print(symbol);
    }
    Serial.println();
}

// ==================== FUNCTION DECLARATIONS ====================
void initializeWiFi();
bool readTemperatureData(float &temperature);
void logSensorReading(float temperature, bool sensorHealthy);
void transmitSensorData(float temperature);
String constructJsonPayload(float temperature, float dataQuality = 1.0);
void parseServerResponse(String response, int httpCode);
void displaySystemStatus();
float calculateDataQuality(float temperature, bool usingSimulated);
float calculateTemperatureFromADC(int adcValue);
float getSimulatedTemperature();
float getBackupTemperature();

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

// ==================== TEMPERATURE CALCULATION FUNCTIONS ====================
float calculateTemperatureFromADC(int adcValue) {
    // Convert ADC value to voltage
    float voltage = adcValue * (TEMP_VOLTAGE_REF / TEMP_ADC_RESOLUTION);
    
    // Calculate NTC resistance using voltage divider formula
    // Vout = Vin * (R_ntc / (R_series + R_ntc))
    // R_ntc = R_series * Vout / (Vin - Vout)
    float rNTC = NTC_R_SERIES * voltage / (TEMP_VOLTAGE_REF - voltage);
    
    // Avoid division by zero and invalid values
    if (rNTC <= 0 || isnan(rNTC) || isinf(rNTC)) {
        return NAN;
    }
    
    // Calculate temperature using Steinhart-Hart equation
    // 1/T = 1/T0 + 1/B * ln(R/R0)
    float steinhart;
    steinhart = rNTC / NTC_R0;                 // (R/R0)
    steinhart = log(steinhart);                // ln(R/R0)
    steinhart /= NTC_BETA;                     // 1/B * ln(R/R0)
    steinhart += 1.0 / NTC_T0;                 // 1/T0 + 1/B * ln(R/R0)
    steinhart = 1.0 / steinhart;               // Temperature in Kelvin
    
    // Convert Kelvin to Celsius
    float temperature = steinhart - 273.15;
    
    return temperature;
}

float getBackupTemperature() {
    static int index = 0;
    index = (index + 1) % BACKUP_COUNT;
    return backupTemperatures[index];
}

float getSimulatedTemperature() {
    static int index = 0;
    static unsigned long lastChange = 0;
    
    if (millis() - lastChange > 10000) {
        index = random(0, SIMULATED_COUNT);
        lastChange = millis();
    }
    
    float temp = simulatedTemperatures[index];
    float variation = (random(-20, 21)) / 10.0;
    return temp + variation;
}

// ==================== TEMPERATURE DATA READING ====================
bool readTemperatureData(float &temperature) {
    static bool sensorStarted = false;
    static unsigned long startTime = 0;
    
    if (!sensorStarted) {
        Serial.println("[Sensor] Initializing temperature sensor...");
        startTime = millis();
        sensorStarted = true;
        delay(100);
        return false;
    }
    
    if (millis() - startTime < 1000) {
        return false;
    }
    
    if (!sensorInitialized) {
        sensorInitialized = true;
        Serial.println("[Sensor] ✓ Temperature sensor ready!");
    }
    
    // Read ADC value
    int rawValue = analogRead(TEMP_SENSOR_PIN);
    
    // Check for invalid ADC readings
    if (rawValue <= 10 || rawValue >= TEMP_ADC_RESOLUTION - 10) {
        Serial.println("[Sensor] ✗ Invalid ADC reading, using simulated data");
        temperature = getSimulatedTemperature();
        usingSimulatedData = true;
        lastTemperature = temperature;
        return true;
    }
    
    // Calculate temperature from ADC using NTC formula
    temperature = calculateTemperatureFromADC(rawValue);
    
    // Calculate voltage for logging
    float voltage = rawValue * (TEMP_VOLTAGE_REF / TEMP_ADC_RESOLUTION);
    
    // Validate temperature
    if (isnan(temperature) || temperature < -50.0 || temperature > 150.0) {
        Serial.print("[Sensor] ✗ Unrealistic temperature calculated: ");
        Serial.print(temperature);
        Serial.println(" °C, using backup data");
        temperature = getBackupTemperature();
        usingSimulatedData = true;
    } else {
        usingSimulatedData = false;
        lastTemperature = temperature;
    }
    
    // Log sensor reading details
    Serial.print("[Sensor] Raw ADC: ");
    Serial.print(rawValue);
    Serial.print(", Voltage: ");
    Serial.print(voltage, 3);
    Serial.print("V, Temperature: ");
    Serial.print(temperature, 1);
    if (usingSimulatedData) {
        Serial.print(" °C (");
        if (temperature < 0 || temperature > 40) {
            Serial.print("backup");
        } else {
            Serial.print("simulated");
        }
        Serial.print(")");
    }
    Serial.println(" °C");
    
    return true;
}

// ==================== DATA QUALITY ASSESSMENT ====================
float calculateDataQuality(float temperature, bool usingSimulated) {
    float qualityScore = 1.0;
    
    if (usingSimulated) {
        qualityScore = 0.7;
    }
    
    if (temperature < -50.0 || temperature > 150.0) {
        qualityScore -= 0.5;
    } else if (temperature < -10.0 || temperature > 100.0) {
        qualityScore -= 0.2;
    }
    
    static float lastTemp = 0;
    if (lastTemp != 0) {
        float change = abs(temperature - lastTemp);
        if (change > 10.0) {
            qualityScore -= 0.3;
        } else if (change > 5.0) {
            qualityScore -= 0.1;
        }
    }
    lastTemp = temperature;
    
    if (millis() < 5000) {
        qualityScore -= 0.3;
    }
    
    return constrain(qualityScore, 0.0, 1.0);
}

// ==================== JSON PAYLOAD CONSTRUCTION ====================
String constructJsonPayload(float temperature, float dataQuality) {
    StaticJsonDocument<512> jsonDoc;
    
    jsonDoc["sensorSerialNumber"] = SENSOR_SERIAL;
    jsonDoc["sensorType"] = "TEMPERATURE";
    jsonDoc["value"] = temperature;
    jsonDoc["unit"] = UNIT_TEMPERATURE;
    jsonDoc["quality"] = dataQuality;
    
    char timestampBuffer[25];
    sprintf(timestampBuffer, "2024-01-01T12:00:00.000Z");
    
    JsonObject metadata = jsonDoc.createNestedObject("metadata");
    metadata["sensorModel"] = "NTC-Temperature-Sensor";
    metadata["ntcBeta"] = NTC_BETA;
    metadata["ntcR0"] = NTC_R0;
    metadata["voltageReference"] = TEMP_VOLTAGE_REF;
    metadata["adcResolution"] = TEMP_ADC_RESOLUTION;
    metadata["firmwareVersion"] = "1.0.1";
    metadata["readingType"] = "temperature";
    metadata["location"] = "indoor";
    metadata["sensorInterface"] = "analog";
    metadata["sensorType"] = "NTC";
    metadata["dataSource"] = usingSimulatedData ? "simulated" : "real";
    
    JsonObject tempInfo = metadata.createNestedObject("temperatureInfo");
    if (temperature < TEMP_LOW_THRESHOLD) {
        tempInfo["condition"] = "COLD";
    } else if (temperature < TEMP_HIGH_THRESHOLD) {
        tempInfo["condition"] = "COMFORTABLE";
    } else if (temperature < TEMP_CRITICAL_THRESHOLD) {
        tempInfo["condition"] = "WARM";
    } else {
        tempInfo["condition"] = "HOT";
    }
    tempInfo["lowThreshold"] = TEMP_LOW_THRESHOLD;
    tempInfo["highThreshold"] = TEMP_HIGH_THRESHOLD;
    tempInfo["criticalThreshold"] = TEMP_CRITICAL_THRESHOLD;
    
    JsonObject systemInfo = jsonDoc.createNestedObject("system");
    systemInfo["uptime"] = millis() / 1000;
    systemInfo["wifiRssi"] = WiFi.RSSI();
    systemInfo["freeHeap"] = ESP.getFreeHeap();
    systemInfo["sensorInitialized"] = sensorInitialized;
    systemInfo["usingSimulatedData"] = usingSimulatedData;
    
    String payload;
    serializeJson(jsonDoc, payload);
    
    Serial.println("[JSON] Constructed payload:");
    serializeJsonPretty(jsonDoc, Serial);
    Serial.println();
    
    return payload;
}

// ==================== DATA TRANSMISSION ====================
void transmitSensorData(float temperature) {
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
    httpClient.addHeader("X-Sensor-Model", "NTC-Temperature");
    httpClient.addHeader("X-Firmware-Version", "1.0.1");
    httpClient.addHeader("X-Sensor-Type", "temperature");
    httpClient.addHeader("X-Data-Source", usingSimulatedData ? "simulated" : "real");
    
    float dataQuality = calculateDataQuality(temperature, usingSimulatedData);
    String jsonPayload = constructJsonPayload(temperature, dataQuality);
    
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
                Serial.println("[Response] ⚠️  TEMPERATURE THRESHOLD VIOLATIONS DETECTED!");
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
                Serial.println("[Response] ✓ Temperature within normal range");
            }
        }
        
        if (responseDoc.containsKey("quality")) {
            Serial.print("[Response] Data quality score: ");
            Serial.println(responseDoc["quality"].as<float>());
        }
    }
}

// ==================== SENSOR LOGGING ====================
void logSensorReading(float temperature, bool sensorHealthy) {
    Serial.println();
    printSeparator('=', 50);
    Serial.println("TEMPERATURE SENSOR READING REPORT");
    printSeparator('=', 50);
    
    Serial.print("Sensor Serial: ");
    Serial.println(SENSOR_SERIAL);
    
    Serial.print("Sensor Status: ");
    Serial.println(sensorHealthy ? "HEALTHY ✓" : "UNHEALTHY ✗");
    
    Serial.print("Sensor Initialized: ");
    Serial.println(sensorInitialized ? "YES ✓" : "NO ⏳");
    
    Serial.print("Data Source: ");
    if (usingSimulatedData) {
        if (temperature < 0 || temperature > 40) {
            Serial.println("BACKUP DATA");
        } else {
            Serial.println("SIMULATED");
        }
    } else {
        Serial.println("REAL SENSOR");
    }
    
    if (sensorHealthy) {
        Serial.print("Temperature: ");
        Serial.print(temperature, 1);
        Serial.print(" ");
        Serial.println(UNIT_TEMPERATURE);
        
        Serial.print("Condition: ");
        if (temperature < TEMP_LOW_THRESHOLD) {
            Serial.println("COLD ❄️");
        } else if (temperature < TEMP_HIGH_THRESHOLD) {
            Serial.println("COMFORTABLE 😊");
        } else if (temperature < TEMP_CRITICAL_THRESHOLD) {
            Serial.println("WARM 🌡️");
        } else {
            Serial.println("HOT 🔥");
        }
        
        float quality = calculateDataQuality(temperature, usingSimulatedData);
        Serial.print("Data Quality Score: ");
        Serial.print(quality * 100);
        Serial.println("%");
        
        Serial.print("Sensor Type: NTC Temperature Sensor");
        Serial.println();
        Serial.print("ADC Resolution: 12-bit");
        Serial.println();
    }
    
    printSeparator('-', 50);
}

// ==================== SYSTEM STATUS DISPLAY ====================
void displaySystemStatus() {
    printSeparator('=', 50);
    Serial.println("SYSTEM STATUS - TEMPERATURE MONITOR");
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
    
    Serial.print("Temperature Sensor: ");
    Serial.println(sensorInitialized ? "OPERATIONAL ✓" : "INITIALIZING ⏳");
    
    Serial.print("Sensor Power: ");
    Serial.println("ON (3.3V) ✓");
    
    Serial.print("Data Source: ");
    if (usingSimulatedData) {
        if (lastTemperature < 0 || lastTemperature > 40) {
            Serial.println("BACKUP DATA");
        } else {
            Serial.println("SIMULATED");
        }
    } else {
        Serial.println("REAL SENSOR");
    }
    
    if (lastTemperature != 0) {
        Serial.print("Last Temperature: ");
        Serial.print(lastTemperature, 1);
        Serial.println(" °C");
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
    Serial.println("ESP32 TEMPERATURE SENSOR MONITOR");
    Serial.println("Version 1.0.1 | Sensor: NTC Temperature Sensor");
    Serial.println("Measurement Range: -50°C to 150°C");
    Serial.println("NTC Beta: 3950 | R0: 10kΩ | Series R: 10kΩ");
    printSeparator('=', 50);
    
    bootTime = millis();
    
    randomSeed(analogRead(0));
    
    Serial.println("[Init] Configuring temperature sensor...");
    pinMode(TEMP_SENSOR_PIN, INPUT);
    
    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);
    
    Serial.println("[Init] Temperature sensor initializing...");
    
    initializeWiFi();
    
    displaySystemStatus();
    
    // Set lastPostTime to 0 to force immediate transmission
    lastPostTime = 0;
    
    Serial.println("[Init] System initialization complete");
    Serial.println("[Init] Starting main monitoring loop...\n");
}

// ==================== MAIN LOOP ====================
void loop() {
    unsigned long currentTime = millis();
    
    if (!sensorInitialized && currentTime < 1000) {
        delay(100);
        return;
    }
    
    // Check if it's time for transmission (immediately on startup, then every 10 minutes)
    if (!firstTransmissionDone || (currentTime - lastPostTime >= POST_INTERVAL_MS)) {
        Serial.println("\n[Schedule] Scheduled transmission initiated");
        
        float temperature;
        bool sensorDataValid = readTemperatureData(temperature);
        
        if (sensorDataValid) {
            logSensorReading(temperature, true);
            transmitSensorData(temperature);
            firstTransmissionDone = true;
        } else {
            logSensorReading(0, false);
            Serial.println("[Schedule] Transmission skipped - invalid sensor data");
        }
        
        lastPostTime = currentTime;
        Serial.print("[Schedule] Next transmission in 10 minutes\n");
    }
    
    static unsigned long lastStatusTime = 0;
    if (currentTime - lastStatusTime >= 60000) {
        displaySystemStatus();
        lastStatusTime = currentTime;
    }
    
    static unsigned long lastQuickCheck = 0;
    if (currentTime - lastQuickCheck >= 5000) {
        float temperature;
        if (readTemperatureData(temperature)) {
            if (temperature > TEMP_CRITICAL_THRESHOLD) {
                Serial.println("\n⚠️ ⚠️ ⚠️  CRITICAL: HIGH TEMPERATURE DETECTED!");
                Serial.print("Temperature: ");
                Serial.print(temperature);
                Serial.println(" °C");
                if (usingSimulatedData) {
                    Serial.println("Note: Using backup data");
                }
                Serial.println("Check cooling systems!");
                printSeparator('!', 50);
            } else if (temperature < TEMP_LOW_THRESHOLD) {
                Serial.println("\n⚠️ ⚠️ ⚠️  WARNING: LOW TEMPERATURE DETECTED!");
                Serial.print("Temperature: ");
                Serial.print(temperature);
                Serial.println(" °C");
                if (usingSimulatedData) {
                    Serial.println("Note: Using backup data");
                }
                Serial.println("Risk of freezing!");
                printSeparator('!', 50);
            }
        }
        lastQuickCheck = currentTime;
    }
    
    delay(100);
}