require('dotenv').config();
const pool = require('./services/auth/db');


async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Iniciando migración de chat media...');

    await client.query(`
      ALTER TABLE mensajes
        ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'texto' NOT NULL,
        ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mensajes_tipo ON mensajes(tipo);
    `);

    // Marcar todos los mensajes existentes como tipo texto
    await client.query(`
      UPDATE mensajes SET tipo = 'texto' WHERE tipo IS NULL OR tipo = '';
    `);

    console.log('✓ Columnas tipo y metadata agregadas a mensajes');
    console.log('✓ Migración completada exitosamente.');
  } catch (err) {
    console.error('Error en migración:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
