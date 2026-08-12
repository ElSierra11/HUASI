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
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:5174'],
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Auth middleware — extract user from JWT
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
    } catch (err) {
      // Token inválido
    }
  }
  next();
});

// REST routes
app.use('/', chatRoutes);

// Health
app.get('/health', (req, res) => res.json({ status: 'ok', service: 'chat' }));

// ============ SOCKET.IO ============
const io = new Server(server, {
  cors: {
    origin: true,
    credentials: true
  },
  path: '/chat-socket'
});

// Map userId → Set<socketId>
const onlineUsers = new Map();

// Socket auth middleware
io.use((socket, next) => {
  // Helper para parsear una cookie por nombre desde la cadena raw
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

  // Track online user
  if (!onlineUsers.has(userId)) {
    onlineUsers.set(userId, new Set());
  }
  onlineUsers.get(userId).add(socket.id);

  // Join personal room
  socket.join(`user_${userId}`);

  // Send message
  socket.on('send_message', async (data) => {
    const { conversacion_id, contenido } = data;
    if (!contenido?.trim()) return;

    try {
      // Verify user is part of conversation
      const conv = await pool.query(
        'SELECT * FROM conversaciones WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
        [conversacion_id, userId]
      );

      if (conv.rows.length === 0) return;

      const conversation = conv.rows[0];
      const receiverId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;

      // Save message to DB
      const result = await pool.query(
        `INSERT INTO mensajes (conversacion_id, sender_id, contenido)
         VALUES ($1, $2, $3)
         RETURNING id, conversacion_id, sender_id, contenido, leido, created_at`,
        [conversacion_id, userId, contenido.trim()]
      );

      const message = result.rows[0];

      // Update conversation timestamp
      await pool.query(
        'UPDATE conversaciones SET updated_at = NOW() WHERE id = $1',
        [conversacion_id]
      );

      // Emit to both users
      io.to(`user_${userId}`).emit('new_message', message);
      io.to(`user_${receiverId}`).emit('new_message', message);
    } catch (err) {
      console.error('Error sending message:', err);
      socket.emit('error_message', { error: 'Error al enviar mensaje' });
    }
  });

  // Mark messages as read
  socket.on('mark_read', async (data) => {
    const { conversacion_id } = data;
    try {
      await pool.query(
        'UPDATE mensajes SET leido = TRUE WHERE conversacion_id = $1 AND sender_id != $2 AND leido = FALSE',
        [conversacion_id, userId]
      );

      // Notify the other user that messages were read
      const conv = await pool.query('SELECT * FROM conversaciones WHERE id = $1', [conversacion_id]);
      if (conv.rows.length > 0) {
        const conversation = conv.rows[0];
        const otherId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;
        io.to(`user_${otherId}`).emit('messages_read', { conversacion_id });
      }
    } catch (err) {
      console.error('Error marking read:', err);
    }
  });

  // Typing indicator
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
    if (onlineUsers.get(userId)?.size === 0) {
      onlineUsers.delete(userId);
    }
  });
});

server.listen(PORT, () => {
  console.log(`💬 Chat Service corriendo en puerto ${PORT}`);
});
