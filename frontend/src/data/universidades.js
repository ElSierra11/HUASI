// ============================================================
// Universidades de Colombia habilitadas en HUASI
// ------------------------------------------------------------
// Cada universidad declara sus dominios de correo institucional.
// Se acepta el dominio exacto O cualquier subdominio del mismo
// (ej: "unicordoba.edu.co" acepta "correo.unicordoba.edu.co").
//
// ⚠️ MANTENER SINCRONIZADO con services/auth/data/universidades.js
// ============================================================

export const UNIVERSIDADES = [
  // ---- Montería / Córdoba ----
  { id: 'ucc', nombre: 'Universidad Cooperativa de Colombia', sigla: 'UCC', dominios: ['campusucc.edu.co', 'ucc.edu.co'] },
  { id: 'unicordoba', nombre: 'Universidad de Córdoba', sigla: 'Unicórdoba', dominios: ['unicordoba.edu.co'] },
  { id: 'unisinu', nombre: 'Universidad del Sinú', sigla: 'Unisinú', dominios: ['unisinu.edu.co'] },
  { id: 'upb', nombre: 'Universidad Pontificia Bolivariana', sigla: 'UPB', dominios: ['upb.edu.co'] },
  { id: 'cun', nombre: 'Corporación Unificada Nacional de Educación Superior', sigla: 'CUN', dominios: ['cun.edu.co'] },
  { id: 'remington', nombre: 'Corporación Universitaria Remington', sigla: 'Uniremington', dominios: ['uniremington.edu.co'] },
  { id: 'unad', nombre: 'Universidad Nacional Abierta y a Distancia', sigla: 'UNAD', dominios: ['unadvirtual.edu.co', 'unad.edu.co'] },
  { id: 'sena', nombre: 'Servicio Nacional de Aprendizaje', sigla: 'SENA', dominios: ['sena.edu.co'] },

  // ---- Públicas nacionales ----
  { id: 'unal', nombre: 'Universidad Nacional de Colombia', sigla: 'UNAL', dominios: ['unal.edu.co'] },
  { id: 'udea', nombre: 'Universidad de Antioquia', sigla: 'UdeA', dominios: ['udea.edu.co'] },
  { id: 'univalle', nombre: 'Universidad del Valle', sigla: 'Univalle', dominios: ['correounivalle.edu.co', 'univalle.edu.co'] },
  { id: 'uis', nombre: 'Universidad Industrial de Santander', sigla: 'UIS', dominios: ['uis.edu.co'] },
  { id: 'udistrital', nombre: 'Universidad Distrital Francisco José de Caldas', sigla: 'UD', dominios: ['udistrital.edu.co'] },
  { id: 'upn', nombre: 'Universidad Pedagógica Nacional', sigla: 'UPN', dominios: ['upn.edu.co', 'pedagogica.edu.co'] },
  { id: 'umng', nombre: 'Universidad Militar Nueva Granada', sigla: 'UMNG', dominios: ['unimilitar.edu.co'] },
  { id: 'uptc', nombre: 'Universidad Pedagógica y Tecnológica de Colombia', sigla: 'UPTC', dominios: ['uptc.edu.co'] },
  { id: 'unimagdalena', nombre: 'Universidad del Magdalena', sigla: 'Unimagdalena', dominios: ['unimagdalena.edu.co'] },
  { id: 'unicartagena', nombre: 'Universidad de Cartagena', sigla: 'UdeC', dominios: ['unicartagena.edu.co'] },
  { id: 'uniatlantico', nombre: 'Universidad del Atlántico', sigla: 'Uniatlántico', dominios: ['uniatlantico.edu.co'] },
  { id: 'unisucre', nombre: 'Universidad de Sucre', sigla: 'Unisucre', dominios: ['unisucre.edu.co'] },
  { id: 'unicesar', nombre: 'Universidad Popular del Cesar', sigla: 'UPC', dominios: ['unicesar.edu.co'] },
  { id: 'uniguajira', nombre: 'Universidad de La Guajira', sigla: 'Uniguajira', dominios: ['uniguajira.edu.co'] },
  { id: 'utp', nombre: 'Universidad Tecnológica de Pereira', sigla: 'UTP', dominios: ['utp.edu.co'] },
  { id: 'ucaldas', nombre: 'Universidad de Caldas', sigla: 'UCaldas', dominios: ['ucaldas.edu.co'] },
  { id: 'uniquindio', nombre: 'Universidad del Quindío', sigla: 'Uniquindío', dominios: ['uniquindio.edu.co'] },
  { id: 'unicauca', nombre: 'Universidad del Cauca', sigla: 'Unicauca', dominios: ['unicauca.edu.co'] },
  { id: 'udenar', nombre: 'Universidad de Nariño', sigla: 'Udenar', dominios: ['udenar.edu.co'] },
  { id: 'ut', nombre: 'Universidad del Tolima', sigla: 'UT', dominios: ['ut.edu.co'] },
  { id: 'usco', nombre: 'Universidad Surcolombiana', sigla: 'USCO', dominios: ['usco.edu.co'] },
  { id: 'unillanos', nombre: 'Universidad de los Llanos', sigla: 'Unillanos', dominios: ['unillanos.edu.co'] },
  { id: 'unipamplona', nombre: 'Universidad de Pamplona', sigla: 'Unipamplona', dominios: ['unipamplona.edu.co'] },
  { id: 'ufps', nombre: 'Universidad Francisco de Paula Santander', sigla: 'UFPS', dominios: ['ufps.edu.co'] },
  { id: 'utch', nombre: 'Universidad Tecnológica del Chocó', sigla: 'UTCH', dominios: ['utch.edu.co'] },
  { id: 'ucundinamarca', nombre: 'Universidad de Cundinamarca', sigla: 'UDEC', dominios: ['ucundinamarca.edu.co'] },
  { id: 'itm', nombre: 'Instituto Tecnológico Metropolitano', sigla: 'ITM', dominios: ['itm.edu.co'] },
  { id: 'elpoli', nombre: 'Politécnico Colombiano Jaime Isaza Cadavid', sigla: 'Poli JIC', dominios: ['elpoli.edu.co'] },

  // ---- Privadas ----
  { id: 'uniandes', nombre: 'Universidad de los Andes', sigla: 'Uniandes', dominios: ['uniandes.edu.co'] },
  { id: 'javeriana', nombre: 'Pontificia Universidad Javeriana', sigla: 'PUJ', dominios: ['javeriana.edu.co', 'javerianacali.edu.co'] },
  { id: 'urosario', nombre: 'Universidad del Rosario', sigla: 'UR', dominios: ['urosario.edu.co'] },
  { id: 'uexternado', nombre: 'Universidad Externado de Colombia', sigla: 'Externado', dominios: ['uexternado.edu.co'] },
  { id: 'unisabana', nombre: 'Universidad de La Sabana', sigla: 'Unisabana', dominios: ['unisabana.edu.co'] },
  { id: 'eafit', nombre: 'Universidad EAFIT', sigla: 'EAFIT', dominios: ['eafit.edu.co'] },
  { id: 'uninorte', nombre: 'Universidad del Norte', sigla: 'Uninorte', dominios: ['uninorte.edu.co'] },
  { id: 'icesi', nombre: 'Universidad Icesi', sigla: 'Icesi', dominios: ['icesi.edu.co'] },
  { id: 'uao', nombre: 'Universidad Autónoma de Occidente', sigla: 'UAO', dominios: ['uao.edu.co'] },
  { id: 'usc', nombre: 'Universidad Santiago de Cali', sigla: 'USC', dominios: ['usc.edu.co'] },
  { id: 'unab', nombre: 'Universidad Autónoma de Bucaramanga', sigla: 'UNAB', dominios: ['unab.edu.co'] },
  { id: 'udes', nombre: 'Universidad de Santander', sigla: 'UDES', dominios: ['udes.edu.co'] },
  { id: 'usantotomas', nombre: 'Universidad Santo Tomás', sigla: 'USTA', dominios: ['usantotomas.edu.co', 'ustabuca.edu.co', 'ustatunja.edu.co', 'ustamed.edu.co', 'ustavillavicencio.edu.co'] },
  { id: 'unisalle', nombre: 'Universidad de La Salle', sigla: 'La Salle', dominios: ['unisalle.edu.co'] },
  { id: 'usergioarboleda', nombre: 'Universidad Sergio Arboleda', sigla: 'USA', dominios: ['usa.edu.co'] },
  { id: 'utadeo', nombre: 'Universidad de Bogotá Jorge Tadeo Lozano', sigla: 'UTadeo', dominios: ['utadeo.edu.co'] },
  { id: 'unbosque', nombre: 'Universidad El Bosque', sigla: 'UEB', dominios: ['unbosque.edu.co'] },
  { id: 'ucentral', nombre: 'Universidad Central', sigla: 'UC', dominios: ['ucentral.edu.co'] },
  { id: 'unipiloto', nombre: 'Universidad Piloto de Colombia', sigla: 'Unipiloto', dominios: ['unipiloto.edu.co'] },
  { id: 'unilibre', nombre: 'Universidad Libre', sigla: 'Unilibre', dominios: ['unilibre.edu.co'] },
  { id: 'ucatolica', nombre: 'Universidad Católica de Colombia', sigla: 'UCatólica', dominios: ['ucatolica.edu.co'] },
  { id: 'ean', nombre: 'Universidad EAN', sigla: 'EAN', dominios: ['universidadean.edu.co'] },
  { id: 'escuelaing', nombre: 'Escuela Colombiana de Ingeniería Julio Garavito', sigla: 'ECI', dominios: ['escuelaing.edu.co'] },
  { id: 'ecci', nombre: 'Universidad ECCI', sigla: 'ECCI', dominios: ['ecci.edu.co'] },
  { id: 'konradlorenz', nombre: 'Fundación Universitaria Konrad Lorenz', sigla: 'Konrad Lorenz', dominios: ['konradlorenz.edu.co'] },
  { id: 'uan', nombre: 'Universidad Antonio Nariño', sigla: 'UAN', dominios: ['uan.edu.co'] },
  { id: 'umb', nombre: 'Universidad Manuela Beltrán', sigla: 'UMB', dominios: ['umb.edu.co'] },
  { id: 'poligran', nombre: 'Politécnico Grancolombiano', sigla: 'Poligran', dominios: ['poligran.edu.co'] },
  { id: 'areandina', nombre: 'Fundación Universitaria del Área Andina', sigla: 'Areandina', dominios: ['areandina.edu.co'] },
  { id: 'uniminuto', nombre: 'Corporación Universitaria Minuto de Dios', sigla: 'Uniminuto', dominios: ['uniminuto.edu.co', 'uniminuto.edu'] },
  { id: 'udemedellin', nombre: 'Universidad de Medellín', sigla: 'UdeM', dominios: ['udem.edu.co', 'soyudemedellin.edu.co'] },
  { id: 'ces', nombre: 'Universidad CES', sigla: 'CES', dominios: ['ces.edu.co'] },
  { id: 'amigo', nombre: 'Universidad Católica Luis Amigó', sigla: 'Funlam', dominios: ['amigo.edu.co'] },
  { id: 'usb', nombre: 'Universidad de San Buenaventura', sigla: 'USB', dominios: ['usbmed.edu.co', 'usbbog.edu.co', 'usbcali.edu.co', 'usbctg.edu.co', 'usb.edu.co'] },
  { id: 'umanizales', nombre: 'Universidad de Manizales', sigla: 'UManizales', dominios: ['umanizales.edu.co'] },
  { id: 'autonoma', nombre: 'Universidad Autónoma de Manizales', sigla: 'UAM', dominios: ['autonoma.edu.co'] },
  { id: 'unibague', nombre: 'Universidad de Ibagué', sigla: 'Unibagué', dominios: ['unibague.edu.co'] },
  { id: 'uniboyaca', nombre: 'Universidad de Boyacá', sigla: 'Uniboyacá', dominios: ['uniboyaca.edu.co'] },
  { id: 'umariana', nombre: 'Universidad Mariana', sigla: 'UMariana', dominios: ['umariana.edu.co'] },
  { id: 'cuc', nombre: 'Universidad de la Costa', sigla: 'CUC', dominios: ['cuc.edu.co'] },
  { id: 'unisimon', nombre: 'Universidad Simón Bolívar', sigla: 'Unisimón', dominios: ['unisimon.edu.co', 'unisimonbolivar.edu.co'] },
  { id: 'uac', nombre: 'Universidad Autónoma del Caribe', sigla: 'Uautónoma', dominios: ['uac.edu.co'] },
  { id: 'utb', nombre: 'Universidad Tecnológica de Bolívar', sigla: 'UTB', dominios: ['utb.edu.co'] },
  { id: 'unisangil', nombre: 'Fundación Universitaria de San Gil', sigla: 'Unisangil', dominios: ['unisangil.edu.co'] },
];

// Ciudades de Colombia disponibles para el registro (orden alfabético, Montería incluida)
export const CIUDADES = [
  'Arauca', 'Armenia', 'Barrancabermeja', 'Barranquilla', 'Bogotá', 'Bucaramanga', 'Cali',
  'Cartagena', 'Cúcuta', 'Florencia', 'Ibagué', 'Leticia', 'Manizales', 'Medellín', 'Mocoa',
  'Montería', 'Neiva', 'Pamplona', 'Pasto', 'Pereira', 'Popayán', 'Quibdó', 'Riohacha',
  'San Andrés', 'San Gil', 'Santa Marta', 'Sincelejo', 'Tunja', 'Valledupar', 'Villavicencio',
  'Yopal', 'Otra',
];

export const getUniversidadById = (id) => UNIVERSIDADES.find(u => u.id === id) || null;

// ¿El dominio coincide exactamente o es subdominio de alguno permitido?
export const dominioCoincide = (dominio, permitidos) => {
  const d = String(dominio || '').toLowerCase().trim();
  if (!d) return false;
  return permitidos.some(p => d === p || d.endsWith('.' + p));
};

// Valida que el correo pertenezca a la universidad indicada
export const correoPerteneceAUniversidad = (email, universidadId) => {
  const uni = getUniversidadById(universidadId);
  if (!uni || !email || !email.includes('@')) return false;
  return dominioCoincide(email.split('@')[1], uni.dominios);
};

// Busca la universidad a partir del correo (útil para autoseleccionar)
export const getUniversidadPorCorreo = (email) => {
  if (!email || !email.includes('@')) return null;
  const dominio = email.split('@')[1];
  return UNIVERSIDADES.find(u => dominioCoincide(dominio, u.dominios)) || null;
};

// ¿El correo pertenece a CUALQUIER universidad habilitada? (login / recuperar contraseña)
export const esCorreoInstitucionalValido = (email) => !!getUniversidadPorCorreo(email);
