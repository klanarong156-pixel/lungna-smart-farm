const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

(async () => {
  const source = fs.readFileSync('dashboard/sw.js', 'utf8');
  const handlers = {};
  const existing = ['lungna-shell-v3','lungna-shell-v4','lungna-shell-v5','lungna-shell-v6','lungna-shell-v7','lungna-shell-v8','lungna-shell-v9','unrelated-workbox-cache','another-app-cache'];
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
  assert.deepEqual(JSON.parse(JSON.stringify(deleted.sort())), ['lungna-shell-v3','lungna-shell-v4','lungna-shell-v5','lungna-shell-v6','lungna-shell-v7','lungna-shell-v8','lungna-shell-v9']);
  assert.match(source, /const CACHE = 'lungna-shell-v10'/);
  assert.match(source, /key\.startsWith\(OWNED_CACHE_PREFIX\)/);
  assert.match(source, /assets\/logo\/logo-suanlungna-modern\.png/);
  assert.match(source, /css\/reference-layout\.css/);
  assert.match(source, /assets\/illustrations\/farm-aerial\.webp/);
  assert.match(source, /assets\/illustrations\/farm-landscape\.webp/);
  console.log('PASS service worker cache: v10, new shell assets, older dashboard caches only, unrelated namespaces preserved');
})().catch(error => { console.error(error); process.exitCode = 1; });
