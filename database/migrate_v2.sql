-- ============================================
-- StayU - Migración v2
-- Agrega campos faltantes según requisitos
-- ============================================

-- 1. Agregar campus a usuarios
ALTER TABLE users ADD COLUMN IF NOT EXISTS campus VARCHAR(100);

-- 2. Agregar campos de bloqueo a usuarios
ALTER TABLE users ADD COLUMN IF NOT EXISTS bloqueado BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS motivo_bloqueo TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bloqueado_en TIMESTAMP;

-- 3. Agregar campos de seguridad OTP a usuarios
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_attempts INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_locked_until TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_last_sent_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS otp_resend_count INTEGER DEFAULT 0;

-- 4. Agregar campos faltantes a propiedades
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS campus_cercano VARCHAR(100);
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS duracion_maxima INTEGER; -- días máximos de hospedaje

-- 5. Crear tabla de reportes
CREATE TABLE IF NOT EXISTS reportes (
    id SERIAL PRIMARY KEY,
    reportador_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reportado_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    propiedad_id INTEGER REFERENCES propiedades(id) ON DELETE SET NULL,
    motivo VARCHAR(100) NOT NULL,
    descripcion TEXT,
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, revisado, resuelto
    revisado_por INTEGER REFERENCES users(id),
    notas_admin TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reportes_reportado ON reportes(reportado_id);
CREATE INDEX IF NOT EXISTS idx_reportes_estado ON reportes(estado);
CREATE INDEX IF NOT EXISTS idx_reportes_reportador ON reportes(reportador_id);

-- 6. Índices adicionales
CREATE INDEX IF NOT EXISTS idx_users_campus ON users(campus);
CREATE INDEX IF NOT EXISTS idx_users_bloqueado ON users(bloqueado);
CREATE INDEX IF NOT EXISTS idx_propiedades_campus ON propiedades(campus_cercano);
