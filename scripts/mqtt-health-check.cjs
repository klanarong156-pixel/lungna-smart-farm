#!/usr/bin/env node
'use strict';

const mqtt = require('mqtt');

const enabled = process.env.MQTT_HEALTHCHECK === '1';
if (!enabled) {
  console.log('[mqtt-health] skipped: set MQTT_HEALTHCHECK=1 to enable hardware read-only checks');
  process.exit(0);
}

const url = process.env.MQTT_URL;
const username = process.env.MQTT_USERNAME;
const password = process.env.MQTT_PASSWORD;
const timeoutMs = Number(process.env.MQTT_HEALTHCHECK_TIMEOUT_MS || 30000);
const expectedFirmware = process.env.EXPECTED_FIRMWARE || 'V7.2.0-OTA-STABLE';
const relayIds = ['pump', 'zone1', 'lighthome', 'lightsala'];

if (!url || !username || !password) {
  console.error('[mqtt-health] MQTT_URL, MQTT_USERNAME and MQTT_PASSWORD are required when MQTT_HEALTHCHECK=1');
  process.exit(2);
}
if (!Number.isFinite(timeoutMs) || timeoutMs < 5000 || timeoutMs > 120000) {
  console.error('[mqtt-health] MQTT_HEALTHCHECK_TIMEOUT_MS must be between 5000 and 120000');
  process.exit(2);
}
if (!/^mqtts?:\/\//.test(url) && !/^wss?:\/\//.test(url)) {
  console.error('[mqtt-health] MQTT_URL must use mqtt://, mqtts://, ws:// or wss://');
  process.exit(2);
}

const topics = [
  'smartfarm/status/online',
  'smartfarm/status/device',
  'smartfarm/sensor/dht11',
  ...relayIds.map(id => `smartfarm/relay/${id}/status`),
  'smartfarm/emergency/status',
  'smartfarm/system/error'
];
const received = new Map();
const client = mqtt.connect(url, {
  username,
  password,
  reconnectPeriod: 0,
  connectTimeout: timeoutMs,
  clean: true,
  protocolVersion: 4
});

function fail(message) {
  console.error(`[mqtt-health] FAILED: ${message}`);
  try { client.end(true); } finally { process.exit(1); }
}
function jsonPayload(topic, value) {
  try { return JSON.parse(value); } catch (_) { fail(`${topic} payload is not valid JSON`); }
}
function check() {
  const device = received.get('smartfarm/status/device')?.payload;
  const sensor = received.get('smartfarm/sensor/dht11')?.payload;
  if (!device || typeof device !== 'object' || device.online !== true || device.mqtt !== true) fail('ESP heartbeat is missing or reports offline');
  if (device.firmware !== expectedFirmware) fail(`firmware mismatch: expected ${expectedFirmware}, got ${device.firmware || 'missing'}`);
  if (typeof device.device_id !== 'string' || !device.device_id) fail('device_id is missing');
  if (!Number.isFinite(device.rssi) || device.rssi > 0 || device.rssi < -110) fail(`RSSI is invalid: ${device.rssi}`);
  if (!Number.isFinite(device.heap) || device.heap <= 0) fail('free heap is invalid');
  if (device.rtc !== true && device.clockValid !== true) fail('RTC/clock is not valid');
  if (!sensor || typeof sensor !== 'object' || !Number.isFinite(sensor.temperature) || !Number.isFinite(sensor.humidity)) fail('DHT11 telemetry is missing or invalid');
  if (sensor.temperature < -20 || sensor.temperature > 80) fail(`temperature is outside safe sensor range: ${sensor.temperature}`);
  if (sensor.humidity < 0 || sensor.humidity > 100) fail(`humidity is outside safe sensor range: ${sensor.humidity}`);
  for (const id of relayIds) {
    const item = received.get(`smartfarm/relay/${id}/status`);
    if (!item || !['ON', 'OFF'].includes(item.value)) fail(`relay status missing or invalid: ${id}`);
  }
  const emergency = received.get('smartfarm/emergency/status')?.payload;
  if (emergency && typeof emergency.active !== 'boolean') fail('emergency status payload is invalid');
  const error = received.get('smartfarm/system/error')?.payload;
  if (error && (typeof error.code !== 'string' || typeof error.message !== 'string')) fail('system error payload is invalid');
  console.log(`[mqtt-health] PASS: device=${device.device_id} firmware=${device.firmware} temperature=${sensor.temperature} humidity=${sensor.humidity} relays=read-only`);
  client.end(true, () => process.exit(0));
}

const timer = setTimeout(() => fail(`timeout after ${timeoutMs}ms; received ${received.size}/${topics.length} required/status topics`), timeoutMs);
client.on('error', error => fail(`MQTT connection error: ${error.message}`));
client.on('connect', () => {
  client.subscribe(topics, { qos: 0 }, error => {
    if (error) fail(`subscribe failed: ${error.message}`);
    else console.log(`[mqtt-health] connected; subscribed read-only to ${topics.length} topics`);
  });
});
client.on('message', (topic, buffer, packet) => {
  const value = buffer.toString();
  if (topic === 'smartfarm/status/online' && value !== 'true') fail(`ESP online status is ${value}`);
  if (topic === 'smartfarm/status/device' || topic === 'smartfarm/sensor/dht11' || topic.endsWith('/emergency/status') || topic.endsWith('/system/error')) {
    received.set(topic, { payload: jsonPayload(topic, value), retained: packet.retain });
  } else {
    received.set(topic, { value, retained: packet.retain });
  }
  const required = ['smartfarm/status/device', 'smartfarm/sensor/dht11', ...relayIds.map(id => `smartfarm/relay/${id}/status`)];
  if (required.every(topicName => received.has(topicName))) { clearTimeout(timer); check(); }
});

process.on('SIGINT', () => fail('interrupted'));
process.on('SIGTERM', () => fail('terminated'));
