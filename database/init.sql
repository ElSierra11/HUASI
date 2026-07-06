-- ============================================
-- StayU - Inicialización de Base de Datos
-- ============================================

-- Tabla de usuarios
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    telefono VARCHAR(20),
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    foto_perfil TEXT,
    email_verificado BOOLEAN DEFAULT FALSE,
    otp_code VARCHAR(6),
    otp_expires_at TIMESTAMP,
    verificado BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    otp_attempts INTEGER DEFAULT 0,
    otp_locked_until TIMESTAMP,
    otp_last_sent_at TIMESTAMP,
    otp_resend_count INTEGER DEFAULT 0
);

-- Tabla de verificaciones universitarias
CREATE TABLE IF NOT EXISTS verificaciones (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    universidad VARCHAR(200) NOT NULL,
    tipo VARCHAR(20) NOT NULL,
    carnet_url TEXT NOT NULL,
    documento_url TEXT,
    estado VARCHAR(20) DEFAULT 'pendiente',
    revisado_por INTEGER REFERENCES users(id),
    notas TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de almacenamiento de archivos
CREATE TABLE IF NOT EXISTS archivos (
    id SERIAL PRIMARY KEY,
    nombre VARCHAR(255) NOT NULL,
    mimetype VARCHAR(100) NOT NULL,
    datos BYTEA NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de propiedades / alojamientos
CREATE TABLE IF NOT EXISTS propiedades (
    id SERIAL PRIMARY KEY,
    host_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    titulo VARCHAR(200) NOT NULL,
    descripcion TEXT,
    direccion VARCHAR(300) NOT NULL,
    barrio VARCHAR(100),
    ciudad VARCHAR(100) DEFAULT 'Santa Marta',
    latitud DECIMAL(10,8),
    longitud DECIMAL(11,8),
    tipo VARCHAR(50) NOT NULL,
    capacidad INTEGER NOT NULL DEFAULT 1,
    amenidades TEXT[],
    reglas TEXT,
    fotos TEXT[],
    activo BOOLEAN DEFAULT TRUE,
    es_pago BOOLEAN DEFAULT FALSE NOT NULL,
    precio_por_noche DECIMAL(12, 2) DEFAULT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de disponibilidad
CREATE TABLE IF NOT EXISTS disponibilidad (
    id SERIAL PRIMARY KEY,
    propiedad_id INTEGER REFERENCES propiedades(id) ON DELETE CASCADE,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    disponible BOOLEAN DEFAULT TRUE
);

-- Tabla de reservas
CREATE TABLE IF NOT EXISTS reservas (
    id SERIAL PRIMARY KEY,
    propiedad_id INTEGER REFERENCES propiedades(id) ON DELETE CASCADE,
    guest_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    fecha_inicio DATE NOT NULL,
    fecha_fin DATE NOT NULL,
    estado VARCHAR(20) DEFAULT 'pendiente',
    mensaje TEXT,
    evento VARCHAR(200),
    num_huespedes INTEGER DEFAULT 1,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Tabla de reseñas
CREATE TABLE IF NOT EXISTS resenas (
    id SERIAL PRIMARY KEY,
    reserva_id INTEGER REFERENCES reservas(id) ON DELETE CASCADE,
    autor_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    destino_id INTEGER REFERENCES users(id),
    propiedad_id INTEGER REFERENCES propiedades(id),
    calificacion INTEGER CHECK (calificacion BETWEEN 1 AND 5),
    comentario TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Índices para mejorar performance
CREATE INDEX IF NOT EXISTS idx_propiedades_host ON propiedades(host_id);
CREATE INDEX IF NOT EXISTS idx_propiedades_activo ON propiedades(activo);
CREATE INDEX IF NOT EXISTS idx_propiedades_tipo ON propiedades(tipo);
CREATE INDEX IF NOT EXISTS idx_propiedades_es_pago ON propiedades(es_pago);
CREATE INDEX IF NOT EXISTS idx_reservas_guest ON reservas(guest_id);
CREATE INDEX IF NOT EXISTS idx_reservas_propiedad ON reservas(propiedad_id);
CREATE INDEX IF NOT EXISTS idx_reservas_estado ON reservas(estado);
CREATE INDEX IF NOT EXISTS idx_verificaciones_user ON verificaciones(user_id);
CREATE INDEX IF NOT EXISTS idx_verificaciones_estado ON verificaciones(estado);
CREATE INDEX IF NOT EXISTS idx_disponibilidad_propiedad ON disponibilidad(propiedad_id);
CREATE INDEX IF NOT EXISTS idx_disponibilidad_fechas ON disponibilidad(fecha_inicio, fecha_fin);

-- Tabla de conversaciones (chat)
CREATE TABLE IF NOT EXISTS conversaciones (
    id SERIAL PRIMARY KEY,
    user1_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    user2_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(user1_id, user2_id)
);

-- Tabla de mensajes (chat)
CREATE TABLE IF NOT EXISTS mensajes (
    id SERIAL PRIMARY KEY,
    conversacion_id INTEGER REFERENCES conversaciones(id) ON DELETE CASCADE,
    sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    contenido TEXT NOT NULL,
    leido BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversaciones_user1 ON conversaciones(user1_id);
CREATE INDEX IF NOT EXISTS idx_conversaciones_user2 ON conversaciones(user2_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_conversacion ON mensajes(conversacion_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_sender ON mensajes(sender_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_leido ON mensajes(leido);

-- Insertar usuario admin por defecto
INSERT INTO users (email, password_hash, nombre, apellido, role, verificado, email_verificado)
VALUES ('admin@stayu.com', '$2b$10$.j.FbO/mDfdvK.xpPjwacuodARggzkIcdTU5D7IcUlStBOYUmurm2', 'Admin', 'StayU', 'admin', TRUE, TRUE)
ON CONFLICT (email) DO NOTHING;

