const express = require('express');
const pool = require('../db');

const router = express.Router();

// ============ CREAR DISPONIBILIDAD ============
router.post('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { propiedad_id, fecha_inicio, fecha_fin } = req.body;

    if (!propiedad_id || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({ error: 'propiedad_id, fecha_inicio y fecha_fin son obligatorios' });
    }

    // Verificar que el usuario es dueño de la propiedad
    const prop = await pool.query('SELECT host_id FROM propiedades WHERE id = $1', [propiedad_id]);
    if (prop.rows.length === 0) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }
    if (prop.rows[0].host_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    if (new Date(fecha_inicio) >= new Date(fecha_fin)) {
      return res.status(400).json({ error: 'La fecha de inicio debe ser anterior a la fecha de fin' });
    }

    const result = await pool.query(
      `INSERT INTO disponibilidad (propiedad_id, fecha_inicio, fecha_fin)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [propiedad_id, fecha_inicio, fecha_fin]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creando disponibilidad:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ VER DISPONIBILIDAD DE PROPIEDAD ============
router.get('/propiedad/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT * FROM disponibilidad WHERE propiedad_id = $1 AND fecha_fin >= CURRENT_DATE ORDER BY fecha_inicio`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo disponibilidad:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ ELIMINAR DISPONIBILIDAD ============
router.delete('/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { id } = req.params;

    // Verificar que la disponibilidad pertenece a una propiedad del usuario
    const disp = await pool.query(
      `SELECT d.*, p.host_id FROM disponibilidad d
       JOIN propiedades p ON d.propiedad_id = p.id
       WHERE d.id = $1`,
      [id]
    );

    if (disp.rows.length === 0) {
      return res.status(404).json({ error: 'Disponibilidad no encontrada' });
    }
    if (disp.rows[0].host_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    await pool.query('DELETE FROM disponibilidad WHERE id = $1', [id]);
    res.json({ message: 'Disponibilidad eliminada' });
  } catch (err) {
    console.error('Error eliminando disponibilidad:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
