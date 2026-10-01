-- Migración: Sistema de Notificaciones HUASI
-- Ejecutar: psql -d stayu -f migrate_notificaciones.sql

CREATE TABLE IF NOT EXISTS notificaciones (
  id           SERIAL PRIMARY KEY,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tipo         VARCHAR(50) NOT NULL, -- 'reserva_nueva', 'reserva_estado', 'mensaje', 'llamada', 'propiedad_nueva', 'sistema'
  titulo       VARCHAR(255) NOT NULL,
  cuerpo       TEXT NOT NULL,
  url          VARCHAR(500) DEFAULT '/',
  leida        BOOLEAN NOT NULL DEFAULT FALSE,
  icono        VARCHAR(50) DEFAULT 'bell', -- 'bell', 'home', 'chat', 'phone', 'check', 'x'
  datos        JSONB DEFAULT '{}',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notificaciones_user_id    ON notificaciones(user_id);
CREATE INDEX IF NOT EXISTS idx_notificaciones_user_leida  ON notificaciones(user_id, leida);
CREATE INDEX IF NOT EXISTS idx_notificaciones_created_at  ON notificaciones(created_at DESC);
