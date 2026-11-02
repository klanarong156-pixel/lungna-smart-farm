# MQTT Topics และ Payload

คง contract ที่ตรวจพบจาก firmware V7.2.0 เดิม (ดู `compatibility-report.md`). ห้ามแก้ topic โดยไม่มี firmware compatibility plan.

| Topic | Direction | Payload | Retain | หมายเหตุ |
|---|---|---|---:|---|
| `smartfarm/status/online` | ESP → clients | `true` / `false` | yes | `false` เป็น LWT; retained `true` ไม่ยืนยันว่า ESP live อยู่ |
| `smartfarm/status/device` | ESP → clients | device JSON | yes | heartbeat มี firmware/device id/`chip_id` (ESP8266 Chip ID 6 หลัก hex)/uptime/network/OTA/safety diagnostics; ใช้ non-retained heartbeat สำหรับ liveness |
| `smartfarm/sensor/dht11` | ESP → clients | JSON ตัวเลข finite `temperature` และ `humidity` (ต้องมีทั้งคู่) | no | ไม่เติมค่า default 0; payload ที่ขาด/มีค่า null จะถูกปฏิเสธทั้งชุดและคงค่าดีล่าสุดไว้ |
| `smartfarm/relay/{pump,zone1,lighthome,lightsala}/status` | ESP → clients | `ON` / `OFF` | yes | เป็น source of truth ของ relay |
| `smartfarm/relay/{id}/set` | Dashboard → ESP | `ON` / `OFF` | no | QoS 1; UI รอ status topic กลับมา |
| `smartfarm/mode/status` | ESP → clients | `AUTO` / `MANUAL` | yes | ค่า `SCHEDULE` ไม่ใช่ firmware mode ที่ตรวจพบ |
| `smartfarm/mode/set` | Dashboard → ESP | `AUTO` / `MANUAL` | no | QoS 1; UI รอ mode/status ยืนยัน |
| `smartfarm/schedule/{id}/set` | Dashboard → ESP | `{"slots":[{"enabled":true,"on":"06:00","off":"06:15"}, ...]}` หรือ `DELETE` | no | QoS 1; dashboard ส่ง 4 slots แล้วรอ status ที่ตรงกันจาก ESP |
| `smartfarm/schedule/{id}/status` | ESP → clients | `{"slots":[{"enabled":true,"on":"06:00","off":"06:15"}, ...]}` | yes | มี 4 slots; ส่งเมื่อ MQTT reconnect และหลังบันทึก schedule |
| `smartfarm/emergency/status` | ESP → clients | emergency JSON | yes | safety lock เป็นของ firmware; dashboard แสดงเป็น critical alert |
| `smartfarm/system/error` | ESP → clients | diagnostic JSON | no | dashboard แสดงใน system alert และ event timeline |
| `smartfarm/admin/setup-ap-password/{chipId}/request` | Admin → ESP | `SHOW` | no | `chipId` คือ ESP8266 Chip ID แบบ 6 หลัก hex จาก `status/device`; จำกัด publish ด้วย broker ACL สำหรับ admin เท่านั้น |
| `smartfarm/admin/setup-ap-password/{chipId}/response` | ESP → Admin | AP password 32 ตัวอักษร hex | no | non-retained; เฉพาะบอร์ดที่ตรงกับ chipId ตอบกลับ; ห้ามให้ Dashboard/บัญชีทั่วไป subscribe |

ACL ที่จำเป็นสำหรับ AP password: device identity subscribe เฉพาะ `smartfarm/admin/setup-ap-password/{its-chipId}/request` และ publish เฉพาะ `smartfarm/admin/setup-ap-password/{its-chipId}/response`; firmware ไม่ subscribe คำขอของบอร์ดอื่น. Admin identity ต้องแยกจาก credentials ของ Dashboard, publish request และ subscribe response เฉพาะ chipId ที่ต้องการ (หรือ wildcard หากจำเป็น); บัญชีอื่น—including Dashboard—ต้องถูก deny สำหรับ `smartfarm/admin/setup-ap-password/#` แม้มี wildcard rules อยู่แล้ว. หาก broker ACL แยกตาม client/device ได้ ให้จำกัด device identity ตาม chipId ของบอร์ดนั้นและอย่าให้ publish กว้างทั้ง namespace. ให้ admin subscribe response ก่อน publish `SHOW`; response เป็น non-retained และไม่ถูกเผยแพร่ซ้ำในภายหลัง.

Schedule/relay IDs: `pump`, `zone1`, `lighthome`, `lightsala`. แต่ละรีเลย์มี 4 slots ต่อวัน; ใช้เวลา `HH:MM` ใน timezone ที่ ESP ตั้งจาก RTC/NTP. Slots ที่เปิดใช้งานห้ามทับซ้อน; ข้ามเที่ยงคืนได้. ตารางทำงานเมื่อ ESP อยู่ AUTO. Dashboard validate ก่อน publish และจะแจ้งสำเร็จเมื่อได้รับ `schedule/status` ตรงกับค่าที่ส่งเท่านั้น; timeout ไม่ถือว่าเป็นการบันทึกสำเร็จ.

Dashboard connection ONLINE หมายถึง MQTT broker connection สำเร็จ; ESP ONLINE ต้องอาศัย live heartbeat จาก device (timeout 25 วินาที) ไม่ใช่เพียง browser MQTT connection. การส่ง MQTT PUBACK อย่างเดียวไม่ใช่ ESP schedule acknowledgement.
