import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogOut, User, CheckCircle2, Building, ShieldCheck, Menu, X, Sun, Moon, Download, Smartphone } from 'lucide-react';
import HuasiAlert from '../utils/alerts';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('theme') !== 'light');

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

  const handleLogout = async () => {
    const confirmed = await HuasiAlert.confirm({
      title: '¿Cerrar sesión?',
      text: '¿Estás seguro de que deseas salir de tu cuenta en HUASI?',
      confirmText: 'Sí, salir',
      cancelText: 'Permanecer',
      icon: 'question',
    });

    if (confirmed) {
      logout();
      navigate('/');
      setMenuOpen(false);
      HuasiAlert.toast('Sesión cerrada correctamente', 'info');
    }
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar">
      {/* Brand & Sponsors */}
      <div className="flex items-center gap-2">
        {/* HUASI Logo */}
        <Link to="/" className="navbar-brand flex items-center gap-2.5 no-underline select-none mr-2 huasi-brand-container group">
          <img 
            src="/huasi-monograma.png" 
            alt="HUASI Monograma" 
            className="h-[36px] w-[36px] object-contain transition-transform duration-300 group-hover:scale-105"
          />
          <span className="font-editorial font-bold text-xl md:text-2xl text-white tracking-wide">HUASI</span>
        </Link>

        {/* Logos institucionales — solo desktop */}
        <div className="hidden lg:flex items-center gap-3.5 pl-3.5 border-l border-white/10">
          <a
            href="https://www.ucc.edu.co/indesco"
            target="_blank"
            rel="noopener noreferrer"
            title="Instituto de Economía Social y Solidaria"
            className="hover:scale-105 transition-transform duration-200 block"
          >
            <img
              src="/indesco.png"
              alt="INDESCO"
              loading="lazy"
              decoding="async"
              className="h-6 w-auto object-contain brightness-0 invert opacity-70 hover:opacity-100 transition-opacity"
            />
          </a>
          <a
            href="https://www.ucc.edu.co"
            target="_blank"
            rel="noopener noreferrer"
            title="Universidad Cooperativa de Colombia"
            className="hover:scale-105 transition-transform duration-200 block"
          >
            <img
              src="/ucc_logo.png"
              alt="Universidad Cooperativa de Colombia"
              loading="lazy"
              decoding="async"
              className="h-6 w-auto object-contain brightness-0 invert opacity-70 hover:opacity-100 transition-opacity"
            />
          </a>
          <a
            href="https://www.ucc.edu.co"
            target="_blank"
            rel="noopener noreferrer"
            title="Territorios Solidarios UCC"
            className="hover:scale-105 transition-transform duration-200 block"
          >
            <img
              src="/territorios_solidarios.png"
              alt="Territorios Solidarios UCC"
              loading="lazy"
              decoding="async"
              className="h-6 w-auto object-contain brightness-0 invert opacity-70 hover:opacity-100 transition-opacity"
            />
          </a>
        </div>
      </div>

      {/* Desktop Navigation Links */}
      <div className="navbar-links flex items-center gap-2 md:gap-3">
        <Link
          to="/"
          className={`px-3.5 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all duration-200 ${
            isActive('/') 
              ? 'bg-white/15 text-white font-semibold' 
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          Explorar
        </Link>

        <Link
          to="/quienes-somos"
          className={`px-3.5 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all duration-200 ${
            isActive('/quienes-somos') 
              ? 'bg-white/15 text-white font-semibold' 
              : 'text-slate-300 hover:text-white hover:bg-white/5'
          }`}
        >
          ¿Quiénes Somos?
        </Link>

        {user ? (
          <>
            {user.verificado && (
              <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold">
                <CheckCircle2 size={12} className="stroke-[2.5]" /> Verificado
              </span>
            )}

            {/* Admin panel link */}
            {user.role === 'admin' && (
              <a
                href="https://huasi-mdp5.vercel.app/login"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-white px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 shadow-sm"
              >
                <ShieldCheck size={13} /> Admin
              </a>
            )}

            <Link
              to="/mis-reservas"
              className={`px-3.5 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all duration-200 ${
                isActive('/mis-reservas') 
                  ? 'bg-white/15 text-white font-semibold' 
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              Mis reservas
            </Link>

            <Link
              to="/host"
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs md:text-sm font-medium transition-all duration-200 ${
                isActive('/host') 
                  ? 'bg-white/15 text-white font-semibold' 
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Building size={13} /> Anfitrión
            </Link>

            <NotificationBell />

            <Link
              to="/perfil"
              className="inline-flex items-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/10 px-3.5 py-1.5 rounded-full text-xs font-semibold text-white transition-all duration-200"
            >
              <User size={13} /> {user?.nombre ? user.nombre.split(' ')[0] : 'Perfil'}
            </Link>

            <button 
              onClick={handleLogout} 
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200 cursor-pointer"
            >
              <LogOut size={13} /> Salir
            </button>
          </>
        ) : (
          <>
            <Link 
              to="/login" 
              className="px-4 py-2 text-xs md:text-sm font-medium text-slate-300 hover:text-white transition-colors"
            >
              Ingresar
            </Link>
            <Link 
              to="/registro" 
              className="inline-flex items-center justify-center px-4 py-1.5 rounded-full text-xs font-semibold bg-[#0d7c3d] hover:bg-[#0b6833] text-white shadow-sm transition-all duration-200"
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
                <CheckCircle2 size={14} /> {
                  user.rol_universitario === 'profesor' || user.rol_universitario === 'docente' ? 'Profesor Verificado' :
                  user.rol_universitario === 'administrativo' ? 'Administrativo Verificado' :
                  user.rol_universitario === 'egresado' ? 'Egresado Verificado' :
                  user.rol_universitario === 'investigador' ? 'Investigador Verificado' : 'Estudiante Verificado'
                }
              </div>
            )}

            {user.role === 'admin' && (
              <a href="https://huasi-mdp5.vercel.app/login" target="_blank" rel="noopener noreferrer" onClick={() => setMenuOpen(false)}>
                <ShieldCheck size={16} /> Panel Admin
              </a>
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

            {/* Notificaciones en móvil */}
            <div style={{ padding: '4px 16px' }}>
              <NotificationBell />
            </div>

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
