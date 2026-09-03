const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const pool = require('./db');

async function migrateActividad() {
  console.log('🚀 [Migración Actividad] Iniciando actualización de esquema para Monitoreo y Presencia...');

  try {
    // 1. Columnas de presencia y dispositivo en tabla users
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS ultimo_acceso TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS ultima_ruta VARCHAR(255),
      ADD COLUMN IF NOT EXISTS dispositivo VARCHAR(50);
    `);
    console.log('✅ Columnas ultimo_acceso, ultima_ruta y dispositivo añadidas a tabla users.');

    // 2. Tabla de auditoría y actividades
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_actividades (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        tipo_evento VARCHAR(50) NOT NULL,
        descripcion TEXT NOT NULL,
        ruta VARCHAR(255),
        dispositivo VARCHAR(50) DEFAULT 'Escritorio',
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_user_actividades_user_id ON user_actividades(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_actividades_created_at ON user_actividades(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_user_actividades_tipo ON user_actividades(tipo_evento);
    `);
    console.log('✅ Tabla user_actividades y sus índices creados correctamente.');

    // 3. Inicializar ultimo_acceso para usuarios que no lo tengan para evitar nulls
    await pool.query(`
      UPDATE users 
      SET ultimo_acceso = created_at 
      WHERE ultimo_acceso IS NULL AND created_at IS NOT NULL;
    `);
    console.log('✅ Sincronizados registros previos de usuarios.');

    console.log('🎉 Migración de Actividad completada exitosamente.');
  } catch (err) {
    console.error('❌ Error ejecutando migración de actividad:', err);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

migrateActividad();
