import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Compass, Calendar, MessageCircle, Heart, User, Building } from 'lucide-react';

/**
 * BottomNavBar — Barra de navegación inferior Mobile-First
 *
 * - Fija en la parte inferior en móvil, oculta en md+ (desktop usa Navbar)
 * - Soporte Safe Area Insets (notch / home indicator en iOS)
 * - Estado activo según la ruta actual (useLocation)
 * - Ítems: Explorar, Chat/Solicitudes, Favoritos (perfil), Perfil / Ingresar
 */
export default function BottomNavBar() {
  const location = useLocation();
  const { user } = useAuth();

  const isActive = (path) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(path);

  const navItems = [
    {
      label: 'Explorar',
      path: '/',
      icon: Compass,
    },
    {
      label: 'Solicitudes',
      path: '/mis-reservas',
      icon: Calendar,
      authRequired: true,
    },
    {
      label: 'Chat',
      path: '/chat',
      icon: MessageCircle,
      authRequired: true,
    },
    {
      label: 'Anfitrión',
      path: '/host',
      icon: Building,
      authRequired: true,
    },
    {
      label: user ? (user.nombre ? user.nombre.split(' ')[0] : 'Perfil') : 'Ingresar',
      path: user ? '/perfil' : '/login',
      icon: User,
    },
  ];

  // Filtrar ítems que requieren auth cuando no hay sesión
  const visibleItems = navItems.filter(
    (item) => !item.authRequired || user
  );

  // Limitar a 5 ítems máx para que quepan bien
  const displayItems = visibleItems.slice(0, 5);

  return (
    <nav
      aria-label="Navegación principal móvil"
      className="md:hidden fixed bottom-0 left-0 right-0 z-50
                 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl
                 border-t border-ucc-border/40 dark:border-slate-800
                 shadow-[0_-4px_24px_rgba(0,0,0,0.08)]
                 transition-all duration-300"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch justify-around px-1 pt-1.5 pb-1">
        {displayItems.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-label={item.label}
              aria-current={active ? 'page' : undefined}
              className={[
                'flex flex-col items-center justify-center',
                'min-w-0 flex-1 py-1 px-1 rounded-xl',
                'transition-all duration-200 no-underline',
                active
                  ? 'text-ucc-green dark:text-emerald-400'
                  : 'text-ucc-muted dark:text-slate-400 hover:text-ucc-navy dark:hover:text-slate-200',
              ].join(' ')}
            >
              {/* Icono con indicador activo */}
              <div
                className={[
                  'relative flex items-center justify-center',
                  'w-10 h-7 rounded-xl transition-all duration-200',
                  active
                    ? 'bg-ucc-green/12 dark:bg-emerald-400/15 scale-110'
                    : 'scale-100',
                ].join(' ')}
              >
                <Icon
                  size={20}
                  strokeWidth={active ? 2.5 : 1.75}
                  className="transition-all duration-200"
                />
                {/* Pill indicator on active */}
                {active && (
                  <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-ucc-green dark:bg-emerald-400" />
                )}
              </div>

              {/* Label */}
              <span
                className={[
                  'text-[9.5px] mt-0.5 tracking-tight font-semibold truncate max-w-full',
                  'transition-all duration-200',
                  active ? 'font-bold' : '',
                ].join(' ')}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
