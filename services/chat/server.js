const express = require('express');
const http = require('http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const pool = require('./db');
const chatRoutes = require('./routes/chat');

const app = express();
const server = http.createServer(app);
const PORT = process.env.CHAT_PORT || 4004;
const JWT_SECRET = process.env.JWT_SECRET || 'stayu_secret_key';

// CORS
app.use(cors({
  origin: (origin, callback) => callback(null, origin || true),
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Auth middleware
app.use((req, res, next) => {
  const token = req.cookies?.stayu_token || req.cookies?.stayu_admin_token ||
    (req.headers['x-user-id'] ? null : null);

  if (req.headers['x-user-id']) {
    req.user = {
      id: parseInt(req.headers['x-user-id']),
      email: req.headers['x-user-email'],
      role: req.headers['x-user-role']
    };
    return next();
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) { /* Token inválido */ }
  }
  next();
});

app.use('/', chatRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'chat' }));

// ============ SOCKET.IO ============
const io = new Server(server, {
  cors: { origin: true, credentials: true },
  path: '/chat-socket'
});

app.set('io', io);

// ──────────────────────────────────────────
// Schema checker — detecta si la migración
// de media (tipo/metadata) ya fue ejecutada.
// Se evalúa una sola vez en el arranque.
// ──────────────────────────────────────────
let _hasMediaCols = null;
async function hasMediaCols() {
  if (_hasMediaCols !== null) return _hasMediaCols;
  try {
    const res = await pool.query(`
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'mensajes' AND column_name = 'tipo' LIMIT 1
    `);
    _hasMediaCols = res.rows.length > 0;
    if (!_hasMediaCols) {
      console.warn('⚠️  [Chat] Columnas tipo/metadata NO encontradas en mensajes. Ejecuta: node migrate_chat_media.js');
    } else {
      console.log('✓  [Chat] Columnas tipo/metadata detectadas en mensajes.');
    }
  } catch (_) {
    _hasMediaCols = false;
  }
  return _hasMediaCols;
}

// Map userId → Set<socketId>
const onlineUsers = new Map();

// Socket auth middleware
io.use((socket, next) => {
  const parseCookie = (cookieStr, name) => {
    if (!cookieStr) return undefined;
    const match = cookieStr.match(new RegExp('(?:^|;\\s*)' + name + '=([^;]+)'));
    return match ? match[1] : undefined;
  };

  const cookieStr = socket.handshake.headers?.cookie || '';
  const token = socket.handshake.auth?.token ||
    parseCookie(cookieStr, 'stayu_token') ||
    parseCookie(cookieStr, 'stayu_admin_token');

  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.user = decoded;
    next();
  } catch (err) {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  const userId = socket.user.id;
  console.log(`💬 User ${userId} connected (socket: ${socket.id})`);

  if (!onlineUsers.has(userId)) onlineUsers.set(userId, new Set());
  onlineUsers.get(userId).add(socket.id);
  socket.join(`user_${userId}`);

  // ============ CHAT MESSAGES ============
  socket.on('send_message', async (data) => {
    const { conversacion_id, contenido, tipo = 'texto', metadata = null } = data;
    if (!contenido?.trim()) return;

    try {
      const conv = await pool.query(
        'SELECT * FROM conversaciones WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
        [conversacion_id, userId]
      );
      if (conv.rows.length === 0) return;

      const conversation = conv.rows[0];
      const receiverId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;

      // ── INSERT compatible con esquema viejo o nuevo ──
      let message;
      if (await hasMediaCols()) {
        const result = await pool.query(
          `INSERT INTO mensajes (conversacion_id, sender_id, contenido, tipo, metadata)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id, conversacion_id, sender_id, contenido, tipo, metadata, leido, created_at`,
          [conversacion_id, userId, contenido.trim(), tipo, metadata ? JSON.stringify(metadata) : null]
        );
        message = result.rows[0];
      } else {
        const result = await pool.query(
          `INSERT INTO mensajes (conversacion_id, sender_id, contenido)
           VALUES ($1, $2, $3)
           RETURNING id, conversacion_id, sender_id, contenido, leido, created_at`,
          [conversacion_id, userId, contenido.trim()]
        );
        message = { ...result.rows[0], tipo: 'texto', metadata: null };
      }

      await pool.query('UPDATE conversaciones SET updated_at = NOW() WHERE id = $1', [conversacion_id]);

      const senderQuery = await pool.query(
        'SELECT nombre, apellido, foto_perfil FROM users WHERE id = $1', [userId]
      );
      const sender = senderQuery.rows[0] || {};
      const fullMessage = {
        ...message,
        sender_nombre: sender.nombre || 'Estudiante',
        sender_apellido: sender.apellido || '',
        sender_foto: sender.foto_perfil || null
      };

      io.to(`user_${userId}`).emit('new_message', fullMessage);
      io.to(`user_${receiverId}`).emit('new_message', fullMessage);
    } catch (err) {
      console.error('Error sending message:', err);
      socket.emit('error_message', { error: 'Error al enviar mensaje' });
    }
  });

  // ============ WEBRTC SIGNALING ============
  socket.on('call_request', (data) => {
    const { receiverId } = data;
    console.log(`📞 Llamada de usuario ${userId} a ${receiverId}`);
    io.to(`user_${receiverId}`).emit('call_incoming', { ...data, callerId: userId });
  });

  socket.on('call_accept', (data) => {
    io.to(`user_${data.callerId}`).emit('call_accepted', { ...data, receiverId: userId });
  });

  socket.on('call_reject', (data) => {
    io.to(`user_${data.callerId}`).emit('call_rejected', { receiverId: userId });
  });

  socket.on('call_end', (data) => {
    io.to(`user_${data.peerId}`).emit('call_ended', { by: userId });
  });

  socket.on('webrtc_offer', (data) => {
    io.to(`user_${data.peerId}`).emit('webrtc_offer', { offer: data.offer, fromId: userId });
  });

  socket.on('webrtc_answer', (data) => {
    io.to(`user_${data.peerId}`).emit('webrtc_answer', { answer: data.answer, fromId: userId });
  });

  socket.on('webrtc_ice_candidate', (data) => {
    io.to(`user_${data.peerId}`).emit('webrtc_ice_candidate', { candidate: data.candidate, fromId: userId });
  });

  // ============ BROADCAST ============
  socket.on('property_published', (propertyData) => {
    console.log(`🏠 [Broadcast] Propiedad publicada: ${propertyData?.titulo}`);
    io.emit('new_property_published', propertyData);
  });

  // ============ MARK AS READ ============
  socket.on('mark_read', async (data) => {
    const { conversacion_id } = data;
    try {
      await pool.query(
        'UPDATE mensajes SET leido = TRUE WHERE conversacion_id = $1 AND sender_id != $2 AND leido = FALSE',
        [conversacion_id, userId]
      );
      const conv = await pool.query('SELECT * FROM conversaciones WHERE id = $1', [conversacion_id]);
      if (conv.rows.length > 0) {
        const c = conv.rows[0];
        const otherId = c.user1_id === userId ? c.user2_id : c.user1_id;
        io.to(`user_${otherId}`).emit('messages_read', { conversacion_id });
      }
    } catch (err) {
      console.error('Error marking read:', err);
    }
  });

  // ============ TYPING ============
  socket.on('typing', (data) => {
    const { conversacion_id, receiverId } = data;
    io.to(`user_${receiverId}`).emit('user_typing', { conversacion_id, userId });
  });

  socket.on('stop_typing', (data) => {
    const { conversacion_id, receiverId } = data;
    io.to(`user_${receiverId}`).emit('user_stop_typing', { conversacion_id, userId });
  });

  socket.on('disconnect', () => {
    console.log(`💬 User ${userId} disconnected (socket: ${socket.id})`);
    onlineUsers.get(userId)?.delete(socket.id);
    if (onlineUsers.get(userId)?.size === 0) onlineUsers.delete(userId);
  });
});

server.listen(PORT, () => {
  console.log(`💬 Chat Service corriendo en puerto ${PORT}`);
  // Calentar el schema checker al arrancar
  hasMediaCols().catch(() => {});
});
