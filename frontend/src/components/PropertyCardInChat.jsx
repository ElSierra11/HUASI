import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star, Users, MoreHorizontal, Home } from 'lucide-react';
import { Bed, Sofa, Trees, Coins, Sparkles, HelpCircle } from 'lucide-react';

// helpers reused from PropertyCard.jsx
const TIPO_LABELS = {
  cama: 'Cama',
  sofa: 'Sofá',
  hamaca: 'Hamaca',
  habitacion: 'Habitación',
  alquiler: 'Alquiler',
  alojamiento_plus: 'Alojamiento +',
  otro: 'Otro',
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
  if (t.includes('+') || t.includes('plus') || t.includes('alojamiento_plus')) return 'alojamiento_plus';
  return 'otro';
};

const TIPO_ICON = {
  cama: <Bed size={48} />, 
  sofa: <Sofa size={48} />, 
  hamaca: <Trees size={48} />, 
  habitacion: <Home size={48} />, 
  alquiler: <Coins size={48} />, 
  alojamiento_plus: <Sparkles size={48} />, 
  otro: <HelpCircle size={48} />
};

const TIPO_THEMES = {
  cama: { gradient: 'linear-gradient(135deg, #00a8e0, #1d4ed8)', dotClass: 'bg-ucc-cyan' },
  sofa: { gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', dotClass: 'bg-amber-500' },
  hamaca: { gradient: 'linear-gradient(135deg, #84cc16, #15803d)', dotClass: 'bg-lime-500' },
  habitacion: { gradient: 'linear-gradient(135deg, #0d7c3d, #059669)', dotClass: 'bg-ucc-green' },
  alquiler: { gradient: 'linear-gradient(135deg, #06b6d4, #0891b2)', dotClass: 'bg-cyan-500' },
  alojamiento_plus: { gradient: 'linear-gradient(135deg, #ec4899, #be185d)', dotClass: 'bg-pink-500' },
  otro: { gradient: 'linear-gradient(135deg, #1a3a5c, #334155)', dotClass: 'bg-ucc-navy' }
};

/**
 * PropertyCardInChat – compact card used inside chat messages.
 * Shows a thumbnail with type badge, title, location, rating and two buttons:
 *   • Ver Detalles – navigates to the property page.
 *   • Más Opciones – placeholder for extra actions.
 */
export default function PropertyCardInChat({ propiedad }) {
  const navigate = useNavigate();
  const rating = parseFloat(propiedad.calificacion_promedio) || 0;
  const tipoNorm = getNormalizedTipo(propiedad.tipo);
  const theme = TIPO_THEMES[tipoNorm] || TIPO_THEMES.otro;
  const Icon = TIPO_ICON[tipoNorm] || TIPO_ICON.otro;

  const handleDetails = () => navigate(`/propiedad/${propiedad.id}`);

  return (
    <div className="flex flex-col bg-white rounded-xl border border-ucc-border/30 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
      {/* Header with gradient background */}
      <div className="relative h-28 flex items-center justify-center" style={{ background: theme.gradient }}>
        {React.cloneElement(Icon, { size: 48, className: 'text-white drop-shadow-md' })}
        <span className="absolute top-2 left-2 bg-white/90 backdrop-blur-sm px-2 py-0.5 rounded-full text-xs font-bold text-ucc-navy flex items-center gap-1">
          <span className={`w-2 h-2 rounded-full ${theme.dotClass} animate-pulse`} />
          {TIPO_LABELS[propiedad.tipo] || 'Alojamiento'}
        </span>
      </div>
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="font-heading font-semibold text-base text-ucc-navy truncate" title={propiedad.titulo}>
          {propiedad.titulo}
        </h3>
        <p className="text-xs text-ucc-muted mt-1 flex items-center gap-1">
          <MapPin size={12} className="flex-shrink-0" />
          {propiedad.barrio || propiedad.direccion}, {propiedad.ciudad}
        </p>
        <div className="flex items-center mt-2 text-sm text-ucc-navy">
          <Star size={14} className="text-amber-500 fill-amber-500" />
          <span className="ml-1">{rating > 0 ? rating.toFixed(1) : 'Nuevo'}</span>
          <span className="ml-2 text-ucc-muted/70">· {propiedad.capacidad} {propiedad.capacidad === 1 ? 'huésped' : 'huéspedes'}</span>
        </div>
        {/* Action Buttons */}
        <div className="mt-3 flex gap-2">
          <button
            onClick={handleDetails}
            className="flex-1 bg-ucc-green hover:bg-ucc-green-dark text-white text-sm font-medium py-1.5 rounded transition-colors"
          >
            Ver Detalles
          </button>
          <button
            onClick={() => console.log('More options for', propiedad.id)}
            className="p-1.5 bg-ucc-border/20 hover:bg-ucc-border/40 text-ucc-navy rounded"
            title="Más opciones"
          >
            <MoreHorizontal size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
