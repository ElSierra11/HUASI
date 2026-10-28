import { Link } from 'react-router-dom';
import { Heart, Building2, ShieldCheck, FileText, Info, Lock, MapPin, Mail } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#061510] text-slate-300 border-t border-ucc-green/30 pt-12 pb-20 md:pb-12 relative overflow-hidden">
      {/* Glow effect in footer background */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[150px] bg-gradient-to-r from-ucc-green/10 via-emerald-500/10 to-transparent filter blur-[80px] pointer-events-none z-0" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          
          {/* Column 1: Brand & Slogan */}
          <div className="space-y-4">
            <Link to="/" className="flex items-center gap-2.5 group huasi-brand-container">
              <img 
                src="/huasi-monograma.png" 
                alt="HUASI Monograma" 
                className="h-9 w-9 object-contain huasi-brand-monogram" 
              />
              <span className="font-heading font-black text-2xl text-white tracking-tight huasi-brand-text">
                HUASI
              </span>
            </Link>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed">
              Red autogestionada y voluntaria de estudiantes para el alojamiento solidario universitario de profesores y colaboradores de la comunidad académica.
            </p>
            <div className="inline-flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full text-xs font-bold text-emerald-400">
              <ShieldCheck size={14} className="text-emerald-400" />
              <span>Red 100% Solidaria y Gratuita</span>
            </div>

            {/* Logos institucionales en el footer */}
            <div className="pt-3 border-t border-slate-800">
              <p className="text-[0.65rem] text-slate-500 font-semibold mb-3 uppercase tracking-wider">
                Con el apoyo de INDESCO &middot; Territorios Solidarios &mdash; UCC
              </p>
              <div className="flex items-center gap-4 flex-wrap">
                <a 
                  href="https://www.ucc.edu.co/indesco" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:scale-105 transition-transform duration-200 block"
                >
                  <img
                    src="/indesco.png"
                    alt="INDESCO"
                    loading="lazy"
                    decoding="async"
                    className="h-8 w-auto object-contain brightness-0 invert opacity-85 hover:opacity-100 transition-all"
                  />
                </a>
                <a 
                  href="https://www.ucc.edu.co" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:scale-105 transition-transform duration-200 block"
                >
                  <img
                    src="/ucc_logo.png"
                    alt="Universidad Cooperativa de Colombia"
                    loading="lazy"
                    decoding="async"
                    className="h-8 w-auto object-contain brightness-0 invert opacity-85 hover:opacity-100 transition-all"
                  />
                </a>
                <a 
                  href="https://www.ucc.edu.co" 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="hover:scale-105 transition-transform duration-200 block"
                >
                  <img
                    src="/territorios_solidarios.png"
                    alt="Territorios Solidarios UCC"
                    loading="lazy"
                    decoding="async"
                    className="h-8 w-auto object-contain brightness-0 invert opacity-85 hover:opacity-100 transition-all"
                  />
                </a>
              </div>
            </div>
          </div>

          {/* Column 2: Campus Principales */}
          <div>
            <h4 className="font-heading font-black text-sm text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Building2 size={16} className="text-emerald-400" /> Campus Destacados
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold">
              {['Santa Marta', 'Bogotá', 'Medellín', 'Bucaramanga'].map((campus) => (
                <li key={campus}>
                  <Link 
                    to={`/?campus=${encodeURIComponent(campus)}`} 
                    className="text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                  >
                    <MapPin size={12} className="text-emerald-500/70" /> Campus {campus}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Información e Institucional */}
          <div>
            <h4 className="font-heading font-black text-sm text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Info size={16} className="text-emerald-400" /> Institucional
            </h4>
            <ul className="space-y-2.5 text-xs font-semibold">
              <li>
                <Link to="/quienes-somos" className="text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <Info size={12} className="text-emerald-500/70" /> ¿Quiénes Somos?
                </Link>
              </li>
              <li>
                <Link to="/terminos" className="text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <FileText size={12} className="text-emerald-500/70" /> Términos y Condiciones
                </Link>
              </li>
              <li>
                <Link to="/privacidad" className="text-slate-400 hover:text-emerald-400 transition-colors flex items-center gap-1.5">
                  <Lock size={12} className="text-emerald-500/70" /> Política de Privacidad
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Soporte y Comunidad */}
          <div>
            <h4 className="font-heading font-black text-sm text-white uppercase tracking-wider mb-4 flex items-center gap-2">
              <Heart size={16} className="text-emerald-400" /> Comunidad
            </h4>
            <p className="text-xs text-slate-400 font-semibold leading-relaxed mb-3">
              Construida con dedicación por estudiantes investigadores para apoyar la movilidad académica.
            </p>
            <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
              <Mail size={14} className="text-emerald-400" />
              <a href="mailto:huasicorrespondencia@gmail.com" className="hover:text-emerald-400 transition-colors">
                huasicorrespondencia@gmail.com
              </a>
            </div>
          </div>

        </div>

        {/* Divider & Copyright */}
        <div className="pt-8 border-t border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 text-xs font-semibold text-slate-500">
          <p>© {currentYear} HUASI - Hospedaje Solidario Universitario. Todos los derechos reservados.</p>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-1 text-slate-400">
              <span>Semillero SIEDSS &mdash; Grupo INDESCO &middot; Universidad Cooperativa de Colombia</span>
              <Heart size={12} className="text-emerald-500 fill-emerald-500 ml-1" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
