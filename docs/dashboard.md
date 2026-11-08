# Dashboard V2.1 — เมนูและแนวทางใช้งาน

## เมนูหลัก 4 รายการ

| เมนู | route/view | หน้าที่ |
|---|---|---|
| หน้าหลัก | `#home` | สถานะ MQTT/ESP, ค่า DHT11, ทางลัดรีเลย์ 4 ช่อง, ภาพแปลงที่ระบุว่าเป็นภาพประกอบ, สรุประบบน้ำ/ตาราง, แนวโน้มในเบราว์เซอร์นี้ และเหตุการณ์ การควบคุมยังอยู่หน้า Water |
| รายงาน | `#finance` → Records/Finance | สมุดบันทึกผลผลิตและรายรับ–รายจ่าย ยอดรวม ยอดค้างรับ และส่งออก CSV เก็บในเบราว์เซอร์นี้ ไม่มี cloud sync |
| แจ้งเตือน | `#events` → Records/Events | ประวัติเหตุการณ์ ตัวกรองยังไม่อ่าน รายละเอียด/แนวทางตรวจสอบ และสถานะ Emergency Stop หรือ sensor threshold badge นับเหตุการณ์ที่ยังไม่อ่านจริง และซ่อนเมื่อเป็นศูนย์ |
| โปรไฟล์ | `#profile` | สถานะ MQTT/ESP/Firmware พร้อมทางลัดไปหน้าอุปกรณ์ การเชื่อมต่อ/ตั้งค่า ระบบน้ำ และอากาศ ไม่มีบัญชีผู้ใช้หรือ Firebase profile ใน baseline |

ทั้ง desktop sidebar และ mobile bottom bar แสดงเฉพาะ 4 เมนูหลัก หน้ายูทิลิตีเดิมยังเปิดจากลิงก์บริบทและ direct hash ได้: `#water`, `#devices`, `#system`, `#weather`; `#settings` และ `#connection-page` ยังคงไปหน้า System. `#records` เปิดมุมมองเหตุการณ์ ส่วน `#events` และ `#finance` เดิมยังใช้ได้ ปุ่ม Reports/Alerts เปิด panel การเงิน/เหตุการณ์เดิม ไม่สร้าง data store ซ้ำ

## ความจริงของข้อมูลและความปลอดภัย

Firmware ที่ตรวจสอบเป็น ESP8266 V7.2.0-OTA-STABLE. ค่าเซนเซอร์สิ่งแวดล้อมที่แสดงมีเฉพาะ DHT11; ไม่มีการสร้างค่าความชื้นดิน แบตเตอรี่ อายุแปลง เปอร์เซ็นต์การเติบโต หรือผลผลิตขึ้นเอง การเชื่อมต่อ MQTT กับ broker แยกจาก heartbeat ของ ESP และ retained online status เพียงอย่างเดียวไม่ถือว่าอุปกรณ์ live.

ปุ่มรีเลย์ต้องผ่านการยืนยันจากผู้ใช้ และใช้งานได้เมื่อ MQTT online, ESP มี heartbeat ล่าสุด, สถานะรีเลย์ทราบค่า และ Emergency Stop ไม่ทำงาน State machine ตรวจเงื่อนไขจาก state ล่าสุดอีกครั้งหลังปิดหน้าต่างยืนยัน เพื่อไม่ส่งคำสั่งเก่าหาก connection/heartbeat/safety/relay เปลี่ยนระหว่างผู้ใช้กำลังตัดสินใจ ระบบรอ `relay/status` ที่ตรงกับคำสั่งจาก ESP; MQTT PUBACK ไม่ใช่การยืนยันจากอุปกรณ์

ภาพเกษตรกร แตงกวา ปั๊มน้ำ และผู้ช่วย AI เป็นภาพประกอบที่สร้างขึ้น ไม่ใช่ภาพสวนหรืออุปกรณ์จริง AI วิเคราะห์สถานะเป็นฟีเจอร์ opt-in ที่ผู้ใช้กดเองและอ่าน snapshot เท่านั้น; ค่าเริ่มต้นปิดจนติดตั้ง Worker/Turnstile และตั้งค่า public endpoint/site key. ส่งเฉพาะสถานะ MQTT/ESP, heartbeat, DHT11, thresholds, relay states, mode, Emergency Stop และ firmware. ไม่ส่ง MQTT credentials, IP, finance, schedules, raw logs หรือพิกัด. AI ไม่มี MQTT client, tool/function calling หรือ actuator command path; ผลลัพธ์เป็นข้อความให้ผู้ใช้ตรวจสอบและไม่ถือเป็นคำวินิจฉัย. ดูขั้นตอนตั้งค่าและ policy ที่ [`ai-assistant.md`](ai-assistant.md).

## ระบบน้ำ การตั้งค่า และอากาศ

หน้า Water คงการควบคุมรีเลย์ 4 ช่อง โหมด AUTO/MANUAL และตาราง 4 ช่วงต่อรีเลย์ไว้ตาม contract ใน [`mqtt-topics.md`](mqtt-topics.md): relay set/status `ON`/`OFF`, mode `AUTO`/`MANUAL` และ schedule JSON 4 slots. ตารางตรวจรูปแบบเวลา/ช่วงทับซ้อนก่อนบันทึก และถือว่าสำเร็จเมื่อ ESP ส่ง `schedule/status` ตรงกัน ตารางทำงานตามเวลาของ ESP ในโหมด AUTO. ห้ามทดสอบ actuator กับระบบ production โดยไม่มีแผนความปลอดภัยภาคสนาม

หน้า System คงการตั้งค่า MQTT ในเบราว์เซอร์ การเลือกจำ credential เกณฑ์แจ้งเตือน DHT11 และ diagnostics เดิม Static browser credential ไม่ใช่การยืนยันตัวตนฝั่ง server และผู้ใช้เบราว์เซอร์เข้าถึงได้ ควรจำกัด broker ACL ตาม topic. Firebase ไม่ได้เชื่อมต่อ และ Dashboard ไม่ได้อัปโหลด firmware; OTA ยังเป็นกระบวนการบนอุปกรณ์/LAN. Weather เป็นพยากรณ์ Open-Meteo ระดับภูมิภาค ไม่ใช่ค่าจาก DHT11 หรือสัญญาณเตือนภัยท้องถิ่น

## ข้อมูลในเบราว์เซอร์และการตรวจสอบ

ประวัติเหตุการณ์/แนวโน้มเซนเซอร์ เกณฑ์แจ้งเตือน และสมุดการเงินเก็บใน browser storage ตามฟังก์ชันเดิม ไม่มี cloud backup และไม่ใช่ประวัติรวมจากหลายอุปกรณ์ PWA shell ใช้ cache `lungna-shell-v21`; Service Worker ลบเฉพาะ cache เก่าที่มี prefix `lungna-shell-*` และคง cache ของระบบอื่นไว้. โค้ดแอปไม่เก็บ AI snapshot เป็นประวัติ แต่การประมวลผลหรือ retention ฝั่ง AI provider ขึ้นกับ provider/account policy และต้องตรวจสอบก่อนเปิดใช้

ก่อน deploy ให้รัน `./scripts/pre-deploy-check.sh` ซึ่งตรวจ syntax, manifest, tests, firmware source contract และ static asset paths. การตรวจ MQTT hardware เป็นแบบ opt-in/read-only และไม่อยู่ใน predeploy ปกติ; การทดสอบ relay, pump, MQTT จริง และ OTA ต้องทำแยกในสถานที่อย่างปลอดภัย

## แหล่งอ้างอิง baseline

ตรวจจาก repository [klanarong156-pixel/lungna-smart-farm](https://github.com/klanarong156-pixel/lungna-smart-farm) ณ baseline commit [`78edd028cea28df31f7d1f2a4941fff79f126d94`](https://github.com/klanarong156-pixel/lungna-smart-farm/commit/78edd028cea28df31f7d1f2a4941fff79f126d94). Contract ที่อ้างอิง: [firmware/esp8266/src/main.ino](https://github.com/klanarong156-pixel/lungna-smart-farm/blob/78edd028cea28df31f7d1f2a4941fff79f126d94/firmware/esp8266/src/main.ino), [docs/mqtt-topics.md](https://github.com/klanarong156-pixel/lungna-smart-farm/blob/78edd028cea28df31f7d1f2a4941fff79f126d94/docs/mqtt-topics.md), [dashboard/js/state.js](https://github.com/klanarong156-pixel/lungna-smart-farm/blob/78edd028cea28df31f7d1f2a4941fff79f126d94/dashboard/js/state.js), [dashboard/js/mqtt.js](https://github.com/klanarong156-pixel/lungna-smart-farm/blob/78edd028cea28df31f7d1f2a4941fff79f126d94/dashboard/js/mqtt.js) และ [tests/mqtt-contract.test.cjs](https://github.com/klanarong156-pixel/lungna-smart-farm/blob/78edd028cea28df31f7d1f2a4941fff79f126d94/tests/mqtt-contract.test.cjs).
