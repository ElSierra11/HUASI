// migrate_notificaciones.js — Ejecutar con: node migrate_notificaciones.js
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const pool = new Pool(
  process.env.DATABASE_URL
    ? { connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } }
    : {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        database: process.env.DB_NAME || 'stayu',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || 'postgres',
      }
);

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS notificaciones (
        id           SERIAL PRIMARY KEY,
        user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        tipo         VARCHAR(50) NOT NULL,
        titulo       VARCHAR(255) NOT NULL,
        cuerpo       TEXT NOT NULL,
        url          VARCHAR(500) DEFAULT '/',
        leida        BOOLEAN NOT NULL DEFAULT FALSE,
        icono        VARCHAR(50) DEFAULT 'bell',
        datos        JSONB DEFAULT '{}',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notificaciones_user_id    ON notificaciones(user_id);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notificaciones_user_leida  ON notificaciones(user_id, leida);`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notificaciones_created_at  ON notificaciones(created_at DESC);`);
    console.log('✅ Tabla notificaciones creada correctamente.');
  } catch (err) {
    console.error('❌ Error en migración:', err.message);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
