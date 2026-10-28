import React from 'react';
import { Search, CalendarX, Home, ArrowRight, RefreshCw, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

/**
 * Componente Reutilizable de Estado Vacío (Empty State)
 */
export default function EmptyState({
  icon: Icon = Search,
  title = 'No se encontraron resultados',
  description = 'Intenta ajustar los filtros de búsqueda o seleccionar otra sede de la UCC.',
  actionLabel = 'Limpiar filtros',
  onAction,
  actionLink,
  className = ''
}) {
  return (
    <div className={`relative flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-sm bg-[#071526]/85 border border-cyan-500/25 max-w-lg mx-auto shadow-[0_20px_50px_rgba(0,0,0,0.6)] backdrop-blur-xl my-8 ${className}`}>
      {/* Corner Ticks */}
      <div className="absolute top-0 left-0 w-2.5 h-2.5 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
      <div className="absolute top-0 right-0 w-2.5 h-2.5 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-2.5 h-2.5 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />

      {/* Icono con contenedor de acento */}
      <div className="w-14 h-14 rounded-sm bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-300 mb-4 shadow-[0_0_15px_rgba(0,240,255,0.2)]">
        <Icon size={26} className="stroke-[2]" />
      </div>

      <h3 className="font-rajdhani font-bold text-xl text-white mb-2 tracking-wide uppercase">
        {title}
      </h3>

      <p className="text-slate-300 font-space text-xs max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {/* Botón de Acción Táctico */}
      {actionLink ? (
        <Link
          to={actionLink}
          className="btn-tactical btn-tactical--emerald text-xs py-2 px-5"
        >
          <span>{actionLabel}</span>
          <ArrowRight size={14} />
        </Link>
      ) : onAction ? (
        <button
          onClick={onAction}
          className="btn-tactical btn-tactical--emerald text-xs py-2 px-5"
        >
          <RefreshCw size={13} />
          <span>{actionLabel}</span>
        </button>
      ) : null}
    </div>
  );
}
