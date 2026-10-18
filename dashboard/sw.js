const CACHE = 'lungna-shell-v10';
const OWNED_CACHE_PREFIX = 'lungna-shell-';
const SHELL = [
  './', './index.html', './css/app.css', './css/reference-layout.css', './js/config.js', './js/state.js',
  './js/mqtt.js', './js/app.js', './manifest.json',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png',
  './assets/logo/logo-suanlungna-modern.png',
  './assets/illustrations/farm-aerial.webp', './assets/illustrations/farm-landscape.webp'
];
self.addEventListener('install', event => event.waitUntil(
  caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
));
self.addEventListener('activate', event => event.waitUntil(
  caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(OWNED_CACHE_PREFIX) && key !== CACHE)
      .map(key => caches.delete(key))
  )).then(() => self.clients.claim())
));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => caches.open(CACHE).then(async cache => {
    const response = await cache.match(event.request);
    return response || (event.request.mode === 'navigate' ? cache.match('./index.html') : undefined);
  })));
});
