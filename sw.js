// Service Worker for receiving background WebPush notifications

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const title = data.title || '🚨 EMERGENCY ALERT';
    
    // Choose appropriate icon and vibration pattern based on severity
    const isCritical = data.severity === 'MANDATORY';
    const icon = isCritical ? '/brand-logo-red.png' : '/brand-logo-orange.png'; // Fallback to icon if missing
    
    const options = {
      body: data.body || 'Wildfire status change detected.',
      icon: 'https://cdn-icons-png.flaticon.com/512/785/785116.png', // Fire icon fallback
      badge: 'https://cdn-icons-png.flaticon.com/512/785/785116.png',
      vibrate: isCritical ? [300, 100, 300, 100, 300] : [100, 50, 100],
      data: {
        url: self.location.origin
      },
      actions: [
        { action: 'open_dashboard', title: 'Open Dashboard 🗺️' }
      ],
      tag: 'wildfire-alert', // Overwrite old notification
      requireInteraction: isCritical // keep critical notifications on screen until acknowledged
    };

    event.waitUntil(
      self.registration.showNotification(title, options)
    );
  } catch (err) {
    console.error('Error handling push event:', err);
  }
});

// Handle notification click to focus or open window
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data ? event.notification.data.url : self.location.origin;

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // If a window is already open, focus it
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === targetUrl && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});

// Offline Caching
const CACHE_NAME = 'wildfire-cache-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/style.css',
  '/app.js'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Don't fail install if a file is missing
      return cache.addAll(ASSETS).catch(err => console.warn('Cache addAll warning:', err));
    })
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || event.request.url.includes('/api/')) return;
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        return response || fetch(event.request).then(fetchRes => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, fetchRes.clone());
            return fetchRes;
          });
        });
      }).catch(() => {
        // Fallback for offline if not in cache
        return new Response('Offline');
      })
  );
});
