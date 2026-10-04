#include <Wire.h>
#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <Adafruit_Sensor.h>
#include <Adafruit_MPU6050.h>
#include <MAX30105.h>
#include "heartRate.h"
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASS "YOUR_WIFI_PASSWORD"
#define FIREBASE_API_KEY "AIzaSyAgDMg4MCMm05aGKhzf1fI0mi5SZgLpH0o"
#define FIREBASE_DATABASE_URL "https://smartdose-573bb-default-rtdb.firebaseio.com"
#define USER_EMAIL "admin@smartdose.com"
#define USER_PASSWORD "password123"

#define MAX_SDA_PIN    21
#define MAX_SCL_PIN    22
#define MPU_SDA_PIN    18
#define MPU_SCL_PIN    19
#define SOS_BUTTON_PIN 12
#define VIBRATION_PIN  13

TwoWire MAXWire = TwoWire(0);
TwoWire MPUWire = TwoWire(1);
MAX30105 particleSensor;
Adafruit_MPU6050 mpu;

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;

const byte RATE_SIZE = 4;
byte rates[RATE_SIZE] = {0};
byte rateSpot = 0;
long lastBeat = 0;
int averageHR = 0;
bool hrAvailable = false;
long irValue = 0;

unsigned long lastPublish = 0;
unsigned long lastFall = 0;
unsigned long lastSOS = 0;

void vibrate() {
  digitalWrite(VIBRATION_PIN, HIGH);
  delay(500);
  digitalWrite(VIBRATION_PIN, LOW);
}

void setup() {
  Serial.begin(115200);
  pinMode(SOS_BUTTON_PIN, INPUT_PULLUP);
  pinMode(VIBRATION_PIN, OUTPUT);
  digitalWrite(VIBRATION_PIN, LOW);

  MAXWire.begin(MAX_SDA_PIN, MAX_SCL_PIN, 100000);
  if (particleSensor.begin(MAXWire, I2C_SPEED_FAST)) {
    particleSensor.setup(0x1F, 4, 2, 100, 411, 4096);
    particleSensor.setPulseAmplitudeRed(0x1F);
    particleSensor.setPulseAmplitudeIR(0x1F);
  }
  MPUWire.begin(MPU_SDA_PIN, MPU_SCL_PIN, 100000);
  if (mpu.begin(0x68, &MPUWire)) {
    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);
  }

  WiFi.begin(WIFI_SSID, WIFI_PASS);
  while (WiFi.status() != WL_CONNECTED) { delay(500); Serial.print("."); }
  Serial.println("\nWiFi connected");

  config.api_key = FIREBASE_API_KEY;
  config.database_url = FIREBASE_DATABASE_URL;
  auth.user.email = USER_EMAIL;
  auth.user.password = USER_PASSWORD;
  config.token_status_callback = tokenStatusCallback;
  
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);
}

void loop() {
  if (!Firebase.ready()) return;

  irValue = particleSensor.getIR();
  if (irValue > 50000 && checkForBeat(irValue)) {
    long delta = millis() - lastBeat;
    lastBeat = millis();
    float bpm = 60000.0 / delta;
    if (bpm > 40 && bpm < 200) {
      rates[rateSpot++] = (byte)bpm;
      rateSpot %= RATE_SIZE;
      int sum = 0, count = 0;
      for (byte i=0; i<RATE_SIZE; i++) if(rates[i] > 0){ sum+=rates[i]; count++;}
      if (count > 0) { averageHR = sum/count; hrAvailable = true; }
    }
  } else if (irValue < 50000) { hrAvailable = false; }

  if (digitalRead(SOS_BUTTON_PIN) == LOW && millis() - lastSOS > 3000) {
    lastSOS = millis();
    vibrate(); delay(200); vibrate();
    Firebase.RTDB.setBool(&fbdo, "devices/band/sos", true);
    delay(500);
    Firebase.RTDB.setBool(&fbdo, "devices/band/sos", false);
  }

  sensors_event_t a, g, t;
  mpu.getEvent(&a, &g, &t);
  float mag = sqrt(a.acceleration.x*a.acceleration.x + a.acceleration.y*a.acceleration.y + a.acceleration.z*a.acceleration.z) / 9.81;
  if (mag > 3.5 && millis() - lastFall > 5000) {
    lastFall = millis();
    vibrate();
    Firebase.RTDB.setBool(&fbdo, "devices/band/fallDetected", true);
    delay(500);
    Firebase.RTDB.setBool(&fbdo, "devices/band/fallDetected", false);
  }

  if (millis() - lastPublish > 2000) {
    lastPublish = millis();
    Firebase.RTDB.setInt(&fbdo, "devices/band/heartRate", hrAvailable ? averageHR : 0);
  }
}
