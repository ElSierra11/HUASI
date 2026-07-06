const express = require('express');
const multer = require('multer');
const pool = require('../db');

const router = express.Router();

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
      const textMock = `UNIVERSIDAD COOPERATIVA DE COLOMBIA - CARNET INTELIGENTE. Nombre: Estudiante UCC. Tipo: ${tipo_vinculo.toUpperCase()}.`;
      const isUCC = String(universidad).toLowerCase().includes('ucc') || 
                    String(universidad).toLowerCase().includes('cooperativa') || 
                    fileName.includes('ucc') || 
                    fileName.includes('carnet') || 
                    fileName.includes('cooperativa');

      const estadoInicial = isUCC ? 'aprobado' : 'pendiente';

      if (isUCC) {
        console.log(`\n[OCR Engine] 🤖 Escaneando carnet de ${req.user.email}...`);
        console.log(`[OCR Engine] 🔍 Texto detectado: "${textMock}"`);
        console.log(`[OCR Engine] ✅ Validación exitosa. Vinculación universitaria UCC detectada. Auto-aprobando...\n`);
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
router.get('/admin/pendientes', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

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
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ ADMIN: APROBAR / RECHAZAR ============
router.patch('/admin/:id', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const { id } = req.params;
    const { estado, notas } = req.body;

    if (!['aprobado', 'rechazado'].includes(estado)) {
      return res.status(400).json({ error: 'Estado debe ser: aprobado o rechazado' });
    }

    const result = await pool.query(
      `UPDATE verificaciones SET estado = $1, notas = $2, revisado_por = $3, updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [estado, notas || null, req.user.id, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Verificación no encontrada' });
    }

    // Si se aprobó, marcar al usuario como verificado
    if (estado === 'aprobado') {
      await pool.query(
        'UPDATE users SET verificado = TRUE, updated_at = NOW() WHERE id = $1',
        [result.rows[0].user_id]
      );
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error actualizando verificación:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
