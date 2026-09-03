import React, { useState, useEffect, useRef } from 'react';
import { Bell, BellOff, X, CheckCircle, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import {
  isNotificationSupported,
  getNotificationPermission,
  requestNotificationPermission,
  showPushNotification,
  notifyBookingStatusChange,
  notifyNewBookingRequest,
  notifyNewProperty
} from '../utils/notifications';

export default function NotificationManager() {
  const { user } = useAuth();
  const [permission, setPermission] = useState(getNotificationPermission());
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  
  // Cache de estados anteriores de reservas para detectar cambios
  const previousGuestReservasRef = useRef(null);
  const previousHostReservasRef = useRef(null);
  const isFirstCheckRef = useRef(true);

  useEffect(() => {
    if (!isNotificationSupported()) return;
    setPermission(getNotificationPermission());

    const isDismissed = localStorage.getItem('stayu_notif_dismissed') === 'true';
    if (user && Notification.permission === 'default' && !isDismissed) {
      // Mostrar prompt amigable tras 3 segundos de entrar a la plataforma
      const timer = setTimeout(() => {
        setShowPrompt(true);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Manejador para solicitar permisos
  const handleEnableNotifications = async () => {
    const perm = await requestNotificationPermission();
    setPermission(perm);
    setShowPrompt(false);

    if (perm === 'granted') {
      showPushNotification({
        title: '🔔 ¡Notificaciones activadas!',
        body: 'Te avisaremos en tiempo real cuando un anfitrión responda tu reserva o recibas mensajes de chat.',
        icon: '/huasi-monograma.png',
        url: '/'
      });
    } else {
      localStorage.setItem('stayu_notif_dismissed', 'true');
      setDismissed(true);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('stayu_notif_dismissed', 'true');
    setDismissed(true);
  };

  // Monitoreo en segundo plano de cambios en Reservas (Huésped y Anfitrión)
  useEffect(() => {
    if (!user) return;

    const checkReservationsChanges = async () => {
      try {
        // 1. Verificar reservas como huésped
        const guestRes = await api.get('/reservas/mis');
        const currentGuestReservas = Array.isArray(guestRes.data) ? guestRes.data : [];

        if (previousGuestReservasRef.current !== null) {
          currentGuestReservas.forEach((curr) => {
            const prev = previousGuestReservasRef.current.find((p) => p.id === curr.id);
            if (prev && prev.estado !== curr.estado) {
              // El estado cambió (ej. de pendiente a aceptada o rechazada)
              notifyBookingStatusChange({
                estado: curr.estado,
                propertyTitle: curr.titulo || 'tu alojamiento',
                hostName: curr.host_nombre ? `${curr.host_nombre} ${curr.host_apellido || ''}`.trim() : ''
              });
            }
          });
        }
        previousGuestReservasRef.current = currentGuestReservas;

        // 2. Verificar reservas como anfitrión
        const hostRes = await api.get('/reservas/host');
        const currentHostReservas = Array.isArray(hostRes.data) ? hostRes.data : [];

        if (previousHostReservasRef.current !== null) {
          // Detectar nuevas solicitudes pendientes
          currentHostReservas.forEach((curr) => {
            if (curr.estado === 'pendiente') {
              const prev = previousHostReservasRef.current.find((p) => p.id === curr.id);
              if (!prev) {
                notifyNewBookingRequest({
                  guestName: curr.guest_nombre ? `${curr.guest_nombre} ${curr.guest_apellido || ''}`.trim() : 'Un estudiante',
                  propertyTitle: curr.titulo || 'tu alojamiento'
                });
              }
            }
          });
        }
        previousHostReservasRef.current = currentHostReservas;

        // 3. Verificar nuevos alojamientos publicados en HUASI
        try {
          const propsRes = await api.get('/propiedades?limit=5');
          const latestProps = Array.isArray(propsRes.data?.propiedades) ? propsRes.data.propiedades : [];
          
          if (latestProps.length > 0) {
            const rawLastId = localStorage.getItem('huasi_last_known_prop_id');
            const lastKnownId = rawLastId ? parseInt(rawLastId, 10) : null;
            const currentMaxId = Math.max(...latestProps.map(p => p.id));

            if (lastKnownId === null) {
              // Primera vez cargando: registrar el ID más alto existente
              localStorage.setItem('huasi_last_known_prop_id', String(currentMaxId));
            } else if (currentMaxId > lastKnownId) {
              // Se detectó al menos un nuevo alojamiento publicado
              const newProps = latestProps.filter(p => p.id > lastKnownId && p.host_id !== user.id);
              newProps.forEach(p => {
                notifyNewProperty({
                  propertyId: p.id,
                  propertyTitle: p.titulo || 'Nuevo Alojamiento',
                  tipo: p.tipo || 'Habitación',
                  barrio: p.barrio || '',
                  ciudad: p.ciudad || 'Santa Marta'
                });
              });
              localStorage.setItem('huasi_last_known_prop_id', String(currentMaxId));
            }
          }
        } catch (propErr) {
          // Silent catch in background
        }

        isFirstCheckRef.current = false;
      } catch (err) {
        // Silent fail in background polling
      }
    };

    // Ejecutar verificación inicial
    checkReservationsChanges();

    // Polling cada 12 segundos para detectar cambios de reservas y nuevos alojamientos
    const interval = setInterval(checkReservationsChanges, 12000);
    return () => clearInterval(interval);
  }, [user]);

  // Escuchar evento personalizado de publicación inmediata
  useEffect(() => {
    const handleImmediatePropPublished = (e) => {
      const p = e.detail;
      if (p) {
        notifyNewProperty({
          propertyId: p.id,
          propertyTitle: p.titulo || 'Nuevo Alojamiento',
          tipo: p.tipo || 'Habitación',
          barrio: p.barrio || '',
          ciudad: p.ciudad || 'Santa Marta'
        });
      }
    };
    window.addEventListener('huasi:property-published', handleImmediatePropPublished);
    return () => window.removeEventListener('huasi:property-published', handleImmediatePropPublished);
  }, []);

  if (!showPrompt || permission !== 'default' || dismissed) {
    return null;
  }

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 9998,
        maxWidth: 380,
        background: 'var(--bg-card)',
        border: '1px solid var(--border)',
        borderRadius: 16,
        padding: '16px 20px',
        boxShadow: '0 12px 30px rgba(0,0,0,0.18)',
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        animation: 'slideUp 0.3s ease-out'
      }}
    >
      <style>{`
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--ucc-green), #047857)',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <Bell size={18} />
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 800, color: 'var(--primary)' }}>
              ¿Activar Notificaciones Push?
            </h4>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
              Recibe avisos inmediatos en tu celular o PC de reservas y chats.
            </span>
          </div>
        </div>
        
        <button
          onClick={handleDismiss}
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 2 }}
          title="Cerrar"
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
        <button
          type="button"
          onClick={handleDismiss}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '0.78rem',
            fontWeight: 600,
            cursor: 'pointer',
            padding: '6px 10px'
          }}
        >
          Ahora no
        </button>
        <button
          type="button"
          onClick={handleEnableNotifications}
          style={{
            background: 'var(--ucc-green)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '6px 14px',
            fontSize: '0.8rem',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            boxShadow: '0 2px 8px rgba(13,124,61,0.3)'
          }}
        >
          <Sparkles size={14} /> Activar Notificaciones
        </button>
      </div>
    </div>
  );
}
