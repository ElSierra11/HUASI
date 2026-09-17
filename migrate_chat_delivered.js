require('dotenv').config();
const pool = require('./services/auth/db');

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('Iniciando migración de entrega de mensajes (doble check)...');

    await client.query(`
      ALTER TABLE mensajes
        ADD COLUMN IF NOT EXISTS entregado BOOLEAN DEFAULT FALSE;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_mensajes_entregado ON mensajes(entregado);
    `);

    // Los mensajes ya leídos se consideran automáticamente entregados
    await client.query(`
      UPDATE mensajes SET entregado = TRUE WHERE leido = TRUE AND (entregado IS NULL OR entregado = FALSE);
    `);

    console.log('Columnas entregado agregada a mensajes exitosamente.');
    console.log('Migración completada exitosamente.');
  } catch (err) {
    console.error('Error en migración:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
