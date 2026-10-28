# Firmware Build Report

- Environment: PlatformIO Core 6.2.0, `espressif8266@4.2.0`, `nodemcuv2`.
- Command: `pio run -e nodemcuv2` from `firmware/esp8266/`.
- Result: **SUCCESS**; firmware.elf linked and firmware.bin created.
- RAM: 41,784 / 81,920 bytes (51.0%).
- Flash: 594,716 / 1,044,464 bytes (56.9%).
- Output: `releases/firmware/SmartFarm_V7.2.0.bin` (610,176 bytes).
- SHA-256: `3877769fd44fe60e0bf712aeb1867b5b3f1f22e94b55c6abba183e3b7225e21d`.
- Check: `sha256sum -c releases/firmware/SmartFarm_V7.2.0.bin.sha256` returned `OK`.
- No firmware source compile errors. PlatformIO's bundled `elf2bin.py` still emits two Python `SyntaxWarning` messages unless the CI patch script is run; the dependency PubSubClient also emits a signedness warning. Neither changes the built firmware behavior.
- The build uses `scripts/normalize_build_metadata.py`; two clean builds from the same dependency cache produced the same SHA-256.

This report verifies a compile for the configured board. It does not assert OTA success, broker authentication, or physical relay behavior on an ESP8266.
