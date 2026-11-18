# Troubleshooting

- **ไม่เห็น MQTT ONLINE:** ตรวจ HTTPS page, WSS endpoint ให้ตรงกับหน้า Overview, port `8084`, path `/mqtt`, MQTT.js, username/password และ EMQX authorization rules. Browser MQTT CONNECT ไม่ได้ยืนยันว่า ESP ONLINE.
- **ต้องการเปิดหน้า AP โดยไม่ล้าง Wi-Fi:** ปิดรีเลย์ทุกช่องก่อน จากนั้นกดปุ่มชั่วขณะที่ต่อระหว่าง D0/GPIO16 กับ 3V3 ค้าง 2 วินาที แล้วเชื่อม Wi-Fi `SmartFarm_Setup`; หากหน้า captive portal ไม่เปิดเอง ให้ไป `http://192.168.4.1`. ปุ่ม reset เดิม D1 ค้าง 5 วินาทีเป็นคนละปุ่มและจะล้าง Wi-Fi ที่บันทึกไว้.
- **ESP ออฟไลน์แต่ broker ออนไลน์:** ตรวจ Wi-Fi/ESP heartbeat, topic ACL, device clock, CA certificate ของ EMQX deployment, TLS port `8883` และ ESP reset/reconnect logs.
- **Relay “ยังไม่มีข้อมูล”:** ตรวจ subscription `smartfarm/relay/+/status`, สิทธิ์ subscribe, retained status จาก ESP และ exact relay ID; ห้ามเปลี่ยนเป็น OFF เพื่อกลบปัญหา.
- **สั่งแล้วไม่ยืนยัน:** MQTT PUBACK ไม่ใช่สถานะ relay; ตรวจสิทธิ์ publish ของ Dashboard และ subscribe ของ ESP, ตรวจว่า ESP รับ command แล้วส่ง status topic กลับมาตรง target.
- **TLS error ที่ ESP:** ยืนยันเวลา RTC/NTP และ CA PEM ที่ดาวน์โหลดจาก Overview ของ broker เดียวกัน; ห้ามลดมาตรฐานด้วย `setInsecure()`.
- **Dashboard broker endpoint error:** ใช้ `wss://<deployment-address>:8084/mqtt` หรือ hostname จาก Overview; Serverless ไม่รองรับพอร์ตที่ไม่เข้ารหัส.
- **DHT11 ไม่มีข้อมูล:** ตรวจสายที่ D2/GPIO4 และดู diagnostics จาก firmware; ไม่มีค่า valid ให้แสดง “ยังไม่มีข้อมูล”.
- **Offline app:** service worker cache เฉพาะ app shell; dynamic sensor/relay state ไม่ถูกบันทึกหรือสร้างข้อมูลจำลอง.
- **พยากรณ์ไม่โหลด:** ตรวจ outbound network และ Open-Meteo response; DHT11 display แยกจาก forecast.
- **Finance:** ข้อมูลเก็บเฉพาะ browser localStorage เครื่องนี้; clear browser data อาจลบข้อมูล. Export CSV เพื่อสำรอง.
- **OTA:** ตรวจ firmware version, device report และผลจริงบน device; ไม่ถือว่า upload สำเร็จหากไม่มี device confirmation.
