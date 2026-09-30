-- Migración: Agregar campo rol_universitario a tabla users (HUASI)
-- Permite distinguir el rol del usuario en la comunidad universitaria:
-- 'estudiante', 'profesor', 'administrativo', 'egresado', 'investigador'

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS rol_universitario VARCHAR(50) DEFAULT 'estudiante';

UPDATE users 
SET rol_universitario = 'estudiante' 
WHERE rol_universitario IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_rol_universitario ON users(rol_universitario);
