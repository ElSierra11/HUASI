const CACHE_NAME = 'huasi-pwa-v12';
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/huasi-monograma.png',
  '/indesco.png',
  '/ucc_logo.png',
  '/territorios_solidarios.png',
  '/pwa-192x192.png',
  '/pwa-512x512.png',
  '/apple-touch-icon.png'
];

// Instalación inmediata del Service Worker
self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS).catch((err) => {
        console.warn('[SW] Pre-cache warning:', err);
      });
    })
  );
});

// Activación y limpieza de cachés antiguas obsoletas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log('[SW] Eliminando caché antigua:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Estrategia de Fetch optimizada
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // Omitir peticiones API, sockets o extensiones del navegador
  if (
    url.pathname.startsWith('/api') ||
    url.pathname.startsWith('/chat-socket') ||
    url.protocol === 'chrome-extension:' ||
    url.protocol === 'moz-extension:'
  ) {
    return;
  }

  // Navegación y scripts: Network-first con fallback a caché
  if (event.request.mode === 'navigate' || event.request.destination === 'document' || url.pathname.endsWith('.js')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match(event.request).then((cached) => cached || caches.match('/')))
    );
    return;
  }

  // Imágenes, estilos y fuentes: Cache-first con actualización en segundo plano
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(event.request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(event.request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return networkResponse;
      });
    })
  );
});

// ==========================================
// 🔔 GESTIÓN DE NOTIFICACIONES PUSH & PWA
// ==========================================

// Evento Push proveniente de Web Push API
self.addEventListener('push', (event) => {
  let data = {
    title: 'StayU — Notificación',
    body: 'Tienes una nueva actualización en StayU.',
    icon: '/huasi-monograma.png',
    badge: '/huasi-monograma.png',
    data: { url: '/' }
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = { ...data, ...payload };
    }
  } catch (e) {
    if (event.data) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/huasi-monograma.png',
    badge: data.badge || '/huasi-monograma.png',
    vibrate: [150, 80, 150],
    data: data.data || { url: '/' },
    actions: [
      { action: 'open', title: 'Abrir StayU' },
      { action: 'close', title: 'Descartar' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Clic en la notificación: Abrir o enfocar la aplicación en la URL de destino
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Mensajes desde la aplicación web cliente
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, options } = event.data.payload || {};
    self.registration.showNotification(title || 'StayU Notificación', {
      icon: '/huasi-monograma.png',
      badge: '/huasi-monograma.png',
      vibrate: [150, 80, 150],
      ...options
    });
  }
});
