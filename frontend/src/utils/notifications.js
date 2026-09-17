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
      if (url && url !== '/' && window.location.pathname !== url) {
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

// Reproducir sonido sutil y armónico de notificación usando Web Audio API nativa
export function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    if (ctx.state === 'suspended') {
      ctx.resume();
    }
    
    // Tono 1 (880Hz - La5)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(880, ctx.currentTime);
    gain1.gain.setValueAtTime(0.12, ctx.currentTime);
    gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.35);

    // Tono 2 (1318.5Hz - Mi6) armonioso
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1318.5, ctx.currentTime + 0.08);
    gain2.gain.setValueAtTime(0.1, ctx.currentTime + 0.08);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.08);
    osc2.stop(ctx.currentTime + 0.5);
  } catch {
    // Si el navegador requiere interacción de usuario previa
  }
}

// Notificación especializada: Nuevo mensaje de chat
export async function notifyChatMessage({ senderName = 'Usuario', messageText = '', conversacionId = null }) {
  playNotificationSound();
  const shortText = messageText.length > 80 ? messageText.substring(0, 80) + '...' : messageText;
  const url = conversacionId ? `/chat?conv=${conversacionId}` : '/chat';
  return showPushNotification({
    title: `Mensaje de ${senderName}`,
    body: shortText || 'Te ha escrito un nuevo mensaje en HUASI.',
    icon: '/huasi-monograma.png',
    url,
    tag: `chat-${conversacionId || 'msg'}`,
    data: { conversacionId, url }
  });
}

// Notificación especializada: Publicación de nuevo alojamiento
export async function notifyNewProperty({ propertyId, propertyTitle = 'Alojamiento Universitario', tipo = 'Habitación', barrio = '', ciudad = 'Santa Marta' }) {
  playNotificationSound();
  const ubicacion = barrio ? `${barrio}, ${ciudad}` : ciudad;
  return showPushNotification({
    title: 'Nuevo alojamiento en HUASI',
    body: `"${propertyTitle}" (${tipo}) está disponible en ${ubicacion}. Toca para ver detalles y reservar.`,
    icon: '/huasi-monograma.png',
    url: propertyId ? `/propiedad/${propertyId}` : '/',
    tag: `propiedad-nueva-${propertyId || Date.now()}`,
    data: { url: propertyId ? `/propiedad/${propertyId}` : '/' }
  });
}

// Notificación especializada: Cambio de estado en reserva (Aceptada / Rechazada / Completada)
export async function notifyBookingStatusChange({ estado, propertyTitle = 'Alojamiento', hostName = '' }) {
  playNotificationSound();
  let title = 'HUASI — Actualización de Reserva';
  let body = `Tu solicitud para "${propertyTitle}" ha sido actualizada.`;

  if (estado === 'aceptada') {
    title = 'Reserva confirmada';
    body = `El anfitrión ${hostName ? `${hostName} ` : ''}ha aceptado tu solicitud de hospedaje en "${propertyTitle}".`;
  } else if (estado === 'rechazada') {
    title = 'Solicitud no aceptada';
    body = `El anfitrión no pudo aceptar tu solicitud para "${propertyTitle}". Explora otros alojamientos disponibles.`;
  } else if (estado === 'completada') {
    title = 'Hospedaje completado';
    body = `Tu estancia en "${propertyTitle}" ha finalizado. No olvides calificar tu experiencia.`;
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
  playNotificationSound();
  return showPushNotification({
    title: 'Nueva solicitud de hospedaje',
    body: `${guestName} ha solicitado reservar "${propertyTitle}". Revisa y responde en tu panel.`,
    icon: '/huasi-monograma.png',
    url: '/host/reservas',
    tag: 'nueva-reserva-host',
    data: { url: '/host/reservas' }
  });
}

// ──────────────────────────────────────────────────────────────
// Tono de llamada (ringtone) + notificación de llamada entrante
// ──────────────────────────────────────────────────────────────
let _ringtoneInterval = null;
let _ringtoneCtx = null;

function _playRingStep() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    if (!_ringtoneCtx || _ringtoneCtx.state === 'closed') _ringtoneCtx = new AudioCtx();
    if (_ringtoneCtx.state === 'suspended') _ringtoneCtx.resume();
    const now = _ringtoneCtx.currentTime;
    // Dos pulsos dobles tipo teléfono
    [[0, 440], [0.18, 660], [0.55, 440], [0.73, 660]].forEach(([t, freq]) => {
      const osc = _ringtoneCtx.createOscillator();
      const gain = _ringtoneCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + t);
      gain.gain.setValueAtTime(0, now + t);
      gain.gain.linearRampToValueAtTime(0.15, now + t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + t + 0.16);
      osc.connect(gain);
      gain.connect(_ringtoneCtx.destination);
      osc.start(now + t);
      osc.stop(now + t + 0.16);
    });
  } catch {
    // Silenciar error si el contexto de audio no se puede inicializar
  }
}

export function startRingtone() {
  stopRingtone();
  _playRingStep();
  _ringtoneInterval = setInterval(_playRingStep, 1400);
}

export function stopRingtone() {
  if (_ringtoneInterval) { clearInterval(_ringtoneInterval); _ringtoneInterval = null; }
  if (_ringtoneCtx && _ringtoneCtx.state !== 'closed') {
    try {
      _ringtoneCtx.close();
    } catch (_) {}
    _ringtoneCtx = null;
  }
}

// Notificación especializada: Llamada entrante
export async function notifyIncomingCall({ callerName = 'Un usuario', callType = 'audio' }) {
  startRingtone();
  const typeLabel = callType === 'video' ? 'videollamada' : 'llamada de voz';
  
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
    try {
      await Notification.requestPermission();
    } catch {
      // Permiso cancelado o bloqueado
    }
  }

  return showPushNotification({
    title: `Llamada entrante — ${callerName}`,
    body: `${callerName} te está haciendo una ${typeLabel}. Toca aquí para contestar.`,
    icon: '/huasi-monograma.png',
    url: null, // No forzar recarga para no destruir la conexión WebRTC
    tag: 'call-incoming',
    data: { callerName, callType }
  });
}
