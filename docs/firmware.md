# Firmware Version และ Responsibilities

Firmware V7.2.0-OTA-STABLE เป็น image ที่ตรวจจาก New140869 และย้ายเข้าสู่ repository ใหม่โดยไม่แก้ source safety logic. ESP8266 จัดการ GPIO relay, AUTO/MANUAL, schedule (เมื่อ clock valid), emergency lock, Wi-Fi/MQTT reconnect, DHT11, RTC/NTP และ OTA safe state.

## EMQX Cloud Serverless setup

Create an EMQX Serverless deployment. In Deployment → Overview, copy its broker address and download that deployment's CA certificate. Add MQTT users under Access Control → Client Authentication; Serverless only accepts encrypted MQTT TLS on port `8883` and WSS on port `8084`, with browser MQTT using `/mqtt`. Anonymous authentication is not supported. See [EMQX Serverless Connection Guide](https://docs.emqx.com/en/cloud/latest/deployments/port_guide_serverless.html) and [Connect with ESP8266](https://docs.emqx.com/en/cloud/latest/connect_to_deployments/esp8266.html).

The Dashboard's System page accepts `wss://<broker-address>:8084/mqtt` (or the host by itself) plus an MQTT username/password. Credentials and endpoint are stored in the current browser's `sessionStorage` unless “remember” is enabled, in which case they are stored in `localStorage`. A static browser client cannot hide its credential from browser users; use a separate restricted MQTT user for the Dashboard.

For the Dashboard user, allow subscribe to `smartfarm/status/#`, `smartfarm/sensor/#`, `smartfarm/relay/+/status`, `smartfarm/mode/status`, `smartfarm/schedule/+/status`, `smartfarm/emergency/status` and `smartfarm/system/error`; allow publish only to `smartfarm/relay/+/set`, `smartfarm/mode/set` and `smartfarm/schedule/+/set`. For the ESP user, allow publishes for its status, heartbeat, sensor, relay, mode, schedule and diagnostic topics, and allow subscriptions only to the command topics declared in `MQTT_COMMAND_TOPICS` in `src/main.ino`. EMQX Cloud Serverless defaults to blacklist authorization and does not provide the one-click whitelist switch. To get deny-by-default behavior, add a final All Users rule denying `#` for Publish & Subscribe, and create more-specific allow rules per username; check rule precedence and verify both clients before allowing hardware control. See [Default Authorization](https://docs.emqx.com/en/cloud/latest/deployments/default_authz.html).

Before building ESP firmware, replace `MQTT_SERVER` in `src/main.ino` with the EMQX broker address (hostname only, no scheme or port), keep `MQTT_PORT` at `8883`, and paste the matching CA PEM from that deployment into `MQTT_ROOT_CA_PEM`. CA is intentionally empty by default, so TLS setup fails closed until configured. Never use `setInsecure()` or reuse a CA copied from another deployment. Provision the device with a separate MQTT username/password and ACL appropriate for its publish/subscribe topics.

Firmware source uses TLS port 8883 and validates broker CA plus clock; MQTT username/password and OTA password are provisioned on device and are not repository defaults. OTA HTTP endpoint is for trusted farm LAN only, while ArduinoOTA uses UDP port 8266/password. Do not expose the HTTP OTA port to public internet.

The dashboard is not a firmware updater and does not claim an OTA success state. Actual build and device flashing are separate outcomes. Verify compile output, binary hash, target board and on-device version before releasing any `.bin`.
