-- ============================================
-- HUASI - Migración de Soles (Puntos Solidarios)
-- ============================================

-- 1. Agregar columna soles_balance a usuarios si no existe
ALTER TABLE users ADD COLUMN IF NOT EXISTS soles_balance INTEGER DEFAULT 100;

-- 2. Agregar columna soles_por_noche a propiedades si no existe
ALTER TABLE propiedades ADD COLUMN IF NOT EXISTS soles_por_noche INTEGER DEFAULT 50;

-- 3. Crear tabla de transacciones de soles
CREATE TABLE IF NOT EXISTS soles_transacciones (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    reserva_id INTEGER REFERENCES reservas(id) ON DELETE SET NULL,
    cantidad INTEGER NOT NULL, -- positiva para ganancias, negativa para gastos
    motivo VARCHAR(100) NOT NULL, -- 'registro', 'verificacion_email', 'registro_propiedad', 'hospedaje_gasto', 'hospedaje_ganancia', 'hospedaje_reembolso', 'hospedaje_devolucion'
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Crear índice para optimizar búsquedas por usuario
CREATE INDEX IF NOT EXISTS idx_soles_trans_user ON soles_transacciones(user_id);

-- 5. Insertar transacción inicial semilla para usuarios existentes que no la tengan
INSERT INTO soles_transacciones (user_id, cantidad, motivo)
SELECT id, 100, 'registro' FROM users u
WHERE NOT EXISTS (
    SELECT 1 FROM soles_transacciones t 
    WHERE t.user_id = u.id AND t.motivo = 'registro'
);
