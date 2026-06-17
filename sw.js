/* World Cup 2026 dashboard — offline service worker.
   Caches the app shell so it loads with no internet. Live scores (ESPN) stay
   network-only and fail gracefully; everything else works from cache + localStorage. */
const CACHE = 'wc2026-v1';
const ASSETS = [
  '/', '/index.html',
  '/manifest.webmanifest',
  '/apple-touch-icon.png', '/icon-192.png', '/icon-512.png', '/favicon-32.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never cache the live feed — always go to network, let the page handle failure.
  if (url.hostname.indexOf('espn.com') !== -1) return;

  // Stale-while-revalidate for everything on our origin: serve cache instantly
  // (works offline), refresh in the background when online.
  e.respondWith(caches.open(CACHE).then(async cache => {
    const cached = await cache.match(req, { ignoreSearch: true })
                || (req.mode === 'navigate' ? await cache.match('/') : null);
    const network = fetch(req).then(resp => {
      // Only cache solid, same-origin responses (avoids caching a tiny auth/redirect page).
      if (resp && resp.ok && resp.type === 'basic') {
        const len = resp.headers.get('content-length');
        if (!(req.mode === 'navigate' && len && +len < 5000)) {
          cache.put(req, resp.clone()).catch(() => {});
        }
      }
      return resp;
    }).catch(() => null);
    return cached || network || fetch(req);
  }));
});
