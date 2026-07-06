import { Routes, Route, Navigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import { CheckSquare, Users, ShieldAlert, LogOut, Shield, Home } from 'lucide-react';
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

  const isLinkActive = (path) => {
    return location.pathname === path;
  };

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

  return (
    <div style={{ display: 'flex', minHeight: '100vh', flexDirection: 'column', backgroundColor: 'var(--bg-main)' }}>
      {/* Navbar superior */}
      {user && (
        <nav className="navbar" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '1.3rem', fontWeight: 800 }}>
            <Shield size={24} color="var(--primary)" /> 
            <span>HUASI UCC</span> 
            <span style={{ 
              fontSize: '0.7rem', 
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
          <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
              Conectado como: <strong style={{ color: 'var(--text)' }}>{user.email}</strong>
            </span>
            <button 
              onClick={logout} 
              className="btn btn-danger" 
              style={{ padding: '8px 16px', borderRadius: 8, fontSize: '0.85rem' }}
            >
              <LogOut size={15} /> Salir
            </button>
          </div>
        </nav>
      )}

      {/* Cuerpo con Sidebar + Contenido */}
      <div style={{ display: 'flex', flex: 1 }}>
        {user && (
          <aside style={{ 
            width: 260, 
            background: 'var(--bg-navbar)', 
            borderRight: '1px solid var(--border)', 
            display: 'flex', 
            flexDirection: 'column', 
            padding: 24, 
            gap: 8 
          }}>
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
            <Link 
              to="/" 
              style={getLinkStyle('/')} 
              onMouseEnter={e => { if(!isLinkActive('/')) e.currentTarget.style.background = 'rgba(15, 23, 42, 0.04)'; }} 
              onMouseLeave={e => { if(!isLinkActive('/')) e.currentTarget.style.background = 'transparent'; }}
            >
              <CheckSquare size={18} /> Verificaciones
            </Link>
            <Link 
              to="/usuarios" 
              style={getLinkStyle('/usuarios')} 
              onMouseEnter={e => { if(!isLinkActive('/usuarios')) e.currentTarget.style.background = 'rgba(15, 23, 42, 0.04)'; }} 
              onMouseLeave={e => { if(!isLinkActive('/usuarios')) e.currentTarget.style.background = 'transparent'; }}
            >
              <Users size={18} /> Usuarios
            </Link>
            <Link 
              to="/alojamientos" 
              style={getLinkStyle('/alojamientos')} 
              onMouseEnter={e => { if(!isLinkActive('/alojamientos')) e.currentTarget.style.background = 'rgba(15, 23, 42, 0.04)'; }} 
              onMouseLeave={e => { if(!isLinkActive('/alojamientos')) e.currentTarget.style.background = 'transparent'; }}
            >
              <Home size={18} /> Alojamientos
            </Link>
            <Link 
              to="/reportes" 
              style={getLinkStyle('/reportes')} 
              onMouseEnter={e => { if(!isLinkActive('/reportes')) e.currentTarget.style.background = 'rgba(15, 23, 42, 0.04)'; }} 
              onMouseLeave={e => { if(!isLinkActive('/reportes')) e.currentTarget.style.background = 'transparent'; }}
            >
              <ShieldAlert size={18} /> PQRs
            </Link>
          </aside>
        )}

        <main style={{ flex: 1, padding: '40px 32px', background: 'var(--bg-main)' }}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            } />
            <Route path="/usuarios" element={
              <ProtectedRoute>
                <Usuarios />
              </ProtectedRoute>
            } />
            <Route path="/alojamientos" element={
              <ProtectedRoute>
                <Alojamientos />
              </ProtectedRoute>
            } />
            <Route path="/reportes" element={
              <ProtectedRoute>
                <Reportes />
              </ProtectedRoute>
            } />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;
