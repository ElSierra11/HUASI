import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Star, Users, Home, Bed, Sofa, Trees, Coins, HelpCircle, ShieldCheck, Clock, ArrowRight } from 'lucide-react';

const TIPO_LABELS = {
  cama: 'Cama individual',
  sofa: 'Sofá cama',
  hamaca: 'Hamaca',
  habitacion: 'Habitación Privada',
  habitacion_compartida: 'Habitación Compartida',
  alquiler: 'Alquiler',
  otro: 'Espacio Solidario',
  'Habitación Privada': 'Habitación Privada',
  'Sofá Cama': 'Sofá Cama',
  'Habitación Compartida': 'Habitación Compartida'
};

const getNormalizedTipo = (tipo) => {
  if (!tipo) return 'otro';
  const t = tipo.toLowerCase();
  if (t.includes('compartid')) return 'habitacion_compartida';
  if (t.includes('cama')) return 'cama';
  if (t.includes('sofa') || t.includes('sofá')) return 'sofa';
  if (t.includes('hamaca')) return 'hamaca';
  if (t.includes('habitacion') || t.includes('habitación')) return 'habitacion';
  if (t.includes('alquiler')) return 'alquiler';
  return 'otro';
};

const FALLBACK_PHOTOS = {
  habitacion: 'https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=800&q=80',
  habitacion_compartida: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=800&q=80',
  cama: 'https://images.unsplash.com/photo-1540518614846-7ede433c4ef7?auto=format&fit=crop&w=800&q=80',
  sofa: 'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=800&q=80',
  hamaca: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80',
  otro: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80'
};

export default function PropertyCard({ propiedad }) {
  const navigate = useNavigate();
  const rating = parseFloat(propiedad.calificacion_promedio) || 0;
  const normalizedTipo = getNormalizedTipo(propiedad.tipo);
  
  // Foto real si existe, o fallback fotográfico cinematográfico cálido
  const foto = propiedad.foto_principal || 
    (Array.isArray(propiedad.fotos) && propiedad.fotos[0]) || 
    propiedad.imagen_url || 
    FALLBACK_PHOTOS[normalizedTipo] || 
    FALLBACK_PHOTOS.otro;

  const tipoLabel = TIPO_LABELS[propiedad.tipo] || propiedad.tipo || 'Alojamiento';

  return (
    <article 
      className="group editorial-card flex flex-col h-full cursor-pointer transition-all duration-300"
      onClick={() => navigate(`/propiedad/${propiedad.id}`)}
    >
      {/* Contenedor de Fotografía Protagonista */}
      <div className="relative aspect-[16/10] overflow-hidden bg-slate-900">
        <img 
          src={foto} 
          alt={propiedad.titulo} 
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />

        {/* Gradiente sutil para legibilidad del badge */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/20" />

        {/* Badge de Tipo de Espacio */}
        <span className="absolute top-3 left-3 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold text-slate-800 dark:text-slate-100 shadow-sm">
          {tipoLabel}
        </span>

        {/* Badge de Disponibilidad / Verificación */}
        {propiedad.esta_lleno ? (
          <span className="absolute top-3 right-3 bg-red-600/90 text-white backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-medium shadow-sm flex items-center gap-1">
            <Clock size={12} /> Ocupado
          </span>
        ) : (
          <span className="absolute top-3 right-3 bg-emerald-600/90 text-white backdrop-blur-md px-2.5 py-1 rounded-full text-xs font-medium shadow-sm flex items-center gap-1">
            <ShieldCheck size={12} /> Verificado
          </span>
        )}

        {/* Capacidad en el pie de la imagen */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs text-white/90 font-medium">
          <span className="flex items-center gap-1.5 drop-shadow-sm">
            <MapPin size={13} className="text-emerald-400" />
            <span className="truncate max-w-[200px]">{propiedad.ciudad || 'Colombia'}</span>
          </span>
          <span className="flex items-center gap-1 bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">
            <Users size={12} />
            <span>{propiedad.capacidad} {propiedad.capacidad === 1 ? 'huésped' : 'huéspedes'}</span>
          </span>
        </div>
      </div>

      {/* Contenido Editorial de la Tarjeta */}
      <div className="p-5 flex flex-col flex-1 justify-between bg-white dark:bg-[#0d1829]">
        <div>
          <h3 
            className="font-heading font-bold text-lg text-slate-900 dark:text-white leading-snug mb-2 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1" 
            title={propiedad.titulo}
          >
            {propiedad.titulo}
          </h3>

          <p className="text-xs text-slate-500 dark:text-slate-400 mb-4 line-clamp-2 leading-relaxed">
            {propiedad.descripcion || `${tipoLabel} solidario disponible para actividades y movilidad académica.`}
          </p>

          {/* Anfitrión o Ubicación detallada */}
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300 pb-3 border-b border-slate-100 dark:border-slate-800">
            <span className="truncate">
              {propiedad.barrio ? `Sector ${propiedad.barrio}` : propiedad.ciudad}
            </span>
            {propiedad.campus && (
              <span className="text-emerald-600 dark:text-emerald-400 font-semibold truncate ml-2">
                Sede {propiedad.campus}
              </span>
            )}
          </div>
        </div>

        {/* Pie de Tarjeta: Calificación y Botón */}
        <div className="flex items-center justify-between pt-4 mt-2">
          <div className="flex items-center gap-1 text-sm font-semibold text-slate-800 dark:text-slate-200">
            <Star size={14} className="text-amber-500 fill-amber-500" />
            <span>{rating > 0 ? rating.toFixed(1) : 'Nuevo'}</span>
            {propiedad.num_resenas > 0 && (
              <span className="text-xs text-slate-400 font-normal">({propiedad.num_resenas})</span>
            )}
          </div>

          <button 
            type="button"
            className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 dark:text-emerald-400 group-hover:translate-x-1 transition-all"
          >
            <span>Ver detalles</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </article>
  );
}

