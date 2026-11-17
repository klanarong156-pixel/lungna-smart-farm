# ตั้งค่า EMQX Serverless ให้เชื่อมต่อกับ Dashboard

คู่มือนี้ใช้กับ Smart Farm Dashboard ใน `dashboard/` ซึ่งเชื่อมต่อ EMQX ผ่าน MQTT over WebSocket แบบปลอดภัย (WSS) โดยตรงจากเบราว์เซอร์

## 1. สร้าง deployment และคัดลอก endpoint

1. เข้า EMQX Cloud แล้วสร้าง deployment แบบ **Serverless** รอให้สถานะพร้อมใช้งาน
2. เปิดหน้า **Deployment → Overview** แล้วคัดลอก broker address/hostname ของ deployment นั้น
3. Dashboard ใช้ secure WebSocket พอร์ต `8084` และ path `/mqtt` รูปแบบเต็มคือ:

   ```text
   wss://<broker-hostname>:8084/mqtt
   ```

   ตัวอย่างรูปแบบเท่านั้น: `wss://example.emqxsl.com:8084/mqtt` — ให้ใช้ hostname จริงจาก Overview ของคุณ ไม่ใช้ตัวอย่างนี้

## 2. สร้าง MQTT user สำหรับ Dashboard

1. ไปที่ **Access Control → Authentication → Users** (ชื่อเมนูอาจต่างเล็กน้อยตามหน้า console)
2. สร้าง username/password เฉพาะสำหรับ Dashboard ไม่ใช้บัญชี root หรือ credential เดียวกับ ESP8266
3. ใน **Authorization/ACL** อนุญาตให้ user นี้ subscribe เฉพาะ topics ที่ Dashboard อ่าน:

   ```text
   smartfarm/status/#
   smartfarm/sensor/#
   smartfarm/relay/+/status
   smartfarm/mode/status
   smartfarm/schedule/+/status
   smartfarm/emergency/status
   smartfarm/system/error
   ```

4. อนุญาตให้ publish เฉพาะ topics คำสั่งที่ Dashboard ส่ง:

   ```text
   smartfarm/relay/+/set
   smartfarm/mode/set
   smartfarm/schedule/+/set
   ```

ใช้กฎแบบ deny-by-default หาก deployment รองรับ และตรวจสอบลำดับกฎให้แน่ใจว่า user Dashboard ไม่ได้รับสิทธิ์ publish กว้างเกินจำเป็น อย่าให้สิทธิ์ `#` แบบ publish แก่ browser user เพราะ credential ที่ใช้ในเว็บสามารถถูกผู้ใช้เบราว์เซอร์ตรวจดูได้

## 3. กรอกค่าที่ Dashboard

1. เปิด Dashboard ผ่าน HTTPS แล้วไปที่หน้า **ระบบ → การเชื่อมต่อ MQTT**
2. ตรวจ endpoint และ username ที่แสดงในหน้าให้ตรงกับ deployment และ MQTT user ที่สร้างไว้; Dashboard รุ่นนี้กำหนด broker endpoint และ username ไว้เป็นค่าคงที่ และแสดงเป็นข้อมูลอ่านอย่างเดียว
3. กรอกเฉพาะรหัสผ่านของ MQTT user แล้วกด **บันทึกและเชื่อมต่อ**
4. ใช้ช่อง **จำ credential** เฉพาะเมื่อยอมรับให้เบราว์เซอร์นี้เก็บ password ใน `localStorage`; หากไม่เลือก ระบบใช้ `sessionStorage` และ password จะอยู่ใน session ของเบราว์เซอร์นั้น

ห้ามใส่ MQTT password ใน source code, GitHub repository, URL, issue หรือคอมเมนต์สาธารณะ Dashboard ไม่มี backend สำหรับซ่อน password จากผู้ใช้ที่เปิดหน้าเว็บ จึงควรใช้ user ที่จำกัดสิทธิ์และแยกจากอุปกรณ์

## 4. ตรวจว่าทำงานครบ

- สถานะ MQTT ใน Dashboard ควรเปลี่ยนเป็น **ออนไลน์** โดยใช้ TLS/WSS
- ตรวจว่ามีข้อมูล heartbeat/status จาก ESP8266, sensor และ relay status เข้ามา หาก MQTT ออนไลน์แต่ไม่มีข้อมูลอุปกรณ์ ให้ตรวจว่า ESP เปิดอยู่ เชื่อม broker ได้ และ publish ตาม topics ที่กำหนด
- ทดลองส่งคำสั่งเฉพาะเมื่อ ESP, relay/pump และ emergency safety state พร้อม ตรวจสอบการยืนยันจากสถานะที่ ESP ส่งกลับ ไม่ถือว่า MQTT publish สำเร็จเท่ากับอุปกรณ์ทำงานแล้ว
- หากเชื่อมต่อไม่ได้ ให้ตรวจ hostname, port `8084`, path `/mqtt`, username/password, ACL ของ subscribe/publish, การเข้าถึงอินเทอร์เน็ต และว่าเปิด Dashboard ผ่าน HTTPS

การทดสอบ unit/regression ใน repository ไม่ได้ยืนยัน credential, ACL หรือ hardware ของ deployment จริง การทดสอบกับ broker ใช้ `scripts/mqtt-health-check.cjs` แบบอ่านอย่างเดียวได้ โดยตั้ง environment ตามคำอธิบายที่ `docs/firmware.md`; ห้ามทดสอบคำสั่ง relay จริงจนกว่าจะตรวจความปลอดภัยของฮาร์ดแวร์และ ACL แล้ว
