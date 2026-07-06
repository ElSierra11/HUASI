const { Pool, types } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// Forzar el parsing de TIMESTAMP (OID 1114) en UTC
types.setTypeParser(1114, function(stringValue) {
  return new Date(stringValue.replace(' ', 'T') + 'Z');
});

console.log('🔌 [Auth DB] Intentando conectar en el puerto:', process.env.DB_PORT || 5432);

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'stayu',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

pool.on('error', (err) => {
  console.error('Error inesperado en pool de PostgreSQL:', err);
  process.exit(-1);
});

module.exports = pool;
