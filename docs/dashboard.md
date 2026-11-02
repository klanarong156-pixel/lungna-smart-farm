# Dashboard

## หน้าที่และเมนู

Dashboard มี 6 เส้นทางใช้งานจริง: **หน้าหลัก**, **ระบบน้ำ**, **อุปกรณ์**, **ระบบ**, **อากาศ** และ **บันทึก**. เมนู “ระบบ” รวมการเชื่อมต่อ MQTT กับเครื่องมือดูแลเว็บ; “บันทึก” รวม event timeline และสมุดบัญชีในเครื่อง. Hash เดิม `#connection-page`, `#settings`, `#events` และ `#finance` ยัง redirect ไปยังหน้าปัจจุบันเพื่อรักษา deep link.

- **หน้าหลัก:** ผัง schematic แบบสัมพัทธ์จากภาพทำเครื่องหมายของผู้ใช้ พร้อม marker 4 relay (`pump`, `zone1`, `lighthome`, `lightsala`) และ live status จาก ESP. ตำแหน่งถูกใช้เพื่อเลือก relay/นำทางไปหน้า “ระบบน้ำ” เท่านั้น ไม่มีคำสั่ง MQTT จาก Home; ผังไม่ใช่แผนที่ภูมิศาสตร์ ไม่บอกขนาด/ทิศ/พิกัดจริง. แสดง DHT11 และ controller telemetry ที่ได้รับจริงเท่านั้น.
- **ระบบน้ำ:** relay actions, AUTO/MANUAL และ schedule editor 4 ช่วงต่อ relay. คำสั่งต้องมี MQTT online, ESP heartbeat/status ล่าสุดตาม contract; UI รอการยืนยันจาก ESP และไม่ optimistic-update. ตารางตรวจรูปแบบเวลา/ช่วงทับซ้อนก่อนส่งและทำงานบน ESP เมื่ออยู่ AUTO.
- **อุปกรณ์:** ESP8266, DHT11 และ DS3231 fields จาก telemetry จริง. ไม่มีการแสดงอุปกรณ์ที่ยังไม่ได้ติดตั้งหรือค่าจำลอง; ค่าไม่พร้อมแสดงว่า “ยังไม่มีข้อมูล”. การยืนยัน hardware ต้องตรวจภาคสนาม.
- **ระบบ:** MQTT credential setup, optional auto-connect, connection state/reconnect/error, ESP heartbeat และ diagnostics. Credential ใช้ `sessionStorage` โดยปริยาย หรือ `localStorage` เมื่อผู้ใช้เลือกจดจำ; เว็บ static ไม่มี backend authentication. ควรตั้ง broker ACL ให้จำกัดสิทธิ์ตาม topic ก่อนใช้งาน credential บน browser client. IP แสดงเฉพาะในรายละเอียดขั้นสูง. System check ตรวจ HTTP files/manifest เท่านั้น; reload ขออัปเดต Service Worker แล้วโหลดหน้าใหม่.
- **การแจ้งเตือนเซนเซอร์:** ตั้งเกณฑ์อุณหภูมิ/ความชื้นในหน้า “ระบบ”; ค่าเริ่มต้น 35 °C และ 80% RH เป็นตัวอย่างและปรับได้. แสดงคำเตือนบน Home เฉพาะเมื่อได้รับ DHT11 จริงภายใน 90 วินาที, บันทึกเฉพาะตอนสถานะเกิน/กลับเข้าเกณฑ์เปลี่ยน, และวาดเส้นประ threshold ในกราฟ 24 ชั่วโมง. ค่าตั้งเก็บใน `localStorage` ของเบราว์เซอร์นี้เท่านั้น; ไม่ซิงก์ไป ESP, broker หรือ cloud และไม่ใช่การแจ้งเตือนระบบปฏิบัติการ.
- **อากาศ:** Open-Meteo current conditions และ forecast 3 วันจากจุดอ้างอิงระดับภูมิภาคที่ปัดละเอียดแล้ว ไม่ระบุจุดฟาร์ม. Forecast อาจคลาดเคลื่อนจากพื้นที่จริง, แยกจาก DHT11 และไม่ควบคุม relay/safety.
- **บันทึก:** event timeline จำกัดใน memory ของ session ปัจจุบันและหายเมื่อ reload; filter เป็น UI เท่านั้น. สมุดบัญชีรายรับ/รายจ่ายใช้ `localStorage` ของ browser นี้, ไม่ sync cloud, มี export CSV และการล้างข้อมูลต้องยืนยัน.

Desktop ใช้เมนูแนวตั้งด้านซ้าย; mobile ใช้เมนู 6 รายการพร้อม safe-area. ปุ่มและ marker ใช้งานด้วยคีย์บอร์ด, visible focus และลด animation เมื่อ `prefers-reduced-motion`.

## MQTT setup

1. เปิด “ระบบ” บน HTTPS.
2. ป้อน MQTT username/password ที่มี ACL จำกัด topic scope; static browser credential ไม่ใช่ secret จากผู้ใช้ browser.
3. เลือกว่าจะจำใน `localStorage` หรือใช้เฉพาะ session.
4. ตรวจ MQTT ONLINE และ ESP ONLINE แยกกัน; ต้องมี heartbeat ล่าสุด.
5. ควบคุม relay/mode/schedule ได้ใน “ระบบน้ำ” เท่านั้นและรอ status จาก ESP.
