const pool = require('./db');

async function main() {
  try {
    const res = await pool.query('SELECT id, email, nombre, apellido, role, email_verificado, verificado, password_hash FROM users');
    console.log('--- USUARIOS EN BASE DE DATOS ---');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error al consultar usuarios:', err);
  } finally {
    await pool.end();
  }
}

main();
