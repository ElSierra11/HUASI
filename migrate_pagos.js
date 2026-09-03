/**
 * Migración: Agregar columnas es_pago y precio_por_noche a la tabla propiedades
 * Ejecutar: node migrate_pagos.js
 */
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'stayu',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || process.env.DB_PASS || 'postgres',
});

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Iniciando migración de alojamientos de pago...');

    await client.query('BEGIN');

    // Agregar columna es_pago si no existe
    await client.query(`
      ALTER TABLE propiedades
      ADD COLUMN IF NOT EXISTS es_pago BOOLEAN DEFAULT FALSE NOT NULL
    `);
    console.log('✓ Columna es_pago agregada');

    // Agregar columna precio_por_noche si no existe
    await client.query(`
      ALTER TABLE propiedades
      ADD COLUMN IF NOT EXISTS precio_por_noche DECIMAL(12, 2) DEFAULT NULL
    `);
    console.log('✓ Columna precio_por_noche agregada');

    // Índice para filtrar por tipo de alojamiento (pago/solidario)
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_propiedades_es_pago ON propiedades(es_pago)
    `);
    console.log('✓ Índice idx_propiedades_es_pago creado');

    await client.query('COMMIT');
    console.log('\n✅ Migración completada exitosamente.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error en migración:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
