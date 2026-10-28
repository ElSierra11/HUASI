import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import PropertyCard from '../components/PropertyCard';
import MapaAlojamientos from '../components/MapaAlojamientos';
import { PropertyGridSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';
import { 
  Search, MapPin, Calendar, Home as HomeIcon, Users, 
  Building2, Heart, CheckCircle2, 
  Sofa, Bed, GraduationCap, ShieldCheck,
  Sliders, Dog, BookOpen, CigaretteOff, ArrowRight,
  ChevronDown, RefreshCw, Compass, PlayCircle,
  Maximize2, X, ExternalLink, Sparkles, Star
} from 'lucide-react';

const SCENES = [
  { id: 'escena-1', label: '01 Inicio' },
  { id: 'escena-2', label: '02 La Barrera' },
  { id: 'escena-3', label: '03 Perspectiva' },
  { id: 'escena-4', label: '04 Cómo Funciona' },
  { id: 'escena-5', label: '05 Alojamientos' },
  { id: 'escena-6', label: '06 Comunidad' },
  { id: 'escena-7', label: '07 Participa' },
];

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [propiedades, setPropiedades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ busqueda: '', tipo: '', ciudad: '', campus: '', fecha_inicio: '', fecha_fin: '' });
  const [metricas, setMetricas] = useState({
    alojamientos_disponibles: 0,
    campus_cubiertos: '13+',
    calificacion_promedio: null,
    total_resenas: 0,
    comunidad_solidaria: '100%'
  });

  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeCategory, setActiveCategory] = useState('todos');
  const [showMap, setShowMap] = useState(false);
  const [isVideoModalOpen, setIsVideoModalOpen] = useState(false);
  const [activeVideo, setActiveVideo] = useState('oficial'); // 'oficial' | 'comunidad'
  const [activeScene, setActiveScene] = useState('escena-1');

  // Rastreador del capítulo / escena activa según el scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPos = window.scrollY + window.innerHeight * 0.35;
      for (let i = SCENES.length - 1; i >= 0; i--) {
        const el = document.getElementById(SCENES[i].id);
        if (el && el.offsetTop <= scrollPos) {
          setActiveScene(SCENES[i].id);
          break;
        }
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
    } else if (catId === 'habitacion_compartida') {
      updatedFilters.tipo = 'habitacion_compartida';
      setFilters(f => ({ ...f, tipo: 'habitacion_compartida' }));
      fetchPropiedades({ tipo: 'habitacion_compartida' });
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
    <div className="w-full font-body overflow-x-hidden relative">

      {/* ============================================================
          INDICADOR FLOTANTE MINIMALISTA DE CAPÍTULOS / ESCENAS
          Estilo The Sea We Breathe: muestra la posición narrativa y permite saltos.
          ============================================================ */}
      <nav className="scene-indicator-track" aria-label="Navegación por capítulos narrativos">
        {SCENES.map(item => (
          <button
            key={item.id}
            type="button"
            onClick={() => scrollToSection(item.id)}
            className={`scene-indicator-dot ${activeScene === item.id ? 'active' : ''}`}
            title={`Ir a ${item.label}`}
          >
            <span className="dot-circle" />
            <span className="dot-label">{item.label}</span>
          </button>
        ))}
      </nav>

      {/* ============================================================
          ESCENA 1 — HERO INMERSIVO
          Gran fotografía envolvente, tipografía editorial y textos solicitados.
          ============================================================ */}
      <section id="escena-1" className="relative min-h-[92vh] md:min-h-[98vh] flex flex-col justify-between overflow-hidden text-white scroll-mt-0">
        {/* Imagen Fotográfica de Fondo Cinematográfica */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=2200&q=85" 
            alt="Estudiantes universitarios compartiendo y viajando" 
            className="w-full h-full object-cover object-center transform scale-105 transition-transform duration-1000 ease-out"
          />
          {/* Scrim cinematográfico multicapa para garantizar perfecta legibilidad */}
          <div className="absolute inset-0 cinematic-hero-overlay" />
          <div className="absolute inset-0 cinematic-vignette pointer-events-none" />
        </div>

        {/* Encabezado sutil de la escena */}
        <header className="relative z-10 max-w-7xl mx-auto w-full px-6 pt-8 md:pt-10 flex items-center justify-between">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs font-semibold tracking-wider uppercase text-emerald-300">
            <GraduationCap size={14} className="text-emerald-300" />
            <span>Red Solidaria Universitaria &middot; UCC &middot; INDESCO</span>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs text-white/70">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>13+ Campus Conectados en Colombia</span>
          </div>
        </header>

        {/* Contenido Central: Título Editorial & Propósito */}
        <div className="relative z-10 max-w-5xl mx-auto w-full px-6 py-14 md:py-20 my-auto">
          <div className="space-y-6">
            <div className="space-y-2">
              <span className="block font-editorial italic text-emerald-300 text-lg md:text-2xl font-light tracking-wide">
                HUASI &mdash; LA CASA DE MI AMIG@
              </span>
              <h1 className="font-editorial text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-normal leading-[1.05] tracking-tight text-white max-w-4xl drop-shadow-md">
                Una oportunidad académica puede comenzar con un lugar donde quedarse.
              </h1>
            </div>

            <p className="text-base sm:text-lg md:text-xl text-slate-200/90 font-light max-w-2xl leading-relaxed">
              Conectamos a estudiantes y docentes con una comunidad que cree en compartir, ayudar y abrir puertas al conocimiento.
            </p>

            {/* Botones de Acción de Escena */}
            <div className="pt-4 flex flex-wrap items-center gap-4">
              <button 
                type="button"
                onClick={() => scrollToSection('escena-5')}
                className="btn-editorial-primary text-sm sm:text-base group"
              >
                <span>Explorar alojamientos</span>
                <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                type="button"
                onClick={() => scrollToSection('escena-2')}
                className="btn-editorial-secondary text-sm sm:text-base"
              >
                <Compass size={17} className="text-emerald-300" />
                <span>Conocer cómo funciona</span>
              </button>
            </div>
          </div>
        </div>

        {/* ===== BARRA DE MÉTRICAS EN VIVO (Cálculo Dinámico Real Acorde a la Comunidad) ===== */}
        <div className="relative z-10 max-w-5xl mx-auto w-full px-6 mb-6">
          <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 dark:border-slate-800 rounded-3xl p-4 sm:p-6 shadow-2xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-slate-800 text-slate-800 dark:text-slate-100">
              
              {/* Métrica 1: Alojamientos Disponibles */}
              <div className="flex flex-col items-center justify-center p-2 group hover:scale-105 transition-transform duration-200 cursor-default">
                <span className="text-2xl sm:text-3xl md:text-4xl font-black font-heading text-slate-900 dark:text-white leading-none tracking-tight group-hover:text-emerald-600 transition-colors">
                  {loading ? '...' : (metricas.alojamientos_disponibles || propiedades.length || 0)}
                </span>
                <span className="text-[0.75rem] text-slate-600 dark:text-slate-400 font-bold tracking-wide mt-2 flex items-center gap-1.5">
                  <HomeIcon size={14} className="text-emerald-600" /> Alojamientos verificados
                </span>
              </div>

              {/* Métrica 2: Campus Cubiertos */}
              <div className="flex flex-col items-center justify-center p-2 group hover:scale-105 transition-transform duration-200 cursor-default">
                <span className="text-2xl sm:text-3xl md:text-4xl font-black font-heading text-slate-900 dark:text-white leading-none tracking-tight group-hover:text-emerald-600 transition-colors">
                  {metricas.campus_cubiertos ? (String(metricas.campus_cubiertos).includes('+') ? metricas.campus_cubiertos : `${metricas.campus_cubiertos}+`) : '13+'}
                </span>
                <span className="text-[0.75rem] text-slate-600 dark:text-slate-400 font-bold tracking-wide mt-2 flex items-center gap-1.5">
                  <Building2 size={14} className="text-emerald-600" /> Campus cubiertos
                </span>
              </div>

              {/* Métrica 3: Calificación Promedio Dinámica Acorde a la Comunidad */}
              <div className="flex flex-col items-center justify-center p-2 group hover:scale-105 transition-transform duration-200 cursor-default text-center">
                <span className="text-2xl sm:text-3xl md:text-4xl font-black font-heading text-slate-900 dark:text-white leading-none tracking-tight group-hover:text-amber-500 transition-colors flex items-center gap-1">
                  {metricas.total_resenas > 0 && metricas.calificacion_promedio
                    ? `${Number(metricas.calificacion_promedio).toFixed(1)} / 5.0`
                    : 'Sin reseñas'}
                </span>
                <span className="text-[0.75rem] text-slate-600 dark:text-slate-400 font-bold tracking-wide mt-2 flex items-center gap-1.5">
                  <Star size={14} className={metricas.total_resenas > 0 ? "text-amber-500 fill-amber-500" : "text-slate-400"} />
                  {metricas.total_resenas > 0
                    ? `Calificación promedio (${metricas.total_resenas} ${metricas.total_resenas === 1 ? 'reseña' : 'reseñas'})`
                    : 'Calificación promedio (0 reseñas)'}
                </span>
              </div>

              {/* Métrica 4: Comunidad 100% Solidaria */}
              <div className="flex flex-col items-center justify-center p-2 group hover:scale-105 transition-transform duration-200 cursor-default">
                <span className="text-2xl sm:text-3xl md:text-4xl font-black font-heading text-slate-900 dark:text-white leading-none tracking-tight group-hover:text-emerald-600 transition-colors">
                  100%
                </span>
                <span className="text-[0.75rem] text-slate-600 dark:text-slate-400 font-bold tracking-wide mt-2 flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-600" /> Comunidad Solidaria
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Indicador de Desplazamiento Narrativo hacia la Escena 2 */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-6 pb-8 flex items-center justify-between">
          <button 
            type="button"
            onClick={() => scrollToSection('escena-2')}
            className="flex items-center gap-3 text-xs tracking-wider uppercase text-white/70 hover:text-white font-medium transition-colors cursor-pointer text-left"
          >
            <div className="scroll-indicator-line" />
            <span>Desplaza para descubrir la historia</span>
          </button>

          <div className="text-xs text-white/60 hidden md:block">
            <span>Alojamiento universitario solidario y gratuito</span>
          </div>
        </div>
      </section>


      {/* ============================================================
          ESCENA 2 — EL PROBLEMA (CON PINNED SCROLLYTELLING)
          Atmósfera cinematográfica profunda, fondo anclado y tarjeta editorial.
          ============================================================ */}
      <section id="escena-2" className="scrolly-section relative bg-[#0a1324] text-white border-t border-white/5 scroll-mt-12">
        {/* Fondo fotográfico anclado en pantalla (Sticky Background) */}
        <div className="scrolly-sticky-bg">
          <img 
            src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=2000&q=85" 
            alt="Estudiante universitario en viaje académico" 
            className="w-full h-full object-cover object-center filter brightness-[0.38] contrast-105"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a1324]/95 via-[#0a1324]/80 to-[#0a1324]/60" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a1324] via-transparent to-transparent" />
        </div>

        {/* Pista de contenido flotante sobre el fondo anclado */}
        <div className="scrolly-content-track max-w-7xl mx-auto px-6">
          <div className="min-h-[75vh] flex flex-col justify-center">
            <div className="scrolly-step-card p-8 md:p-12 bg-[#0c182c]/88 border border-white/10 shadow-2xl">
              <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-4">
                <span className="w-8 h-[1px] bg-emerald-400" />
                <span>Capítulo 02 &bull; El desafío que enfrentamos</span>
              </div>

              <h2 className="font-editorial text-3xl sm:text-4xl md:text-5xl font-normal leading-tight text-white mb-6">
                Las oportunidades no deberían depender de cuánto puedes pagar por una noche.
              </h2>

              <p className="text-base sm:text-lg text-slate-200 font-light leading-relaxed mb-4">
                Presentar una ponencia, asistir a un congreso, cursar un semestre de intercambio o realizar una práctica de investigación son experiencias que transforman la trayectoria de cualquier estudiante o docente.
              </p>

              <p className="text-base sm:text-lg text-slate-300 font-light leading-relaxed mb-6">
                Sin embargo, los costos del alojamiento temporal en otra ciudad suelen convertirse en un obstáculo infranqueable. Muchos talentos se ven obligados a renunciar a sus metas académicas simplemente porque una habitación comercial resulta inaccesible.
              </p>

              <div className="border-l-2 border-emerald-500 pl-4 italic text-slate-300 text-sm md:text-base font-light">
                &ldquo;Viajar para aprender y crear no puede ser un privilegio reservado para unos pocos.&rdquo;
              </div>
            </div>
          </div>
        </div>
      </section>


      {/* ============================================================
          ESCENA 3 — EL CAMBIO DE PERSPECTIVA
          Atmósfera cálida, luminosa y humana (tonos crema y blanco cálido).
          Un espacio compartido puede abrir muchas puertas.
          ============================================================ */}
      <section id="escena-3" className="relative py-24 md:py-32 bg-[#faf8f5] text-slate-900 overflow-hidden transition-colors duration-500 scroll-mt-12">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              Capítulo 03 &bull; El cambio de perspectiva
            </span>
            <h2 className="font-editorial text-3xl sm:text-5xl md:text-6xl font-normal leading-tight text-slate-900">
              Un espacio compartido puede abrir muchas puertas.
            </h2>
            <p className="text-base sm:text-lg text-slate-600 font-light leading-relaxed">
              HUASI no es una plataforma comercial de alquileres. Es una red de hospitalidad solidaria que conecta la generosidad de anfitriones universitarios con la determinación de quienes viajan por vocación académica.
            </p>
          </div>

          {/* Composición Visual Doble: Anfitrión y Estudiante */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 items-stretch">
            
            {/* Tarjeta del Anfitrión */}
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="space-y-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                  <HomeIcon size={24} />
                </div>
                <h3 className="font-editorial text-2xl md:text-3xl font-semibold text-slate-900">
                  El anfitrión que abre sus puertas
                </h3>
                <p className="text-sm md:text-base text-slate-600 font-light leading-relaxed">
                  Profesores, colaboradores y compañeros que disponen de una habitación, un estudio o un sofá cama para recibir a un colega que llega a su ciudad a presentar una investigación o participar en un seminario.
                </p>
              </div>

              <div className="rounded-2xl overflow-hidden aspect-[16/9] relative">
                <img 
                  src="https://images.unsplash.com/photo-1555854877-bab0e564b8d5?auto=format&fit=crop&w=900&q=80" 
                  alt="Espacio acogedor para estudiar y descansar" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-4 text-xs font-medium text-white">
                  Espacios de estudio cálidos y tranquilos
                </span>
              </div>
            </div>

            {/* Tarjeta del Estudiante / Viajero Académico */}
            <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-slate-200/80 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="space-y-4 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-sky-100 text-sky-800 flex items-center justify-center">
                  <GraduationCap size={24} />
                </div>
                <h3 className="font-editorial text-2xl md:text-3xl font-semibold text-slate-900">
                  El estudiante que expande su horizonte
                </h3>
                <p className="text-sm md:text-base text-slate-600 font-light leading-relaxed">
                  Llegar a una ciudad con la certeza de un lugar seguro donde descansar, preparar su ponencia y convivir con personas que comprenden el valor del esfuerzo académico.
                </p>
              </div>

              <div className="rounded-2xl overflow-hidden aspect-[16/9] relative">
                <img 
                  src="https://images.unsplash.com/photo-1517486808906-6ca8b3f04846?auto=format&fit=crop&w=900&q=80" 
                  alt="Estudiantes universitarios colaborando" 
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
                <span className="absolute bottom-3 left-4 text-xs font-medium text-white">
                  Comunidad solidaria universitaria
                </span>
              </div>
            </div>

          </div>

        </div>
      </section>


      {/* ============================================================
          ESCENA 4 — CÓMO FUNCIONA HUASI
          Tres etapas visuales conectadas por el recorrido del estudiante.
          ============================================================ */}
      <section id="escena-4" className="py-24 md:py-32 bg-[#f4f1ea] text-slate-900 border-t border-slate-200 scroll-mt-12">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="max-w-2xl mx-auto text-center mb-16 space-y-3">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-700">
              Capítulo 04 &bull; El recorrido paso a paso
            </span>
            <h2 className="font-editorial text-3xl sm:text-5xl font-normal text-slate-900">
              ¿Cómo funciona HUASI?
            </h2>
            <p className="text-slate-600 text-sm sm:text-base font-light">
              Un proceso claro, solidario y transparente para toda la comunidad académica.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            
            {/* Etapa 1 */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between relative group hover:-translate-y-1 transition-all duration-300">
              <div>
                <span className="font-editorial text-5xl font-light text-emerald-700/30 block mb-4">
                  01
                </span>
                <h3 className="font-editorial text-2xl font-semibold text-slate-900 mb-3">
                  Encuentra una oportunidad
                </h3>
                <p className="text-sm text-slate-600 font-light leading-relaxed mb-6">
                  Explora los alojamientos disponibles y consulta sus características, ubicación y cercanía a los campus universitarios donde se desarrollará tu actividad.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-emerald-800">
                <Search size={15} />
                <span>Búsqueda por sede y fechas</span>
              </div>
            </div>

            {/* Etapa 2 */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between relative group hover:-translate-y-1 transition-all duration-300">
              <div>
                <span className="font-editorial text-5xl font-light text-emerald-700/30 block mb-4">
                  02
                </span>
                <h3 className="font-editorial text-2xl font-semibold text-slate-900 mb-3">
                  Conecta con la comunidad
                </h3>
                <p className="text-sm text-slate-600 font-light leading-relaxed mb-6">
                  Consulta la información disponible y sigue el proceso de contacto o solicitud implementado por la plataforma, con validación de identidad y motivo académico.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-emerald-800">
                <ShieldCheck size={15} />
                <span>Verificación y confianza mutua</span>
              </div>
            </div>

            {/* Etapa 3 */}
            <div className="bg-white rounded-3xl p-8 border border-slate-200/80 shadow-sm flex flex-col justify-between relative group hover:-translate-y-1 transition-all duration-300">
              <div>
                <span className="font-editorial text-5xl font-light text-emerald-700/30 block mb-4">
                  03
                </span>
                <h3 className="font-editorial text-2xl font-semibold text-slate-900 mb-3">
                  Vive tu experiencia académica
                </h3>
                <p className="text-sm text-slate-600 font-light leading-relaxed mb-6">
                  Utiliza el alojamiento acordado y participa con tranquilidad en la actividad académica, congreso o pasantía para la que realizas el desplazamiento.
                </p>
              </div>
              <div className="pt-4 border-t border-slate-100 flex items-center gap-2 text-xs font-semibold text-emerald-800">
                <GraduationCap size={15} />
                <span>Crecimiento académico y humano</span>
              </div>
            </div>

          </div>

          {/* Reproductor de Video Institucional Opcional */}
          <div className="mt-14 max-w-xl mx-auto text-center">
            <button
              type="button"
              onClick={() => setIsVideoModalOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-white border border-slate-300 text-slate-700 hover:text-emerald-700 hover:border-emerald-500 shadow-sm text-xs font-semibold transition-all"
            >
              <PlayCircle size={16} className="text-emerald-600" />
              <span>Ver video explicativo institucional de HUASI</span>
            </button>
          </div>

        </div>
      </section>


      {/* ============================================================
          ESCENA 5 — EXPLORAR ALOJAMIENTOS
          Datos reales de la plataforma, buscador integrado y tarjetas editoriales.
          ============================================================ */}
      <section id="escena-5" className="py-24 md:py-32 bg-white dark:bg-[#070e1c] text-slate-900 dark:text-white transition-colors duration-300 scroll-mt-12">
        <div className="max-w-7xl mx-auto px-6">
          
          {/* Encabezado de la Sección */}
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Capítulo 05 &bull; Disponibilidad solidaria
              </span>
              <h2 className="font-editorial text-3xl sm:text-5xl font-normal text-slate-900 dark:text-white mt-1">
                Explorar alojamientos
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm md:text-base font-light mt-2 max-w-xl">
                Espacios ofrecidos por la comunidad universitaria para estancias académicas y de investigación.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowMap(!showMap)}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-300 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                <MapPin size={14} className="text-emerald-600 dark:text-emerald-400" />
                <span>{showMap ? 'Ocultar mapa' : 'Ver mapa de campus'}</span>
              </button>
            </div>
          </div>

          {/* Buscador Armónico y Filtros */}
          <div className="bg-[#faf8f5] dark:bg-[#0d1829] p-4 sm:p-6 rounded-3xl border border-slate-200/80 dark:border-slate-800 mb-10 shadow-sm">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-3">
              {/* Campo Ciudad */}
              <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#132238] rounded-2xl border border-slate-200 dark:border-slate-700">
                <MapPin size={16} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <input
                  type="text"
                  placeholder="¿A qué ciudad viajas?"
                  value={filters.ciudad}
                  onChange={e => setFilters(f => ({ ...f, ciudad: e.target.value }))}
                  className="w-full bg-transparent outline-none text-xs sm:text-sm text-slate-800 dark:text-slate-100 placeholder-slate-400"
                />
              </div>

              {/* Selector de Sede / Campus */}
              <div className="flex-1 flex items-center gap-3 px-4 py-3 bg-white dark:bg-[#132238] rounded-2xl border border-slate-200 dark:border-slate-700">
                <Building2 size={16} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
                <select
                  value={filters.campus}
                  onChange={e => setFilters(f => ({ ...f, campus: e.target.value }))}
                  className="w-full bg-transparent outline-none text-xs sm:text-sm text-slate-800 dark:text-slate-100 cursor-pointer"
                >
                  <option value="">Cualquier campus o sede...</option>
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

              {/* Botones de búsqueda */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className={`p-3 rounded-2xl border transition-colors ${
                    showAdvanced 
                      ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-700 dark:text-emerald-300' 
                      : 'bg-white dark:bg-[#132238] border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                  }`}
                  title="Filtros avanzados"
                >
                  <Sliders size={16} />
                </button>

                <button
                  type="submit"
                  className="px-6 py-3 rounded-2xl bg-[#0d7c3d] hover:bg-[#0b6833] text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer"
                >
                  <Search size={15} />
                  <span>Buscar</span>
                </button>
              </div>
            </form>

            {/* Filtros avanzados expandibles */}
            {showAdvanced && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-[#132238] rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <Search size={14} className="text-slate-400" />
                  <input
                    type="text"
                    placeholder="Palabra clave (escritorio, wifi, barrio...)"
                    value={filters.busqueda}
                    onChange={e => setFilters(f => ({ ...f, busqueda: e.target.value }))}
                    className="w-full bg-transparent outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>

                <div className="flex items-center gap-2 px-3.5 py-2.5 bg-white dark:bg-[#132238] rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                  <Calendar size={14} className="text-slate-400" />
                  <input
                    type="date"
                    value={filters.fecha_inicio}
                    onChange={e => setFilters(f => ({ ...f, fecha_inicio: e.target.value }))}
                    className="w-full bg-transparent outline-none text-slate-800 dark:text-slate-100"
                  />
                  <span className="text-slate-400">&mdash;</span>
                  <input
                    type="date"
                    value={filters.fecha_fin}
                    onChange={e => setFilters(f => ({ ...f, fecha_fin: e.target.value }))}
                    className="w-full bg-transparent outline-none text-slate-800 dark:text-slate-100"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Categorías de Espacio */}
          <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 scrollbar-none">
            {[
              { id: 'todos', label: 'Todos', icon: <HomeIcon size={13} /> },
              { id: 'habitacion', label: 'Habitación Privada', icon: <Bed size={13} /> },
              { id: 'habitacion_compartida', label: 'Habitación Compartida', icon: <Users size={13} /> },
              { id: 'estudio', label: 'Espacio de Estudio', icon: <BookOpen size={13} /> },
              { id: 'sofa', label: 'Sofá cama', icon: <Sofa size={13} /> },
              { id: 'mascotas', label: 'Mascotas permitidas', icon: <Dog size={13} /> },
              { id: 'sin_humo', label: 'Libre de humo', icon: <CigaretteOff size={13} /> },
            ].map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategoryClick(cat.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  activeCategory === cat.id
                    ? 'bg-[#0d7c3d] text-white shadow-sm'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            ))}
          </div>

          {/* Vista de Mapa interactivo si está activo */}
          {showMap && (
            <div className="mb-10 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md">
              <MapaAlojamientos propiedades={propiedades} />
            </div>
          )}

          {/* Grilla de Alojamientos Reales */}
          {loading ? (
            <div className="py-12">
              <PropertyGridSkeleton count={6} />
            </div>
          ) : getFilteredPropiedades().length === 0 ? (
            <div className="py-12">
              <EmptyState
                icon={MapPin}
                title="No hay alojamientos con los criterios actuales"
                description="Prueba seleccionando otro campus o limpiando los filtros para descubrir opciones disponibles en otras ciudades."
                actionLabel="Limpiar filtros"
                onAction={() => {
                  setFilters({ busqueda: '', tipo: '', ciudad: '', campus: '', fecha_inicio: '', fecha_fin: '' });
                  fetchPropiedades({ busqueda: '', tipo: '', ciudad: '', campus: '', fecha_inicio: '', fecha_fin: '' });
                }}
              />
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {getFilteredPropiedades().map(p => (
                <PropertyCard key={p.id} propiedad={p} />
              ))}
            </div>
          )}

        </div>
      </section>


      {/* ============================================================
          ESCENA 6 — COMUNIDAD SOLIDARIA
          Dimensión humana, respaldo universitario y confianza mutua.
          ============================================================ */}
      <section id="escena-6" className="py-24 md:py-32 bg-[#faf8f5] dark:bg-[#0a1324] text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800 scroll-mt-12">
        <div className="max-w-7xl mx-auto px-6">
          
          <div className="max-w-3xl mx-auto text-center mb-16 space-y-4">
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
              Capítulo 06 &bull; La dimensión humana
            </span>
            <h2 className="font-editorial text-3xl sm:text-5xl md:text-6xl font-normal leading-tight">
              Una comunidad universitaria que crece compartiendo.
            </h2>
            <p className="text-slate-600 dark:text-slate-300 text-base md:text-lg font-light leading-relaxed">
              HUASI nace del espíritu solidario y cooperativo de INDESCO y la Universidad Cooperativa de Colombia. Cada anfitrión y cada huésped hacen posible una red que trasciende lo económico para centrarse en el apoyo académico mutuo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            <div className="p-8 rounded-3xl bg-white dark:bg-[#0f1c30] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 flex items-center justify-center">
                <ShieldCheck size={24} />
              </div>
              <h3 className="font-editorial text-2xl font-semibold">
                Confianza entre pares
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                Todos los usuarios verifican su pertenencia a la comunidad académica mediante credenciales institucionales, garantizando un entorno seguro y respetuoso.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white dark:bg-[#0f1c30] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-100 dark:bg-teal-950/60 text-teal-700 dark:text-teal-400 flex items-center justify-center">
                <Heart size={24} />
              </div>
              <h3 className="font-editorial text-2xl font-semibold">
                Espíritu cooperativo
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                Sin fines de lucro ni tarifas comerciales. Quien ofrece un lugar lo hace motivado por la empatía y la convicción de que la hospitalidad transforma vidas.
              </p>
            </div>

            <div className="p-8 rounded-3xl bg-white dark:bg-[#0f1c30] border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-100 dark:bg-sky-950/60 text-sky-700 dark:text-sky-400 flex items-center justify-center">
                <GraduationCap size={24} />
              </div>
              <h3 className="font-editorial text-2xl font-semibold">
                Impacto en la investigación
              </h3>
              <p className="text-sm text-slate-600 dark:text-slate-400 font-light leading-relaxed">
                Facilitamos la participación activa en eventos científicos, congresos y pasantías a lo largo y ancho del país, democratizando el acceso a las redes de conocimiento.
              </p>
            </div>

          </div>

        </div>
      </section>


      {/* ============================================================
          ESCENA 7 — LLAMADO A LA ACCIÓN (CTA)
          Cierre visual envolvente, fotografía cálida y opciones de ruta real.
          ============================================================ */}
      <section id="escena-7" className="relative py-28 md:py-36 overflow-hidden text-white scroll-mt-12">
        {/* Imagen de Fondo de Cierre */}
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&w=2200&q=85" 
            alt="Biblioteca y campus universitario"
            className="w-full h-full object-cover object-center"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a1324]/95 via-[#0a1324]/85 to-[#0d7c3d]/70" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold uppercase tracking-wider text-emerald-300">
            <Sparkles size={14} className="text-emerald-300" />
            <span>Capítulo 07 &bull; Únete a la red solidaria</span>
          </div>

          <h2 className="font-editorial text-4xl sm:text-6xl md:text-7xl font-normal leading-tight text-white drop-shadow-md">
            Tu espacio puede ser el comienzo de otra historia.
          </h2>

          <p className="text-base sm:text-xl text-slate-200/95 font-light max-w-2xl mx-auto leading-relaxed">
            Ya sea que tengas una habitación disponible o que estés preparando tu próximo viaje académico, HUASI existe para que nadie se quede atrás.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-4">
            <Link
              to={user ? "/host/nueva-propiedad" : "/login"}
              className="btn-editorial-primary text-sm sm:text-base group"
            >
              <span>Ofrecer alojamiento</span>
              <ArrowRight size={17} className="group-hover:translate-x-1 transition-transform" />
            </Link>

            <button
              type="button"
              onClick={() => scrollToSection('escena-5')}
              className="btn-editorial-secondary text-sm sm:text-base"
            >
              <Search size={17} className="text-emerald-300" />
              <span>Buscar alojamiento</span>
            </button>
          </div>
        </div>
      </section>


      {/* ============================================================
          MODAL DE VIDEO INSTITUCIONAL
          Preserva el video oficial de YouTube y el reel de comunidad.
          ============================================================ */}
      {isVideoModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md"
          onClick={() => setIsVideoModalOpen(false)}
        >
          <div 
            className="relative max-w-md w-full bg-slate-900 rounded-3xl overflow-hidden shadow-2xl border border-slate-700 flex flex-col items-center"
            onClick={e => e.stopPropagation()}
          >
            {/* Header del Modal */}
            <div className="w-full flex items-center justify-between px-5 py-4 border-b border-slate-800 bg-slate-950">
              <span className="font-editorial font-semibold text-sm text-white">
                {activeVideo === 'oficial' ? '¿Qué es HUASI? — Video Oficial' : 'Comunidad Solidaria HUASI'}
              </span>
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Selector de Video */}
            <div className="w-full flex justify-center py-2.5 bg-slate-950/80 border-b border-slate-800 gap-2">
              <button
                type="button"
                onClick={() => setActiveVideo('oficial')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  activeVideo === 'oficial' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Video Oficial
              </button>
              <button
                type="button"
                onClick={() => setActiveVideo('comunidad')}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                  activeVideo === 'comunidad' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                Reel Comunidad
              </button>
            </div>

            {/* Contenedor del reproductor */}
            <div className="w-full flex items-center justify-center p-4 bg-black">
              <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl" style={{ maxWidth: '340px', height: '540px' }}>
                {activeVideo === 'oficial' ? (
                  <iframe
                    className="w-full h-full"
                    src="https://www.youtube.com/embed/nvFHEeWSyoo?autoplay=1"
                    title="¿Qué es HUASI? — Red de Alojamiento Solidario UCC"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                    allowFullScreen
                    style={{ border: 'none' }}
                  />
                ) : (
                  <iframe
                    className="w-full h-full"
                    src="https://www.instagram.com/reel/Dd2Ks_ex3Bk/embed/"
                    title="Comunidad HUASI — Red Solidaria UCC"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    style={{ border: 'none' }}
                  />
                )}
              </div>
            </div>

            <div className="w-full px-5 py-3 bg-slate-950 border-t border-slate-800 text-right">
              <button
                type="button"
                onClick={() => setIsVideoModalOpen(false)}
                className="text-xs text-white hover:text-emerald-400 font-semibold transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
