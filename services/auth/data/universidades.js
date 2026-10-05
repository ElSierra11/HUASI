// ============================================================
// Universidades de Colombia habilitadas en HUASI (validación backend)
// Se acepta el dominio exacto o cualquier subdominio del mismo.
//
// ⚠️ MANTENER SINCRONIZADO con frontend/src/data/universidades.js
// ============================================================

const UNIVERSIDADES = [
  // ---- Montería / Córdoba ----
  { id: 'ucc', nombre: 'Universidad Cooperativa de Colombia', dominios: ['campusucc.edu.co', 'ucc.edu.co'] },
  { id: 'unicordoba', nombre: 'Universidad de Córdoba', dominios: ['unicordoba.edu.co'] },
  { id: 'unisinu', nombre: 'Universidad del Sinú', dominios: ['unisinu.edu.co'] },
  { id: 'upb', nombre: 'Universidad Pontificia Bolivariana', dominios: ['upb.edu.co'] },
  { id: 'cun', nombre: 'Corporación Unificada Nacional de Educación Superior', dominios: ['cun.edu.co'] },
  { id: 'remington', nombre: 'Corporación Universitaria Remington', dominios: ['uniremington.edu.co'] },
  { id: 'unad', nombre: 'Universidad Nacional Abierta y a Distancia', dominios: ['unadvirtual.edu.co', 'unad.edu.co'] },
  { id: 'sena', nombre: 'Servicio Nacional de Aprendizaje', dominios: ['sena.edu.co'] },

  // ---- Públicas nacionales ----
  { id: 'unal', nombre: 'Universidad Nacional de Colombia', dominios: ['unal.edu.co'] },
  { id: 'udea', nombre: 'Universidad de Antioquia', dominios: ['udea.edu.co'] },
  { id: 'univalle', nombre: 'Universidad del Valle', dominios: ['correounivalle.edu.co', 'univalle.edu.co'] },
  { id: 'uis', nombre: 'Universidad Industrial de Santander', dominios: ['uis.edu.co'] },
  { id: 'udistrital', nombre: 'Universidad Distrital Francisco José de Caldas', dominios: ['udistrital.edu.co'] },
  { id: 'upn', nombre: 'Universidad Pedagógica Nacional', dominios: ['upn.edu.co', 'pedagogica.edu.co'] },
  { id: 'umng', nombre: 'Universidad Militar Nueva Granada', dominios: ['unimilitar.edu.co'] },
  { id: 'uptc', nombre: 'Universidad Pedagógica y Tecnológica de Colombia', dominios: ['uptc.edu.co'] },
  { id: 'unimagdalena', nombre: 'Universidad del Magdalena', dominios: ['unimagdalena.edu.co'] },
  { id: 'unicartagena', nombre: 'Universidad de Cartagena', dominios: ['unicartagena.edu.co'] },
  { id: 'uniatlantico', nombre: 'Universidad del Atlántico', dominios: ['uniatlantico.edu.co'] },
  { id: 'unisucre', nombre: 'Universidad de Sucre', dominios: ['unisucre.edu.co'] },
  { id: 'unicesar', nombre: 'Universidad Popular del Cesar', dominios: ['unicesar.edu.co'] },
  { id: 'uniguajira', nombre: 'Universidad de La Guajira', dominios: ['uniguajira.edu.co'] },
  { id: 'utp', nombre: 'Universidad Tecnológica de Pereira', dominios: ['utp.edu.co'] },
  { id: 'ucaldas', nombre: 'Universidad de Caldas', dominios: ['ucaldas.edu.co'] },
  { id: 'uniquindio', nombre: 'Universidad del Quindío', dominios: ['uniquindio.edu.co'] },
  { id: 'unicauca', nombre: 'Universidad del Cauca', dominios: ['unicauca.edu.co'] },
  { id: 'udenar', nombre: 'Universidad de Nariño', dominios: ['udenar.edu.co'] },
  { id: 'ut', nombre: 'Universidad del Tolima', dominios: ['ut.edu.co'] },
  { id: 'usco', nombre: 'Universidad Surcolombiana', dominios: ['usco.edu.co'] },
  { id: 'unillanos', nombre: 'Universidad de los Llanos', dominios: ['unillanos.edu.co'] },
  { id: 'unipamplona', nombre: 'Universidad de Pamplona', dominios: ['unipamplona.edu.co'] },
  { id: 'ufps', nombre: 'Universidad Francisco de Paula Santander', dominios: ['ufps.edu.co'] },
  { id: 'utch', nombre: 'Universidad Tecnológica del Chocó', dominios: ['utch.edu.co'] },
  { id: 'ucundinamarca', nombre: 'Universidad de Cundinamarca', dominios: ['ucundinamarca.edu.co'] },
  { id: 'itm', nombre: 'Instituto Tecnológico Metropolitano', dominios: ['itm.edu.co'] },
  { id: 'elpoli', nombre: 'Politécnico Colombiano Jaime Isaza Cadavid', dominios: ['elpoli.edu.co'] },

  // ---- Privadas ----
  { id: 'uniandes', nombre: 'Universidad de los Andes', dominios: ['uniandes.edu.co'] },
  { id: 'javeriana', nombre: 'Pontificia Universidad Javeriana', dominios: ['javeriana.edu.co', 'javerianacali.edu.co'] },
  { id: 'urosario', nombre: 'Universidad del Rosario', dominios: ['urosario.edu.co'] },
  { id: 'uexternado', nombre: 'Universidad Externado de Colombia', dominios: ['uexternado.edu.co'] },
  { id: 'unisabana', nombre: 'Universidad de La Sabana', dominios: ['unisabana.edu.co'] },
  { id: 'eafit', nombre: 'Universidad EAFIT', dominios: ['eafit.edu.co'] },
  { id: 'uninorte', nombre: 'Universidad del Norte', dominios: ['uninorte.edu.co'] },
  { id: 'icesi', nombre: 'Universidad Icesi', dominios: ['icesi.edu.co'] },
  { id: 'uao', nombre: 'Universidad Autónoma de Occidente', dominios: ['uao.edu.co'] },
  { id: 'usc', nombre: 'Universidad Santiago de Cali', dominios: ['usc.edu.co'] },
  { id: 'unab', nombre: 'Universidad Autónoma de Bucaramanga', dominios: ['unab.edu.co'] },
  { id: 'udes', nombre: 'Universidad de Santander', dominios: ['udes.edu.co'] },
  { id: 'usantotomas', nombre: 'Universidad Santo Tomás', dominios: ['usantotomas.edu.co', 'ustabuca.edu.co', 'ustatunja.edu.co', 'ustamed.edu.co', 'ustavillavicencio.edu.co'] },
  { id: 'unisalle', nombre: 'Universidad de La Salle', dominios: ['unisalle.edu.co'] },
  { id: 'usergioarboleda', nombre: 'Universidad Sergio Arboleda', dominios: ['usa.edu.co'] },
  { id: 'utadeo', nombre: 'Universidad de Bogotá Jorge Tadeo Lozano', dominios: ['utadeo.edu.co'] },
  { id: 'unbosque', nombre: 'Universidad El Bosque', dominios: ['unbosque.edu.co'] },
  { id: 'ucentral', nombre: 'Universidad Central', dominios: ['ucentral.edu.co'] },
  { id: 'unipiloto', nombre: 'Universidad Piloto de Colombia', dominios: ['unipiloto.edu.co'] },
  { id: 'unilibre', nombre: 'Universidad Libre', dominios: ['unilibre.edu.co'] },
  { id: 'ucatolica', nombre: 'Universidad Católica de Colombia', dominios: ['ucatolica.edu.co'] },
  { id: 'ean', nombre: 'Universidad EAN', dominios: ['universidadean.edu.co'] },
  { id: 'escuelaing', nombre: 'Escuela Colombiana de Ingeniería Julio Garavito', dominios: ['escuelaing.edu.co'] },
  { id: 'ecci', nombre: 'Universidad ECCI', dominios: ['ecci.edu.co'] },
  { id: 'konradlorenz', nombre: 'Fundación Universitaria Konrad Lorenz', dominios: ['konradlorenz.edu.co'] },
  { id: 'uan', nombre: 'Universidad Antonio Nariño', dominios: ['uan.edu.co'] },
  { id: 'umb', nombre: 'Universidad Manuela Beltrán', dominios: ['umb.edu.co'] },
  { id: 'poligran', nombre: 'Politécnico Grancolombiano', dominios: ['poligran.edu.co'] },
  { id: 'areandina', nombre: 'Fundación Universitaria del Área Andina', dominios: ['areandina.edu.co'] },
  { id: 'uniminuto', nombre: 'Corporación Universitaria Minuto de Dios', dominios: ['uniminuto.edu.co', 'uniminuto.edu'] },
  { id: 'udemedellin', nombre: 'Universidad de Medellín', dominios: ['udem.edu.co', 'soyudemedellin.edu.co'] },
  { id: 'ces', nombre: 'Universidad CES', dominios: ['ces.edu.co'] },
  { id: 'amigo', nombre: 'Universidad Católica Luis Amigó', dominios: ['amigo.edu.co'] },
  { id: 'usb', nombre: 'Universidad de San Buenaventura', dominios: ['usbmed.edu.co', 'usbbog.edu.co', 'usbcali.edu.co', 'usbctg.edu.co', 'usb.edu.co'] },
  { id: 'umanizales', nombre: 'Universidad de Manizales', dominios: ['umanizales.edu.co'] },
  { id: 'autonoma', nombre: 'Universidad Autónoma de Manizales', dominios: ['autonoma.edu.co'] },
  { id: 'unibague', nombre: 'Universidad de Ibagué', dominios: ['unibague.edu.co'] },
  { id: 'uniboyaca', nombre: 'Universidad de Boyacá', dominios: ['uniboyaca.edu.co'] },
  { id: 'umariana', nombre: 'Universidad Mariana', dominios: ['umariana.edu.co'] },
  { id: 'cuc', nombre: 'Universidad de la Costa', dominios: ['cuc.edu.co'] },
  { id: 'unisimon', nombre: 'Universidad Simón Bolívar', dominios: ['unisimon.edu.co', 'unisimonbolivar.edu.co'] },
  { id: 'uac', nombre: 'Universidad Autónoma del Caribe', dominios: ['uac.edu.co'] },
  { id: 'utb', nombre: 'Universidad Tecnológica de Bolívar', dominios: ['utb.edu.co'] },
  { id: 'unisangil', nombre: 'Fundación Universitaria de San Gil', dominios: ['unisangil.edu.co'] },
];

const getUniversidadById = (id) => UNIVERSIDADES.find(u => u.id === id) || null;

const dominioCoincide = (dominio, permitidos) => {
  const d = String(dominio || '').toLowerCase().trim();
  if (!d) return false;
  return permitidos.some(p => d === p || d.endsWith('.' + p));
};

const getUniversidadPorCorreo = (email) => {
  if (!email || !String(email).includes('@')) return null;
  const dominio = String(email).split('@')[1];
  return UNIVERSIDADES.find(u => dominioCoincide(dominio, u.dominios)) || null;
};

const correoPerteneceAUniversidad = (email, universidadId) => {
  const uni = getUniversidadById(universidadId);
  if (!uni || !email || !String(email).includes('@')) return false;
  return dominioCoincide(String(email).split('@')[1], uni.dominios);
};

module.exports = {
  UNIVERSIDADES,
  getUniversidadById,
  getUniversidadPorCorreo,
  correoPerteneceAUniversidad,
  dominioCoincide,
};
