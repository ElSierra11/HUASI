import { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  Users, 
  Eye, 
  Smartphone, 
  Monitor, 
  Clock, 
  RefreshCw, 
  Search, 
  Radio, 
  User, 
  Compass, 
  Zap, 
  ArrowUpRight, 
  X, 
  Home, 
  Calendar, 
  ShieldCheck, 
  AlertCircle,
  TrendingUp,
  LogIn,
  CheckCircle2,
  FileText,
  Building2,
  MessageSquare
} from 'lucide-react';
import api from '../api';

export default function MonitoreoActividad({ onActionFinished }) {
  const [resumen, setResumen] = useState({
    usuarios_online: 0,
    activos_hoy: 0,
    interacciones_hoy: 0,
    desglose_roles: { estudiante: 0, anfitrion: 0, admin: 0 },
    rutas_populares: []
  });

  const [feed, setFeed] = useState([]);
  const [usuariosOnline, setUsuariosOnline] = useState([]);
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'usuarios' | 'rutas'
  const [filterTipo, setFilterTipo] = useState('todos');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Modal de auditoría de usuario específico
  const [selectedUserModal, setSelectedUserModal] = useState(null);
  const [userHistory, setUserHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const timerRef = useRef(null);

  const fetchData = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      const [resResumen, resFeed, resUsers] = await Promise.all([
        api.get('/auth/admin/actividad/resumen').catch(err => {
          console.warn('Fallback resumen:', err.message);
          return api.get('/admin/actividad/resumen');
        }),
        api.get(`/auth/admin/actividad/feed?tipo=${filterTipo}&limit=70`).catch(err => {
          console.warn('Fallback feed:', err.message);
          return api.get(`/admin/actividad/feed?tipo=${filterTipo}&limit=70`);
        }),
        api.get('/auth/admin/actividad/usuarios-online').catch(err => {
          console.warn('Fallback users online:', err.message);
          return api.get('/admin/actividad/usuarios-online');
        })
      ]);

      if (resResumen?.data) setResumen(resResumen.data);
      if (resFeed?.data) setFeed(resFeed.data);
      if (resUsers?.data) setUsuariosOnline(resUsers.data);
      if (onActionFinished) onActionFinished();
    } catch (err) {
      console.error('Error cargando datos de monitoreo:', err);
    } finally {
      setLoading(false);
      if (isManual) setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterTipo]);

  // Intervalo de actualización automática
  useEffect(() => {
    if (autoRefresh) {
      timerRef.current = setInterval(() => {
        fetchData(false);
      }, 12000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [autoRefresh, filterTipo]);

  // Ver historial específico de un usuario
  const handleOpenUserAudit = async (userId) => {
    setSelectedUserModal(userId);
    setLoadingHistory(true);
    try {
      const res = await api.get(`/auth/admin/actividad/usuario/${userId}`).catch(() => 
        api.get(`/admin/actividad/usuario/${userId}`)
      );
      if (res?.data) {
        setUserHistory(res.data);
      }
    } catch (err) {
      console.error('Error cargando historial de usuario:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Formateador de tiempo relativo
  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return 'Sin registro';
    const date = new Date(dateStr);
    const diff = Math.floor((Date.now() - date.getTime()) / 1000);

    if (diff < 20) return 'Hace un instante';
    if (diff < 60) return `Hace ${diff} seg`;
    if (diff < 3600) return `Hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `Hace ${Math.floor(diff / 3600)} h`;
    return date.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };

  // Iconos y colores temáticos según el evento
  const getEventMeta = (tipo) => {
    switch (tipo) {
      case 'login':
        return {
          icon: <LogIn size={15} />,
          color: '#3b82f6',
          bg: '#eff6ff',
          label: 'Inicio de Sesión'
        };
      case 'navegacion':
        return {
          icon: <Compass size={15} />,
          color: '#8b5cf6',
          bg: '#f5f3ff',
          label: 'Navegación'
        };
      case 'reserva':
        return {
          icon: <Calendar size={15} />,
          color: '#10b981',
          bg: '#ecfdf5',
          label: 'Reserva'
        };
      case 'propiedad':
        return {
          icon: <Home size={15} />,
          color: '#f59e0b',
          bg: '#fffbeb',
          label: 'Alojamiento'
        };
      case 'registro':
        return {
          icon: <User size={15} />,
          color: '#06b6d4',
          bg: '#ecfeff',
          label: 'Nuevo Registro'
        };
      default:
        return {
          icon: <Zap size={15} />,
          color: '#64748b',
          bg: '#f1f5f9',
          label: 'Acción'
        };
    }
  };

  const getRouteIcon = (ruta) => {
    if (!ruta) return <Compass size={15} style={{ color: 'var(--text-muted)' }} />;
    if (ruta === '/') return <Home size={15} style={{ color: 'var(--primary)' }} />;
    if (ruta.startsWith('/propiedad')) return <Building2 size={15} style={{ color: '#2563eb' }} />;
    if (ruta === '/mis-reservas') return <Calendar size={15} style={{ color: '#10b981' }} />;
    if (ruta === '/chat') return <MessageSquare size={15} style={{ color: '#8b5cf6' }} />;
    if (ruta === '/quienes-somos') return <Users size={15} style={{ color: '#0d7c3d' }} />;
    if (ruta.startsWith('/host')) return <ShieldCheck size={15} style={{ color: '#f59e0b' }} />;
    if (ruta === '/login') return <LogIn size={15} style={{ color: '#3b82f6' }} />;
    if (ruta === '/registro') return <User size={15} style={{ color: '#06b6d4' }} />;
    if (ruta === '/perfil') return <User size={15} style={{ color: '#6366f1' }} />;
    return <Compass size={15} style={{ color: 'var(--text-muted)' }} />;
  };

  const getRouteLabel = (ruta) => {
    if (!ruta) return 'General';
    if (ruta === '/') return 'Página Principal (Home / Explorador)';
    if (ruta.startsWith('/propiedad')) return 'Detalle de Alojamientos';
    if (ruta === '/mis-reservas') return 'Panel de Mis Reservas';
    if (ruta === '/chat') return 'Centro de Mensajería';
    if (ruta === '/quienes-somos') return 'Quiénes Somos (Territorios Solidarios)';
    if (ruta.startsWith('/host')) return 'Panel de Gestión Anfitrión';
    if (ruta === '/login') return 'Inicio de Sesión';
    if (ruta === '/registro') return 'Registro de Usuarios';
    if (ruta === '/perfil') return 'Perfil de Usuario';
    return ruta;
  };

  const filteredFeed = feed.filter(item => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const fullName = `${item.nombre || ''} ${item.apellido || ''}`.toLowerCase();
    const email = (item.email || '').toLowerCase();
    const desc = (item.descripcion || '').toLowerCase();
    const ruta = (item.ruta || '').toLowerCase();
    return fullName.includes(term) || email.includes(term) || desc.includes(term) || ruta.includes(term);
  });

  const filteredUsers = usuariosOnline.filter(u => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const fullName = `${u.nombre || ''} ${u.apellido || ''}`.toLowerCase();
    const email = (u.email || '').toLowerCase();
    const campus = (u.campus || '').toLowerCase();
    return fullName.includes(term) || email.includes(term) || campus.includes(term);
  });

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* ================= HEADER & CONTROLES EN VIVO ================= */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px',
        background: 'var(--bg-surface)',
        padding: '20px 24px',
        borderRadius: 'var(--radius)',
        boxShadow: 'var(--shadow)',
        border: '1px solid var(--border)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(13, 124, 61, 0.15), rgba(16, 185, 129, 0.25))',
            color: 'var(--primary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 8px 16px rgba(13, 124, 61, 0.12)'
          }}>
            <Activity size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{ fontSize: '1.45rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
                Monitoreo & Actividad en Vivo
              </h1>
              <span style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.72rem',
                fontWeight: 800,
                color: '#059669',
                background: '#ecfdf5',
                border: '1px solid #a7f3d0',
                padding: '3px 9px',
                borderRadius: '9999px',
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}>
                <span style={{
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 0 2px rgba(16, 185, 129, 0.3)',
                  animation: 'pulseGlow 2s infinite'
                }}></span>
                SISTEMA ACTIVO
              </span>
            </div>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Supervisa la interacción de estudiantes y anfitriones en HUASI en tiempo real
            </p>
          </div>
        </div>

        {/* Controles de Refresco */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => setAutoRefresh(v => !v)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 14px',
              borderRadius: '9999px',
              fontSize: '0.82rem',
              fontWeight: 600,
              cursor: 'pointer',
              border: autoRefresh ? '1px solid #a7f3d0' : '1px solid var(--border)',
              background: autoRefresh ? '#f0fdf4' : 'var(--bg-main)',
              color: autoRefresh ? '#15803d' : 'var(--text-muted)',
              transition: 'var(--transition)'
            }}
            title="Pausar o reanudar actualización automática cada 12s"
          >
            <Radio size={14} style={{ color: autoRefresh ? '#16a34a' : 'inherit' }} />
            {autoRefresh ? 'En vivo (12s)' : 'En vivo: Pausado'}
          </button>

          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--primary)',
              color: 'white',
              border: 'none',
              fontWeight: 600,
              fontSize: '0.85rem',
              cursor: refreshing ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 12px var(--primary-glow)',
              transition: 'var(--transition)'
            }}
          >
            <RefreshCw size={15} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>{refreshing ? 'Actualizando...' : 'Refrescar'}</span>
          </button>
        </div>
      </div>

      {/* ================= TARJETAS KPI EN TIEMPO REAL ================= */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        gap: '16px'
      }}>
        {/* KPI 1: Usuarios Online */}
        <div style={{
          background: 'var(--bg-surface)',
          padding: '20px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          position: 'relative',
          overflow: 'hidden'
        }}>
          <div style={{
            position: 'absolute',
            top: '-15px',
            right: '-15px',
            width: '80px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(16, 185, 129, 0.08)',
            pointerEvents: 'none'
          }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Usuarios Conectados Ahora
            </span>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.72rem',
              color: '#059669',
              background: '#ecfdf5',
              padding: '2px 8px',
              borderRadius: '9999px',
              fontWeight: 700
            }}>
              Últimos 15 min
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ fontSize: '2.3rem', fontWeight: 900, color: '#059669', lineHeight: 1 }}>
              {resumen.usuarios_online}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              en plataforma
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: '#047857' }}>
            <Radio size={13} />
            <span>Monitoreando actividad de navegación</span>
          </div>
        </div>

        {/* KPI 2: Activos Hoy */}
        <div style={{
          background: 'var(--bg-surface)',
          padding: '20px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Usuarios Únicos Hoy
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={16} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ fontSize: '2.3rem', fontWeight: 900, color: '#1d4ed8', lineHeight: 1 }}>
              {resumen.activos_hoy}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              sesiones registradas
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Total de personas con actividad hoy
          </div>
        </div>

        {/* KPI 3: Interacciones Registradas Hoy */}
        <div style={{
          background: 'var(--bg-surface)',
          padding: '20px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Interacciones Hoy
            </span>
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '10px',
              background: '#faf5ff',
              color: '#9333ea',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Zap size={16} />
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ fontSize: '2.3rem', fontWeight: 900, color: '#7e22ce', lineHeight: 1 }}>
              {resumen.interacciones_hoy}
            </span>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              eventos
            </span>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Navegación, reservas, clics y búsquedas
          </div>
        </div>

        {/* KPI 4: Desglose por Rol */}
        <div style={{
          background: 'var(--bg-surface)',
          padding: '20px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              Participación Activa (24h)
            </span>
            <TrendingUp size={16} style={{ color: 'var(--primary)' }} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Estudiantes</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#2563eb' }}>
                {resumen.desglose_roles?.estudiante || 0}
              </span>
            </div>
            <div style={{ width: '1px', height: '28px', background: 'var(--border)' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Anfitriones</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0d7c3d' }}>
                {resumen.desglose_roles?.anfitrion || 0}
              </span>
            </div>
            <div style={{ width: '1px', height: '28px', background: 'var(--border)' }}></div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Admins</span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: '#7c3aed' }}>
                {resumen.desglose_roles?.admin || 0}
              </span>
            </div>
          </div>
          <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
            Distribución de usuarios activos recientes
          </div>
        </div>
      </div>

      {/* ================= SELECTOR DE VISTAS Y BUSCADOR ================= */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '14px',
        background: 'var(--bg-surface)',
        padding: '14px 18px',
        borderRadius: 'var(--radius)',
        border: '1px solid var(--border)',
        boxShadow: 'var(--shadow)'
      }}>
        {/* Pestañas */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('feed')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'feed' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'feed' ? 'white' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'var(--transition)'
            }}
          >
            <Activity size={16} />
            <span>Feed de Actividad en Vivo ({filteredFeed.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('usuarios')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'usuarios' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'usuarios' ? 'white' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'var(--transition)'
            }}
          >
            <Users size={16} />
            <span>Usuarios Conectados & Recientes ({filteredUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('rutas')}
            style={{
              padding: '8px 16px',
              borderRadius: 'var(--radius-sm)',
              fontSize: '0.85rem',
              fontWeight: 700,
              cursor: 'pointer',
              border: 'none',
              background: activeTab === 'rutas' ? 'var(--primary)' : 'transparent',
              color: activeTab === 'rutas' ? 'white' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'var(--transition)'
            }}
          >
            <Compass size={16} />
            <span>Rutas Más Frecuentadas</span>
          </button>
        </div>

        {/* Buscador Rápido */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          background: 'var(--bg-main)',
          padding: '6px 14px',
          borderRadius: '9999px',
          border: '1px solid var(--border)',
          width: '100%',
          maxWidth: '300px'
        }}>
          <Search size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Buscar por usuario, ruta o acción..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              border: 'none',
              background: 'transparent',
              fontSize: '0.84rem',
              width: '100%',
              outline: 'none',
              color: 'var(--text)'
            }}
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}
            >
              <X size={14} />
            </button>
          )}
        </div>
      </div>

      {/* ================= CONTENIDO DE CADA PESTAÑA ================= */}

      {/* 1. PESTAÑA: FEED DE ACTIVIDAD EN VIVO */}
      {activeTab === 'feed' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Filtro de tipos de eventos */}
          <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
            {[
              { id: 'todos', label: 'Todos los Eventos' },
              { id: 'login', label: 'Inicios de Sesión' },
              { id: 'navegacion', label: 'Navegación' },
              { id: 'reserva', label: 'Reservas' },
              { id: 'propiedad', label: 'Alojamientos' },
              { id: 'registro', label: 'Registros' },
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setFilterTipo(f.id)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '9999px',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  border: filterTipo === f.id ? '1px solid var(--primary)' : '1px solid var(--border)',
                  background: filterTipo === f.id ? 'rgba(13, 124, 61, 0.1)' : 'var(--bg-surface)',
                  color: filterTipo === f.id ? 'var(--primary)' : 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  transition: 'var(--transition)'
                }}
              >
                {f.label}
              </button>
            ))}
          </div>

          {/* Lista de Eventos */}
          {loading ? (
            <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
              <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
              <p>Cargando feed de interacciones en vivo...</p>
            </div>
          ) : filteredFeed.length === 0 ? (
            <div style={{
              background: 'var(--bg-surface)',
              padding: '50px 20px',
              textAlign: 'center',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              color: 'var(--text-muted)'
            }}>
              <AlertCircle size={36} style={{ margin: '0 auto 12px', color: '#94a3b8' }} />
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 6px 0' }}>No se encontraron eventos</h3>
              <p style={{ fontSize: '0.85rem', margin: 0 }}>
                {searchTerm ? 'Intenta modificar el término de búsqueda.' : 'No hay interacciones registradas con el filtro seleccionado.'}
              </p>
            </div>
          ) : (
            <div style={{
              background: 'var(--bg-surface)',
              borderRadius: 'var(--radius)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow)',
              overflow: 'hidden'
            }}>
              {filteredFeed.map((item, idx) => {
                const meta = getEventMeta(item.tipo_evento);
                const fullName = item.nombre ? `${item.nombre} ${item.apellido || ''}` : 'Usuario Anónimo / Invitado';
                const role = item.role || 'estudiante';

                return (
                  <div
                    key={item.id || idx}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '16px 20px',
                      borderBottom: idx === filteredFeed.length - 1 ? 'none' : '1px solid var(--border)',
                      gap: '16px',
                      flexWrap: 'wrap',
                      transition: 'background 0.2s ease',
                      cursor: item.user_id ? 'pointer' : 'default'
                    }}
                    onClick={() => item.user_id && handleOpenUserAudit(item.user_id)}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    {/* Lado Izquierdo: Icono + Avatar + Detalle */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '280px' }}>
                      {/* Icono de Tipo de Evento */}
                      <div style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '12px',
                        background: meta.bg,
                        color: meta.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {meta.icon}
                      </div>

                      {/* Info de Usuario y Acción */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text)' }}>
                            {fullName}
                          </span>

                          {/* Badge de Rol */}
                          <span style={{
                            fontSize: '0.68rem',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            background: role === 'anfitrion' ? 'rgba(13, 124, 61, 0.1)' : role === 'admin' ? 'rgba(124, 58, 237, 0.1)' : 'rgba(37, 99, 235, 0.1)',
                            color: role === 'anfitrion' ? 'var(--primary)' : role === 'admin' ? '#7c3aed' : '#2563eb'
                          }}>
                            {role}
                          </span>

                          {/* Indicador Online */}
                          {item.is_online && (
                            <span style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              fontSize: '0.68rem',
                              color: '#059669',
                              fontWeight: 700
                            }}>
                              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }}></span>
                              En línea
                            </span>
                          )}

                          {item.campus && (
                            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                              &bull; {item.campus}
                            </span>
                          )}
                        </div>

                        {/* Descripción de la acción */}
                        <div style={{ fontSize: '0.86rem', color: 'var(--text)' }}>
                          {item.descripcion}
                        </div>

                        {/* Ruta y dispositivo */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                          {item.ruta && (
                            <span style={{
                              fontFamily: 'monospace',
                              background: 'var(--bg-main)',
                              padding: '1px 6px',
                              borderRadius: '4px',
                              border: '1px solid var(--border)'
                            }}>
                              {item.ruta}
                            </span>
                          )}

                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            {item.dispositivo === 'Móvil' ? <Smartphone size={12} /> : <Monitor size={12} />}
                            {item.dispositivo || 'Escritorio'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Lado Derecho: Fecha/Hora y Botón */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexShrink: 0 }}>
                      <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>
                          {formatTimeAgo(item.created_at)}
                        </span>
                        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {new Date(item.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {item.user_id && (
                        <button
                          style={{
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            fontSize: '0.76rem',
                            fontWeight: 600,
                            color: 'var(--text)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            cursor: 'pointer'
                          }}
                        >
                          <span>Auditar</span>
                          <ArrowUpRight size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 2. PESTAÑA: USUARIOS CONECTADOS & RECIENTES */}
      {activeTab === 'usuarios' && (
        <div style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          overflow: 'hidden'
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', background: 'var(--bg-main)' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              Supervisión de Presencia y Última Actividad
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              Lista de usuarios con conexión reciente ordenados por presencia en vivo
            </p>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-surface-hover)', borderBottom: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
                  <th style={{ padding: '12px 18px' }}>Usuario</th>
                  <th style={{ padding: '12px 18px' }}>Rol & Sede</th>
                  <th style={{ padding: '12px 18px' }}>Estado</th>
                  <th style={{ padding: '12px 18px' }}>Última Acción / Ruta</th>
                  <th style={{ padding: '12px 18px' }}>Dispositivo</th>
                  <th style={{ padding: '12px 18px' }}>Último Acceso</th>
                  <th style={{ padding: '12px 18px', textAlign: 'center' }}>Historial</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No se encontraron usuarios activos con los criterios de búsqueda.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u, idx) => (
                    <tr
                      key={u.id || idx}
                      style={{
                        borderBottom: idx === filteredUsers.length - 1 ? 'none' : '1px solid var(--border)',
                        transition: 'background 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-surface-hover)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {/* Usuario */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: u.foto_perfil ? `url(${u.foto_perfil}) center/cover` : 'linear-gradient(135deg, var(--primary), #0a6432)',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 800,
                            fontSize: '0.82rem',
                            flexShrink: 0
                          }}>
                            {!u.foto_perfil && (u.nombre ? u.nombre.charAt(0).toUpperCase() : 'U')}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: 'var(--text)' }}>
                              {u.nombre} {u.apellido}
                            </div>
                            <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                              {u.email}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Rol & Sede */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          <span style={{
                            display: 'inline-block',
                            width: 'fit-content',
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            padding: '2px 8px',
                            borderRadius: '9999px',
                            background: u.role === 'anfitrion' ? 'rgba(13, 124, 61, 0.1)' : 'rgba(37, 99, 235, 0.1)',
                            color: u.role === 'anfitrion' ? 'var(--primary)' : '#2563eb'
                          }}>
                            {u.role}
                          </span>
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                            {u.campus || 'Sede Principal'}
                          </span>
                        </div>
                      </td>

                      {/* Estado */}
                      <td style={{ padding: '14px 18px' }}>
                        {u.is_online ? (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 800,
                            color: '#047857',
                            background: '#ecfdf5',
                            border: '1px solid #a7f3d0'
                          }}>
                            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981', animation: 'pulseGlow 1.5s infinite' }}></span>
                            EN LÍNEA
                          </span>
                        ) : (
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '9999px',
                            fontSize: '0.75rem',
                            fontWeight: 600,
                            color: '#64748b',
                            background: '#f1f5f9'
                          }}>
                            Desconectado
                          </span>
                        )}
                      </td>

                      {/* Última Acción */}
                      <td style={{ padding: '14px 18px', maxWidth: '240px' }}>
                        <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: 600 }}>
                          {u.ultima_accion || 'Navegación'}
                        </div>
                        {u.ultima_ruta && (
                          <span style={{ fontSize: '0.74rem', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                            {u.ultima_ruta}
                          </span>
                        )}
                      </td>

                      {/* Dispositivo */}
                      <td style={{ padding: '14px 18px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {u.dispositivo === 'Móvil' ? <Smartphone size={14} /> : <Monitor size={14} />}
                          {u.dispositivo || 'Escritorio'}
                        </span>
                      </td>

                      {/* Último Acceso */}
                      <td style={{ padding: '14px 18px' }}>
                        <div style={{ fontWeight: 600 }}>
                          {formatTimeAgo(u.ultimo_acceso)}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {u.ultimo_acceso ? new Date(u.ultimo_acceso).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </div>
                      </td>

                      {/* Acción Auditar */}
                      <td style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <button
                          onClick={() => handleOpenUserAudit(u.id)}
                          style={{
                            background: 'var(--bg-main)',
                            border: '1px solid var(--border)',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            color: 'var(--primary)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <Eye size={13} />
                          <span>Ver Logs</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. PESTAÑA: RUTAS POPULARES & ESTADÍSTICAS */}
      {activeTab === 'rutas' && (
        <div style={{
          background: 'var(--bg-surface)',
          padding: '24px',
          borderRadius: 'var(--radius)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow)',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--text)' }}>
              Secciones Más Frecuentadas en las Últimas 24 Horas
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Muestra las páginas donde los estudiantes y anfitriones concentran su navegación
            </p>
          </div>

          {resumen.rutas_populares && resumen.rutas_populares.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {resumen.rutas_populares.map((r, i) => {
                const maxVisits = Math.max(...resumen.rutas_populares.map(item => parseInt(item.visitas, 10) || 1));
                const percent = Math.min(100, Math.round(((parseInt(r.visitas, 10) || 0) / maxVisits) * 100));

                return (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.88rem', fontWeight: 600 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {getRouteIcon(r.ruta)}
                        <span style={{ color: 'var(--text)' }}>{getRouteLabel(r.ruta)}</span>
                      </div>
                      <span style={{ color: 'var(--primary)', fontWeight: 800 }}>{r.visitas} visitas</span>
                    </div>
                    <div style={{
                      width: '100%',
                      height: '8px',
                      background: 'var(--bg-main)',
                      borderRadius: '9999px',
                      overflow: 'hidden',
                      border: '1px solid var(--border)'
                    }}>
                      <div style={{
                        width: `${percent}%`,
                        height: '100%',
                        background: 'linear-gradient(90deg, var(--primary), #10b981)',
                        borderRadius: '9999px',
                        transition: 'width 0.6s ease'
                      }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
              No hay suficientes registros de rutas en las últimas 24 horas.
            </div>
          )}
        </div>
      )}

      {/* ================= MODAL DE AUDITORÍA INDIVIDUAL POR USUARIO ================= */}
      {selectedUserModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 99999,
          padding: '20px'
        }}>
          <div style={{
            background: 'var(--bg-surface)',
            width: '100%',
            maxWidth: '680px',
            maxHeight: '85vh',
            borderRadius: '24px',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Cabecera del Modal */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              background: 'var(--bg-main)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '12px',
                  background: 'rgba(13, 124, 61, 0.1)',
                  color: 'var(--primary)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <FileText size={20} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)' }}>
                    Historial de Interacciones
                  </h3>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    Auditoría cronológica de navegación y acciones
                  </p>
                </div>
              </div>

              <button
                onClick={() => { setSelectedUserModal(null); setUserHistory([]); }}
                style={{
                  border: 'none',
                  background: 'var(--bg-surface)',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: 'var(--text-muted)'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Contenido del Modal */}
            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {loadingHistory ? (
                <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                  <div className="spinner" style={{ margin: '0 auto 12px' }}></div>
                  <p>Cargando eventos del usuario...</p>
                </div>
              ) : userHistory?.usuario ? (
                <>
                  {/* Tarjeta del Usuario */}
                  <div style={{
                    padding: '16px',
                    borderRadius: '16px',
                    background: 'var(--bg-main)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{
                        width: '44px',
                        height: '44px',
                        borderRadius: '50%',
                        background: userHistory.usuario.foto_perfil ? `url(${userHistory.usuario.foto_perfil}) center/cover` : 'linear-gradient(135deg, var(--primary), #0a6432)',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 800
                      }}>
                        {!userHistory.usuario.foto_perfil && (userHistory.usuario.nombre ? userHistory.usuario.nombre.charAt(0).toUpperCase() : 'U')}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: '0.96rem', color: 'var(--text)' }}>
                          {userHistory.usuario.nombre} {userHistory.usuario.apellido}
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                          {userHistory.usuario.email} &bull; {userHistory.usuario.campus || 'Sede no asignada'}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        textTransform: 'uppercase',
                        padding: '3px 9px',
                        borderRadius: '9999px',
                        background: userHistory.usuario.role === 'anfitrion' ? 'rgba(13, 124, 61, 0.1)' : 'rgba(37, 99, 235, 0.1)',
                        color: userHistory.usuario.role === 'anfitrion' ? 'var(--primary)' : '#2563eb'
                      }}>
                        {userHistory.usuario.role}
                      </span>
                      {userHistory.usuario.is_online ? (
                        <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#047857', background: '#ecfdf5', padding: '3px 8px', borderRadius: '9999px', border: '1px solid #a7f3d0' }}>
                          En Línea
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.72rem', color: '#64748b', background: '#f1f5f9', padding: '3px 8px', borderRadius: '9999px' }}>
                          Desconectado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Lista Cronológica de Eventos */}
                  <div>
                    <h4 style={{ margin: '0 0 12px 0', fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                      Línea de Tiempo de Actividades ({userHistory.actividades?.length || 0})
                    </h4>

                    {(!userHistory.actividades || userHistory.actividades.length === 0) ? (
                      <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', textAlign: 'center', padding: '20px' }}>
                        No hay eventos registrados recientemente para este usuario.
                      </p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        {userHistory.actividades.map((act, idx) => {
                          const meta = getEventMeta(act.tipo_evento);
                          return (
                            <div
                              key={act.id || idx}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: '1px solid var(--border)',
                                background: 'var(--bg-surface)'
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <div style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '8px',
                                  background: meta.bg,
                                  color: meta.color,
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center'
                                }}>
                                  {meta.icon}
                                </div>
                                <div>
                                  <div style={{ fontWeight: 600, fontSize: '0.86rem', color: 'var(--text)' }}>
                                    {act.descripcion}
                                  </div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                                    {act.ruta && <span>Ruta: <code>{act.ruta}</code></span>}
                                    <span>&bull; {act.dispositivo || 'Escritorio'}</span>
                                  </div>
                                </div>
                              </div>
                              <div style={{ textAlign: 'right', fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                                <div>{formatTimeAgo(act.created_at)}</div>
                                <div>{new Date(act.created_at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Usuario no encontrado.</p>
              )}
            </div>

            {/* Pie del modal */}
            <div style={{
              padding: '14px 24px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
              background: 'var(--bg-main)'
            }}>
              <button
                onClick={() => { setSelectedUserModal(null); setUserHistory([]); }}
                style={{
                  padding: '8px 18px',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)',
                  background: 'var(--bg-surface)',
                  fontWeight: 600,
                  fontSize: '0.84rem',
                  cursor: 'pointer',
                  color: 'var(--text)'
                }}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Estilos CSS para animaciones */}
      <style>{`
        @keyframes pulseGlow {
          0% { transform: scale(0.95); opacity: 0.8; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1.1); opacity: 1; box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); opacity: 0.8; box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
