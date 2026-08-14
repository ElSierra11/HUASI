import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import PropertyCard from '../components/PropertyCard';
import MapaAlojamientos from '../components/MapaAlojamientos';
import { 
  Search, MapPin, Calendar, Home as HomeIcon, Users, 
  Shield, Star, Building2, Heart, CheckCircle2, 
  Sofa, Bed, Trees, GraduationCap, ShieldCheck, Coins,
  Sliders, Dog, BookOpen, CigaretteOff, Building
} from 'lucide-react';

function SkeletonCard() {
  return (
    <div className="property-card" style={{ cursor: 'default' }}>
      <div className="card-img-wrapper shimmer-base" style={{ height: '200px', width: '100%' }}></div>
      <div className="property-card-inner">
        <div className="shimmer-base" style={{ height: '14px', width: '80px', borderRadius: '4px', marginBottom: '12px' }}></div>
        <div className="shimmer-base" style={{ height: '20px', width: '85%', borderRadius: '4px', marginBottom: '8px' }}></div>
        <div className="shimmer-base" style={{ height: '14px', width: '50%', borderRadius: '4px', marginBottom: '12px' }}></div>
        <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '12px 0' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
          <div className="shimmer-base" style={{ height: '14px', width: '60px', borderRadius: '4px' }}></div>
          <div className="shimmer-base" style={{ height: '14px', width: '40px', borderRadius: '4px' }}></div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const [propiedades, setPropiedades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ busqueda: '', tipo: '', ciudad: '', campus: '', fecha_inicio: '', fecha_fin: '' });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeCategory, setActiveCategory] = useState('todos');

  const [showMap, setShowMap] = useState(false);

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
      const tit = p.titulo ? p.titulo.toLowerCase() : '';

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
    <div className="max-w-7xl mx-auto px-3 sm:px-6 md:px-8 py-4 sm:py-8">
      {/* ===== HERO (Premium UCC Redesign) ===== */}
      <section className="relative overflow-hidden hero-section-card rounded-xl-custom py-8 px-4 sm:py-14 sm:px-6 md:py-20 md:px-12 shadow-custom-sm mb-8 sm:mb-12">
        {/* Decorative faint background HUASI text */}
        <div className="absolute text-[6rem] sm:text-[9rem] md:text-[14rem] font-black text-ucc-navy/[0.02] dark:text-white/[0.02] font-heading tracking-widest pointer-events-none select-none -top-6 -left-4 sm:-top-12 sm:-left-6 z-0 leading-none">
          HUASI
        </div>

        {/* Glow blobs behind */}
        <div className="absolute top-[-10%] left-[-5%] w-[300px] h-[300px] bg-gradient-to-r from-ucc-cyan/10 to-transparent rounded-full filter blur-[80px] pointer-events-none z-0"></div>
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] bg-gradient-to-r from-ucc-green/10 to-transparent rounded-full filter blur-[80px] pointer-events-none z-0"></div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-16 items-center relative z-10">
          
          {/* Left Column: Brand, Slogan, and Actions */}
          <div className="lg:col-span-7 flex flex-col items-start text-left space-y-4 sm:space-y-6">
            
            {/* Pill Badge */}
            <div className="inline-flex items-center gap-2 bg-ucc-green/10 dark:bg-ucc-green/20 px-3.5 py-1.5 rounded-full text-xs md:text-sm font-extrabold text-ucc-green dark:text-emerald-400 border border-ucc-green/20 dark:border-ucc-green/30 shadow-custom-sm">
              <Shield size={14} className="text-ucc-green dark:text-emerald-400" /> Red solidaria · 100% solidario
            </div>

            {/* Slogan Title */}
            <h1 className="font-heading font-black text-3xl sm:text-4xl md:text-5xl lg:text-6xl text-ucc-navy dark:text-white leading-tight tracking-tight">
              La casa de mi <span className="bg-gradient-to-r from-ucc-green to-ucc-cyan bg-clip-text text-transparent">amig@</span>
            </h1>

            {/* Description */}
            <p className="font-body text-sm md:text-base text-ucc-muted dark:text-slate-300 font-semibold leading-relaxed max-w-xl">
              Encuentra alojamiento solidario para estudiantes, docentes y colaboradores de la comunidad universitaria.
            </p>

            {/* Action Buttons */}
            <div className="flex gap-4 flex-wrap pt-2">
              <button 
                onClick={() => scrollToSection('alojamientos')}
                className="inline-flex items-center justify-center bg-white dark:bg-slate-800 border-2 border-ucc-green text-ucc-navy dark:text-white hover:bg-ucc-green hover:text-white font-bold px-8 py-3.5 rounded-full text-sm shadow-custom hover:shadow-custom-md transition-all duration-200"
              >
                Ver alojamientos
              </button>
            </div>
          </div>

          {/* Right Column: Premium Interactive Card */}
          <div className="lg:col-span-5 flex justify-center w-full">
            <div className="hero-interactive-card p-6 rounded-3xl border border-ucc-border/40 dark:border-slate-700 shadow-custom-lg flex flex-col items-center max-w-sm w-full relative z-10 hover:-translate-y-1 transition-transform duration-300">
              
              {/* Logo Area */}
              <div className="p-2 rounded-2xl w-full flex items-center justify-center h-48 logo-container">
                <img 
                  src="/logo_vertical.png" 
                  alt="HUASI Logo" 
                  className="h-full max-h-[175px] w-auto object-contain" 
                />
              </div>

              {/* Title & Slogan */}
              <h3 className="font-heading font-black text-xl text-ucc-navy dark:text-white mt-4 text-center">
                Alojamiento Solidario
              </h3>
              <p className="text-ucc-muted dark:text-slate-300 text-xs font-semibold text-center mt-2 flex items-center justify-center gap-1.5">
                <Heart size={12} className="text-red-500 fill-red-500" /> Hogares que apoyan estudiantes que avanzan.
              </p>

              {/* Action Button */}
              <button 
                onClick={() => scrollToSection('como-funciona')}
                className="bg-gradient-to-r from-ucc-green to-emerald-600 hover:from-ucc-green-hover hover:to-emerald-700 text-white font-bold px-6 py-3 rounded-full shadow-custom hover:shadow-custom-md mt-6 w-full text-center text-sm transition-all duration-200"
              >
                Descubre cómo funciona
              </button>
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-ucc-border/20 my-10 relative z-10"></div>

        {/* Stats Row */}
        <div className="relative z-10 flex justify-center gap-8 md:gap-16 flex-wrap">
          {[
            { label: 'Alojamientos disponibles', value: loading ? '...' : propiedades.length, icon: <HomeIcon size={16} /> },
            { label: 'Campus cubiertos', value: '13+', icon: <Users size={16} /> },
            { label: 'Calificación promedio', value: '4.8 ★', icon: <Star size={16} /> },
            { label: 'Comunidad Solidaria', value: '100%', icon: <Heart size={16} fill="currentColor" /> },
          ].map(s => (
            <div key={s.label} className="flex flex-col items-center hover:scale-105 transition-transform duration-200 cursor-default">
              <span className="text-3xl font-black font-heading text-ucc-navy leading-none">{s.value}</span>
              <span className="text-[0.75rem] text-ucc-muted font-bold tracking-wide mt-2 flex items-center gap-1.5">
                {s.icon} {s.label}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ===== BARRA DE BÚSQUEDA FLOTANTE ===== */}
      <section className="relative z-20 -mt-10 md:-mt-12 mb-8 px-2 md:px-4 max-w-4xl mx-auto">
        <div className="bg-white dark:bg-slate-800/95 p-3 rounded-2xl md:rounded-full shadow-custom-lg border border-ucc-border/40 dark:border-slate-700 hover:border-ucc-green/30 hover:shadow-custom-xl transition-all duration-300">
          <form className="flex flex-col md:flex-row items-center gap-2" onSubmit={handleSearch}>
            
            {/* Ciudad */}
            <div className="w-full md:flex-1 flex items-center gap-2.5 px-4 py-2.5 hover:bg-ucc-bg/40 dark:hover:bg-slate-700/40 focus-within:bg-ucc-bg/40 dark:focus-within:bg-slate-700/40 rounded-full transition-colors">
              <MapPin size={18} className="text-ucc-muted dark:text-slate-400 flex-shrink-0" />
              <input
                id="search-ciudad"
                type="text"
                placeholder="¿A qué ciudad vas?"
                className="w-full border-none bg-transparent outline-none font-body text-sm font-semibold text-ucc-text dark:text-white placeholder-ucc-muted/70 dark:placeholder-slate-400"
                value={filters.ciudad}
                onChange={e => setFilters(f => ({ ...f, ciudad: e.target.value }))}
              />
            </div>

            {/* Campus */}
            <div className="w-full md:flex-1 flex items-center gap-2.5 px-4 py-2.5 hover:bg-ucc-bg/40 dark:hover:bg-slate-700/40 focus-within:bg-ucc-bg/40 dark:focus-within:bg-slate-700/40 rounded-full border-t md:border-t-0 md:border-l border-ucc-border/30 dark:border-slate-700 transition-colors">
              <Building2 size={18} className="text-ucc-muted dark:text-slate-400 flex-shrink-0" />
              <select
                id="search-campus"
                className="w-full border-none bg-transparent outline-none font-body text-sm font-semibold text-ucc-text dark:text-white cursor-pointer dark:bg-slate-800"
                value={filters.campus}
                onChange={e => setFilters(f => ({ ...f, campus: e.target.value }))}
              >
                <option value="">Cualquier campus</option>
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

            {/* Botones de acción del formulario */}
            <div className="w-full md:w-auto flex items-center gap-2 px-2 mt-2 md:mt-0">
              {/* Botón de Filtros Avanzados */}
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className={`flex items-center justify-center p-3 rounded-full border transition-all duration-200 ${showAdvanced ? 'bg-ucc-navy text-white border-ucc-navy' : 'bg-ucc-bg dark:bg-slate-700/60 text-ucc-navy dark:text-white border-ucc-border/30 dark:border-slate-600 hover:bg-ucc-border/20'}`}
                title="Filtros avanzados"
              >
                <Sliders size={18} />
              </button>

              {/* Botón de Buscar */}
              <button 
                id="search-btn" 
                type="submit" 
                className="bg-gradient-to-r from-ucc-green to-emerald-600 hover:from-ucc-green-hover hover:to-emerald-700 text-white font-bold px-8 py-3 rounded-full shadow-custom hover:shadow-custom-md hover:-translate-y-0.5 transition-all duration-200 flex-1 md:flex-initial"
              >
                Buscar
              </button>
            </div>
          </form>

          {/* Filtros avanzados expandibles */}
          {showAdvanced && (
            <div className="glass-panel mt-4 p-5 rounded-2xl flex flex-col md:flex-row gap-4 items-center animate-fadeIn shadow-custom-sm">
              
              {/* Búsqueda por texto (palabra clave) */}
              <div className="w-full md:flex-1 flex items-center gap-2.5 px-4 py-2.5 bg-ucc-bg/30 dark:bg-slate-700/40 rounded-full border border-ucc-border/20 dark:border-slate-700">
                <Search size={16} className="text-ucc-muted dark:text-slate-400 flex-shrink-0" />
                <input
                  id="search-text"
                  type="text"
                  placeholder="Palabra clave (barrio, título, regla...)"
                  className="w-full border-none bg-transparent outline-none font-body text-xs font-semibold text-ucc-text dark:text-white placeholder-ucc-muted/70 dark:placeholder-slate-400"
                  value={filters.busqueda}
                  onChange={e => setFilters(f => ({ ...f, busqueda: e.target.value }))}
                />
              </div>

              {/* Rango de Fechas */}
              <div className="w-full md:flex-1 flex items-center gap-2.5 px-4 py-2 bg-ucc-bg/30 dark:bg-slate-700/40 rounded-full border border-ucc-border/20 dark:border-slate-700 font-body text-xs font-semibold text-ucc-text dark:text-white">
                <Calendar size={16} className="text-ucc-muted dark:text-slate-400 flex-shrink-0" />
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

      {/* ===== BARRA RÁPIDA DE CAMPUS UCC ===== */}
      <section className="mb-6 px-2 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none justify-start md:justify-center">
          <span className="text-xs font-bold text-ucc-muted flex items-center gap-1 mr-1 flex-shrink-0">
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
                className={`px-3 py-1 rounded-full text-[0.75rem] font-bold transition-all duration-200 border cursor-pointer whitespace-nowrap ${
                  isSelected
                    ? 'bg-ucc-navy text-white border-ucc-navy shadow-custom-sm'
                    : 'bg-white/80 dark:bg-slate-800 text-ucc-navy dark:text-slate-200 border-ucc-border/50 hover:bg-ucc-green-light hover:text-ucc-green'
                }`}
              >
                {c}
              </button>
            );
          })}
        </div>
      </section>

      {/* ===== CATEGORÍAS Y FILTROS DE CONVIVENCIA ===== */}
      <section className="mb-12 px-2 max-w-5xl mx-auto">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none justify-start md:justify-center">
          {[
            { id: 'todos', label: 'Todos', icon: <HomeIcon size={14} /> },
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
                    ? 'bg-ucc-green text-white border-ucc-green shadow-custom-sm scale-103' 
                    : 'bg-white dark:bg-slate-800 text-ucc-navy dark:text-slate-200 border-ucc-border/40 dark:border-slate-700 hover:bg-ucc-bg dark:hover:bg-slate-700'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Seccion Mapa Interactivo */}
      <div className="max-w-5xl mx-auto mb-10 text-center">
        <button
          type="button"
          onClick={() => setShowMap(!showMap)}
          className="bg-white border-2 border-ucc-cyan hover:bg-ucc-cyan hover:text-white text-ucc-navy font-bold px-6 py-2.5 rounded-full text-xs shadow-custom transition-all duration-200 inline-flex items-center gap-2"
        >
          <MapPin size={14} />
          {showMap ? 'Ocultar Mapa' : 'Ver Mapa de Alojamientos'}
        </button>

        {showMap && (
          <div style={{ marginTop: '16px', marginBottom: '24px' }}>
            <MapaAlojamientos propiedades={propiedades} />
          </div>
        )}
      </div>

      {/* ===== LISTINGS: PROPIEDADES ===== */}
      <div id="alojamientos" className="flex justify-between items-center mb-6 scroll-mt-24">
        <div className="flex flex-col">
          <h2 className="font-heading font-black text-2xl md:text-3xl text-ucc-navy flex items-center gap-2">
            <Heart size={26} className="text-ucc-green fill-ucc-green" />
            <span>Hospedajes Solidarios</span>
            {!loading && <span className="text-base font-semibold text-ucc-muted ml-1">({getFilteredPropiedades().length})</span>}
          </h2>
          <p className="text-xs font-semibold text-ucc-muted mt-1">Alojamientos universitarios compartidos de estudiante a estudiante.</p>
        </div>
        {(filters.busqueda || filters.tipo || filters.fecha_inicio || filters.ciudad || filters.campus) && (
          <button
            className="bg-white border border-ucc-border text-ucc-navy hover:bg-ucc-green-light hover:text-ucc-green font-bold text-xs px-4 py-2 rounded-full transition-all duration-200"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : getFilteredPropiedades().length === 0 ? (
        <div className="text-center py-12 px-4 bg-white border-2 border-dashed border-ucc-border rounded-xl-custom mb-16">
          <MapPin size={40} className="mx-auto text-ucc-muted mb-3" />
          <h3 className="font-heading font-bold text-base text-ucc-navy mb-1">No encontramos alojamientos disponibles</h3>
          <p className="text-ucc-muted text-xs font-semibold">Prueba cambiando los criterios de búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-20 slide-up-entrance">
          {getFilteredPropiedades().map(p => <PropertyCard key={p.id} propiedad={p} />)}
        </div>
      )}

      {/* ===== ¿CÓMO FUNCIONA? ===== */}
      <section id="como-funciona" className="mb-20 scroll-mt-24">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-xs font-black text-ucc-green tracking-widest uppercase">Proceso Simple</span>
          <h2 className="font-heading font-black text-3xl text-ucc-navy mt-2 mb-3">¿Cómo funciona?</h2>
          <p className="text-ucc-muted font-body text-sm font-semibold">Todo solidario, rápido y seguro dentro de la comunidad universitaria.</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          {[
            { 
              step: '01', 
              title: 'Regístrate', 
              desc: 'Crea tu cuenta con tu correo institucional y verifica tu identidad.', 
              icon: <ShieldCheck size={28} className="text-ucc-green" />,
              bg: 'bg-ucc-green/10' 
            },
            { 
              step: '02', 
              title: 'Explora', 
              desc: 'Busca alojamientos disponibles cerca de tu campus o sede.', 
              icon: <Search size={28} className="text-ucc-cyan" />,
              bg: 'bg-ucc-cyan/10' 
            },
            { 
              step: '03', 
              title: 'Solicita', 
              desc: 'Envía tu solicitud al anfitrión indicando fechas y motivo de visita.', 
              icon: <Calendar size={28} className="text-ucc-navy" />,
              bg: 'bg-ucc-navy/10' 
            },
            { 
              step: '04', 
              title: '¡Listo!', 
              desc: 'Coordina con tu anfitrión por el chat interno. ¡Todo gratis y solidario!', 
              icon: <CheckCircle2 size={28} className="text-emerald-500" />,
              bg: 'bg-emerald-500/10' 
            },
          ].map(item => (
            <div key={item.step} className="bg-white border border-ucc-border/60 hover:border-ucc-green/35 hover:-translate-y-1 transition-all duration-300 rounded-xl-custom p-6 flex flex-col items-center text-center shadow-custom-sm hover:shadow-custom">
              <div className="w-full flex justify-end text-xs font-black text-ucc-muted/40 font-heading mb-2">
                {item.step}
              </div>
              <div className={`w-16 h-16 rounded-full ${item.bg} flex items-center justify-center mb-5`}>
                {item.icon}
              </div>
              <h3 className="font-heading font-black text-lg text-ucc-navy mb-2">{item.title}</h3>
              <p className="text-ucc-muted text-xs font-semibold leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== SECTION ANFITRIÓN ===== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#1a3a5c] via-[#0d7c3d] to-[#00a8e0] rounded-xl-custom text-white p-8 md:p-14 shadow-custom-lg mb-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Text Area */}
        <div className="relative z-10">
          <div className="inline-flex items-center gap-2 bg-white/15 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-white/95 mb-6 border border-white/10 shadow-custom-sm">
            <Building2 size={14} className="text-ucc-green-light" /> Para anfitriones de la comunidad universitaria
          </div>

          <h2 className="font-heading font-black text-3xl md:text-4xl text-white mb-4 leading-tight">
            Una sección que permite a los <br/>
            <span className="text-yellow-300">anfitriones registrar sus casas</span>
          </h2>

          <p className="text-white/80 font-body text-sm md:text-base mb-8 max-w-md leading-relaxed">
            ¿Tienes un espacio disponible cerca de algún campus? Compártelo con la comunidad universitaria. Tu hogar puede ser el hogar de otro mientras estudia o asiste a eventos académicos.
          </p>

          <div className="flex flex-col gap-3.5 mb-8">
            {[
              'Publica tu espacio en minutos — gratis',
              'Tú decides los huéspedes y las fechas',
              'Contribuyes a la solidaridad universitaria',
            ].map(item => (
              <div key={item} className="flex items-center gap-2.5 text-white/90 text-sm font-semibold">
                <CheckCircle2 size={18} className="text-yellow-300 flex-shrink-0" />
                {item}
              </div>
            ))}
          </div>

          <div className="flex gap-4 flex-wrap">
            <Link
              to="/host"
              className="bg-white text-ucc-navy hover:scale-105 hover:shadow-custom-md font-bold px-6 py-3 rounded-full text-sm flex items-center gap-2 transition-all duration-200"
            >
              <Building2 size={16} /> Registrar mi espacio
            </Link>
            <Link
              to="/host"
              className="bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold px-6 py-3 rounded-full text-sm transition-all duration-200"
            >
              Saber más
            </Link>
          </div>
        </div>

        {/* Decorative Grid Column */}
        <div className="relative z-10 grid grid-cols-2 gap-4">
          {[
            { icon: <HomeIcon size={24} className="text-emerald-400" />, title: 'Habitación privada', campus: 'Bogotá', spots: '1 cama disponible', bg: 'bg-emerald-500/10' },
            { icon: <Sofa size={24} className="text-cyan-400" />, title: 'Sofá cama', campus: 'Medellín', spots: '1 espacio', bg: 'bg-cyan-500/10' },
            { icon: <Bed size={24} className="text-sky-400" />, title: 'Cama compartida', campus: 'Santa Marta', spots: '2 camas', bg: 'bg-sky-500/10' },
            { icon: <Trees size={24} className="text-lime-400" />, title: 'Hamaca', campus: 'Barranquilla', spots: '1 hamaca', bg: 'bg-lime-500/10' },
          ].map((c, i) => (
            <div key={i} className="bg-white/10 border border-white/20 backdrop-blur-md rounded-xl-custom p-5 flex flex-col hover:scale-103 transition-transform duration-200 cursor-default">
              <div className={`w-10 h-10 rounded-lg ${c.bg} flex items-center justify-center mb-4`}>
                {c.icon}
              </div>
              <h4 className="font-heading font-black text-sm text-white mb-1">{c.title}</h4>
              <div className="text-[0.7rem] text-white/60 mb-4 flex items-center gap-1">
                <GraduationCap size={13} className="text-white/70" />
                <span>Campus {c.campus}</span>
              </div>
              <div className="inline-block self-start bg-white/20 text-white font-bold text-[0.65rem] px-2.5 py-1 rounded-full border border-white/10">
                {c.spots}
              </div>
            </div>
          ))}
          {/* floating badge */}
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-emerald-500 text-white text-[0.72rem] font-bold py-1.5 px-4 rounded-full flex items-center gap-1.5 shadow-custom-md border border-emerald-400 whitespace-nowrap">
            <Heart size={12} fill="currentColor" /> 100% solidario — sin costo
          </div>
        </div>
      </section>

      {/* ===== FOOTER ===== */}
      <footer className="mt-20 border-t border-ucc-border/30 pt-10 pb-8 text-center text-ucc-muted font-body">
        <p className="font-heading font-black text-sm text-ucc-navy tracking-wide uppercase">HUASI — La casa de mi amig@</p>
        <p className="text-xs mt-1.5 font-bold">Red de Hospedaje Solidario Universitario</p>
        
        <div className="flex justify-center gap-4 text-xs font-bold mb-6 mt-4 flex-wrap">
          <Link to="/quienes-somos" className="text-ucc-muted hover:text-ucc-green transition-colors">¿Quiénes Somos?</Link>
          <span className="text-ucc-border">•</span>
          <Link to="/terminos" className="text-ucc-muted hover:text-ucc-green transition-colors">Términos y Condiciones</Link>
          <span className="text-ucc-border">•</span>
          <Link to="/privacidad" className="text-ucc-muted hover:text-ucc-green transition-colors">Políticas de Privacidad</Link>
        </div>

        <p className="text-[0.7rem] opacity-60">© {new Date().getFullYear()} HUASI · Red Solidaria Universitaria. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
