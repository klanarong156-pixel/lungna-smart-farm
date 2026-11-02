# MQTT Topics และ Payload

คง contract ที่ตรวจพบจาก firmware V7.2.0 เดิม (ดู `compatibility-report.md`). ห้ามแก้ topic โดยไม่มี firmware compatibility plan.

| Topic | Direction | Payload | Retain | หมายเหตุ |
|---|---|---|---:|---|
| `smartfarm/status/online` | ESP → clients | `true` / `false` | yes | `false` เป็น LWT; retained `true` ไม่ยืนยันว่า ESP live อยู่ |
| `smartfarm/status/device` | ESP → clients | device JSON | yes | heartbeat มี firmware/device id/uptime/network/OTA/safety diagnostics; ใช้ non-retained heartbeat สำหรับ liveness |
| `smartfarm/sensor/dht11` | ESP → clients | JSON ตัวเลข finite `temperature` และ `humidity` (ต้องมีทั้งคู่) | no | ไม่เติมค่า default 0; payload ที่ขาด/มีค่า null จะถูกปฏิเสธทั้งชุดและคงค่าดีล่าสุดไว้ |
| `smartfarm/relay/{pump,zone1,lighthome,lightsala}/status` | ESP → clients | `ON` / `OFF` | yes | เป็น source of truth ของ relay |
| `smartfarm/relay/{id}/set` | Dashboard → ESP | `ON` / `OFF` | no | QoS 1; UI รอ status topic กลับมา |
| `smartfarm/mode/status` | ESP → clients | `AUTO` / `MANUAL` | yes | ค่า `SCHEDULE` ไม่ใช่ firmware mode ที่ตรวจพบ |
| `smartfarm/mode/set` | Dashboard → ESP | `AUTO` / `MANUAL` | no | QoS 1; UI รอ mode/status ยืนยัน |
| `smartfarm/schedule/{id}/set` | Dashboard → ESP | `{"slots":[{"enabled":true,"on":"06:00","off":"06:15"}, ...]}` หรือ `DELETE` | no | QoS 1; dashboard ส่ง 4 slots แล้วรอ status ที่ตรงกันจาก ESP |
| `smartfarm/schedule/{id}/status` | ESP → clients | `{"slots":[{"enabled":true,"on":"06:00","off":"06:15"}, ...]}` | yes | มี 4 slots; ส่งเมื่อ MQTT reconnect และหลังบันทึก schedule |
| `smartfarm/emergency/status` | ESP → clients | emergency JSON | yes | safety lock เป็นของ firmware; dashboard แสดงเป็น critical alert |
| `smartfarm/system/error` | ESP → clients | diagnostic JSON | no | dashboard แสดงใน system alert และ event timeline |

Schedule/relay IDs: `pump`, `zone1`, `lighthome`, `lightsala`. แต่ละรีเลย์มี 4 slots ต่อวัน; ใช้เวลา `HH:MM` ใน timezone ที่ ESP ตั้งจาก RTC/NTP. Slots ที่เปิดใช้งานห้ามทับซ้อน; ข้ามเที่ยงคืนได้. ตารางทำงานเมื่อ ESP อยู่ AUTO. Dashboard validate ก่อน publish และจะแจ้งสำเร็จเมื่อได้รับ `schedule/status` ตรงกับค่าที่ส่งเท่านั้น; timeout ไม่ถือว่าเป็นการบันทึกสำเร็จ.

Dashboard connection ONLINE หมายถึง MQTT broker connection สำเร็จ; ESP ONLINE ต้องอาศัย live heartbeat จาก device (timeout 25 วินาที) ไม่ใช่เพียง browser MQTT connection. การส่ง MQTT PUBACK อย่างเดียวไม่ใช่ ESP schedule acknowledgement.
