const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5431,
  database: 'stayu',
  user: 'postgres',
  password: 'postgres',
});

async function main() {
  try {
    // Find the specific user
    const res = await pool.query(
      "SELECT id, email, nombre, apellido, email_verificado, verificado FROM users WHERE email = 'alejandro.sierrar@campusucc.edu.co'"
    );
    
    if (res.rows.length > 0) {
      console.log('Usuario encontrado:', res.rows[0]);
      
      // Fix: set email_verificado = true and verificado = true
      const update = await pool.query(
        "UPDATE users SET email_verificado = true, verificado = true WHERE email = 'alejandro.sierrar@campusucc.edu.co' RETURNING id, email, email_verificado, verificado"
      );
      console.log('✅ Usuario actualizado:', update.rows[0]);
      console.log('\nAhora puedes iniciar sesión con:');
      console.log('  Email: alejandro.sierrar@campusucc.edu.co');
      console.log('  Contraseña: (la que usaste al registrarte)');
    } else {
      console.log('El usuario NO existe todavía en la BD.');
      console.log('El error 409 puede venir de otra validación. Revisando...');
      
      // Show all users
      const all = await pool.query("SELECT id, email, email_verificado, verificado FROM users ORDER BY id");
      console.log('Todos los usuarios:', all.rows);
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await pool.end();
  }
}

main();
