const assert = require('node:assert/strict');
const { test } = require('node:test');

const workerPromise = import('../ai-worker/src/index.mjs');
const origin = 'https://klanarong156-pixel.github.io';
const now = Date.now();
const iso = offset => new Date(now + offset).toISOString();
const snapshot = () => ({
  asOf: iso(0),
  timezone: 'Asia/Bangkok',
  mqttStatus: 'online',
  espOnline: true,
  espHeartbeatAt: iso(-3000),
  firmware: 'V7.2.0-OTA-STABLE',
  sensor: { temperatureC: 28.5, relativeHumidityPercent: 72, observedAt: iso(-5000) },
  thresholds: { temperatureC: 35, relativeHumidityPercent: 80 },
  relays: { pump: false, zone1: true, lighthome: null, lightsala: false },
  relayObservedAt: { pump: iso(-3000), zone1: iso(-3000), lighthome: null, lightsala: iso(-3000) },
  mode: 'AUTO',
  modeObservedAt: iso(-3000),
  emergencyStop: false,
  emergencyObservedAt: iso(-3000),
  mqttPassword: 'must-not-pass',
  ip: '192.0.2.10',
  financeLedger: [{ buyer: 'private buyer' }]
});
const env = overrides => ({
  ALLOWED_ORIGIN: origin,
  TURNSTILE_HOSTNAME: 'klanarong156-pixel.github.io',
  TURNSTILE_SECRET: 'turnstile-secret-for-test',
  AI_API_KEY: 'provider-secret-for-test',
  AI_MODEL: 'configured-model',
  AI_RATE_LIMITER: { limit: async () => ({ success: true }) },
  ...overrides
});
const request = (body, overrides = {}) => new Request('https://ai.example/analyze', {
  method: 'POST',
  headers: { Origin: origin, 'Content-Type': 'application/json', 'CF-Connecting-IP': '203.0.113.7', ...overrides.headers },
  body: JSON.stringify(body)
});
const turnstileOk = () => Response.json({ success: true, hostname: 'klanarong156-pixel.github.io', action: 'smartfarm_ai' });
const completion = result => Response.json({ choices: [{ message: { content: JSON.stringify(result) } }] });

async function loadWorker() { return workerPromise; }

test('preflight allows only configured origin and returns an empty 204 response', async () => {
  const { handleAiRequest } = await loadWorker();
  const response = await handleAiRequest(new Request('https://ai.example/analyze', { method: 'OPTIONS', headers: { Origin: origin } }), env());
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  assert.equal(await response.text(), '');
  const blocked = await handleAiRequest(new Request('https://ai.example/analyze', { method: 'OPTIONS', headers: { Origin: 'https://evil.example' } }), env());
  assert.equal(blocked.status, 403);
  assert.equal(blocked.headers.get('Access-Control-Allow-Origin'), null);
});

test('exposes only the /analyze route', async () => {
  const { handleAiRequest } = await loadWorker();
  const response = await handleAiRequest(new Request('https://ai.example/other', { method: 'POST', headers: { Origin: origin } }), env());
  assert.equal(response.status, 404);
  assert.equal((await response.json()).error, 'not_found');
});

test('refuses to run when server secrets or rate limiter are not configured', async () => {
  const { handleAiRequest } = await loadWorker();
  let calls = 0;
  const response = await handleAiRequest(request({ snapshot: snapshot(), turnstileToken: 'token' }), env({ AI_API_KEY: '' }), async () => { calls++; return turnstileOk(); });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'ai_backend_not_configured');
  assert.equal(calls, 0);
});

test('rejects invalid snapshot before Turnstile/provider calls', async () => {
  const { handleAiRequest } = await loadWorker();
  let calls = 0;
  const response = await handleAiRequest(request({ snapshot: { asOf: 'not-a-time' }, turnstileToken: 'token' }), env(), async () => { calls++; return turnstileOk(); });
  assert.equal(response.status, 400);
  assert.equal((await response.json()).error, 'invalid_snapshot');
  assert.equal(calls, 0);
});

test('rate limiting fails closed and does not call Turnstile or AI provider', async () => {
  const { handleAiRequest } = await loadWorker();
  let calls = 0, rateKey = '';
  const response = await handleAiRequest(request({ snapshot: snapshot(), turnstileToken: 'token' }), env({ AI_RATE_LIMITER: { limit: async ({ key }) => { rateKey = key; return { success: false }; } } }), async () => { calls++; return turnstileOk(); });
  assert.equal(response.status, 429);
  assert.equal((await response.json()).error, 'rate_limited');
  assert.match(rateKey, /^[a-f0-9]{64}$/);
  assert.equal(calls, 0);
});

test('requires server-verified Turnstile hostname and action before calling AI', async () => {
  const { handleAiRequest } = await loadWorker();
  let calls = 0;
  const response = await handleAiRequest(request({ snapshot: snapshot(), turnstileToken: 'token' }), env(), async () => {
    calls++;
    return Response.json({ success: true, hostname: 'attacker.example', action: 'smartfarm_ai' });
  });
  assert.equal(response.status, 403);
  assert.equal((await response.json()).error, 'verification_failed');
  assert.equal(calls, 1);
});

test('sends only allowlisted snapshot to AI, fixes system state server-side, and filters response fields', async () => {
  const { handleAiRequest } = await loadWorker();
  const modelResult = {
    status: 'analyzed',
    summary: 'ค่า DHT11 ยังอยู่ใน threshold ที่ตั้งไว้',
    system_state: { mqtt: 'online', esp: 'online', emergency_stop: 'inactive' },
    observations: [{ item: 'DHT11', value: '28.5 °C / 72%', source: 'DHT11', observed_at: iso(-5000), freshness: 'fresh', evidence: 'ได้รับข้อมูลล่าสุด' }],
    risks: [],
    recommendations: [{ priority: 'monitor', type: 'verify_data', message: 'ตรวจดูข้อมูลรอบถัดไป', basis: 'อ่านจาก DHT11' }],
    missing_or_conflicting_data: [],
    not_supported_conclusions: ['ยังสรุปความชื้นในดินไม่ได้'],
    tool_calls: [{ name: 'turn_relay_on' }]
  };
  const upstreamCalls = [];
  const fetcher = async (url, options = {}) => {
    if (url === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') {
      assert.equal(JSON.parse(options.body).secret, 'turnstile-secret-for-test');
      assert.equal(JSON.parse(options.body).response, 'one-time-token');
      return turnstileOk();
    }
    upstreamCalls.push({ url, headers: options.headers, body: JSON.parse(options.body) });
    return completion(modelResult);
  };
  const input = snapshot();
  const response = await handleAiRequest(request({ snapshot: input, turnstileToken: 'one-time-token' }), env(), fetcher);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('Cache-Control'), 'no-store');
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  const payload = await response.json();
  assert.equal(payload.result.system_state.mqtt, 'online');
  assert.equal(payload.result.system_state.esp, 'online');
  assert.equal(payload.result.system_state.emergency_stop, 'inactive');
  assert.equal('tool_calls' in payload.result, false);
  assert.equal(upstreamCalls.length, 1);
  assert.equal(upstreamCalls[0].url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(upstreamCalls[0].headers.Authorization, 'Bearer provider-secret-for-test');
  const userContent = upstreamCalls[0].body.messages.find(message => message.role === 'user').content;
  assert.doesNotMatch(userContent, /must-not-pass|192\.0\.2\.10|private buyer|provider-secret-for-test|one-time-token/);
  assert.equal(upstreamCalls[0].body.model, 'configured-model');
  assert.equal(upstreamCalls[0].body.stream, false);
  assert.equal('temperature' in upstreamCalls[0].body, false, 'reasoning models reject temperature when effort is not none');
  assert.equal('tools' in upstreamCalls[0].body, false);
  assert.equal(upstreamCalls[0].body.messages[0].role, 'system');
});

test('marks old heartbeat and sensor values stale and does not infer soil moisture', async () => {
  const { sanitizeSnapshot } = await loadWorker();
  const input = snapshot();
  input.espHeartbeatAt = iso(-60_000);
  input.sensor.observedAt = iso(-180_000);
  input.soilMoisture = 99;
  const clean = sanitizeSnapshot(input, now);
  assert.equal(clean.system_state.esp, 'stale');
  assert.equal(clean.sensors.dht11.freshness, 'stale');
  assert.equal(clean.relays.pump.state, 'unknown', 'retained/stale relay status is not current evidence');
  assert.equal(clean.mode, 'unknown', 'retained/stale mode is not current evidence');
  assert.equal(clean.system_state.emergency_stop, 'unknown', 'retained inactive E-stop is not current evidence');
  assert.equal('soilMoisture' in clean, false);
  assert.equal('soilMoisture' in clean.sensors, false);
  input.emergencyStop = true;
  assert.equal(sanitizeSnapshot(input, now).system_state.emergency_stop, 'active', 'active E-stop remains fail-safe even when retained/stale');
});

test('does not treat retained relay/mode/inactive emergency states as fresh observations', async () => {
  const { sanitizeSnapshot } = await loadWorker();
  const input = snapshot();
  input.relayObservedAt.pump = null;
  input.modeObservedAt = null;
  input.emergencyObservedAt = null;
  const clean = sanitizeSnapshot(input, now);
  assert.equal(clean.system_state.esp, 'online');
  assert.equal(clean.relays.pump.state, 'unknown');
  assert.equal(clean.mode, 'unknown');
  assert.equal(clean.system_state.emergency_stop, 'unknown');
  input.relayObservedAt.pump = iso(5 * 60_000);
  input.modeObservedAt = iso(5 * 60_000);
  input.emergencyObservedAt = iso(5 * 60_000);
  const futureTimestamp = sanitizeSnapshot(input, now);
  assert.equal(futureTimestamp.relays.pump.state, 'unknown');
  assert.equal(futureTimestamp.mode, 'unknown');
  assert.equal(futureTimestamp.system_state.emergency_stop, 'unknown');
  input.emergencyStop = true;
  assert.equal(sanitizeSnapshot(input, now).system_state.emergency_stop, 'active');
});

test('sanitizes provider failures and malformed output without leaking upstream details', async () => {
  const { handleAiRequest } = await loadWorker();
  const fetcher = async url => url === 'https://challenges.cloudflare.com/turnstile/v0/siteverify'
    ? turnstileOk()
    : new Response('provider secret error detail', { status: 500 });
  const response = await handleAiRequest(request({ snapshot: snapshot(), turnstileToken: 'token' }), env(), fetcher);
  assert.equal(response.status, 502);
  const body = await response.text();
  assert.equal(body, '{"error":"ai_provider_unavailable"}');
  assert.doesNotMatch(body, /provider secret error detail|provider-secret-for-test/);
});
