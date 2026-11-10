const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

(async () => {
  const source = fs.readFileSync('dashboard/sw.js', 'utf8');
  const handlers = {};
  const existing = ['lungna-shell-v3','lungna-shell-v4','lungna-shell-v5','lungna-shell-v6','lungna-shell-v7','lungna-shell-v8','lungna-shell-v9','lungna-shell-v10','lungna-shell-v11','lungna-shell-v12','lungna-shell-v13','lungna-shell-v14','lungna-shell-v15','lungna-shell-v16','lungna-shell-v17','lungna-shell-v18','lungna-shell-v19','lungna-shell-v20','lungna-shell-v21','unrelated-workbox-cache','another-app-cache'];
  const deleted = [];
  const self = {
    addEventListener: (name, handler) => { handlers[name] = handler; },
    clients: { claim: async () => {} },
    skipWaiting: async () => {}
  };
  const caches = {
    keys: async () => existing,
    delete: async key => { deleted.push(key); return true; },
    open: async () => ({ addAll: async () => {}, put: async () => {}, match: async () => undefined })
  };
  vm.runInNewContext(source, { self, caches, location: { origin: 'https://farm.example' }, URL });
  assert.equal(typeof handlers.activate, 'function', 'activation handler registered');
  let activation;
  handlers.activate({ waitUntil: promise => { activation = promise; } });
  await activation;
  assert.deepEqual(JSON.parse(JSON.stringify(deleted.sort())), ['lungna-shell-v10','lungna-shell-v11','lungna-shell-v12','lungna-shell-v13','lungna-shell-v14','lungna-shell-v15','lungna-shell-v16','lungna-shell-v17','lungna-shell-v18','lungna-shell-v19','lungna-shell-v20','lungna-shell-v21','lungna-shell-v3','lungna-shell-v4','lungna-shell-v5','lungna-shell-v6','lungna-shell-v7','lungna-shell-v8','lungna-shell-v9']);
  assert.match(source, /const CACHE = 'lungna-shell-v22'/);
  assert.match(source, /key\.startsWith\(OWNED_CACHE_PREFIX\)/);
  assert.match(source, /assets\/logo\/logo-suanlungna-modern\.png/);
  assert.match(source, /css\/reference-layout\.css/);
  assert.match(source, /css\/reference-layout\.css\?v=2\.1\.0/);
  assert.match(source, /js\/state\.js\?v=2\.1\.0/);
  assert.match(source, /js\/mqtt\.js\?v=2\.1\.0/);
  assert.match(source, /js\/command-flow\.js\?v=2\.0\.0/);
  assert.match(source, /js\/sensor-alerts\.js\?v=2\.0\.0/);
  assert.match(source, /js\/ai-config\.js\?v=2\.2\.0/);
  assert.match(source, /js\/ai-assistant\.js\?v=2\.1\.0/);
  assert.match(source, /js\/app\.js\?v=2\.1\.0/);
  assert.match(source, /assets\/illustrations\/farm-landscape\.webp/);
  for (const asset of ['hero-farmer-garden.jpg','cucumber-illustration.jpg','water-pump-illustration.jpg','ai-farm-helper.jpg']) assert.ok(source.includes(`assets/v2/${asset}`), `missing V2 offline asset ${asset}`);
  console.log('PASS service worker cache: v22, V2 assets and AI scripts, older dashboard caches only, unrelated namespaces preserved');
})().catch(error => { console.error(error); process.exitCode = 1; });
