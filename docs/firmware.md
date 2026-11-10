# Firmware Version และ Responsibilities

Firmware source candidate V7.3.0-OTA-STABLE สืบทอด hardware/safety contract จาก baseline V7.2.0-OTA-STABLE ที่ตรวจจาก New140869; การเปลี่ยนแปลงนี้ไม่แตะ relay safety logic. ESP8266 จัดการ GPIO relay, AUTO/MANUAL, schedule (เมื่อ clock valid), emergency lock, Wi-Fi/MQTT reconnect, DHT11, RTC/NTP และ OTA safe state. Binary candidate และ checksum อยู่ที่ `releases/firmware/SmartFarm_V7.3.0.bin`; ดูรายละเอียดใน [`build-report.md`](build-report.md).

Firmware source uses TLS port 8883 and validates broker CA plus clock; MQTT username/password and OTA password are provisioned on device and are not repository defaults. OTA HTTP endpoint is for trusted farm LAN only, while ArduinoOTA uses UDP port 8266/password. Do not expose the HTTP OTA port to public internet.

The dashboard is not a firmware updater and does not claim an OTA success state. Actual build and device flashing are separate outcomes. Verify compile output, binary hash, target board and on-device version before releasing any `.bin`.
