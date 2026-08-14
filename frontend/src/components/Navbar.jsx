import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, CheckCircle2, Building, ShieldCheck, Menu, X, Sun, Moon, Download, Smartphone } from 'lucide-react';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(
    localStorage.getItem('theme') === 'dark' || 
    (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches)
  );

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      document.body.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [darkMode]);

  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallPWA = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (menuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [menuOpen]);

  const handleLogout = () => {
    logout();
    navigate('/');
    setMenuOpen(false);
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      {/* Brand & Sponsors */}
      <div className="flex items-center gap-2">
        {/* HUASI Logo */}
        <Link to="/" className="navbar-brand flex items-center gap-2.5 no-underline group select-none mr-2 logo-container">
          <img 
            src="/huasi-monograma.png" 
            alt="HUASI Monograma" 
            className="h-[38px] w-[38px] object-contain group-hover:scale-105 transition-transform duration-300 max-[480px]:h-[32px] max-[480px]:w-[32px]"
          />
          <span className="font-heading font-black text-2xl text-ucc-navy dark:text-white tracking-tight">HUASI</span>
        </Link>

      </div>

      {/* Desktop Navigation Links */}
      <div className="navbar-links flex items-center gap-2 md:gap-3">
        <Link
          to="/"
          className={`px-4 py-2 rounded-full font-body text-sm font-semibold transition-all duration-200 ${
            isActive('/') 
              ? 'bg-ucc-green-light text-ucc-green' 
              : 'text-ucc-muted hover:bg-ucc-green-light hover:text-ucc-green'
          }`}
        >
          Explorar
        </Link>

        <Link
          to="/quienes-somos"
          className={`px-4 py-2 rounded-full font-body text-sm font-semibold transition-all duration-200 ${
            isActive('/quienes-somos') 
              ? 'bg-ucc-green-light text-ucc-green' 
              : 'text-ucc-muted hover:bg-ucc-green-light hover:text-ucc-green'
          }`}
        >
          ¿Quiénes Somos?
        </Link>

        {user ? (
          <>
            {user.verificado && (
              <span className="hidden sm:inline-flex items-center gap-1 bg-ucc-green-light text-ucc-green px-3 py-1 rounded-full text-xs font-bold border border-ucc-green/20">
                <CheckCircle2 size={12} className="stroke-[2.5]" /> Verificado
              </span>
            )}

            {/* Admin panel link */}
            {user.role === 'admin' && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-1.5 bg-gradient-to-r from-ucc-cyan to-ucc-green text-white px-4 py-1.5 rounded-full text-xs font-bold hover:shadow-custom transition-all duration-200"
              >
                <ShieldCheck size={14} /> Admin
              </Link>
            )}

            <Link
              to="/mis-reservas"
              className={`px-4 py-2 rounded-full font-body text-sm font-semibold transition-all duration-200 ${
                isActive('/mis-reservas') 
                  ? 'bg-ucc-green-light text-ucc-green' 
                  : 'text-ucc-muted hover:bg-ucc-green-light hover:text-ucc-green'
              }`}
            >
              Mis reservas
            </Link>

            <Link
              to="/host"
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-body text-sm font-semibold transition-all duration-200 ${
                isActive('/host') 
                  ? 'bg-ucc-green-light text-ucc-green' 
                  : 'text-ucc-muted hover:bg-ucc-green-light hover:text-ucc-green'
              }`}
            >
              <Building size={14} /> Anfitrión
            </Link>



            <Link
              to="/perfil"
              className="inline-flex items-center gap-1.5 bg-ucc-bg border border-ucc-border px-4 py-2 rounded-full font-body text-sm font-bold text-ucc-navy hover:bg-ucc-green-light hover:border-ucc-green/20 transition-all duration-200"
            >
              <User size={14} /> {user?.nombre ? user.nombre.split(' ')[0] : 'Perfil'}
            </Link>

            <button 
              onClick={handleLogout} 
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-body text-sm font-semibold text-ucc-muted hover:bg-red-50 hover:text-red-600 transition-all duration-200"
            >
              <LogOut size={14} /> Salir
            </button>
          </>
        ) : (
          <>
            <Link 
              to="/login" 
              className="px-4 py-2 rounded-full font-body text-sm font-semibold text-ucc-muted hover:bg-ucc-green-light hover:text-ucc-green transition-all duration-200"
            >
              Ingresar
            </Link>
            <Link 
              to="/registro" 
              className="bg-gradient-to-r from-ucc-green to-emerald-600 hover:from-ucc-green-hover hover:to-emerald-700 text-white px-5 py-2 rounded-full font-body text-sm font-bold shadow-custom hover:shadow-custom-md hover:-translate-y-0.5 transition-all duration-200"
            >
              Registrarse
            </Link>
          </>
        )}
        {deferredPrompt && (
          <button
            onClick={handleInstallPWA}
            className="inline-flex items-center gap-1.5 bg-ucc-green/10 text-ucc-green hover:bg-ucc-green hover:text-white px-3.5 py-1.5 rounded-full text-xs font-bold transition-all duration-200 border border-ucc-green/30 cursor-pointer"
            title="Instalar StayU HUASI en tu dispositivo"
          >
            <Smartphone size={14} /> Instalar App
          </button>
        )}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="inline-flex items-center justify-center p-2 rounded-full hover:bg-ucc-green-light transition-all duration-200"
          style={{ border: 'none', background: 'transparent', cursor: 'pointer', outline: 'none' }}
          title={darkMode ? 'Activar modo claro' : 'Activar modo oscuro'}
        >
          {darkMode ? <Sun size={18} className="text-amber-500 fill-amber-500 animate-pulse" /> : <Moon size={18} className="text-ucc-muted" />}
        </button>
      </div>

      {/* Mobile Hamburger Button */}
      <button 
        className="mobile-menu-toggle"
        onClick={() => setMenuOpen(!menuOpen)}
        aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
      >
        {menuOpen ? <X size={22} /> : <Menu size={22} />}
      </button>

      {/* Mobile Overlay */}
      <div 
        className={`mobile-nav-overlay ${menuOpen ? 'open' : ''}`}
        onClick={() => setMenuOpen(false)}
      />

      {/* Mobile Navigation Menu */}
      <div className={`mobile-nav-menu ${menuOpen ? 'open' : ''}`}>
        <Link to="/" onClick={() => setMenuOpen(false)} className={isActive('/') ? 'mobile-nav-active' : ''}>
          Explorar
        </Link>
        <Link to="/quienes-somos" onClick={() => setMenuOpen(false)} className={isActive('/quienes-somos') ? 'mobile-nav-active' : ''}>
          ¿Quiénes Somos?
        </Link>

        {user ? (
          <>
            <div className="mobile-nav-divider" />



            {user.verificado && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: '0.82rem', color: '#0d7c3d', fontWeight: 700 }}>
                <CheckCircle2 size={14} /> Estudiante Verificado
              </div>
            )}

            {user.role === 'admin' && (
              <Link to="/admin" onClick={() => setMenuOpen(false)} className={isActive('/admin') ? 'mobile-nav-active' : ''}>
                <ShieldCheck size={16} /> Panel Admin
              </Link>
            )}

            <Link to="/mis-reservas" onClick={() => setMenuOpen(false)} className={isActive('/mis-reservas') ? 'mobile-nav-active' : ''}>
              Mis reservas
            </Link>

            <Link to="/host" onClick={() => setMenuOpen(false)} className={isActive('/host') ? 'mobile-nav-active' : ''}>
              <Building size={16} /> Anfitrión
            </Link>

            <Link to="/perfil" onClick={() => setMenuOpen(false)} className={isActive('/perfil') ? 'mobile-nav-active' : ''}>
              <User size={16} /> {user?.nombre ? user.nombre.split(' ')[0] : 'Mi Perfil'} — Mi Perfil
            </Link>

            <div className="mobile-nav-divider" />

            <button onClick={handleLogout} style={{ color: '#dc2626' }}>
              <LogOut size={16} /> Cerrar sesión
            </button>
          </>
        ) : (
          <>
            <div className="mobile-nav-divider" />
            <Link to="/login" onClick={() => setMenuOpen(false)}>
              Ingresar
            </Link>
            <Link to="/registro" onClick={() => setMenuOpen(false)} className="mobile-nav-primary">
              Registrarse
            </Link>
          </>
        )}
        <div className="mobile-nav-divider" />
        <button 
          onClick={() => setDarkMode(!darkMode)}
          style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', padding: '12px 16px', fontSize: '1rem', fontWeight: 600, color: 'var(--text)' }}
        >
          {darkMode ? (
            <>
              <Sun size={18} className="text-amber-500 fill-amber-500" /> <span>Tema Claro</span>
            </>
          ) : (
            <>
              <Moon size={18} className="text-ucc-muted" /> <span>Tema Oscuro</span>
            </>
          )}
        </button>
      </div>
    </nav>
  );
}
