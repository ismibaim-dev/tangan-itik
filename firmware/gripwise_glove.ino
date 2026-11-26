#include <Wire.h>
#include "BluetoothSerial.h"

#if !defined(CONFIG_BT_ENABLED) || !defined(CONFIG_BLUEDROID_ENABLED)
#error Bluetooth is not enabled!
#endif

BluetoothSerial SerialBT;

const int MPU_ADDR = 0x68;
bool mpuConnected = false;

// false = Readable Serial Monitor view (for Phone Terminal / Laptop Bluetooth)
// true  = Comma-separated CSV format (for Gripwise app parsing)
bool csvAppMode = false;

// 1. Finger Pin Mapping (ESP32 ADC1 Pins)
const int THUMB_PIN  = 32;
const int INDEX_PIN  = 33;
const int MIDDLE_PIN = 34;
const int RING_PIN   = 35;

// 2. Wrist MPU6050 Thresholds
const float WRIST_TILT_THRESHOLD = 4.5; // m/s^2
const float GYRO_MOVE_THRESHOLD  = 1.0; // rad/s

void setup() {
  Serial.begin(115200);
  delay(1000);

  // Start Classic Bluetooth
  SerialBT.begin("Gripwise_Glove");

  Serial.println("==========================================");
  Serial.println("   GRIPWISE SMART GLOVE - BLUETOOTH ON    ");
  Serial.println("   Bluetooth Name: Gripwise_Glove         ");
  Serial.println("==========================================");

  pinMode(THUMB_PIN, INPUT);
  pinMode(INDEX_PIN, INPUT);
  pinMode(MIDDLE_PIN, INPUT);
  pinMode(RING_PIN, INPUT);

  // Initialize I2C (SDA = GPIO 21, SCL = GPIO 22)
  Wire.begin(21, 22);

  // Wake up MPU6050 directly
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(0x6B);
  Wire.write(0);
  if (Wire.endTransmission(true) == 0) {
    mpuConnected = true;
    Serial.println("STATUS: Gyro connected at 0x68!");
  } else {
    mpuConnected = false;
    Serial.println("WARNING: Gyro not responding at 0x68!");
  }
  delay(500);
}

void loop() {
  // --- STEP 1: READ FLEX SENSORS ---
  int thumbVal  = analogRead(THUMB_PIN);
  int indexVal  = analogRead(INDEX_PIN);
  int middleVal = analogRead(MIDDLE_PIN);
  int ringVal   = analogRead(RING_PIN);

  // --- STEP 2: READ MPU6050 DIRECTLY ---
  float accelX = 0.0, accelY = 0.0;
  float gyroX = 0.0, gyroY = 0.0, gyroZ = 0.0;

  if (mpuConnected) {
    Wire.beginTransmission(MPU_ADDR);
    Wire.write(0x3B);
    Wire.endTransmission(false);
    Wire.requestFrom(MPU_ADDR, 14, true);

    if (Wire.available() >= 14) {
      int16_t rawAccX = (Wire.read() << 8) | Wire.read();
      int16_t rawAccY = (Wire.read() << 8) | Wire.read();
      int16_t rawAccZ = (Wire.read() << 8) | Wire.read();
      int16_t rawTemp = (Wire.read() << 8) | Wire.read();
      int16_t rawGyrX = (Wire.read() << 8) | Wire.read();
      int16_t rawGyrY = (Wire.read() << 8) | Wire.read();
      int16_t rawGyrZ = (Wire.read() << 8) | Wire.read();

      accelX = (rawAccX / 16384.0) * 9.81;
      accelY = (rawAccY / 16384.0) * 9.81;
      gyroX  = (rawGyrX / 131.0) * 0.01745;
      gyroY  = (rawGyrY / 131.0) * 0.01745;
      gyroZ  = (rawGyrZ / 131.0) * 0.01745;
    }
  }

  // --- STEP 3: DETECT WRIST MOVEMENTS ---
  String wristState = "REST";

  if (accelX > WRIST_TILT_THRESHOLD) {
    wristState = "WRIST_EXTENSION_UP";
  } else if (accelX < -WRIST_TILT_THRESHOLD) {
    wristState = "WRIST_FLEXION_DOWN";
  } else if (accelY > WRIST_TILT_THRESHOLD) {
    wristState = "WRIST_TILT_LEFT";
  } else if (accelY < -WRIST_TILT_THRESHOLD) {
    wristState = "WRIST_TILT_RIGHT";
  } else if (abs(gyroX) > GYRO_MOVE_THRESHOLD || abs(gyroY) > GYRO_MOVE_THRESHOLD || abs(gyroZ) > GYRO_MOVE_THRESHOLD) {
    wristState = "WRIST_ROTATION";
  }

  // --- STEP 4: FORMAT OUTPUTS ---
  String monitorLine = "Thumb: " + String(thumbVal) +
                       " | Index: " + String(indexVal) +
                       " | Middle: " + String(middleVal) +
                       " | Ring: " + String(ringVal) +
                       " || Wrist(X,Y): " + String(accelX, 1) + ", " + String(accelY, 1) +
                       " || ACTION: " + wristState;

  String csvPacket = String(thumbVal) + "," +
                     String(indexVal) + "," +
                     String(middleVal) + "," +
                     String(ringVal) + "," +
                     String(accelX, 1) + "," +
                     String(accelY, 1) + "," +
                     wristState;

  // --- STEP 5: PRINT TO USB SERIAL MONITOR ---
  Serial.println(monitorLine);

  // --- STEP 6: SEND TO BLUETOOTH (PHONE OR LAPTOP) ---
  if (SerialBT.hasClient()) {
    if (csvAppMode) {
      SerialBT.println(csvPacket);
    } else {
      SerialBT.println(monitorLine);
    }
  }

  delay(400);
}