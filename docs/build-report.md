# Firmware Build Report — V7.2.1

## Build record

- Firmware version: `V7.2.1-PHYSICAL-AP-BUTTON` (from `SMARTFARM_VERSION` in `firmware/esp8266/src/main.ino`).
- Build date: 2026-11-23.
- Source revision: `9dd9fec` (`Merge feature/son-lung-na-dashboard-redesign into main`).
- Result: **SUCCESS**; a clean NodeMCU v2 firmware image was built from the current `main` source and copied to the v7.2.1 release artifact.
- Reproducibility check: built `.pio/build/nodemcuv2/firmware.bin` and `releases/firmware/SmartFarm_V7.2.1.bin` are byte-for-byte identical.

## Target and toolchain

- PlatformIO environment: `nodemcuv2`.
- Platform: `espressif8266@4.2.0`; board: NodeMCU 1.0 / ESP-12E; framework: Arduino.
- Hardware configuration: ESP8266 at 80 MHz, 80 KB RAM, 4 MB flash; LittleFS selected in `platformio.ini`.
- Resolved packages include Arduino ESP8266 framework `3.30102.0`, Xtensa toolchain `2.100300.220621`, `tool-esptool` `1.413.0`, and `tool-esptoolpy` `1.30000.201119`.
- Direct libraries: PubSubClient `2.8.0`, WiFiManager `2.0.17`, NTPClient `3.2.1`, RTClib `2.1.4`, DHT sensor library `1.4.6`, and ArduinoJson `6.21.5`.

## Build procedure and result

Run from `firmware/esp8266/`:

```sh
pio pkg install -e nodemcuv2
pio run -e nodemcuv2
```

The build completed successfully. The compile-only checkout uses the repository's safe EMQX placeholder header; deployment-specific EMQX host and CA must be injected through the documented release workflow before claiming broker integration.

- RAM: 41,864 / 81,920 bytes (51.1%).
- Program flash: 593,288 / 1,044,464 bytes (56.8%).
- Built image: `.pio/build/nodemcuv2/firmware.bin`.

A dependency warning remains in PubSubClient `2.8.0` for a signed/unsigned comparison in `publish_P`; it does not prevent linking or image generation.

## Release artifact integrity

- Checked-in artifact: `releases/firmware/SmartFarm_V7.2.1.bin`.
- Size: **597,440 bytes**.
- SHA-256: `b678db3979e5a0a730b0bd8eee497e9d35ab0517454d3e6cc0562d13be243791`.
- Checksum file: `releases/firmware/SmartFarm_V7.2.1.bin.sha256`.
- The built image and checked-in v7.2.1 image have identical SHA-256 values.

## Scope and limitations

This report documents a successful compile and static artifact checks. It does not claim that the image has been flashed, boots on physical hardware, connects to the configured MQTT broker, completes OTA, or operates relays/sensors correctly in the field. Those require device/network integration tests. The release workflow must be supplied with the target EMQX endpoint and CA, and the resulting configured artifact must be reviewed separately from this compile-only build before deployment.
