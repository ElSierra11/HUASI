// Utilidades para Notificaciones Push y PWA en StayU / HUASI

export function isNotificationSupported() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getNotificationPermission() {
  if (!isNotificationSupported()) return 'denied';
  return Notification.permission;
}

export async function requestNotificationPermission() {
  if (!isNotificationSupported()) {
    console.warn('Este navegador no soporta notificaciones del sistema.');
    return 'denied';
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch (err) {
    console.error('Error solicitando permisos de notificación:', err);
    return 'denied';
  }
}

export async function showPushNotification({
  title = 'StayU — Notificación',
  body = 'Tienes una nueva actualización en StayU.',
  icon = '/huasi-monograma.png',
  url = '/',
  tag = 'stayu-general',
  data = {}
}) {
  if (!isNotificationSupported()) return false;

  if (Notification.permission !== 'granted') {
    return false;
  }

  const notificationOptions = {
    body,
    icon: icon || '/huasi-monograma.png',
    badge: '/huasi-monograma.png',
    tag,
    renotify: true,
    vibrate: [150, 80, 150],
    data: {
      url,
      ...data
    }
  };

  try {
    // 1. Intentar mediante el Service Worker activo (PWA estándar)
    if ('serviceWorker' in navigator) {
      const registration = await navigator.serviceWorker.ready;
      if (registration && registration.showNotification) {
        await registration.showNotification(title, notificationOptions);
        return true;
      }
    }

    // 2. Fallback con Notification API estándar del navegador
    const notif = new Notification(title, notificationOptions);
    notif.onclick = () => {
      window.focus();
      if (url && window.location.pathname !== url) {
        window.location.href = url;
      }
      notif.close();
    };
    return true;
  } catch (err) {
    console.warn('Error mostrando notificación Push:', err);
    return false;
  }
}

// Notificación especializada: Nuevo mensaje de chat
export async function notifyChatMessage({ senderName = 'Usuario', messageText = '', conversacionId = null }) {
  const shortText = messageText.length > 80 ? messageText.substring(0, 80) + '...' : messageText;
  return showPushNotification({
    title: `💬 Nuevo mensaje de ${senderName}`,
    body: shortText || 'Te ha enviado un nuevo mensaje en StayU.',
    icon: '/huasi-monograma.png',
    url: conversacionId ? `/chat` : '/chat',
    tag: `chat-${conversacionId || 'msg'}`,
    data: { conversacionId, url: '/chat' }
  });
}

// Notificación especializada: Cambio de estado en reserva (Aceptada / Rechazada / Completada)
export async function notifyBookingStatusChange({ estado, propertyTitle = 'Alojamiento', hostName = '' }) {
  let title = 'StayU — Actualización de Reserva';
  let body = `Tu solicitud para "${propertyTitle}" ha sido actualizada.`;

  if (estado === 'aceptada') {
    title = '🎉 ¡Tu reserva fue confirmada!';
    body = `El anfitrión ${hostName ? `${hostName} ` : ''}ha ACEPTADO tu solicitud de hospedaje en "${propertyTitle}".`;
  } else if (estado === 'rechazada') {
    title = '❌ Solicitud no aceptada';
    body = `El anfitrión no pudo aceptar tu solicitud para "${propertyTitle}". ¡Explora otros alojamientos disponibles!`;
  } else if (estado === 'completada') {
    title = '✨ Hospedaje completado';
    body = `Tu estancia en "${propertyTitle}" ha finalizado. ¡No olvides calificar tu experiencia!`;
  }

  return showPushNotification({
    title,
    body,
    icon: '/huasi-monograma.png',
    url: '/mis-reservas',
    tag: `reserva-status-${estado}`,
    data: { url: '/mis-reservas' }
  });
}

// Notificación especializada: Nueva solicitud de reserva para el Anfitrión
export async function notifyNewBookingRequest({ guestName = 'Un estudiante', propertyTitle = 'tu alojamiento' }) {
  return showPushNotification({
    title: '🛎️ ¡Nueva solicitud de hospedaje!',
    body: `${guestName} ha solicitado reservar "${propertyTitle}". Revisa y responde en tu panel.`,
    icon: '/huasi-monograma.png',
    url: '/host/reservas',
    tag: 'nueva-reserva-host',
    data: { url: '/host/reservas' }
  });
}
