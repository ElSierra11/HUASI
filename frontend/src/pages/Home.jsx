import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import PropertyCard from '../components/PropertyCard';
import MapaAlojamientos from '../components/MapaAlojamientos';
import { PropertyGridSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { 
  Search, MapPin, Calendar, Home as HomeIcon, Users, 
  Shield, Star, Building2, Heart, CheckCircle2, 
  Sofa, Bed, Trees, GraduationCap, ShieldCheck,
  Sliders, Dog, BookOpen, CigaretteOff, ArrowRight,
  Sparkles, Compass, ChevronDown, RefreshCw
} from 'lucide-react';

export default function Home() {
  const [propiedades, setPropiedades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ busqueda: '', tipo: '', ciudad: '', campus: '', fecha_inicio: '', fecha_fin: '' });
  const [metricas, setMetricas] = useState({
    alojamientos_disponibles: 0,
    campus_cubiertos: '13+',
    calificacion_promedio: '5.0',
    total_resenas: 0,
    comunidad_solidaria: '100%'
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeCategory, setActiveCategory] = useState('todos');
  const [showMap, setShowMap] = useState(false);

  const fetchMetricas = async () => {
    try {
      const res = await api.get('/propiedades/metricas/globales');
      if (res.data) {
        setMetricas(res.data);
      }
    } catch (err) {
      console.warn('Fallback cargando metricas:', err.message);
    }
  };

  const fetchPropiedades = async (params = {}) => {
    setLoading(true);
    try {
      const query = new URLSearchParams();
      Object.entries({ ...filters, ...params }).forEach(([k, v]) => { if (v) query.set(k, v); });
      const res = await api.get(`/propiedades?${query.toString()}`);
      setPropiedades(res.data.propiedades || []);
    } catch (err) {
      console.error('Error cargando propiedades:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPropiedades();
    fetchMetricas();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    fetchPropiedades();
  };

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleCategoryClick = (catId) => {
    setActiveCategory(catId);
    
    let updatedFilters = { ...filters };
    
    if (catId === 'habitacion') {
      updatedFilters.tipo = 'habitacion';
      setFilters(f => ({ ...f, tipo: 'habitacion' }));
      fetchPropiedades({ tipo: 'habitacion' });
    } else if (catId === 'sofa') {
      updatedFilters.tipo = 'sofa';
      setFilters(f => ({ ...f, tipo: 'sofa' }));
      fetchPropiedades({ tipo: 'sofa' });
    } else {
      updatedFilters.tipo = '';
      setFilters(f => ({ ...f, tipo: '' }));
      fetchPropiedades({ tipo: '' });
    }
  };

  const getFilteredPropiedades = () => {
    return propiedades.filter(p => {
      const amen = Array.isArray(p.amenidades) ? p.amenidades : [];
      const reglas = p.reglas ? p.reglas.toLowerCase() : '';
      const desc = p.descripcion ? p.descripcion.toLowerCase() : '';

      if (activeCategory === 'estudio') {
        return amen.some(a => {
          const lower = String(a).toLowerCase();
          return lower.includes('wifi') || lower.includes('escritorio') || lower.includes('estudio') || lower.includes('estudiar');
        }) || desc.includes('estudio') || desc.includes('escritorio');
      }

      if (activeCategory === 'mascotas') {
        return amen.some(a => String(a).toLowerCase().includes('mascota')) || 
               reglas.includes('mascota') || desc.includes('mascota') || desc.includes('perro') || desc.includes('gato');
      }

      if (activeCategory === 'sin_humo') {
        return amen.some(a => String(a).toLowerCase().includes('fumar')) || 
               reglas.includes('no fumar') || reglas.includes('libre de humo') || desc.includes('no fumar');
      }

      return true;
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 md:px-8 py-4 sm:py-8 font-body">
      
      {/* ===== HERO SECTION ULTRA-ESTÉTICO ===== */}
      <section className="relative overflow-hidden hero-section-card rounded-3xl py-8 px-5 sm:py-14 sm:px-8 md:py-16 md:px-12 shadow-custom-lg mb-8 sm:mb-12 border border-ucc-border/50 dark:border-slate-800 backdrop-blur-md">
        
        {/* Halos de luz de ambiente con respiración lenta */}
        <div className="absolute top-[-15%] left-[-10%] w-[380px] h-[380px] bg-gradient-to-r from-ucc-green/20 via-emerald-400/15 to-transparent rounded-full filter blur-[100px] pointer-events-none z-0 animate-pulse-slow"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[420px] h-[420px] bg-gradient-to-l from-emerald-500/15 via-teal-400/10 to-transparent rounded-full filter blur-[110px] pointer-events-none z-0 animate-pulse-slow"></div>

        {/* Marca de agua decorativa */}
        <div className="absolute text-[6rem] sm:text-[10rem] md:text-[14rem] font-black text-ucc-navy/[0.02] dark:text-white/[0.02] font-heading tracking-widest pointer-events-none select-none -top-8 -left-6 z-0 leading-none">
          HUASI
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center relative z-10">
          
          {/* Columna Izquierda: Titular y Mensaje */}
          <div className="lg:col-span-7 flex flex-col items-start text-left space-y-4 sm:space-y-6">
            
            {/* Badge Institucional */}
            <div className="inline-flex items-center gap-2 bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-4 py-1.5 rounded-full text-xs md:text-sm font-extrabold text-ucc-green dark:text-emerald-400 border border-ucc-green/25 dark:border-emerald-500/30 shadow-custom-sm hover:scale-105 transition-transform duration-200 cursor-default">
              <ShieldCheck size={16} className="text-ucc-green dark:text-emerald-400" />
              <span>Red Solidaria Universitaria &bull; UCC</span>
            </div>

            {/* Titular Principal */}
            <h1 className="font-heading font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-ucc-navy dark:text-white leading-[1.12] tracking-tight">
              La casa de mi <span className="bg-gradient-to-r from-ucc-green via-emerald-500 to-green-600 bg-clip-text text-transparent">amig@</span>
            </h1>

            {/* Descripción */}
            <p className="text-sm md:text-base text-ucc-muted dark:text-slate-300 font-semibold leading-relaxed max-w-xl">
              Red autogestionada y voluntaria para el alojamiento solidario entre estudiantes y docentes universitarios. Encuentra hospedaje seguro para tus semilleros, congresos, pasantías y eventos académicos.
            </p>

            {/* Botones de Acción */}
            <div className="flex gap-3.5 flex-wrap pt-2">
              <button 
                onClick={() => scrollToSection('alojamientos')}
                className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-ucc-green to-emerald-600 hover:from-ucc-green-hover hover:to-emerald-700 text-white font-bold px-7 py-3.5 rounded-full text-sm shadow-custom hover:shadow-custom-md hover:scale-[1.03] active:scale-[0.97] transition-all duration-200"
              >
                <span>Ver Alojamientos</span>
                <ArrowRight size={16} />
              </button>

              <button 
                onClick={() => scrollToSection('como-funciona')}
                className="inline-flex items-center justify-center gap-2 bg-white/90 dark:bg-slate-800/90 hover:bg-ucc-green-light dark:hover:bg-slate-700 border border-ucc-border/80 dark:border-slate-700 text-ucc-navy dark:text-white font-bold px-6 py-3.5 rounded-full text-sm transition-all duration-200 hover:scale-[1.02] active:scale-[0.97]"
              >
                <Compass size={16} className="text-ucc-green" />
                <span>¿Cómo Funciona?</span>
              </button>
            </div>
          </div>

          {/* Columna Derecha: Tarjeta Oficial HUASI */}
          <div className="lg:col-span-5 flex justify-center w-full">
            <div className="hero-interactive-card p-6 rounded-3xl border border-ucc-border/60 dark:border-slate-700 shadow-custom-lg flex flex-col items-center max-w-sm w-full relative z-10 bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl hover:shadow-custom-xl transition-all duration-300">
              
              {/* Contenedor del Monograma */}
              <div className="p-6 rounded-2xl w-full flex flex-col items-center justify-center min-h-[170px] bg-gradient-to-b from-ucc-bg/60 to-ucc-bg/20 dark:from-slate-800/60 dark:to-slate-800/30 border border-ucc-border/40 dark:border-slate-700/60 backdrop-blur-sm huasi-brand-container">
                <img 
                  src="/huasi-monograma.png" 
                  alt="HUASI Monograma" 
                  className="h-24 w-24 object-contain huasi-brand-monogram drop-shadow-md" 
                />
                <span className="font-heading font-black text-2xl text-ucc-navy dark:text-white tracking-wider mt-3 huasi-brand-text">
                  HUASI
                </span>
              </div>

              {/* Textos de Identidad */}
              <h3 className="font-heading font-black text-lg text-ucc-navy dark:text-white mt-4 text-center">
                Alojamiento Solidario
              </h3>
              <p className="text-ucc-muted dark:text-slate-300 text-xs font-semibold text-center mt-1.5 flex items-center justify-center gap-1.5">
                <Heart size={13} className="text-red-500 fill-red-500" /> Hogares que apoyan a estudiantes que avanzan.
              </p>

              {/* Botón Explorar */}
              <button 
                onClick={() => scrollToSection('como-funciona')}
                className="bg-ucc-navy hover:bg-ucc-navy-light text-white font-bold px-6 py-3 rounded-full shadow-custom hover:shadow-custom-md hover:scale-[1.02] active:scale-[0.97] mt-5 w-full text-center text-xs tracking-wide uppercase transition-all duration-200"
              >
                Conoce la red solidaria
              </button>
            </div>
          </div>
        </div>

        {/* ===== BARRA DE MÉTRICAS EN VIVO (Cálculo Dinámico Real) ===== */}
        <div className="mt-10 sm:mt-12 pt-6 relative z-10">
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-ucc-border/50 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-custom-md">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-ucc-border/30 dark:divide-slate-800">
              
              {/* Métrica 1: Alojamientos Disponibles */}
              <div className="flex flex-col items-center justify-center p-2 group hover:scale-105 transition-transform duration-200 cursor-default">
                <span className="text-2xl sm:text-3xl md:text-4xl font-black font-heading text-ucc-navy dark:text-white leading-none tracking-tight group-hover:text-ucc-green transition-colors">
                  {loading ? '...' : (metricas.alojamientos_disponibles || propiedades.length)}
                </span>
                <span className="text-[0.75rem] text-ucc-muted dark:text-slate-400 font-bold tracking-wide mt-2 flex items-center gap-1.5">
                  <HomeIcon size={14} className="text-ucc-green" /> Alojamientos verificados
                </span>
              </div>

              {/* Métrica 2: Campus Cubiertos */}
              <div className="flex flex-col items-center justify-center p-2 group hover:scale-105 transition-transform duration-200 cursor-default">
                <span className="text-2xl sm:text-3xl md:text-4xl font-black font-heading text-ucc-navy dark:text-white leading-none tracking-tight group-hover:text-ucc-green transition-colors">
                  {metricas.campus_cubiertos ? `${metricas.campus_cubiertos}+` : '13+'}
                </span>
                <span className="text-[0.75rem] text-ucc-muted dark:text-slate-400 font-bold tracking-wide mt-2 flex items-center gap-1.5">
                  <Building2 size={14} className="text-ucc-green" /> Campus cubiertos
                </span>
              </div>

              {/* Métrica 3: Calificación Promedio Dinámica Calculada */}
              <div className="flex flex-col items-center justify-center p-2 group hover:scale-105 transition-transform duration-200 cursor-default">
                <span className="text-2xl sm:text-3xl md:text-4xl font-black font-heading text-ucc-navy dark:text-white leading-none tracking-tight group-hover:text-amber-500 transition-colors flex items-center gap-1">
                  {metricas.calificacion_promedio ? `${metricas.calificacion_promedio} / 5.0` : '5.0 / 5.0'}
                </span>
                <span className="text-[0.75rem] text-ucc-muted dark:text-slate-400 font-bold tracking-wide mt-2 flex items-center gap-1.5">
                  <Star size={14} className="text-amber-500 fill-amber-500" /> Calificación promedio ({metricas.total_resenas || 0} reseñas)
                </span>
              </div>

              {/* Métrica 4: Comunidad 100% Solidaria */}
              <div className="flex flex-col items-center justify-center p-2 group hover:scale-105 transition-transform duration-200 cursor-default">
                <span className="text-2xl sm:text-3xl md:text-4xl font-black font-heading text-ucc-navy dark:text-white leading-none tracking-tight group-hover:text-ucc-green transition-colors">
                  100%
                </span>
                <span className="text-[0.75rem] text-ucc-muted dark:text-slate-400 font-bold tracking-wide mt-2 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-ucc-green" /> Comunidad Solidaria
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== BARRA DE BÚSQUEDA 'AIRSEARCH' GLASSMORPHIC ===== */}
      <section className="relative z-20 -mt-10 md:-mt-14 mb-8 px-2 md:px-4 max-w-4xl mx-auto">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl p-3 sm:p-4 rounded-3xl md:rounded-full shadow-custom-xl border border-ucc-border/70 dark:border-slate-700/80 hover:border-ucc-green/50 hover:shadow-2xl transition-all duration-300">
          <form className="flex flex-col md:flex-row items-center gap-2" onSubmit={handleSearch}>
            
            {/* Input Ciudad */}
            <div className="w-full md:flex-1 flex items-center gap-2.5 px-4 py-2.5 hover:bg-ucc-bg/50 dark:hover:bg-slate-800/60 focus-within:bg-ucc-bg/60 dark:focus-within:bg-slate-800/80 rounded-full transition-colors">
              <MapPin size={18} className="text-ucc-green flex-shrink-0" />
              <input
                id="search-ciudad"
                type="text"
                placeholder="¿A qué ciudad viajas?"
                className="w-full border-none bg-transparent outline-none font-body text-sm font-semibold text-ucc-text dark:text-white placeholder-ucc-muted/70 dark:placeholder-slate-400"
                value={filters.ciudad}
                onChange={e => setFilters(f => ({ ...f, ciudad: e.target.value }))}
              />
            </div>

            {/* Selector Campus */}
            <div className="w-full md:flex-1 flex items-center gap-2.5 px-4 py-2.5 hover:bg-ucc-bg/50 dark:hover:bg-slate-800/60 focus-within:bg-ucc-bg/60 dark:focus-within:bg-slate-800/80 rounded-full border-t md:border-t-0 md:border-l border-ucc-border/40 dark:border-slate-700 transition-colors">
              <Building2 size={18} className="text-ucc-green flex-shrink-0" />
              <select
                id="search-campus"
                className="w-full border-none bg-transparent outline-none font-body text-sm font-semibold text-ucc-text dark:text-white cursor-pointer dark:bg-slate-900"
                value={filters.campus}
                onChange={e => setFilters(f => ({ ...f, campus: e.target.value }))}
              >
                <option value="">Cualquier sede o campus...</option>
                <option value="Santa Marta">Santa Marta</option>
                <option value="Bogotá">Bogotá</option>
                <option value="Medellín">Medellín</option>
                <option value="Bucaramanga">Bucaramanga</option>
                <option value="Cali">Cali</option>
                <option value="Ibagué">Ibagué</option>
                <option value="Pasto">Pasto</option>
                <option value="Popayán">Popayán</option>
                <option value="Villavicencio">Villavicencio</option>
                <option value="Montería">Montería</option>
                <option value="Arauca">Arauca</option>
                <option value="Barrancabermeja">Barrancabermeja</option>
                <option value="Neiva">Neiva</option>
              </select>
            </div>

            {/* Acciones de Búsqueda */}
            <div className="w-full md:w-auto flex items-center gap-2 px-2 mt-2 md:mt-0">
              {/* Botón Filtros Avanzados */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`flex items-center justify-center p-3 rounded-full border transition-all duration-200 cursor-pointer ${
                  showAdvanced 
                    ? 'bg-ucc-navy text-white border-ucc-navy scale-105 shadow-custom-sm' 
                    : 'bg-ucc-bg dark:bg-slate-800 text-ucc-navy dark:text-white border-ucc-border/50 dark:border-slate-600 hover:bg-ucc-border/30 hover:scale-105 active:scale-95'
                }`}
                title="Filtros avanzados por fecha y palabras clave"
              >
                <Sliders size={18} />
              </button>

              {/* Botón Buscar */}
              <button 
                id="search-btn" 
                type="submit" 
                className="bg-gradient-to-r from-ucc-green to-emerald-600 hover:from-ucc-green-hover hover:to-emerald-700 text-white font-bold px-8 py-3 rounded-full shadow-custom hover:shadow-custom-md hover:scale-[1.03] active:scale-[0.97] transition-all duration-200 flex-1 md:flex-initial flex items-center justify-center gap-2"
              >
                <Search size={16} />
                <span>Buscar</span>
              </button>
            </div>
          </form>

          {/* Filtros avanzados expandibles con animación de acordeón */}
          {showAdvanced && (
            <div className="mt-4 p-5 rounded-2xl bg-ucc-bg/40 dark:bg-slate-800/50 border border-ucc-border/40 dark:border-slate-700 flex flex-col md:flex-row gap-4 items-center animate-fadeIn shadow-custom-sm">
              
              {/* Palabra Clave */}
              <div className="w-full md:flex-1 flex items-center gap-2.5 px-4 py-2.5 bg-white dark:bg-slate-700/60 rounded-full border border-ucc-border/30 dark:border-slate-600">
                <Search size={15} className="text-ucc-muted dark:text-slate-400 flex-shrink-0" />
                <input
                  id="search-text"
                  type="text"
                  placeholder="Palabra clave (barrio, wifi, escritorio...)"
                  className="w-full border-none bg-transparent outline-none font-body text-xs font-semibold text-ucc-text dark:text-white placeholder-ucc-muted/70 dark:placeholder-slate-400"
                  value={filters.busqueda}
                  onChange={e => setFilters(f => ({ ...f, busqueda: e.target.value }))}
                />
              </div>

              {/* Rango de Fechas */}
              <div className="w-full md:flex-1 flex items-center gap-2.5 px-4 py-2 bg-white dark:bg-slate-700/60 rounded-full border border-ucc-border/30 dark:border-slate-600 font-body text-xs font-semibold text-ucc-text dark:text-white">
                <Calendar size={15} className="text-ucc-green flex-shrink-0" />
                <div className="flex gap-2 items-center w-full">
                  <span className="text-[10px] uppercase tracking-wider text-ucc-muted dark:text-slate-400 font-bold">Desde:</span>
                  <input 
                    id="search-fecha-inicio" 
                    type="date" 
                    className="w-full border-none bg-transparent outline-none font-body text-xs font-semibold text-ucc-text dark:text-white cursor-pointer"
                    value={filters.fecha_inicio} 
                    onChange={e => setFilters(f => ({ ...f, fecha_inicio: e.target.value }))} 
                  />
                  <span className="text-ucc-border">—</span>
                  <span className="text-[10px] uppercase tracking-wider text-ucc-muted dark:text-slate-400 font-bold">Hasta:</span>
                  <input 
                    id="search-fecha-fin" 
                    type="date" 
                    className="w-full border-none bg-transparent outline-none font-body text-xs font-semibold text-ucc-text dark:text-white cursor-pointer"
                    value={filters.fecha_fin} 
                    onChange={e => setFilters(f => ({ ...f, fecha_fin: e.target.value }))} 
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ===== BARRA RÁPIDA DE CAMPUS UCC (Chips con Micro-rebote) ===== */}
      <section className="mb-6 px-2 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none justify-start md:justify-center">
          <span className="text-xs font-bold text-ucc-muted dark:text-slate-400 flex items-center gap-1 mr-1 flex-shrink-0">
            <Building2 size={13} className="text-ucc-green" /> Campus:
          </span>
          {['Todos', 'Santa Marta', 'Bogotá', 'Medellín', 'Bucaramanga', 'Cali', 'Ibagué', 'Pasto'].map(c => {
            const isSelected = (c === 'Todos' && !filters.campus) || filters.campus === c;
            return (
              <button
                key={c}
                type="button"
                onClick={() => {
                  const newCampus = c === 'Todos' ? '' : c;
                  setFilters(f => ({ ...f, campus: newCampus }));
                  fetchPropiedades({ campus: newCampus });
                }}
                className={`px-4 py-1.5 rounded-full text-[0.75rem] font-bold transition-all duration-200 border cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-ucc-green text-white border-ucc-green shadow-custom-sm scale-105'
                    : 'bg-white/90 dark:bg-slate-800 text-ucc-navy dark:text-slate-200 border-ucc-border/50 dark:border-slate-700/60 hover:bg-ucc-green-light dark:hover:bg-emerald-500/20 hover:text-ucc-green dark:hover:text-emerald-400 hover:scale-105 active:scale-95'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </section>

      {/* ===== CATEGORÍAS Y FILTROS DE ESTILO DE ESTANCIA ===== */}
      <section className="mb-10 px-2 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none justify-start md:justify-center">
          {[
            { id: 'todos', label: 'Todos los espacios', icon: <HomeIcon size={14} /> },
            { id: 'estudio', label: 'Estudio Silencioso', icon: <BookOpen size={14} /> },
            { id: 'habitacion', label: 'Habitación Privada', icon: <Bed size={14} /> },
            { id: 'sofa', label: 'Sofá / Sofá Cama', icon: <Sofa size={14} /> },
            { id: 'mascotas', label: 'Pet Friendly', icon: <Dog size={14} /> },
            { id: 'sin_humo', label: 'Libre de Humo', icon: <CigaretteOff size={14} /> },
          ].map(cat => {
            const isActive = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-200 border cursor-pointer ${
                  isActive 
                    ? 'bg-gradient-to-r from-ucc-green to-emerald-600 text-white border-ucc-green shadow-custom-sm scale-105' 
                    : 'bg-white dark:bg-slate-800 text-ucc-navy dark:text-slate-200 border-ucc-border/50 dark:border-slate-700 hover:border-ucc-green/40 hover:text-ucc-green dark:hover:text-emerald-400 hover:scale-105 active:scale-95'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Botón Mapa Interactivo */}
      <div className="max-w-5xl mx-auto mb-10 text-center">
        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          className="bg-white dark:bg-slate-800 border-2 border-ucc-green hover:bg-ucc-green hover:text-white text-ucc-navy dark:text-white font-bold px-6 py-2.5 rounded-full text-xs shadow-custom transition-all duration-200 inline-flex items-center gap-2 hover:scale-105 active:scale-95 cursor-pointer"
        >
          <MapPin size={14} />
          <span>{showMap ? 'Ocultar Mapa' : 'Ver Mapa de Alojamientos'}</span>
        </button>

        {showMap && (
          <div style={{ marginTop: '18px', marginBottom: '24px' }}>
            <MapaAlojamientos propiedades={propiedades} />
          </div>
        )}
      </div>

      {/* ===== CUADRÍCULA DE ALOJAMIENTOS ===== */}
      <div id="alojamientos" className="flex justify-between items-center mb-6 scroll-mt-24">
        <div className="flex flex-col">
          <h2 className="font-heading font-black text-2xl md:text-3xl text-ucc-navy dark:text-white flex items-center gap-2">
            <Heart size={24} className="text-ucc-green fill-ucc-green" />
            <span>Hospedajes Solidarios Verificados</span>
            {!loading && (
              <span className="text-sm font-bold bg-ucc-green/10 text-ucc-green px-2.5 py-0.5 rounded-full ml-1">
                {getFilteredPropiedades().length}
              </span>
            )}
          </h2>
          <p className="text-xs font-semibold text-ucc-muted dark:text-slate-400 mt-1">
            Espacios auditados y certificados para estancias académicas seguras.
          </p>
        </div>

        {(filters.busqueda || filters.tipo || filters.fecha_inicio || filters.ciudad || filters.campus) && (
          <button
            className="bg-white dark:bg-slate-800 border border-ucc-border dark:border-slate-700 text-ucc-navy dark:text-white hover:bg-ucc-green-light hover:text-ucc-green font-bold text-xs px-4 py-2 rounded-full transition-all duration-200 cursor-pointer"
            onClick={() => {
              setFilters({ busqueda: '', tipo: '', ciudad: '', campus: '', fecha_inicio: '', fecha_fin: '' });
              fetchPropiedades({ busqueda: '', tipo: '', ciudad: '', campus: '', fecha_inicio: '', fecha_fin: '' });
            }}
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {loading ? (
        <div className="mb-20">
          <PropertyGridSkeleton count={6} />
        </div>
      ) : getFilteredPropiedades().length === 0 ? (
        <EmptyState
          icon={MapPin}
          title="No encontramos alojamientos con los filtros seleccionados"
          description="Intenta seleccionando otra sede UCC o limpiando los criterios de búsqueda para ver más opciones."
          actionLabel="Limpiar todos los filtros"
          onAction={() => {
            setFilters({ busqueda: '', tipo: '', ciudad: '', campus: '', fecha_inicio: '', fecha_fin: '' });
            fetchPropiedades({ busqueda: '', tipo: '', ciudad: '', campus: '', fecha_inicio: '', fecha_fin: '' });
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          {getFilteredPropiedades().map(p => (
            <div key={p.id} className="hover:-translate-y-2 transition-transform duration-300">
              <PropertyCard propiedad={p} />
            </div>
          ))}
        </div>
      )}

      {/* ===== SECCIÓN ¿CÓMO FUNCIONA? ===== */}
      <section id="como-funciona" className="mb-20 scroll-mt-24">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-xs font-black text-ucc-green tracking-widest uppercase">Proceso Institucional</span>
          <h2 className="font-heading font-black text-3xl text-ucc-navy dark:text-white mt-2 mb-3">
            ¿Cómo funciona HUASI?
          </h2>
          <p className="text-ucc-muted dark:text-slate-400 font-body text-sm font-semibold">
            Todo solidario, rápido y respaldado dentro de la comunidad universitaria.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {[
            { 
              step: '01', 
              title: 'Regístrate', 
              desc: 'Crea tu cuenta con tu correo institucional UCC y verifica tu identidad.', 
              icon: <ShieldCheck size={28} className="text-ucc-green" />,
              bg: 'bg-ucc-green/10' 
            },
            { 
              step: '02', 
              title: 'Explora', 
              desc: 'Busca alojamientos verificados cercanos al campus de tu evento.', 
              icon: <Search size={28} className="text-emerald-500" />,
              bg: 'bg-emerald-500/10' 
            },
            { 
              step: '03', 
              title: 'Solicita', 
              desc: 'Envía tu solicitud con las fechas y el motivo de tu estancia académica.', 
              icon: <Calendar size={28} className="text-ucc-navy dark:text-emerald-400" />,
              bg: 'bg-ucc-navy/10 dark:bg-emerald-400/10' 
            },
            { 
              step: '04', 
              title: 'Hospédate', 
              desc: 'Coordina con tu anfitrión por el chat oficial. ¡100% solidario y sin costo!', 
              icon: <CheckCircle2 size={28} className="text-emerald-500" />,
              bg: 'bg-emerald-500/10' 
            },
          ].map(item => (
            <div 
              key={item.step} 
              className="bg-white dark:bg-slate-800/90 border border-ucc-border/60 dark:border-slate-700/60 hover:border-ucc-green/40 hover:-translate-y-1.5 transition-all duration-300 rounded-2xl p-6 flex flex-col items-center text-center shadow-custom-sm hover:shadow-custom-md"
            >
              <div className="w-full flex justify-end text-xs font-black text-ucc-muted/40 dark:text-slate-500 font-heading mb-2">
                {item.step}
              </div>
              <div className={`w-14 h-14 rounded-2xl ${item.bg} flex items-center justify-center mb-4`}>
                {item.icon}
              </div>
              <h3 className="font-heading font-black text-base text-ucc-navy dark:text-white mb-2">{item.title}</h3>
              <p className="text-ucc-muted dark:text-slate-400 text-xs font-semibold leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== BANNER PARA ANFITRIONES ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#061510] via-[#0d7c3d] to-[#10b981] rounded-3xl text-white p-8 md:p-14 shadow-custom-xl mb-16 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
        
        {/* Columna de Texto */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-white/95 mb-6 border border-white/10 shadow-custom-sm">
            <Building2 size={14} className="text-emerald-300" />
            <span>Comunidad Solidaria Universitaria</span>
          </div>

          <h2 className="font-heading font-black text-3xl md:text-4xl text-white mb-4 leading-tight">
            Comparte tu espacio y apoya a la <br/>
            <span className="text-emerald-200">movilidad estudiantil</span>
          </h2>

          <p className="text-white/80 font-body text-sm md:text-base mb-8 max-w-md leading-relaxed">
            ¿Tienes un espacio disponible cerca de algún campus? Tu hogar puede ser el refugio de otro estudiante o docente mientras asiste a eventos académicos o prácticas.
          </p>

          <div className="flex flex-col gap-3.5 mb-8">
            {[
              'Publica tu espacio en minutos y de forma gratuita',
              'Tú decides los huéspedes y las fechas disponibles',
              'Contribuyes a la economía solidaria y la investigación'
            ].map(item => (
              <div key={item} className="flex items-center gap-2.5 text-white/90 text-sm font-semibold">
                <CheckCircle2 size={18} className="text-emerald-300 flex-shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-4 flex-wrap">
            <Link
              to="/host"
              className="bg-white text-ucc-navy hover:scale-105 hover:shadow-custom-md font-bold px-7 py-3.5 rounded-full text-sm flex items-center gap-2 transition-all duration-200 shadow-custom"
            >
              <Building2 size={16} />
              <span>Registrar mi espacio</span>
            </Link>
            <Link
              to="/quienes-somos"
              className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold px-6 py-3.5 rounded-full text-sm transition-all duration-200"
            >
              Conocer más
            </Link>
          </div>
        </div>

        {/* Mosaico de Modalidades */}
        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[
            { icon: <HomeIcon size={22} className="text-emerald-300" />, title: 'Habitación privada', campus: 'Bogotá', spots: '1 espacio', bg: 'bg-emerald-500/15' },
            { icon: <Sofa size={22} className="text-teal-300" />, title: 'Sofá cama', campus: 'Medellín', spots: '1 espacio', bg: 'bg-teal-500/15' },
            { icon: <Bed size={22} className="text-cyan-300" />, title: 'Cama compartida', campus: 'Santa Marta', spots: '2 camas', bg: 'bg-cyan-500/15' },
            { icon: <Trees size={22} className="text-lime-300" />, title: 'Hamaca', campus: 'Barranquilla', spots: '1 hamaca', bg: 'bg-lime-500/15' },
          ].map((c, i) => (
            <div key={i} className="bg-white/10 border border-white/20 backdrop-blur-md rounded-2xl p-5 flex flex-col hover:scale-105 transition-transform duration-200 cursor-default shadow-custom-sm">
              <div className={`w-10 h-10 rounded-xl ${c.bg} flex items-center justify-center mb-3`}>
                {c.icon}
              </div>
              <h4 className="font-heading font-black text-sm text-white mb-1">{c.title}</h4>
              <div className="text-[0.72rem] text-white/70 mb-3 flex items-center gap-1">
                <GraduationCap size={13} className="text-white/80" />
                <span>Campus {c.campus}</span>
              </div>
              <div className="inline-block self-start bg-white/20 text-white font-bold text-[0.65rem] px-2.5 py-1 rounded-full border border-white/10">
                {c.spots}
              </div>
            </div>
          ))}
          
          {/* Badge Flotante */}
          <div className="col-span-2 bg-emerald-600/90 backdrop-blur-md text-white text-[0.75rem] font-bold py-2 px-4 rounded-full flex items-center justify-center gap-2 shadow-custom-md border border-emerald-400">
            <ShieldCheck size={14} />
            <span>100% Solidario &bull; Respaldado por la Universidad</span>
          </div>
        </div>
      </section>

      {/* ===== FOOTER ESTILIZADO ===== */}
      <footer className="mt-16 border-t border-ucc-border/40 pt-10 pb-8 text-center text-ucc-muted font-body">
        <p className="font-heading font-black text-sm text-ucc-navy dark:text-white tracking-wide uppercase">
          HUASI &bull; La casa de mi amig@
        </p>
        <p className="text-xs mt-1.5 font-bold text-ucc-muted dark:text-slate-400">
          Red Solidaria de Hospedaje Universitario &bull; INDESCO &bull; UCC
        </p>
        
        <div className="flex justify-center gap-4 text-xs font-bold mb-6 mt-4 flex-wrap">
          <Link to="/quienes-somos" className="text-ucc-muted hover:text-ucc-green transition-colors">¿Quiénes Somos?</Link>
          <span className="text-ucc-border">•</span>
          <Link to="/terminos" className="text-ucc-muted hover:text-ucc-green transition-colors">Términos y Condiciones</Link>
          <span className="text-ucc-border">•</span>
          <Link to="/privacidad" className="text-ucc-muted hover:text-ucc-green transition-colors">Políticas de Privacidad</Link>
        </div>

        <p className="text-[0.7rem] opacity-60">
          &copy; {new Date().getFullYear()} HUASI &bull; Universidad Cooperativa de Colombia. Todos los derechos reservados.
        </p>
      </footer>
    </div>
  );
}
