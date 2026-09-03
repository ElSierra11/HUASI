import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Compass, Search, Calendar, User, Building } from 'lucide-react';

export default function MobileBottomNav() {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path) => location.pathname === path;

  const navItems = [
    { label: 'Explorar', path: '/', icon: <Compass size={20} /> },
    { label: 'Reservas', path: '/mis-reservas', icon: <Calendar size={20} />, authRequired: true },
    { label: 'Anfitrión', path: '/host', icon: <Building size={20} />, authRequired: true },
    { label: user ? 'Mi Perfil' : 'Ingresar', path: user ? '/perfil' : '/login', icon: <User size={20} /> },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-ucc-border/50 dark:border-slate-800 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transition-all duration-300">
      <div className="flex items-center justify-around px-2 py-2">
        {navItems.map((item) => {
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all duration-200 ${
                active
                  ? 'text-ucc-green dark:text-emerald-400 font-bold scale-105'
                  : 'text-ucc-muted dark:text-slate-400 font-semibold hover:text-ucc-navy dark:hover:text-slate-200'
              }`}
            >
              <div className={`p-1 rounded-lg transition-colors ${active ? 'bg-ucc-green/10 dark:bg-emerald-400/15' : ''}`}>
                {item.icon}
              </div>
              <span className="text-[10px] mt-0.5 tracking-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
