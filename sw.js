/* Jarvis · IPS Command Centre service worker.
   Network-first for everything same-origin (so updates show immediately), cache as offline fallback.
   Cross-origin requests (the Jarvis Worker API, xAI, etc.) are NEVER intercepted or cached. */
const CACHE = 'ipscc-v3.0';
const SHELL = ['./', 'index.html', 'app.js?v=3.0', 'style.css?v=3.0', 'manifest.webmanifest',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png', 'icons/favicon-32.png', 'data.json'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;   // leave API calls alone
  const key = url.pathname.endsWith('/data.json') ? new Request(url.origin + url.pathname) : req;
  e.respondWith((async () => {
    try {
      const res = await fetch(req);
      if (res && res.ok && res.type === 'basic') { const c = await caches.open(CACHE); c.put(key, res.clone()); }
      return res;
    } catch (err) {
      const c = await caches.open(CACHE);
      const hit = await c.match(key, { ignoreSearch: url.pathname.endsWith('/data.json') || req.mode === 'navigate' });
      if (hit) return hit;
      if (req.mode === 'navigate') return (await c.match('index.html')) || (await c.match('./')) || new Response('<h1>Jarvis is offline</h1>', { headers: { 'Content-Type': 'text/html' } });
      return new Response('', { status: 504, statusText: 'offline' });
    }
  })());
});
