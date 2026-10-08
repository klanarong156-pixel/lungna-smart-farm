# MQTT Topics และ Payload

คง contract ที่ตรวจพบจาก firmware V7.2.0 เดิม (ดู `compatibility-report.md`). ห้ามแก้ topic โดยไม่มี firmware compatibility plan.

| Topic | Direction | Payload | Retain | หมายเหตุ |
|---|---|---|---:|---|
| `smartfarm/status/online` | ESP → clients | `true` / `false` | yes | `false` เป็น LWT; retained `true` ไม่ยืนยันว่า ESP live อยู่ |
| `smartfarm/status/device` | ESP → clients | device JSON | yes | heartbeat มี firmware/device id/uptime/network/OTA/safety diagnostics; ใช้ non-retained heartbeat สำหรับ liveness |
| `smartfarm/sensor/dht11` | ESP → clients | JSON ตัวเลข `temperature`, `humidity` | no | ไม่เติมค่า default 0 |
| `smartfarm/relay/{pump,zone1,lighthome,lightsala}/status` | ESP → clients | `ON` / `OFF` | yes | เป็น source of truth ของ relay |
| `smartfarm/relay/{id}/set` | Dashboard → ESP | `ON` / `OFF` | no | QoS 1; UI รอ status topic กลับมา |
| `smartfarm/mode/status` | ESP → clients | `AUTO` / `MANUAL` | yes | ค่า `SCHEDULE` ไม่ใช่ firmware mode ที่ตรวจพบ |
| `smartfarm/mode/set` | Dashboard → ESP | `AUTO` / `MANUAL` | no | QoS 1; UI รอ mode/status ยืนยัน |
| `smartfarm/schedule/{id}/set` | client → ESP | JSON slots / `DELETE` | no | firmware รองรับ schedule ภายใต้ AUTO; ยังไม่เปิด UI schedule |
| `smartfarm/schedule/{id}/status` | ESP → clients | JSON slots | yes | firmware ใช้ schedules ภายใต้ AUTO; dashboard ยังไม่ subscribe/มี schedule editor |
| `smartfarm/emergency/status` | ESP → clients | emergency JSON | yes | safety lock เป็นของ firmware; dashboard รุ่นนี้ยังไม่ subscribe topic นี้ |
| `smartfarm/system/error` | ESP → clients | diagnostic JSON | no | dashboard รุ่นนี้ยังไม่ subscribe topic นี้ |

Relay IDs: `pump`, `zone1`, `lighthome`, `lightsala`.

Dashboard connection ONLINE หมายถึง MQTT broker connection สำเร็จ; ESP ONLINE ต้องอาศัย live heartbeat จาก device (timeout 25 วินาที) ไม่ใช่เพียง browser MQTT connection.
