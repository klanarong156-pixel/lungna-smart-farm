(() => {
  'use strict';

  const $ = id => document.getElementById(id);
  const money = n => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(n);
  const txt = value => value === null || value === undefined || value === '' ? 'ยังไม่มีข้อมูล' : String(value);
  const labels = { offline: 'ออฟไลน์', connecting: 'กำลังเชื่อมต่อ', online: 'เชื่อมต่อแล้ว', reconnecting: 'กำลังเชื่อมต่อใหม่', error: 'ผิดพลาด' };
  const esc = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  let toastTimer;
  const events = [];
  let eventFilter = 'all';
  let mqttConnectedAt = 0;
  let reconnectCount = 0;
  let lastConnection = 'offline';
  let lastSensorUpdate = 0;

  function setText(id, value) { const node = $(id); if (node) node.textContent = value; }
  function toast(message) {
    const node = $('toast');
    node.textContent = message;
    node.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => node.classList.remove('show'), 3000);
  }
  function navigate(page, updateHistory = true) {
    if (!document.querySelector(`[data-page="${page}"]`)) page = 'home';
    document.querySelectorAll('.page').forEach(node => node.classList.toggle('active', node.dataset.page === page));
    document.querySelectorAll('.side-nav [data-nav],.bottom-nav [data-nav]').forEach(node => {
      const active = node.dataset.nav === page;
      node.classList.toggle('active', active);
      if (active) node.setAttribute('aria-current', 'page'); else node.removeAttribute('aria-current');
    });
    if (updateHistory && location.hash !== `#${page}`) history.pushState(null, '', `#${page}`);
    window.scrollTo(0, 0);
  }
  document.querySelectorAll('[data-nav]').forEach(node => node.addEventListener('click', event => {
    event.preventDefault();
    navigate(node.dataset.nav, true);
  }));
  window.addEventListener('hashchange', () => navigate(location.hash.slice(1), false));
  window.addEventListener('popstate', () => navigate(location.hash.slice(1), false));
  navigate(location.hash.slice(1) || 'home', false);

  function addEvent(type, title, detail, at = Date.now(), status = '') {
    events.unshift({ type, title, detail: String(detail ?? ''), at, status });
    if (events.length > 120) events.length = 120;
    renderEvents();
    renderConnectionTimeline();
  }
  function captureStateEvent(snapshot, event) {
    if (event === 'initial') return;
    if (event.startsWith('connection:')) {
      const status = event.slice('connection:'.length);
      if (status === 'online' && lastConnection !== 'online') mqttConnectedAt = Date.now();
      if (status === 'reconnecting' && lastConnection !== 'reconnecting' && lastConnection !== 'offline') reconnectCount += 1;
      if (status !== lastConnection) addEvent('mqtt', `MQTT ${labels[status] || status}`, snapshot.connectionReason || 'สถานะการเชื่อมต่อเปลี่ยนแปลง');
      lastConnection = status;
      return;
    }
    if (event === 'esp:offline') {
      addEvent('esp', 'ESP8266 ออฟไลน์', snapshot.connectionReason || 'ไม่ได้รับ heartbeat ล่าสุด');
      return;
    }
    if (event === 'device:update') {
      if (snapshot.heartbeatAt) addEvent('esp', 'ESP Heartbeat', `${snapshot.device?.device_id || 'ESP8266'} · Firmware ${snapshot.device?.firmware || 'ยังไม่มีข้อมูล'}`, snapshot.heartbeatAt, 'รับ heartbeat สด');
      return;
    }
    if (event === 'sensor:update') {
      lastSensorUpdate = Date.now();
      if (snapshot.temperature !== null) addEvent('temperature', 'DHT11 · อุณหภูมิ', `${snapshot.temperature} °C`, lastSensorUpdate, 'ได้รับข้อมูลจริง');
      if (snapshot.humidity !== null) addEvent('humidity', 'DHT11 · ความชื้น', `${snapshot.humidity} %`, lastSensorUpdate, 'ได้รับข้อมูลจริง');
      return;
    }
    if (event.startsWith('relay:')) {
      const id = event.slice('relay:'.length);
      const relay = SmartFarmConfig.relays.find(item => item.id === id);
      const value = snapshot.relays[id];
      addEvent('relay', 'Relay Status', `${relay?.label || id} · ${value === true ? 'เปิด' : value === false ? 'ปิด' : 'ยังไม่มีข้อมูล'}`, Date.now(), 'สถานะจาก ESP');
      return;
    }
    if (event === 'mode:update') addEvent('system', 'อัปเดตโหมด', `ESP รายงานโหมด ${snapshot.mode}`);
    if (event.startsWith('schedule:')) addEvent('system', 'Schedule Status', `ESP รายงานตารางเวลาของ ${event.slice('schedule:'.length)}`);
    if (event === 'error') {
      const error = snapshot.errors[0];
      if (!error) return;
      const type = /relay/i.test(error.kind) ? 'relay' : /mqtt|broker|connection|heartbeat/i.test(error.kind) ? 'mqtt' : 'system';
      addEvent(type, 'ข้อผิดพลาดระบบ', `${error.kind} · ${error.message}`, error.at, 'ตรวจสอบ');
    }
  }

  const relayPending = new Set();
  let modePending = null;
  const schedulePending = new Set();
  let scheduleFeedback = '';

  function relayMarkup(relay, state, simple = false) {
    const value = state.relays[relay.id];
    const status = value === true ? 'เปิด' : value === false ? 'ปิด' : 'ยังไม่มีข้อมูล';
    const pending = relayPending.has(relay.id);
    return `<article class="card relay-card" data-relay="${esc(relay.id)}"><div class="relay-top"><span class="relay-icon">${esc(relay.icon)}</span>${!simple ? `<span class="card-label">${esc(relay.pin)}</span>` : ''}</div><div class="relay-control"><div><div class="relay-name">${esc(relay.label)}</div><div class="relay-state ${value === true ? 'on' : value === false ? 'off' : ''}">${pending ? 'กำลังสั่งงาน…' : status}</div></div><button class="button ${value === true ? 'secondary' : 'primary'} relay-button" data-relay-toggle="${esc(relay.id)}" ${pending || state.connection !== 'online' || state.espOnline !== true || value === null ? 'disabled' : ''}>${pending ? 'รอ ESP' : value === true ? 'ปิด' : 'เปิด'}</button></div></article>`;
  }

  function renderScheduleEditor(state) {
    const id = $('scheduleRelay').value;
    const relay = SmartFarmConfig.relays.find(item => item.id === id);
    const slots = state.schedules?.[id]?.slots;
    const pending = schedulePending.has(id);
    $('scheduleModeHint').textContent = state.mode === 'AUTO' ? 'โหมด AUTO · ตารางที่บันทึกไว้จะถูกนำไปใช้โดย ESP ตามเวลา' : state.mode === 'MANUAL' ? 'โหมด MANUAL · ตารางจะทำงานเมื่อเปลี่ยน ESP กลับเป็น AUTO' : 'รอสถานะ AUTO/MANUAL จาก ESP';
    if (!Array.isArray(slots)) {
      $('scheduleEditor').innerHTML = `<div class="schedule-empty">${state.espOnline === true ? 'กำลังรอ schedule/status จาก ESP สำหรับ' : 'เชื่อมต่อ MQTT และรอ ESP online เพื่ออ่านตารางของ'} ${esc(relay?.label || id)}</div>`;
      $('scheduleFeedback').textContent = scheduleFeedback;
      return;
    }
    const locked = pending || state.connection !== 'online' || state.espOnline !== true;
    $('scheduleEditor').innerHTML = `<form id="scheduleForm" data-schedule-id="${esc(id)}"><div class="schedule-slot-list">${slots.map((slot, index) => `<fieldset class="schedule-slot"><legend>ช่วงที่ ${index + 1}</legend><label class="schedule-toggle"><input type="checkbox" data-slot-toggle="${index}" ${slot.enabled ? 'checked' : ''} ${locked ? 'disabled' : ''}><span>เปิดใช้งานช่วงนี้</span></label><div class="schedule-time-fields"><label>เริ่ม<input type="time" data-slot-time="${index}" data-field="on" value="${esc(slot.on)}" ${!slot.enabled || locked ? 'disabled' : ''} ${slot.enabled ? 'required' : ''}></label><label>สิ้นสุด<input type="time" data-slot-time="${index}" data-field="off" value="${esc(slot.off)}" ${!slot.enabled || locked ? 'disabled' : ''} ${slot.enabled ? 'required' : ''}></label></div></fieldset>`).join('')}</div><button class="button primary schedule-save" type="submit" ${locked ? 'disabled' : ''}>${pending ? 'กำลังรอ ESP ยืนยัน…' : `บันทึกตาราง ${esc(relay?.label || id)}`}</button></form>`;
    $('scheduleFeedback').textContent = pending ? 'ส่งตารางแล้ว · กำลังรอ schedule/status จาก ESP' : scheduleFeedback;
  }
  function bindScheduleEditor() {
    $('scheduleRelay').addEventListener('change', () => { scheduleFeedback = ''; renderScheduleEditor(FarmState.get()); });
    $('scheduleEditor').addEventListener('change', event => {
      const checkbox = event.target.closest('[data-slot-toggle]');
      if (!checkbox) return;
      const index = checkbox.dataset.slotToggle;
      const enabled = checkbox.checked;
      document.querySelectorAll(`[data-slot-time="${index}"]`).forEach(input => { input.disabled = !enabled || schedulePending.has($('scheduleRelay').value); input.required = enabled; });
    });
    $('scheduleEditor').addEventListener('submit', async event => {
      if (event.target.id !== 'scheduleForm') return;
      event.preventDefault();
      const id = event.target.dataset.scheduleId;
      const state = FarmState.get();
      if (state.connection !== 'online' || state.espOnline !== true) { scheduleFeedback = 'ต้องเชื่อมต่อ MQTT และ ESP ก่อนบันทึก'; renderScheduleEditor(state); return; }
      if (!state.schedules[id]) { scheduleFeedback = 'ยังไม่ได้รับ schedule/status จาก ESP'; renderScheduleEditor(state); return; }
      const slots = Array.from({ length: SmartFarmConfig.scheduleSlotCount }, (_, index) => {
        const enabled = event.target.querySelector(`[data-slot-toggle="${index}"]`).checked;
        return { enabled, on: event.target.querySelector(`[data-slot-time="${index}"][data-field="on"]`).value || '00:00', off: event.target.querySelector(`[data-slot-time="${index}"][data-field="off"]`).value || '00:00' };
      });
      let normalized;
      try { normalized = FarmState.normalizeSchedule(id, { slots }); }
      catch (error) { scheduleFeedback = error.message; toast(error.message); renderScheduleEditor(state); return; }
      schedulePending.add(id);
      scheduleFeedback = `กำลังส่งตาราง ${SmartFarmConfig.relays.find(item => item.id === id)?.label || id}…`;
      renderScheduleEditor(FarmState.get());
      try {
        const confirmed = await FarmMqtt.commandSchedule(id, normalized);
        if (!confirmed) throw Error('ESP ยังไม่ยืนยันตารางเวลานี้');
        scheduleFeedback = 'ESP ยืนยันและรายงานตารางใหม่แล้ว';
        toast('บันทึกตารางเวลาเรียบร้อย');
      } catch (error) {
        scheduleFeedback = `บันทึกไม่สำเร็จ: ${error.message}`;
        FarmState.addError('schedule-command', error.message);
        toast(error.message);
      } finally { schedulePending.delete(id); renderScheduleEditor(FarmState.get()); }
    });
  }
  function bindRelayButtons() {
    document.querySelectorAll('[data-relay-toggle]').forEach(button => button.addEventListener('click', async () => {
      const id = button.dataset.relayToggle;
      const state = FarmState.get();
      if (state.relays[id] === null) { toast('ยังไม่มีข้อมูลสถานะ Relay จาก ESP8266'); return; }
      const target = !state.relays[id];
      relayPending.add(id);
      render(FarmState.get());
      try {
        const ok = await FarmMqtt.commandRelay(id, target);
        relayPending.delete(id);
        if (ok) toast('ESP8266 ยืนยันสถานะแล้ว'); else toast('ไม่สามารถยืนยันสถานะได้');
      } catch (error) {
        relayPending.delete(id);
        toast(error.message);
        FarmState.addError('relay-command', error.message);
      }
      render(FarmState.get());
    }));
  }

  function detailItem(label, value) { return `<div class="detail-item"><span>${esc(label)}</span><b>${esc(txt(value))}</b></div>`; }
  function formatUptime(seconds) {
    if (!Number.isFinite(seconds)) return null;
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor(seconds % 86400 / 3600);
    const minutes = Math.floor(seconds % 3600 / 60);
    return days ? `${days} วัน ${hours} ชม.` : hours ? `${hours} ชม. ${minutes} นาที` : `${minutes} นาที`;
  }
  function formatSince(timestamp) { return timestamp ? new Date(timestamp).toLocaleString('th-TH', { dateStyle: 'short', timeStyle: 'medium' }) : 'ยังไม่มีข้อมูล'; }
  function renderConnectionTimeline() {
    const node = $('connectionTimeline');
    if (!node) return;
    const recent = events.filter(item => ['mqtt', 'esp', 'relay', 'temperature', 'humidity'].includes(item.type)).slice(0, 6);
    node.innerHTML = recent.length ? recent.map(item => `<div class="diagnostic-row"><time>${new Date(item.at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}</time><i class="diagnostic-dot ${item.type === 'mqtt' && /ผิดพลาด|ออฟไลน์/.test(item.title) ? 'error' : item.type === 'esp' || item.type === 'relay' ? 'success' : ''}"></i><span><b>${esc(item.title)}</b><br><small>${esc(item.detail)}</small></span><small>${esc(item.status)}</small></div>`).join('') : '<p class="empty-state">ยังไม่มีเหตุการณ์ใน session นี้</p>';
  }
  function renderEvents() {
    const list = $('eventList');
    if (!list) return;
    const visible = eventFilter === 'all' ? events : events.filter(item => item.type === eventFilter);
    const icons = { relay: '◉', temperature: '♨', humidity: '◌', esp: '▣', mqtt: '⌁', system: '⚙' };
    list.innerHTML = visible.length ? visible.map(item => `<article class="card event-card"><span class="event-icon ${item.type === 'mqtt' ? 'mqtt' : item.status === 'ตรวจสอบ' ? 'error' : ''}">${icons[item.type] || '•'}</span><div class="event-content"><b>${esc(item.title)}</b><p>${esc(item.detail)}${item.status ? ` · ${esc(item.status)}` : ''}</p></div><time class="event-time">${new Date(item.at).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</time></article>`).join('') : `<div class="empty-state card">${events.length ? 'ไม่มีเหตุการณ์ในหมวดนี้' : 'ยังไม่มีเหตุการณ์ใน session นี้ · เชื่อมต่อ MQTT เพื่อรับข้อมูล'}</div>`;
  }
  document.querySelectorAll('[data-event-filter]').forEach(button => button.addEventListener('click', () => {
    eventFilter = button.dataset.eventFilter;
    document.querySelectorAll('[data-event-filter]').forEach(item => item.classList.toggle('active', item === button));
    renderEvents();
  }));

  function render(state) {
    const connection = $('connection');
    connection.dataset.state = state.connection;
    connection.querySelector('span').textContent = `MQTT · ${labels[state.connection] || state.connection}`;
    setText('settingsConnection', labels[state.connection] || state.connection);
    setText('mqttReason', state.connectionReason);
    setText('connectionMqttBadge', labels[state.connection] || state.connection);
    setText('mqttConnectionState', labels[state.connection] || state.connection);
    setText('mqttReconnectCount', String(reconnectCount));
    setText('mqttConnectedSince', mqttConnectedAt ? formatSince(mqttConnectedAt) : 'ยังไม่มีข้อมูล');
    setText('mqttLastError', state.errors[0]?.message || 'ไม่มีข้อผิดพลาด');
    $('headerEsp').dataset.state = state.espOnline === true ? 'online' : state.espOnline === false ? 'offline' : 'unknown';
    const espLabel = state.espOnline === true ? 'ออนไลน์' : state.espOnline === false ? 'ออฟไลน์' : 'ยังไม่มีข้อมูล';
    setText('headerEspStatus', `ESP8266 · ${espLabel}`);
    setText('settingsEsp', espLabel);
    setText('connectionEspBadge', espLabel);
    setText('connectionEspState', espLabel);
    setText('espStatus', espLabel);
    setText('waterDevice', espLabel);
    setText('deviceBadge', espLabel);
    $('deviceBadge').classList.toggle('online', state.espOnline === true);
    $('deviceEspBadge').textContent = espLabel;
    $('deviceEspBadge').classList.toggle('unavailable', state.espOnline === false);

    setText('modeValue', txt(state.mode));
    setText('waterMode', txt(state.mode));
    setText('modeFeedback', modePending ? `กำลังรอ ESP ยืนยัน ${modePending}…` : '');
    document.querySelectorAll('[data-mode]').forEach(button => {
      button.disabled = state.connection !== 'online' || state.espOnline !== true || Boolean(modePending);
      button.classList.toggle('primary', state.mode === button.dataset.mode);
    });
    setText('lastSeen', state.heartbeatAt ? `Heartbeat ล่าสุด ${new Date(state.heartbeatAt).toLocaleTimeString('th-TH')}` : 'รอข้อมูลจาก ESP8266');
    setText('temperature', state.temperature === null ? 'ยังไม่มีข้อมูล' : `${state.temperature} °C`);
    setText('humidity', state.humidity === null ? 'ยังไม่มีข้อมูล' : `${state.humidity} %`);
    setText('deviceTemperature', state.temperature === null ? 'ยังไม่มีข้อมูล' : `${state.temperature} °C`);
    setText('deviceHumidity', state.humidity === null ? 'ยังไม่มีข้อมูล' : `${state.humidity} %`);
    setText('weatherSensorTemp', state.temperature === null ? 'ยังไม่มีข้อมูล' : `${state.temperature} °C`);
    setText('weatherSensorHumidity', state.humidity === null ? 'ยังไม่มีข้อมูล' : `${state.humidity} %`);
    setText('sensorLastUpdate', lastSensorUpdate ? formatSince(lastSensorUpdate) : 'ยังไม่มีข้อมูล');
    setText('sensorStatus', state.temperature !== null || state.humidity !== null ? 'ได้รับข้อมูลจริง' : 'รอข้อมูลจาก DHT11');

    $('homeRelays').innerHTML = SmartFarmConfig.relays.map(relay => relayMarkup(relay, state, true)).join('');
    $('waterRelays').innerHTML = SmartFarmConfig.relays.map(relay => relayMarkup(relay, state)).join('');
    bindRelayButtons();
    const knownRelays = Object.values(state.relays).filter(value => value !== null);
    const onCount = knownRelays.filter(Boolean).length;
    const offCount = knownRelays.length - onCount;
    setText('waterSummary', knownRelays.length ? `เปิด ${onCount} · ปิด ${offCount}` : 'ยังไม่มีข้อมูล');

    const device = state.device || {};
    const firmware = txt(device.firmware);
    setText('firmwareVersion', firmware);
    setText('footerFirmware', firmware);
    setText('firmwareSummary', `Firmware · ${firmware}`);
    setText('deviceId', txt(device.device_id));
    setText('otaValue', device.otaReady === true ? 'พร้อม' : device.otaReady === false ? 'ไม่พร้อม' : txt(null));
    $('settingsEsp').title = state.connectionReason;
    setText('wifiStatus', typeof device.wifi === 'boolean' ? device.wifi ? 'เชื่อมต่อแล้ว' : 'ขาดการเชื่อมต่อ' : 'ยังไม่มีข้อมูล');
    setText('settingsWifiStatus', typeof device.wifi === 'boolean' ? device.wifi ? 'เชื่อมต่อแล้ว' : 'ขาดการเชื่อมต่อ' : 'ยังไม่มีข้อมูล');
    setText('settingsWifiIp', txt(device.ip));
    setText('connectionIp', txt(device.ip));
    setText('connectionFirmware', txt(device.firmware));
    setText('connectionRssi', Number.isFinite(device.rssi) ? `${device.rssi} dBm` : 'ยังไม่มีข้อมูล');
    setText('heartbeatTime', state.heartbeatAt ? formatSince(state.heartbeatAt) : 'ยังไม่มีข้อมูล');
    setText('heartbeatAge', state.heartbeatAt ? `${Math.max(0, Math.floor((Date.now() - state.heartbeatAt) / 1000))} วินาที` : 'รอ live heartbeat');
    setText('sensorAge', Number.isFinite(device.sensorAgeSec) ? `${device.sensorAgeSec} วินาที` : 'ยังไม่มีข้อมูล');
    const broker = (() => { try { return new URL(SmartFarmConfig.mqtt.url).hostname; } catch { return 'HiveMQ Cloud'; } })();
    setText('mqttBroker', broker);

    const details = [
      ['Firmware', device.firmware], ['Uptime', formatUptime(device.uptimeSec)],
      ['RSSI', Number.isFinite(device.rssi) ? `${device.rssi} dBm` : null], ['Free Heap', Number.isFinite(device.heap) ? `${new Intl.NumberFormat('th-TH').format(device.heap)} bytes` : null],
      ['Reset Reason', device.resetReason], ['Device ID', device.device_id],
      ['Wi-Fi', typeof device.wifi === 'boolean' ? device.wifi ? 'เชื่อมต่อ' : 'ขาดการเชื่อมต่อ' : null],
      ['MQTT ที่ ESP', typeof device.mqtt === 'boolean' ? device.mqtt ? 'เชื่อมต่อ' : 'ขาดการเชื่อมต่อ' : null],
      ['DS3231 RTC', typeof device.rtc === 'boolean' ? device.rtc ? 'พร้อม' : 'ไม่พร้อม' : null],
      ['NTP', typeof device.ntp === 'boolean' ? device.ntp ? 'พร้อม' : 'ไม่พร้อม' : null],
      ['OTA', device.otaStatus || (typeof device.otaReady === 'boolean' ? device.otaReady ? 'พร้อม' : 'ไม่พร้อม' : null)],
      ['Emergency lock', typeof device.emergencyLock === 'boolean' ? device.emergencyLock ? 'ทำงาน' : 'ไม่ทำงาน' : null]
    ];
    $('deviceDetails').innerHTML = details.map(([key, value]) => detailItem(key, value)).join('');
    const relayRows = SmartFarmConfig.relays.map(relay => {
      const value = state.relays[relay.id];
      return `<div class="device-relay-row"><span>${esc(relay.label)}</span><b class="${value === true ? 'on' : value === false ? 'off' : ''}">${value === true ? 'เปิด' : value === false ? 'ปิด' : 'ยังไม่มีข้อมูล'}</b></div>`;
    });
    $('deviceRelays').innerHTML = relayRows.join('');
    setText('rtcTime', txt(device.time));
    setText('rtcSource', device.clockSource ? String(device.clockSource).toUpperCase() : 'ยังไม่มีข้อมูล');
    setText('rtcReady', typeof device.rtc === 'boolean' ? device.rtc ? 'ปกติ' : 'ไม่พร้อม' : 'ยังไม่มีข้อมูล');
    setText('rtcStatus', typeof device.rtc === 'boolean' ? device.rtc ? 'พร้อม' : 'ไม่พร้อม' : 'ยังไม่มีข้อมูล');

    renderEvents();
    renderConnectionTimeline();
  }

  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', async () => {
    modePending = button.dataset.mode;
    render(FarmState.get());
    try {
      const ok = await FarmMqtt.commandMode(modePending);
      modePending = null;
      if (ok) toast(`ESP ยืนยันโหมด ${button.dataset.mode}`); else toast('ไม่สามารถยืนยันโหมดจาก ESP ได้');
    } catch (error) { modePending = null; FarmState.addError('mode-command', error.message); toast(error.message); }
    render(FarmState.get());
  }));
  bindScheduleEditor();
  FarmState.subscribe((snapshot, event) => {
    captureStateEvent(snapshot, event);
    render(snapshot);
    if (event === 'initial' || event.startsWith('schedule:') || event.startsWith('connection:') || event === 'esp:offline') renderScheduleEditor(snapshot);
  });
  window.addEventListener('farm:esp-timeout', () => {
    toast('ไม่ได้รับ heartbeat จาก ESP · แสดงออฟไลน์');
    setText('deviceBadge', 'ออฟไลน์');
    $('deviceBadge').classList.remove('online');
    setText('waterDevice', 'ออฟไลน์');
    setText('settingsEsp', 'ออฟไลน์');
    document.querySelectorAll('.relay-button').forEach(button => { button.disabled = true; });
  });
  window.addEventListener('farm:presence-offline', () => toast('ESP รายงานออฟไลน์'));

  const credentials = FarmMqtt.credentials();
  $('mqttUser').value = credentials.user;
  $('rememberMqtt').checked = credentials.remember;
  $('mqttPass').placeholder = credentials.pass ? 'มีรหัสผ่านที่บันทึกไว้ · ไม่แสดงเพื่อความปลอดภัย' : 'กรอกรหัสผ่าน MQTT';
  $('connectBtn').addEventListener('click', () => {
    const storedCredentials = FarmMqtt.credentials();
    const ok = FarmMqtt.connect($('mqttUser').value, $('mqttPass').value || storedCredentials.pass, $('rememberMqtt').checked);
    $('mqttFeedback').textContent = ok ? 'กำลังเริ่มเชื่อมต่อ…' : 'ตรวจสอบข้อมูลและการเชื่อมต่อ';
    if (ok) $('mqttPass').value = '';
  });
  $('disconnectBtn').addEventListener('click', () => FarmMqtt.disconnect());
  $('clearMqttCredentials').addEventListener('click', () => {
    for (const store of [localStorage, sessionStorage]) { store.removeItem('sf.mqtt.user'); store.removeItem('sf.mqtt.pass'); }
    $('mqttUser').value = SmartFarmConfig.mqtt.defaultUsername;
    $('mqttPass').value = '';
    $('mqttPass').placeholder = 'กรอกรหัสผ่าน MQTT';
    $('rememberMqtt').checked = false;
    toast('ล้างข้อมูล MQTT ที่บันทึกในเบราว์เซอร์แล้ว');
  });

  function loadFinance() { try { const rows = JSON.parse(localStorage.getItem('sf.finance') || '[]'); return Array.isArray(rows) ? rows : []; } catch (error) { FarmState.addError('finance-storage', error.message); return []; } }
  function saveFinance(rows) { localStorage.setItem('sf.finance', JSON.stringify(rows)); paintFinance(); }
  function paintFinance() {
    const rows = loadFinance().sort((a, b) => b.date.localeCompare(a.date));
    const income = rows.filter(row => row.type === 'income').reduce((sum, row) => sum + row.amount, 0);
    const expense = rows.filter(row => row.type === 'expense').reduce((sum, row) => sum + row.amount, 0);
    const receivables = rows.filter(row => row.type === 'income').reduce((sum, row) => sum + Math.max(0, row.amount - (row.paid || 0)), 0);
    setText('incomeTotal', money(income)); setText('expenseTotal', money(expense)); setText('netTotal', money(income - expense)); setText('receivablesTotal', money(receivables));
    setText('financeSummary', rows.length ? `${rows.length} รายการ · ล่าสุด ${rows[0].description}` : 'ยังไม่มีรายการบันทึก');
    $('financeList').innerHTML = rows.length ? rows.slice(0, 100).map(row => `<article class="finance-item"><div><b>${esc(row.description)}</b><small>${esc(row.date)} · ${row.type === 'income' ? 'รายรับ' : 'รายจ่าย'}${row.product ? ` · ${esc(row.product)}` : ''}${row.buyer ? ` · ${esc(row.buyer)}` : ''}${row.type === 'income' ? ` · รับแล้ว ${money(row.paid || 0)} · ค้างรับ ${money(Math.max(0, row.amount - (row.paid || 0)))}` : ''}</small></div><strong class="${row.type}">${row.type === 'income' ? '+' : '−'}${money(row.amount)}</strong></article>`).join('') : '<div class="card muted">ยังไม่มีข้อมูล</div>';
  }
  $('financeForm').addEventListener('submit', event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const amount = Number(form.get('amount'));
    if (!(amount > 0 && Number.isFinite(amount))) { toast('กรุณาระบุจำนวนเงินที่ถูกต้อง'); return; }
    const rows = loadFinance();
    const type = form.get('type');
    const paid = type === 'income' ? Number(form.get('paid') || 0) : 0;
    if (!Number.isFinite(paid) || paid < 0 || paid > amount) { toast('ยอดรับเงินต้องอยู่ระหว่าง 0 ถึงมูลค่ารายการ'); return; }
    rows.push({ id: crypto.randomUUID(), type, description: String(form.get('description')).trim(), amount, paid, date: form.get('date') || new Date().toISOString().slice(0, 10), product: String(form.get('product') || '').trim(), quantity: Number(form.get('quantity')) || null, unit: String(form.get('unit') || '').trim(), buyer: String(form.get('buyer') || '').trim(), balanceDue: type === 'income' ? amount - paid : 0 });
    saveFinance(rows); event.currentTarget.reset(); event.currentTarget.elements.date.value = new Date().toISOString().slice(0, 10); toast('บันทึกรายการแล้ว');
  });
  $('financeForm').elements.date.value = new Date().toISOString().slice(0, 10);
  $('exportFinance').addEventListener('click', () => {
    const rows = loadFinance();
    if (!rows.length) { toast('ยังไม่มีรายการให้ส่งออก'); return; }
    const csv = ['วันที่,ประเภท,รายละเอียด,จำนวนเงิน,รับเงินแล้ว,ยอดค้างรับ,ผลผลิต,ปริมาณ,หน่วย,ผู้รับซื้อ', ...rows.map(row => `${row.date},${row.type === 'income' ? 'รายรับ' : 'รายจ่าย'},"${row.description.replaceAll('"', '""')}",${row.amount},${row.paid || 0},${Math.max(0, row.amount - (row.paid || 0))},"${(row.product || '').replaceAll('"', '""')}",${row.quantity || ''},${row.unit || ''},"${(row.buyer || '').replaceAll('"', '""')}"`)].join('\n');
    const anchor = document.createElement('a'); anchor.href = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' })); anchor.download = 'lungna-finance.csv'; anchor.click(); URL.revokeObjectURL(anchor.href);
  });
  $('clearLocal').addEventListener('click', () => { if (confirm('ลบข้อมูลการเงินทั้งหมดที่เก็บในเบราว์เซอร์นี้หรือไม่?')) { localStorage.removeItem('sf.finance'); paintFinance(); toast('ล้างข้อมูลการเงินแล้ว'); } });
  paintFinance();

  const weatherCodes = { 0: 'ท้องฟ้าแจ่มใส', 1: 'ส่วนใหญ่แจ่มใส', 2: 'มีเมฆบางส่วน', 3: 'มีเมฆมาก', 45: 'หมอก', 48: 'หมอก', 51: 'ฝนปรอยเล็กน้อย', 53: 'ฝนปรอย', 55: 'ฝนปรอยหนัก', 61: 'ฝนเล็กน้อย', 63: 'ฝนปานกลาง', 65: 'ฝนหนัก', 80: 'ฝนซู่', 81: 'ฝนซู่ปานกลาง', 82: 'ฝนซู่หนัก', 95: 'พายุฝนฟ้าคะนอง' };
  async function loadWeather() {
    const button = $('weatherRefresh'); button.disabled = true; $('weatherError').textContent = '';
    try {
      const { latitude, longitude, timezone } = SmartFarmConfig.weather;
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&timezone=${encodeURIComponent(timezone)}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,wind_speed_10m_max&forecast_days=5`;
      const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
      if (!response.ok) throw Error(`Weather API HTTP ${response.status}`);
      const data = await response.json();
      if (typeof data.current?.temperature_2m !== 'number') throw Error('ข้อมูลพยากรณ์ไม่สมบูรณ์');
      setText('forecastTemp', `${Math.round(data.current.temperature_2m)}°C`);
      setText('forecastSummary', weatherCodes[data.current.weather_code] || 'สภาพอากาศ');
      setText('forecastUpdated', `ข้อมูลจาก Open-Meteo · ${new Date(data.current.time).toLocaleString('th-TH')}`);
      setText('weatherHumidity', Number.isFinite(data.current.relative_humidity_2m) ? `${data.current.relative_humidity_2m}%` : 'ยังไม่มีข้อมูล');
      setText('weatherWind', Number.isFinite(data.current.wind_speed_10m) ? `${data.current.wind_speed_10m} กม./ชม.` : 'ยังไม่มีข้อมูล');
      setText('weatherRain', Number.isFinite(data.daily?.precipitation_probability_max?.[0]) ? `${data.daily.precipitation_probability_max[0]}%` : 'ยังไม่มีข้อมูล');
      const days = (data.daily?.time || []).slice(0, 3);
      $('forecastDays').innerHTML = days.length ? days.map((date, index) => `<div class="forecast-day"><span>${index === 0 ? 'วันนี้' : index === 1 ? 'พรุ่งนี้' : new Date(`${date}T12:00:00`).toLocaleDateString('th-TH', { weekday: 'short' })}</span><b>${Number.isFinite(data.daily.temperature_2m_max[index]) ? `${Math.round(data.daily.temperature_2m_max[index])}°` : '—'}</b><span>${Number.isFinite(data.daily.temperature_2m_min[index]) ? `${Math.round(data.daily.temperature_2m_min[index])}°` : '—'}</span><small>ฝน ${Number.isFinite(data.daily.precipitation_probability_max?.[index]) ? `${data.daily.precipitation_probability_max[index]}%` : '—'}</small></div>`).join('') : '<span class="muted">ไม่มีข้อมูลพยากรณ์</span>';
    } catch (error) {
      $('weatherError').textContent = `โหลดพยากรณ์ไม่สำเร็จ: ${error.message}`;
      setText('forecastSummary', 'Weather API ไม่พร้อมใช้งาน');
      FarmState.addError('weather', error.message);
    } finally { button.disabled = false; }
  }
  $('weatherRefresh').addEventListener('click', loadWeather);
  $('refreshBtn').addEventListener('click', () => { loadWeather(); toast('กำลังอัปเดตพยากรณ์อากาศ'); });
  loadWeather();

  $('systemCheck').addEventListener('click', async () => {
    const result = $('systemCheckResult'); result.textContent = 'กำลังตรวจสอบไฟล์ระบบ…';
    try {
      const response = await fetch('./manifest.json', { cache: 'no-store' });
      if (!response.ok) throw Error(`Manifest HTTP ${response.status}`);
      await response.json();
      const registration = 'serviceWorker' in navigator ? await navigator.serviceWorker.getRegistration('./') : null;
      result.textContent = `Manifest พร้อมใช้งาน · ${registration ? 'Service Worker ลงทะเบียนแล้ว' : 'ไม่พบการลงทะเบียน Service Worker ใน session นี้'}`;
    } catch (error) { result.textContent = `ตรวจสอบไม่สำเร็จ: ${error.message}`; }
  });
  $('reloadDashboard').addEventListener('click', () => location.reload());
  setInterval(() => {
    const state = FarmState.get();
    setText('heartbeatAge', state.heartbeatAt ? `${Math.max(0, Math.floor((Date.now() - state.heartbeatAt) / 1000))} วินาที` : 'รอ live heartbeat');
  }, 1000);
  if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(error => FarmState.addError('service-worker', error.message)));
})();
