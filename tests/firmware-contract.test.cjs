const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('firmware/esp8266/src/main.ino', 'utf8');
const secretsHeader = fs.readFileSync('firmware/esp8266/src/emqx_secrets.h', 'utf8');
const workflow = fs.readFileSync('.github/workflows/firmware.yml', 'utf8');

assert.match(source, /#define SMARTFARM_VERSION "V7\.2\.0-OTA-STABLE"/);
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
assert.match(source, /#define ENABLE_HTTP_OTA 0/);
assert.doesNotMatch(source, /telegramTls\.setInsecure\(\)/);
assert.match(source, /telegramTls\.setTrustAnchors\(mqttTrustAnchor\)/);
assert.match(source, /telegramTls\.setX509Time\(\(time_t\)epoch\)/);
assert.match(source, /mqttTrustAnchor->getCount\(\)/);
assert.match(source, /emergency\/status/);
assert.match(source, /system\/error/);
assert.match(source, /otaFailureLock/);
assert.match(source, /digitalWrite\(relayPins\[i\], RELAY_OFF\)/);

console.log('PASS firmware source contract: validated TLS, OTA defaults, safety locks and diagnostics');
