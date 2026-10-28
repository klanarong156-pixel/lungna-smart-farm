# Relay Logic — V7.2.0

| UI | Firmware ID | GPIO/board label | ON electrical level | OFF electrical level | MQTT state |
|---|---|---|---|---|---|
| ปั๊มน้ำ | `pump` | D5 / GPIO14 | LOW | HIGH | `smartfarm/relay/pump/status` |
| โซน 1 | `zone1` | D6 / GPIO12 | LOW | HIGH | `smartfarm/relay/zone1/status` |
| ไฟบ้าน | `lighthome` | D7 / GPIO13 | LOW | HIGH | `smartfarm/relay/lighthome/status` |
| ไฟศาลา | `lightsala` | D8 / GPIO15 | LOW | HIGH | `smartfarm/relay/lightsala/status` |

หลักฐาน: `firmware/esp8266/src/main.ino` definitions `RELAY_PUMP` … `RELAY_LIGHT_SALA`, `RELAY_ON LOW`, `RELAY_OFF HIGH`; `relayOn`, `relaySetRaw`, `publishRelayStatus`.

## Dashboard contract

- `null` = ยังไม่มีข้อมูล; `true` = เปิด; `false` = ปิด.
- ห้ามแปลง disconnected/null เป็น `false`.
- กดปุ่มแล้วแสดง “กำลังสั่งงาน…” โดยไม่เปลี่ยน state ที่แสดง.
- Publish คำสั่ง non-retained `ON`/`OFF`; MQTT PUBACK ไม่ใช่ ESP acknowledgement.
- ยืนยันสำเร็จเมื่อได้รับ relay status ที่ตรงกับ target; timeout 9 วินาทีแสดง “ไม่สามารถยืนยันสถานะได้”.
- เมื่อ broker/ESP offline ปุ่มควบคุมปิดใช้งาน; UI ไม่อนุมานสถานะ relay.

## Safety

AUTO schedule, emergency latch, OTA safe state, relay protection และ pump logic อยู่บน ESP8266. Dashboard เป็น client สำหรับอ่านและส่งคำสั่งเท่านั้น. Firmware contract ที่ตรวจระบุว่า pump ไม่มี forced 30-minute cutoff หรือ MQTT-loss cutoff; อย่าตีความ dashboard เป็น safety interlock. วงจรปั๊มต้องมีอุปกรณ์ hardware safety เหมาะสม.
