import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Home, 
  User, 
  CheckCheck, 
  RefreshCw, 
  ExternalLink, 
  Clock, 
  MapPin, 
  Mail, 
  Phone, 
  ShieldAlert, 
  ShieldCheck, 
  Sparkles,
  Filter,
  X
} from 'lucide-react';
import api from '../api';

// Función para calcular tiempo relativo legible
function formatRelativeTime(dateString) {
  if (!dateString) return 'Reciente';
  const now = new Date();
  const date = new Date(dateString);
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return 'Hace un momento';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Hace ${diffMin} min`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `Hace ${diffHours} h`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Ayer';
  if (diffDays < 7) return `Hace ${diffDays} días`;
  return date.toLocaleDateString('es-CO', { month: 'short', day: 'numeric' });
}

export default function NotificationCenter({ onCountChange }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('todos'); // 'todos' | 'alojamientos' | 'registros'
  const [notificaciones, setNotificaciones] = useState([]);
  const [resumen, setResumen] = useState({
    total_pendientes_alojamiento: 0,
    total_nuevos_registros_24h: 0,
    total_registros_sin_verificar: 0,
    total_alertas_activas: 0
  });
  const [readIds, setReadIds] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('huasi_admin_read_notifs') || '[]');
    } catch {
      return [];
    }
  });

  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Cargar notificaciones desde el backend
  const fetchNotificaciones = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.get('/auth/admin/notificaciones-procesos').catch(() =>
        api.get('/admin/notificaciones-procesos')
      );
      if (res?.data) {
        setNotificaciones(res.data.notificaciones || []);
        setResumen(res.data.resumen || {});
      }
    } catch (err) {
      console.warn('Error cargando notificaciones de procesos:', err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotificaciones();
    // Sondeo periódico cada 20 segundos
    const interval = setInterval(() => fetchNotificaciones(true), 20000);
    return () => clearInterval(interval);
  }, []);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  // Contar no leídas
  const unreadNotifications = notificaciones.filter(n => !readIds.includes(n.id));
  const unreadCount = unreadNotifications.length;

  useEffect(() => {
    if (onCountChange) {
      onCountChange(unreadCount);
    }
  }, [unreadCount, onCountChange]);

  const markAllAsRead = () => {
    const allIds = notificaciones.map(n => n.id);
    setReadIds(allIds);
    try {
      localStorage.setItem('huasi_admin_read_notifs', JSON.stringify(allIds.slice(0, 150)));
    } catch (e) {
      console.error(e);
    }
  };

  const markSingleAsRead = (id) => {
    if (!readIds.includes(id)) {
      const updated = [...readIds, id];
      setReadIds(updated);
      try {
        localStorage.setItem('huasi_admin_read_notifs', JSON.stringify(updated.slice(0, 150)));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const handleActionClick = (notif) => {
    markSingleAsRead(notif.id);
    setOpen(false);
    navigate(notif.accionUrl);
  };

  // Filtrado por pestaña
  const filteredNotificaciones = notificaciones.filter(n => {
    if (activeTab === 'alojamientos') return n.tipo === 'alojamiento';
    if (activeTab === 'registros') return n.tipo === 'registro';
    return true;
  });

  const alojamientosCount = notificaciones.filter(n => n.tipo === 'alojamiento').length;
  const registrosCount = notificaciones.filter(n => n.tipo === 'registro').length;

  return (
    <div style={{ position: 'relative' }} ref={dropdownRef}>
      {/* Botón Campana en la barra superior */}
      <button
        onClick={() => {
          setOpen(prev => !prev);
          if (!open) fetchNotificaciones(true);
        }}
        title="Centro de notificaciones de personas y alojamientos en proceso"
        style={{
          position: 'relative',
          background: open ? 'rgba(13, 124, 61, 0.12)' : 'rgba(15, 23, 42, 0.05)',
          border: open ? '1px solid var(--primary)' : '1px solid var(--border)',
          borderRadius: 10,
          width: 38,
          height: 38,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          color: open ? 'var(--primary)' : 'var(--text)',
          transition: 'all 0.2s ease'
        }}
        aria-label="Notificaciones del sistema"
      >
        <Bell size={19} />
        {unreadCount > 0 && (
          <span 
            style={{
              position: 'absolute',
              top: -4,
              right: -4,
              background: '#ef4444',
              color: 'white',
              fontSize: '0.68rem',
              fontWeight: 800,
              minWidth: 18,
              height: 18,
              borderRadius: 999,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '0 4px',
              boxShadow: '0 0 0 2px var(--bg-surface, #ffffff)',
              animation: unreadCount > 0 ? 'pulse 2s infinite' : 'none'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Menú flotante / Popover */}
      {open && (
        <div 
          style={{
            position: 'absolute',
            top: 48,
            right: 0,
            width: '420px',
            maxWidth: 'calc(100vw - 24px)',
            maxHeight: '620px',
            background: 'var(--bg-surface, #ffffff)',
            borderRadius: 16,
            border: '1px solid var(--border, #e2e8f0)',
            boxShadow: '0 20px 40px -15px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.04)',
            zIndex: 1000,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            animation: 'fadeIn 0.18s ease-out'
          }}
        >
          {/* Cabecera del Centro de Notificaciones */}
          <div style={{
            padding: '16px 18px',
            borderBottom: '1px solid var(--border, #e2e8f0)',
            background: 'linear-gradient(to bottom, var(--bg-surface, #ffffff), rgba(13, 124, 61, 0.03))'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{
                  background: 'rgba(13, 124, 61, 0.1)',
                  color: 'var(--primary)',
                  padding: 6,
                  borderRadius: 8,
                  display: 'flex'
                }}>
                  <Bell size={16} />
                </span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.98rem', fontWeight: 800, color: 'var(--text)' }}>
                    Alertas & Procesos
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {unreadCount > 0 ? `${unreadCount} proceso(s) sin revisar` : 'Todo al día'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <button
                  onClick={() => fetchNotificaciones()}
                  disabled={loading}
                  title="Actualizar ahora"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: 6,
                    borderRadius: 6,
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
                {unreadCount > 0 && (
                  <button
                    onClick={markAllAsRead}
                    title="Marcar todas como leídas"
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      color: 'var(--primary)',
                      fontSize: '0.74rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                      padding: '4px 8px',
                      borderRadius: 6
                    }}
                  >
                    <CheckCheck size={14} />
                    <span>Leídas</span>
                  </button>
                )}
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: 4,
                    display: 'flex'
                  }}
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Pestañas de Filtrado */}
            <div style={{
              display: 'flex',
              gap: 6,
              background: 'rgba(15, 23, 42, 0.04)',
              padding: 3,
              borderRadius: 10
            }}>
              <button
                onClick={() => setActiveTab('todos')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 7,
                  border: 'none',
                  fontSize: '0.76rem',
                  fontWeight: activeTab === 'todos' ? 800 : 600,
                  cursor: 'pointer',
                  background: activeTab === 'todos' ? 'var(--bg-surface, #ffffff)' : 'transparent',
                  color: activeTab === 'todos' ? 'var(--primary)' : 'var(--text-muted)',
                  boxShadow: activeTab === 'todos' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                Todos ({notificaciones.length})
              </button>
              <button
                onClick={() => setActiveTab('alojamientos')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 7,
                  border: 'none',
                  fontSize: '0.76rem',
                  fontWeight: activeTab === 'alojamientos' ? 800 : 600,
                  cursor: 'pointer',
                  background: activeTab === 'alojamientos' ? 'var(--bg-surface, #ffffff)' : 'transparent',
                  color: activeTab === 'alojamientos' ? '#b45309' : 'var(--text-muted)',
                  boxShadow: activeTab === 'alojamientos' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                🏠 Alojamientos ({alojamientosCount})
              </button>
              <button
                onClick={() => setActiveTab('registros')}
                style={{
                  flex: 1,
                  padding: '6px 8px',
                  borderRadius: 7,
                  border: 'none',
                  fontSize: '0.76rem',
                  fontWeight: activeTab === 'registros' ? 800 : 600,
                  cursor: 'pointer',
                  background: activeTab === 'registros' ? 'var(--bg-surface, #ffffff)' : 'transparent',
                  color: activeTab === 'registros' ? '#0369a1' : 'var(--text-muted)',
                  boxShadow: activeTab === 'registros' ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                👤 Registros ({registrosCount})
              </button>
            </div>
          </div>

          {/* Lista scrolleable de notificaciones */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '8px 10px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxHeight: '440px'
          }}>
            {loading && notificaciones.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
                <span style={{ fontSize: '0.85rem' }}>Cargando procesos...</span>
              </div>
            ) : filteredNotificaciones.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '50%',
                  background: 'rgba(13, 124, 61, 0.08)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px'
                }}>
                  <Sparkles size={24} />
                </div>
                <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
                  No hay procesos pendientes
                </p>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.76rem' }}>
                  {activeTab === 'alojamientos' 
                    ? 'No hay solicitudes de revisión de alojamientos activas.' 
                    : activeTab === 'registros' 
                    ? 'No hay nuevos usuarios registrados recientemente.' 
                    : 'Todas las novedades han sido atendidas.'}
                </p>
              </div>
            ) : (
              filteredNotificaciones.map((item) => {
                const isUnread = !readIds.includes(item.id);
                const isAlojamiento = item.tipo === 'alojamiento';

                return (
                  <div
                    key={item.id}
                    onClick={() => markSingleAsRead(item.id)}
                    style={{
                      padding: '12px 14px',
                      borderRadius: 12,
                      background: isUnread 
                        ? (isAlojamiento ? 'rgba(245, 158, 11, 0.05)' : 'rgba(14, 165, 233, 0.05)') 
                        : 'var(--bg-main, #f8fafc)',
                      border: isUnread 
                        ? (isAlojamiento ? '1px solid rgba(245, 158, 11, 0.3)' : '1px solid rgba(14, 165, 233, 0.3)') 
                        : '1px solid var(--border, #e2e8f0)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                      transition: 'all 0.15s ease',
                      position: 'relative'
                    }}
                  >
                    {/* Header de la tarjeta */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          background: isAlojamiento ? '#fef3c7' : '#e0f2fe',
                          color: isAlojamiento ? '#d97706' : '#0284c7',
                          flexShrink: 0
                        }}>
                          {isAlojamiento ? <Home size={15} /> : <User size={15} />}
                        </span>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{
                              fontSize: '0.82rem',
                              fontWeight: 800,
                              color: 'var(--text)'
                            }}>
                              {item.titulo}
                            </span>
                            {isUnread && (
                              <span style={{
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                background: '#ef4444'
                              }} />
                            )}
                          </div>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                            <Clock size={11} /> {formatRelativeTime(item.fecha)}
                          </span>
                        </div>
                      </div>

                      {/* Pill de Estado */}
                      <span style={{
                        fontSize: '0.68rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 999,
                        textTransform: 'uppercase',
                        letterSpacing: '0.4px',
                        background: item.estado === 'pendiente_revision' 
                          ? '#fef3c7' 
                          : item.estado === 'en_correccion' 
                          ? '#ffedd5' 
                          : item.estado === 'verificado'
                          ? '#dcfce7'
                          : '#f1f5f9',
                        color: item.estado === 'pendiente_revision' 
                          ? '#b45309' 
                          : item.estado === 'en_correccion' 
                          ? '#c2410c' 
                          : item.estado === 'verificado'
                          ? '#15803d'
                          : '#475569'
                      }}>
                        {item.estado === 'pendiente_revision' ? 'En revisión' : item.estado === 'en_correccion' ? 'Corrección' : item.estado === 'verificado' ? 'Verificado' : 'Nuevo'}
                      </span>
                    </div>

                    {/* Datos de la Persona en proceso */}
                    <div style={{
                      background: 'var(--bg-surface, #ffffff)',
                      padding: '8px 10px',
                      borderRadius: 8,
                      border: '1px solid rgba(0,0,0,0.05)',
                      fontSize: '0.77rem',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 4
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: 'var(--text)' }}>
                          {item.persona?.nombre || item.subtitulo}
                        </strong>
                        <span style={{
                          fontSize: '0.68rem',
                          background: 'rgba(13, 124, 61, 0.08)',
                          color: 'var(--primary)',
                          padding: '1px 6px',
                          borderRadius: 4,
                          fontWeight: 700
                        }}>
                          {item.persona?.campus ? `Sede ${item.persona.campus}` : (item.persona?.rol || 'Usuario')}
                        </span>
                      </div>

                      {isAlojamiento && item.objeto?.titulo && (
                        <div style={{ color: '#475569', fontStyle: 'italic', fontSize: '0.74rem' }}>
                          Inmueble: "{item.objeto.titulo}" ({item.objeto.tipo})
                        </div>
                      )}

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: 2 }}>
                        {item.persona?.email && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Mail size={11} /> {item.persona.email}
                          </span>
                        )}
                        {item.persona?.telefono && (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                            <Phone size={11} /> {item.persona.telefono}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Botón de Acción Directa */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 2 }}>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActionClick(item);
                        }}
                        style={{
                          background: isAlojamiento 
                            ? 'linear-gradient(135deg, #d97706, #b45309)' 
                            : 'linear-gradient(135deg, var(--primary), #059669)',
                          color: 'white',
                          border: 'none',
                          padding: '5px 12px',
                          borderRadius: 6,
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5,
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        <span>{item.accionTexto || 'Ver detalle'}</span>
                        <ExternalLink size={12} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer de Resumen y Acceso Rápido */}
          <div style={{
            padding: '10px 16px',
            borderTop: '1px solid var(--border, #e2e8f0)',
            background: 'var(--bg-main, #f8fafc)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.74rem',
            color: 'var(--text-muted)'
          }}>
            <span>
              🏠 <strong>{resumen.total_pendientes_alojamiento || 0}</strong> por auditar · 👤 <strong>{resumen.total_nuevos_registros_24h || 0}</strong> hoy
            </span>
            <button
              onClick={() => {
                setOpen(false);
                navigate('/monitoreo');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--primary)',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.74rem'
              }}
            >
              Ver Auditoría &rarr;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
