require('dotenv').config();
const pool = require('./services/auth/db');

async function migrate() {
  try {
    console.log('Agregando columnas de recuperación de contraseña a tabla users...');
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255),
      ADD COLUMN IF NOT EXISTS reset_password_expires_at TIMESTAMP;
    `);
    console.log('✅ Migración de recuperación de contraseña exitosa.');
  } catch (err) {
    console.error('❌ Error en migración:', err.message);
  } finally {
    pool.end();
  }
}

migrate();
