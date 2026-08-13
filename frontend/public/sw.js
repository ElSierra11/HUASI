const CACHE_NAME = 'huasi-pwa-v2';
const ASSETS_TO_CACHE = [
  '/manifest.json',
  '/pwa-icon-192.png',
  '/pwa-icon-512.png',
  '/apple-touch-icon.png',
  '/huasi_logo.jpg',
  '/ucc_logo.png',
  '/indesco.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          return caches.delete(cache);
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  
  // Skip API or websocket requests
  if (event.request.url.includes('/api') || event.request.url.includes('/chat-socket')) {
    return;
  }

  // HTML y scripts JS siempre usan estrategia NetworkFirst para evitar 404s de chunks desactualizados
  if (event.request.mode === 'navigate' || event.request.headers.get('accept')?.includes('text/html') || event.request.url.includes('.js')) {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(event.request))
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});
