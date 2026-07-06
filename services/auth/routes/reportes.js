const express = require('express');
const pool = require('../db');

const router = express.Router();

// ============ CREAR REPORTE ============
router.post('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { reportado_id, propiedad_id, motivo, descripcion } = req.body;

    if (!reportado_id || !motivo) {
      return res.status(400).json({ error: 'El ID del usuario reportado y el motivo son obligatorios' });
    }

    // No se puede reportar a sí mismo
    if (parseInt(reportado_id) === req.user.id) {
      return res.status(400).json({ error: 'No puedes reportarte a ti mismo' });
    }

    const result = await pool.query(
      `INSERT INTO reportes (reportador_id, reportado_id, propiedad_id, motivo, descripcion)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [req.user.id, reportado_id, propiedad_id || null, motivo, descripcion || null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creando reporte:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ ADMIN: LISTAR REPORTES ============
router.get('/', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const result = await pool.query(
      `SELECT r.*,
              u1.nombre AS reportador_nombre, u1.apellido AS reportador_apellido, u1.email AS reportador_email,
              u2.nombre AS reportado_nombre, u2.apellido AS reportado_apellido, u2.email AS reportado_email,
              p.titulo AS propiedad_titulo
       FROM reportes r
       JOIN users u1 ON r.reportador_id = u1.id
       JOIN users u2 ON r.reportado_id = u2.id
       LEFT JOIN propiedades p ON r.propiedad_id = p.id
       ORDER BY r.created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error listando reportes admin:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ ADMIN: ACTUALIZAR ESTADO DE REPORTE ============
router.patch('/:id', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const { id } = req.params;
    const { estado, notas_admin } = req.body;

    if (!['pendiente', 'revisado', 'resuelto'].includes(estado)) {
      return res.status(400).json({ error: 'Estado inválido. Debe ser: pendiente, revisado o resuelto' });
    }

    const result = await pool.query(
      `UPDATE reportes
       SET estado = $1,
           notas_admin = COALESCE($2, notas_admin),
           revisado_por = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [estado, notas_admin || null, req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Reporte no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error actualizando reporte admin:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
