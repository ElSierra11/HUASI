import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './AuthContext';
import api from '../api';
import {
  getNotificationPermission,
  showPushNotification,
  playNotificationSound,
} from '../utils/notifications';

const NotificacionesContext = createContext(null);

// Polling interval: 15 segundos cuando la pestaña está activa, 45s en background
const POLL_ACTIVE = 15_000;
const POLL_BACKGROUND = 45_000;

export function NotificacionesProvider({ children }) {
  const { user } = useAuth();
  const [notificaciones, setNotificaciones] = useState([]);
  const [noLeidas, setNoLeidas] = useState(0);
  const [loading, setLoading] = useState(false);
  const [panelAbierto, setPanelAbierto] = useState(false);
  const pollerRef = useRef(null);
  const lastFetchRef = useRef(0);

  // ── Cargar notificaciones ──────────────────────────────────────────────────
  const fetchNotificaciones = useCallback(async ({ silent = false } = {}) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/notificaciones?limit=30');
      const data = res.data;
      const nuevasNoLeidas = data.no_leidas ?? 0;

      // Detectar nuevas notificaciones y disparar push si el permiso está concedido
      if (lastFetchRef.current > 0 && nuevasNoLeidas > noLeidas) {
        const nuevas = (data.notificaciones || []).filter(
          n => !n.leida && new Date(n.created_at).getTime() > lastFetchRef.current
        );
        if (nuevas.length > 0 && getNotificationPermission() === 'granted') {
          // Mostrar push de las nuevas no leídas
          for (const n of nuevas.slice(0, 3)) {
            playNotificationSound();
            await showPushNotification({
              title: n.titulo,
              body: n.cuerpo,
              icon: '/huasi-monograma.png',
              url: n.url || '/',
              tag: `huasi-notif-${n.id}`,
            });
          }
        }
      }
      lastFetchRef.current = Date.now();

      setNotificaciones(data.notificaciones || []);
      setNoLeidas(nuevasNoLeidas);
    } catch {
      // Silent fail
    } finally {
      if (!silent) setLoading(false);
    }
  }, [user, noLeidas]);

  // ── Polling automático ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) {
      setNotificaciones([]);
      setNoLeidas(0);
      return;
    }

    fetchNotificaciones();

    const getInterval = () =>
      document.visibilityState === 'hidden' ? POLL_BACKGROUND : POLL_ACTIVE;

    const startPoller = () => {
      if (pollerRef.current) clearInterval(pollerRef.current);
      pollerRef.current = setInterval(() => {
        fetchNotificaciones({ silent: true });
      }, getInterval());
    };

    startPoller();

    const onVisibility = () => startPoller();
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      if (pollerRef.current) clearInterval(pollerRef.current);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [user, fetchNotificaciones]);

  // ── Marcar una como leída ──────────────────────────────────────────────────
  const marcarLeida = useCallback(async (id) => {
    setNotificaciones(prev =>
      prev.map(n => n.id === id ? { ...n, leida: true } : n)
    );
    setNoLeidas(prev => Math.max(0, prev - 1));
    try {
      await api.patch(`/notificaciones/${id}/leer`);
    } catch {
      // Optimistic, ignorar error de red
    }
  }, []);

  // ── Marcar todas como leídas ──────────────────────────────────────────────
  const marcarTodasLeidas = useCallback(async () => {
    setNotificaciones(prev => prev.map(n => ({ ...n, leida: true })));
    setNoLeidas(0);
    try {
      await api.patch('/notificaciones/leer-todas');
    } catch {}
  }, []);

  // ── Eliminar una notificación ─────────────────────────────────────────────
  const eliminar = useCallback(async (id) => {
    const notif = notificaciones.find(n => n.id === id);
    setNotificaciones(prev => prev.filter(n => n.id !== id));
    if (notif && !notif.leida) {
      setNoLeidas(prev => Math.max(0, prev - 1));
    }
    try {
      await api.delete(`/notificaciones/${id}`);
    } catch {}
  }, [notificaciones]);

  // ── Limpiar notificaciones leídas ─────────────────────────────────────────
  const limpiarLeidas = useCallback(async () => {
    setNotificaciones(prev => prev.filter(n => !n.leida));
    try {
      await api.delete('/notificaciones/limpiar-leidas');
    } catch {}
  }, []);

  // ── Abrir/cerrar panel ────────────────────────────────────────────────────
  const togglePanel = useCallback(() => {
    setPanelAbierto(prev => !prev);
  }, []);

  const cerrarPanel = useCallback(() => {
    setPanelAbierto(false);
  }, []);

  return (
    <NotificacionesContext.Provider value={{
      notificaciones,
      noLeidas,
      loading,
      panelAbierto,
      togglePanel,
      cerrarPanel,
      marcarLeida,
      marcarTodasLeidas,
      eliminar,
      limpiarLeidas,
      refetch: fetchNotificaciones,
    }}>
      {children}
    </NotificacionesContext.Provider>
  );
}

export function useNotificaciones() {
  const ctx = useContext(NotificacionesContext);
  if (!ctx) throw new Error('useNotificaciones must be used within NotificacionesProvider');
  return ctx;
}
