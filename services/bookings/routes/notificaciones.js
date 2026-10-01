const express = require('express');
const pool = require('../db');

const router = express.Router();

const webpush = require('web-push');

// Configuración VAPID para Web Push en segundo plano
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || 'BAnQonU5LRa3rHsPdoNZX2ewhM_bGhXNtqHNZ1QmGRPlN_ofSOzO8IgDbWzhSznJrez9ACmX2nNFUYhtvUlkmj0';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '6WwiStMxP1GY9diDa3S88iqH5pAswzoNdXz-KLcjs84';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:soporte@huasi.transdigitalcoop.com';

try {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
} catch (vapidErr) {
  console.warn('[WebPush] Error configurando VAPID:', vapidErr.message);
}

// Inicializar tabla push_subscriptions si no existe en la BD
pool.query(`
  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL UNIQUE,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    user_agent TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
  CREATE INDEX IF NOT EXISTS idx_push_subs_user_id ON push_subscriptions(user_id);
`).catch(e => console.warn('[WebPush DB init]', e.message));

// Función para enviar notificación Web Push nativa a todos los dispositivos del usuario
async function enviarPushAUsuario(userId, payload) {
  try {
    const res = await pool.query(
      `SELECT id, endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`,
      [userId]
    );

    if (res.rows.length === 0) return;

    const notifPayload = JSON.stringify({
      title: payload.titulo || payload.title || 'HUASI Notificación',
      body: payload.cuerpo || payload.body || 'Tienes una nueva actualización en HUASI.',
      icon: payload.icon || '/huasi-monograma.png',
      badge: '/huasi-monograma.png',
      data: {
        url: payload.url || '/'
      }
    });

    const sendPromises = res.rows.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth,
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, notifPayload);
      } catch (err) {
        // Si el endpoint expiró o fue desuscrito (404 o 410 Gone), eliminarlo de la BD
        if (err.statusCode === 410 || err.statusCode === 404) {
          await pool.query(`DELETE FROM push_subscriptions WHERE id = $1`, [sub.id]);
        } else {
          console.warn('[WebPush Send]', err.message);
        }
      }
    });

    await Promise.allSettled(sendPromises);
  } catch (err) {
    console.warn('[WebPush Dispatch Error]', err.message);
  }
}

// ─── Función auxiliar: crear notificación in-app y enviar Web Push ───────────
async function crearNotificacion({ user_id, tipo, titulo, cuerpo, url = '/', icono = 'bell', datos = {} }) {
  try {
    const result = await pool.query(
      `INSERT INTO notificaciones (user_id, tipo, titulo, cuerpo, url, icono, datos)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [user_id, tipo, titulo, cuerpo, url, icono, JSON.stringify(datos)]
    );

    // Disparar Web Push nativo al dispositivo del usuario (llega con app cerrada)
    enviarPushAUsuario(user_id, {
      titulo,
      cuerpo,
      url,
      icono,
      datos
    }).catch(e => console.warn('[Push Async Error]', e.message));

    return result.rows[0];
  } catch (err) {
    console.error('[Notificaciones] Error creando notificación:', err.message);
    return null;
  }
}

// ─── Exportar funciones para usar en otros módulos ───────────────────────────
module.exports.crearNotificacion = crearNotificacion;
module.exports.enviarPushAUsuario = enviarPushAUsuario;


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

// ─── GET /notificaciones/vapid-public-key — Obtener clave pública VAPID ──────
router.get('/vapid-public-key', (req, res) => {

  res.json({ publicKey: VAPID_PUBLIC_KEY });
});

// ─── POST /notificaciones/suscribir-push — Registrar suscripción Web Push ────
router.post('/suscribir-push', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ error: 'Datos de suscripción incompletos' });
    }

    const userAgent = req.headers['user-agent'] || null;

    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (endpoint) DO UPDATE 
         SET user_id = EXCLUDED.user_id, 
             p256dh = EXCLUDED.p256dh, 
             auth = EXCLUDED.auth,
             user_agent = EXCLUDED.user_agent`,
      [req.user.id, endpoint, keys.p256dh, keys.auth, userAgent]
    );

    res.json({ ok: true, message: 'Suscripción Web Push registrada con éxito' });
  } catch (err) {
    console.error('[WebPush Suscribir Error]', err.message);
    res.status(500).json({ error: 'Error interno registrando suscripción push' });
  }
});

// ─── POST /notificaciones/desuscribir-push — Eliminar suscripción Web Push ───
router.post('/desuscribir-push', async (req, res) => {
  if (!req.user) return res.status(401).json({ error: 'No autenticado' });
  try {
    const { endpoint } = req.body;
    if (!endpoint) return res.status(400).json({ error: 'Endpoint requerido' });

    await pool.query(
      `DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2`,
      [endpoint, req.user.id]
    );
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'Error desuscribiendo' });
  }
});

module.exports.router = router;

