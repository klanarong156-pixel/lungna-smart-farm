# Relay Test Matrix

อ้างอิง contract: firmware status retained `ON`/`OFF`; command non-retained `ON`/`OFF`; UI ไม่ optimistic. ตารางเป็น test cases ไม่ใช่หลักฐานว่าได้สั่ง relay จริงแล้ว.

| Relay | Command | ESP ACK ที่ใช้ยืนยัน | State MQTT | Dashboard ที่คาดหวัง |
|---|---|---|---|---|
| Pump | ON | status topic = ON | ON | เปิด หลัง status ตรงกัน |
| Pump | OFF | status topic = OFF | OFF | ปิด หลัง status ตรงกัน |
| Zone1 | ON | status topic = ON | ON | เปิด หลัง status ตรงกัน |
| Zone1 | OFF | status topic = OFF | OFF | ปิด หลัง status ตรงกัน |
| House | ON | status topic = ON | ON | เปิด หลัง status ตรงกัน |
| House | OFF | status topic = OFF | OFF | ปิด หลัง status ตรงกัน |
| Pavilion | ON | status topic = ON | ON | เปิด หลัง status ตรงกัน |
| Pavilion | OFF | status topic = OFF | OFF | ปิด หลัง status ตรงกัน |
| All | no status received | timeout | unchanged/null | ไม่สามารถยืนยันสถานะได้ |
| All | initial | none | none | ยังไม่มีข้อมูล |

## Static behavior check

- [x] Source mapping read: pump/D5, zone1/D6, lighthome/D7, lightsala/D8.
- [x] Active LOW read from source (`RELAY_ON LOW`, `RELAY_OFF HIGH`).
- [x] Browser command uses correct IDs and topics.
- [x] Browser waits for matching status payload and does not set relay state optimistically.
- [ ] Physical relay ON/OFF and pump safety verification — requires the actual ESP8266 and farm loads; not run in sandbox.
