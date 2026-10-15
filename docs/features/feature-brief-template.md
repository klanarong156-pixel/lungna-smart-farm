# Feature brief: <ชื่อฟีเจอร์>

> สถานะ: Draft
> Branch: `feature/<short-name>`
> ผู้รับผิดชอบ: <ชื่อ/ทีม>
> วันที่อัปเดต: YYYY-MM-DD

## 1. ปัญหาและผลลัพธ์ที่ต้องการ

- ผู้ใช้/บทบาท:
- ปัญหาปัจจุบัน:
- ผลลัพธ์ที่คาดหวังและวิธีวัด:

## 2. ขอบเขต

### ทำ
- <ความสามารถที่ระบุได้และตรวจรับได้>

### ไม่ทำ
- <รายการที่อยู่นอก scope เพื่อป้องกัน feature creep>

## 3. User flow และ acceptance criteria

1. Given <สถานะเริ่มต้น>, when <ผู้ใช้/ระบบทำงาน>, then <ผลลัพธ์ที่ตรวจสอบได้>
2. Given <ข้อมูลไม่ครบ/อุปกรณ์ offline>, when <เงื่อนไขเกิด>, then <ระบบต้องแสดง/ทำอะไร>

## 4. System boundaries และ contract

- Bounded context ที่ได้รับผลกระทบ: `dashboard` / `firmware` / MQTT / persistence / PWA / external API
- Source of truth ของข้อมูล:
- State เมื่อยังไม่มีข้อมูล หรือ retained/stale:
- หากแตะ MQTT: topic, payload/schema, QoS, retained, ACK/timeout/retry:
- หากแตะ firmware/control: relay safety, AUTO/MANUAL, schedule, emergency, OTA impact:
- หากแตะข้อมูล: schema, ownership, local/cloud location, migration/rollback:
- Offline/error behavior:

## 5. UX, security และ privacy

- Responsive states และ accessibility:
- สิทธิ์/การยืนยันตัวตน/authorization:
- Secrets หรือ personal data ที่เกี่ยวข้อง (ห้ามใส่ค่า secret จริงในเอกสารนี้):
- ผลกระทบต่อ localStorage/sessionStorage/ข้อมูลเดิม:

## 6. Tests และการตรวจรับ

- [ ] Unit/state tests:
- [ ] MQTT/API contract tests:
- [ ] Dashboard/browser test ที่ viewport มือถือและ desktop:
- [ ] Firmware build/compile หากมีการแก้ firmware:
- [ ] Hardware/broker test ที่ต้องทำจริง และผู้รับผิดชอบ:
- [ ] Regression ที่ต้องรักษา:

## 7. Rollout และ rollback

- วิธีเปิดใช้/deploy:
- Cache/schema/version migration:
- เงื่อนไขยกเลิกหรือ rollback:
- Monitoring/logs และเกณฑ์สำเร็จ:

## 8. Risks, assumptions และคำถามค้าง

- Risks:
- Assumptions (ต้องยืนยัน):
- Decisions/ผู้อนุมัติ:
- คำถามที่ยังต้องตอบก่อน implementation:
