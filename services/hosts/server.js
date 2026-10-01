const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = require('./db');
const propiedadesRoutes = require('./routes/propiedades');
const disponibilidadRoutes = require('./routes/disponibilidad');

// Restaurar propiedades aprobadas que hayan sido desactivadas erróneamente por reservas anteriores
pool.query(`
  UPDATE propiedades 
  SET activo = TRUE 
  WHERE activo = FALSE 
    AND (estado_aprobacion = 'aprobado' OR estado_aprobacion IS NULL)
`).then(res => {
  if (res.rowCount > 0) {
    console.log(`✅ Restauradas ${res.rowCount} propiedades activas en la plataforma.`);
  }
}).catch(err => console.warn('[Hosts DB] Error restaurando propiedades activas:', err.message));


const app = express();
const PORT = process.env.HOST_PORT || 4002;
const JWT_SECRET = process.env.JWT_SECRET || 'stayu_secret_key';

// Middleware
app.use(cors({
  origin: (origin, callback) => callback(null, origin || true),
  credentials: true
}));
app.use(express.json());

// Servir fotos de propiedades
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// JWT middleware
app.use((req, res, next) => {
  if (req.headers['x-user-id']) {
    req.user = {
      id: parseInt(req.headers['x-user-id']),
      email: req.headers['x-user-email'],
      role: req.headers['x-user-role']
    };
    return next();
  }

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      req.user = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      // Token inválido
    }
  }
  next();
});

// Rutas
app.use('/propiedades', propiedadesRoutes);
app.use('/disponibilidad', disponibilidadRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'hosts' });
});

app.listen(PORT, () => {
  console.log(`🏠 Host Service corriendo en puerto ${PORT}`);
});
