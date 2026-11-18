const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('firmware/esp8266/src/main.ino', 'utf8');
const secretsHeader = fs.readFileSync('firmware/esp8266/src/emqx_secrets.h', 'utf8');
const workflow = fs.readFileSync('.github/workflows/firmware.yml', 'utf8');
const dashboardConfig = fs.readFileSync('dashboard/js/config.js', 'utf8');

assert.match(source, /#define SMARTFARM_VERSION "V7\.2\.1-PHYSICAL-AP-BUTTON"/);
assert.match(workflow, /SmartFarm_V7\.2\.1\.bin/);
assert.match(workflow, /name: SmartFarm_V7\.2\.1/);
assert.match(source, /^#include "emqx_secrets\.h"$/m);
assert.match(secretsHeader, /#define MQTT_SERVER "YOUR_EMQX_SERVERLESS_ENDPOINT"/);
assert.match(secretsHeader, /static const char MQTT_ROOT_CA_PEM\[\] PROGMEM = R"EMQXCA\(\s*\)EMQXCA"/);
assert.match(source, /#define MQTT_PORT 8883/);
assert.match(source, /MQTT_ROOT_CA_PEM/);
assert.match(workflow, /EMQX_SERVER: \$\{\{ secrets\.EMQX_SERVER \}\}/);
assert.match(workflow, /EMQX_CA_PEM: \$\{\{ secrets\.EMQX_CA_PEM \}\}/);
assert.match(workflow, /steps\.emqx\.outputs\.configured == 'true'/);
assert.doesNotMatch(source, /hivemq\.cloud/i);
assert.doesNotMatch(workflow, /MQTT_USERNAME|MQTT_PASSWORD/);
assert.match(source, /MQTT_RECOMMENDED_USERNAME\[\] = "smartfarm-device"/);
assert.match(dashboardConfig, /defaultUsername: 'smartfarm-dashboard'/);
assert.match(source, /#define ENABLE_HTTP_OTA 0/);
assert.match(source, /#define WIFI_RESET_BUTTON D1/);
assert.match(source, /#define AP_SETUP_BUTTON D0/);
assert.match(source, /pinMode\(AP_SETUP_BUTTON, INPUT_PULLDOWN_16\)/);
assert.match(source, /const uint32_t AP_SETUP_BUTTON_HOLD_MS = 2000UL/);
const apButtonHandler = source.slice(
  source.indexOf('void handleApSetupButton()'),
  source.indexOf('\nvoid handleSerialCommands()')
);
assert.match(apButtonHandler, /digitalRead\(AP_SETUP_BUTTON\) == HIGH/);
assert.match(apButtonHandler, /openMqttSetupPortal\(\)/);
assert.match(apButtonHandler, /if \(relayOn\(i\)\)[\s\S]*AP setup blocked/);
assert.doesNotMatch(apButtonHandler, /clearSavedWifiSettings|resetSettings/);
assert.doesNotMatch(source, /telegramTls\.setInsecure\(\)/);
assert.match(source, /telegramTls\.setTrustAnchors\(mqttTrustAnchor\)/);
assert.match(source, /telegramTls\.setX509Time\(\(time_t\)epoch\)/);
assert.match(source, /mqttTrustAnchor->getCount\(\)/);
assert.match(source, /emergency\/status/);
assert.match(source, /system\/error/);
assert.match(source, /otaFailureLock/);
assert.match(source, /digitalWrite\(relayPins\[i\], RELAY_OFF\)/);

const mqttCallback = source.slice(
  source.indexOf('void mqttCallback('),
  source.indexOf('\nconst char *mqttStateName')
);
assert.match(mqttCallback, /t == MQTT_BASE "\/config\/telegram\/set"/);
assert.match(mqttCallback, /t == MQTT_BASE "\/config\/telegram\/test"/);
assert.match(mqttCallback, /payload=\[REDACTED\]/);
const sensitiveLogBlock = mqttCallback.slice(
  mqttCallback.indexOf('if (sensitiveTopic)'),
  mqttCallback.indexOf('String logMsg = msg')
);
assert.doesNotMatch(sensitiveLogBlock, /\bmsg\b|payload=%s/);

console.log('PASS firmware source contract: validated TLS, OTA defaults, safety locks and diagnostics');
