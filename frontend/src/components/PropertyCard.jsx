import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star, Users, Home, Bed, Sofa, Trees, Coins, Sparkles, HelpCircle, DollarSign, Heart } from 'lucide-react';

const TIPO_LABELS = {
  cama: 'Cama',
  sofa: 'Sofá',
  hamaca: 'Hamaca',
  habitacion: 'Habitación',
  alquiler: 'Alquiler',
  otro: 'Otros',
  'Habitación Privada': 'Habitación Privada',
  'Sofá Cama': 'Sofá Cama',
  'Habitación Compartida': 'Habitación Compartida'
};

const getNormalizedTipo = (tipo) => {
  if (!tipo) return 'otro';
  const t = tipo.toLowerCase();
  if (t.includes('cama')) return 'cama';
  if (t.includes('sofa') || t.includes('sofá')) return 'sofa';
  if (t.includes('hamaca')) return 'hamaca';
  if (t.includes('habitacion') || t.includes('habitación')) return 'habitacion';
  if (t.includes('alquiler')) return 'alquiler';
  return 'otro';
};

const TIPO_ICON = {
  cama: <Bed size={48} />,
  sofa: <Sofa size={48} />,
  hamaca: <Trees size={48} />,
  habitacion: <Home size={48} />,
  alquiler: <Coins size={48} />,
  otro: <HelpCircle size={48} />
};

const TIPO_ICON_SMALL = {
  cama: <Bed size={14} />,
  sofa: <Sofa size={14} />,
  hamaca: <Trees size={14} />,
  habitacion: <Home size={14} />,
  alquiler: <Coins size={14} />,
  otro: <HelpCircle size={14} />
};

const TIPO_THEMES = {
  cama: {
    gradient: 'linear-gradient(135deg, #10b981, #047857)',
    colorClass: 'text-emerald-500',
    dotClass: 'bg-emerald-500'
  },
  sofa: {
    gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', // Naranja / Sofá
    colorClass: 'text-amber-600',
    dotClass: 'bg-amber-500'
  },
  hamaca: {
    gradient: 'linear-gradient(135deg, #84cc16, #15803d)', // Lime a Verde oscuro
    colorClass: 'text-lime-600',
    dotClass: 'bg-lime-500'
  },
  habitacion: {
    gradient: 'linear-gradient(135deg, #0d7c3d, #059669)', // Verde UCC
    colorClass: 'text-ucc-green',
    dotClass: 'bg-ucc-green'
  },
  alquiler: {
    gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', // Cyan
    colorClass: 'text-cyan-600',
    dotClass: 'bg-cyan-500'
  },
  otro: {
    gradient: 'linear-gradient(135deg, #1a3a5c, #334155)', // Navy / Pizarra
    colorClass: 'text-ucc-navy',
    dotClass: 'bg-ucc-navy'
  }
};

export default function PropertyCard({ propiedad }) {
  const navigate = useNavigate();
  const rating = parseFloat(propiedad.calificacion_promedio) || 0;
  const normalizedTipo = getNormalizedTipo(propiedad.tipo);
  const theme = TIPO_THEMES[normalizedTipo] || TIPO_THEMES.otro;
  const icon = TIPO_ICON[normalizedTipo] || TIPO_ICON.otro;
  const smallIcon = TIPO_ICON_SMALL[normalizedTipo] || TIPO_ICON_SMALL.otro;

  const getTipoLabel = (tipo) => {
    return TIPO_LABELS[tipo] || tipo || 'Alojamiento';
  };

  return (
    <div 
      className="group bg-white dark:bg-slate-800/90 rounded-xl-custom border border-ucc-border/50 dark:border-slate-700/60 hover:border-ucc-green/40 dark:hover:border-emerald-500/40 shadow-custom-sm hover:shadow-custom-md hover:-translate-y-1.5 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col h-full" 
      onClick={() => navigate(`/propiedad/${propiedad.id}`)}
    >
      {/* Icon Card Header */}
      <div 
        className="relative aspect-[16/10] overflow-hidden flex items-center justify-center transition-all duration-300 group-hover:brightness-[1.03]" 
        style={{ background: theme.gradient }}
      >
        {/* Badge Indicator: tipo */}
        <span 
          className="absolute top-3 left-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-3.5 py-1 rounded-full text-[0.68rem] font-extrabold tracking-wider uppercase border border-ucc-border/40 dark:border-slate-700/60 shadow-custom-sm flex items-center gap-1.5 z-10 text-ucc-navy dark:text-white"
        >
          <span className={`w-1.5 h-1.5 rounded-full ${theme.dotClass} animate-pulse-dot`} />
          {getTipoLabel(propiedad.tipo)}
        </span>

        {/* Big Icon */}
        <div className="text-white flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
          {React.cloneElement(icon, { size: 56, className: "filter drop-shadow-[0_4px_10px_rgba(0,0,0,0.2)]" })}
        </div>
      </div>

      {/* Card Details */}
      <div className="p-5 flex flex-col flex-1">
        {/* Title Group */}
        <div className="flex items-center gap-2.5 mb-3">
          <div 
            className="inline-flex items-center justify-center text-white rounded-lg p-1.5 shadow-custom-sm flex-shrink-0" 
            style={{ background: theme.gradient }}
          >
            {React.cloneElement(smallIcon, { size: 14, className: "text-white" })}
          </div>
          <span 
            className="font-heading font-black text-[1.05rem] text-ucc-navy dark:text-white group-hover:text-ucc-green dark:group-hover:text-emerald-400 transition-colors truncate" 
            title={propiedad.titulo}
          >
            {propiedad.titulo}
          </span>
        </div>
        
        {/* Location Info */}
        <div className="text-ucc-muted dark:text-slate-400 text-xs font-semibold mb-4 flex items-center gap-1.5">
          <MapPin size={13} className="text-ucc-muted/70 dark:text-slate-400 flex-shrink-0" /> 
          <span className="truncate">{propiedad.barrio || propiedad.direccion}, {propiedad.ciudad}</span>
        </div>

        {/* Meta Line */}
        <div className="flex items-center justify-between mt-auto pt-3.5 border-t border-ucc-border/40 text-[0.8rem] font-bold text-ucc-navy">
          <div className="flex items-center gap-1">
            <Star size={13} className="text-amber-500 fill-amber-500 flex-shrink-0" /> 
            <span>{rating > 0 ? rating.toFixed(1) : 'Nuevo'}</span>
            {propiedad.num_resenas > 0 && (
              <span className="text-ucc-muted/70 font-semibold">({propiedad.num_resenas})</span>
            )}
          </div>
          <span className="flex items-center gap-1 text-ucc-muted/80 font-semibold">
            <Users size={13} className="flex-shrink-0" /> {propiedad.capacidad} {propiedad.capacidad === 1 ? 'huésped' : 'huéspedes'}
          </span>
        </div>
      </div>
    </div>
  );
}
