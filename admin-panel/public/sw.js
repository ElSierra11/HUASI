// HUASI Admin Panel Service Worker - Notificaciones del Sistema para Móviles y Escritorio
const CACHE_NAME = 'huasi-admin-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Recepción de eventos push o mensajes directos para mostrar notificaciones nativas en el móvil
self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: 'HUASI UCC Admin', body: event.data.text() };
  }

  const options = {
    body: data.body || 'Novedad en la plataforma universitaria',
    icon: data.icon || '/huasi-monograma.png',
    badge: data.badge || '/huasi-monograma.png',
    vibrate: [200, 100, 200],
    data: data.data || { url: '/' }
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'HUASI UCC', options)
  );
});

// Clic en la notificación del teléfono: Enfocar o abrir la ruta en el panel de administración
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (targetUrl && !client.url.endsWith(targetUrl)) {
            client.navigate(targetUrl);
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
