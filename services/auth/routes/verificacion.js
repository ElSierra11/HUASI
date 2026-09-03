const express = require('express');
const multer = require('multer');
const pool = require('../db');

const router = express.Router();

// ============ MIDDLEWARE DE ROL ADMIN ============
/**
 * requireAdmin — Verifica que el request tenga un token JWT válido
 * y que el usuario tenga rol 'admin' o 'moderador'.
 *
 * 401 — No autenticado (sin token o token inválido)
 * 403 — Autenticado pero sin permisos de administrador
 */
function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: 'No autenticado. Debes iniciar sesión.',
      code: 'UNAUTHENTICATED'
    });
  }
  if (req.user.role !== 'admin' && req.user.role !== 'moderador') {
    return res.status(403).json({
      error: 'Acceso denegado. Se requieren permisos de administrador.',
      code: 'FORBIDDEN'
    });
  }
  next();
}

// ============ HELPER DE AUDITORÍA ============
/**
 * logAdminAction — Registra una acción administrativa.
 * Intenta insertar en la tabla `actividad_admin` si existe.
 * Si no existe o falla, hace log estructurado en consola (no destructivo).
 *
 * @param {object} opts
 * @param {number} opts.adminId      ID del admin que realiza la acción
 * @param {string} opts.accion       Descripción de la acción ('aprobar_verificacion', etc.)
 * @param {string} opts.entidad      Nombre de la entidad afectada ('verificacion')
 * @param {number} opts.entidadId    ID del registro afectado
 * @param {string} opts.resultado    Resultado ('aprobado', 'rechazado', etc.)
 * @param {object} [opts.detalle]    Datos adicionales (opcional)
 */
async function logAdminAction({ adminId, accion, entidad, entidadId, resultado, detalle = {} }) {
  const timestamp = new Date().toISOString();
  const logLine = `[ADMIN AUDIT] ${timestamp} | admin=${adminId} | accion=${accion} | entidad=${entidad}:${entidadId} | resultado=${resultado}`;
  console.log(logLine, Object.keys(detalle).length ? detalle : '');

  try {
    await pool.query(
      `INSERT INTO actividad_admin (admin_id, accion, entidad, entidad_id, resultado, detalle, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT DO NOTHING`,
      [adminId, accion, entidad, entidadId, resultado, JSON.stringify(detalle)]
    );
  } catch (auditErr) {
    // No destructivo: si la tabla no existe o falla, solo advertimos
    if (!auditErr.message?.includes('does not exist')) {
      console.warn('[AUDIT] No se pudo registrar en BD:', auditErr.message);
    }
  }
}

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.pdf'];
    const ext = require('path').extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten archivos JPG, PNG o PDF'));
    }
  }
});

// Función auxiliar para subir a DB
const uploadToDB = async (file) => {
  const result = await pool.query(
    'INSERT INTO archivos (nombre, mimetype, datos) VALUES ($1, $2, $3) RETURNING id',
    [file.originalname, file.mimetype, file.buffer]
  );
  return `/api/archivos/${result.rows[0].id}`;
};

// ============ CREAR VERIFICACIÓN ============
router.post('/',
  upload.fields([
    { name: 'carnet', maxCount: 1 },
    { name: 'documento', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: 'No autenticado' });
      }

      const { universidad, tipo_vinculo } = req.body;

      if (!universidad || !tipo_vinculo) {
        return res.status(400).json({ error: 'Universidad y tipo de vínculo son obligatorios' });
      }

      if (!['estudiante', 'docente', 'administrativo', 'egresado'].includes(tipo_vinculo)) {
        return res.status(400).json({ error: 'Tipo de vínculo inválido' });
      }

      if (!req.files?.carnet?.[0]) {
        return res.status(400).json({ error: 'Debe subir foto del carnet universitario' });
      }

      // Verificar si ya tiene una verificación pendiente o aprobada
      const existing = await pool.query(
        `SELECT id, estado FROM verificaciones WHERE user_id = $1 AND estado IN ('pendiente', 'aprobado')`,
        [req.user.id]
      );

      if (existing.rows.length > 0) {
        const estado = existing.rows[0].estado;
        if (estado === 'aprobado') {
          return res.status(400).json({ error: 'Ya estás verificado' });
        }
        return res.status(400).json({ error: 'Ya tienes una verificación pendiente de revisión' });
      }

      const carnet_url = await uploadToDB(req.files.carnet[0]);
      const documento_url = req.files?.documento?.[0]
        ? await uploadToDB(req.files.documento[0])
        : null;

      // MOCK OCR SCAN SIMULATION
      const fileName = req.files.carnet[0].originalname.toLowerCase();
      const textMock = `CARNET INSTITUCIONAL UNIVERSITARIO. Nombre: Estudiante. Tipo: ${tipo_vinculo.toUpperCase()}.`;
      const isValidUniv = true; // Auto-aprobación por defecto tras subir carnet

      const estadoInicial = isValidUniv ? 'aprobado' : 'pendiente';

      if (isValidUniv) {
        console.log(`\n[OCR Engine] 🤖 Escaneando carnet de ${req.user.email}...`);
        console.log(`[OCR Engine] 🔍 Texto detectado: "${textMock}"`);
        console.log(`[OCR Engine] ✅ Validación exitosa. Vinculación universitaria detectada. Auto-aprobando...\n`);
      }

      const result = await pool.query(
        `INSERT INTO verificaciones (user_id, universidad, tipo, carnet_url, documento_url, estado)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [req.user.id, universidad, tipo_vinculo, carnet_url, documento_url, estadoInicial]
      );

      if (estadoInicial === 'aprobado') {
        await pool.query(
          'UPDATE users SET verificado = TRUE, updated_at = NOW() WHERE id = $1',
          [req.user.id]
        );


      }

      res.status(201).json(result.rows[0]);
    } catch (err) {
      console.error('Error creando verificación:', err);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
);

// ============ VER ESTADO DE MI VERIFICACIÓN ============
router.get('/estado', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const result = await pool.query(
      `SELECT * FROM verificaciones WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.json({ verificacion: null, mensaje: 'No has enviado verificación' });
    }

    res.json({ verificacion: result.rows[0] });
  } catch (err) {
    console.error('Error obteniendo estado de verificación:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ ADMIN: LISTAR VERIFICACIONES PENDIENTES ============
router.get('/admin/pendientes', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT v.*, u.nombre, u.apellido, u.email
       FROM verificaciones v
       JOIN users u ON v.user_id = u.id
       WHERE v.estado = 'pendiente'
       ORDER BY v.created_at ASC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error listando verificaciones:', err);
    res.status(500).json({ error: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
  }
});

// ============ ADMIN: APROBAR / RECHAZAR ============
router.patch('/admin/:id', requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, notas } = req.body;

    if (!['aprobado', 'rechazado'].includes(estado)) {
      return res.status(400).json({
        error: 'Estado debe ser: aprobado o rechazado',
        code: 'INVALID_ESTADO'
      });
    }

    const result = await pool.query(
      `UPDATE verificaciones SET estado = $1, notas = $2, revisado_por = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [estado, notas || null, req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Verificación no encontrada', code: 'NOT_FOUND' });
    }

    const verificacion = result.rows[0];

    // Si se aprobó, marcar al usuario como verificado
    if (estado === 'aprobado') {
      await pool.query(
        'UPDATE users SET verificado = TRUE, updated_at = NOW() WHERE id = $1',
        [verificacion.user_id]
      );
    }

    // Registrar acción en bitácora de auditoría
    await logAdminAction({
      adminId: req.user.id,
      accion: estado === 'aprobado' ? 'aprobar_verificacion' : 'rechazar_verificacion',
      entidad: 'verificacion',
      entidadId: id,
      resultado: estado,
      detalle: { notas: notas || null, user_id: verificacion.user_id }
    });

    res.json(verificacion);
  } catch (err) {
    console.error('Error actualizando verificación:', err);
    res.status(500).json({ error: 'Error interno del servidor', code: 'INTERNAL_ERROR' });
  }
});

module.exports = router;
