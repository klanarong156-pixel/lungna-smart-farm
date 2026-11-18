# ESP8266 Firmware V7.2.1

Firmware source lives in `src/main.ino` and is based on the V7.2.0 OTA stable firmware inspected in the read-only reference repository. It retains the original relay, safety, MQTT and provisioning implementation and adds a dedicated physical AP setup button.

## Board and dependencies

- PlatformIO environment `nodemcuv2` / ESP8266 NodeMCU.
- Firmware version macro: `V7.2.1-PHYSICAL-AP-BUTTON`.
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
- Wi-Fi reset button remains on D1/GPIO5 (hold 5 seconds to erase saved Wi-Fi). The separate AP setup button uses D0/GPIO16: connect a normally-open momentary pushbutton between D0 and 3V3. GPIO16 uses `INPUT_PULLDOWN_16`, so leave the button open normally and do not connect it to 5 V. With all relays OFF, hold for 2 seconds to open `SmartFarm_Setup`; the saved Wi-Fi credentials are not erased. The AP is blocked while any relay is ON because the setup portal pauses the main loop. The portal times out after 180 seconds. The setup AP has no password, so use it only while physically present and close it after configuration.
- ESP keeps controller responsibility for schedule, AUTO/MANUAL, safety, emergency and OTA.

## Provisioning and safety

For a local build, configure `src/emqx_secrets.h`: set `MQTT_SERVER` to the EMQX broker hostname only (no scheme, port, or path), and put the CA PEM from that same deployment inside the `MQTT_ROOT_CA_PEM` raw string. MQTTS uses port `8883` (`MQTT_PORT` in `src/main.ino`). The checked-in header has safe placeholders, so MQTT/TLS remains disabled until configured. Do not put MQTT usernames/passwords in this header, and do not commit deployment-specific values unless they are intentionally public; restore the placeholders after a local release build if needed.

For a release-capable GitHub Actions firmware build, configure both repository Actions secrets, `EMQX_SERVER` and `EMQX_CA_PEM`. The workflow validates the PEM bundle and verifies the broker's TLS chain and hostname on port `8883` before producing or uploading a firmware artifact. If neither secret is available (such as on a fork PR), CI uses placeholders and performs a compile-only build without an artifact; providing only one secret fails the job. See [`../../docs/firmware.md`](../../docs/firmware.md) for full setup details.

Configure Wi-Fi, a dedicated MQTT username/password and OTA password using the firmware's WiFiManager setup portal/device procedure. Never commit these credentials. MQTT and Telegram use TLS with CA validation and a valid system clock; `setInsecure` must not be used. HTTP OTA is disabled by default; if explicitly enabled for a controlled lab build, keep it on a trusted farm LAN and never expose its port publicly. ArduinoOTA uses port 8266 and a device-provisioned password. OTA is not declared successful until the device reports the actual result.

The static source build must be compiled and verified before claiming a binary release. Physical OTA, TLS broker auth and relay output still require the target device/network for integration verification.
