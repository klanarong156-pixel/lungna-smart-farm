# สวนลุงนะ SMART FARM

Production baseline สำหรับ dashboard และ ESP8266 Smart Farm โดยแยก live control, records, weather และเครื่องมือระบบอย่างชัดเจน. **ESP8266 คือ controller ของ pump/relay/AUTO/MANUAL/schedule/safety**; dashboard อ่าน status และส่ง command ผ่าน MQTT เท่านั้น. Cloud/Firebase ไม่ได้ควบคุม Relay.

## Architecture

Browser GitHub Pages/PWA ↔ MQTT over WSS ↔ HiveMQ Cloud ↔ ESP8266 NodeMCU ↔ relay/pump/sensor. Finance ledger เป็น local-only และทำงานโดยไม่ต้องมี MQTT. Weather forecast ใช้ Open-Meteo แยกจาก DHT11. รายละเอียดใน [`docs/architecture.md`](docs/architecture.md).

## Dashboard

Dashboard ใช้ shared shell 6 หน้า: หน้าหลัก, ระบบน้ำ, อุปกรณ์, ระบบ, อากาศ และบันทึก. Home แสดงผัง schematic แบบสัมพัทธ์จากภาพทำเครื่องหมาย โดยใช้เลือก relay/นำทางเท่านั้น ไม่แสดงพิกัดหรือขนาดพื้นที่จริงและไม่ส่งคำสั่งจากหน้า Home. DHT11/ESP แสดงเฉพาะ telemetry ที่ได้รับจริง. คำสั่ง relay/AUTO/MANUAL/schedule อยู่ที่หน้า “ระบบน้ำ”; Connection กับเครื่องมือดูแลเว็บรวมไว้ใน “ระบบ”. หน้าอุปกรณ์แสดงเฉพาะ controller/DHT11/RTC; ไม่มีการ์ดอุปกรณ์ที่ยังไม่ได้ติดตั้ง. Weather ใช้จุดพยากรณ์ระดับภูมิภาคแบบปัดละเอียดและไม่แสดงจุดฟาร์ม. หน้า “บันทึก” แยกเหตุการณ์ใน session ออกจากสมุดบัญชีใน localStorage ด้วยแท็บ โดยยังใช้ hash เดิมได้. เมนู desktop/mobile ใช้ชุด 6 รายการเดียวกัน.

โลโก้ใหม่ใช้ตราสัญลักษณ์ใบอ่อนและร่องแปลง พร้อมชื่อภาษาไทยเป็นข้อความจริงในเว็บ; PWA icons อัปเดตตามแบรนด์. หน้าจอใช้ desktop sidebar/mobile bottom navigation, การ์ดและแถบข้อมูลกระชับตามแบบที่อนุมัติ; ภาพประกอบฟาร์มใช้ WebP เพื่อลดขนาดดาวน์โหลด.

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

PWA needs HTTPS. Offline shell cache version is `lungna-shell-v12`; it caches static shell only, never relay state as current. Service Worker activation removes only older `lungna-shell-*` caches and preserves unrelated caches on the same origin.

## Firebase, weather, data

Firebase is intentionally not connected in this static-only baseline. `config/firebase.example.js` provides domain separation only and contains no private key. Farm schema proposal and future domains are in architecture docs. Weather uses Open-Meteo forecast values; those are not sensor readings.

## Tests and known limits

Static/regression tests validate JS/JSON, MQTT state/relay/mode/schedule acknowledgement, six routes, shared navigation, unique control surfaces and Service Worker cache isolation. Browser visual checks are run at desktop and mobile widths; they do not substitute for actual hardware. Physical MQTT/ESP integration, relay/pump safety tests and OTA require actual hardware/broker access. Schedule editing uses the existing firmware contract; firmware rejection cases without status response surface as timeouts. Finance persistence is local to a browser; ไม่มี backend authentication. See [`docs/relay-test-matrix.md`](docs/relay-test-matrix.md) and [`docs/compatibility-report.md`](docs/compatibility-report.md).

## Version

Production baseline: **V7.2.0**; firmware string: `V7.2.0-OTA-STABLE`. See [CHANGELOG](docs/CHANGELOG.md) for release status.
