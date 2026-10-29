# Repository Structure

รีโพนี้แบ่งตามหน้าที่หลักเพื่อให้แก้ไขและตรวจสอบได้โดยไม่ปะปนกัน

```text
.
├── dashboard/                         # Static PWA และหน้า GitHub Pages
│   ├── assets/                         # รูปภาพ ไอคอน และไฟล์ visual
│   ├── css/                            # stylesheet หลักและ layout
│   ├── js/                             # config, state, MQTT และ UI logic
│   ├── finance/ admin/ settings/ ...   # route compatibility pages/assets
│   ├── index.html
│   └── sw.js
├── firmware/esp8266/                   # PlatformIO ESP8266 controller
│   ├── src/main.ino                    # firmware source หลัก
│   ├── scripts/                        # firmware build helper scripts
│   ├── platformio.ini
│   └── README.md
├── scripts/                            # repository-level checks and diagnostics
│   ├── pre-deploy-check.sh              # software gate ก่อน deploy
│   └── mqtt-health-check.cjs            # MQTT read-only hardware check
├── tests/                              # Node unit, regression และ contract tests
├── docs/                               # architecture, MQTT, safety และ maintenance docs
├── releases/firmware/                  # release .bin และ checksum ที่ตั้งใจเก็บใน Git
├── reports/                            # QA reports และ screenshots จากการตรวจ Dashboard
├── skills/                             # reusable Manus skill ที่ version control ในรีโพ
├── config/                             # ตัวอย่าง config เท่านั้น; local secrets ถูก ignore
├── package.json / package-lock.json    # dependency สำหรับ repository scripts
└── .github/workflows/                  # CI, Pages deploy และ firmware build
```

## กติกาการวางไฟล์

- แก้ Dashboard ใน `dashboard/` และรักษา static paths ให้ตรงกับ tests/Pages workflow
- แก้ firmware ใน `firmware/esp8266/src/`; helper ที่ใช้เฉพาะ PlatformIO อยู่ใน `firmware/esp8266/scripts/`
- เพิ่ม repository automation ใน `scripts/` และเพิ่ม test ใน `tests/`
- เก็บ contract และ operational guidance ใน `docs/`; อย่าวางรายงานยาวไว้ที่ root
- เก็บ binary release เฉพาะใน `releases/firmware/` พร้อม `.sha256`; binary ชั่วคราวจาก PlatformIO ถูก ignore
- ห้าม commit `.env`, local config, credentials, private keys หรือ `node_modules/`
- รัน `./scripts/pre-deploy-check.sh` ก่อน commit ที่เกี่ยวกับ Dashboard, Firmware, MQTT, tests หรือ CI
