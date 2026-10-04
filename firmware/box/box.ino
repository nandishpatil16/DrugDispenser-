#include <WiFi.h>
#include <Firebase_ESP_Client.h>
#include <ESP32Servo.h>
#include "HX711.h"
#include <HardwareSerial.h>
#include "DFRobotDFPlayerMini.h"
#include "addons/TokenHelper.h"
#include "addons/RTDBHelper.h"

#define WIFI_SSID "YOUR_WIFI_NAME"
#define WIFI_PASS "YOUR_WIFI_PASSWORD"
#define FIREBASE_API_KEY "AIzaSyAgDMg4MCMm05aGKhzf1fI0mi5SZgLpH0o"
#define FIREBASE_DATABASE_URL "https://smartdose-573bb-default-rtdb.firebaseio.com"
#define USER_EMAIL "admin@smartdose.com"
#define USER_PASSWORD "password123"

#define LOADCELL_DOUT_PIN 16
#define LOADCELL_SCK_PIN 17

Servo servoM, servoA, servoN;
HX711 scale;
HardwareSerial mySoftwareSerial(2);
DFRobotDFPlayerMini myDFPlayer;

FirebaseData fbdo;
FirebaseAuth auth;
FirebaseConfig config;
unsigned long lastPublish = 0;

void setup() {
  Serial.begin(115200);

  servoM.attach(18); servoA.attach(19); servoN.attach(21);
  servoM.write(90); servoA.write(90); servoN.write(90);

  scale.begin(LOADCELL_DOUT_PIN, LOADCELL_SCK_PIN);
  scale.set_scale(420.0);

  mySoftwareSerial.begin(9600, SERIAL_8N1, 27, 14);
  if (myDFPlayer.begin(mySoftwareSerial)) myDFPlayer.volume(20);

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

  if (Firebase.RTDB.getString(&fbdo, "devices/box/command")) {
    String cmd = fbdo.stringData();
    if (cmd == "DISPENSE_MORNING" || cmd == "DISPENSE_AFTERNOON" || cmd == "DISPENSE_NIGHT") {
      myDFPlayer.play(1);
      if (cmd == "DISPENSE_MORNING") { servoM.write(0); delay(2000); servoM.write(90); }
      if (cmd == "DISPENSE_AFTERNOON") { servoA.write(0); delay(2000); servoA.write(90); }
      if (cmd == "DISPENSE_NIGHT") { servoN.write(0); delay(2000); servoN.write(90); }
      
      Firebase.RTDB.setString(&fbdo, "devices/box/status", "DISPENSED");
      Firebase.RTDB.setString(&fbdo, "devices/box/command", "");
    }
  }

  if (millis() - lastPublish > 3000) {
    lastPublish = millis();
    float grams = scale.is_ready() ? scale.get_units(5) : 0;
    if (grams < 0) grams = 0;
    
    Firebase.RTDB.setFloat(&fbdo, "devices/box/loadCell", grams);
    if (grams < 5.0) {
      Firebase.RTDB.setString(&fbdo, "devices/box/status", "TAKEN");
    }
  }
}
