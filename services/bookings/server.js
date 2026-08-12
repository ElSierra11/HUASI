const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const reservasRoutes = require('./routes/reservas');
const resenasRoutes = require('./routes/resenas');

const app = express();
const PORT = process.env.BOOKING_PORT || 4003;
const JWT_SECRET = process.env.JWT_SECRET || 'stayu_secret_key';

// Middleware
app.use(cors({
  origin: (origin, callback) => callback(null, origin || true),
  credentials: true
}));
app.use(express.json());

// JWT middleware
app.use((req, res, next) => {
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
app.use('/reservas', reservasRoutes);
app.use('/resenas', resenasRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'bookings' });
});

app.listen(PORT, () => {
  console.log(`📅 Booking Service corriendo en puerto ${PORT} (Gmail SMTP activo)`);
});
