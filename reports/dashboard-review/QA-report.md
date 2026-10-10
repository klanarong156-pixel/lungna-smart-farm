# สวนลุงนะ Smart Farm — Dashboard refresh QA

**ขอบเขต:** ปรับเว็บใน `klanarong156-pixel/lungna-smart-farm` ตาม Master Prompt 7 หน้า โดยคง firmware, MQTT topics/payloads และ safety ownership เดิม

## ผลตรวจ

| รายการ | ผล | หลักฐาน/หมายเหตุ |
|---|---|---|
| JavaScript syntax (`config`, `state`, `mqtt`, `app`) | PASS | `node --check` ผ่าน |
| Existing state/MQTT/asset regression tests | PASS | `state-contract`, `mqtt-contract`, `paths` ผ่าน |
| Seven-page shell and navigation contract | PASS | `dashboard-pages.test.cjs` ผ่าน, route target ครบและ DOM IDs ไม่ซ้ำ |
| Manifest JSON and `git diff --check` | PASS | JSON parse และ whitespace check ผ่าน |
| Browser page navigation | PASS | Chromium เปิดครบ 7 routes |
| Responsive overflow check | PASS | viewport 390, 430, 768, 1024 และ 1440 px; ไม่พบ horizontal overflow หลังแก้ tablet breakpoint |
| Browser JavaScript console/page errors | PASS | ไม่พบข้อผิดพลาดระหว่าง browser walkthrough |
| Weather API | PASS (sandbox run) | Open-Meteo ส่ง current conditions และ 3-day forecast กลับมาในการทดสอบนี้; ข้อมูลอาจเปลี่ยน/บริการภายนอกอาจไม่พร้อมภายหลัง |
| PWA offline installation/cache update | NOT TESTED | เพิ่ม `lungna-shell-v3`; ยังไม่ได้ทดสอบ offline mode บนอุปกรณ์จริง/Pages deployment |
| GitHub Actions บน commit `1ab2eec` | PASS | [Dashboard checks + firmware build](https://github.com/klanarong156-pixel/lungna-smart-farm/actions/runs/38064632049) สำเร็จ |
| MQTT broker credentials/connectivity | NOT TESTED | ไม่ได้ป้อน credentials และไม่ได้เชื่อม broker ใน browser test |
| ESP8266 heartbeat, relay switching, schedule execution, DHT11/RTC | NOT TESTED | ต้องเชื่อม hardware จริง; ไม่อ้างว่าผ่าน hardware integration |
| Deploy GitHub Pages | PASS | [Deploy run](https://github.com/klanarong156-pixel/lungna-smart-farm/actions/runs/38064632040) สำเร็จ; production URL ตอบ HTTP 200 และมี route connection/events |

## การปรับที่ส่งมอบ

- จัดหน้าหลัก, ระบบน้ำ, อุปกรณ์, การเชื่อมต่อ, สภาพอากาศ, ตั้งค่า และข้อมูล/เหตุการณ์ให้อยู่ใน shared shell เดียวกัน พร้อม header ที่แยก MQTT กับ ESP, desktop sidebar, mobile bottom navigation และ footer กลาง
- เพิ่ม inventory ของ ESP8266/DHT11/DS3231/relay จาก field ที่ firmware รายงาน และระบุ Soil Sensor ว่าไม่ได้ติดตั้ง
- เพิ่มรายละเอียด broker/heartbeat/reconnect/error และ diagnostic/event timeline ซึ่งเริ่มว่างและเติมเมื่อ Dashboard สังเกต MQTT state จริงใน session
- ขยาย Weather API เป็น current humidity/wind/rain chance และพยากรณ์ 3 วัน; ไม่ใช้ค่าพยากรณ์แทน DHT11
- เก็บสมุดรายรับ/รายจ่าย local-only เดิมไว้ใน disclosure หน้า “ข้อมูล”; ระบุ integration ที่ไม่มี เช่น Telegram/notification ว่ายังไม่ได้เชื่อม
- เปลี่ยน Service Worker cache เป็น `lungna-shell-v3`; ไม่แก้ firmware, topics, payloads หรือ safety logic

## Screenshots

มีภาพ full-page ของทั้ง 7 หน้าใน mobile 390 px และ desktop 1440 px ใน `screenshots.zip` (14 ภาพ) ใช้สำหรับตรวจ layout; การแสดงสถานะว่างในภาพเกิดจากไม่ได้เชื่อม MQTT/ESP ระหว่างการทดสอบ

## Git/deployment

โค้ด Dashboard เผยแพร่จาก commit `1ab2eec` บน `main`; production URL: https://klanarong156-pixel.github.io/lungna-smart-farm/. GitHub Pages deployment และ firmware/dashboard validation ผ่าน. MQTT broker/device hardware integration ยังไม่ได้ทดสอบ.
