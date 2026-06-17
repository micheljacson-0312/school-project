// School Platform Service Worker — Phase 10 (PWA + role-aware shells).
//
// Strategy:
//   - Public navigations: network-first, fall back to cached "/" + "/offline".
//   - Role portal navigations: same as above (cached shell).
//   - Static assets (icons, manifests, JS, CSS): stale-while-revalidate.
//   - /api/*: always network (never cache dynamic data).
//   - Push notifications: handled by `push` event (no-op until VAPID is wired).
//
// Cache versioning: bump CACHE_VERSION to force a refresh across all clients.
const CACHE_VERSION = 'school-platform-v10';
const CACHE = `school-${CACHE_VERSION}`;
const APP_SHELL = [
  '/',
  '/index.html',
  '/offline',
  '/offline.html',
  '/manifest.json',
  '/manifest.student.json',
  '/manifest.parent.json',
  '/manifest.teacher.json',
  '/manifest.admin.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/student-192.png',
  '/icons/parent-192.png',
  '/icons/teacher-192.png',
  '/icons/admin-192.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Always go to the network for the API.
  if (url.pathname.startsWith('/api/')) return;
  // Skip non-http(s) (chrome-extension, etc.).
  if (!url.protocol.startsWith('http')) return;

  // HTML navigation requests: network-first, fall back to cached "/" + offline page.
  const acceptsHtml = req.headers.get('accept')?.includes('text/html') || req.mode === 'navigate';
  if (acceptsHtml) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('/', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('/').then((r) => r || caches.match('/offline.html') || new Response(
          '<h1>Offline</h1><p>This page is not cached and the server is unreachable.</p>',
          { status: 503, headers: { 'Content-Type': 'text/html' } }
        )))
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const fetchPromise = fetch(req).then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});

// ----- Push notifications (placeholder; will be wired once VAPID keys are set) -----
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let payload = {};
  try { payload = event.data.json(); } catch { payload = { title: event.data.text() }; }
  const title = payload.title || 'School Platform';
  const options = {
    body: payload.body || '',
    icon: payload.icon || '/icons/icon-192.png',
    badge: payload.badge || '/icons/icon-192.png',
    data: payload.data || {},
    tag: payload.tag || 'school-notification',
    requireInteraction: !!payload.requireInteraction,
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      for (const w of wins) {
        if ('focus' in w) { w.focus(); w.navigate(target); return; }
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});
