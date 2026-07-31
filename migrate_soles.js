const fs = require('fs');
const path = require('path');
require('dotenv').config();
const pool = require('./services/auth/db');

async function runMigration() {
  try {
    console.log('🔄 Cargando archivo SQL de migración de soles...');
    const sqlPath = path.join(__dirname, 'database', 'migrate_soles.sql');
    const sqlContent = fs.readFileSync(sqlPath, 'utf8');

    console.log('🔌 Conectando a la base de datos para aplicar migración de soles...');
    await pool.query(sqlContent);
    console.log('✅ Migración de soles aplicada exitosamente a la base de datos.');
  } catch (err) {
    console.error('❌ Error ejecutando migración de soles:', err.message || err);
  } finally {
    await pool.end();
    console.log('🔌 Conexión a la base de datos cerrada.');
  }
}

runMigration();
