const express = require('express');
const pool = require('../db');

const router = express.Router();

// Middleware to require auth
function requireAuth(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Autenticación requerida' });
  next();
}

// ============ GET CONVERSATIONS ============
router.get('/conversaciones', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;

    const result = await pool.query(`
      SELECT 
        c.id,
        c.user1_id,
        c.user2_id,
        c.updated_at,
        u1.nombre AS user1_nombre,
        u1.apellido AS user1_apellido,
        u1.foto_perfil AS user1_foto,
        u2.nombre AS user2_nombre,
        u2.apellido AS user2_apellido,
        u2.foto_perfil AS user2_foto,
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

    if (!otro_usuario_id) {
      return res.status(400).json({ error: 'Se requiere otro_usuario_id' });
    }

    if (parseInt(otro_usuario_id) === userId) {
      return res.status(400).json({ error: 'No puedes chatear contigo mismo' });
    }

    // Check if conversation already exists
    const existing = await pool.query(`
      SELECT id FROM conversaciones 
      WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
    `, [userId, otro_usuario_id]);

    if (existing.rows.length > 0) {
      return res.json({ conversacion_id: existing.rows[0].id });
    }

    // Create new conversation
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

    // Verify user is part of conversation
    const conv = await pool.query(
      'SELECT * FROM conversaciones WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
      [convId, userId]
    );

    if (conv.rows.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a esta conversación' });
    }

    const result = await pool.query(`
      SELECT m.id, m.conversacion_id, m.sender_id, m.contenido, m.leido, m.created_at,
             u.nombre AS sender_nombre, u.apellido AS sender_apellido
      FROM mensajes m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversacion_id = $1
      ORDER BY m.created_at ASC
    `, [convId]);

    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo mensajes:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
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
        AND m.sender_id != $1
        AND m.leido = FALSE
    `, [userId]);

    res.json({ no_leidos: result.rows[0].total });
  } catch (err) {
    console.error('Error contando no leídos:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ GET RESERVATION INFO FOR CONVERSATION ============
router.get('/conversaciones/:id/reserva', requireAuth, async (req, res) => {
  try {
    const userId = req.user.id;
    const convId = req.params.id;

    // Verify user belongs to this conversation
    const conv = await pool.query(
      'SELECT * FROM conversaciones WHERE id = $1 AND (user1_id = $2 OR user2_id = $2)',
      [convId, userId]
    );
    if (conv.rows.length === 0) {
      return res.status(403).json({ error: 'No tienes acceso a esta conversación' });
    }

    const c = conv.rows[0];
    const otherUserId = c.user1_id === userId ? c.user2_id : c.user1_id;

    // Find the most recent reservation between these two users
    const result = await pool.query(`
      SELECT r.id AS reserva_id, r.estado, r.fecha_inicio, r.fecha_fin, r.mensaje, r.evento,
             p.id AS propiedad_id, p.titulo, p.tipo, p.direccion, p.barrio, p.ciudad,
             p.fotos, p.capacidad, p.activo, p.host_id,
             COALESCE(
               (SELECT ROUND(AVG(re.calificacion),1) FROM resenas re WHERE re.propiedad_id = p.id), 0
             ) AS calificacion_promedio,
             COALESCE(
               (SELECT COUNT(*) FROM resenas re WHERE re.propiedad_id = p.id), 0
             )::int AS num_resenas
      FROM reservas r
      JOIN propiedades p ON r.propiedad_id = p.id
      WHERE (r.guest_id = $1 AND p.host_id = $2)
         OR (r.guest_id = $2 AND p.host_id = $1)
      ORDER BY r.created_at DESC
      LIMIT 1
    `, [userId, otherUserId]);

    if (result.rows.length === 0) {
      return res.json(null);
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error obteniendo reserva de conversación:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
