import { useState, useEffect } from 'react';
import { GraduationCap, Building2, Users, Code2, Heart, Award, Terminal, BookOpen, MapPin, ShieldAlert } from 'lucide-react';

export default function QuienesSomos() {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const images = ['/campus_solidario.jpg'];
  const [activeTab, setActiveTab] = useState('quienes');

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 5000); // Cambiar imagen cada 5 segundos
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-10">
      {/* ===== HEADER ===== */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <span className="text-xs font-black text-ucc-green tracking-widest uppercase bg-ucc-green/10 px-3 py-1.5 rounded-full">
          Nuestra Comunidad
        </span>
        <h1 className="font-heading font-black text-4xl md:text-5xl text-ucc-navy mt-4 mb-4 leading-tight">
          Comunidad HUASI
        </h1>
        <p className="text-ucc-muted font-body text-base leading-relaxed font-semibold">
          Conoce al equipo de ingeniería, los pilares de la red de hospedaje solidario y el decálogo de convivencia para un hospedaje seguro.
        </p>
      </div>

      {/* Tabs Selector */}
      <div className="flex justify-center gap-4 mb-12 border-b border-ucc-border pb-4">
        <button
          onClick={() => setActiveTab('quienes')}
          className={`px-6 py-2.5 rounded-full font-bold text-xs md:text-sm transition-all duration-200 ${
            activeTab === 'quienes'
              ? 'bg-ucc-green text-white shadow-custom'
              : 'text-ucc-muted hover:bg-ucc-bg'
          }`}
          style={{ border: 'none', cursor: 'pointer', outline: 'none' }}
        >
          ¿Quiénes Somos?
        </button>
        <button
          onClick={() => setActiveTab('guia')}
          className={`px-6 py-2.5 rounded-full font-bold text-xs md:text-sm transition-all duration-200 ${
            activeTab === 'guia'
              ? 'bg-ucc-green text-white shadow-custom'
              : 'text-ucc-muted hover:bg-ucc-bg'
          }`}
          style={{ border: 'none', cursor: 'pointer', outline: 'none' }}
        >
          Guía Solidaria & Seguridad
        </button>
      </div>

      {activeTab === 'quienes' ? (
        <div className="animate-fadeIn">
          {/* ===== PILARES DE LA RED SOLIDARIA ===== */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center mb-20">
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center gap-3">
                <Building2 className="text-ucc-green w-8 h-8" />
                <h2 className="font-heading font-black text-2xl md:text-3xl text-ucc-navy">
                  Iniciativa Solidaria y Educativa
                </h2>
              </div>
              
              <p className="text-ucc-muted text-sm md:text-base leading-relaxed font-semibold">
                <strong>HUASI</strong> es una iniciativa estudiantil para crear una red informal de hospedaje solidario. Este sistema busca mitigar las barreras de movilidad académica para estudiantes y colaboradores en todo el país, operando bajo un modelo con base en la economía solidaria.
              </p>

              <div className="space-y-4">
                <div className="p-5 bg-white border border-ucc-border/50 rounded-2xl shadow-custom-sm">
                  <h3 className="font-heading font-bold text-base text-ucc-navy mb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-ucc-cyan" /> Red Universitaria
                  </h3>
                  <p className="text-ucc-muted text-xs md:text-sm font-semibold leading-relaxed">
                    Promueve la formación integral con un fuerte enfoque social. A través de HUASI, la comunidad universitaria reafirma su compromiso con la equidad, facilitando que estudiantes y docentes tengan un hogar seguro en campus de cualquier ciudad del país.
                  </p>
                </div>

                <div className="p-5 bg-white border border-ucc-border/50 rounded-2xl shadow-custom-sm">
                  <h3 className="font-heading font-bold text-base text-ucc-navy mb-2 flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-ucc-green" /> Economía Solidaria
                  </h3>
                  <p className="text-ucc-muted text-xs md:text-sm font-semibold leading-relaxed">
                    Aporta la fundamentación cooperativa de esta plataforma. Aseguramos que HUASI sea un espacio de intercambio sin ánimo de lucro, basado en la confianza mutua, la cooperación y el bienestar colectivo.
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
                    alt={`Campus ${idx + 1}`} 
                    className={`absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out ${
                      currentImageIndex === idx ? 'opacity-100 scale-105' : 'opacity-0 scale-100'
                    }`}
                  />
                ))}
                <div className="absolute bottom-6 left-6 right-6 z-20 flex justify-between items-center">
                  <div className="inline-flex items-center gap-2 bg-white/90 backdrop-blur-sm px-4 py-1.5 rounded-full text-xs font-bold text-ucc-navy shadow-sm">
                    <MapPin size={12} className="text-ucc-green" /> Campus Universitario · Infraestructura Solidaria
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
            <div className="absolute top-[-20%] right-[-10%] w-[350px] h-[350px] bg-gradient-to-r from-white/10 to-transparent rounded-full filter blur-[60px] pointer-events-none" />
            
            <div className="relative z-10 max-w-3xl">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-3.5 py-1.5 rounded-full text-xs font-bold text-white mb-6 border border-white/10">
                <BookOpen size={14} className="text-yellow-300" /> Semillero de Investigación
              </div>
              
              <h2 className="font-heading font-black text-3xl md:text-4xl text-white mb-4 leading-tight">
                Semillero de Investigación SIEDSS
              </h2>
              
              <p className="text-white/90 font-body text-sm md:text-base mb-6 leading-relaxed">
                HUASI no es solo una aplicación de hospedaje; es un proyecto científico-tecnológico desarrollado en el marco del semillero de investigación <strong>SIEDSS</strong>. Aquí, los estudiantes de ingeniería investigan, estructuran y ponen en marcha soluciones de software orientadas a resolver problemas reales de nuestra comunidad académica, aplicando metodologías ágiles, arquitectura de software escalable y desarrollo full-stack moderno.
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
                  <p className="text-white/70 text-[0.7rem] leading-relaxed">Conexión de múltiples campus mediante sistemas distribuidos.</p>
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
                    <GraduationCap size={14} className="text-ucc-cyan" /> Ingeniería de Sistemas
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
                    <GraduationCap size={14} className="text-ucc-green" /> Ingeniería de Sistemas
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
        </div>
      ) : (
        <div className="space-y-12 animate-fadeIn">
          {/* Decálogo */}
          <div className="bg-ucc-bg border border-ucc-border/50 rounded-2xl p-6 text-center max-w-3xl mx-auto">
            <h2 className="text-lg font-bold text-ucc-navy mb-2 flex items-center justify-center gap-2">
              <Heart size={20} className="text-red-500" /> Decálogo de Convivencia Solidaria HUASI
            </h2>
            <p className="text-xs text-ucc-muted leading-relaxed font-semibold">
              El hospedaje cooperativo se fundamenta en la confianza mutua, la corresponsabilidad y los principios de la economía solidaria. Sigue estas recomendaciones para garantizar una estadía de excelencia académica.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Anfitriones */}
            <div className="card p-8">
              <h3 className="text-lg font-bold text-ucc-green mb-4 flex items-center gap-2">
                <Building2 size={20} /> Para el Anfitrión Solidario
              </h3>
              <ul className="space-y-4 text-xs font-semibold text-ucc-muted">
                <li className="flex gap-2 items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-ucc-green mt-1.5 flex-shrink-0" />
                  <span><strong>Preparación del cuarto:</strong> Ofrece un espacio limpio, con iluminación adecuada para estudiar y privacidad básica.</span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-ucc-green mt-1.5 flex-shrink-0" />
                  <span><strong>Alineación de hábitos:</strong> Dialoga con tu huésped sobre los horarios de sueño, el uso del internet y si compartes comidas o zonas comunes.</span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-ucc-green mt-1.5 flex-shrink-0" />
                  <span><strong>Normas de seguridad:</strong> Explica cómo cerrar las puertas de seguridad, el uso de electrodomésticos y qué hacer ante emergencias.</span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-ucc-green mt-1.5 flex-shrink-0" />
                  <span><strong>Empatía y Mentoría:</strong> Recuerda que muchos huéspedes provienen de otros campus y están lejos de sus familias. Guíalos en la ciudad.</span>
                </li>
              </ul>
            </div>

            {/* Huéspedes */}
            <div className="card p-8">
              <h3 className="text-lg font-bold text-ucc-cyan mb-4 flex items-center gap-2">
                <Users size={20} /> Para el Huésped HUASI
              </h3>
              <ul className="space-y-4 text-xs font-semibold text-ucc-muted">
                <li className="flex gap-2 items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-ucc-cyan mt-1.5 flex-shrink-0" />
                  <span><strong>Respeto y Silencio:</strong> Alinéate con las horas de descanso del hogar. Si estudias de noche, hazlo en silencio.</span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-ucc-cyan mt-1.5 flex-shrink-0" />
                  <span><strong>Colaboración activa:</strong> Apoya con las tareas básicas de aseo en zonas comunes. La economía solidaria implica corresponsabilidad.</span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-ucc-cyan mt-1.5 flex-shrink-0" />
                  <span><strong>Prohibiciones estrictas:</strong> No traigas visitas no autorizadas, ni consumas alcohol o sustancias controladas dentro de la propiedad.</span>
                </li>
                <li className="flex gap-2 items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-ucc-cyan mt-1.5 flex-shrink-0" />
                  <span><strong>Puntualidad en salida:</strong> Cumple con las fechas acordadas de reserva para no entorpecer los compromisos de tu anfitrión.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bienestar Universitario */}
          <div className="card p-8 border-l-4 border-red-500 bg-red-50/5">
            <h3 className="text-lg font-bold text-red-600 mb-2 flex items-center gap-2">
              <ShieldAlert size={20} /> Soporte de Emergencia y Bienestar
            </h3>
            <p className="text-xs text-ucc-muted mb-6">
              Si experimentas alguna situación de riesgo, conflicto de convivencia o requieres apoyo emocional o médico durante tu estadía:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <div className="bg-white/40 p-4 rounded-xl border border-ucc-border/50 text-center">
                <strong className="block text-sm text-ucc-navy mb-1">Bienestar Universitario</strong>
                <span className="text-xs font-bold text-red-600">Bienestar Institucional</span>
                <span className="block text-[10px] text-ucc-muted mt-1">Apoyo psicosocial y acompañamiento</span>
              </div>
              <div className="bg-white/40 p-4 rounded-xl border border-ucc-border/50 text-center">
                <strong className="block text-sm text-ucc-navy mb-1">Soporte HUASI</strong>
                <span className="text-xs font-bold text-ucc-cyan">soporte@huasi.edu.co</span>
                <span className="block text-[10px] text-ucc-muted mt-1">Asistencia de la plataforma 24/7</span>
              </div>
              <div className="bg-white/40 p-4 rounded-xl border border-ucc-border/50 text-center">
                <strong className="block text-sm text-ucc-navy mb-1">Emergencias Nacionales</strong>
                <span className="text-xs font-bold text-amber-600">Línea Nacional: 123</span>
                <span className="block text-[10px] text-ucc-muted mt-1">Policía, Bomberos y Ambulancia</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== PIE DE INVITACIÓN ===== */}
      <div className="mt-16 text-center bg-ucc-bg border border-ucc-border/30 rounded-2xl p-8 max-w-xl mx-auto">
        <h4 className="font-heading font-bold text-lg text-ucc-navy mb-2">¿Quieres conocer más sobre el proyecto?</h4>
        <p className="text-ucc-muted text-xs font-semibold leading-relaxed mb-4">
          HUASI es un proyecto abierto y en constante crecimiento impulsado por estudiantes con visión solidaria. Si tienes sugerencias de mejora, contáctanos a través de los canales del semillero.
        </p>
      </div>
    </div>
  );
}
