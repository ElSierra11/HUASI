const bcrypt = require('bcrypt');
const pool = require('./db');

async function resetAdmin() {
  try {
    const hash = await bcrypt.hash('admin123', 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE role = $2 AND email = $3', [hash, 'admin', 'admin@stayu.com']);
    console.log('✅ Admin password reseteada a: admin123');
  } catch (err) {
    console.error('Error:', err);
  } finally {
    pool.end();
  }
}

resetAdmin();
