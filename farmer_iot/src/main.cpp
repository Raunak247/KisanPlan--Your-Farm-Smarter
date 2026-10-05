#include <WiFi.h>
#include <HTTPClient.h>

// Network credentials (replace with your actual Wi-Fi details)
const char* ssid = "YOUR_SSID";
const char* password = "YOUR_PASSWORD";

// Update this to your Mac's exact IP address shown in the terminal (e.g., 10.186.55.235)
const char* serverName = "http://10.186.55.235:5001/api/sensor";

// Define input/output pins
#define SOIL_PIN 34
#define RED_LED 25       // Pump OFF indicator
#define PUMP_RELAY 26    // Relay Module (Pump ON) 
#define BLUE_LED 27      // Pump STANDBY indicator

// Calibrated sensor values
const int DRY_VALUE = 4095; 
const int WET_VALUE = 1500; 

void setup() {
  Serial.begin(115200);

  // Set hardware pins as outputs
  pinMode(RED_LED, OUTPUT);
  pinMode(PUMP_RELAY, OUTPUT);
  pinMode(BLUE_LED, OUTPUT);
  
  // Ensure relay is off at startup
  digitalWrite(PUMP_RELAY, LOW); 

  // Initialize Wi-Fi but DO NOT pause the hardware to wait for it
  WiFi.begin(ssid, password);
  Serial.println("Hardware initialized. Starting Wi-Fi in background...");
}

void loop() {
  // 1. ALWAYS EXECUTE HARDWARE LOGIC FIRST (Zero Latency)
  int rawMoisture = analogRead(SOIL_PIN);
  
  // Convert to 0-100% scale
  int moisturePercent = map(rawMoisture, DRY_VALUE, WET_VALUE, 0, 100);
  moisturePercent = constrain(moisturePercent, 0, 100);

  Serial.print("Moisture: ");
  Serial.print(moisturePercent);
  Serial.print("% | Pump: ");

  // Trigger LEDs and Relay based on moisture thresholds
  if (moisturePercent < 30) {
    Serial.print("ON");
    digitalWrite(PUMP_RELAY, HIGH);
    digitalWrite(RED_LED, LOW);
    digitalWrite(BLUE_LED, LOW);
    
  } else if (moisturePercent >= 30 && moisturePercent <= 70) {
    Serial.print("STANDBY");
    digitalWrite(BLUE_LED, HIGH);
    digitalWrite(RED_LED, LOW);
    digitalWrite(PUMP_RELAY, LOW);
    
  } else {
    Serial.print("OFF");
    digitalWrite(RED_LED, HIGH);
    digitalWrite(PUMP_RELAY, LOW);
    digitalWrite(BLUE_LED, LOW);
  }

  // 2. ONLY ATTEMPT BACKEND POST IF WI-FI IS CONNECTED
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print(" | WiFi: Connected | ");
    
    HTTPClient http;
    http.begin(serverName);
    http.addHeader("Content-Type", "application/json");

    String json = "{\"soilMoisture\":" + String(moisturePercent) + "}";
    int httpResponseCode = http.POST(json);

    Serial.println("HTTP Response Code: " + String(httpResponseCode));
    http.end();
  } else {
    // If Wi-Fi drops, the hardware continues to function locally
    Serial.println(" | WiFi: Disconnected (Local Hardware Only)");
  }

  // 3-second delay for a responsive live demo
  delay(3000); 
}