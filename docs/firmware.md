# Firmware Version และ Responsibilities

Firmware V7.2.1-PHYSICAL-AP-BUTTON เป็น source ปัจจุบันที่ต่อยอดจาก baseline ที่ตรวจจาก New140869 โดยคง source safety logic และเพิ่มปุ่ม physical AP setup. ESP8266 จัดการ GPIO relay, AUTO/MANUAL, schedule (เมื่อ clock valid), emergency lock, Wi-Fi/MQTT reconnect, DHT11, RTC/NTP และ OTA safe state.

## EMQX Cloud Serverless setup

Create an EMQX Serverless deployment. In Deployment → Overview, copy its broker address and download that deployment's CA certificate. Add MQTT users under Access Control → Client Authentication; Serverless only accepts encrypted MQTT TLS on port `8883` and WSS on port `8084`, with browser MQTT using `/mqtt`. Anonymous authentication is not supported. See [EMQX Serverless Connection Guide](https://docs.emqx.com/en/cloud/latest/deployments/port_guide_serverless.html) and [Connect with ESP8266](https://docs.emqx.com/en/cloud/latest/connect_to_deployments/esp8266.html).

The Dashboard's System page accepts `wss://<broker-address>:8084/mqtt` (or the host by itself) plus an MQTT username/password. Credentials and endpoint are stored in the current browser's `sessionStorage` unless “remember” is enabled, in which case they are stored in `localStorage`. A static browser client cannot hide its credential from browser users; use a separate restricted MQTT user for the Dashboard.

For the Dashboard user, allow subscribe to `smartfarm/status/#`, `smartfarm/sensor/#`, `smartfarm/relay/+/status`, `smartfarm/mode/status`, `smartfarm/schedule/+/status`, `smartfarm/emergency/status` and `smartfarm/system/error`; allow publish only to `smartfarm/relay/+/set`, `smartfarm/mode/set` and `smartfarm/schedule/+/set`. For the ESP user, allow publishes for its status, heartbeat, sensor, relay, mode, schedule and diagnostic topics, and allow subscriptions only to the command topics declared in `MQTT_COMMAND_TOPICS` in `src/main.ino`. EMQX Cloud Serverless defaults to blacklist authorization and does not provide the one-click whitelist switch. To get deny-by-default behavior, add a final All Users rule denying `#` for Publish & Subscribe, and create more-specific allow rules per username; check rule precedence and verify both clients before allowing hardware control. See [Default Authorization](https://docs.emqx.com/en/cloud/latest/deployments/default_authz.html).

### GitHub Actions firmware build (PR #15)

For a release-capable Actions build, add both `EMQX_SERVER` and `EMQX_CA_PEM` under repository **Settings → Secrets and variables → Actions**. `EMQX_SERVER` must be the broker hostname only (no scheme, port, or path); `EMQX_CA_PEM` must contain the PEM CA certificate bundle downloaded for that same deployment. The workflow parses the PEM bundle and verifies the live broker's TLS chain and hostname on port `8883` before it marks the build as configured. A missing, malformed, mismatched, expired, or unreachable endpoint fails the configuration step, so no firmware artifact is published. The endpoint and CA are connection metadata, not MQTT login credentials; the workflow does not take MQTT usernames/passwords from Actions Secrets.

If both Actions secrets are absent (for example, for a fork pull request), Actions writes safe placeholders, performs a compile-only build, and skips firmware artifact creation/upload. Setting only one secret is an error. The workflow generates `src/emqx_secrets.h` in its runner workspace; it does not edit `src/main.ino` or commit the generated secret values.

### Device Wi-Fi, MQTT and OTA provisioning through `SmartFarm_Setup`

On first setup or when saved Wi-Fi cannot be reached, the ESP8266 starts the `SmartFarm_Setup` Wi-Fi AP (WiFiManager default is an open AP). Connect a phone/computer to it and open `http://192.168.4.1` if the captive portal does not appear. Choose the farm router's 2.4 GHz SSID and enter its password, then fill the `MQTT username` and `MQTT password` fields with an EMQX authentication user that has the firmware's required topic ACLs. Set a separate strong value in `OTA password`; ArduinoOTA authenticates as username `admin`. Save and wait for the portal to exit and the device to reconnect. The portal timeout is 180 seconds.

For later edits, turn all relays OFF, open PlatformIO Serial Monitor at 115200 baud, set line ending to LF/Newline, send `OPEN_AP`, reconnect to `SmartFarm_Setup` and edit the fields. Verify Wi-Fi and MQTT status in Serial Monitor. MQTT credentials and OTA password are persisted in device configuration, not compiled from `emqx_secrets.h`; never put them in source control. Erasing device configuration requires provisioning again.

### Local firmware build

For a local build, configure `firmware/esp8266/src/emqx_secrets.h`: set `MQTT_SERVER` to the broker hostname only and put that deployment's CA PEM between the `R"EMQXCA(` and `)EMQXCA"` delimiters in `MQTT_ROOT_CA_PEM`. Keep `MQTT_PORT` at `8883` in `src/main.ino`. A generic repository clone contains compile-only placeholders and must be configured before use. The deployment-specific bundle prepared for Lungna Smart Farm includes the verified `lungna-sf-staging` hostname and its CA certificate. Do not put MQTT usernames/passwords in this header or publish deployment config broadly. Never use `setInsecure()` or reuse a CA copied from another deployment. Provision the device with a separate MQTT username/password and ACL appropriate for its publish/subscribe topics.

Firmware source uses TLS port 8883 and validates broker CA plus clock; MQTT username/password and OTA password are provisioned on device and are not repository defaults. OTA HTTP endpoint is for trusted farm LAN only, while ArduinoOTA uses UDP port 8266/password. Do not expose the HTTP OTA port to public internet.

The dashboard is not a firmware updater and does not claim an OTA success state. Actual build and device flashing are separate outcomes. Verify compile output, binary hash, target board and on-device version before releasing any `.bin`.
