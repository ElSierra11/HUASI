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
app.use(cors());
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

app.listen(PORT, () => {
  console.log(`🔐 Auth Service corriendo en puerto ${PORT} (Gmail SMTP & OTP activos)`);
});
