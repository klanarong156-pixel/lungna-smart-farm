(() => {
  'use strict';
  const config = window.SmartFarmAIConfig || {};
  const button = document.getElementById('aiAnalyzeButton');
  const statusNode = document.getElementById('aiSetupStatus');
  const turnstileHost = document.getElementById('aiTurnstile');
  const resultPanel = document.getElementById('aiResult');
  if (!button || !statusNode || !turnstileHost || !resultPanel) return;

  const action = config.turnstileAction === 'smartfarm_ai' ? config.turnstileAction : 'smartfarm_ai';
  const validEndpoint = (() => {
    try { const url = new URL(config.endpoint); return url.protocol === 'https:'; } catch (_) { return false; }
  })();
  const validSiteKey = typeof config.turnstileSiteKey === 'string' && config.turnstileSiteKey.trim().length > 0;
  let widgetId = null;
  let turnstileToken = '';
  let analyzing = false;
  function setStatus(message, isError = false) {
    statusNode.textContent = message;
    statusNode.dataset.state = isError ? 'error' : 'info';
  }

  function mapError(code) {
    return ({
      verification_required: 'กรุณายืนยันการตรวจสอบก่อนวิเคราะห์',
      verification_failed: 'การตรวจสอบไม่ผ่าน กรุณาลองยืนยันใหม่',
      verification_unavailable: 'บริการตรวจสอบชั่วคราวไม่พร้อมใช้งาน',
      rate_limited: 'เรียกวิเคราะห์ถี่เกินไป กรุณารอสักครู่',
      ai_backend_not_configured: 'AI backend ยังตั้งค่าไม่ครบ',
      ai_provider_unavailable: 'บริการ AI ไม่พร้อมใช้งานในขณะนี้',
      invalid_snapshot: 'ข้อมูลสถานะไม่ครบหรือรูปแบบไม่ถูกต้อง',
      invalid_ai_response: 'AI ส่งคำตอบที่ระบบตรวจสอบรูปแบบไม่ได้',
      rate_limit_unavailable: 'ระบบจำกัดการเรียก AI ไม่พร้อม จึงปิดคำขอไว้ก่อน'
    })[code] || 'ไม่สามารถวิเคราะห์ได้ กรุณาตรวจการเชื่อมต่อแล้วลองใหม่';
  }

  function buildSnapshot() {
    const state = window.FarmState.get();
    const threshold = window.SensorAlertConfig?.load?.() || {};
    return {
      asOf: new Date().toISOString(),
      timezone: window.SmartFarmConfig?.weather?.timezone || 'Asia/Bangkok',
      mqttStatus: state.connection,
      espOnline: state.espOnline,
      espHeartbeatAt: Number.isFinite(state.heartbeatAt) && state.heartbeatAt > 0
        ? new Date(state.heartbeatAt).toISOString()
        : null,
      firmware: typeof state.device?.firmware === 'string' ? state.device.firmware : null,
      sensor: {
        temperatureC: Number.isFinite(state.temperature) ? state.temperature : null,
        relativeHumidityPercent: Number.isFinite(state.humidity) ? state.humidity : null,
        observedAt: Number.isFinite(state.sensorObservedAt) && state.sensorObservedAt > 0
          ? new Date(state.sensorObservedAt).toISOString()
          : null
      },
      thresholds: {
        temperatureC: Number.isFinite(threshold.temperature) ? threshold.temperature : null,
        relativeHumidityPercent: Number.isFinite(threshold.humidity) ? threshold.humidity : null
      },
      relays: state.relays,
      relayObservedAt: Object.fromEntries(Object.entries(state.relayObservedAt || {}).map(([id, at]) => [id, Number.isFinite(at) && at > 0 ? new Date(at).toISOString() : null])),
      mode: state.mode,
      modeObservedAt: Number.isFinite(state.modeObservedAt) && state.modeObservedAt > 0 ? new Date(state.modeObservedAt).toISOString() : null,
      emergencyStop: typeof state.emergency?.active === 'boolean' ? state.emergency.active : null,
      emergencyObservedAt: Number.isFinite(state.emergencyObservedAt) && state.emergencyObservedAt > 0 ? new Date(state.emergencyObservedAt).toISOString() : null
    };
  }

  function appendRows(id, rows, format) {
    const root = document.getElementById(id);
    if (!root) return;
    root.replaceChildren();
    if (!rows.length) {
      const item = document.createElement('li');
      item.textContent = 'ไม่พบรายการจากข้อมูลชุดนี้';
      root.append(item);
      return;
    }
    for (const row of rows) {
      const item = document.createElement('li');
      item.textContent = format(row);
      root.append(item);
    }
  }

  function renderResult(result) {
    if (!result || typeof result !== 'object' || typeof result.summary !== 'string') throw new Error('invalid_ai_response');
    const statusLabels = { analyzed: 'วิเคราะห์จากข้อมูลที่มี', limited_data: 'ข้อมูลมีข้อจำกัด', insufficient_data: 'ข้อมูลไม่พอสรุป' };
    document.getElementById('aiResultStatus').textContent = statusLabels[result.status] || statusLabels.limited_data;
    document.getElementById('aiResultSummary').textContent = result.summary;
    const system = result.system_state || {};
    const mqttLabels = { online: 'ออนไลน์', offline: 'ออฟไลน์', connecting: 'กำลังเชื่อมต่อ', reconnecting: 'กำลังเชื่อมต่อใหม่', error: 'ผิดพลาด', unknown: 'ไม่ทราบ' };
    const espLabels = { online: 'ออนไลน์', offline: 'ออฟไลน์', stale: 'ข้อมูลเก่า', unknown: 'ไม่ทราบ' };
    const emergencyLabels = { active: 'ทำงานอยู่', inactive: 'ไม่ทำงาน', unknown: 'ไม่ทราบ' };
    const freshnessLabels = { fresh: 'ข้อมูลล่าสุด', stale: 'ข้อมูลเก่า', unknown: 'ไม่ทราบความสดของข้อมูล' };
    const riskLabels = { critical: 'เร่งด่วน', high: 'สูง', medium: 'ปานกลาง', low: 'ต่ำ', info: 'ทั่วไป' };
    document.getElementById('aiResultSystem').textContent = `MQTT: ${mqttLabels[system.mqtt] || 'ไม่ทราบ'} · ESP: ${espLabels[system.esp] || 'ไม่ทราบ'} · Emergency Stop: ${emergencyLabels[system.emergency_stop] || 'ไม่ทราบ'}`;
    appendRows('aiObservations', Array.isArray(result.observations) ? result.observations : [], row => `${row.item || 'ข้อมูล'}: ${row.value || 'ยังไม่มีข้อมูล'} · ${row.source || 'ไม่ระบุแหล่ง'} · ${freshnessLabels[row.freshness] || freshnessLabels.unknown}${row.evidence ? ` — ${row.evidence}` : ''}`);
    appendRows('aiRisks', Array.isArray(result.risks) ? result.risks : [], row => `[${riskLabels[row.level] || riskLabels.info}] ${row.finding || 'ข้อสังเกต'} — ${row.evidence || ''}${row.uncertainty ? ` (ข้อจำกัด: ${row.uncertainty})` : ''}`);
    appendRows('aiRecommendations', Array.isArray(result.recommendations) ? result.recommendations : [], row => `${row.message || 'ให้ผู้ใช้ตรวจสอบข้อมูล'} — เหตุผล: ${row.basis || 'ไม่ระบุ'}`);
    appendRows('aiMissing', Array.isArray(result.missing_or_conflicting_data) ? result.missing_or_conflicting_data : [], item => String(item));
    appendRows('aiUnsupported', Array.isArray(result.not_supported_conclusions) ? result.not_supported_conclusions : [], item => String(item));
    document.getElementById('aiResultTime').textContent = result.as_of ? `วิเคราะห์จาก snapshot ${new Date(result.as_of).toLocaleString('th-TH')}` : 'เวลาของ snapshot ไม่พร้อม';
    resultPanel.hidden = false;
  }

  function loadTurnstile() {
    if (window.turnstile) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const existing = document.querySelector('script[data-ai-turnstile]');
      if (existing) {
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', () => reject(new Error('turnstile_load_failed')), { once: true });
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.defer = true;
      script.dataset.aiTurnstile = 'true';
      script.onload = resolve;
      script.onerror = () => reject(new Error('turnstile_load_failed'));
      document.head.append(script);
    });
  }

  async function initialize() {
    if (!validEndpoint || !validSiteKey) {
      button.disabled = true;
      setStatus('ยังไม่เชื่อมต่อ: ต้องตั้งค่า HTTPS Worker endpoint และ Turnstile site key ก่อน');
      return;
    }
    button.disabled = true;
    setStatus('กำลังโหลดการยืนยันความปลอดภัย…');
    try {
      await loadTurnstile();
      widgetId = window.turnstile.render(turnstileHost, {
        sitekey: config.turnstileSiteKey,
        action,
        callback: token => { turnstileToken = token; button.disabled = analyzing; setStatus('ยืนยันแล้ว · กดวิเคราะห์เมื่อพร้อม'); },
        'expired-callback': () => { turnstileToken = ''; button.disabled = true; setStatus('การยืนยันหมดอายุ · กรุณายืนยันใหม่'); },
        'error-callback': () => { turnstileToken = ''; button.disabled = true; setStatus('โหลดการยืนยันไม่สำเร็จ', true); }
      });
      setStatus('ยืนยัน Turnstile ก่อนส่ง snapshot ไปวิเคราะห์');
    } catch (_) {
      setStatus('โหลด Cloudflare Turnstile ไม่สำเร็จ · ยังไม่ส่งข้อมูลใด ๆ', true);
    }
  }

  button.addEventListener('click', async () => {
    if (analyzing) return;
    if (!turnstileToken) { setStatus('กรุณายืนยันการตรวจสอบก่อนวิเคราะห์', true); return; }
    analyzing = true;
    button.disabled = true;
    resultPanel.hidden = true;
    setStatus('กำลังส่ง snapshot ที่ระบุไว้ให้ AI วิเคราะห์…');
    const token = turnstileToken;
    turnstileToken = '';
    try {
      const response = await fetch(config.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot: buildSnapshot(), turnstileToken: token }),
        credentials: 'omit',
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
        signal: AbortSignal.timeout(30_000)
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(mapError(payload?.error));
      renderResult(payload.result);
      setStatus('วิเคราะห์เสร็จ · ใช้เป็นข้อมูลประกอบการตรวจสอบเท่านั้น');
    } catch (error) {
      setStatus(error.message === 'invalid_ai_response' ? mapError(error.message) : error.name === 'TimeoutError' ? 'หมดเวลารอ AI · ไม่มีการส่งคำสั่งอุปกรณ์' : error.message || 'เรียก AI ไม่สำเร็จ', true);
    } finally {
      analyzing = false;
      try { if (widgetId !== null && window.turnstile) window.turnstile.reset(widgetId); } catch (_) { /* Widget reset is best-effort. */ }
      button.disabled = true;
    }
  });

  initialize();
})();
