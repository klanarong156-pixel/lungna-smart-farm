# ESP8266 Firmware V7.2.0

Firmware source lives in `src/main.ino` and is based on the V7.2.0 OTA stable firmware inspected in the read-only reference repository. It retains the original relay, safety, MQTT and provisioning implementation rather than inventing hardware mapping.

## Board and dependencies

- PlatformIO environment `nodemcuv2` / ESP8266 NodeMCU.
- Firmware version macro: `V7.2.0-OTA-STABLE`.
- Build from this directory:
  ```sh
  pio pkg install -e nodemcuv2
  python -W error::SyntaxWarning scripts/patch_elf2bin_syntax_warning.py
  PYTHONWARNINGS=error::SyntaxWarning pio run -e nodemcuv2
  ```
- The patch script changes only PlatformIO's local ESP8266 framework cache. It applies the upstream `elf2bin.py` raw-regex fix for Python's invalid-escape warning; it does not change firmware source or binary behavior. Run it again after reinstalling the framework package.
- Output: `.pio/build/nodemcuv2/firmware.bin`.

## Hardware contract

- 4-channel relay: pump D5, zone1 D6, house light D7, pavilion light D8; ON=LOW and OFF=HIGH.
- DHT11 D2/GPIO4; DS3231 SDA D3/GPIO0, SCL D4/GPIO2 as defined in source.
- ESP keeps controller responsibility for schedule, AUTO/MANUAL, safety, emergency and OTA.

## Provisioning and safety

On first boot, the device creates a unique 128-bit WPA2 password and saves it in `/setup_ap_password.txt` in LittleFS. It reuses that password after reboot, so each board keeps its own AP password. When `SmartFarm_Setup` opens, the password is printed to the local USB Serial Monitor at 115200 baud; connect to the AP and finish setup within 180 seconds. Use the serial command `OPEN_AP` or the documented Wi-Fi reset procedure to reopen setup. Keep physical/serial access restricted and record the password for that board.

The portal masks MQTT, OTA and Telegram token inputs and does not prefill saved secrets. Leave a secret field blank to keep its current value; enter a replacement to rotate it. The setup portal still uses HTTP rather than end-to-end TLS: WPA2 protects the local Wi-Fi link, but ESP8266 LittleFS secrets and the AP password file remain unencrypted at rest. Never commit these secrets or expose the portal/OTA to an untrusted network.

To retrieve one board's current AP password remotely, use an admin-only MQTT identity: read its six-digit hex `chip_id` from `smartfarm/status/device`, subscribe to `smartfarm/admin/setup-ap-password/<CHIP_ID>/response`, then publish `SHOW` to `smartfarm/admin/setup-ap-password/<CHIP_ID>/request`. Only the matching board responds; the reply is non-retained and rate-limited. Apply the per-device ACL in `docs/mqtt-topics.md` before enabling this feature; the standard Dashboard must not be allowed to read any response topic.

MQTT and Telegram use TLS with CA validation and a valid system clock; `setInsecure` must not be used. ArduinoOTA uses port 8266 and is enabled only when an OTA password is configured. HTTP browser upload OTA is disabled by default; if explicitly enabled for a controlled lab build, keep it on a trusted farm LAN and never expose its port publicly. OTA is not declared successful until the device reports the actual result.

The static source build must be compiled and verified before claiming a binary release. Physical OTA, TLS broker auth and relay output still require the target device/network for integration verification.
