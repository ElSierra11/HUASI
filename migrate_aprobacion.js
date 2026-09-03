require('dotenv').config();
const fs = require('fs');
const path = require('path');
const pool = require('./services/hosts/db');

async function runMigration() {
  try {
    console.log('Iniciando migracion de aprobacion de alojamientos...');
    const sql = fs.readFileSync(path.join(__dirname, 'database', 'migrate_aprobacion_alojamientos.sql'), 'utf-8');
    await pool.query(sql);
    console.log('Migracion de aprobacion de alojamientos completada con exito.');
  } catch (err) {
    console.error('Error durante la migracion:', err);
  } finally {
    await pool.end();
  }
}

runMigration();
