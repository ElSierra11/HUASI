const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const { createProxyMiddleware } = require('http-proxy-middleware');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { authMiddleware } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || process.env.GATEWAY_PORT || 4000;

const AUTH_URL = process.env.AUTH_SERVICE_URL || `http://localhost:${process.env.AUTH_PORT || 4001}`;
const HOST_URL = process.env.HOSTS_SERVICE_URL || `http://localhost:${process.env.HOST_PORT || 4002}`;
const BOOKING_URL = process.env.BOOKINGS_SERVICE_URL || `http://localhost:${process.env.BOOKING_PORT || 4003}`;
const CHAT_URL = process.env.CHAT_SERVICE_URL || `http://localhost:${process.env.CHAT_PORT || 4004}`;

// CORS (Soporta Vercel y desarrollo local)
app.use(cors({
  origin: true,
  credentials: true
}));

app.use(cookieParser());

// Auth middleware global (no bloquea, solo extrae usuario)
app.use(authMiddleware);


// ============ PROXY ROUTES ============

const handleProxyError = (err, req, res) => {
  console.error(`[Gateway Proxy Error] en ${req.originalUrl || req.url}:`, err.message);
  // Para conexiones WS, res puede ser un socket en lugar de un objeto http.ServerResponse
  if (res && typeof res.writeHead === 'function') {
    res.writeHead(502, { 'Content-Type': 'text/plain' });
    res.end('Bad Gateway');
  }
};

// Auth Service
app.use('/api/auth', createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/auth': '' },
  onError: handleProxyError,
}));

// Auth Service - Reportes
app.use('/api/reportes', createProxyMiddleware({
  target: AUTH_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/reportes': '/reportes' },
  onError: handleProxyError,
}));

// Host Service - Propiedades
app.use('/api/propiedades', createProxyMiddleware({
  target: HOST_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/propiedades': '/propiedades' },
  onError: handleProxyError,
}));

// Host Service - Disponibilidad
app.use('/api/disponibilidad', createProxyMiddleware({
  target: HOST_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/disponibilidad': '/disponibilidad' },
  onError: handleProxyError,
}));

// Host Service - Archivos (DB)
app.use('/api/archivos', createProxyMiddleware({
  target: HOST_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/archivos': '/propiedades/archivos' },
  onError: handleProxyError,
}));

// Booking Service - Reservas
app.use('/api/reservas', createProxyMiddleware({
  target: BOOKING_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/reservas': '/reservas' },
  onError: handleProxyError,
}));

// Booking Service - Reseñas
app.use('/api/resenas', createProxyMiddleware({
  target: BOOKING_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/resenas': '/resenas' },
  onError: handleProxyError,
}));

// Chat Service - REST endpoints
app.use('/api/chat', createProxyMiddleware({
  target: CHAT_URL,
  changeOrigin: true,
  pathRewrite: { '^/api/chat': '' },
  onError: handleProxyError,
}));

// Chat Service - WebSocket proxy
const chatWsProxy = createProxyMiddleware({
  target: CHAT_URL,
  changeOrigin: true,
  ws: true,
  onError: handleProxyError,
});
app.use('/chat-socket', chatWsProxy);

// Health check
app.get('/api/health', async (req, res) => {
  try {
    const services = {};
    const urls = [
      { name: 'auth', url: `${AUTH_URL}/health` },
      { name: 'hosts', url: `${HOST_URL}/health` },
      { name: 'bookings', url: `${BOOKING_URL}/health` },
      { name: 'chat', url: `${CHAT_URL}/health` },
    ];

    for (const svc of urls) {
      try {
        const response = await fetch(svc.url);
        services[svc.name] = response.ok ? 'ok' : 'error';
      } catch {
        services[svc.name] = 'down';
      }
    }

    res.json({ gateway: 'ok', services });
  } catch (err) {
    res.status(500).json({ error: 'Error checking health' });
  }
});

// Root
app.get('/', (req, res) => {
  res.json({ message: 'StayU API Gateway', version: '1.0.0' });
});

const server = app.listen(PORT, () => {
  console.log(`🌐 Gateway corriendo en puerto ${PORT}`);
  console.log(`   Auth   → ${AUTH_URL}`);
  console.log(`   Hosts  → ${HOST_URL}`);
  console.log(`   Books  → ${BOOKING_URL}`);
  console.log(`   Chat   → ${CHAT_URL}`);
});

// Enable WebSocket upgrade for chat proxy
server.on('upgrade', chatWsProxy.upgrade);

