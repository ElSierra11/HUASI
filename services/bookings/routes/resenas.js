const express = require('express');
const pool = require('../db');

const router = express.Router();

// ============ CREAR RESEÑA ============
router.post('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { reserva_id, calificacion, comentario } = req.body;

    if (!reserva_id || !calificacion) {
      return res.status(400).json({ error: 'reserva_id y calificacion son obligatorios' });
    }

    if (calificacion < 1 || calificacion > 5) {
      return res.status(400).json({ error: 'La calificación debe ser entre 1 y 5' });
    }

    // Verificar que la reserva existe y está completada
    const reserva = await pool.query(
      `SELECT r.*, p.host_id FROM reservas r
       JOIN propiedades p ON r.propiedad_id = p.id
       WHERE r.id = $1`,
      [reserva_id]
    );

    if (reserva.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const res_data = reserva.rows[0];

    if (res_data.estado !== 'completada') {
      return res.status(400).json({ error: 'Solo puedes reseñar reservas completadas' });
    }

    // Verificar que el usuario participó en la reserva
    if (res_data.guest_id !== req.user.id && res_data.host_id !== req.user.id) {
      return res.status(403).json({ error: 'No participaste en esta reserva' });
    }

    // Verificar que no ha reseñado ya
    const existing = await pool.query(
      'SELECT id FROM resenas WHERE reserva_id = $1 AND autor_id = $2',
      [reserva_id, req.user.id]
    );
    if (existing.rows.length > 0) {
      return res.status(409).json({ error: 'Ya has reseñado esta reserva' });
    }

    // Determinar quién es el destinatario
    const destino_id = req.user.id === res_data.guest_id ? res_data.host_id : res_data.guest_id;

    const result = await pool.query(
      `INSERT INTO resenas (reserva_id, autor_id, destino_id, propiedad_id, calificacion, comentario)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [reserva_id, req.user.id, destino_id, res_data.propiedad_id, calificacion, comentario || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creando reseña:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ RESEÑAS DE UNA PROPIEDAD ============
router.get('/propiedad/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT r.*, u.nombre AS autor_nombre, u.apellido AS autor_apellido, u.foto_perfil AS autor_foto
       FROM resenas r
       JOIN users u ON r.autor_id = u.id
       WHERE r.propiedad_id = $1
       ORDER BY r.created_at DESC`,
      [id]
    );

    // Calcular promedio
    const promedio = await pool.query(
      'SELECT AVG(calificacion) as promedio, COUNT(*) as total FROM resenas WHERE propiedad_id = $1',
      [id]
    );

    res.json({
      resenas: result.rows,
      promedio: parseFloat(promedio.rows[0].promedio) || 0,
      total: parseInt(promedio.rows[0].total)
    });
  } catch (err) {
    console.error('Error listando reseñas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
