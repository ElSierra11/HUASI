require('dotenv').config();
const pool = require('./services/auth/db');

async function migrate() {
  console.log('Ejecutando migracion: columna rol_universitario en tabla users...');
  try {
    await pool.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS rol_universitario VARCHAR(50) DEFAULT 'estudiante';
      
      UPDATE users
        SET rol_universitario = 'estudiante'
        WHERE rol_universitario IS NULL;
    `);
    console.log('Migración completada exitosamente. Columna rol_universitario creada y actualizada.');
  } catch (err) {
    console.error('Error en migración:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
