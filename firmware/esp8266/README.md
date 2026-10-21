# ESP8266 Firmware V7.2.0

Firmware source lives in `src/main.cpp` and is based on the V7.2.0 OTA stable firmware inspected in the read-only reference repository. It retains the original relay, safety, MQTT and provisioning implementation rather than inventing hardware mapping.

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

Configure Wi-Fi, MQTT username/password and OTA password using the firmware's WiFiManager setup portal/device procedure. Never commit these secrets. MQTT uses TLS with CA validation and valid system clock; setInsecure must not be used for MQTT. HTTP OTA is intended for trusted farm LAN only; never expose its port publicly. ArduinoOTA uses port 8266 and device-provisioned password. OTA is not declared successful until device reports the actual result.

The static source build must be compiled and verified before claiming a binary release. Physical OTA, TLS broker auth and relay output still require the target device/network for integration verification.
