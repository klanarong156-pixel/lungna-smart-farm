const CACHE = 'lungna-shell-v4';
const SHELL = [
  './', './index.html', './css/app.css', './js/config.js', './js/state.js',
  './js/mqtt.js', './js/app.js', './manifest.json',
  './assets/icons/icon-192.png', './assets/icons/icon-512.png',
  './assets/logo/logo-suanlungna.png', './assets/hero-landscape.jpg'
];
self.addEventListener('install', event => event.waitUntil(
  caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting())
));
self.addEventListener('activate', event => event.waitUntil(
  caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())
));
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin) return;
  event.respondWith(fetch(event.request).then(response => {
    if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
    return response;
  }).catch(() => caches.match(event.request).then(response => response || (event.request.mode === 'navigate' ? caches.match('./index.html') : undefined))));
});
