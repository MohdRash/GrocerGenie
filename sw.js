// Import the background sync script
try {
  self.importScripts('sw-sync.js');
  console.log('[SW] sw-sync.js imported successfully.');
} catch (e) {
  console.error('[SW] Failed to import sw-sync.js', e);
}

const CACHE_NAME = 'grocergenie-cache-v1';
const APP_SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/index.tsx', // This is the main entry point loaded by index.html
];

// On install, cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Opened cache and caching app shell');
        return cache.addAll(APP_SHELL_URLS);
      })
  );
});

// On activate, clean up old caches
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});

// On fetch, serve from cache or network
self.addEventListener('fetch', (event) => {
  // We only care about GET requests
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Strategy: Cache-First for local assets (the app shell).
  // This ensures the app loads instantly from the cache, even offline.
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(event.request)
        .then((response) => {
          // If we have a response in cache, return it.
          // Otherwise, fetch from the network.
          return response || fetch(event.request);
        })
    );
    return;
  }
  
  // Strategy: Stale-While-Revalidate for external assets (CDNs, fonts, etc.).
  // This serves content from cache immediately for speed, but also updates
  // the cache in the background with a fresh version from the network.
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request).then((networkResponse) => {
          // If the request is successful, update the cache.
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        });

        // Return the cached response if it exists, otherwise wait for the network.
        return cachedResponse || fetchPromise;
      });
    })
  );
});

// On notification click, focus the app
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetView = event.notification.data?.view || '';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's a window client open and focus it.
      for (const client of clientList) {
        if (client.url.endsWith('/') && 'focus' in client) {
          client.postMessage({ type: 'NAVIGATE', view: targetView });
          return client.focus();
        }
      }
      // If no client is open, open a new one.
      if (clients.openWindow) {
        return clients.openWindow(`/?view=${targetView}`);
      }
    })
  );
});

// Listener for push notifications from a server (for future-proofing)
self.addEventListener('push', (event) => {
    const data = event.data ? event.data.json() : { title: 'GrocerGenie', body: 'You have a new notification!' };
    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: '/icon-192x192.png'
        })
    );
});