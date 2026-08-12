import { useState } from 'react';
import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { CheckSquare, Users, ShieldAlert, LogOut, Shield, Home, Menu, X } from 'lucide-react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Usuarios from './pages/Usuarios';
import Reportes from './pages/Reportes';
import Alojamientos from './pages/Alojamientos';

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading"><div className="spinner"></div></div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

function App() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isLinkActive = (path) => location.pathname === path;

  const getLinkStyle = (path) => {
    const isActive = isLinkActive(path);
    return {
      color: isActive ? 'var(--primary)' : 'var(--text-muted)',
      textDecoration: 'none',
      padding: '12px 18px',
      borderRadius: 'var(--radius-sm)',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      fontWeight: 600,
      background: isActive ? 'var(--success-bg)' : 'transparent',
      border: isActive ? '1px solid rgba(13, 124, 61, 0.2)' : '1px solid transparent',
      transition: 'var(--transition)',
      fontSize: '0.95rem'
    };
  };

  const navLinks = [
    { to: '/', icon: <CheckSquare size={18} />, label: 'Verificaciones' },
    { to: '/usuarios', icon: <Users size={18} />, label: 'Usuarios' },
    { to: '/alojamientos', icon: <Home size={18} />, label: 'Alojamientos' },
    { to: '/reportes', icon: <ShieldAlert size={18} />, label: 'PQRs' },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', backgroundColor: 'var(--bg-main)' }}>
      {/* Navbar superior */}
      {user && (
        <nav className="navbar" style={{ position: 'sticky', top: 0, zIndex: 200 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            {/* Hamburger — solo visible en mobile via CSS */}
            <button
              className="hamburger-btn"
              onClick={() => setSidebarOpen(o => !o)}
              aria-label="Toggle menu"
            >
              {sidebarOpen ? <X size={22} /> : <Menu size={22} />}
            </button>

            <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.15rem', fontWeight: 800 }}>
              <Shield size={22} color="var(--primary)" />
              <span className="brand-text">HUASI UCC</span>
              <span style={{
                fontSize: '0.65rem',
                background: 'var(--primary)',
                color: 'white',
                padding: '3px 8px',
                borderRadius: 6,
                fontWeight: 800,
                letterSpacing: '0.5px'
              }}>
                ADMIN
              </span>
            </h1>
          </div>

          <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
            <span className="user-email-text" style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              <strong style={{ color: 'var(--text)' }}>{user.nombre || user.email}</strong>
            </span>
            <button
              onClick={logout}
              className="btn btn-danger"
              style={{ padding: '8px 14px', borderRadius: 8, fontSize: '0.85rem' }}
            >
              <LogOut size={15} />
              <span className="logout-text">Salir</span>
            </button>
          </div>
        </nav>
      )}

      {/* Overlay oscuro — mobile sidebar abierto */}
      {user && sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Cuerpo con Sidebar + Contenido */}
      <div style={{ display: 'flex', flex: 1, position: 'relative' }}>
        {user && (
          <aside className={`admin-sidebar ${sidebarOpen ? 'sidebar-open' : ''}`}>
            <h4 style={{
              color: '#94a3b8',
              textTransform: 'uppercase',
              fontSize: '0.72rem',
              fontWeight: 800,
              letterSpacing: '1.5px',
              marginBottom: 16
            }}>
              Menú Principal
            </h4>

            {navLinks.map(({ to, icon, label }) => (
              <Link
                key={to}
                to={to}
                style={getLinkStyle(to)}
                onClick={() => setSidebarOpen(false)}
                onMouseEnter={e => { if (!isLinkActive(to)) e.currentTarget.style.background = 'rgba(15, 23, 42, 0.04)'; }}
                onMouseLeave={e => { if (!isLinkActive(to)) e.currentTarget.style.background = 'transparent'; }}
              >
                {icon} {label}
              </Link>
            ))}
          </aside>
        )}

        <main className="admin-main">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute><Dashboard /></ProtectedRoute>
            } />
            <Route path="/usuarios" element={
              <ProtectedRoute><Usuarios /></ProtectedRoute>
            } />
            <Route path="/alojamientos" element={
              <ProtectedRoute><Alojamientos /></ProtectedRoute>
            } />
            <Route path="/reportes" element={
              <ProtectedRoute><Reportes /></ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
