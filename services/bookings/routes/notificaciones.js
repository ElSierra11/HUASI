const express = require('express');
const pool = require('../db');

const router = express.Router();

// ─── Función auxiliar: crear notificación ────────────────────────────────────
async function crearNotificacion({ user_id, tipo, titulo, cuerpo, url = '/', icono = 'bell', datos = {} }) {
  try {
    const result = await pool.query(
      `INSERT INTO notificaciones (user_id, tipo, titulo, cuerpo, url, icono, datos)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user_id, tipo, titulo, cuerpo, url, icono, JSON.stringify(datos)]
    );
    return result.rows[0];
  } catch (err) {
    console.error('[Notificaciones] Error creando notificación:', err.message);
    return null;
  }
}

// ─── Exportar función para usar en otros módulos ─────────────────────────────
module.exports.crearNotificacion = crearNotificacion;

// ─── GET /notificaciones — Listar mis notificaciones (con paginación) ─────────
router.get('/', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  try {
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const offset = parseInt(req.query.offset) || 0;
    const soloNoLeidas = req.query.no_leidas === 'true';

    const whereClause = soloNoLeidas
      ? 'WHERE user_id = $1 AND leida = FALSE'
      : 'WHERE user_id = $1';

    const [rows, countResult] = await Promise.all([
      pool.query(
        `SELECT * FROM notificaciones ${whereClause}
         ORDER BY created_at DESC
         LIMIT $2 OFFSET $3`,
        [req.user.id, limit, offset]
      ),
      pool.query(
        `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE leida = FALSE) AS no_leidas
         FROM notificaciones
         WHERE user_id = $1`,
        [req.user.id]
      ),
    ]);

    res.json({
      notificaciones: rows.rows,
      total: parseInt(countResult.rows[0].total),
      no_leidas: parseInt(countResult.rows[0].no_leidas),
    });
  } catch (err) {
    console.error('[Notificaciones] Error listando:', err.message);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── GET /notificaciones/count — Solo el contador de no leídas ───────────────
router.get('/count', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  try {
    const result = await pool.query(
      `SELECT COUNT(*) AS no_leidas FROM notificaciones WHERE user_id = $1 AND leida = FALSE`,
      [req.user.id]
    );
    res.json({ no_leidas: parseInt(result.rows[0].no_leidas) });
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── PATCH /notificaciones/:id/leer — Marcar una como leída ─────────────────
router.patch('/:id/leer', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE notificaciones SET leida = TRUE
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Notificación no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── PATCH /notificaciones/leer-todas — Marcar todas como leídas ─────────────
router.patch('/leer-todas', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  try {
    await pool.query(
      `UPDATE notificaciones SET leida = TRUE WHERE user_id = $1 AND leida = FALSE`,
      [req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── DELETE /notificaciones/:id — Eliminar una notificación ──────────────────
router.delete('/:id', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  try {
    const { id } = req.params;
    await pool.query(
      `DELETE FROM notificaciones WHERE id = $1 AND user_id = $2`,
      [id, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─── DELETE /notificaciones/limpiar-leidas — Limpiar todas las leídas ────────
router.delete('/limpiar-leidas', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  try {
    await pool.query(
      `DELETE FROM notificaciones WHERE user_id = $1 AND leida = TRUE`,
      [req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports.router = router;
