const assert = require('node:assert/strict');
const fs = require('node:fs');
const { test } = require('node:test');
const vm = require('node:vm');

const source = fs.readFileSync('dashboard/js/sensor-alerts.js', 'utf8');
function makeStorage(seed = {}) {
  const data = new Map(Object.entries(seed));
  return {
    getItem: key => data.has(key) ? data.get(key) : null,
    setItem: (key, value) => data.set(key, String(value)),
    data
  };
}
function loadApi(storage = makeStorage()) {
  const window = { localStorage: storage };
  vm.runInNewContext(source, { window });
  return { api: window.SensorAlertConfig, storage };
}
const plain = value => JSON.parse(JSON.stringify(value));

test('default and saved thresholds load from browser-local storage', () => {
  const { api, storage } = loadApi();
  assert.deepEqual(plain(api.load()), { temperature: 35, humidity: 80 });
  const saved = api.save({ temperature: 32.5, humidity: 75 });
  assert.equal(saved.persisted, true);
  assert.deepEqual(plain(saved.settings), { temperature: 32.5, humidity: 75 });
  const reloaded = loadApi(storage).api;
  assert.deepEqual(plain(reloaded.load()), { temperature: 32.5, humidity: 75 });
});

test('thresholds alert only when a finite real reading is above the configured limit', () => {
  const { api } = loadApi();
  const limits = { temperature: 30, humidity: 70 };
  assert.deepEqual(plain(api.evaluate({ temperature: 30, humidity: 70 }, limits)), []);
  assert.deepEqual(plain(api.evaluate({ temperature: 30.1, humidity: 71 }, limits)), [
    { key: 'temperature', label: 'อุณหภูมิ', value: 30.1, threshold: 30, unit: '°C' },
    { key: 'humidity', label: 'ความชื้น', value: 71, threshold: 70, unit: '% RH' }
  ]);
  assert.deepEqual(plain(api.evaluate({ temperature: null, humidity: '71' }, limits)), []);
});

test('invalid or corrupted settings fall back on load and are rejected on save', () => {
  const { api } = loadApi(makeStorage({
    'sf.dashboard.sensor-alert-thresholds.v1': '{broken json'
  }));
  assert.deepEqual(plain(api.load()), { temperature: 35, humidity: 80 });
  assert.throws(() => api.save({ temperature: 61, humidity: 80 }), /temperature/);
  assert.throws(() => api.save({ temperature: 30.2, humidity: 80 }), /0.5/);
  assert.throws(() => api.save({ temperature: 30, humidity: 80.5 }), /จำนวนเต็ม/);
});

test('alert thresholds still work for the current session if storage is unavailable', () => {
  const storage = { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } };
  const { api } = loadApi(storage);
  assert.deepEqual(plain(api.load()), { temperature: 35, humidity: 80 });
  const result = api.save({ temperature: 34.5, humidity: 79 });
  assert.equal(result.persisted, false);
  assert.deepEqual(plain(api.evaluate({ temperature: 35, humidity: 79 }, result.settings)).map(item => item.key), ['temperature']);
});
