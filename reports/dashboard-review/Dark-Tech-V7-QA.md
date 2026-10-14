# Newfarm Smart Farm Dashboard V7 — Dark Tech QA

**วันที่ตรวจ:** 2026-10-14
**Repository:** `klanarong156-pixel/lungna-smart-farm`
**Baseline:** `main` ณ `73fef8a`
**Branch งาน:** `redesign/dark-tech-dashboard-v7`

## สรุปผล Audit ก่อนแก้

- Working tree เริ่มต้นสะอาด และ baseline tests/syntax checks ผ่านก่อนแก้
- Dashboard เป็น static HTML/CSS/JavaScript แบบ shared shell 7 หน้า มี desktop sidebar และ mobile bottom navigation; ไม่มี package/build script frontend แยกต่างหาก
- State เริ่มจากไม่มีค่า sensor/relay ที่ยืนยัน และ UI ต้องรอ telemetry/acknowledgement จริงก่อนรายงานผล
- ตรวจ `dashboard/js/mqtt.js`, `dashboard/js/config.js`, `dashboard/js/state.js`, `dashboard/index.html` และ firmware source `firmware/esp8266/src/main.ino` แล้ว
- Firmware ระบุ broker TLS ที่ port 8883, browser ใช้ WSS `/mqtt` port 8884; Relay คง pin D5/D6/D7/D8 และ Active-LOW; firmware เป็นผู้รับผิดชอบ relay, AUTO/MANUAL, schedules และ safety
- คำสั่ง relay ยังคง topic `smartfarm/relay/{id}/set`, payload `ON`/`OFF`, QoS 1, non-retained และรอ `.../status` ยืนยัน; mode และ schedule ยังคง topic/payload/QoS/ack contract ตามเดิม
- ปุ่ม relay หน้า Home และหน้า Water ใช้ `FarmMqtt.commandRelay()` กลไกเดียวกัน และมีการป้องกันการกดซ้ำระหว่างรอคำยืนยัน
- พบช่องทาง legacy `dashboard/finance/index.html` ส่งไป `#finance` แต่ไม่มี route นั้นจริง; ข้อมูลการเงินเดิมถูกเก็บใน `localStorage` และ UI อยู่ใน disclosure ของหน้า `events`
- ไม่พบเหตุให้ต้องแก้ MQTT, firmware, pin mapping, relay logic หรือ schedule data contract จึงไม่แก้ไฟล์เหล่านั้น

## การเปลี่ยนแปลง

| ไฟล์ | การเปลี่ยนแปลง | เหตุผล |
|---|---|---|
| `dashboard/css/app.css` | เพิ่ม shared Dark Tech theme, design tokens, card/form/navigation/status styling, focus-visible และ reduced-motion | ทำให้ทุกหน้าเป็น theme เดียวกันและรองรับมือถือ/desktop |
| `dashboard/index.html` | เปลี่ยน browser theme color และแสดง cache version `v4` | ให้ chrome/Settings สอดคล้องกับธีมและ Service Worker |
| `dashboard/js/app.js` | แปลง legacy `#finance` เป็นหน้า `events` และเปิด disclosure บัญชีเดิม | แก้ deep link โดยไม่ย้ายหรือลบข้อมูล/ความสามารถ |
| `dashboard/manifest.json` | เปลี่ยน PWA theme/background เป็น `#0B1220` | ให้ standalone/PWA ตรงกับธีมใหม่ |
| `dashboard/sw.js` | เพิ่ม cache version จาก `v3` เป็น `v4` | บังคับโหลด shell/theme ใหม่หลังอัปเดต |
| `tests/dashboard-pages.test.cjs` | เพิ่ม assertions สำหรับ Dark Tech, reduced motion, Finance deep link และ manifest | ป้องกัน regression ของงานนี้ |

ไม่มีการแก้ไข `dashboard/js/mqtt.js`, `dashboard/js/config.js`, `dashboard/js/state.js`, firmware, GitHub Actions, firmware binary หรือข้อมูล Finance

## ผลทดสอบ

| รายการ | ผล | หลักฐาน/ขอบเขต |
|---|---|---|
| Baseline syntax และ regression ก่อนแก้ | PASS | ตรวจบน `main` ก่อนสร้าง branch |
| JavaScript syntax: config/state/mqtt/app/service worker | PASS | `node --check` |
| Manifest JSON | PASS | `python3 -m json.tool dashboard/manifest.json` |
| State contract | PASS | `node tests/state-contract.test.cjs` |
| MQTT relay/mode/schedule contract | PASS | `node tests/mqtt-contract.test.cjs` ตรวจ topic, payload, QoS, ack, invalid data และ offline reset |
| Static paths | PASS | `node tests/paths.test.cjs` |
| Routes, DOM IDs, theme และ Finance deep link | PASS | `node tests/dashboard-pages.test.cjs` |
| Whitespace/diff | PASS | `git diff --check` |
| Browser navigation 7 หน้า | PASS | Chromium headless ที่ 390 px และ 1440 px; ทุกเมนูเปิด route ที่ถูกต้อง |
| Responsive/no horizontal overflow | PASS | Chromium ที่ 390, 768 และ 1440 px; document scroll width ไม่เกิน viewport |
| Finance deep link | PASS | เปิด `index.html#finance` แล้วเข้าสู่ `events`, เปิด finance disclosure ได้ |
| สถานะเริ่มต้น/ปุ่ม relay | PASS | ไม่มี MQTT/hardware; relay ทั้ง 4 ไม่แสดง ON และปุ่มถูก disable จนกว่าจะมี ESP/relay status จริง |
| Browser JavaScript/console errors | PASS | ไม่พบ error ระหว่าง walkthrough |
| Firmware compile / GitHub Actions | NOT RUN | ไม่มีการเปลี่ยน firmware; workflow บน GitHub ไม่ได้ถูกรันจาก branch นี้ |
| MQTT broker / ESP8266 จริง / relay output | NOT TESTED | ไม่ได้เชื่อม broker หรืออุปกรณ์จริง จึงไม่กล่าวอ้างว่าผ่าน hardware test |
| เพิ่ม/แก้/ลบ/โหลดตารางผ่าน UI บนอุปกรณ์จริง | NOT TESTED | MQTT schedule contract tests ผ่าน แต่ไม่ได้เชื่อม firmware/hardware หรือทดสอบ persistence ข้าม session |
| ข้อมูล Finance ที่มีอยู่จริงใน browser ผู้ใช้ | NOT TESTED | ไม่ได้เข้าถึง/เปลี่ยน localStorage ของ browser ผู้ใช้; ตรวจ route และโค้ดเท่านั้น |
| GitHub Pages deployment | NOT RUN | งานนี้ยังไม่ merge เข้า `main` และไม่ได้ deploy |

## ความเสี่ยง/ข้อจำกัดที่ยังเหลือ

1. ยืนยันการสั่ง relay, schedule, heartbeat และ safety ได้เฉพาะระดับ static code/contract test; ต้องทดสอบกับ broker และ ESP8266 จริงก่อนใช้ควบคุมอุปกรณ์
2. QA ด้าน responsive เป็นการตรวจ Chromium headless; ควรตรวจซ้ำบน iPhone/Android จริงและ browser ที่ใช้จริง โดยเฉพาะภาษาไทย/การติดตั้ง PWA
3. Browser automation ตรวจ Finance deep link และหน้าแสดงผล ไม่ได้ทดสอบเพิ่มข้อมูลกับ localStorage ของผู้ใช้จริง
4. Branch นี้ยังไม่ถูก merge หรือ deploy; workflow GitHub Pages ของ repository กำหนด deploy จาก `main`

## การนำขึ้น GitHub Pages

1. ตรวจ branch/PR และให้ผู้ดูแล approve ก่อน merge เข้า `main`.
2. Repository มี workflow `.github/workflows/pages.yml` สำหรับ deploy `dashboard/` เมื่อมีการเปลี่ยนแปลงบน `main`; ตรวจ GitHub Pages ให้ใช้ GitHub Actions ตาม README ของโครงการ
3. หลัง merge ให้ตรวจ Actions deployment สำเร็จและเปิด production URL ตาม README; ไม่ได้ทำขั้นตอนนี้ในงานรอบนี้

## การย้อนกลับ

- ก่อน merge: กลับไป branch `main`; branch นี้ไม่เปลี่ยน production
- หลัง merge/deploy: ใช้ `git revert <commit-sha>` บน `main` แล้ว push เพื่อให้ Actions deploy เวอร์ชันก่อนหน้ากลับมา; หลีกเลี่ยงการ force-push
