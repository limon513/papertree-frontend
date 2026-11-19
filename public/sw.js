/*
 * PaperTree's service worker: only for push notifications (order updates, offers, saved items).
 * It shows the alert the shop sent (Firebase Cloud Messaging, data only) and opens the right page
 * when it is tapped. Nothing else: pages are never cached here, so the site is always fresh.
 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }
  // Firebase puts the shop's fields in "data" (a raw push may have them at the top).
  const d = payload.data || payload.notification || payload;
  if (!d.title) return;
  event.waitUntil(
    self.registration.showNotification(d.title, {
      body: d.body || '',
      icon: '/icons/icon-192.png',
      badge: '/icons/badge-72.png',
      image: d.image || undefined,
      // The same tag replaces the older alert (one per order, not a pile).
      tag: d.tag || undefined,
      renotify: !!d.tag,
      data: { url: d.url || '/', id: d.id || '' },
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { url, id } = event.notification.data || {};
  const target = new URL(url || '/', self.location.origin);
  // Only the shop's own pages open from an alert.
  const safe = target.origin === self.location.origin ? target.href : self.location.origin + '/';
  event.waitUntil(
    (async () => {
      if (id) {
        // Counts taps on an offer (no personal data).
        fetch(`${self.location.origin}/push-tap/?id=${encodeURIComponent(id)}`, { method: 'POST', keepalive: true }).catch(() => undefined);
      }
      const open = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const same = open.find((c) => c.url === safe);
      if (same) return same.focus();
      return self.clients.openWindow(safe);
    })(),
  );
});
