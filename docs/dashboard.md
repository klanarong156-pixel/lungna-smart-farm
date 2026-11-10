# Dashboard V2.2 — เมนูและแนวทางใช้งาน

## เมนูหลัก

| เมนู | route/view | หน้าที่ |
|---|---|---|
| หน้าหลัก | `#home` | แสดงค่าจาก DHT11, สถานะ ESP8266, สถานะปั๊ม/ตาราง, รีเลย์อื่น, แนวโน้ม และเหตุการณ์เท่านั้น ไม่มีปุ่มสั่งงาน |
| ระบบน้ำ | `#water` | จุดเดียวสำหรับควบคุมรีเลย์ 4 ช่อง เปลี่ยน AUTO/MANUAL และจัดการตารางเวลา |
| รายงาน | `#finance` → Records/Finance | สมุดบันทึกผลผลิตและรายรับ–รายจ่าย ยอดรวม ยอดค้างรับ และส่งออก CSV เก็บในเบราว์เซอร์นี้ |
| แจ้งเตือน | `#events` → Records/Events | ประวัติเหตุการณ์ ตัวกรองยังไม่อ่าน รายละเอียด/แนวทางตรวจสอบ และสถานะ Emergency Stop หรือ sensor threshold badge นับเหตุการณ์ที่ยังไม่อ่านจริงและซ่อนเมื่อเป็นศูนย์ |
| โปรไฟล์ | `#profile` | สถานะระบบ พร้อมลิงก์ไปอุปกรณ์ การตั้งค่า MQTT และพยากรณ์อากาศ |

ทั้ง desktop sidebar และ mobile bottom bar ใช้ชุดเมนูเดียวกัน 5 รายการ ระบบน้ำเข้าถึงจากเมนูหลักเพียงจุดเดียว; ไม่แสดงทางลัดสั่งงานบนหน้าหลัก. หน้า Devices, System และ Weather ยังคงเป็นหน้ารายละเอียดใน Profile และ direct hashes เดิมใช้ได้. `#settings`/`#connection-page` ไปหน้า System; `#records`, `#events` และ `#finance` ยังรองรับลิงก์เดิม.

## ความจริงของข้อมูลและความปลอดภัย

Firmware candidate V7.3.0-OTA-STABLE สืบทอด hardware contract ของ ESP8266 เดิมและคงเฉพาะข้อมูลจาก MQTT/ESP กับการแจ้งเตือนระบบปกติ. ค่าเซนเซอร์ที่แสดงมีเฉพาะ DHT11; ไม่มีการสร้างค่าความชื้นดิน แบตเตอรี่ อายุแปลง เปอร์เซ็นต์การเติบโต หรือผลผลิตขึ้นเอง. สถานะ MQTT กับ heartbeat ของ ESP แสดงแยกกัน.

ปุ่มสั่งงานทั้งหมดอยู่ในหน้า Water และต้องผ่านการยืนยันของผู้ใช้ ใช้งานได้เมื่อ MQTT online, ESP มี heartbeat ล่าสุด, สถานะรีเลย์ทราบค่า และ Emergency Stop ไม่ทำงาน ระบบรอ `relay/status` จาก ESP; MQTT PUBACK ไม่ใช่การยืนยันอุปกรณ์.

## ระบบน้ำ การตั้งค่า และอากาศ

หน้า Water คงการควบคุมรีเลย์ 4 ช่อง โหมด AUTO/MANUAL และตาราง 4 ช่วงต่อรีเลย์ตาม contract ใน [`mqtt-topics.md`](mqtt-topics.md): relay set/status `ON`/`OFF`, mode `AUTO`/`MANUAL` และ schedule JSON 4 slots. ตารางตรวจรูปแบบเวลา/ช่วงทับซ้อนก่อนบันทึก และถือว่าสำเร็จเมื่อ ESP ส่ง `schedule/status` ตรงกัน. ตารางทำงานตามเวลาของ ESP ในโหมด AUTO. ห้ามทดสอบ actuator กับระบบ production โดยไม่มีแผนความปลอดภัยภาคสนาม.

หน้า System คงการตั้งค่า MQTT ในเบราว์เซอร์ การเลือกจำ credential เกณฑ์แจ้งเตือน DHT11 และ diagnostics เดิม. Static browser credential ไม่ใช่การยืนยันตัวตนฝั่ง server และผู้ใช้เบราว์เซอร์เข้าถึงได้; ควรจำกัด broker ACL ตาม topic. Firebase ไม่ได้เชื่อมต่อ และ Dashboard ไม่ได้อัปโหลด firmware. Weather เป็นพยากรณ์ Open-Meteo ระดับภูมิภาค ไม่ใช่ค่าจาก DHT11 หรือสัญญาณเตือนภัยท้องถิ่น.

## ข้อมูลในเบราว์เซอร์และการตรวจสอบ

ประวัติเหตุการณ์/แนวโน้มเซนเซอร์ เกณฑ์แจ้งเตือน และสมุดการเงินเก็บใน browser storage ตามฟังก์ชันเดิม ไม่มี cloud backup และไม่ใช่ประวัติรวมจากหลายอุปกรณ์. PWA shell ใช้ cache `lungna-shell-v23`; Service Worker ลบเฉพาะ cache เก่าที่มี prefix `lungna-shell-*` และคง cache ของระบบอื่นไว้.

ก่อน deploy ให้รัน `./scripts/pre-deploy-check.sh` ซึ่งตรวจ syntax, manifest, tests, firmware source contract และ static asset paths. การตรวจ MQTT hardware เป็นแบบ opt-in/read-only และไม่อยู่ใน predeploy ปกติ; การทดสอบ relay, pump, MQTT จริง และ OTA ต้องทำแยกในสถานที่อย่างปลอดภัย.
