import { useState, useEffect } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import api from './api';
import { 
  CheckSquare, Users, ShieldAlert, LogOut, Shield, Home, 
  Menu, X, BarChart3, Building2, ShieldCheck, UserCheck,
  Activity, Bell, FileText
} from 'lucide-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Usuarios from './pages/Usuarios';
import Reportes from './pages/Reportes';
import Alojamientos from './pages/Alojamientos';
import EstadisticasMensuales from './pages/EstadisticasMensuales';
import MonitoreoActividad from './pages/MonitoreoActividad';
import useActivityTracker from './hooks/useActivityTracker';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const { user, logout } = useAuth();
  useActivityTracker();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [counters, setCounters] = useState({
    verificaciones_pendientes: 0,
    alojamientos_pendientes: 0,
    reportes_abiertos: 0,
    total_usuarios: 0,
    usuarios_online: 0
  });

  const fetchCounters = async () => {
    if (!user) return;
    try {
      const res = await api.get('/auth/admin/sidebar-counters').catch(() => api.get('/admin/sidebar-counters'));
      if (res?.data) {
        setCounters(res.data);
      }
    } catch (err) {
      console.warn('Error cargando contadores admin:', err.message);
    }
  };

  useEffect(() => {
    fetchCounters();
    const interval = setInterval(fetchCounters, 15000); // Actualización periódica en vivo
    return () => clearInterval(interval);
  }, [user]);

  const isLinkActive = (path) => location.pathname === path;

  const navLinks = [
    { 
      to: '/', 
      icon: <CheckSquare size={18} />, 
      label: 'Verificaciones',
      badge: counters.verificaciones_pendientes,
      badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
    },
    { 
      to: '/usuarios', 
      icon: <Users size={18} />, 
      label: 'Usuarios',
      badge: null
    },
    { 
      to: '/monitoreo', 
      icon: <Activity size={18} />, 
      label: 'Monitoreo & Actividad',
      badge: counters.usuarios_online > 0 ? `${counters.usuarios_online} online` : null,
      badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300'
    },
    { 
      to: '/alojamientos', 
      icon: <Home size={18} />, 
      label: 'Alojamientos',
      badge: counters.alojamientos_pendientes,
      badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
    },
    { 
      to: '/reportes', 
      icon: <ShieldAlert size={18} />, 
      label: 'PQRs & Alertas',
      badge: counters.reportes_abiertos,
      badgeColor: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300'
    },
    { 
      to: '/estadisticas', 
      icon: <BarChart3 size={18} />, 
      label: 'Estadísticas e Informes',
      badge: null
    },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', backgroundColor: 'var(--bg-main)' }}>
      {/* Navbar Superior de Gestión */}
      {user && (
        <nav className="navbar" style={{ position: 'sticky', top: 0, zIndex: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {/* Hamburger para móviles */}
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(o => !o)}
              aria-label="Alternar menú"
            >
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.2rem', fontWeight: 900 }}>
              <img src="/huasi-monograma.png" alt="HUASI" style={{ height: 28, width: 28, objectFit: 'contain' }} />
              <span className="brand-text" style={{ letterSpacing: '-0.02em' }}>HUASI</span>
              <span style={{
                fontSize: '0.68rem',
                background: 'linear-gradient(135deg, var(--primary), #0d7c3d)',
                color: 'white',
                padding: '3px 9px',
                borderRadius: 9999,
                fontWeight: 800,
                letterSpacing: '0.5px',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4
              }}>
                <ShieldCheck size={11} /> ADMIN UCC
              </span>
            </h1>
          </div>

          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            {/* Estado del Servidor */}
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-full text-xs font-bold text-emerald-700 dark:text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>Servidor Activo</span>
            </div>

            {/* Perfil del Funcionario */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'var(--primary)',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.85rem'
              }}>
                {user.nombre ? user.nombre.charAt(0).toUpperCase() : 'A'}
              </div>
              <span className="user-email-text" style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                <strong style={{ color: 'var(--text)' }}>{user.nombre || user.email}</strong>
              </span>
            </div>

            <button
              onClick={logout}
              className="btn btn-danger"
              style={{ padding: '7px 14px', borderRadius: 8, fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <LogOut size={14} />
              <span className="logout-text">Cerrar Sesión</span>
            </button>
          </div>
        </nav>
      )}

      {/* Overlay oscuro en mobile */}
      {user && sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Cuerpo con Sidebar + Contenido */}
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {user && (
          <aside className={`admin-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`} style={{ minWidth: 260, width: 260 }}>
            
            {/* Tarjeta de Identidad Institucional — Logos */}
            <div style={{
              background: 'rgba(13, 124, 61, 0.05)',
              border: '1px solid rgba(13, 124, 61, 0.15)',
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 20
            }}>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.68rem', fontWeight: 800, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
                Comisión de Verificación
              </p>
              {/* Logos institucionales */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <img
                  src="/ucc_logo.png"
                  alt="UCC"
                  style={{ height: 22, objectFit: 'contain', opacity: 0.9 }}
                  title="Universidad Cooperativa de Colombia"
                />
                <div style={{ width: 1, height: 16, background: 'rgba(13,124,61,0.25)' }} />
                <img
                  src="/indesco.png"
                  alt="INDESCO"
                  style={{ height: 18, objectFit: 'contain', opacity: 0.85 }}
                  title="INDESCO"
                />
                <div style={{ width: 1, height: 16, background: 'rgba(13,124,61,0.25)' }} />
                <img
                  src="/territorios_solidarios.png"
                  alt="Territorios Solidarios"
                  style={{ height: 18, objectFit: 'contain', opacity: 0.85 }}
                  title="Territorios Solidarios"
                />
              </div>
            </div>

            <h4 style={{
              color: '#94a3b8',
              textTransform: 'uppercase',
              fontSize: '0.70rem',
              fontWeight: 800,
              letterSpacing: '1.5px',
              marginBottom: 12,
              paddingLeft: 4
            }}>
              Módulos de Gestión
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {navLinks.map(({ to, icon, label, badge, badgeColor }) => {
                const active = isLinkActive(to);
                return (
                  <Link
                    key={to}
                    to={to}
                    onClick={() => setSidebarOpen(false)}
                    style={{
                      color: active ? 'var(--primary)' : 'var(--text-muted)',
                      textDecoration: 'none',
                      padding: '11px 16px',
                      borderRadius: 'var(--radius-sm)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      fontWeight: active ? 700 : 600,
                      background: active ? 'var(--success-bg)' : 'transparent',
                      border: active ? '1px solid rgba(13, 124, 61, 0.25)' : '1px solid transparent',
                      transition: 'all 0.2s ease',
                      fontSize: '0.92rem'
                    }}
                    onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(15, 23, 42, 0.04)'; }}
                    onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {icon}
                      <span>{label}</span>
                    </div>
                    {badge > 0 && (
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        padding: '2px 8px',
                        borderRadius: 9999,
                        background: active ? 'var(--primary)' : '#e2e8f0',
                        color: active ? 'white' : '#334155'
                      }}>
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </aside>
        )}

        <main className="admin-main" style={{ flex: 1, padding: '24px' }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute><Dashboard onActionFinished={fetchCounters} /></ProtectedRoute>
            } />
            <Route path="/usuarios" element={
              <ProtectedRoute><Usuarios onActionFinished={fetchCounters} /></ProtectedRoute>
            } />
            <Route path="/monitoreo" element={
              <ProtectedRoute><MonitoreoActividad onActionFinished={fetchCounters} /></ProtectedRoute>
            } />
            <Route path="/alojamientos" element={
              <ProtectedRoute><Alojamientos onActionFinished={fetchCounters} /></ProtectedRoute>
            } />
            <Route path="/reportes" element={
              <ProtectedRoute><Reportes onActionFinished={fetchCounters} /></ProtectedRoute>
            } />
            <Route path="/estadisticas" element={
              <ProtectedRoute><EstadisticasMensuales /></ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;

