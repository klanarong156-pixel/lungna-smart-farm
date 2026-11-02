(() => {
  'use strict';

  const STORAGE_KEY = 'sf.dashboard.sensor-alert-thresholds.v1';
  const DEFAULTS = Object.freeze({ temperature: 35, humidity: 80 });
  const LIMITS = Object.freeze({
    temperature: Object.freeze({ min: 0, max: 60 }),
    humidity: Object.freeze({ min: 0, max: 100 })
  });

  function validate(settings) {
    if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
      throw new TypeError('เกณฑ์แจ้งเตือนไม่ถูกต้อง');
    }
    const result = {};
    for (const key of Object.keys(DEFAULTS)) {
      const value = settings[key], { min, max } = LIMITS[key];
      if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) {
        throw new RangeError(`${key} ต้องอยู่ระหว่าง ${min}–${max}`);
      }
      if (key === 'temperature' && !Number.isInteger(value * 2)) throw new RangeError('เกณฑ์อุณหภูมิต้องเพิ่มครั้งละ 0.5 °C');
      if (key === 'humidity' && !Number.isInteger(value)) throw new RangeError('เกณฑ์ความชื้นต้องเป็นจำนวนเต็ม');
      result[key] = value;
    }
    return Object.freeze(result);
  }

  function load() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      return raw ? validate(JSON.parse(raw)) : DEFAULTS;
    } catch (_) {
      return DEFAULTS;
    }
  }

  function save(settings) {
    const value = validate(settings);
    let persisted = false;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
      persisted = true;
    } catch (_) { /* The alert still works in memory when browser storage is unavailable. */ }
    return { settings: value, persisted };
  }

  function evaluate(reading, settings) {
    const thresholds = validate(settings), alerts = [];
    if (Number.isFinite(reading?.temperature) && reading.temperature > thresholds.temperature) {
      alerts.push({ key: 'temperature', label: 'อุณหภูมิ', value: reading.temperature, threshold: thresholds.temperature, unit: '°C' });
    }
    if (Number.isFinite(reading?.humidity) && reading.humidity > thresholds.humidity) {
      alerts.push({ key: 'humidity', label: 'ความชื้น', value: reading.humidity, threshold: thresholds.humidity, unit: '% RH' });
    }
    return alerts;
  }

  window.SensorAlertConfig = Object.freeze({ key: STORAGE_KEY, defaults: DEFAULTS, limits: LIMITS, validate, load, save, evaluate });
})();
