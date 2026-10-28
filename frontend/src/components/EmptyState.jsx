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
    <div className={`flex flex-col items-center justify-center text-center p-8 md:p-12 rounded-3xl bg-white dark:bg-slate-800/60 border border-ucc-border/50 dark:border-slate-700/60 max-w-lg mx-auto shadow-sm my-8 ${className}`}>
      {/* Icono con contenedor de acento */}
      <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 dark:bg-emerald-400/15 border border-emerald-500/20 flex items-center justify-center text-ucc-green dark:text-emerald-400 mb-4 shadow-sm">
        <Icon size={32} className="stroke-[2.2]" />
      </div>

      <h3 className="font-heading font-black text-xl text-ucc-navy dark:text-white mb-2 tracking-tight">
        {title}
      </h3>

      <p className="text-ucc-muted dark:text-slate-400 text-sm max-w-sm mb-6 leading-relaxed">
        {description}
      </p>

      {/* Botón de Acción */}
      {actionLink ? (
        <Link
          to={actionLink}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-ucc-green to-emerald-600 hover:from-ucc-green-hover hover:to-emerald-700 text-white font-bold text-sm px-6 py-2.5 rounded-full shadow-custom hover:shadow-custom-md hover:-translate-y-0.5 active:scale-95 transition-all duration-200"
        >
          <span>{actionLabel}</span>
          <ArrowRight size={16} />
        </Link>
      ) : onAction ? (
        <button
          onClick={onAction}
          className="inline-flex items-center gap-2 bg-gradient-to-r from-ucc-green to-emerald-600 hover:from-ucc-green-hover hover:to-emerald-700 text-white font-bold text-sm px-6 py-2.5 rounded-full shadow-custom hover:shadow-custom-md hover:-translate-y-0.5 active:scale-95 transition-all duration-200 cursor-pointer"
        >
          <RefreshCw size={14} />
          <span>{actionLabel}</span>
        </button>
      ) : null}
    </div>
  );
}
