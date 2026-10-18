(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const money = n => new Intl.NumberFormat('th-TH', { style: 'currency', currency: 'THB' }).format(n);
  const txt = v => v === null || v === undefined || v === '' ? 'ยังไม่มีข้อมูล' : String(v);
  const labels = { offline: 'ออฟไลน์', connecting: 'กำลังเชื่อมต่อ', online: 'ออนไลน์', reconnecting: 'กำลังเชื่อมต่อใหม่', error: 'ผิดพลาด' };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' })[c]);
  const relayPending = new Set(), schedulePending = new Set();
  let modePending = null, scheduleFeedback = '', toastTimer, activeFilter = 'all', selectedFarmRelay = null;
  let lastConnection = null, connectedSince = null, reconnectCount = 0, sensorUpdatedAt = null, lastHeartbeatSeen = 0;
  const events = [];
  function toast(message) { const t = $('toast'); t.textContent = message; t.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 3200); }
  function addEvent(type, title, detail, status = 'info', at = Date.now()) {
    events.unshift({ type, title, detail, status, at });
    if (events.length > 150) events.length = 150;
    renderEvents();
  }
  function renderEvents() {
    const root = $('eventList'); if (!root) return;
    const rows = events.filter(e => activeFilter === 'all' || e.type === activeFilter);
    root.innerHTML = rows.length ? rows.map(e => `<article class="event-item"><span class="event-mark event-${esc(e.type)}">${({relay:'◉',temperature:'🌡',humidity:'💧',esp:'⌁',mqtt:'⌁',error:'!',system:'▣'})[e.type] || '•'}</span><div class="event-copy"><b>${esc(e.title)}</b><small>${esc(e.detail)}</small></div><div class="event-meta"><time>${new Date(e.at).toLocaleString('th-TH',{dateStyle:'short',timeStyle:'medium'})}</time><span class="event-status ${esc(e.status)}">${esc(e.status==='ok'?'รับข้อมูล':e.status==='error'?'ผิดพลาด':e.status==='pending'?'รอยืนยัน':'ข้อมูล')}</span></div></article>`).join('') : '<p class="empty-state">ยังไม่มีเหตุการณ์ในหมวดนี้ · จะแสดงเมื่อ Dashboard ได้รับข้อมูลจริง</p>';
  }
  function setRecordsView(view) {
    const showFinance = view === 'finance';
    $('recordsEventsPanel').hidden = showFinance;
    $('recordsFinancePanel').hidden = !showFinance;
    $('recordsEventsTab').classList.toggle('active', !showFinance);
    $('recordsFinanceTab').classList.toggle('active', showFinance);
    $('recordsEventsTab').setAttribute('aria-selected', String(!showFinance));
    $('recordsFinanceTab').setAttribute('aria-selected', String(showFinance));
    $('recordsEventsTab').tabIndex = showFinance ? -1 : 0;
    $('recordsFinanceTab').tabIndex = showFinance ? 0 : -1;
  }
  function navigate(page) {
    const openFinance = page === 'finance';
    const openEvents = page === 'events';
    const aliases = { 'connection-page': 'system', settings: 'system', events: 'records', finance: 'records' };
    page = aliases[page] || page;
    if (!document.querySelector(`[data-page="${page}"]`)) page = 'home';
    document.querySelectorAll('.page').forEach(n => n.classList.toggle('active', n.dataset.page === page));
    document.querySelectorAll('[data-nav]').forEach(n => n.classList.toggle('active', n.dataset.nav === page));
    history.replaceState(null, '', `#${page}`);
    window.scrollTo(0, 0);
    if (openFinance) setRecordsView('finance');
    else if (openEvents) setRecordsView('events');
  }
  document.querySelectorAll('[data-nav]').forEach(el => el.addEventListener('click', () => navigate(el.dataset.nav)));
  document.querySelectorAll('[data-records-view]').forEach(el => el.addEventListener('click', () => setRecordsView(el.dataset.recordsView)));
  window.addEventListener('hashchange', () => navigate(location.hash.slice(1)));
  navigate(location.hash.slice(1) || 'home');

  function openFarmZone(relayId) {
    if (!SmartFarmConfig.relays.some(relay => relay.id === relayId)) return;
    selectedFarmRelay = relayId;
    $('scheduleRelay').value = relayId;
    scheduleFeedback = '';
    renderScheduleEditor(FarmState.get());
    navigate('water');
    requestAnimationFrame(() => {
      const card = [...document.querySelectorAll('#waterRelays [data-relay]')].find(item => item.dataset.relay === relayId);
      if (!card) return;
      card.classList.add('farm-relay-target');
      card.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      card.focus({ preventScroll: true });
    });
  }
  document.querySelectorAll('[data-farm-zone]').forEach(zone => {
    zone.addEventListener('click', () => openFarmZone(zone.dataset.farmZone));
    zone.addEventListener('keydown', event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault();
      openFarmZone(zone.dataset.farmZone);
    });
  });
  document.querySelectorAll('[data-home-relay]').forEach(row => row.addEventListener('click', () => openFarmZone(row.dataset.homeRelay)));

  function relayMarkup(r, s, simple = false) {
    const val = s.relays[r.id], state = val === true ? 'เปิดอยู่' : val === false ? 'ปิดอยู่' : 'ยังไม่มีข้อมูล';
    const pending = relayPending.has(r.id), dataState = val === true ? 'on' : val === false ? 'off' : 'unknown';
    const pressed = val === null ? 'mixed' : String(val === true);
    const action = val === true ? 'ปิด' : 'เปิด';
    return `<article class="card relay-card" data-relay="${esc(r.id)}" tabindex="-1"><div class="relay-top"><span class="relay-icon">${esc(r.icon)}</span></div><div class="relay-control"><div><div class="relay-name">${esc(r.label)}</div><div class="relay-state ${val === true ? 'on' : val === false ? 'off' : ''}">${pending ? 'กำลังรอ ESP ยืนยัน…' : state}</div></div><button class="relay-switch" data-state="${dataState}" data-relay-toggle="${esc(r.id)}" aria-pressed="${pressed}" aria-label="${esc(r.label)} · ${esc(state)} · ${pending ? 'กำลังรอ ESP ยืนยัน' : `กดเพื่อ${action}`}" ${pending || s.connection !== 'online' || s.espOnline !== true || val === null ? 'disabled' : ''}>${pending ? 'รอ ESP' : val === true ? 'เปิด' : 'ปิด'}</button></div></article>`;
  }
  function renderScheduleEditor(s) {
    const id = $('scheduleRelay').value, relay = SmartFarmConfig.relays.find(item => item.id === id), slots = s.schedules?.[id]?.slots, pending = schedulePending.has(id);
    $('scheduleModeHint').textContent = s.mode === 'AUTO' ? 'โหมด AUTO · ตารางที่บันทึกจะถูกใช้โดย ESP ตามเวลาของอุปกรณ์' : s.mode === 'MANUAL' ? 'โหมด MANUAL · ตารางจะทำงานเมื่อเปลี่ยน ESP กลับเป็น AUTO' : 'รอสถานะ AUTO/MANUAL จาก ESP';
    const editor = $('scheduleEditor');
    if (!Array.isArray(slots)) { editor.innerHTML = `<div class="schedule-empty">${s.espOnline === true ? 'กำลังรอ schedule/status จาก ESP สำหรับ' : 'เชื่อมต่อ MQTT และรอ ESP online เพื่ออ่านตารางของ'} ${esc(relay?.label || id)}</div>`; $('scheduleFeedback').textContent = scheduleFeedback; return; }
    const locked = pending || s.connection !== 'online' || s.espOnline !== true;
    editor.innerHTML = `<form id="scheduleForm" data-schedule-id="${esc(id)}"><div class="schedule-slot-list">${slots.map((slot,index) => `<fieldset class="schedule-slot"><legend>ช่วงที่ ${index+1}</legend><label class="schedule-toggle"><input type="checkbox" data-slot-toggle="${index}" ${slot.enabled?'checked':''} ${locked?'disabled':''}><span>เปิดใช้งานช่วงนี้</span></label><div class="schedule-time-fields"><label>เริ่ม<input type="time" data-slot-time="${index}" data-field="on" value="${esc(slot.on)}" ${!slot.enabled||locked?'disabled':''} ${slot.enabled?'required':''}></label><label>สิ้นสุด<input type="time" data-slot-time="${index}" data-field="off" value="${esc(slot.off)}" ${!slot.enabled||locked?'disabled':''} ${slot.enabled?'required':''}></label></div></fieldset>`).join('')}</div><button class="button primary schedule-save" type="submit" ${locked?'disabled':''}>${pending?'กำลังรอ ESP ยืนยัน…':`บันทึกตาราง ${esc(relay?.label||id)}`}</button></form>`;
    $('scheduleFeedback').textContent = pending ? 'ส่งตารางแล้ว · กำลังรอ schedule/status จาก ESP' : scheduleFeedback;
  }
  $('scheduleRelay').addEventListener('change', () => { scheduleFeedback = ''; renderScheduleEditor(FarmState.get()); });
  $('scheduleEditor').addEventListener('change', event => {
    const checkbox = event.target.closest('[data-slot-toggle]'); if (!checkbox) return;
    const index = checkbox.dataset.slotToggle, enabled = checkbox.checked;
    document.querySelectorAll(`[data-slot-time="${index}"]`).forEach(input => { input.disabled = !enabled || schedulePending.has($('scheduleRelay').value); input.required = enabled; });
  });
  $('scheduleEditor').addEventListener('submit', async event => {
    if (event.target.id !== 'scheduleForm') return;
    event.preventDefault(); const id = event.target.dataset.scheduleId, state = FarmState.get();
    if (state.connection !== 'online' || state.espOnline !== true) { scheduleFeedback = 'ต้องเชื่อมต่อ MQTT และ ESP ก่อนบันทึก'; renderScheduleEditor(state); return; }
    if (!state.schedules[id]) { scheduleFeedback = 'ยังไม่ได้รับ schedule/status จาก ESP'; renderScheduleEditor(state); return; }
    const slots = Array.from({length: SmartFarmConfig.scheduleSlotCount}, (_,index) => { const enabled = event.target.querySelector(`[data-slot-toggle="${index}"]`).checked; return { enabled, on: event.target.querySelector(`[data-slot-time="${index}"][data-field="on"]`).value || '00:00', off: event.target.querySelector(`[data-slot-time="${index}"][data-field="off"]`).value || '00:00' }; });
    let normalized; try { normalized = FarmState.normalizeSchedule(id,{slots}); } catch(error) { scheduleFeedback = error.message; toast(error.message); renderScheduleEditor(state); return; }
    schedulePending.add(id); scheduleFeedback = 'กำลังส่งตารางไปยัง ESP…'; renderScheduleEditor(FarmState.get());
    try { const confirmed = await FarmMqtt.commandSchedule(id,normalized); if (!confirmed) throw Error('ESP ยังไม่ยืนยันตารางเวลานี้'); scheduleFeedback = 'ESP ยืนยันและรายงานตารางใหม่แล้ว'; addEvent('system','ESP ยืนยันตารางเวลา',SmartFarmConfig.relays.find(x=>x.id===id)?.label || id,'ok'); toast('บันทึกตารางเวลาเรียบร้อย'); }
    catch(error) { scheduleFeedback = `บันทึกไม่สำเร็จ: ${error.message}`; FarmState.addError('schedule-command',error.message); toast(error.message); }
    finally { schedulePending.delete(id); renderScheduleEditor(FarmState.get()); }
  });
  function bindRelayButtons() {
    document.querySelectorAll('[data-relay-toggle]').forEach(btn => btn.addEventListener('click', async () => {
      const id = btn.dataset.relayToggle, s = FarmState.get(); if (s.relays[id] === null) { toast('ยังไม่มีข้อมูลสถานะ Relay จาก ESP8266'); return; }
      const target = !s.relays[id]; relayPending.add(id); render(s);
      addEvent('relay','ส่งคำสั่ง Relay',`${SmartFarmConfig.relays.find(r=>r.id===id)?.label}: ${target?'ON':'OFF'}`,'pending');
      try { const ok = await FarmMqtt.commandRelay(id,target); if (ok) toast('ESP8266 ยืนยันสถานะแล้ว'); else toast('ไม่สามารถยืนยันสถานะได้'); }
      catch(e) { FarmState.addError('relay-command',e.message); toast(e.message); }
      finally { relayPending.delete(id); render(FarmState.get()); }
    }));
  }
  function detail(value, suffix = '') { return value === null || value === undefined || value === '' ? 'ยังไม่มีข้อมูล' : `${value}${suffix}`; }
  function renderFarmMap(s) {
    document.querySelectorAll('[data-farm-zone]').forEach(zone => {
      const relayId = zone.dataset.farmZone;
      const relay = SmartFarmConfig.relays.find(item => item.id === relayId);
      const value = s.relays?.[relayId];
      const state = value === true ? 'on' : value === false ? 'off' : 'unknown';
      const spoken = value === true ? 'เปิด' : value === false ? 'ปิด' : 'ยังไม่มีข้อมูล';
      zone.dataset.state = state;
      zone.setAttribute('aria-pressed', value === true ? 'true' : value === false ? 'false' : 'mixed');
      zone.setAttribute('aria-current', selectedFarmRelay === relayId ? 'true' : 'false');
      zone.setAttribute('aria-label', `${relay?.label || relayId} · ${spoken} · เลือกเพื่อเปิดศูนย์ควบคุม`);
      const title = zone.querySelector('title');
      if (title) title.textContent = `${relay?.label || relayId} · ${spoken}`;
      const status = zone.querySelector('[data-zone-status]');
      if (status) status.textContent = value === true ? 'เปิด' : value === false ? 'ปิด' : 'รอข้อมูล';
    });
  }
  function renderHomeEquipment(s) {
    document.querySelectorAll('[data-home-relay]').forEach(row => {
      const value = s.relays?.[row.dataset.homeRelay];
      row.dataset.state = value === true ? 'on' : value === false ? 'off' : 'unknown';
      const label = value === true ? 'เปิดอยู่' : value === false ? 'ปิดอยู่' : 'รอข้อมูล';
      const status = row.querySelector('[data-home-relay-status]');
      if (status) status.textContent = label;
      row.setAttribute('aria-label', `${row.querySelector('span:not(.home-row-chevron)')?.textContent || row.dataset.homeRelay} · ${label} · เลือกเพื่อเปิดหน้าควบคุม`);
    });
  }
  function render(s) {
    const conn = $('connection'); conn.dataset.state = s.connection; conn.querySelector('span').textContent = `MQTT · ${labels[s.connection] || s.connection}`;
    const connectionCopy = { offline: ['พร้อมเชื่อมต่อ', 'รอ credential สำหรับการเชื่อมต่อครั้งแรก', 'พร้อม'], connecting: ['กำลังเชื่อมต่อ MQTT', 'กำลังตรวจสอบ broker และสมัครรับข้อมูลจากฟาร์ม', 'กำลังเชื่อมต่อ'], online: ['เชื่อมต่อ MQTT แล้ว', 'กำลังรอ heartbeat และสถานะจริงจาก ESP8266', 'ออนไลน์'], reconnecting: ['กำลังเชื่อมต่อใหม่', s.connectionReason || 'ระบบจะลองเชื่อมต่อใหม่อัตโนมัติ', 'กำลังลองใหม่'], error: ['เชื่อมต่อไม่สำเร็จ', s.connectionReason || 'ตรวจสอบ credential และการเข้าถึง broker', 'ต้องตรวจสอบ'] }[s.connection] || ['สถานะ MQTT', s.connectionReason || 'ยังไม่มีข้อมูล', 'ตรวจสอบ'];
    if ($('mqttAutoStatus')) $('mqttAutoStatus').textContent = connectionCopy[0];
    if ($('mqttAutoDetail')) $('mqttAutoDetail').textContent = connectionCopy[1];
    if ($('connectionHeroState')) { $('connectionHeroState').textContent = connectionCopy[2]; $('connectionHeroState').dataset.state = s.connection; }
    const espStatus = s.espOnline === true ? 'ออนไลน์' : s.espOnline === false ? 'ออฟไลน์' : 'ยังไม่มีข้อมูล';
    $('mqttReason').textContent = s.connectionReason;
    $('waterMode').textContent = txt(s.mode); $('waterModeLabel').textContent = txt(s.mode); $('homeModeStatus').textContent = s.mode ? `โหมด ${s.mode}` : 'รอโหมดจาก ESP'; $('modeFeedback').textContent = modePending ? `กำลังรอ ESP ยืนยัน ${modePending}…` : '';
    const waterDot = document.querySelector('[data-status-for="waterDevice"]'); if (waterDot) waterDot.dataset.state = s.espOnline === true ? 'online' : s.espOnline === false ? 'offline' : 'unknown';
    document.querySelectorAll('[data-mode]').forEach(b => { b.disabled = s.connection !== 'online' || s.espOnline !== true || Boolean(modePending); b.classList.toggle('primary', s.mode === b.dataset.mode); });
    $('waterDevice').textContent = espStatus; $('systemEsp').textContent = espStatus;
    const temp = detail(s.temperature, ' °C'), humid = detail(s.humidity, ' %'); $('temperature').textContent = temp; $('humidity').textContent = humid; renderFarmMap(s); renderHomeEquipment(s);
    const heartbeatLabel = s.heartbeatAt ? new Date(s.heartbeatAt).toLocaleString('th-TH', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'รอข้อมูล';
    $('headerUpdated').textContent = heartbeatLabel; $('deviceControllerUpdated').textContent = heartbeatLabel;
    $('waterRelays').innerHTML = SmartFarmConfig.relays.map(r => relayMarkup(r,s)).join(''); bindRelayButtons();
    if (selectedFarmRelay) [...document.querySelectorAll('#waterRelays [data-relay]')].find(item => item.dataset.relay === selectedFarmRelay)?.classList.add('farm-relay-target');

    const d = s.device || {}, firmware = txt(d.firmware), uptime = Number.isFinite(d.uptimeSec) ? `${Math.floor(d.uptimeSec/3600)} ชม. ${Math.floor((d.uptimeSec%3600)/60)} นาที` : null;
    $('firmwareVersion').textContent = firmware; $('footerFirmware').textContent = firmware; $('deviceFirmware').textContent = firmware; $('connectionFirmware').textContent = firmware; $('deviceId').textContent = txt(d.device_id);
    $('homeEsp').textContent = s.espOnline === true ? 'ปกติ' : s.espOnline === false ? 'ออฟไลน์' : 'ยังไม่มีข้อมูล'; $('homeEsp').dataset.state = s.espOnline === true ? 'online' : s.espOnline === false ? 'offline' : 'unknown'; $('homeEspMeta').textContent = [d.firmware?`FW ${d.firmware}`:null,Number.isFinite(d.rssi)?`RSSI ${d.rssi} dBm`:null].filter(Boolean).join(' · ') || 'ESP8266 · รอข้อมูล';
    $('deviceEspStatus').textContent = espStatus; $('deviceEspStatus').classList.toggle('online',s.espOnline === true); $('deviceUptime').textContent = txt(uptime); $('deviceRssi').textContent = detail(Number.isFinite(d.rssi)?d.rssi:null,' dBm'); $('deviceHeap').textContent = detail(Number.isFinite(d.heap)?d.heap:null,' bytes'); $('deviceReset').textContent = txt(d.resetReason);
    $('deviceIp').textContent = txt(d.ip); $('connectionDeviceIp').textContent = `IP ${txt(d.ip)}`; $('connectionRssi').textContent = detail(Number.isFinite(d.rssi)?d.rssi:null,' dBm'); $('rtcState').textContent = typeof d.rtc === 'boolean' ? (d.rtc?'พร้อม':'ไม่พร้อม') : 'ยังไม่มีข้อมูล'; $('espClock').textContent = txt(d.time); $('espDate').textContent = txt(d.date); $('sensorStatus').textContent = s.temperature !== null || s.humidity !== null ? 'ได้รับข้อมูล' : 'รอ DHT11'; $('deviceTemp').textContent = temp; $('deviceHumidity').textContent = humid; $('sensorUpdated').textContent = sensorUpdatedAt ? new Date(sensorUpdatedAt).toLocaleString('th-TH') : 'ยังไม่มีข้อมูล';

    $('connectedSince').textContent = connectedSince ? new Date(connectedSince).toLocaleString('th-TH') : 'ยังไม่มีข้อมูล'; $('reconnectCount').textContent = String(reconnectCount); $('connectionHeartbeat').textContent = s.heartbeatAt ? new Date(s.heartbeatAt).toLocaleString('th-TH') : 'ยังไม่มีข้อมูล'; $('heartbeatAge').textContent = s.heartbeatAt ? `${Math.max(0,Math.floor((Date.now()-s.heartbeatAt)/1000))} วินาที` : 'ยังไม่มีข้อมูล';
    $('lastError').textContent = s.errors?.length ? `${s.errors[0].kind}: ${s.errors[0].message}` : 'ยังไม่มีข้อมูล';
    if ($('scheduleRelay')) renderScheduleEditor(s);
  }
  document.querySelectorAll('[data-mode]').forEach(button => button.addEventListener('click', async () => { modePending = button.dataset.mode; render(FarmState.get()); try { const ok = await FarmMqtt.commandMode(modePending); if (ok) { addEvent('relay','ESP ยืนยันโหมด',button.dataset.mode,'ok'); toast(`ESP ยืนยันโหมด ${button.dataset.mode}`); } else toast('ไม่สามารถยืนยันโหมดจาก ESP ได้'); } catch(error) { FarmState.addError('mode-command',error.message); toast(error.message); } finally { modePending = null; render(FarmState.get()); } }));
  document.querySelectorAll('[data-filter]').forEach(button => button.addEventListener('click', () => { activeFilter = button.dataset.filter; document.querySelectorAll('[data-filter]').forEach(b=>b.classList.toggle('active',b===button)); renderEvents(); }));
  FarmState.subscribe((snapshot,event) => {
    const previous = lastConnection;
    if (event === 'initial') lastConnection = snapshot.connection;
    else if (event.startsWith('connection:')) {
      const status = snapshot.connection;
      if (status === 'online' && previous !== 'online') { connectedSince = Date.now(); addEvent('mqtt','MQTT Connected','เชื่อมต่อ broker แล้ว','ok'); }
      if (status === 'reconnecting' && previous !== 'reconnecting') { reconnectCount++; addEvent('mqtt','MQTT Reconnecting',snapshot.connectionReason,'pending'); }
      if ((status === 'offline' || status === 'error') && previous !== status) addEvent('mqtt',status==='error'?'MQTT Error':'MQTT Disconnected',snapshot.connectionReason,status==='error'?'error':'info');
      lastConnection = status;
    } else if (event === 'device:update' && snapshot.heartbeatAt > lastHeartbeatSeen) { lastHeartbeatSeen=snapshot.heartbeatAt; addEvent('esp','ESP Heartbeat',`${snapshot.device?.firmware||'Firmware ไม่รายงาน'}${Number.isFinite(snapshot.device?.rssi)?` · RSSI ${snapshot.device.rssi} dBm`:''}`,'ok',snapshot.heartbeatAt); }
    else if (event === 'esp:offline') addEvent('esp','ESP Offline',snapshot.connectionReason,'error');
    else if (event === 'sensor:update') { sensorUpdatedAt=Date.now(); if(snapshot.temperature!==null)addEvent('temperature','DHT11 Temperature',`${snapshot.temperature} °C`,'ok'); if(snapshot.humidity!==null)addEvent('humidity','DHT11 Humidity',`${snapshot.humidity} %`,'ok'); }
    else if (event.startsWith('relay:')) { const id=event.slice(6),relay=SmartFarmConfig.relays.find(r=>r.id===id); addEvent('relay','Relay Status',`${relay?.label||id}: ${snapshot.relays[id]?'ON':'OFF'}`,'ok'); }
    else if (event === 'error') { const err=snapshot.errors[0]; if(err)addEvent('error',`Error · ${err.kind}`,err.message,'error',err.at); }
    render(snapshot);
  });
  $('connectBtn').addEventListener('click', () => { const ok=FarmMqtt.connect($('mqttUser').value,$('mqttPass').value,$('rememberMqtt').checked); $('mqttFeedback').textContent=ok?'กำลังเริ่มเชื่อมต่อ broker…':'ตรวจสอบข้อมูลและการเชื่อมต่อ'; if(ok)$('mqttPass').value=''; });
  $('disconnectBtn').addEventListener('click', () => FarmMqtt.disconnect());
  $('clearCredentials').addEventListener('click', () => { try { for(const store of [localStorage,sessionStorage]) for(const key of ['sf.mqtt.user','sf.mqtt.pass'])store.removeItem(key); $('mqttUser').value=SmartFarmConfig.mqtt.defaultUsername; $('mqttPass').value=''; $('rememberMqtt').checked=false; $('mqttFeedback').textContent='ล้าง credentials ที่บันทึกในเบราว์เซอร์แล้ว'; toast('ล้าง credentials แล้ว'); } catch(error) { $('mqttFeedback').textContent=`ล้างข้อมูลไม่สำเร็จ: ${error.message}`; } });
  const credentials=FarmMqtt.credentials(); $('mqttUser').value=credentials.user; $('rememberMqtt').checked=credentials.remember;
  if (credentials.pass) {
    $('mqttFeedback').textContent='พบ credential ที่บันทึกไว้ · กำลังเชื่อมต่ออัตโนมัติ…';
    window.setTimeout(() => FarmMqtt.autoConnect(), 180);
  } else {
    $('mqttFeedback').textContent='กรอก password ครั้งแรก แล้วครั้งต่อไปจะเชื่อมต่อให้อัตโนมัติ';
  }

  function loadFinance() { try { const x=JSON.parse(localStorage.getItem('sf.finance')||'[]'); return Array.isArray(x)?x:[]; } catch(e) { FarmState.addError('finance-storage',e.message); return []; } }
  function paintFinance() {
    const rows=loadFinance().sort((a,b)=>b.date.localeCompare(a.date)), income=rows.filter(x=>x.type==='income').reduce((a,x)=>a+x.amount,0), expense=rows.filter(x=>x.type==='expense').reduce((a,x)=>a+x.amount,0), receivables=rows.filter(x=>x.type==='income').reduce((a,x)=>a+Math.max(0,x.amount-(x.paid||0)),0);
    $('incomeTotal').textContent=money(income); $('expenseTotal').textContent=money(expense); $('netTotal').textContent=money(income-expense); $('receivablesTotal').textContent=money(receivables);
    const now=new Date(), monthKey=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`, monthRows=rows.filter(x=>String(x.date||'').startsWith(monthKey));
    const monthIncome=monthRows.filter(x=>x.type==='income').reduce((a,x)=>a+x.amount,0), monthExpense=monthRows.filter(x=>x.type==='expense').reduce((a,x)=>a+x.amount,0);
    $('monthIncome').textContent=money(monthIncome); $('monthExpense').textContent=money(monthExpense); $('monthNet').textContent=money(monthIncome-monthExpense);
    $('financeList').innerHTML=rows.length?rows.slice(0,100).map(x=>`<article class="finance-item"><div><b>${esc(x.description)}</b><small>${esc(x.date)} · ${x.type==='income'?'รายรับ':'รายจ่าย'}${x.product?' · '+esc(x.product):''}${x.buyer?' · '+esc(x.buyer):''}${x.type==='income'?` · รับแล้ว ${money(x.paid||0)} · ค้างรับ ${money(Math.max(0,x.amount-(x.paid||0)))}`:''}</small></div><strong class="${esc(x.type)}">${x.type==='income'?'+':'−'}${money(x.amount)}</strong></article>`).join(''):'<div class="empty-state">ยังไม่มีข้อมูลในสมุดบันทึกนี้</div>';
  }
  $('financeForm').elements.date.value=new Date().toISOString().slice(0,10);
  $('financeForm').addEventListener('submit',e=>{e.preventDefault();const f=new FormData(e.currentTarget),amount=Number(f.get('amount'));if(!(amount>0&&Number.isFinite(amount))){toast('กรุณาระบุจำนวนเงินที่ถูกต้อง');return;}const rows=loadFinance(),type=f.get('type'),paid=type==='income'?Number(f.get('paid')||0):0;if(!Number.isFinite(paid)||paid<0||paid>amount){toast('ยอดรับเงินต้องอยู่ระหว่าง 0 ถึงมูลค่ารายการ');return;}rows.push({id:crypto.randomUUID(),type,description:String(f.get('description')).trim(),amount,paid,date:f.get('date')||new Date().toISOString().slice(0,10),product:String(f.get('product')||'').trim(),quantity:Number(f.get('quantity'))||null,unit:String(f.get('unit')||'').trim(),buyer:String(f.get('buyer')||'').trim(),balanceDue:type==='income'?amount-paid:0});localStorage.setItem('sf.finance',JSON.stringify(rows));paintFinance();e.currentTarget.reset();e.currentTarget.elements.date.value=new Date().toISOString().slice(0,10);toast('บันทึกรายการแล้ว');});
  function exportFinanceCsv() { const rows=loadFinance(); if(!rows.length){toast('ยังไม่มีรายการให้ส่งออก');return;} const csv=['วันที่,ประเภท,รายละเอียด,จำนวนเงิน,รับเงินแล้ว,ยอดค้างรับ,ผลผลิต,ปริมาณ,หน่วย,ผู้รับซื้อ',...rows.map(x=>`${x.date},${x.type==='income'?'รายรับ':'รายจ่าย'},"${String(x.description).replaceAll('"','""')}",${x.amount},${x.paid||0},${Math.max(0,x.amount-(x.paid||0))},"${String(x.product||'').replaceAll('"','""')}",${x.quantity||''},${x.unit||''},"${String(x.buyer||'').replaceAll('"','""')}"`)].join('\n'); const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})); a.download='lungna-finance.csv'; a.click(); URL.revokeObjectURL(a.href); }
  document.querySelectorAll('#exportFinance,[data-export-finance]').forEach(button=>button.addEventListener('click',exportFinanceCsv));
  $('clearLocal').addEventListener('click',()=>{if(confirm('ลบข้อมูลการเงินทั้งหมดที่เก็บในเบราว์เซอร์นี้หรือไม่?')){localStorage.removeItem('sf.finance');paintFinance();toast('ล้างข้อมูลการเงินแล้ว');}}); paintFinance();

  const weatherCodes={0:'ท้องฟ้าแจ่มใส',1:'ส่วนใหญ่แจ่มใส',2:'มีเมฆบางส่วน',3:'มีเมฆมาก',45:'หมอก',48:'หมอก',51:'ฝนปรอยเล็กน้อย',53:'ฝนปรอย',55:'ฝนปรอยหนัก',61:'ฝนเล็กน้อย',63:'ฝนปานกลาง',65:'ฝนหนัก',80:'ฝนซู่',81:'ฝนซู่ปานกลาง',82:'ฝนซู่หนัก',95:'พายุฝนฟ้าคะนอง',96:'ฝนฟ้าคะนองและลูกเห็บ',99:'พายุฝนฟ้าคะนองรุนแรง'};
  const weatherIcons={0:'☀',1:'☀',2:'⛅',3:'☁',45:'≋',48:'≋',51:'☂',53:'☂',55:'☂',61:'☂',63:'☂',65:'☂',80:'☂',81:'☂',82:'☂',95:'ϟ',96:'ϟ',99:'ϟ'};
  const weatherMetrics={
    cloud_cover:{label:'ปริมาณเมฆ',unit:'%',field:'cloud_cover'},
    precipitation_probability:{label:'โอกาสฝน',unit:'%',field:'precipitation_probability'},
    wind_speed_10m:{label:'ความเร็วลม',unit:' km/h',field:'wind_speed_10m'}
  };
  let hourlyWeatherRows=[];
  let selectedWeatherMetric='precipitation_probability';
  function paintHourlyWeather(){
    const host=$('hourlyForecast'),metric=weatherMetrics[selectedWeatherMetric];
    if(!hourlyWeatherRows.length){host.innerHTML='<p class="weather-hourly-empty">ข้อมูลรายชั่วโมงยังไม่พร้อมใช้งาน</p>';return;}
    host.innerHTML=hourlyWeatherRows.map((hour,index)=>{
      const code=Number(hour.weather_code),kind=code>=95?'storm':([51,53,55,61,63,65,80,81,82].includes(code)?'rain':([0,1].includes(code)?'clear':'cloud'));
      const raw=hour[metric.field],value=Number.isFinite(raw)?`${Math.round(raw)}${metric.unit}`:'—';
      const time=String(hour.time||'').slice(11,13),temperature=Number.isFinite(hour.temperature_2m)?`${Math.round(hour.temperature_2m)}°`:'—';
      return `<div class="weather-hour-item" data-weather-kind="${kind}"><span class="weather-hour-time">${index===0?'ตอนนี้':time}</span><span class="weather-hour-icon" aria-hidden="true">${weatherIcons[code]||'☁'}</span><b class="weather-hour-value">${value}</b><strong class="weather-hour-temp">${temperature}</strong></div>`;
    }).join('');
  }
  document.querySelectorAll('[data-weather-metric]').forEach(button=>button.addEventListener('click',()=>{
    selectedWeatherMetric=button.dataset.weatherMetric;
    document.querySelectorAll('[data-weather-metric]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    paintHourlyWeather();
  }));
  function updateRainNotice(rows){
    const alert=$('weatherAlert'),title=$('weatherAlertTitle'),text=$('weatherAlertText'),next=rows.slice(0,6);
    const chances=next.map(row=>row.precipitation_probability).filter(Number.isFinite),rain=next.map(row=>row.precipitation).filter(Number.isFinite),total=rain.reduce((sum,value)=>sum+value,0);
    if(!chances.length){alert.dataset.level='unknown';title.textContent='ยังไม่มีข้อมูลโอกาสฝน';text.textContent='ไม่สามารถประเมินแนวโน้มฝนรายชั่วโมงได้ในขณะนี้';return;}
    const peak=Math.max(...chances);
    $('weatherRain').textContent=`${peak}%`;
    const rainSummary=total>0?` · คาดฝนสะสมประมาณ ${total.toFixed(1)} มม.`:'';
    if(peak>=70||total>=10){alert.dataset.level='warning';title.textContent='เฝ้าระวังฝนในพื้นที่';text.textContent=`โอกาสฝนสูงสุด ${peak}% ใน 6 ชั่วโมงข้างหน้า${rainSummary}`;}
    else if(peak>=40||total>=1){alert.dataset.level='watch';title.textContent='มีแนวโน้มฝนในพื้นที่';text.textContent=`โอกาสฝนสูงสุด ${peak}% ใน 6 ชั่วโมงข้างหน้า${rainSummary}`;}
    else {alert.dataset.level='clear';title.textContent='ยังไม่พบสัญญาณฝนสูง';text.textContent='พยากรณ์ 6 ชั่วโมงข้างหน้าไม่พบโอกาสฝนสูงในพื้นที่อ้างอิง';}
  }
  async function loadWeather() {
    const btn=$('weatherRefresh');btn.disabled=true;$('weatherError').textContent='';
    try {
      const {latitude,longitude,timezone}=SmartFarmConfig.weather;
      const url=`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,precipitation,weather_code,wind_speed_10m&hourly=temperature_2m,precipitation_probability,precipitation,cloud_cover,wind_speed_10m,weather_code&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=${encodeURIComponent(timezone)}&forecast_days=3`;
      const res=await fetch(url,{signal:AbortSignal.timeout(12000)});if(!res.ok)throw Error(`Weather API HTTP ${res.status}`);const d=await res.json();if(typeof d.current?.temperature_2m!=='number')throw Error('ข้อมูลพยากรณ์ไม่สมบูรณ์');
      const currentCode=Number(d.current.weather_code),currentLabel=weatherCodes[currentCode]||'สภาพอากาศ';
      $('forecastTemp').textContent=`${Math.round(d.current.temperature_2m)}°C`; $('forecastSummary').textContent=currentLabel; $('weatherCurrentIcon').textContent=weatherIcons[currentCode]||'☼'; $('weatherHumidity').textContent=Number.isFinite(d.current.relative_humidity_2m)?`${d.current.relative_humidity_2m}%`:'ไม่มีข้อมูล'; $('weatherWind').textContent=Number.isFinite(d.current.wind_speed_10m)?`${Math.round(d.current.wind_speed_10m)} km/h`:'ไม่มีข้อมูล';
      $('forecastUpdated').textContent=`Open-Meteo · ${new Date(d.current.time).toLocaleString('th-TH')}`;
      const times=d.hourly?.time||[],currentHour=String(d.current.time||'').slice(0,13);let start=times.findIndex(time=>String(time).slice(0,13)>=currentHour);if(start<0)start=0;
      hourlyWeatherRows=times.slice(start,start+24).map((time,index)=>({time,temperature_2m:d.hourly.temperature_2m?.[start+index],precipitation_probability:d.hourly.precipitation_probability?.[start+index],precipitation:d.hourly.precipitation?.[start+index],cloud_cover:d.hourly.cloud_cover?.[start+index],wind_speed_10m:d.hourly.wind_speed_10m?.[start+index],weather_code:d.hourly.weather_code?.[start+index]}));
      paintHourlyWeather();updateRainNotice(hourlyWeatherRows);
      const days=d.daily?.time||[];$('forecastDays').innerHTML=days.length?days.map((date,i)=>`<div class="forecast-day"><span class="forecast-date">${new Date(date+'T12:00:00').toLocaleDateString('th-TH',{weekday:'short',day:'numeric',month:'short'})}</span><span class="forecast-icon" aria-hidden="true">${weatherIcons[d.daily.weather_code[i]]||'☼'}</span><b>${Math.round(d.daily.temperature_2m_max[i])}° / ${Math.round(d.daily.temperature_2m_min[i])}°</b><span>${weatherCodes[d.daily.weather_code[i]]||'สภาพอากาศ'}</span><small>โอกาสฝน ${d.daily.precipitation_probability_max[i]??'—'}%</small></div>`).join(''):'<span class="muted">ไม่มีพยากรณ์รายวัน</span>';
    } catch(e) { $('weatherError').textContent=`โหลดพยากรณ์ไม่สำเร็จ: ${e.message}`; $('forecastSummary').textContent='Weather API ไม่พร้อมใช้งาน'; $('weatherAlert').dataset.level='unknown';$('weatherAlertTitle').textContent='ไม่สามารถโหลดพยากรณ์ได้';$('weatherAlertText').textContent='โปรดลองโหลดข้อมูลอีกครั้งเมื่อเชื่อมต่ออินเทอร์เน็ต';$('hourlyForecast').innerHTML='<p class="weather-hourly-empty">ข้อมูลรายชั่วโมงยังไม่พร้อมใช้งาน</p>';FarmState.addError('weather',e.message); }
    finally { btn.disabled=false; }
  }
  $('weatherRefresh').addEventListener('click',loadWeather); loadWeather();
  $('systemCheck').addEventListener('click',async()=>{const result=$('systemCheckResult');result.textContent='กำลังตรวจไฟล์และความพร้อมของระบบ…';try{const paths=['./index.html','./css/app.css','./css/reference-layout.css','./assets/illustrations/farm-aerial.webp','./assets/illustrations/farm-landscape.webp','./manifest.json','./sw.js','./js/config.js','./js/state.js','./js/mqtt.js','./js/app.js'];const checks=await Promise.all(paths.map(async p=>{const r=await fetch(p,{cache:'no-store'});return r.ok;}));const manifest=await fetch('./manifest.json',{cache:'no-store'});await manifest.json();result.textContent=checks.every(Boolean)?'ตรวจไฟล์ Dashboard, ภาพประกอบ และ manifest ผ่าน · MQTT/ESP ยังต้องตรวจจากการเชื่อมต่อจริง':'พบไฟล์ที่โหลดไม่สำเร็จ';}catch(e){result.textContent=`ตรวจระบบไม่สำเร็จ: ${e.message}`;}});
  $('reloadDashboard').addEventListener('click',async()=>{if(navigator.serviceWorker?.controller){const regs=await navigator.serviceWorker.getRegistrations();await Promise.all(regs.map(r=>r.update()));}location.reload();});
  if('serviceWorker' in navigator) window.addEventListener('load',()=>navigator.serviceWorker.register('./sw.js').catch(e=>FarmState.addError('service-worker',e.message)));
  window.addEventListener('farm:esp-timeout',()=>toast('ไม่ได้รับ heartbeat จาก ESP · แสดงออฟไลน์')); window.addEventListener('farm:presence-offline',()=>toast('ESP รายงานออฟไลน์'));
})();
