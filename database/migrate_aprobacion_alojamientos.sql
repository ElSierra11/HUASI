-- Migración: Sistema de Revisión y Aprobación Institucional de Alojamientos (StayU / HUASI)

ALTER TABLE propiedades 
ADD COLUMN IF NOT EXISTS estado_aprobacion VARCHAR(30) DEFAULT 'pendiente_revision',
ADD COLUMN IF NOT EXISTS revisado_por INTEGER REFERENCES users(id),
ADD COLUMN IF NOT EXISTS fecha_revision TIMESTAMP,
ADD COLUMN IF NOT EXISTS notas_revision TEXT,
ADD COLUMN IF NOT EXISTS checklist_evaluacion JSONB;

-- Si ya existen propiedades activas, marcarlas como aprobadas para mantener consistencia
UPDATE propiedades 
SET estado_aprobacion = 'aprobado' 
WHERE estado_aprobacion IS NULL OR (activo = TRUE AND estado_aprobacion = 'pendiente_revision');

-- Crear índices de búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_propiedades_estado_aprobacion ON propiedades(estado_aprobacion);
CREATE INDEX IF NOT EXISTS idx_propiedades_revision ON propiedades(revisado_por, fecha_revision);
