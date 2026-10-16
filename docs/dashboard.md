# Dashboard

## Pages

- หน้าหลัก: map-first schematic selector สำหรับรีเลย์ `pump`, `zone1`, `lighthome`, `lightsala` พร้อม live relay state จาก ESP; ผังไม่ระบุตำแหน่ง/ขนาดจริง และการเลือกโซนเปิดหน้า “ระบบน้ำ” โดยไม่ส่งคำสั่งจาก Home. แสดง DHT11 และ controller telemetry ที่ได้รับจริงเท่านั้น.
- ระบบน้ำ: relay actions, AUTO/MANUAL mode commands และ schedule editor 4 ช่วงต่อรีเลย์; ตารางแสดงจาก ESP, ตรวจเวลาซ้ำ/ช่วงทับซ้อนก่อนส่ง และรอ `schedule/status` ยืนยัน.
- อุปกรณ์: ESP8266/DHT11/DS3231/relay inventory; Soil Sensor แสดงว่าไม่ได้ติดตั้ง และไม่สร้างค่าจำลอง.
- การเชื่อมต่อ: MQTT broker status, ESP heartbeat age, reconnect/error counters, credentials form และ diagnostic timeline.
- สภาพอากาศ: Open-Meteo current conditions และ forecast 3 วัน แยกจาก DHT11.
- ตั้งค่า: working accordions; Wi-Fi/Telegram/notification ที่ไม่มี integration จริงระบุชัดว่ายังไม่ได้เชื่อม.
- ข้อมูล: session-observed MQTT events ที่กรองได้; สมุดรายรับ/รายจ่ายเดิมยังเป็น browser-local disclosure.

Desktop uses one shared left green sidebar; mobile uses a safe-area-aware seven-item bottom navigation. Shared footer and CSS design tokens are reused across routes.

## MQTT setup

1. เปิดหน้า “การเชื่อมต่อ” หลัง deploy HTTPS.
2. ใส่ MQTT username/password ที่มี HiveMQ ACL สำหรับ topics ของ dashboard.
3. กด “เชื่อมต่อ”; default คือเก็บใน session ของแท็บ/เบราว์เซอร์.
4. ตรวจ MQTT ONLINE และ ESP ONLINE แยกกัน; ESP ต้องมี heartbeat สด.
5. สำหรับ relay action ต้อง online ทั้ง MQTT และ ESP และมี relay state จริง.
6. การตั้งตารางเลือกรีเลย์ แล้วแก้ได้ 4 ช่วงเวลา/รีเลย์; schedule ทำงานบน ESP ทุกวันเมื่อเป็น AUTO และเวลาของ ESP (RTC/NTP) ใช้ได้.

ไม่มี credentials จริงใน Git repository. Browser client เป็น public client; ใช้ ACL จำกัดสิทธิ์ อย่าใช้ admin broker credential.
