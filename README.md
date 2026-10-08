# สวนลุงนะ SMART FARM

Production baseline ใหม่สำหรับ dashboard และ ESP8266 Smart Farm โดยแยก live control, farm records, finance, weather และ administration ชัดเจน. **ESP8266 คือ controller ของ pump/relay/AUTO/MANUAL/schedule/safety**; dashboard อ่าน status และส่ง command ผ่าน MQTT เท่านั้น. Cloud/Firebase ไม่ได้ควบคุม Relay.

## Architecture

Browser GitHub Pages/PWA ↔ MQTT over WSS ↔ HiveMQ Cloud ↔ ESP8266 NodeMCU ↔ relay/pump/sensor. Finance ledger เป็น local-only และทำงานโดยไม่ต้องมี MQTT. Weather forecast ใช้ Open-Meteo แยกจาก DHT11. รายละเอียดใน [`docs/architecture.md`](docs/architecture.md).

## Dashboard

หน้า mobile-first: Home, Smart Water, Finance, Weather, Settings และ Admin. Relay state starts at `null` และแสดง “ยังไม่มีข้อมูล”; relay และ AUTO/MANUAL controls รอ status จาก ESP จริง. MQTT user/password ให้ผู้ดูแลป้อนในหน้า Settings; ไม่มี password/token จริงใน source. โดยปริยายเก็บ credentials ใน session storage. Finance เก็บใน localStorage browser ปัจจุบัน; ยังไม่มี cross-device/cloud sync.

## MQTT

Firmware TLS: HiveMQ Cloud port 8883. Browser: secure WebSocket port 8884 `/mqtt`. Topics: `smartfarm/status/online`, `smartfarm/status/device`, `smartfarm/sensor/dht11`, `smartfarm/relay/{pump|zone1|lighthome|lightsala}/{set|status}`, `smartfarm/mode/{set|status}`. Exact contract/payload ใน [`docs/mqtt-topics.md`](docs/mqtt-topics.md) และผลตรวจ source ใน [`docs/compatibility-report.md`](docs/compatibility-report.md). ใช้ broker ACL จำกัด topic scope: credential ของ static browser client ไม่สามารถซ่อนจาก user ของ browser ได้.

## Hardware and firmware

อ้างอิง source จริง: ESP8266 NodeMCU/ESP-12E, four-channel relay; pump D5, zone1 D6, house light D7, pavilion D8; relay active LOW. DHT11 D2/GPIO4; DS3231 SDA D3/GPIO0, SCL D4/GPIO2. ดู [`docs/relay-logic.md`](docs/relay-logic.md). Firmware V7.2.0-OTA-STABLE อยู่ใน [`firmware/esp8266`](firmware/esp8266/README.md); build with PlatformIO `pio run -e nodemcuv2`. Binary ที่ compile ผ่านและตรวจ SHA-256 แล้วอยู่ใน [`releases/firmware`](releases/firmware/SmartFarm_V7.2.0.bin).

## Deploy GitHub Pages

1. Push main branch.
2. In repository Settings → Pages, set source to **GitHub Actions**.
3. Workflow `.github/workflows/pages.yml` uploads contents of `dashboard/` to Pages.
4. Expected URL: https://klanarong156-pixel.github.io/lungna-smart-farm/ (available only after Pages has been enabled and Actions deploy succeeds).

PWA needs HTTPS. Offline shell caches only static shell; it never caches relay state as current.

## Firebase, weather, data

Firebase is intentionally not connected in this static-only baseline. `config/firebase.example.js` provides domain separation only and contains no private key. Farm schema proposal and future domains are in architecture docs. Weather uses Open-Meteo forecast values; those are not sensor readings.

## Tests and known limits

Static and browser tests validate JS/JSON, MQTT state/command acknowledgement, routes, responsive layout and UI. Physical MQTT/ESP integration, relay/pump safety tests and OTA require actual hardware/broker access. The dashboard does not include a schedule-slot editor; firmware schedules run under AUTO. Finance persistence is local to a browser; Admin does not implement user authentication. See [`docs/relay-test-matrix.md`](docs/relay-test-matrix.md) and [`docs/compatibility-report.md`](docs/compatibility-report.md).

## Version

Production baseline: **V7.2.0**; firmware string: `V7.2.0-OTA-STABLE`. See [CHANGELOG](docs/CHANGELOG.md) for release status.
