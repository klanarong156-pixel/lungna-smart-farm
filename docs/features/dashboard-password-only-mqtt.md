# Feature brief: Dashboard MQTT Password-Only Setup

> สถานะ: Implemented locally; pull request pending
> Branch: `feature/dashboard-password-only-mqtt`
> ผู้รับผิดชอบ: Dashboard maintainers
> วันที่อัปเดต: 2026-11-18

## 1. ปัญหาและผลลัพธ์ที่ต้องการ

- ผู้ใช้/บทบาท: ผู้ดูแลสวนที่เปิด Smart Farm Dashboard บนมือถือหรือเดสก์ท็อป
- ปัญหาปัจจุบัน: ผู้ใช้ต้องกรอก broker endpoint, username และ password เอง ซึ่งทำให้ตั้งค่าผิดหรือยุ่งยากบนมือถือ
- ผลลัพธ์ที่คาดหวังและวิธีวัด: Dashboard แสดง endpoint และ username ที่กำหนดไว้ และผู้ใช้กรอกได้เฉพาะ MQTT password; regression test ยืนยันฟอร์มและ credential flow ตามนี้

## 2. ขอบเขต

### ทำ
- กำหนด WSS endpoint ของ EMQX deployment และ username `smartfarm-dashboard` จาก Dashboard config
- แสดง endpoint และ username เป็นข้อมูลอ่านอย่างเดียว โดยแสดง path/port ผ่าน endpoint และรายละเอียด Broker
- ให้กรอกเฉพาะ password, บันทึกได้ใน `sessionStorage` หรือ `localStorage` ตามตัวเลือกจำ credential และล้างค่า endpoint/username แบบเก่าจาก browser storage
- ปรับการจัดวางค่าการเชื่อมต่อให้อ่านได้บนหน้าจอแคบ และปรับ cache/version ของ PWA

### ไม่ทำ
- ไม่ฝัง MQTT password ใน source code, GitHub, URL หรือไฟล์ config
- ไม่เปลี่ยน ACL, MQTT topics/payload/QoS/retain, firmware หรือสิทธิ์การควบคุมอุปกรณ์
- ไม่แก้ไข password หรือเปลี่ยนการตั้งค่า deployment ใน EMQX Console
- ไม่ deploy หรือ merge เข้า `main` ในขั้นตอนพัฒนา branch นี้

## 3. User flow และ acceptance criteria

1. เมื่อผู้ใช้เปิดหน้า **ระบบ → การเชื่อมต่อ MQTT** endpoint และ username ที่กำหนดใน config ต้องแสดงในหน้า และต้องไม่มีช่องแก้ไข endpoint/username
2. ผู้ใช้กรอก password แล้วกด **บันทึกและเชื่อมต่อ**; MQTT.js ต้องใช้ endpoint และ username จาก config พร้อม password ที่ผู้ใช้กรอก
3. เมื่อเลือกจำ credential ให้เก็บเฉพาะ password ใน `localStorage`; หากไม่เลือก ให้เก็บเฉพาะ password ใน `sessionStorage`
4. ค่า endpoint และ username เก่าที่เคยบันทึกใน storage ต้องไม่ override config และต้องถูกล้างเมื่ออ่าน credential/บันทึกใหม่
5. หน้า Settings ต้องแสดงข้อความให้กรอก password เท่านั้น และ endpoint ยาวต้อง wrap ได้บน viewport มือถือ

## 4. System boundaries และ contract

- Bounded context ที่ได้รับผลกระทบ: `dashboard`, `PWA` และ browser storage
- Source of truth ของ broker endpoint และ username: `dashboard/js/config.js`; password มาจากผู้ใช้และไม่ใช่ค่าคงที่
- State เมื่อยังไม่มีข้อมูล: Dashboard แสดงพร้อมเชื่อมต่อและรอ MQTT password; state ออนไลน์/ออฟไลน์ยังอิง MQTT connection และ ESP heartbeat ตามเดิม
- MQTT contract: ไม่มีการเปลี่ยน topics, payload/schema, QoS, retained message, ACK, timeout หรือ retry ของคำสั่ง
- Offline/error behavior: เมื่อไม่มี password ให้แสดงสถานะรอ password; หาก broker ปฏิเสธ authentication ให้คง error handling เดิม

## 5. UX, security และ privacy

- Responsive states และ accessibility: endpoint/username ใช้ output แบบอ่านอย่างเดียวและ wrap บนมือถือ; password ใช้ input type=password
- สิทธิ์/การยืนยันตัวตน/authorization: ใช้ MQTT user เดิมที่จำกัด ACL; ฟีเจอร์นี้ไม่ได้สร้าง backend authentication
- Secrets หรือ personal data: endpoint และ username แสดงต่อผู้ใช้หน้าเว็บได้; ห้ามเก็บ password ใน source, test fixture หรือเอกสาร
- ผลกระทบต่อ localStorage/sessionStorage: คงการเลือกจำ password เดิม; ลบ legacy URL/username keys และไม่เขียน URL/username ใหม่

## 6. Tests และการตรวจรับ

- [x] Unit/state tests: `npm run predeploy` ผ่าน
- [x] MQTT/API contract tests: ทดสอบจำลอง MQTT.js ว่าใช้ endpoint/username คงที่และบันทึกเฉพาะ password
- [x] Dashboard/browser test ที่ viewport มือถือ 390×844 และ desktop 1440×900 ผ่านการตรวจ visual ใน Chromium headless
- [ ] Firmware build/compile: ไม่เกี่ยวข้อง ไม่มีการแก้ firmware
- [ ] Hardware/broker test: ยังไม่ได้ทดสอบกับ EMQX deployment หรืออุปกรณ์จริง
- [x] Regression ที่ต้องรักษา: test หน้า Dashboard และ Service Worker cache ผ่าน; cache ของแอปอื่นยังถูกเก็บตามเดิม

## 7. Rollout และ rollback

- วิธีเปิดใช้/deploy: เปิด PR กลับ `main`; GitHub Pages workflow ตรวจ PR และ deploy อัตโนมัติเมื่อ merge เข้า `main`
- Cache/schema/version migration: Dashboard version `v2.2.0`, shell cache `lungna-shell-v24`; cleanup ลบเฉพาะ namespace `lungna-shell-*`
- เงื่อนไขยกเลิกหรือ rollback: revert PR หาก endpoint หรือ username ไม่ตรงกับ broker ที่ใช้งาน หรือเชื่อมต่อจริงไม่ได้
- Monitoring/logs และเกณฑ์สำเร็จ: ตรวจ MQTT status บน Dashboard และ GitHub Pages deployment; browser/broker test ยังเป็นขั้นตอนหลัง merge

## 8. Risks, assumptions และคำถามค้าง

- Risks: endpoint/username เป็นข้อมูลที่ผู้ใช้เว็บดูได้; browser-side password ไม่สามารถซ่อนจากผู้ใช้หน้าเว็บได้ และการเลือก localStorage คงความเสี่ยงเดิม
- Assumptions: endpoint และ username ใน config ตรงกับ EMQX deployment ที่จะใช้งาน
- Decisions/ผู้อนุมัติ: ทำตามคำขอให้มีข้อมูล connection และให้ผู้ใช้กรอกเฉพาะ password
- คำถามที่ยังต้องตอบก่อน implementation: ไม่มี
