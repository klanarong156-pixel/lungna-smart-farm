(() => {
  'use strict';

  const relays = Object.fromEntries(SmartFarmConfig.relays.map(relay => [relay.id, null]));
  const schedules = Object.fromEntries(SmartFarmConfig.relays.map(relay => [relay.id, null]));
  const state = {
    connection: 'offline', connectionReason: 'ยังไม่ได้เชื่อมต่อ',
    espOnline: null, heartbeatAt: 0, device: null, mode: null,
    temperature: null, humidity: null, relays, schedules, errors: []
  };
  const listeners = new Set();

  function emit(event) {
    const snapshot = structuredClone(state);
    listeners.forEach(listener => listener(snapshot, event));
    window.dispatchEvent(new CustomEvent('farm:state', { detail: { state: snapshot, event } }));
  }

  function parseTime(value) {
    if (typeof value !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) {
      throw Error('เวลาในตารางต้องอยู่ในรูปแบบ HH:MM (00:00–23:59)');
    }
    const [hour, minute] = value.split(':').map(Number);
    return hour * 60 + minute;
  }

  function toSegments(slot) {
    const start = parseTime(slot.on);
    const end = parseTime(slot.off);
    if (start === end) throw Error('เวลาเริ่มและสิ้นสุดของช่วงที่เปิดใช้งานต้องต่างกัน');
    if (start < end) return [[start, end]];
    return [[start, 1440], [0, end]];
  }

  function normalizeSchedule(id, payload) {
    if (!Object.hasOwn(state.schedules, id)) throw Error(`ไม่รู้จัก schedule ของ relay ${id}`);
    if (!payload || typeof payload !== 'object' || Array.isArray(payload) || !Array.isArray(payload.slots)) {
      throw Error('รูปแบบ schedule status ไม่ถูกต้อง');
    }
    if (payload.slots.length !== SmartFarmConfig.scheduleSlotCount) {
      throw Error(`ตารางต้องมี ${SmartFarmConfig.scheduleSlotCount} ช่วงเวลา`);
    }

    const slots = payload.slots.map((slot, index) => {
      if (!slot || typeof slot !== 'object' || Array.isArray(slot) || typeof slot.enabled !== 'boolean') {
        throw Error(`ข้อมูลช่วงเวลาที่ ${index + 1} ไม่ถูกต้อง`);
      }
      const on = typeof slot.on === 'string' ? slot.on : '';
      const off = typeof slot.off === 'string' ? slot.off : '';
      if (slot.enabled) {
        parseTime(on);
        parseTime(off);
        if (on === off) throw Error(`ช่วงเวลาที่ ${index + 1}: เวลาเริ่มและสิ้นสุดต้องต่างกัน`);
      } else {
        // Firmware publishes 00:00 for empty slots; tolerate empty inputs from callers.
        if (on) parseTime(on);
        if (off) parseTime(off);
      }
      return { enabled: slot.enabled, on: on || '00:00', off: off || '00:00' };
    });

    for (let first = 0; first < slots.length; first++) {
      if (!slots[first].enabled) continue;
      const firstSegments = toSegments(slots[first]);
      for (let second = first + 1; second < slots.length; second++) {
        if (!slots[second].enabled) continue;
        const secondSegments = toSegments(slots[second]);
        const overlaps = firstSegments.some(([aStart, aEnd]) => secondSegments.some(([bStart, bEnd]) => Math.max(aStart, bStart) < Math.min(aEnd, bEnd)));
        if (overlaps) throw Error(`ช่วงเวลาที่ ${first + 1} และ ${second + 1} ทับซ้อนกัน`);
      }
    }
    return { slots };
  }

  function setConnection(status, reason = '') {
    state.connection = status;
    state.connectionReason = reason;
    if (status !== 'online') {
      if (status !== 'connecting') state.espOnline = false;
      Object.keys(state.relays).forEach(id => { state.relays[id] = null; });
      Object.keys(state.schedules).forEach(id => { state.schedules[id] = null; });
      if (status !== 'connecting') state.mode = null;
    }
    emit(`connection:${status}`);
  }

  function setEspOffline(reason = 'offline') {
    state.espOnline = false;
    state.mode = null;
    state.connectionReason = reason;
    Object.keys(state.relays).forEach(id => { state.relays[id] = null; });
    Object.keys(state.schedules).forEach(id => { state.schedules[id] = null; });
    emit('esp:offline');
  }

  function setDevice(obj, retained = false) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj) || typeof obj.online !== 'boolean' || typeof obj.mqtt !== 'boolean') {
      throw Error('device heartbeat payload invalid');
    }
    state.device = obj;
    if (!retained) {
      state.heartbeatAt = Date.now();
      state.espOnline = obj.online && obj.mqtt;
    }
    emit('device:update');
  }

  function setSensor(obj) {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) throw Error('DHT11 payload must be object');
    for (const key of ['temperature', 'humidity']) {
      if (obj[key] !== undefined && obj[key] !== null && (typeof obj[key] !== 'number' || !Number.isFinite(obj[key]))) {
        throw Error(`invalid sensor field ${key}`);
      }
    }
    state.temperature = typeof obj.temperature === 'number' ? obj.temperature : null;
    state.humidity = typeof obj.humidity === 'number' ? obj.humidity : null;
    emit('sensor:update');
  }

  function setRelay(id, payload) {
    if (!Object.hasOwn(state.relays, id)) throw Error(`unknown relay ${id}`);
    if (payload !== 'ON' && payload !== 'OFF') throw Error('invalid relay state');
    state.relays[id] = payload === 'ON';
    emit(`relay:${id}`);
  }

  function setSchedule(id, payload) {
    state.schedules[id] = normalizeSchedule(id, payload);
    emit(`schedule:${id}`);
  }

  function setMode(payload) {
    if (!['AUTO', 'MANUAL'].includes(payload)) throw Error('unsupported firmware mode');
    state.mode = payload;
    emit('mode:update');
  }

  function addError(kind, message) {
    const item = { kind: String(kind), message: String(message), at: Date.now() };
    state.errors = [item, ...state.errors].slice(0, 20);
    emit('error');
    console.error('[SmartFarm]', item);
  }

  function subscribe(listener) {
    listeners.add(listener);
    listener(structuredClone(state), 'initial');
    return () => listeners.delete(listener);
  }

  window.FarmState = Object.freeze({
    get: () => structuredClone(state), subscribe, setConnection, setEspOffline,
    setDevice, setSensor, setRelay, setSchedule, setMode, normalizeSchedule, addError
  });
})();
