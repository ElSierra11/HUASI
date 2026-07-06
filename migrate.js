require('dotenv').config();
const pool = require('./services/auth/db');

async function migrate() {
  try {
    console.log('Adding columns to users table...');
    await pool.query(`
      ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS email_verificado BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS otp_code VARCHAR(6),
      ADD COLUMN IF NOT EXISTS otp_expires_at TIMESTAMP;
    `);
    console.log('Migration successful');
  } catch (err) {
    console.error('Migration failed:', err);
  } finally {
    pool.end();
  }
}

migrate();
