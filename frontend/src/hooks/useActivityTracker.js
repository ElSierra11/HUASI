import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';

/**
 * Función auxiliar global para registrar eventos manuales de actividad
 */
export const recordActivityEvent = async (tipo_evento, descripcion, metadata = {}) => {
  try {
    let user = null;
    try {
      const saved = localStorage.getItem('stayu_user') || localStorage.getItem('stayu_admin_user');
      if (saved) user = JSON.parse(saved);
    } catch (e) {}

    const isMobile = window.innerWidth <= 768 || /Mobile|Android|iP(hone|od|ad)/i.test(navigator.userAgent);
    await api.post('/auth/activity/event', {
      tipo_evento,
      descripcion,
      ruta: window.location.pathname,
      dispositivo: isMobile ? 'Móvil' : 'Escritorio',
      metadata,
      userId: user?.id
    });
  } catch (err) {
    console.debug('[ActivityTracker] Event error:', err?.message);
  }
};

/**
 * Hook que envía latidos (heartbeats) de presencia y registra navegación
 */
export default function useActivityTracker() {
  const location = useLocation();
  const lastPingRef = useRef(0);
  const lastRouteRef = useRef('');

  const sendHeartbeat = async (forcedRoute = null) => {
    // Si la pestaña no está activa, no saturar
    if (document.visibilityState === 'hidden') return;

    const route = forcedRoute || location.pathname;
    const now = Date.now();

    // Evitar pings múltiples con menos de 5 segundos de diferencia
    if (now - lastPingRef.current < 5000 && lastRouteRef.current === route) {
      return;
    }

    lastPingRef.current = now;
    lastRouteRef.current = route;

    let user = null;
    try {
      const saved = localStorage.getItem('stayu_user') || localStorage.getItem('stayu_admin_user');
      if (saved) user = JSON.parse(saved);
    } catch (e) {}

    const isMobile = window.innerWidth <= 768 || /Mobile|Android|iP(hone|od|ad)/i.test(navigator.userAgent);
    const dispositivo = isMobile ? 'Móvil' : 'Escritorio';

    try {
      await api.post('/auth/activity/heartbeat', {
        ruta: route,
        dispositivo,
        userId: user?.id
      });
    } catch (err) {
      console.debug('[ActivityTracker] Heartbeat error:', err?.message);
    }
  };

  // 1. Envío al montar y al cambiar de ruta
  useEffect(() => {
    sendHeartbeat(location.pathname);
  }, [location.pathname]);

  // 2. Latido continuo de presencia cada 25 segundos y en interacción
  useEffect(() => {
    sendHeartbeat();

    const interval = setInterval(() => {
      sendHeartbeat();
    }, 25000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };

    const handleInteraction = () => {
      if (Date.now() - lastPingRef.current >= 15000) {
        sendHeartbeat();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pointerdown', handleInteraction, { passive: true });
    window.addEventListener('keydown', handleInteraction, { passive: true });

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pointerdown', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
    };
  }, [location.pathname]);
}
