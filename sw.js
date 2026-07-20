/* Off-season: self-destroying service worker.
   Clears the old dashboard cache, unregisters itself, and reloads open clients
   onto the holding page — stops all background polling for installed apps. */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    try {
      const keys = await caches.keys();
      await Promise.all(keys.map(k => caches.delete(k)));
      await self.registration.unregister();
      const clients = await self.clients.matchAll({ type: 'window' });
      clients.forEach(c => c.navigate(c.url).catch(() => {}));
    } catch (e) {}
  })());
});
/* No fetch handler — everything goes straight to the network. */
