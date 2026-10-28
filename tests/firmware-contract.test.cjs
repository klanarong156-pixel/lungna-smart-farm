const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('firmware/esp8266/src/main.ino', 'utf8');

assert.match(source, /#define SMARTFARM_VERSION "V7\.2\.0-OTA-STABLE"/);
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
