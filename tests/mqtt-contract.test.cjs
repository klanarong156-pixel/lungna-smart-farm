const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
class CE { constructor(type, options = {}) { this.type = type; this.detail = options.detail; } }
const config = {
  mqtt: {
    commandTimeoutMs: 100,
    scheduleCommandTimeoutMs: 100,
    topics: {
      online: 'smartfarm/status/online', device: 'smartfarm/status/device', dht11: 'smartfarm/sensor/dht11',
      modeStatus: 'smartfarm/mode/status', modeSet: 'smartfarm/mode/set', emergencyStatus: 'smartfarm/emergency/status', systemError: 'smartfarm/system/error',
      relayStatus: id => `smartfarm/relay/${id}/status`, relaySet: id => `smartfarm/relay/${id}/set`,
      scheduleStatus: id => `smartfarm/schedule/${id}/status`, scheduleSet: id => `smartfarm/schedule/${id}/set`
    }, subscriptions: []
  },
  relays: [{ id: 'pump' }, { id: 'zone1' }]
};
config.scheduleSlotCount = 4;
const store = { getItem: () => null, setItem() {}, removeItem() {} };
const context = {
  console, Date, Math, JSON, Number, String, Object, Array, Set, Map, Error, Promise,
  structuredClone, CustomEvent: CE, setTimeout, clearTimeout, setInterval, clearInterval,
  localStorage: store, sessionStorage: store,
  window: { dispatchEvent() {}, addEventListener() {} },
  SmartFarmConfig: config
};
context.window.SmartFarmConfig = config;
context.window.window = context.window;
vm.createContext(context);
vm.runInContext(fs.readFileSync('dashboard/js/state.js', 'utf8'), context);
context.FarmState = context.window.FarmState;
vm.runInContext(fs.readFileSync('dashboard/js/mqtt.js', 'utf8'), context);
const state = context.window.FarmState;
const manager = context.window.FarmMqtt;
const published = [];
manager.client = {
  connected: true,
  publish(topic, payload, options, callback) {
    published.push({ topic, payload, options });
    callback(null);
  }
};

(async () => {
  const modePromise = manager.commandMode('AUTO');
  assert.equal(published.at(-1).topic, 'smartfarm/mode/set');
  assert.equal(published.at(-1).payload, 'AUTO');
  assert.equal(published.at(-1).options.qos, 1);
  assert.equal(published.at(-1).options.retain, false);
  manager.message('smartfarm/mode/status', 'AUTO', false);
  assert.equal(await modePromise, true);
  assert.equal(state.get().mode, 'AUTO');
  await assert.rejects(manager.commandMode('SCHEDULE'), /firmware/);

  state.setConnection('online', 'test');
  state.setDevice({ online: true, mqtt: true }, false);
  const relayPromise = manager.commandRelay('pump', true);
  assert.equal(published.at(-1).topic, 'smartfarm/relay/pump/set');
  assert.equal(published.at(-1).payload, 'ON');
  assert.equal(published.at(-1).options.retain, false);
  manager.message('smartfarm/relay/pump/status', 'ON', false);
  assert.equal(await relayPromise, true);
  assert.equal(state.get().relays.pump, true);

  // A transient broker reconnect must not erase last-known device state.
  state.setConnection('reconnecting', 'socket closed');
  assert.equal(state.get().relays.pump, true, 'reconnecting preserves last-known relay state');
  assert.equal(state.get().espOnline, true, 'reconnecting does not falsely mark ESP offline');
  state.setConnection('error', 'transient network error');
  assert.equal(state.get().relays.pump, true, 'transient error preserves last-known relay state');

  const schedule = { slots: [
    { enabled: true, on: '06:00', off: '06:15' },
    { enabled: false, on: '00:00', off: '00:00' },
    { enabled: false, on: '00:00', off: '00:00' },
    { enabled: false, on: '00:00', off: '00:00' }
  ] };
  const schedulePromise = manager.commandSchedule('pump', schedule);
  assert.equal(published.at(-1).topic, 'smartfarm/schedule/pump/set');
  assert.equal(published.at(-1).options.qos, 1);
  assert.equal(published.at(-1).options.retain, false);
  assert.equal(JSON.stringify(JSON.parse(published.at(-1).payload)), JSON.stringify(schedule));
  assert.equal(manager.pendingSchedules.has('pump'), true, 'broker PUBACK is not ESP schedule ACK');
  manager.message('smartfarm/schedule/pump/status', JSON.stringify(schedule), false);
  assert.equal(await schedulePromise, true);
  assert.equal(state.get().schedules.pump.slots[0].on, '06:00');

  const unacknowledged = { slots: [
    { enabled: true, on: '07:00', off: '07:15' },
    { enabled: false, on: '00:00', off: '00:00' },
    { enabled: false, on: '00:00', off: '00:00' },
    { enabled: false, on: '00:00', off: '00:00' }
  ] };
  await assert.rejects(manager.commandSchedule('pump', unacknowledged), /schedule\/status/);
  assert.equal(manager.pendingSchedules.has('pump'), false, 'timed-out ESP ACK clears pending request');
  assert.equal(state.get().schedules.pump.slots[0].on, '06:00', 'unconfirmed schedule never overwrites known ESP state');

  await assert.rejects(manager.commandSchedule('pump', { slots: [{ enabled: true, on: '06:00', off: '06:30' }] }), /ช่วงเวลา/);
  state.setEspOffline('test');
  assert.equal(state.get().relays.pump, null);
  await assert.rejects(manager.commandSchedule('pump', schedule), /ESP ออฟไลน์/);
  assert.equal(state.get().schedules.pump, null);
  assert.equal(state.get().mode, null);
  manager.message('smartfarm/emergency/status', JSON.stringify({ active: true, source: 'mqtt' }), true);
  assert.equal(state.get().emergency.active, true);
  manager.message('smartfarm/system/error', JSON.stringify({ code: 'RELAY_BLOCKED', message: 'Emergency Stop active' }), false);
  assert.equal(state.get().systemError.code, 'RELAY_BLOCKED');
  console.log('PASS MQTT contract: relay/mode/schedule commands, schedule ESP ACK, invalid payload and offline reset');
})().catch(error => { console.error(error); process.exitCode = 1; });
