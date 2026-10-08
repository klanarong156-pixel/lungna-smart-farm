# Troubleshooting

- **ไม่เห็น MQTT ONLINE:** ตรวจ HTTPS page, WSS reachability, MQTT.js load, username/password และ HiveMQ ACL. Browser MQTT CONNECT ไม่เท่ากับ ESP ONLINE.
- **ESP ออฟไลน์แต่ broker ออนไลน์:** ตรวจ Wi-Fi/ESP heartbeat, topic ACL, device clock, TLS CA/valid time และ ESP reset/reconnect logs.
- **Relay “ยังไม่มีข้อมูล”:** ตรวจ subscription `smartfarm/relay/+/status`, retained status จาก ESP และ exact relay ID; ห้ามเปลี่ยนเป็น OFF เพื่อกลบปัญหา.
- **สั่งแล้วไม่ยืนยัน:** MQTT PUBACK ไม่ใช่สถานะ relay; ตรวจ ESP รับ command, firmware safety locks และ status topic กลับมาตรง target.
- **TLS error ที่ ESP:** ยืนยันเวลา RTC/NTP และ CA trust anchor; ห้ามลดมาตรฐานด้วย `setInsecure()`.
- **DHT11 ไม่มีข้อมูล:** ตรวจสายที่ D2/GPIO4 และดู diagnostics จาก firmware; ไม่มีค่า valid ให้แสดง “ยังไม่มีข้อมูล”.
- **Offline app:** service worker cache เฉพาะ app shell; dynamic sensor/relay state ไม่ถูกบันทึกหรือสร้างข้อมูลจำลอง.
- **พยากรณ์ไม่โหลด:** ตรวจ outbound network และ Open-Meteo response; DHT11 display แยกจาก forecast.
- **Finance:** ข้อมูลเก็บเฉพาะ browser localStorage เครื่องนี้; clear browser data อาจลบข้อมูล. Export CSV เพื่อสำรอง.
- **OTA:** ตรวจ firmware version, device report และผลจริงบน device; ไม่ถือว่า upload สำเร็จหากไม่มี device confirmation.
