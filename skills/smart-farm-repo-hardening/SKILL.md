---
name: smart-farm-repo-hardening
description: Audit and harden an ESP8266/MQTT smart-farm repository before deployment. Use for reviewing dashboard, firmware, safety controls, MQTT contracts, CI, release artifacts, tests, and reproducible builds.
---

# Smart Farm Repository Hardening

ใช้ workflow นี้เมื่อต้องตรวจหรือเตรียมรีโพ Smart Farm ที่มี static dashboard, MQTT และ ESP8266 firmware ก่อน merge/release/deploy

## Workflow

1. ระบุ repository root และตรวจ `git status`, branch, tracked files, recent commits และไฟล์ที่เกี่ยวข้องทั้งหมด ห้ามสมมติว่าเฉพาะ Dashboard เท่านั้นที่ต้องตรวจ
2. อ่านและเทียบกันระหว่าง `dashboard/`, `firmware/`, `tests/`, `.github/workflows/`, `docs/`, `README.md`, `config/` และ `releases/`
3. ตรวจ security ก่อน: ห้ามใช้ `setInsecure()` ใน production TLS, ตรวจ credential ไม่ให้ commit, ตรวจ OTA exposure, MQTT ACL assumptions และ browser localStorage threat model
4. ตรวจ safety/observability: relay active-low behavior, emergency latch, OTA safe state, watchdog/blocking behavior, offline/reconnect handling และให้ Dashboard แสดง emergency/system errors ที่ firmware publish
5. ตรวจ contract: topic names, retained/non-retained behavior, payload schema, acknowledgement semantics, schedule validation และ version/path/documentation consistency
6. ใช้ `scripts/pre-deploy-check.sh` ของรีโพเป็น gate มาตรฐาน โดยต้องตรวจ JavaScript syntax, JSON manifest, unit/regression tests และ `tests/firmware-contract.test.cjs`
7. Build firmware ด้วย PlatformIO environment ที่ระบุใน `firmware/esp8266/platformio.ini`; ตรวจ RAM/Flash, checksum และถ้าเป็น release ให้ build ซ้ำเพื่อยืนยัน reproducibility
8. ตรวจ CI ให้ Pull Request รัน checks และให้ deploy/artifact job ขึ้นกับ check job; อย่าให้ workflow มีรายการ tests แยกหลายชุดที่ drift จาก script กลาง
9. อัปเดตเอกสาร, release checksum และ changelog ให้ตรงกับ source ใหม่
10. สรุปสิ่งที่ตรวจผ่าน, ข้อจำกัดที่ยังต้องทดสอบด้วย hardware/broker จริง และไฟล์/commit ที่เปลี่ยน

## Required project conventions

- ใช้ `./scripts/pre-deploy-check.sh` ก่อน deploy ทุกครั้ง
- แยก firmware source contract test ออกจาก unit/regression tests แต่ให้ gate เดียวกันเรียกทั้งสองส่วน
- ใช้ CA validation และตรวจ system time สำหรับ TLS ทุก service ที่ firmware เรียก
- ปิด HTTP OTA เป็นค่าเริ่มต้น เว้นแต่เป็น controlled lab build
- Dashboard ต้องไม่ infer relay state จาก disconnect หรือ PUBACK; รอ status จาก ESP
- Emergency และ firmware error ต้องแสดงใน Dashboard และบันทึกใน event timeline
- Release binary ต้องมี checksum และต้องระบุ memory usage จาก build จริง

## Verification commands

```bash
./scripts/pre-deploy-check.sh
(cd firmware/esp8266 && pio run -e nodemcuv2)
(cd firmware/esp8266 && sha256sum -c ../../releases/firmware/*.bin.sha256)
git diff --check
git status --short
```

หากไม่มี hardware ให้ระบุอย่างชัดเจนว่ายังไม่ได้ยืนยัน relay load, MQTT broker จริง, OTA จริง, power-cycle, RTC/NTP failure และ Telegram endpoint จริง
