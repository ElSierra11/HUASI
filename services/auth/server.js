const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const authRoutes = require('./routes/auth');
const verificacionRoutes = require('./routes/verificacion');
const reportesRoutes = require('./routes/reportes');

const app = express();
const PORT = process.env.AUTH_PORT || 4001;
const JWT_SECRET = process.env.JWT_SECRET || 'stayu_secret_key';

// Middleware
app.use(cors({
  origin: (origin, callback) => callback(null, origin || true),
  credentials: true
}));
app.use(express.json());

// Servir archivos de verificación
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Middleware para extraer usuario del JWT (no bloquea si no hay token)
app.use((req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // Token inválido, continuar sin usuario
    }
  }
  next();
});

// Rutas
app.use('/', authRoutes);
app.use('/verificacion', verificacionRoutes);
app.use('/reportes', reportesRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'auth' });
});

// Auto-verificar cuentas pendientes reportadas (idempotente)
const pool = require('./db');
pool.query(`
  UPDATE users 
  SET email_verificado = TRUE, verificado = TRUE, otp_code = NULL, otp_expires_at = NULL 
  WHERE LOWER(email) = 'freddy.castron@campusucc.edu.co';
`).then(r => {
  if (r.rowCount > 0) {
    console.log('✅ [AUTO-VERIFY] Cuenta de Freddy Castro (freddy.castron@campusucc.edu.co) verificada automáticamente.');
  }
}).catch(err => console.warn('Aviso auto-verificación:', err.message));

app.listen(PORT, () => {
  console.log(`🔐 Auth Service corriendo en puerto ${PORT} (Brevo / Resend / OAuth2 & OTP activos)`);
});

