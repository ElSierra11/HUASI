import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import api from '../api';

/**
 * Hook para el panel administrativo que mantiene la presencia activa del admin
 */
export default function useActivityTracker() {
  const location = useLocation();
  const lastPingRef = useRef(0);

  const sendHeartbeat = async (forcedRoute = null) => {
    // Si la pestaña está oculta, no saturar
    if (document.visibilityState === 'hidden') return;

    const now = Date.now();
    // Throttle mínimo de 6 segundos
    if (now - lastPingRef.current < 6000) return;
    lastPingRef.current = now;

    let adminUser = null;
    try {
      const saved = localStorage.getItem('stayu_admin_user') || localStorage.getItem('stayu_user');
      if (saved) adminUser = JSON.parse(saved);
    } catch (e) {}

    const isMobile = window.innerWidth <= 768 || /Mobile|Android|iP(hone|od|ad)/i.test(navigator.userAgent);
    const dispositivo = isMobile ? 'Móvil' : 'Escritorio';
    const route = forcedRoute || location.pathname;

    try {
      await api.post('/auth/activity/heartbeat', {
        ruta: `/admin${route}`,
        dispositivo,
        userId: adminUser?.id
      });
    } catch (err) {
      console.debug('[Admin ActivityTracker] Ping:', err?.message);
    }
  };

  // 1. Envío al cambiar de ruta
  useEffect(() => {
    sendHeartbeat(location.pathname);
  }, [location.pathname]);

  // 2. Latido continuo de presencia cada 25 segundos
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

    // Eventos de interacción activa (click, toque o tecla) con throttle
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
