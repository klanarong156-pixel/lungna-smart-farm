# Firmware Build Report — V7.2.0

## Build record

- Firmware version: `V7.2.0-OTA-STABLE` (from `SMARTFARM_VERSION` in `firmware/esp8266/src/main.ino`).
- Build date: 2026-10-31.
- Source revision: `1b8f5c3b7c676f7c6eda9a9356eee1aad689dda9` (`feat/system-sensor-alert-thresholds`). Firmware source/configuration were built from this checkout; the local documentation edit to this report is not a firmware input.
- Result: **SUCCESS**; a clean NodeMCU v2 firmware image was built and then compared with the checked-in release artifact.
- Reproducibility check: newly built `.pio/build/nodemcuv2/firmware.bin` is byte-for-byte identical to `releases/firmware/SmartFarm_V7.2.0.bin` (`cmp` passed).

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

The patch script applies the repository's documented upstream `elf2bin.py` raw-regex warning fix to the local PlatformIO package cache; it does not modify firmware source. The build completed successfully with Python `SyntaxWarning` treated as an error. One dependency warning remains in PubSubClient `2.8.0`: a signed/unsigned comparison (`-Wsign-compare`) in `publish_P`; it did not prevent linking or image generation.

- RAM: 41,784 / 81,920 bytes (51.0%).
- Program flash: 594,716 / 1,044,464 bytes (56.9%).
- Built image: `.pio/build/nodemcuv2/firmware.bin`.

## Release artifact integrity

- Checked-in artifact: `releases/firmware/SmartFarm_V7.2.0.bin`.
- Size: **598,864 bytes**.
- SHA-256: `3877769fd44fe60e0bf712aeb1867b5b3f1f22e94b55c6abba183e3b7225e21d`.
- The checksum matches `releases/firmware/SmartFarm_V7.2.0.bin.sha256`. Verification passed with `sha256sum -c SmartFarm_V7.2.0.bin.sha256` when run from `releases/firmware/`.
- `esptool v5.6.0 --chip esp8266 image-info` recognized the image, reported 4 MB flash / DIO / 40 MHz, and reported the ESP8266 image checksum as valid.

## Scope and limitations

This report documents a successful compile and static artifact checks. It does **not** claim that the image has been flashed, boots on physical hardware, connects to the configured MQTT broker, completes OTA, or operates relays/sensors correctly in the field. Those require device/network integration tests. The `.bin` is the ESP8266 firmware image only; the browser dashboard is built and deployed separately.
