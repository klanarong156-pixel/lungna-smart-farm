# Firmware Build Report

- Environment: PlatformIO Core 6.2.0, `espressif8266@4.2.0`, `nodemcuv2`.
- Command: `pio run -e nodemcuv2` from `firmware/esp8266/`.
- Result: **SUCCESS**; firmware.elf linked and firmware.bin created.
- RAM: 42,268 / 81,920 bytes (51.6%).
- Flash: 606,016 / 1,044,464 bytes (58.0%).
- Output: `releases/firmware/SmartFarm_V7.2.0.bin` (610,176 bytes).
- SHA-256: `db9a3d3916d92c22c1361ee13b7fd8e52e56e0fec60e2040dbf832c2a4511589`.
- Check: `sha256sum -c releases/firmware/SmartFarm_V7.2.0.bin.sha256` returned `OK`.
- No firmware source compile errors or important firmware warnings. PlatformIO's bundled `elf2bin.py` emitted two Python `SyntaxWarning` messages for invalid escape sequences in its own framework helper; binary build still completed successfully.

This report verifies a compile for the configured board. It does not assert OTA success, broker authentication, or physical relay behavior on an ESP8266.
