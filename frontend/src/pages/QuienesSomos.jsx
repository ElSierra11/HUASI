import { useState, useEffect } from 'react';
import { GraduationCap, Building2, Users, Code2, Heart, Award, Terminal, BookOpen, MapPin } from 'lucide-react';

export default function QuienesSomos() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = ['/ucc_campus_1.jpg', '/ucc_campus_2.png'];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000); // Cambiar imagen cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
      {/* ===== HEADER ===== */}
      <div className="text-center max-w-3xl mx-auto mb-16">
        <span className="text-xs font-black text-ucc-green tracking-widest uppercase bg-ucc-green/10 px-3 py-1.5 rounded-full">
          Nuestra Comunidad
        </span>
        <h1 className="font-heading font-black text-4xl md:text-5xl text-ucc-navy mt-4 mb-4 leading-tight">
          ¿Quiénes Somos?
        </h1>
        <p className="text-ucc-muted font-body text-base md:text-lg leading-relaxed font-medium">
          Conoce la historia, los pilares institucionales y las mentes detrás de <strong>HUASI</strong>, la red de hospedaje solidario diseñada por y para la comunidad de la Universidad Cooperativa de Colombia.
        </p>
      </div>

      {/* ===== PILARES INSTITUCIONALES (UCC & INDESCO) ===== */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-20">
        <div className="lg:col-span-7 space-y-6">
          <div className="flex items-center gap-3">
            <Building2 className="text-ucc-green w-8 h-8" />
            <h2 className="font-heading font-black text-2xl md:text-3xl text-ucc-navy">
              Alianza Solidaria y Educativa
            </h2>
          </div>
          
          <p className="text-ucc-muted text-sm md:text-base leading-relaxed font-semibold">
            <strong>HUASI</strong> nace de la convicción de que la solidaridad universitaria puede trascender las aulas de clase. Apoyado por la <strong>Universidad Cooperativa de Colombia (UCC)</strong> y el <strong>Instituto de Economía Social y Cooperativismo (INDESCO)</strong>, este sistema busca mitigar las barreras de movilidad académica para estudiantes y colaboradores en todo el país, operando bajo un modelo en el que todo va acorde con base a la economía solidaria.
          </p>

          <div className="space-y-4">
            <div className="p-5 bg-white border border-ucc-border/50 rounded-2xl shadow-custom-sm">
              <h3 className="font-heading font-bold text-base text-ucc-navy mb-2 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-ucc-cyan" /> Universidad Cooperativa de Colombia
              </h3>
              <p className="text-ucc-muted text-xs md:text-sm font-semibold leading-relaxed">
                Institución multicampos que promueve la formación integral con un fuerte enfoque social. A través de HUASI, la UCC reafirma su compromiso con la equidad, facilitando que estudiantes y docentes tengan un hogar seguro donde llegar en cualquiera de nuestras sedes nacionales.
              </p>
            </div>

            <div className="p-5 bg-white border border-ucc-border/50 rounded-2xl shadow-custom-sm">
              <h3 className="font-heading font-bold text-base text-ucc-navy mb-2 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-ucc-green" /> INDESCO
              </h3>
              <p className="text-ucc-muted text-xs md:text-sm font-semibold leading-relaxed">
                Como centro especializado en la economía social y el cooperativismo, INDESCO aporta la fundamentación solidaria de esta plataforma. Aseguramos que HUASI sea un espacio de intercambio sin ánimo de lucro, basado en la confianza mutua, la cooperación y el bienestar colectivo.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="relative rounded-xl-custom overflow-hidden shadow-custom-lg group h-[400px]">
            <div className="absolute inset-0 bg-gradient-to-t from-ucc-navy/40 to-transparent z-10 pointer-events-none" />
            {images.map((src, idx) => (
              <img 
                key={src}
                src={src} 
                alt={`Campus UCC ${idx + 1}`} 
                className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out ${
                  currentImageIndex === idx ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
                }`}
              />
            ))}
            <div className="absolute bottom-6 left-6 right-6 z-20 flex justify-between items-center">
              <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-bold text-ucc-navy shadow-sm">
                <MapPin size={12} className="text-ucc-green" /> Campus UCC · Infraestructura Solidaria
              </div>
              <div className="flex gap-1.5">
                {images.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentImageIndex(idx)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      currentImageIndex === idx ? 'bg-white w-5' : 'bg-white/50'
                    }`}
                    aria-label={`Ir al slide ${idx + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== SEMILLERO SIEDSS ===== */}
      <section className="bg-gradient-to-br from-[#1a3a5c] via-[#0d7c3d] to-[#00a8e0] rounded-xl-custom text-white p-8 md:p-12 shadow-custom-lg mb-20 relative overflow-hidden">
        {/* Glow decoration */}
        <div className="absolute top-[-20%] right-[-10%] w-[350px] h-[350px] bg-gradient-to-r from-white/10 to-transparent rounded-full filter blur-[60px] pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-white mb-6 border border-white/10">
            <BookOpen size={14} className="text-yellow-300" /> Semillero de Investigación UCC
          </div>
          
          <h2 className="font-heading font-black text-3xl md:text-4xl text-white mb-4 leading-tight">
            Semillero de Investigación SIEDSS
          </h2>
          
          <p className="text-white/90 font-body text-sm md:text-base mb-6 leading-relaxed">
            HUASI no es solo una aplicación de hospedaje; es un proyecto científico-tecnológico desarrollado en el marco del semillero de investigación <strong>SIEDSS</strong>. Aquí, los estudiantes de ingeniería de la Universidad Cooperativa de Colombia investigan, estructuran y ponen en marcha soluciones de software orientadas a resolver problemas reales de nuestra comunidad académica, aplicando metodologías ágiles, arquitectura de software escalable y desarrollo full-stack moderno.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
              <Award className="text-yellow-300 w-6 h-6 mb-2" />
              <h4 className="font-heading font-bold text-sm text-white mb-1">Impacto Social</h4>
              <p className="text-white/70 text-[0.7rem] leading-relaxed">Soluciones pensadas para transformar comunidades y promover la economía solidaria.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
              <Code2 className="text-cyan-300 w-6 h-6 mb-2" />
              <h4 className="font-heading font-bold text-sm text-white mb-1">Ingeniería Web</h4>
              <p className="text-white/70 text-[0.7rem] leading-relaxed">Tecnologías de vanguardia con microservicios y React en el frontend.</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl border border-white/10">
              <Users className="text-emerald-300 w-6 h-6 mb-2" />
              <h4 className="font-heading font-bold text-sm text-white mb-1">Trabajo en Red</h4>
              <p className="text-white/70 text-[0.7rem] leading-relaxed">Conexión de múltiples sedes de la UCC mediante sistemas distribuidos.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== DESARROLLADORES (ALEJANDRO Y ARNOLD) ===== */}
      <section className="mb-10">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-xs font-black text-ucc-green tracking-widest uppercase">Equipo de Ingeniería</span>
          <h2 className="font-heading font-black text-3xl text-ucc-navy mt-2 mb-3">Los Desarrolladores</h2>
          <p className="text-ucc-muted font-body text-sm font-semibold">Los creadores, programadores y diseñadores de la plataforma HUASI.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Alejandro Sierra Card */}
          <div className="bg-white border border-ucc-border/60 hover:border-ucc-green/35 hover:-translate-y-1.5 transition-all duration-300 rounded-xl-custom p-8 shadow-custom-sm hover:shadow-custom flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-ucc-green/10 flex items-center justify-center">
                  <Terminal className="text-ucc-green w-6 h-6" />
                </div>
                <span className="text-[0.7rem] font-black uppercase tracking-wider text-ucc-green bg-ucc-green-light px-3 py-1 rounded-full">
                  10° Semestre · SIEDSS
                </span>
              </div>

              <h3 className="font-heading font-black text-2xl text-ucc-navy mb-1">
                Alejandro Sierra Rincones
              </h3>
              <p className="text-ucc-muted font-body text-xs font-bold mb-4 flex items-center gap-1.5">
                <GraduationCap size={14} className="text-ucc-cyan" /> Ingeniería de Sistemas UCC
              </p>
              
              <p className="text-ucc-muted text-sm font-semibold leading-relaxed mb-6">
                Estudiante investigador del semillero SIEDSS en su etapa final de ingeniería. Apasionado por la resolución de problemas lógicos complejos, la optimización de código y la arquitectura de bases de datos. Alejandro lideró el diseño lógico, la conexión con microservicios y la estabilidad en la integración de datos para garantizar que HUASI sea un sistema seguro y robusto.
              </p>
            </div>

            <div className="pt-4 border-t border-ucc-border/30 flex items-center gap-3">
              <Heart size={16} className="text-red-500 fill-current" />
              <span className="text-xs font-bold text-ucc-navy">Co-Fundador y Desarrollador Full-Stack</span>
            </div>
          </div>

          {/* Arnold Mendoza Card */}
          <div className="bg-white border border-ucc-border/60 hover:border-ucc-green/35 hover:-translate-y-1.5 transition-all duration-300 rounded-xl-custom p-8 shadow-custom-sm hover:shadow-custom flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-ucc-cyan/10 flex items-center justify-center">
                  <Code2 className="text-ucc-cyan w-6 h-6" />
                </div>
                <span className="text-[0.7rem] font-black uppercase tracking-wider text-ucc-cyan bg-ucc-cyan-light px-3 py-1 rounded-full">
                  10° Semestre · SIEDSS
                </span>
              </div>

              <h3 className="font-heading font-black text-2xl text-ucc-navy mb-1">
                Arnold Mendoza Flores
              </h3>
              <p className="text-ucc-muted font-body text-xs font-bold mb-4 flex items-center gap-1.5">
                <GraduationCap size={14} className="text-ucc-green" /> Ingeniería de Sistemas UCC
              </p>
              
              <p className="text-ucc-muted text-sm font-semibold leading-relaxed mb-6">
                Estudiante en su 10° semestre de Ingeniería de Sistemas e integrante activo del semillero SIEDSS. Especialista en la construcción de interfaces de usuario interactivas, fluidas y con un alto nivel de detalle visual. Arnold fue el encargado de materializar el diseño premium con Tailwind CSS, garantizando la responsividad del sistema y creando micro-animaciones que hacen de HUASI una experiencia visual de primer nivel.
              </p>
            </div>

            <div className="pt-4 border-t border-ucc-border/30 flex items-center gap-3">
              <Heart size={16} className="text-red-500 fill-current" />
              <span className="text-xs font-bold text-ucc-navy">Co-Fundador y Diseñador Front-End</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== PIE DE INVITACIÓN ===== */}
      <div className="mt-16 text-center bg-ucc-bg border border-ucc-border/30 rounded-2xl p-8 max-w-xl mx-auto">
        <h4 className="font-heading font-bold text-lg text-ucc-navy mb-2">¿Quieres conocer más sobre el proyecto?</h4>
        <p className="text-ucc-muted text-xs font-semibold leading-relaxed mb-4">
          HUASI es un proyecto abierto y en constante crecimiento impulsado por estudiantes con visión solidaria. Si tienes sugerencias de mejora, contáctanos a través de los canales del semillero.
        </p>
        <div className="flex justify-center gap-6">
          <div className="flex items-center gap-1.5">
            <img src="/ucc_logo.png" alt="UCC" className="h-6 object-contain sponsor-logo-light" />
          </div>
          <div className="h-5 w-[1px] bg-ucc-border" />
          <div className="flex items-center gap-1.5">
            <img src="/indesco.png" alt="INDESCO" className="h-5 object-contain sponsor-logo-light" />
          </div>
        </div>
      </div>
    </div>
  );
}
