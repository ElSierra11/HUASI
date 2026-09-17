const express = require('express');
const pool = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// ──────────────────────────────────────────
// Schema checker compartido (una sola vez)
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
  } catch (_) {
    _hasMediaCols = false;
  }
  return _hasMediaCols;
}

// ============ MULTER CONFIG ============
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads', 'chat');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (/jpeg|jpg|png|gif|webp|heic/.test(file.mimetype)) cb(null, true);
    else cb(new Error('Solo se permiten imágenes'));
  }
});

function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Autenticación requerida' });
  next();
}

// Servir uploads estáticos (accesibles como /uploads/chat/filename)
router.use('/uploads/chat', express.static(UPLOADS_DIR));

// ============ UPLOAD IMAGE ============
// Gateway rewrites: /api/chat/upload-image → /upload-image
router.post('/upload-image', requireAuth, upload.single('imagen'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No se recibió ningún archivo' });
    // URL accesible a través del gateway
    const url = process.env.CHAT_PUBLIC_URL
      ? `${process.env.CHAT_PUBLIC_URL}/uploads/chat/${req.file.filename}`
      : `/api/chat/uploads/chat/${req.file.filename}`;
    res.json({ url, filename: req.file.filename });
  } catch (err) {
    console.error('Error subiendo imagen:', err);
    res.status(500).json({ error: 'Error al subir imagen' });
  }
});

// ============ UPLOAD MULTIPLE IMAGES ============
router.post('/upload-images', requireAuth, upload.array('imagenes', 15), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No se recibieron archivos' });
    const urlPrefix = process.env.CHAT_PUBLIC_URL
      ? `${process.env.CHAT_PUBLIC_URL}/uploads/chat/`
      : `/api/chat/uploads/chat/`;
    const files = req.files.map(f => ({
      url: `${urlPrefix}${f.filename}`,
      filename: f.filename,
      nombre: f.originalname
    }));
    res.json({ files });
  } catch (err) {
    console.error('Error subiendo imágenes múltiples:', err);
    res.status(500).json({ error: 'Error al subir imágenes' });
  }
});

// ============ GET CONVERSATIONS ============
router.get('/conversaciones', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(`
      SELECT
        c.id, c.user1_id, c.user2_id, c.updated_at,
        u1.nombre AS user1_nombre, u1.apellido AS user1_apellido, u1.foto_perfil AS user1_foto,
        u2.nombre AS user2_nombre, u2.apellido AS user2_apellido, u2.foto_perfil AS user2_foto,
        (SELECT contenido FROM mensajes WHERE conversacion_id = c.id ORDER BY created_at DESC LIMIT 1) AS ultimo_mensaje,
        (SELECT created_at FROM mensajes WHERE conversacion_id = c.id ORDER BY created_at DESC LIMIT 1) AS ultimo_mensaje_fecha,
        (SELECT COUNT(*) FROM mensajes WHERE conversacion_id = c.id AND sender_id != $1 AND leido = FALSE)::int AS no_leidos
      FROM conversaciones c
      JOIN users u1 ON c.user1_id = u1.id
      JOIN users u2 ON c.user2_id = u2.id
      WHERE c.user1_id = $1 OR c.user2_id = $1
      ORDER BY c.updated_at DESC
    `, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo conversaciones:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ GET OR CREATE CONVERSATION ============
router.post('/conversaciones', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { otro_usuario_id } = req.body;
    if (!otro_usuario_id) return res.status(400).json({ error: 'Se requiere otro_usuario_id' });
    if (parseInt(otro_usuario_id) === userId) return res.status(400).json({ error: 'No puedes chatear contigo mismo' });

    const existing = await pool.query(`
      SELECT id FROM conversaciones
      WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
    `, [userId, otro_usuario_id]);

    if (existing.rows.length > 0) return res.json({ conversacion_id: existing.rows[0].id });

    const result = await pool.query(
      'INSERT INTO conversaciones (user1_id, user2_id) VALUES ($1, $2) RETURNING id',
      [userId, otro_usuario_id]
    );
    res.status(201).json({ conversacion_id: result.rows[0].id });
  } catch (err) {
    console.error('Error creando conversación:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ GET MESSAGES ============
router.get('/conversaciones/:id/mensajes', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const convId = req.params.id;

    const conv = await pool.query(
      'SELECT * FROM conversaciones WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
      [convId, userId]
    );
    if (conv.rows.length === 0) return res.status(403).json({ error: 'No tienes acceso a esta conversación' });

    // Seleccionar columnas según esquema disponible
    let result;
    if (await hasMediaCols()) {
      result = await pool.query(`
        SELECT m.id, m.conversacion_id, m.sender_id, m.contenido,
               COALESCE(m.tipo, 'texto') AS tipo, m.metadata, m.leido, m.created_at,
               u.nombre AS sender_nombre, u.apellido AS sender_apellido
        FROM mensajes m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversacion_id = $1
        ORDER BY m.created_at ASC
      `, [convId]);
    } else {
      result = await pool.query(`
        SELECT m.id, m.conversacion_id, m.sender_id, m.contenido,
               'texto' AS tipo, NULL AS metadata, m.leido, m.created_at,
               u.nombre AS sender_nombre, u.apellido AS sender_apellido
        FROM mensajes m
        JOIN users u ON m.sender_id = u.id
        WHERE m.conversacion_id = $1
        ORDER BY m.created_at ASC
      `, [convId]);
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo mensajes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ POST MESSAGE (REST FALLBACK) ============
router.post('/conversaciones/:id/mensajes', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const convId = req.params.id;
    const { contenido, tipo = 'texto', metadata = null } = req.body;

    if (!contenido?.trim()) return res.status(400).json({ error: 'El contenido del mensaje es requerido' });

    const conv = await pool.query(
      'SELECT * FROM conversaciones WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
      [convId, userId]
    );
    if (conv.rows.length === 0) return res.status(403).json({ error: 'No tienes acceso a esta conversación' });

    let msg;
    if (await hasMediaCols()) {
      const r = await pool.query(
        `INSERT INTO mensajes (conversacion_id, sender_id, contenido, tipo, metadata)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, conversacion_id, sender_id, contenido, tipo, metadata, leido, created_at`,
        [convId, userId, contenido.trim(), tipo, metadata ? JSON.stringify(metadata) : null]
      );
      msg = r.rows[0];
    } else {
      const r = await pool.query(
        `INSERT INTO mensajes (conversacion_id, sender_id, contenido)
         VALUES ($1, $2, $3)
         RETURNING id, conversacion_id, sender_id, contenido, leido, created_at`,
        [convId, userId, contenido.trim()]
      );
      msg = { ...r.rows[0], tipo: 'texto', metadata: null };
    }

    await pool.query('UPDATE conversaciones SET updated_at = NOW() WHERE id = $1', [convId]);

    // Emitir por socket si disponible
    const io = req.app.get('io');
    if (io) {
      try {
        const sQ = await pool.query('SELECT nombre, apellido, foto_perfil FROM users WHERE id = $1', [userId]);
        const sender = sQ.rows[0] || {};
        const fullMsg = { ...msg, sender_nombre: sender.nombre || 'Estudiante', sender_apellido: sender.apellido || '', sender_foto: sender.foto_perfil || null };
        const conversation = conv.rows[0];
        const receiverId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;
        io.to(`user_${userId}`).emit('new_message', fullMsg);
        io.to(`user_${receiverId}`).emit('new_message', fullMsg);
      } catch (ioErr) {
        console.warn('Error emitiendo socket en REST fallback:', ioErr.message);
      }
    }

    res.status(201).json(msg);
  } catch (err) {
    console.error('Error enviando mensaje por API:', err);
    res.status(500).json({ error: 'Error enviando mensaje' });
  }
});

// ============ GET UNREAD COUNT ============
router.get('/no-leidos', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(`
      SELECT COUNT(*)::int AS total
      FROM mensajes m
      JOIN conversaciones c ON m.conversacion_id = c.id
      WHERE (c.user1_id = $1 OR c.user2_id = $1)
        AND m.sender_id != $1 AND m.leido = FALSE
    `, [userId]);
    res.json({ no_leidos: result.rows[0].total });
  } catch (err) {
    console.error('Error contando no leídos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ GET RESERVATION INFO ============
router.get('/conversaciones/:id/reserva', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const convId = req.params.id;

    const conv = await pool.query(
      'SELECT * FROM conversaciones WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
      [convId, userId]
    );
    if (conv.rows.length === 0) return res.status(403).json({ error: 'No tienes acceso a esta conversación' });

    const c = conv.rows[0];
    const otherUserId = c.user1_id === userId ? c.user2_id : c.user1_id;

    const result = await pool.query(`
      SELECT r.id AS reserva_id, r.estado, r.fecha_inicio, r.fecha_fin, r.mensaje, r.evento,
             p.id AS propiedad_id, p.titulo, p.tipo, p.direccion, p.barrio, p.ciudad,
             p.fotos, p.capacidad, p.activo, p.host_id,
             COALESCE((SELECT ROUND(AVG(re.calificacion),1) FROM resenas re WHERE re.propiedad_id = p.id), 0) AS calificacion_promedio,
             COALESCE((SELECT COUNT(*) FROM resenas re WHERE re.propiedad_id = p.id), 0)::int AS num_resenas
      FROM reservas r
      JOIN propiedades p ON r.propiedad_id = p.id
      WHERE (r.guest_id = $1 AND p.host_id = $2) OR (r.guest_id = $2 AND p.host_id = $1)
      ORDER BY r.created_at DESC LIMIT 1
    `, [userId, otherUserId]);

    if (result.rows.length === 0) return res.json(null);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error obteniendo reserva:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
