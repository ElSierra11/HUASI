require('dotenv').config();
const pool = require('./services/auth/db');

async function migrate() {
  console.log('Ejecutando migracion: columnas tipo_documento y numero_documento...');
  try {
    await pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS tipo_documento VARCHAR(30) DEFAULT 'cedula',
        ADD COLUMN IF NOT EXISTS numero_documento VARCHAR(30);
    `);
    console.log('Migracion completada. Columnas tipo_documento y numero_documento verificadas.');
  } catch (err) {
    console.error('Error en migracion:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
