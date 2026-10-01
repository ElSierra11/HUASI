import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Home, 
  CheckCircle, 
  Bell, 
  Edit, 
  MapPin, 
  Star, 
  Bed, 
  Sofa, 
  Trees, 
  Coins, 
  HelpCircle, 
  MessageSquare, 
  Award,
  ShieldCheck,
  Clock,
  AlertTriangle,
  XCircle,
  Trash2,
  Users,
  UserCheck,
  Calendar,
  Eye,
  EyeOff
} from 'lucide-react';
import { ReservationCardSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import HostOccupancyCalendar from '../components/HostOccupancyCalendar';
import api from '../api';
import HuasiAlert from '../utils/alerts';

const getNormalizedTipo = (tipo) => {
  if (!tipo) return 'otro';
  const t = tipo.toLowerCase();
  if (t.includes('cama')) return 'cama';
  if (t.includes('sofa') || t.includes('sofá')) return 'sofa';
  if (t.includes('hamaca')) return 'hamaca';
  if (t.includes('habitacion') || t.includes('habitación')) return 'habitacion';
  if (t.includes('alquiler')) return 'alquiler';
  return 'otro';
};

const TIPO_ICON = {
  cama: <Bed size={32} />,
  sofa: <Sofa size={32} />,
  hamaca: <Trees size={32} />,
  habitacion: <Home size={32} />,
  alquiler: <Coins size={32} />,
  otro: <HelpCircle size={32} />
};

const TIPO_ICON_SMALL = {
  cama: <Bed size={12} />,
  sofa: <Sofa size={12} />,
  hamaca: <Trees size={12} />,
  habitacion: <Home size={12} />,
  alquiler: <Coins size={12} />,
  otro: <HelpCircle size={12} />
};

const TIPO_THEMES = {
  cama: { gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
  sofa: { gradient: 'linear-gradient(135deg, #a855f7, #6b21a8)' },
  hamaca: { gradient: 'linear-gradient(135deg, #10b981, #047857)' },
  habitacion: { gradient: 'linear-gradient(135deg, #0d9488, #0f766e)' },
  alquiler: { gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  otro: { gradient: 'linear-gradient(135deg, #64748b, #334155)' }
};

export default function HostDashboard() {
  const [propiedades, setPropiedades] = useState([]);
  const [resenas, setResenas] = useState([]);
  const [activeTab, setActiveTab] = useState('propiedades'); // 'propiedades' | 'resenas'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/propiedades/host/mis').catch(() => ({ data: [] })),
      api.get('/resenas/host/mis').catch(() => ({ data: [] }))
    ])
      .then(([propsRes, resenasRes]) => {
        setPropiedades(Array.isArray(propsRes.data) ? propsRes.data : []);
        setResenas(Array.isArray(resenasRes.data) ? resenasRes.data : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalPendientes = propiedades.reduce((sum, p) => sum + (parseInt(p.reservas_pendientes) || 0), 0);
  const totalHuespedesConfirmados = propiedades.reduce((sum, p) => sum + (p.huespedes_ocupados_total || 0), 0);
  const totalHuespedesHoy = propiedades.reduce((sum, p) => sum + (p.huespedes_hospedados_hoy || 0), 0);
  
  // Calcular promedio global de reseñas del anfitrión
  const totalResenasCount = resenas.length;
  const promedioGeneral = totalResenasCount > 0
    ? (resenas.reduce((sum, r) => sum + Number(r.calificacion || 5), 0) / totalResenasCount).toFixed(1)
    : 'Nuevo';

  const handleActivar = async (p) => {
    if (p.estado_aprobacion !== 'aprobado') {
      alert('Este alojamiento está en proceso de revisión por Bienestar Universitario y se activará automáticamente al ser aprobado.');
      return;
    }
    try {
      await api.patch(`/propiedades/${p.id}/activar`);
      setPropiedades(propiedades.map(item => item.id === p.id ? { ...item, activo: true } : item));
    } catch (err) {
      console.error('Error al volver a publicar:', err);
      alert('Error al volver a publicar la propiedad.');
    }
  };

  const handleDesactivar = async (p) => {
    const res = await HuasiAlert.confirm(
      '¿Pausar publicación?',
      `Al pausar "${p.titulo}", el alojamiento quedará oculto de la página principal y no recibirá nuevas solicitudes hasta que lo reactives.`,
      'Sí, pausar alojamiento'
    );
    if (res.isConfirmed) {
      try {
        await api.patch(`/propiedades/${p.id}/desactivar`);
        HuasiAlert.toast('Alojamiento pausado y ocultado exitosamente', 'success');
        setPropiedades(propiedades.map(item => item.id === p.id ? { ...item, activo: false } : item));
      } catch (err) {
        console.error('Error al pausar alojamiento:', err);
        HuasiAlert.error('Error', err.response?.data?.error || 'No se pudo pausar el alojamiento.');
      }
    }
  };

  const handleEliminar = async (p) => {
    const res = await HuasiAlert.confirm(
      '¿Eliminar este alojamiento?',
      `¿Estás seguro de que deseas eliminar permanentemente "${p.titulo}"? Esta acción borrará todas sus reservas y no se puede deshacer.`,
      'Sí, eliminar'
    );
    if (res.isConfirmed) {
      try {
        await api.delete(`/propiedades/${p.id}`);
        HuasiAlert.toast('Alojamiento eliminado exitosamente', 'success');
        setPropiedades(prev => prev.filter(item => item.id !== p.id));
      } catch (err) {
        console.error('Error al eliminar alojamiento:', err);
        HuasiAlert.error('Error', err.response?.data?.error || 'No se pudo eliminar el alojamiento.');
      }
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Reciente';
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
      }
      return String(dateStr);
    } catch {
      return 'Reciente';
    }
  };

  const formatDateRange = (startStr, endStr) => {
    if (!startStr) return '';
    try {
      const start = new Date(startStr);
      const end = endStr ? new Date(endStr) : null;
      const opt = { day: 'numeric', month: 'short' };
      if (end && !isNaN(end.getTime())) {
        return `${start.toLocaleDateString('es-CO', opt)} - ${end.toLocaleDateString('es-CO', opt)}`;
      }
      return start.toLocaleDateString('es-CO', opt);
    } catch {
      return `${startStr} - ${endStr}`;
    }
  };

  const renderApprovalState = (p) => {
    const estado = p.estado_aprobacion || 'pendiente_revision';
    if (estado === 'aprobado') {
      if (!p.activo) {
        return (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: 'rgba(100, 116, 139, 0.12)', color: '#475569', fontSize: '0.78rem', fontWeight: 700, border: '1px solid rgba(100, 116, 139, 0.25)' }}>
            <EyeOff size={14} /> Pausado / Oculto
          </div>
        );
      }
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: 'rgba(16, 185, 129, 0.1)', color: '#15803d', fontSize: '0.78rem', fontWeight: 700, border: '1px solid rgba(16, 185, 129, 0.25)' }}>
          <ShieldCheck size={14} /> Verificado y Aprobado por la Universidad
        </div>
      );
    }
    if (estado === 'en_correccion') {
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: 'rgba(245, 158, 11, 0.12)', color: '#b45309', fontSize: '0.78rem', fontWeight: 700, border: '1px solid rgba(245, 158, 11, 0.3)' }}>
          <AlertTriangle size={14} /> Requiere Ajustes de Habitabilidad
        </div>
      );
    }
    if (estado === 'rechazado') {
      return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: 'rgba(239, 68, 68, 0.1)', color: '#b91c1c', fontSize: '0.78rem', fontWeight: 700, border: '1px solid rgba(239, 68, 68, 0.25)' }}>
          <XCircle size={14} /> No Aprobado
        </div>
      );
    }
    return (
      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', fontSize: '0.78rem', fontWeight: 700, border: '1px solid rgba(2, 132, 199, 0.25)' }}>
        <Clock size={14} /> En revisión por Bienestar Universitario
      </div>
    );
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        <div className="h-8 w-48 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
          <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
          <div className="h-24 bg-slate-200 dark:bg-slate-700 rounded-2xl animate-pulse" />
        </div>
        <div className="space-y-4 pt-4">
          <ReservationCardSkeleton />
          <ReservationCardSkeleton />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="dashboard-header" style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>Panel de Anfitrión</h1>
          <p style={{ color: 'var(--text-muted)', margin: '4px 0 0', fontSize: '0.92rem' }}>
            Gestiona tus espacios solidarios, revisa solicitudes de hospedaje y consulta las opiniones de tus huéspedes.
          </p>
        </div>
        <Link to="/host/nueva-propiedad" className="btn btn-primary">+ Nueva Propiedad</Link>
      </div>

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-icon"><Home size={24} /></div>
          <div className="stat-content">
            <div className="stat-value">{propiedades.length}</div>
            <div className="stat-label">Propiedades registradas</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--success)', background: 'var(--success-light)' }}><CheckCircle size={24} /></div>
          <div className="stat-content">
            <div className="stat-value">{propiedades.filter(p => p.activo && p.estado_aprobacion === 'aprobado').length}</div>
            <div className="stat-label">Aprobadas y activas</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: '#0284c7', background: 'rgba(2, 132, 199, 0.12)' }}><Users size={24} /></div>
          <div className="stat-content">
            <div className="stat-value">{totalHuespedesConfirmados}</div>
            <div className="stat-label">
              {totalHuespedesHoy > 0 ? `${totalHuespedesHoy} en estadía hoy` : 'Huéspedes confirmados'}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ color: 'var(--warning)', background: 'var(--warning-light)' }}><Bell size={24} /></div>
          <div className="stat-content">
            <div className="stat-value" style={{ color: totalPendientes > 0 ? 'var(--warning)' : undefined }}>
              {totalPendientes}
            </div>
            <div className="stat-label">Solicitudes de reserva</div>
          </div>
        </div>

        <div className="stat-card" onClick={() => setActiveTab('resenas')} style={{ cursor: 'pointer' }}>
          <div className="stat-icon" style={{ color: '#d97706', background: 'rgba(245, 158, 11, 0.12)' }}><Star size={24} fill="#d97706" /></div>
          <div className="stat-content">
            <div className="stat-value">{promedioGeneral}</div>
            <div className="stat-label">{totalResenasCount} {totalResenasCount === 1 ? 'Reseña recibida' : 'Reseñas recibidas'}</div>
          </div>
        </div>
      </div>

      {totalPendientes > 0 && (
        <div className="alert alert-info" style={{ marginBottom: 24 }}>
          <Bell size={20} /> Tienes <strong>{totalPendientes}</strong> solicitud(es) de reserva pendiente(s). <Link to="/host/reservas" style={{ fontWeight: 700, marginLeft: 6, textDecoration: 'underline' }}>Revisar ahora</Link>
        </div>
      )}

      {/* Tabs Navigation */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, borderBottom: '1px solid var(--border)', paddingBottom: 8, flexWrap: 'wrap' }}>
        <button
          className={`tab ${activeTab === 'propiedades' ? 'active' : ''}`}
          onClick={() => setActiveTab('propiedades')}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: '0.92rem',
            background: activeTab === 'propiedades' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'propiedades' ? 'white' : 'var(--text-muted)',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Home size={16} />
          Mis Alojamientos ({propiedades.length})
        </button>
        <button
          className={`tab ${activeTab === 'calendario' ? 'active' : ''}`}
          onClick={() => setActiveTab('calendario')}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: '0.92rem',
            background: activeTab === 'calendario' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'calendario' ? 'white' : 'var(--text-muted)',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Calendar size={16} />
          Calendario de Ocupación
        </button>
        <button
          className={`tab ${activeTab === 'resenas' ? 'active' : ''}`}
          onClick={() => setActiveTab('resenas')}
          style={{
            padding: '8px 18px',
            borderRadius: 8,
            fontWeight: 700,
            fontSize: '0.92rem',
            background: activeTab === 'resenas' ? 'var(--primary)' : 'transparent',
            color: activeTab === 'resenas' ? 'white' : 'var(--text-muted)',
            border: 'none',
            cursor: 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6
          }}
        >
          <Star size={16} fill={activeTab === 'resenas' ? 'white' : '#d97706'} />
          Reseñas Recibidas ({totalResenasCount})
        </button>
      </div>

      {/* Tab: Mis Propiedades */}
      {activeTab === 'propiedades' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0 }}>Tus Alojamientos Publicados</h2>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="button"
                onClick={() => setActiveTab('calendario')}
                className="btn btn-outline btn-sm"
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
              >
                <Calendar size={14} /> Ver Calendario
              </button>
              <Link to="/host/reservas" className="btn btn-secondary btn-sm">Gestionar reservas</Link>
            </div>
          </div>

          {propiedades.length === 0 ? (
            <EmptyState
              icon={Home}
              title="No tienes alojamientos registrados"
              description="Ofrece un espacio solidario a estudiantes y docentes durante eventos académicos, semilleros o prácticas de la UCC."
              actionLabel="Publicar mi primer alojamiento"
              actionLink="/host/nueva-propiedad"
            />
          ) : (
            propiedades.map(p => {
              const normalizedTipo = getNormalizedTipo(p.tipo);
              const theme = TIPO_THEMES[normalizedTipo] || TIPO_THEMES.otro;
              const icon = TIPO_ICON[normalizedTipo] || TIPO_ICON.otro;
              const smallIcon = TIPO_ICON_SMALL[normalizedTipo] || TIPO_ICON_SMALL.otro;

              return (
                <div key={p.id} className="list-card" style={{ marginBottom: 16, flexDirection: 'column', alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                    <div className="list-card-img" style={{
                      background: theme.gradient,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      borderRadius: 'var(--radius-sm)',
                      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      width: 80,
                      height: 80,
                      flexShrink: 0
                    }}>
                      {React.cloneElement(icon, { size: 36, color: 'white' })}
                    </div>

                    <div className="list-card-info" style={{ flex: 1, minWidth: '240px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                        <h3 style={{ margin: 0 }}>
                          <Link to={`/propiedad/${p.id}`} style={{ fontWeight: 700, color: 'var(--primary)' }}>
                            {p.titulo}
                          </Link>
                        </h3>
                        {renderApprovalState(p)}
                      </div>

                      <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <MapPin size={14} /> {p.barrio || p.direccion} · {p.campus_cercano || 'Santa Marta'} · {p.tipo}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '4px 0' }}>
                        <span style={{
                          fontSize: '0.82rem',
                          fontWeight: 700,
                          padding: '3px 8px',
                          borderRadius: 6,
                          background: (p.huespedes_ocupados_total || 0) > 0 ? 'rgba(59, 130, 246, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                          color: (p.huespedes_ocupados_total || 0) > 0 ? '#1d4ed8' : '#047857',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 5
                        }}>
                          <Bed size={14} />
                          <strong>{p.cupos_disponibles ?? p.capacidad}</strong> de {p.capacidad} cupos disponibles
                          {(p.huespedes_ocupados_total || 0) > 0 && (
                            <span style={{ fontWeight: 500, opacity: 0.9 }}>
                              ({p.huespedes_ocupados_total} reservado{p.huespedes_ocupados_total > 1 ? 's' : ''})
                            </span>
                          )}
                        </span>

                        {p.huespedes_hospedados_hoy > 0 && (
                          <span style={{
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            padding: '3px 8px',
                            borderRadius: 6,
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: '#065f46',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 4
                          }}>
                            <CheckCircle size={12} color="#059669" />
                            {p.huespedes_hospedados_hoy} hospedado(s) hoy
                          </span>
                        )}

                        <span style={{ margin: 0, display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.85rem' }}>
                          <Star size={14} fill="#d97706" color="#d97706" />
                          <strong>{parseFloat(p.calificacion_promedio) > 0 ? parseFloat(p.calificacion_promedio).toFixed(1) : 'Nuevo'}</strong>
                          <span style={{ color: 'var(--text-muted)' }}>({p.num_resenas || 0} reseñas)</span>
                        </span>
                      </div>
                    </div>

                    <div className="list-card-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                      {p.estado_aprobacion === 'aprobado' && (
                        p.activo ? (
                          <button 
                            className="btn btn-outline btn-sm" 
                            onClick={() => handleDesactivar(p)}
                            title="Pausar u ocultar publicación de la página principal"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                          >
                            <EyeOff size={14} /> Pausar
                          </button>
                        ) : (
                          <button 
                            className="btn btn-primary btn-sm" 
                            onClick={() => handleActivar(p)}
                            title="Reactivar publicación en la página principal"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}
                          >
                            <Eye size={14} /> Activar
                          </button>
                        )
                      )}
                      <Link to={`/propiedad/${p.id}`} className="btn btn-outline btn-sm">Ver anuncio</Link>
                      <Link to={`/host/editar/${p.id}`} className="btn btn-secondary btn-sm"><Edit size={14} /> Editar</Link>
                      <button
                        className="btn btn-sm"
                        style={{ color: '#dc2626', background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}
                        onClick={() => handleEliminar(p)}
                        title="Eliminar alojamiento"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Sección de Huéspedes Hospedados y Confirmados */}
                  {p.huespedes_confirmados && p.huespedes_confirmados.length > 0 ? (
                    <div style={{
                      marginTop: 14,
                      background: 'rgba(241, 245, 249, 0.65)',
                      border: '1px solid var(--border)',
                      borderRadius: 10,
                      padding: '12px 16px'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <Users size={17} color="var(--primary)" />
                          <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)' }}>
                            Huéspedes con reserva confirmada en este alojamiento ({p.huespedes_confirmados.length})
                          </span>
                        </div>
                        <Link to="/host/reservas" style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
                          Gestionar todas las reservas →
                        </Link>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 10 }}>
                        {p.huespedes_confirmados.map(h => (
                          <div key={h.reserva_id} style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 14px',
                            background: h.es_activo_hoy ? 'rgba(16, 185, 129, 0.08)' : 'white',
                            border: `1px solid ${h.es_activo_hoy ? 'rgba(16, 185, 129, 0.4)' : 'var(--border)'}`,
                            borderRadius: 8,
                            gap: 12,
                            boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0, flex: 1 }}>
                              {h.guest_foto ? (
                                <img src={h.guest_foto} alt={h.guest_nombre} style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                              ) : (
                                <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.92rem', flexShrink: 0 }}>
                                  {(h.guest_nombre || 'H').charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div style={{ minWidth: 0, flex: 1 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                  <strong style={{ fontSize: '0.9rem', color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {h.guest_nombre} {h.guest_apellido || ''}
                                  </strong>
                                  {h.es_activo_hoy ? (
                                    <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: 4, background: '#10b981', color: 'white', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                      <CheckCircle size={10} /> En estadía hoy
                                    </span>
                                  ) : (
                                    <span style={{ fontSize: '0.68rem', padding: '2px 7px', borderRadius: 4, background: '#0284c7', color: 'white', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                                      <Clock size={10} /> Próxima estadía
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                                  <Calendar size={13} /> {formatDateRange(h.fecha_inicio, h.fecha_fin)} · <strong>{h.num_huespedes || 1}</strong> {(h.num_huespedes || 1) === 1 ? 'cama reservada' : 'camas reservadas'}
                                </div>
                                {h.evento && (
                                  <div style={{ fontSize: '0.74rem', color: 'var(--primary)', fontWeight: 600, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {h.evento}
                                  </div>
                                )}
                              </div>
                            </div>

                            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                              <button
                                type="button"
                                onClick={() => {
                                  window.dispatchEvent(new CustomEvent('open-chat', { detail: { userId: h.guest_id } }));
                                }}
                                className="btn btn-sm"
                                style={{
                                  padding: '6px 12px',
                                  fontSize: '0.78rem',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: 5,
                                  background: 'var(--primary)',
                                  color: 'white',
                                  border: 'none',
                                  borderRadius: 6,
                                  cursor: 'pointer',
                                  fontWeight: 600
                                }}
                                title={`Abrir chat con ${h.guest_nombre}`}
                              >
                                <MessageSquare size={13} /> Chat
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      marginTop: 12,
                      paddingTop: 8,
                      borderTop: '1px dashed var(--border)',
                      fontSize: '0.8rem',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6
                    }}>
                      <UserCheck size={14} /> Sin huéspedes confirmados actualmente · Todos los {p.capacidad} cupos están disponibles
                    </div>
                  )}

                  {/* Banner de Observaciones de la Universidad si está en corrección o rechazada */}
                  {p.notas_revision && (p.estado_aprobacion === 'en_correccion' || p.estado_aprobacion === 'rechazado') && (
                    <div style={{
                      marginTop: 12,
                      background: p.estado_aprobacion === 'en_correccion' ? '#fffbeb' : '#fef2f2',
                      borderLeft: `4px solid ${p.estado_aprobacion === 'en_correccion' ? '#f59e0b' : '#ef4444'}`,
                      borderRadius: 4,
                      padding: '10px 14px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: 8
                    }}>
                      <div>
                        <span style={{ fontSize: '0.78rem', fontWeight: 800, color: p.estado_aprobacion === 'en_correccion' ? '#92400e' : '#991b1b', textTransform: 'uppercase', display: 'block' }}>
                          Observaciones del Comité de Bienestar Universitario:
                        </span>
                        <p style={{ margin: '2px 0 0 0', fontSize: '0.82rem', color: p.estado_aprobacion === 'en_correccion' ? '#78350f' : '#7f1d1d', lineHeight: 1.4 }}>
                          {p.notas_revision}
                        </p>
                      </div>

                      {p.estado_aprobacion === 'en_correccion' && (
                        <Link 
                          to={`/host/editar/${p.id}`} 
                          className="btn btn-sm"
                          style={{ background: '#d97706', color: 'white', fontSize: '0.78rem', padding: '6px 12px' }}
                        >
                          Actualizar y Reenviar
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Calendario de Ocupación */}
      {activeTab === 'calendario' && (
        <HostOccupancyCalendar propiedades={propiedades} />
      )}

      {/* Tab: Reseñas Recibidas */}
      {activeTab === 'resenas' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ fontSize: '1.25rem', margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={22} color="var(--primary)" /> Opiniones y Calificaciones de tus Huéspedes
            </h2>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Promedio: <strong>{promedioGeneral} / 5.0</strong> ({totalResenasCount} reseñas)
            </span>
          </div>

          {resenas.length === 0 ? (
            <EmptyState
              icon={Star}
              title="Aún no has recibido reseñas"
              description="Cuando los estudiantes y docentes completen su estadía en tus alojamientos solidarios, sus opiniones y valoraciones aparecerán aquí."
              actionLabel="Ver mis alojamientos"
              onAction={() => setActiveTab('propiedades')}
            />
          ) : (
            <div style={{ display: 'grid', gap: 14 }}>
              {resenas.map((r) => {
                const autorNombre = r.autor_nombre ? `${r.autor_nombre} ${r.autor_apellido || ''}`.trim() : 'Estudiante UCC';
                const initial = autorNombre.charAt(0).toUpperCase() || 'U';

                return (
                  <div
                    key={r.id}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border)',
                      borderRadius: 12,
                      padding: 18,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                          width: 38,
                          height: 38,
                          borderRadius: '50%',
                          background: 'var(--primary)',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 800,
                          fontSize: '0.95rem'
                        }}>
                          {initial}
                        </div>
                        <div>
                          <strong style={{ fontSize: '0.95rem', color: 'var(--text)', display: 'block' }}>{autorNombre}</strong>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{formatDate(r.created_at)}</span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(245, 158, 11, 0.12)', padding: '4px 10px', borderRadius: 8, color: '#d97706', fontWeight: 800, fontSize: '0.88rem' }}>
                        <Star size={16} fill="#d97706" /> {r.calificacion} / 5
                      </div>
                    </div>

                    <div style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600 }}>
                      Alojamiento evaluado: <Link to={`/propiedad/${r.propiedad_id}`} style={{ textDecoration: 'underline' }}>{r.propiedad_titulo || 'Ver alojamiento'}</Link>
                    </div>

                    <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text)', lineHeight: '1.45' }}>
                      "{r.comentario || 'Sin comentario adicional.'}"
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
