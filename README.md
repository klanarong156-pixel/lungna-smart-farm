# สวนลุงนะ SMART FARM

Production baseline สำหรับ dashboard และ ESP8266 Smart Farm โดยแยก live control, records, weather และเครื่องมือระบบอย่างชัดเจน. **ESP8266 คือ controller ของ pump/relay/AUTO/MANUAL/schedule/safety**; dashboard อ่าน status และส่ง command ผ่าน MQTT เท่านั้น. Cloud/Firebase ไม่ได้ควบคุม Relay. โครงสร้างโฟลเดอร์และกติกาการวางไฟล์อยู่ใน [`docs/repository-structure.md`](docs/repository-structure.md).

## Architecture

Browser GitHub Pages/PWA ↔ MQTT over WSS ↔ HiveMQ Cloud ↔ ESP8266 NodeMCU ↔ relay/pump/sensor. Finance ledger เป็น local-only และทำงานโดยไม่ต้องมี MQTT. Weather forecast ใช้ Open-Meteo แยกจาก DHT11. รายละเอียดใน [`docs/architecture.md`](docs/architecture.md).

## Dashboard

Dashboard V2.1.0 candidate (branch `redesign/dashboard-v2-four-tabs`) ใช้ 4 เมนูหลัก: Home, Reports, Alerts และ Profile. Water, Devices, System และ Weather ยังคงเป็น utility views ที่เปิดผ่านลิงก์บริบท/โปรไฟล์และ direct hashes ได้. Home จัดลำดับสถานะจริงจาก MQTT/ESP, DHT11, รีเลย์ 4 ช่อง, ระบบน้ำ, แนวโน้ม และเหตุการณ์ โดยไม่แสดงความชื้นดิน/อายุพืช/ผลผลิตที่ firmware หรือสมุดบันทึกยังไม่มี. เพิ่ม AI วิเคราะห์ snapshot แบบ read-only ที่ผู้ใช้กดเอง; ไม่มี tool หรือเส้นทางสั่ง MQTT และปุ่มยังปิดจนกว่าจะติดตั้ง Worker, Turnstile และตั้ง secret ฝั่ง server. ไม่มี API key ใน browser. Relay command เดิมยังมี dialog ยืนยัน, safety guard และ state machine รอ `relay/status` จาก ESP. Finance ledger, schedule editor, weather และ diagnostics เดิมยังคงไว้. ดูรายละเอียดที่ [`docs/dashboard.md`](docs/dashboard.md) และ [`docs/ai-assistant.md`](docs/ai-assistant.md). การเปลี่ยนแปลงอยู่ใน feature branch ไม่กระทบ production.

MQTT user/password ให้ผู้ดูแลป้อนที่หน้า “ระบบ”; โดยปริยายเก็บ credentials ใน session storage และเลือกบันทึก localStorage ได้. Weather page เรียก Open-Meteo ด้วยจุดอ้างอิงระดับภูมิภาคแบบประมาณ แยกจาก DHT11; integration ที่ไม่มีจริงจะไม่ถูกนำเสนอเป็นฟังก์ชัน.

## MQTT

Firmware TLS: HiveMQ Cloud port 8883. Browser: secure WebSocket port 8884 `/mqtt`. Topics: `smartfarm/status/online`, `smartfarm/status/device`, `smartfarm/sensor/dht11`, `smartfarm/relay/{pump|zone1|lighthome|lightsala}/{set|status}`, `smartfarm/mode/{set|status}`, `smartfarm/schedule/{id}/{set|status}`. Exact contract/payload ใน [`docs/mqtt-topics.md`](docs/mqtt-topics.md) และผลตรวจ source ใน [`docs/compatibility-report.md`](docs/compatibility-report.md). ใช้ broker ACL จำกัด topic scope: credential ของ static browser client ไม่สามารถซ่อนจาก user ของ browser ได้.

## Hardware and firmware

อ้างอิง source จริง: ESP8266 NodeMCU/ESP-12E, four-channel relay; pump D5, zone1 D6, house light D7, pavilion D8; relay active LOW. DHT11 D2/GPIO4; DS3231 SDA D3/GPIO0, SCL D4/GPIO2. ดู [`docs/relay-logic.md`](docs/relay-logic.md). Firmware V7.2.0-OTA-STABLE อยู่ใน [`firmware/esp8266`](firmware/esp8266/README.md); build with PlatformIO `pio run -e nodemcuv2`. Binary ที่ compile ผ่านและตรวจ SHA-256 แล้วอยู่ใน [`releases/firmware`](releases/firmware/SmartFarm_V7.2.0.bin).

## Deploy GitHub Pages

1. Push main branch.
2. In repository Settings → Pages, set source to **GitHub Actions**.
3. Workflow `.github/workflows/pages.yml` uploads contents of `dashboard/` to Pages.
4. Expected URL: https://klanarong156-pixel.github.io/lungna-smart-farm/ (available only after Pages has been enabled and Actions deploy succeeds).

PWA needs HTTPS. Production baseline cache remains separate; Dashboard V2.1 feature branch uses `lungna-shell-v21`. Service Worker activation removes only older `lungna-shell-*` caches and preserves unrelated caches on the same origin. AI Worker ต้อง deploy/ตั้งค่าแยกจาก GitHub Pages และฟีเจอร์จะยังไม่ทำงานจนกว่าจะตั้ง URL กับ public Turnstile site key; secret ใช้ Cloudflare Worker secrets เท่านั้น. HTTP OTA is disabled by default; use password-protected ArduinoOTA on the trusted LAN.

## Firebase, weather, data

Firebase is intentionally not connected in this static-only baseline. `config/firebase.example.js` provides domain separation only and contains no private key. Farm schema proposal and future domains are in architecture docs. Weather uses Open-Meteo forecast values; those are not sensor readings.

## Tests and known limits

Static/regression tests validate JS/JSON, MQTT state/relay/mode/schedule acknowledgement, seven routes with four primary navigation items, actionable event details, command state flow, unique control surfaces and Service Worker cache isolation. Run `./scripts/pre-deploy-check.sh` before every deployment; it checks JavaScript syntax/manifest, runs unit/regression tests, and runs the firmware contract test. GitHub Pages and firmware workflows call the same script before creating deployment artifacts. For a hardware-safe, read-only MQTT check, run `npm ci` followed by `MQTT_HEALTHCHECK=1 MQTT_URL=wss://... MQTT_USERNAME=... MQTT_PASSWORD=... EXPECTED_FIRMWARE=V7.2.0-OTA-STABLE ./scripts/pre-deploy-check.sh`; it subscribes only to heartbeat, DHT11, relay status, emergency and system-error topics and never publishes relay/mode/schedule commands. Without `MQTT_HEALTHCHECK=1`, the hardware check is skipped. Browser visual checks are run at desktop and mobile widths; they do not substitute for actual hardware. Physical MQTT/ESP integration, relay/pump safety tests and OTA require actual hardware/broker access. Schedule editing uses the existing firmware contract; firmware rejection cases without status response surface as timeouts. Finance persistence is local to a browser; ไม่มี backend authentication. See [`docs/relay-test-matrix.md`](docs/relay-test-matrix.md) and [`docs/compatibility-report.md`](docs/compatibility-report.md).

## Version

Production baseline: **V7.2.0**; firmware string: `V7.2.0-OTA-STABLE`. See [CHANGELOG](docs/CHANGELOG.md) for release status.
