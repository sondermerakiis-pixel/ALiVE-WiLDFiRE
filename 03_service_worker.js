// ============================================================
// ALiVE-WiLDFiRE — SERVICE WORKER
// ============================================================
// Caches critical evacuation data and map tiles for offline use.
// Place this file at the root of your server: /sw.js
//
// STRATEGY:
// - App shell (HTML, CSS, JS): Cache-first, network fallback
// - API data (fires, routes): Network-first, cache fallback
// - Map tiles: Cache with network update (stale-while-revalidate)
// ============================================================

const CACHE_NAME = 'alive-wildfire-v1';
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
];

// Install: pre-cache the app shell
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(CRITICAL_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate: clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first for API, cache-first for assets
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // API calls: network first, cache fallback
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Map tiles: stale-while-revalidate
  if (url.hostname.includes('mapbox') || url.hostname.includes('tiles')) {
    event.respondWith(
      caches.open(CACHE_NAME).then((cache) => {
        return cache.match(event.request).then((cached) => {
          const fetchPromise = fetch(event.request).then((response) => {
            cache.put(event.request, response.clone());
            return response;
          }).catch(() => cached);
          return cached || fetchPromise;
        });
      })
    );
    return;
  }

  // Everything else: cache first
  event.respondWith(
    caches.match(event.request).then((cached) => {
      return cached || fetch(event.request);
    })
  );
});
