# Firmware Build Report — V7.3.0 candidate

## Build record

- Firmware version: `V7.3.0-OTA-STABLE` (`SMARTFARM_VERSION` in `firmware/esp8266/src/main.ino`).
- Build date: 2026-11-11.
- Source branch: `feat/simple-dashboard-water-menu`.
- Firmware source SHA-256: `04262361c768a0a0330e25873ea1755e5ec106d2e451226b95aa595efdd314fd`.
- Result: **SUCCESS**; PlatformIO completed the NodeMCU v2 build and generated the `.bin` image.
- The release file was copied directly from `.pio/build/nodemcuv2/firmware.bin`; its SHA-256 was verified after copy. A second independent clean-room build was not run.

## Target and toolchain

- PlatformIO Core: `6.2.0`.
- Platform: `espressif8266@4.2.0`; board/environment: `nodemcuv2` (NodeMCU 1.0 / ESP-12E); framework: Arduino.
- Hardware configuration: ESP8266 at 80 MHz, 80 KB RAM, 4 MB flash; LittleFS selected in `platformio.ini`.
- Resolved packages: Arduino ESP8266 framework `3.30102.0`, Xtensa toolchain `2.100300.220621`, `tool-esptool` `1.413.0`, and `tool-esptoolpy` `1.30000.201119`.
- Pinned direct libraries: PubSubClient `2.8.0`, WiFiManager `2.0.17`, NTPClient `3.2.1`, RTClib `2.1.4`, DHT sensor library `1.4.6`, and ArduinoJson `6.21.5`.

## Build procedure and result

Run from `firmware/esp8266/` after installing the environment packages:

```sh
pio pkg install -e nodemcuv2
python -W error::SyntaxWarning scripts/patch_elf2bin_syntax_warning.py
PYTHONWARNINGS=error::SyntaxWarning pio run -e nodemcuv2
```

The patch script applies the repository's documented upstream `elf2bin.py` raw-regex warning fix to the local PlatformIO package cache; it does not modify firmware source. The build completed successfully with Python `SyntaxWarning` treated as an error.

- RAM: 41,576 / 81,920 bytes (50.8%).
- Program flash: 593,364 / 1,044,464 bytes (56.8%).
- Build output: `.pio/build/nodemcuv2/firmware.bin`.

## Release artifact integrity

- Candidate artifact: `releases/firmware/SmartFarm_V7.3.0.bin`.
- Size: **597,520 bytes**.
- SHA-256: `3ac199e7cce9386dc5a92693fc2e22986075e29a5839db1351c5ca177f2aef6a`.
- Checksum file: `releases/firmware/SmartFarm_V7.3.0.bin.sha256`; verify with `sha256sum -c SmartFarm_V7.3.0.bin.sha256` from `releases/firmware/`.

## Scope and limitations

This report records a successful compile and checksum generation only. The image has **not** been flashed or tested on the physical ESP8266; boot, MQTT/TLS connection, OTA behavior, sensors and relay/pump operation still require device/network integration verification. This candidate does not alter production until the branch is reviewed and merged, and the physical controller is upgraded separately.
