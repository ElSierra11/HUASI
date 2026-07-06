const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db');
const nodemailer = require('nodemailer');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'stayu_secret_key';

// Configurar transportador de correo (usando Ethereal para desarrollo local por defecto si no hay SMTP)
const transporter = nodemailer.createTransport({
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: (process.env.SMTP_PORT === '465'),
  auth: {
    user: process.env.SMTP_USER || 'test@ethereal.email',
    pass: process.env.SMTP_PASS || 'pass123'
  }
});

// ============ REGISTER ============
router.post('/register', async (req, res) => {
  try {
    const { email, password, nombre, apellido, telefono, role, campus } = req.body;

    if (!email || !password || !nombre || !apellido) {
      return res.status(400).json({ error: 'Email, contraseña, nombre y apellido son obligatorios' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const allowedDomains = ['@campusucc.edu.co', '@ucc.edu.co'];
    if (!allowedDomains.some(domain => cleanEmail.endsWith(domain))) {
      return res.status(400).json({ error: 'Debes usar un correo institucional válido (@campusucc.edu.co o @ucc.edu.co)' });
    }

    if (!campus) {
      return res.status(400).json({ error: 'El campus de la UCC es obligatorio' });
    }

    // Verificar si el email ya existe
    const existing = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      const existingUser = existing.rows[0];

      // Si el usuario ya existe pero no está verificado, verificamos bloqueo y cooldown
      if (existingUser.email_verificado) {
        return res.status(409).json({ error: 'Este email ya está registrado y verificado' });
      }

      const status = getOtpStatus(existingUser);
      if (status.locked) {
        return res.status(429).json({
          error: 'Demasiados intentos. Espera 5 minutos antes de solicitar otro código.',
          retryAfter: 300
        });
      }

      if (existingUser.otp_last_sent_at && (Date.now() - new Date(existingUser.otp_last_sent_at).getTime()) < RESEND_COOLDOWN_SECONDS * 1000) {
        return res.status(429).json({
          error: 'Espera 30 segundos antes de reenviar el código.',
          retryAfter: RESEND_COOLDOWN_SECONDS
        });
      }

      const otp = generateOtp();
      const otp_expires_at = new Date(Date.now() + OTP_WINDOW_MINUTES * 60 * 1000);
      const password_hash = await bcrypt.hash(password, 10);

      await pool.query(
        `UPDATE users 
         SET password_hash = $1, nombre = $2, apellido = $3, telefono = $4, role = $5, campus = $6, otp_code = $7, otp_expires_at = $8,
             otp_attempts = 0, otp_locked_until = NULL, otp_last_sent_at = NOW(), otp_resend_count = COALESCE(otp_resend_count, 0) + 1
         WHERE LOWER(email) = $9`,
        [password_hash, nombre, apellido, telefono || null, role === 'admin' ? 'admin' : 'user', campus, otp, otp_expires_at, cleanEmail]
      );

      // Enviar OTP por correo
      try {
        await sendOtpEmail(cleanEmail, nombre, otp);
      } catch (mailErr) {
        console.error('Error enviando correo OTP:', mailErr);
        return res.status(500).json({ error: 'Error al enviar el correo con el código OTP. Por favor verifica los datos SMTP.' });
      }

      return res.status(200).json({ message: 'Código OTP reenviado a tu correo. Por favor, verifícalo.' });
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Determinar rol (por defecto user)
    const userRole = role === 'admin' ? 'admin' : 'user';

    // Generar OTP de 6 dígitos
    const otp = generateOtp();
    const otp_expires_at = new Date(Date.now() + OTP_WINDOW_MINUTES * 60 * 1000);

    // Insertar usuario no verificado con OTP
    const result = await pool.query(
      `INSERT INTO users (email, password_hash, nombre, apellido, telefono, role, email_verificado, verificado, campus, otp_code, otp_expires_at, otp_attempts, otp_locked_until, otp_last_sent_at, otp_resend_count)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE, FALSE, $7, $8, $9, 0, NULL, NOW(), 1)
       RETURNING id, email, nombre, apellido, role, campus`,
      [cleanEmail, password_hash, nombre, apellido, telefono || null, userRole, campus, otp, otp_expires_at]
    );

    // Enviar OTP por correo
    try {
      await sendOtpEmail(cleanEmail, nombre, otp);
    } catch (mailErr) {
      console.error('Error enviando correo OTP:', mailErr);
      await pool.query('DELETE FROM users WHERE id = $1', [result.rows[0].id]);
      return res.status(500).json({ error: 'Error al enviar el correo con el código OTP. Por favor, verifica la configuración del correo.' });
    }

    res.status(201).json({ message: 'Código OTP enviado a tu correo. Por favor, revísalo.' });
  } catch (err) {
    console.error('Error en registro:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ VERIFY OTP ============
router.post('/verify-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: 'Email y código OTP son obligatorios' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = $1',
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'El usuario no está registrado' });
    }

    const user = result.rows[0];

    // Validar código OTP
    const status = getOtpStatus(user);
    if (status.locked) {
      return res.status(429).json({
        error: 'Demasiados intentos. Espera 5 minutos antes de intentar otro código.',
        retryAfter: 300,
        attemptsLeft: 0
      });
    }

    if (!user.otp_code || user.otp_code !== cleanOtp) {
      const nextAttempts = Number(user.otp_attempts || 0) + 1;
      const attemptsLeft = Math.max(0, MAX_OTP_ATTEMPTS - nextAttempts);

      if (nextAttempts >= MAX_OTP_ATTEMPTS) {
        await pool.query(
          `UPDATE users
           SET otp_attempts = $1,
               otp_locked_until = NOW() + INTERVAL '5 minutes',
               otp_code = NULL,
               otp_expires_at = NULL
           WHERE LOWER(email) = $2`,
          [nextAttempts, cleanEmail]
        );

        return res.status(429).json({
          error: 'Demasiados intentos. Tu código ha sido bloqueado por 5 minutos.',
          retryAfter: 300,
          attemptsLeft: 0
        });
      }

      await pool.query('UPDATE users SET otp_attempts = $1 WHERE LOWER(email) = $2', [nextAttempts, cleanEmail]);
      return res.status(401).json({
        error: 'Código OTP incorrecto.',
        attemptsLeft,
        attempts: nextAttempts
      });
    }

    // Validar expiración (comparado en Node.js para evitar desfases de zona horaria con la base de datos)
    if (user.otp_expires_at && new Date(user.otp_expires_at).getTime() < Date.now()) {
      return res.status(401).json({ error: 'El código OTP ha expirado. Solicita uno nuevo.', attemptsLeft: MAX_OTP_ATTEMPTS });
    }

    // Marcar como verificado y limpiar OTP
    await pool.query(
      'UPDATE users SET email_verificado = TRUE, verificado = TRUE, otp_code = NULL, otp_expires_at = NULL, otp_attempts = 0, otp_locked_until = NULL WHERE LOWER(email) = $1',
      [cleanEmail]
    );

    // Reutilizar el usuario ya cargado, actualizando los campos verificados en memoria
    user.email_verificado = true;
    user.verificado = true;
    user.otp_code = null;
    user.otp_expires_at = null;

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, verificado: true },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const cookieName = user.role === 'admin' ? 'stayu_admin_token' : 'stayu_token';

    res.cookie(cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
    });

    const { password_hash, otp_code, otp_expires_at, ...safeUser } = user;
    res.json({ user: safeUser, message: 'Correo verificado exitosamente' });
  } catch (err) {
    console.error('Error en verificación OTP:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ LOGIN ============
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // DIAGNÓSTICO TEMPORAL
    try {
      const fs = require('fs');
      const logPath = require('path').join(__dirname, '../../../login-attempts.log');
      fs.appendFileSync(
        logPath,
        `[${new Date().toISOString()}] Intentando login - Email: "${email}", Password: "${password}", Longitud: ${password ? password.length : 0}\n`
      );
    } catch (err) {
      console.error('Error escribiendo log de login:', err);
    }

    if (!email || !password) {
      return res.status(400).json({ error: 'Email y contraseña son obligatorios' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const result = await pool.query(
      'SELECT * FROM users WHERE LOWER(email) = $1',
      [cleanEmail]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const user = result.rows[0];

    // Verificar si el usuario está bloqueado
    if (user.bloqueado) {
      return res.status(403).json({ error: `Tu cuenta ha sido bloqueada. Motivo: ${user.motivo_bloqueo || 'Infracción de los términos de la comunidad'}` });
    }

    if (!user.email_verificado) {
      return res.status(403).json({ error: 'Debes verificar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada.' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, verificado: user.verificado },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const cookieName = user.role === 'admin' ? 'stayu_admin_token' : 'stayu_token';

    res.cookie(cookieName, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
    });

    // No enviar password_hash al frontend
    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ LOGOUT ============
router.post('/logout', (req, res) => {
  res.clearCookie('stayu_token');
  res.clearCookie('stayu_admin_token');
  res.json({ message: 'Sesión cerrada exitosamente' });
});

// ============ GET ME ============
router.get('/me', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const result = await pool.query(
      `SELECT id, email, nombre, apellido, telefono, role, foto_perfil, verificado, created_at, campus
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error obteniendo perfil:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ UPDATE ME ============
router.put('/me', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { nombre, apellido, telefono, campus } = req.body;

    const result = await pool.query(
      `UPDATE users SET nombre = COALESCE($1, nombre), apellido = COALESCE($2, apellido),
       telefono = COALESCE($3, telefono), campus = COALESCE($4, campus), updated_at = NOW()
       WHERE id = $5
       RETURNING id, email, nombre, apellido, telefono, role, foto_perfil, verificado, campus`,
      [nombre, apellido, telefono, campus, req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error actualizando perfil:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ UPLOAD PROFILE PHOTO ============
const multer = require('multer');
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = require('path').extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Solo se permiten imágenes (JPG, PNG, WebP)'));
    }
  }
});

router.post('/foto-perfil', upload.single('foto'), async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'Debe subir una imagen' });
    }
    
    // Subir a la tabla archivos
    const resultFile = await pool.query(
      'INSERT INTO archivos (nombre, mimetype, datos) VALUES ($1, $2, $3) RETURNING id',
      [req.file.originalname, req.file.mimetype, req.file.buffer]
    );
    const fotoUrl = `/api/archivos/${resultFile.rows[0].id}`;

    // Actualizar usuario
    await pool.query(
      'UPDATE users SET foto_perfil = $1, updated_at = NOW() WHERE id = $2',
      [fotoUrl, req.user.id]
    );

    res.json({ foto_perfil: fotoUrl, message: 'Foto de perfil actualizada con éxito' });
  } catch (err) {
    console.error('Error al subir foto de perfil:', err);
    res.status(500).json({ error: 'Error interno al subir foto de perfil' });
  }
});

// ============ ADMIN: LISTAR TODOS LOS USUARIOS ============
router.get('/admin/usuarios', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const result = await pool.query(
      `SELECT id, email, nombre, apellido, telefono, role, foto_perfil, verificado, email_verificado, campus, bloqueado, motivo_bloqueo, bloqueado_en, created_at
       FROM users
       ORDER BY created_at DESC`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error listando usuarios admin:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ ADMIN: ESTADISTICAS EXTENDIDAS DE LA PLATAFORMA ============
router.get('/admin/dashboard-stats', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    // 1. Estadísticas de propiedades (alojamientos)
    const propStats = await pool.query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN activo = TRUE THEN 1 END) as activas,
        COUNT(CASE WHEN activo = FALSE THEN 1 END) as inactivas
      FROM propiedades
    `);

    const propTypes = await pool.query(`
      SELECT tipo, COUNT(*) as cantidad
      FROM propiedades
      GROUP BY tipo
      ORDER BY cantidad DESC
    `);

    // 2. Reservas por mes (últimos 12 meses)
    const reservasPorMes = await pool.query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as mes,
        COUNT(*) as total,
        COUNT(CASE WHEN estado = 'aceptada' THEN 1 END) as aprobadas,
        COUNT(CASE WHEN estado = 'pendiente' THEN 1 END) as pendientes,
        COUNT(CASE WHEN estado = 'rechazada' THEN 1 END) as rechazadas,
        COUNT(CASE WHEN estado = 'cancelada' THEN 1 END) as canceladas
      FROM reservas
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY mes ASC
      LIMIT 12
    `);

    res.json({
      propiedades: {
        total: parseInt(propStats.rows[0].total || 0),
        activas: parseInt(propStats.rows[0].activas || 0),
        inactivas: parseInt(propStats.rows[0].inactivas || 0),
        tipos: propTypes.rows.map(r => ({ tipo: r.tipo, cantidad: parseInt(r.cantidad) }))
      },
      reservas_por_mes: reservasPorMes.rows.map(r => ({
        mes: r.mes,
        total: parseInt(r.total || 0),
        aprobadas: parseInt(r.aprobadas || 0),
        pendientes: parseInt(r.pendientes || 0),
        rechazadas: parseInt(r.rechazadas || 0),
        canceladas: parseInt(r.canceladas || 0)
      }))
    });
  } catch (err) {
    console.error('Error obteniendo estadísticas extendidas admin:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});


// ============ ADMIN: BLOQUEAR / DESBLOQUEAR USUARIO ============
router.patch('/admin/usuarios/:id/bloquear', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const { id } = req.params;
    const { bloqueado, motivo_bloqueo } = req.body;

    if (bloqueado === undefined) {
      return res.status(400).json({ error: 'El campo bloqueado es obligatorio' });
    }

    const result = await pool.query(
      `UPDATE users
       SET bloqueado = $1,
           motivo_bloqueo = $2,
           bloqueado_en = CASE WHEN $1 = TRUE THEN NOW() ELSE NULL END,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, nombre, apellido, role, bloqueado, motivo_bloqueo, bloqueado_en`,
      [bloqueado, bloqueado ? (motivo_bloqueo || 'Infracción de las normas de la comunidad') : null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error bloqueando/desbloqueando usuario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ ADMIN: ELIMINAR USUARIO ============
router.delete('/admin/usuarios/:id', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const { id } = req.params;

    // Evitar que el admin se elimine a sí mismo
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propia cuenta de administrador' });
    }

    const userCheck = await pool.query('SELECT id, email, role FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    if (userCheck.rows[0].role === 'admin') {
      return res.status(403).json({ error: 'No puedes eliminar otra cuenta de administrador' });
    }

    // Eliminar usuario (ON DELETE CASCADE en DB se encarga del resto)
    await pool.query('DELETE FROM users WHERE id = $1', [id]);

    res.json({ message: `Cuenta de ${userCheck.rows[0].email} eliminada permanentemente.` });
  } catch (err) {
    console.error('Error eliminando usuario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ ADMIN: RESETEAR CONTRASEÑA ============
router.post('/admin/usuarios/:id/reset-password', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const { id } = req.params;

    const userCheck = await pool.query('SELECT id, email, nombre FROM users WHERE id = $1', [id]);
    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Generar contraseña temporal legible
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let tempPassword = '';
    for (let i = 0; i < 10; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const hash = await bcrypt.hash(tempPassword, 10);

    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hash, id]
    );

    res.json({
      message: 'Contraseña reseteada con éxito',
      nueva_password: tempPassword,
      usuario_email: userCheck.rows[0].email,
      usuario_nombre: userCheck.rows[0].nombre
    });
  } catch (err) {
    console.error('Error reseteando contraseña:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ OTP CONFIG ============
const OTP_WINDOW_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;
const OTP_LOCKOUT_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 30;

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

const sendOtpEmail = async (email, nombre, otp) => {
  await transporter.sendMail({
    from: `"HUASI - Universidad Cooperativa" <${process.env.SMTP_USER}>`,
    to: email,
    subject: 'Verifica tu cuenta - HUASI',
    text: `Hola ${nombre},\n\nTu código de verificación OTP es: ${otp}\n\nEste código expira en 5 minutos.\n\nAtentamente,\nEl equipo de HUASI`,
    html: `<h3>Hola ${nombre},</h3>
           <p>Tu código de verificación OTP para registrarte en HUASI es:</p>
           <h1 style="font-size: 2.5rem; letter-spacing: 5px; color: #1e3a8a; text-align: center;">${otp}</h1>
           <p>Este código expira en <strong>5 minutos</strong>.</p>
           <p>Si no solicitaste este registro, puedes ignorar este correo.</p>`
  });
};

const getOtpStatus = (user) => {
  const now = new Date();
  const locked = user.otp_locked_until && new Date(user.otp_locked_until).getTime() > now.getTime();
  const attemptsLeft = Math.max(0, MAX_OTP_ATTEMPTS - Number(user.otp_attempts || 0));
  return { locked, attemptsLeft };
};

module.exports = router;
