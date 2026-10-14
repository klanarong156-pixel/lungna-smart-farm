# แนวทางเริ่มพัฒนาฟีเจอร์

โฟลเดอร์นี้ใช้เก็บ brief และ design notes ของฟีเจอร์ใหม่ โดยยังไม่ผูกกับ framework หรือ backend ที่โครงการยังไม่ได้ใช้งาน

## เริ่มงานใหม่

1. สร้าง branch จาก `main` ล่าสุดด้วยชื่อ `feature/<short-name>`
2. คัดลอก [`feature-brief-template.md`](feature-brief-template.md) เป็น `docs/features/<short-name>.md` และระบุปัญหา ผู้ใช้ ขอบเขต/สิ่งที่ไม่ทำ และ acceptance criteria
3. ระบุ data owner, state source, persistence, security/privacy, offline behavior และ dependency ก่อนเปลี่ยน implementation
4. แยก implementation ตาม bounded context เดิม: `dashboard/` สำหรับ browser UI, `firmware/esp8266/` สำหรับ controller/ฮาร์ดแวร์ และ `docs/` สำหรับ contract/decision
5. เพิ่ม regression tests ใน `tests/` และอัปเดตเอกสารที่เกี่ยวข้องเมื่อเปลี่ยน contract
6. เปิด PR กลับ `main`; ระบุผลทดสอบจริง ข้อจำกัด hardware และผลกระทบต่อ deployment ให้ชัด

## Invariants ของระบบ

- ESP8266 เป็นเจ้าของการควบคุม relay, AUTO/MANUAL, schedule, emergency และ safety; Dashboard แสดงสถานะจริงและส่งคำสั่งผ่าน MQTT เท่านั้น
- สถานะ relay/sensor ที่ยังไม่ยืนยันต้องคงเป็น unknown/null ห้ามแปลงเป็น OFF หรือค่าจำลอง
- การเปลี่ยน MQTT ต้องรักษา topic, payload, QoS, retain และ acknowledgement ให้สอดคล้องกับ firmware พร้อม contract tests
- Finance เป็น local-only ใน browser จนกว่าจะมีการอนุมัติ backend/sync และแผน migration โดยชัดแจ้ง
- Forecast ต้องแยกจาก sensor telemetry; การขาดข้อมูลจากอุปกรณ์/API ต้องไม่สร้างค่าทดแทนที่ดูเหมือนค่าจริง
- การแก้ Service Worker ต้องลบเฉพาะ cache namespace ของ Smart Farm; ห้ามลบ Cache Storage ของแอปอื่นบน origin เดียวกัน
- ห้าม commit credentials, tokens, device identifiers ที่เป็นความลับ หรือข้อมูลผู้ใช้ลง source/report/test fixture

## แนวทาง validation

| ประเภทการเปลี่ยนแปลง | การตรวจขั้นต่ำ |
|---|---|
| Dashboard UI/route | syntax checks, `tests/dashboard-pages.test.cjs`, `tests/paths.test.cjs`, browser check มือถือและ desktop |
| State/MQTT command | `tests/state-contract.test.cjs`, `tests/mqtt-contract.test.cjs`, ตรวจ topic/payload/ACK และ offline/unknown paths |
| Firmware/ฮาร์ดแวร์ | PlatformIO `pio run -e nodemcuv2`, firmware contract tests และระบุ hardware-only tests ที่ยังไม่ได้ทำ |
| PWA/offline/cache | ทดสอบ install/activate/upgrade/offline fallback; ยืนยันว่า cache ของ app อื่นยังอยู่ด้วย `tests/service-worker-cache.test.cjs` |
| Data/persistence | schema/validation, migration/rollback plan และทดสอบข้อมูลเดิมก่อนเปลี่ยน storage |

ไม่อ้างว่า hardware/MQTT integration ผ่าน หากไม่ได้ทดสอบกับอุปกรณ์และ broker ที่เกี่ยวข้องจริง

## งานต่อยอดที่ทำใน branch นี้

- [x] จำกัด Service Worker cleanup ให้ลบเฉพาะ cache namespace `lungna-shell-*` ของ Smart Farm และ preserve cache ของแอปอื่น
- [x] อัปเดตเอกสาร, Settings label และ offline shell เป็น cache `v5`
- [x] ปรับโครงสร้าง dashboard เพื่อลดจุดควบคุม/ข้อมูลซ้ำ และเพิ่ม regression tests
