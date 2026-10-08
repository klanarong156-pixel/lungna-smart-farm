# Compatibility Report — ตรวจจาก New140869

วันที่ตรวจ: 2026-10-08 · Repository อ้างอิงอ่านอย่างเดียว: `klanarong156-pixel/New140869` · Production repository: `klanarong156-pixel/lungna-smart-farm`

| Feature | New140869: หลักฐาน source | ใช้ต่อ | เปลี่ยน/ข้อควรทราบ | เหตุผล |
|---|---|---|---|---|
| MQTT broker | `SmartFarm_V7.2.0_OTA_STABLE.ino` บรรทัด 27–28: HiveMQ Cloud host, TLS 8883 | ใช้ host และ TLS firmware เดิม | ไม่บันทึก broker password ในเอกสาร | คง endpoint ที่ firmware ใช้จริง |
| Web MQTT | `dashboard/dashboard-config.js` บรรทัด 4–9: WSS 8884 `/mqtt` | ใช้ WSS เดิมใน dashboard ใหม่ | credentials ป้อนโดย operator; ไม่ใส่ใน source | GitHub Pages เป็น static client |
| MQTT CA/TLS | Firmware บรรทัด 32–67 CA root; 190–219 ตรวจ CA/time และตั้ง trust anchor | ใช้ certificate validation | ห้าม fallback `setInsecure()` สำหรับ MQTT | ป้องกัน TLS ที่ไม่ได้ตรวจ server certificate |
| Topics / payload | `MQTT_CONTRACT_V6.md` ตารางบรรทัด 5–21 และ firmware | คง topics/payload เดิม | ไม่มีการ rename หรือเพิ่ม command topic | backward compatibility |
| Relay IDs | `dashboard/dashboard-config.js` บรรทัด 11–16; firmware `relayNames` / publishRelayStatus | pump, zone1, lighthome, lightsala | mapping ตรวจจาก firmware | ตรงกับ implementation |
| Relay pins | firmware บรรทัด 76–85: D5/D6/D7/D8 | คง pin เดิม | ไม่เดา pin | มาจาก source ที่ใช้งานจริง |
| Relay polarity | firmware บรรทัด 84–85: ON=LOW, OFF=HIGH | คง Active LOW | ไม่มี logic เปลี่ยน | ห้ามเปลี่ยนการทำงานทางไฟฟ้าจาก redesign |
| Relay command/status | Firmware บรรทัด 1358–1363 publish retained ON/OFF; contract ระบุ command non-retained | publish non-retained `ON`/`OFF`; รอ status จริง | ไม่มี optimistic UI; timeout แสดงไม่ยืนยัน | MQTT publish ACK ไม่ใช่ ESP ACK |
| Pump / emergency | firmware `relaySetRaw`, emergency, OTA safe-state; contract บรรทัด 48–52 | ใช้ firmware logic เดิมทั้งหมด | ไม่มี safety logic ย้ายมา dashboard | ESP เป็น controller จริง |
| Mode | firmware `publishModeStatus`, callback; contract บรรทัด 23–25 | AUTO/MANUAL เท่านั้น | SCHEDULE ไม่ใช่ mode ใน firmware ที่ตรวจพบ; schedules ทำงานภายใต้ AUTO | ไม่แสดง mode ที่ firmware ไม่ได้รายงาน |
| Wi-Fi/reconnect | Firmware มี WiFiManager, retry; MQTT exponential backoff constants 5–60 วินาที | ใช้ firmware source เดิม | ต้องตั้ง WiFi/MQTT ผ่าน provisioning จริง | ไม่สร้างค่าจำลอง |
| Online/LWT | Firmware บรรทัด 1874–1884 LWT retained false, online true; heartbeat retained/device JSON ทุก 10 วินาที | status/online, status/device, watchdog 25s | retained heartbeat ไม่ยืนยัน live | ป้องกัน retained snapshot หลอก online |
| DHT11 | firmware `DHT dht(DHT_PIN,DHT11)`, D2/GPIO4; publish `smartfarm/sensor/dht11` | ใช้ schema JSON temperature/humidity | ไม่มีค่า 0 ปลอม | null แสดง “ยังไม่มีข้อมูล” |
| RTC | Firmware D3/GPIO0 SDA, D4/GPIO2 SCL; DS3231 | คงตาม hardware/source | การมีอยู่ของ RTC ในเครื่องจริงยังต้องยืนยันภาคสนาม | ข้อมูลจาก source ไม่ใช่การตรวจสายจริง |
| Soil/Rain | contract ระบุ Soil A0 เป็น legacy และไม่สร้าง watering feature; ไม่มีหลักฐาน Rain sensor ติดตั้ง | ไม่แสดง fake sensor | ไม่แสดง soil/rain readings | ผู้ใช้ระบุว่า sensor บางตัวไม่มี |
| OTA | Firmware `ArduinoOTA` port 8266 password จาก provisioning; HTTP OTA port 80 LAN-only; OTA safe-state | ใช้ source V7.2.0 | ไม่เปิด OTA จากหน้าเว็บ; ต้องทดสอบกับอุปกรณ์จริง | ป้องกันอ้างผล OTA ที่ไม่ได้ทดสอบ |
| PWA | ใหม่: manifest + offline shell service worker | ใช้ได้เมื่อ deploy ผ่าน HTTPS | offline shell ไม่ cache relay state | offline data ต้องไม่กลายเป็น OFF |
| Finance / Firebase | ระบบเดิมมี Firebase files แต่ไม่ได้ย้าย frontend dependencies ทั้ง repo | Finance ใหม่เก็บ localStorage เท่านั้น | Firebase/Auth/Cloud sync ยังไม่เชื่อม | ไม่อ้างว่ามี cloud persistence |
| Weather | ระบบเก่ามีพิกัดใน dashboard config; Open-Meteo implementation ใหม่ | แสดงแยกจาก DHT11 | API สดอาจ unavailable/ไม่มี network | ชัดเจนว่าเป็น forecast |

## MQTT Contract

- Broker: `25305924f68c41f2a1e089a1836d3287.s1.eu.hivemq.cloud` (จาก firmware source; ESP TLS port `8883`); Browser WSS `8884`, path `/mqtt`.
- Browser subscribes: `smartfarm/status/online`, `smartfarm/status/device`, `smartfarm/sensor/dht11`, `smartfarm/relay/+/status`, `smartfarm/mode/status`.
- Commands: `smartfarm/relay/{relay}/set`; raw payload `ON` หรือ `OFF`, QoS 1, retained false.
- Relay state: `smartfarm/relay/{relay}/status`; raw payload `ON` หรือ `OFF`, retained true.
- ESP presence: `smartfarm/status/online`, retained `true`; LWT retained `false`.
- Heartbeat: `smartfarm/status/device` JSON retained; firmware publishes regularly; dashboard only treats non-retained fresh heartbeat as current liveness.
- Sensor: `smartfarm/sensor/dht11` JSON with numeric `temperature` / `humidity` fields when a valid reading exists.
- Mode: `smartfarm/mode/status` raw `AUTO` or `MANUAL`; dashboard publishes the existing `/mode/set` topic and waits for status confirmation. `SCHEDULE` is not a firmware mode; the firmware's stored schedule slots run under AUTO. A schedule-slot editor is not included in this dashboard version.

## Source files examined

- `SmartFarm_V7.2.0_OTA_STABLE.ino`
- `platformio.ini`
- `MQTT_CONTRACT_V6.md`
- `dashboard/dashboard-config.js`
- `dashboard/dashboard-mqtt.js`
- `dashboard/dashboard-state.js`

**Limit:** การตรวจนี้เป็น static source inspection; ยังไม่ได้เชื่อมอุปกรณ์ ESP8266 จริงหรือส่งคำสั่งไปยัง broker.
