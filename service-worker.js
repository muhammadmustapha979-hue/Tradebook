/* ═══════════════════════════════════════════════
   TradeBook Service Worker
   Caches all assets for 100% offline use
═══════════════════════════════════════════════ */

const CACHE_NAME = 'tradebook-v1.0';
const CACHE_URLS = [
  '/Tradebook/',
  '/Tradebook/index.html',
  '/Tradebook/style.css',
  '/Tradebook/app.js',
  '/Tradebook/manifest.json',
  '/Tradebook/icon-192.png',
  '/Tradebook/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'
];

/* ── Install: cache everything ── */
self.addEventListener('install', event => {
  console.log('[TradeBook SW] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[TradeBook SW] Caching all assets');
        // Cache what we can, skip failures (e.g. Google Fonts offline)
        return Promise.allSettled(
          CACHE_URLS.map(url =>
            cache.add(url).catch(err => console.warn('[SW] Could not cache:', url, err))
          )
        );
      })
      .then(() => self.skipWaiting())
  );
});

/* ── Activate: clean old caches ── */
self.addEventListener('activate', event => {
  console.log('[TradeBook SW] Activating...');
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log('[TradeBook SW] Deleting old cache:', key);
            return caches.delete(key);
          })
      )
    ).then(() => self.clients.claim())
  );
});

/* ── Fetch: serve from cache, fallback to network ── */
self.addEventListener('fetch', event => {
  // Skip non-GET and chrome-extension requests
  if (event.request.method !== 'GET') return;
  if (event.request.url.startsWith('chrome-extension')) return;

  event.respondWith(
    caches.match(event.request)
      .then(cachedResponse => {
        // Return cached version if available
        if (cachedResponse) {
          // Still fetch in background to update cache
          fetch(event.request)
            .then(networkResponse => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then(cache => {
                  cache.put(event.request, networkResponse.clone());
                });
              }
            })
            .catch(() => {}); // Silently fail background update
          return cachedResponse;
        }

        // Not in cache — fetch from network
        return fetch(event.request)
          .then(networkResponse => {
            // Cache new successful responses
            if (networkResponse && networkResponse.status === 200 &&
                networkResponse.type !== 'opaque') {
              const responseClone = networkResponse.clone();
              caches.open(CACHE_NAME).then(cache => {
                cache.put(event.request, responseClone);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            // Offline fallback — return main app shell
            if (event.request.destination === 'document') {
              return caches.match('/Tradebook/index.html');
            }
          });
      })
  );
});

/* ── Background Sync (future: cloud backup) ── */
self.addEventListener('sync', event => {
  if (event.tag === 'sync-transactions') {
    console.log('[TradeBook SW] Background sync triggered');
    // Future: push to Firebase/Supabase
  }
});

/* ── Push Notifications (future: debt reminders) ── */
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  self.registration.showNotification(data.title || 'TradeBook', {
    body: data.body || 'You have a new notification',
    icon: '/Tradebook/icon-192.png',
    badge: '/Tradebook/icon-192.png',
    vibrate: [200, 100, 200],
    data: { url: data.url || '/Tradebook/' }
  });
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
