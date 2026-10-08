# Dashboard

## Pages

- หน้าหลัก: MQTT/ESP status, relay snapshot และ sensor DHT11.
- ระบบน้ำ: relay actions และ AUTO/MANUAL mode commands ซึ่งรอ status acknowledgement จาก ESP; schedule slots ยังไม่มีหน้าแก้ไข.
- การเงิน: browser-local income/expense ledger, ผลผลิต/ปริมาณ/ผู้รับซื้อ, เงินที่รับแล้ว/ยอดค้างรับ, กำไร-ขาดทุน และ CSV export; ทำงานออฟไลน์.
- อากาศ: Open-Meteo forecast แยกจาก sensor data.
- ตั้งค่า: operator ป้อน MQTT user/password; password session-only เป็นค่าเริ่มต้น; checkbox จึงจะเก็บใน localStorage.
- Admin: สรุป configuration/read-only; ไม่มี backend user management/Auth ในรุ่นนี้.

## MQTT setup

1. เปิดหน้า Settings หลัง deploy HTTPS.
2. ใส่ MQTT username/password ที่มี HiveMQ ACL สำหรับ topics ของ dashboard.
3. กด “เชื่อมต่อ”; default คือเก็บใน session ของแท็บ/เบราว์เซอร์.
4. ตรวจ MQTT ONLINE และ ESP ONLINE แยกกัน; ESP ต้องมี heartbeat สด.
5. สำหรับ relay action ต้อง online ทั้ง MQTT และ ESP และมี relay state จริง.

ไม่มี credentials จริงใน Git repository. Browser client เป็น public client; ใช้ ACL จำกัดสิทธิ์ อย่าใช้ admin broker credential.
