-- ============================================
-- HUASI - Migración de Atributos Interactivos y Cuestionario
-- ============================================

-- 1. Agregar columna de preferencias_convivencia (JSONB) a usuarios
ALTER TABLE users ADD COLUMN IF NOT EXISTS preferencias_convivencia JSONB DEFAULT NULL;
