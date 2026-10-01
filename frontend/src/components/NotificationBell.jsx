import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell, X, CheckCheck, Trash2,
  Home, MessageCircle, Phone, Star, CheckCircle, XCircle, BellRing
} from 'lucide-react';
import { useNotificaciones } from '../context/NotificacionesContext';

// ── Mapear icono de BD → componente Lucide ───────────────────────────────────
function NotifIcon({ icono, tipo, size = 18 }) {
  const cls = 'shrink-0';
  if (icono === 'home' || tipo === 'reserva_nueva') return <Home size={size} className={cls} />;
  if (icono === 'chat' || tipo === 'mensaje')       return <MessageCircle size={size} className={cls} />;
  if (icono === 'phone' || tipo === 'llamada')      return <Phone size={size} className={cls} />;
  if (icono === 'check' || tipo === 'reserva_estado_aceptada') return <CheckCircle size={size} className={cls} />;
  if (icono === 'x')                                return <XCircle size={size} className={cls} />;
  if (tipo === 'propiedad_nueva')                   return <Star size={size} className={cls} />;
  return <Bell size={size} className={cls} />;
}

// ── Color de acento según tipo ────────────────────────────────────────────────
function getAccent(tipo, icono) {
  if (tipo === 'reserva_nueva') return { bg: '#dcfce7', color: '#15803d' };
  if (icono === 'check')        return { bg: '#dcfce7', color: '#15803d' };
  if (icono === 'x')            return { bg: '#fee2e2', color: '#dc2626' };
  if (tipo === 'mensaje')       return { bg: '#dbeafe', color: '#1d4ed8' };
  if (tipo === 'llamada')       return { bg: '#f3e8ff', color: '#7c3aed' };
  if (tipo === 'propiedad_nueva') return { bg: '#fef9c3', color: '#a16207' };
  return { bg: '#e0f2fe', color: '#0369a1' };
}

// ── Formato de fecha relativa ────────────────────────────────────────────────
function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60)  return 'ahora mismo';
  const m = Math.floor(s / 60);
  if (m < 60)  return `hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24)  return `hace ${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7)   return `hace ${d}d`;
  return new Date(dateStr).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
}

// ═════════════════════════════════════════════════════════════════════════════
export default function NotificationBell() {
  const navigate = useNavigate();
  const {
    notificaciones, noLeidas, loading,
    panelAbierto, togglePanel, cerrarPanel,
    marcarLeida, marcarTodasLeidas, eliminar, limpiarLeidas,
  } = useNotificaciones();

  // Cerrar panel al click fuera
  const panelRef = useRef(null);
  useEffect(() => {
    if (!panelAbierto) return;
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) cerrarPanel();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [panelAbierto, cerrarPanel]);

  // Cerrar con Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') cerrarPanel(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [cerrarPanel]);

  const handleNotifClick = (notif) => {
    if (!notif.leida) marcarLeida(notif.id);
    cerrarPanel();
    if (notif.url && notif.url !== '/') navigate(notif.url);
  };

  return (
    <div ref={panelRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* ── Botón campana ──────────────────────────────────────────────────── */}
      <button
        id="notif-bell-btn"
        onClick={togglePanel}
        aria-label={`Notificaciones${noLeidas > 0 ? ` (${noLeidas} nuevas)` : ''}`}
        title="Notificaciones"
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 38,
          height: 38,
          borderRadius: '50%',
          border: panelAbierto ? '1.5px solid var(--ucc-green, #0d7c3d)' : '1.5px solid transparent',
          background: panelAbierto ? 'var(--ucc-green-light, #dcfce7)' : 'transparent',
          cursor: 'pointer',
          transition: 'all 0.18s ease',
          color: panelAbierto ? 'var(--ucc-green, #0d7c3d)' : 'var(--text-muted, #6b7280)',
        }}
        onMouseEnter={e => {
          if (!panelAbierto) {
            e.currentTarget.style.background = 'var(--ucc-green-light, #dcfce7)';
            e.currentTarget.style.color = 'var(--ucc-green, #0d7c3d)';
          }
        }}
        onMouseLeave={e => {
          if (!panelAbierto) {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-muted, #6b7280)';
          }
        }}
      >
        {noLeidas > 0
          ? <BellRing size={20} style={{ animation: 'bellRing 1s ease infinite' }} />
          : <Bell size={20} />
        }

        {/* Badge contador */}
        {noLeidas > 0 && (
          <span style={{
            position: 'absolute',
            top: 2,
            right: 2,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            background: '#ef4444',
            color: 'white',
            fontSize: '0.6rem',
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 3px',
            border: '1.5px solid var(--bg-card, white)',
            lineHeight: 1,
            animation: 'badgePop 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          }}>
            {noLeidas > 99 ? '99+' : noLeidas}
          </span>
        )}
      </button>

      <style>{`
        @keyframes bellRing {
          0%, 100% { transform: rotate(0deg); }
          15% { transform: rotate(10deg); }
          30% { transform: rotate(-10deg); }
          45% { transform: rotate(6deg); }
          60% { transform: rotate(-6deg); }
          75% { transform: rotate(3deg); }
          90% { transform: rotate(-3deg); }
        }
        @keyframes badgePop {
          from { transform: scale(0); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        @keyframes panelSlide {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes notifFadeIn {
          from { opacity: 0; transform: translateX(6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .notif-item:hover { background: var(--bg-subtle, #f3f4f6) !important; }
        .notif-item:hover .notif-del-btn { opacity: 1 !important; }
        .notif-del-btn { opacity: 0; transition: opacity 0.15s; }
      `}</style>

      {/* ── Panel desplegable ───────────────────────────────────────────────── */}
      {panelAbierto && (
        <div
          role="dialog"
          aria-label="Centro de notificaciones"
          style={{
            position: 'absolute',
            top: 'calc(100% + 10px)',
            right: 0,
            width: 360,
            maxWidth: 'calc(100vw - 24px)',
            background: 'var(--bg-card, white)',
            border: '1px solid var(--border, #e5e7eb)',
            borderRadius: 16,
            boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 4px 16px rgba(0,0,0,0.08)',
            overflow: 'hidden',
            zIndex: 9999,
            animation: 'panelSlide 0.2s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        >
          {/* Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 16px 10px',
            borderBottom: '1px solid var(--border, #e5e7eb)',
            background: 'var(--bg, #fafafa)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Bell size={16} style={{ color: 'var(--ucc-green, #0d7c3d)' }} />
              <span style={{ fontWeight: 800, fontSize: '0.92rem', color: 'var(--primary, #0f172a)' }}>
                Notificaciones
              </span>
              {noLeidas > 0 && (
                <span style={{
                  background: '#ef4444',
                  color: 'white',
                  fontSize: '0.65rem',
                  fontWeight: 800,
                  padding: '1px 6px',
                  borderRadius: 10,
                }}>
                  {noLeidas} nueva{noLeidas !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', gap: 4 }}>
              {noLeidas > 0 && (
                <button
                  onClick={marcarTodasLeidas}
                  title="Marcar todas como leídas"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--ucc-green, #0d7c3d)',
                    padding: '4px 6px',
                    borderRadius: 6,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <CheckCheck size={14} /> Todo leído
                </button>
              )}
              {notificaciones.some(n => n.leida) && (
                <button
                  onClick={limpiarLeidas}
                  title="Eliminar notificaciones leídas"
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted, #6b7280)',
                    padding: '4px 6px',
                    borderRadius: 6,
                    fontSize: '0.72rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Trash2 size={13} /> Limpiar
                </button>
              )}
              <button
                onClick={cerrarPanel}
                title="Cerrar"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted, #6b7280)',
                  padding: 4,
                  borderRadius: 6,
                }}
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Lista */}
          <div style={{ maxHeight: 420, overflowY: 'auto', overflowX: 'hidden' }}>
            {loading && notificaciones.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--text-muted, #6b7280)', fontSize: '0.82rem' }}>
                Cargando notificaciones…
              </div>
            ) : notificaciones.length === 0 ? (
              <div style={{ padding: '40px 16px', textAlign: 'center' }}>
                <Bell size={36} style={{ color: 'var(--text-muted, #9ca3af)', margin: '0 auto 10px', display: 'block' }} />
                <p style={{ fontSize: '0.84rem', color: 'var(--text-muted, #6b7280)', margin: 0 }}>
                  No tienes notificaciones
                </p>
              </div>
            ) : (
              notificaciones.map((notif, idx) => {
                const accent = getAccent(notif.tipo, notif.icono);
                return (
                  <div
                    key={notif.id}
                    className="notif-item"
                    onClick={() => handleNotifClick(notif)}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 11,
                      padding: '11px 14px',
                      cursor: 'pointer',
                      background: notif.leida ? 'transparent' : 'rgba(13,124,61,0.04)',
                      borderBottom: idx < notificaciones.length - 1 ? '1px solid var(--border, #f3f4f6)' : 'none',
                      transition: 'background 0.15s',
                      position: 'relative',
                      animation: `notifFadeIn 0.2s ease ${Math.min(idx * 0.04, 0.3)}s both`,
                    }}
                  >
                    {/* Icono */}
                    <div style={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      background: accent.bg,
                      color: accent.color,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      marginTop: 1,
                    }}>
                      <NotifIcon icono={notif.icono} tipo={notif.tipo} size={17} />
                    </div>

                    {/* Contenido */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        margin: 0,
                        fontSize: '0.8rem',
                        fontWeight: notif.leida ? 600 : 800,
                        color: 'var(--primary, #0f172a)',
                        lineHeight: 1.4,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                      }}>
                        {notif.titulo}
                      </p>
                      <p style={{
                        margin: '2px 0 0',
                        fontSize: '0.74rem',
                        color: 'var(--text-muted, #6b7280)',
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}>
                        {notif.cuerpo}
                      </p>
                      <span style={{ fontSize: '0.67rem', color: 'var(--text-muted, #9ca3af)', marginTop: 3, display: 'block' }}>
                        {timeAgo(notif.created_at)}
                      </span>
                    </div>

                    {/* Indicador no leída */}
                    {!notif.leida && (
                      <span style={{
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#0d7c3d',
                        flexShrink: 0,
                        marginTop: 6,
                      }} />
                    )}

                    {/* Botón eliminar */}
                    <button
                      className="notif-del-btn"
                      onClick={(e) => { e.stopPropagation(); eliminar(notif.id); }}
                      title="Eliminar"
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--text-muted, #9ca3af)',
                        padding: '2px 4px',
                        borderRadius: 4,
                        position: 'absolute',
                        top: 8,
                        right: 8,
                      }}
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notificaciones.length > 0 && (
            <div style={{
              padding: '8px 16px',
              borderTop: '1px solid var(--border, #e5e7eb)',
              background: 'var(--bg, #fafafa)',
              textAlign: 'center',
            }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted, #9ca3af)' }}>
                {notificaciones.length} notificación{notificaciones.length !== 1 ? 'es' : ''} · actualizado automáticamente
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
