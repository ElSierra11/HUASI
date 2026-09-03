const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../db');

// Auto-verificar columnas para recuperación de contraseñas de forma idempotente
pool.query(`
  ALTER TABLE users 
  ADD COLUMN IF NOT EXISTS reset_password_token VARCHAR(255),
  ADD COLUMN IF NOT EXISTS reset_password_expires_at TIMESTAMP;
`).catch(err => console.warn('Aviso al verificar columnas de password reset:', err.message));

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'stayu_secret_key';
const isProd = process.env.NODE_ENV === 'production' || !!process.env.DATABASE_URL || !!process.env.RENDER;

// ============ OTP CONFIG & HELPERS ============
const OTP_WINDOW_MINUTES = 5;
const MAX_OTP_ATTEMPTS = 5;
const OTP_LOCKOUT_MINUTES = 5;
const RESEND_COOLDOWN_SECONDS = 30;

const generateOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

// ============ EMAIL CONFIG (Nodemailer SMTP con Gmail App Password + Fallback OAuth2) ============
const nodemailer = require('nodemailer');

const createSmtpTransporter = () => {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || 'huasicorrespondencia@gmail.com';
  const pass = process.env.SMTP_PASS || process.env.GMAIL_PASS || 'yoykcsknradxakjw';
  
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: { user, pass }
  });
};

const getGmailAccessToken = async () => {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GMAIL_CLIENT_ID,
      client_secret: process.env.GMAIL_CLIENT_SECRET,
      refresh_token: process.env.GMAIL_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error_description || data.error || 'Error obteniendo access token');
  }
  return data.access_token;
};

const sendOtpEmail = async (email, nombre, otp) => {
  console.log(`📧 [Email Sending] Enviando código OTP a: ${email}`);

  const htmlBody = `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
      <div style="text-align: center; margin-bottom: 20px;">
        <h2 style="color: #0d7c3d; margin: 0; font-size: 22px;">HUASI — Hospedaje Solidario</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px;">Verificación de Correo Institucional UCC</p>
      </div>
      <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 20px;">
        <p style="color: #166534; font-size: 14px; margin: 0 0 8px 0; font-weight: bold;">Tu código de verificación es:</p>
        <span style="font-size: 36px; font-weight: 900; letter-spacing: 8px; color: #0d7c3d; display: inline-block;">${otp}</span>
        <p style="color: #64748b; font-size: 12px; margin: 8px 0 0 0;">⏱️ Válido por 5 minutos</p>
      </div>
      <p style="color: #334155; font-size: 14px; line-height: 1.5;">
        Hola <strong>${nombre || 'Usuario'}</strong>, ingresa este código en HUASI para verificar tu correo institucional.
      </p>
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
        Si no solicitaste este registro, ignora este correo.
      </p>
    </div>
  `;

  // ===== MÉTODO 1: Gmail REST API vía OAuth2 (HTTP — funciona en Render) =====
  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN) {
    try {
      console.log(`  [OAuth2] Intentando enviar vía Gmail REST API...`);
      const accessToken = await getGmailAccessToken();
      const encodeHeader = (str) => `=?UTF-8?B?${Buffer.from(str, 'utf-8').toString('base64')}?=`;

      const rawMessage = [
        `From: ${encodeHeader('HUASI — Hospedaje Solidario')} <${process.env.GMAIL_USER || 'huasicorrespondencia@gmail.com'}>`,
        `To: ${email}`,
        `Subject: ${encodeHeader('Código de Verificación OTP - HUASI UCC')}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=utf-8`,
        `Content-Transfer-Encoding: base64`,
        ``,
        Buffer.from(htmlBody, 'utf-8').toString('base64'),
      ].join('\r\n');

      const encodedMessage = Buffer.from(rawMessage, 'utf-8').toString('base64url');

      const gmailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encodedMessage }),
      });

      const result = await gmailRes.json();
      if (!gmailRes.ok) {
        throw new Error(result.error?.message || 'Error enviando email via Gmail API');
      }

      console.log(`✅ [Gmail OAuth2 API] Email enviado. Id: ${result.id}`);
      return result;
    } catch (oauthErr) {
      console.warn(`⚠️ [OAuth2 Error] ${oauthErr.message}`);
    }
  }

  // ===== MÉTODO 2: Nodemailer SMTP (funciona local, puede fallar en Render) =====
  try {
    console.log(`  [SMTP] Intentando enviar vía SMTP con timeout de 8s...`);
    const transporter = createSmtpTransporter();
    const senderEmail = process.env.SMTP_USER || process.env.GMAIL_USER || 'huasicorrespondencia@gmail.com';

    // Timeout de 8 segundos para evitar que se cuelgue en Render
    const sendPromise = transporter.sendMail({
      from: `"HUASI — Hospedaje Solidario" <${senderEmail}>`,
      to: email,
      subject: 'Código de Verificación OTP - HUASI UCC',
      html: htmlBody,
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('SMTP timeout: Render probablemente bloquea puertos SMTP')), 8000)
    );

    const info = await Promise.race([sendPromise, timeoutPromise]);
    console.log(`✅ [SMTP] Email OTP enviado a ${email}. Id: ${info.messageId}`);
    return info;
  } catch (smtpErr) {
    console.error(`❌ [SMTP Error] ${smtpErr.message}`);
    throw new Error(`No se pudo enviar el correo: OAuth2 y SMTP fallaron. Último error: ${smtpErr.message}`);
  }
};

const sendOtpEmailBackground = async (email, nombre, otp) => {
  console.log(`=======================================================`);
  console.log(`🔑 [OTP LOG] Código OTP para ${email}: ${otp}`);
  console.log(`  SMTP_USER: ${process.env.SMTP_USER || '(no definido, usando fallback)'}`);
  console.log(`  GMAIL_USER: ${process.env.GMAIL_USER || '(no definido)'}`);
  console.log(`=======================================================`);

  try {
    const info = await sendOtpEmail(email, nombre, otp);
    console.log(`✅ [OTP EMAIL] Código enviado a ${email}.`);
    return { success: true, info };
  } catch (err) {
    console.error('❌ [OTP EMAIL ERROR] No se pudo enviar el correo:', err.message);
    return { success: false, error: err.message };
  }
};

const sendResetPasswordEmail = async (email, nombre, resetLink) => {
  console.log(`📧 [Email Sending] Enviando enlace de recuperación a: ${email}`);

  const htmlBody = `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; box-shadow: 0 4px 12px rgba(0,0,0,0.05);">
      <div style="text-align: center; margin-bottom: 24px;">
        <h2 style="color: #0d7c3d; margin: 0; font-size: 24px; font-weight: 800;">HUASI</h2>
        <p style="color: #64748b; font-size: 13px; margin-top: 4px; letter-spacing: 0.5px;">Hospedaje Solidario Universitario UCC</p>
      </div>
      
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
        <h3 style="color: #1e293b; font-size: 18px; margin: 0 0 12px 0;">Recuperación de Contraseña</h3>
        <p style="color: #475569; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
          Hola <strong>${nombre || 'Estudiante'}</strong>, recibimos una solicitud para restablecer la contraseña de tu cuenta institucional en HUASI.
        </p>
        
        <div style="text-align: center; margin: 24px 0;">
          <a href="${resetLink}" 
             style="background: linear-gradient(135deg, #0d7c3d, #059669); color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; display: inline-block; font-size: 15px; box-shadow: 0 4px 12px rgba(13,124,61,0.25);">
            🔑 Restablecer mi Contraseña
          </a>
        </div>
        
        <p style="color: #64748b; font-size: 12px; margin: 16px 0 0 0; line-height: 1.5;">
          Si el botón no funciona, haz clic o copia el siguiente enlace directo en tu navegador:<br />
          <a href="${resetLink}" style="color: #0d7c3d; word-break: break-all; font-weight: 600;">${resetLink}</a>
        </p>
      </div>

      <div style="padding: 12px 16px; background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 8px; margin-bottom: 20px;">
        <p style="color: #92400e; font-size: 12px; margin: 0; line-height: 1.5;">
          ⏱️ <strong>Seguridad:</strong> Este enlace directo expira en <strong>60 minutos</strong> y solo puede utilizarse una vez. Si no fuiste tú quien solicitó este cambio, ignora este correo; tu cuenta continuará protegida.
        </p>
      </div>
      
      <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
      <p style="color: #94a3b8; font-size: 11px; text-align: center; margin: 0;">
        HUASI — Universidad Cooperativa de Colombia (UCC) & INDESCO<br />
        Este es un correo automático de seguridad, por favor no respondas a este mensaje.
      </p>
    </div>
  `;

  // MÉTODO 1: OAuth2 REST API (Funciona en Render)
  if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_CLIENT_SECRET && process.env.GMAIL_REFRESH_TOKEN) {
    try {
      console.log(`  [OAuth2] Intentando enviar correo de recuperación vía Gmail REST API...`);
      const accessToken = await getGmailAccessToken();
      const encodeHeader = (str) => `=?UTF-8?B?${Buffer.from(str, 'utf-8').toString('base64')}?=`;

      const rawMessage = [
        `From: ${encodeHeader('HUASI — Seguridad UCC')} <${process.env.GMAIL_USER || 'huasicorrespondencia@gmail.com'}>`,
        `To: ${email}`,
        `Subject: ${encodeHeader('🔑 Recuperación de Contraseña - HUASI UCC')}`,
        `MIME-Version: 1.0`,
        `Content-Type: text/html; charset=utf-8`,
        `Content-Transfer-Encoding: base64`,
        ``,
        Buffer.from(htmlBody, 'utf-8').toString('base64'),
      ].join('\r\n');

      const encodedMessage = Buffer.from(rawMessage, 'utf-8').toString('base64url');

      const gmailRes = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ raw: encodedMessage }),
      });

      const result = await gmailRes.json();
      if (!gmailRes.ok) {
        throw new Error(result.error?.message || 'Error enviando email via Gmail API');
      }

      console.log(`✅ [Gmail OAuth2 API] Email de recuperación enviado con éxito. Id: ${result.id}`);
      return result;
    } catch (oauthErr) {
      console.warn(`⚠️ [OAuth2 Error] ${oauthErr.message}`);
    }
  }

  // MÉTODO 2: SMTP con Nodemailer
  try {
    console.log(`  [SMTP] Intentando enviar correo de recuperación vía SMTP...`);
    const transporter = createSmtpTransporter();
    const senderEmail = process.env.SMTP_USER || process.env.GMAIL_USER || 'huasicorrespondencia@gmail.com';

    const sendPromise = transporter.sendMail({
      from: `"HUASI — Seguridad UCC" <${senderEmail}>`,
      to: email,
      subject: '🔑 Recuperación de Contraseña - HUASI UCC',
      html: htmlBody,
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('SMTP timeout: Render bloquea puertos SMTP')), 8000)
    );

    const info = await Promise.race([sendPromise, timeoutPromise]);
    console.log(`✅ [SMTP] Email de recuperación enviado a ${email}. Id: ${info.messageId}`);
    return info;
  } catch (smtpErr) {
    console.error(`❌ [SMTP Error] ${smtpErr.message}`);
    throw new Error(`No se pudo enviar el correo de recuperación: ${smtpErr.message}`);
  }
};

// Endpoint de diagnóstico de email (temporal)
router.get('/test-email', async (req, res) => {
  try {
    console.log('[TEST EMAIL] Probando envío de correo...');
    console.log(`  SMTP_USER: ${process.env.SMTP_USER || 'NO DEFINIDO'}`);
    console.log(`  SMTP_PASS: ${process.env.SMTP_PASS ? '****' + process.env.SMTP_PASS.slice(-4) : 'NO DEFINIDO'}`);
    console.log(`  GMAIL_USER: ${process.env.GMAIL_USER || 'NO DEFINIDO'}`);
    console.log(`  GMAIL_CLIENT_ID: ${process.env.GMAIL_CLIENT_ID ? 'SÍ' : 'NO'}`);
    console.log(`  GMAIL_REFRESH_TOKEN: ${process.env.GMAIL_REFRESH_TOKEN ? 'SÍ' : 'NO'}`);

    const testEmail = process.env.SMTP_USER || process.env.GMAIL_USER || 'huasicorrespondencia@gmail.com';
    const info = await sendOtpEmail(testEmail, 'Test', '999999');
    res.json({ success: true, message: `Email de prueba enviado a ${testEmail}`, info: info?.messageId || info?.id || 'ok' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message, stack: err.stack?.split('\n').slice(0, 3) });
  }
});

const getOtpStatus = (user) => {
  const now = new Date();
  const locked = user.otp_locked_until && new Date(user.otp_locked_until).getTime() > now.getTime();
  const attemptsLeft = Math.max(0, MAX_OTP_ATTEMPTS - Number(user.otp_attempts || 0));
  return { locked, attemptsLeft };
};

// ============ REGISTER ============
router.post('/register', async (req, res) => {
  try {
    const { email, password, nombre, apellido, telefono, role, campus } = req.body;

    if (!email || !password || !nombre || !apellido) {
      return res.status(400).json({ error: 'Email, contraseña, nombre y apellido son obligatorios' });
    }

    const cleanEmail = email.trim().toLowerCase();

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(cleanEmail)) {
      return res.status(400).json({ error: 'Debes ingresar un correo electrónico válido' });
    }

    if (!campus) {
      return res.status(400).json({ error: 'El campus o sede es obligatorio' });
    }

    if (typeof password !== 'string' || password.length < 8) {
      return res.status(400).json({ error: 'La contraseña debe tener al menos 8 caracteres' });
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

      // Enviar OTP y esperar resultado
      const emailResult = await sendOtpEmailBackground(cleanEmail, nombre, otp);

      return res.status(200).json({ 
        message: emailResult?.success ? 'Código OTP enviado a tu correo. Por favor, revísalo.' : 'Código OTP generado. Si no llega, usa Reenviar código.',
        emailSent: emailResult?.success || false
      });
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

    // Enviar OTP y esperar resultado
    const emailResult = await sendOtpEmailBackground(cleanEmail, nombre, otp);

    res.status(201).json({ 
      message: emailResult?.success ? 'Código OTP enviado a tu correo. Por favor, revísalo.' : 'Código OTP generado. Si no llega, usa Reenviar código.',
      emailSent: emailResult?.success || false
    });
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
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
    });

    const { password_hash, otp_code, otp_expires_at, ...safeUser } = user;
    res.json({ user: safeUser, token, message: 'Correo verificado exitosamente' });
  } catch (err) {
    console.error('Error en verificación OTP:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ LOGIN ============
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

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
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 dias
    });

    // Registrar actividad de inicio de sesión y presencia
    const userAgent = req.headers['user-agent'] || '';
    const isMobile = /Mobile|Android|iP(hone|od|ad)/i.test(userAgent);
    const dispositivo = isMobile ? 'Móvil' : 'Escritorio';
    
    await pool.query(
      `UPDATE users SET ultimo_acceso = NOW(), dispositivo = $1, ultima_ruta = '/login' WHERE id = $2`,
      [dispositivo, user.id]
    ).catch(e => console.warn('Error actualizando ultimo_acceso en login:', e.message));

    await pool.query(
      `INSERT INTO user_actividades (user_id, tipo_evento, descripcion, ruta, dispositivo, metadata)
       VALUES ($1, 'login', 'Inicio de sesión exitoso', '/login', $2, $3)`,
      [user.id, dispositivo, JSON.stringify({ rol: user.role, campus: user.campus })]
    ).catch(e => console.warn('Error registrando actividad de login:', e.message));

    // No enviar password_hash al frontend, enviar token
    const { password_hash, ...safeUser } = user;
    res.json({ user: safeUser, token });
  } catch (err) {
    console.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ SOLICITAR RECUPERACIÓN DE CONTRASEÑA ============
router.post('/olvido-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'El correo electrónico es obligatorio' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Validar formato de correo institucional
    const allowedDomains = ['campusucc.edu.co', 'ucc.edu.co'];
    const domain = cleanEmail.split('@')[1];
    if (!allowedDomains.includes(domain)) {
      return res.status(400).json({
        error: 'El correo debe pertenecer a @campusucc.edu.co o @ucc.edu.co'
      });
    }

    const userRes = await pool.query('SELECT id, nombre, email FROM users WHERE LOWER(email) = $1', [cleanEmail]);

    if (userRes.rows.length === 0) {
      // Por privacidad y seguridad, responder con mensaje general sin revelar si el correo existe
      return res.json({
        message: 'Si el correo ingresado está registrado en HUASI, recibirás un enlace seguro para restablecer tu contraseña en los próximos minutos.'
      });
    }

    const user = userRes.rows[0];
    const token = crypto.randomBytes(32).toString('hex');

    // Guardar token con expiración de 1 hora
    await pool.query(
      `UPDATE users 
       SET reset_password_token = $1, reset_password_expires_at = NOW() + INTERVAL '1 hour'
       WHERE id = $2`,
      [token, user.id]
    );

    // Determinar la URL del frontend para el enlace directo
    let baseUrl = req.headers.origin || req.headers.referer;
    if (baseUrl) {
      try {
        const parsed = new URL(baseUrl);
        baseUrl = parsed.origin;
      } catch (e) {}
    }
    if (!baseUrl || baseUrl.includes('localhost:4000') || baseUrl.includes('localhost:4001')) {
      baseUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    }

    const resetLink = `${baseUrl}/recuperar-password?token=${token}&email=${encodeURIComponent(cleanEmail)}`;
    console.log(`🔗 [Reset Password Link] Enlace generado para ${cleanEmail}: ${resetLink}`);

    // Enviar correo electrónico
    try {
      await sendResetPasswordEmail(cleanEmail, user.nombre, resetLink);
    } catch (mailErr) {
      console.error('Error enviando correo de recuperación:', mailErr.message);
    }

    res.json({
      message: 'Si el correo ingresado está registrado en HUASI, recibirás un enlace seguro para restablecer tu contraseña en los próximos minutos.'
    });
  } catch (err) {
    console.error('Error en /olvido-password:', err);
    res.status(500).json({ error: 'Error interno al procesar la solicitud de recuperación' });
  }
});

// ============ RESTABLECER CONTRASEÑA CON TOKEN ============
router.post('/recuperar-password', async (req, res) => {
  try {
    const { token, email, nuevo_password } = req.body;

    if (!token || !email || !nuevo_password) {
      return res.status(400).json({ error: 'Token, correo y nueva contraseña son obligatorios' });
    }

    if (nuevo_password.length < 6) {
      return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 6 caracteres' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // Buscar usuario con el token correspondiente
    const userRes = await pool.query(
      `SELECT id, nombre, email, reset_password_expires_at 
       FROM users 
       WHERE LOWER(email) = $1 AND reset_password_token = $2`,
      [cleanEmail, token]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: 'El enlace de recuperación no es válido o ya fue utilizado.' });
    }

    const user = userRes.rows[0];

    // Verificar si ya expiró (más de 1 hora)
    if (new Date(user.reset_password_expires_at) < new Date()) {
      return res.status(400).json({ error: 'El enlace de recuperación ha expirado. Por favor solicita uno nuevo.' });
    }

    // Hashear nueva contraseña
    const passwordHash = await bcrypt.hash(nuevo_password, 10);

    // Actualizar contraseña e invalidar el token de un solo uso
    await pool.query(
      `UPDATE users 
       SET password_hash = $1, reset_password_token = NULL, reset_password_expires_at = NULL, updated_at = NOW()
       WHERE id = $2`,
      [passwordHash, user.id]
    );

    console.log(`✅ [Password Reset] Contraseña restablecida con éxito para ${cleanEmail}`);

    res.json({ message: '¡Tu contraseña ha sido restablecida exitosamente! Ya puedes iniciar sesión con tu nueva clave.' });
  } catch (err) {
    console.error('Error en /recuperar-password:', err);
    res.status(500).json({ error: 'Error interno del servidor al restablecer contraseña' });
  }
});


// ============ LOGOUT ============
router.post('/logout', (req, res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax'
  };
  res.clearCookie('stayu_token', cookieOptions);
  res.clearCookie('stayu_admin_token', cookieOptions);
  res.json({ message: 'Sesión cerrada exitosamente' });
});

// ============ GET ME ============
router.get('/me', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const result = await pool.query(
      `SELECT id, email, nombre, apellido, telefono, role, foto_perfil, verificado, created_at, campus, soles_balance, preferencias_convivencia
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

// ============ ADMIN: CONTADORES EN TIEMPO REAL PARA SIDEBAR ============
router.get('/admin/sidebar-counters', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const [verifRes, aljRes, pqrRes, usersRes, onlineRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) as count FROM users WHERE (verificado = FALSE OR verificado IS NULL) AND documento_verificacion IS NOT NULL`),
      pool.query(`SELECT COUNT(*) as count FROM propiedades WHERE estado_aprobacion = 'pendiente_revision'`),
      pool.query(`SELECT COUNT(*) as count FROM reportes WHERE estado = 'abierto' OR estado = 'en_revision'`),
      pool.query(`SELECT COUNT(*) as count FROM users`),
      pool.query(`SELECT COUNT(*) as count FROM users WHERE ultimo_acceso >= NOW() - INTERVAL '15 minutes'`)
    ]);

    res.json({
      verificaciones_pendientes: parseInt(verifRes.rows[0].count, 10) || 0,
      alojamientos_pendientes: parseInt(aljRes.rows[0].count, 10) || 0,
      reportes_abiertos: parseInt(pqrRes.rows[0].count, 10) || 0,
      total_usuarios: parseInt(usersRes.rows[0].count, 10) || 0,
      usuarios_online: parseInt(onlineRes.rows[0].count, 10) || 0
    });
  } catch (err) {
    console.error('Error obteniendo contadores de sidebar:', err);
    res.status(500).json({ error: 'Error obteniendo contadores' });
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

// ============ ADMIN: REPORTES Y ESTADISTICAS MENSUALES GRANULARES ============
router.get('/admin/estadisticas-mensuales', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    // 1. Estadísticas por Campus
    const campusStats = await pool.query(`
      SELECT 
        COALESCE(campus_cercano, 'Santa Marta') as campus,
        COUNT(*) as total_alojamientos,
        COUNT(CASE WHEN activo = TRUE THEN 1 END) as activos
      FROM propiedades
      GROUP BY COALESCE(campus_cercano, 'Santa Marta')
      ORDER BY total_alojamientos DESC
    `);

    // 2. Histórico mensual de actividad (últimos 12 meses)
    const historicoMensual = await pool.query(`
      SELECT 
        TO_CHAR(r.created_at, 'YYYY-MM') as mes,
        COUNT(r.id) as total_reservas,
        COUNT(CASE WHEN r.estado IN ('aceptada', 'aprobada') THEN 1 END) as reservas_aceptadas,
        COUNT(CASE WHEN r.estado = 'rechazada' THEN 1 END) as reservas_rechazadas
      FROM reservas r
      GROUP BY TO_CHAR(r.created_at, 'YYYY-MM')
      ORDER BY mes DESC
      LIMIT 12
    `);

    // 3. Alojamientos nuevos por mes
    const propiedadesMensuales = await pool.query(`
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM') as mes,
        COUNT(*) as nuevos_alojamientos
      FROM propiedades
      GROUP BY TO_CHAR(created_at, 'YYYY-MM')
      ORDER BY mes DESC
      LIMIT 12
    `);

    res.json({
      campus: campusStats.rows.map(c => ({
        campus: c.campus,
        total_alojamientos: parseInt(c.total_alojamientos || 0),
        activos: parseInt(c.activos || 0)
      })),
      historico_reservas: historicoMensual.rows.map(h => ({
        mes: h.mes,
        total_reservas: parseInt(h.total_reservas || 0),
        reservas_aceptadas: parseInt(h.reservas_aceptadas || 0),
        reservas_rechazadas: parseInt(h.reservas_rechazadas || 0)
      })),
      propiedades_mensuales: propiedadesMensuales.rows.map(p => ({
        mes: p.mes,
        nuevos_alojamientos: parseInt(p.nuevos_alojamientos || 0)
      }))
    });
  } catch (err) {
    console.error('Error obteniendo reporte mensual admin:', err);
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



// ============ GET SOLES TRANSACTION HISTORY ============
router.get('/soles/historial', async (req, res) => {
  res.json([]);
});

// ============ GET SOLIDARITY IMPACT DASHBOARD ============
router.get('/impacto', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // 1. Calculate nights offered as host
    const nightsResult = await pool.query(
      `SELECT r.fecha_inicio, r.fecha_fin, r.guest_id
       FROM reservas r
       JOIN propiedades p ON r.propiedad_id = p.id
       WHERE p.host_id = $1 AND r.estado IN ('aceptada', 'completada')`,
      [req.user.id]
    );

    let totalNightsOffered = 0;
    const uniqueGuests = new Set();

    nightsResult.rows.forEach(r => {
      const start = new Date(r.fecha_inicio);
      const end = new Date(r.fecha_fin);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      totalNightsOffered += diffDays;
      uniqueGuests.add(r.guest_id);
    });

    const moneySaved = totalNightsOffered * 80000; // 80,000 COP per night average commercial rate

    res.json({
      noches_ofrecidas: totalNightsOffered,
      estudiantes_apoyados: uniqueGuests.size,
      dinero_ahorrado: moneySaved
    });
  } catch (err) {
    console.error('Error obteniendo impacto solidario:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ SAVE/UPDATE CONVIVENCIA PREFERENCES ============
router.post('/preferencias', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { preferencias } = req.body;
    if (!preferencias) {
      return res.status(400).json({ error: 'Preferencias de convivencia no proporcionadas' });
    }

    const result = await pool.query(
      `UPDATE users SET preferencias_convivencia = $1, updated_at = NOW() WHERE id = $2 RETURNING id, preferencias_convivencia`,
      [JSON.stringify(preferencias), req.user.id]
    );

    res.json({ message: 'Preferencias de convivencia actualizadas con éxito', user: result.rows[0] });
  } catch (err) {
    console.error('Error guardando preferencias:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ ACTIVIDAD Y MONITOREO DE USUARIOS ============

// 1. Heartbeat / Latido de navegación del usuario
router.post('/activity/heartbeat', async (req, res) => {
  try {
    const { ruta, dispositivo, userId: bodyUserId } = req.body || {};

    // Extraer userId desde múltiples fuentes para máxima compatibilidad móvil / proxy
    let userId = req.user?.id;

    if (!userId && req.headers['x-user-id']) {
      userId = parseInt(req.headers['x-user-id'], 10);
    }

    if (!userId && req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:stayu_admin_token|stayu_token)=([^;]+)/);
      if (match && match[1]) {
        try {
          const decoded = jwt.verify(match[1], JWT_SECRET);
          userId = decoded?.id;
        } catch (e) {}
      }
    }

    if (!userId && bodyUserId) {
      userId = parseInt(bodyUserId, 10);
    }

    if (!userId) {
      return res.json({ ok: true, status: 'guest' });
    }

    const safeRuta = typeof ruta === 'string' ? ruta.slice(0, 255) : null;
    const safeDispositivo = typeof dispositivo === 'string' ? dispositivo.slice(0, 50) : 'Escritorio';

    // Obtener rol del usuario si no viene en token
    let userRole = req.user?.role;
    if (!userRole) {
      const uCheck = await pool.query('SELECT role FROM users WHERE id = $1', [userId]);
      if (uCheck.rows.length > 0) {
        userRole = uCheck.rows[0].role;
      }
    }

    // Actualizar último acceso y ruta en users
    await pool.query(
      `UPDATE users 
       SET ultimo_acceso = NOW(), 
           ultima_ruta = COALESCE($1, ultima_ruta), 
           dispositivo = COALESCE($2, dispositivo)
       WHERE id = $3`,
      [safeRuta, safeDispositivo, userId]
    );

    // Si viene ruta y no es repetida en los últimos 2 minutos, registrar evento de navegación
    if (safeRuta) {
      const recent = await pool.query(
        `SELECT id FROM user_actividades 
         WHERE user_id = $1 AND tipo_evento = 'navegacion' AND ruta = $2 
           AND created_at >= NOW() - INTERVAL '2 minutes'
         LIMIT 1`,
        [userId, safeRuta]
      );

      if (recent.rows.length === 0) {
        let routeDesc = `Navegó a ${safeRuta}`;
        if (safeRuta === '/') routeDesc = 'Exploró la página principal';
        else if (safeRuta.startsWith('/propiedad/')) routeDesc = 'Inspeccionó detalle de alojamiento';
        else if (safeRuta === '/mis-reservas') routeDesc = 'Revisó sus reservas activas';
        else if (safeRuta === '/chat') routeDesc = 'Abrió el centro de mensajes';
        else if (safeRuta === '/quienes-somos') routeDesc = 'Consultó información institucional';
        else if (safeRuta.startsWith('/host')) routeDesc = 'Gestionó alojamientos como anfitrión';
        else if (safeRuta === '/perfil') routeDesc = 'Consultó su perfil de usuario';

        await pool.query(
          `INSERT INTO user_actividades (user_id, tipo_evento, descripcion, ruta, dispositivo, metadata)
           VALUES ($1, 'navegacion', $2, $3, $4, $5)`,
          [userId, routeDesc, safeRuta, safeDispositivo, JSON.stringify({ rol: userRole || 'usuario' })]
        );
      }
    }

    res.json({ ok: true, userId });
  } catch (err) {
    console.error('Error procesando heartbeat:', err);
    res.status(500).json({ error: 'Error procesando latido' });
  }
});

// 2. Registro de evento específico de usuario
router.post('/activity/event', async (req, res) => {
  try {
    const { tipo_evento, descripcion, ruta, metadata, dispositivo, userId: bodyUserId } = req.body || {};
    if (!tipo_evento || !descripcion) {
      return res.status(400).json({ error: 'tipo_evento y descripcion son obligatorios' });
    }

    let userId = req.user?.id || (req.headers['x-user-id'] ? parseInt(req.headers['x-user-id'], 10) : null) || (bodyUserId ? parseInt(bodyUserId, 10) : null);
    const safeDispositivo = dispositivo || (userId ? 'Escritorio' : 'Invitado');

    await pool.query(
      `INSERT INTO user_actividades (user_id, tipo_evento, descripcion, ruta, dispositivo, metadata)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, tipo_evento, descripcion, ruta || null, safeDispositivo, JSON.stringify(metadata || {})]
    );

    if (userId) {
      await pool.query(
        `UPDATE users SET ultimo_acceso = NOW(), ultima_ruta = COALESCE($1, ultima_ruta) WHERE id = $2`,
        [ruta || null, userId]
      );
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('Error registrando evento de actividad:', err);
    res.status(500).json({ error: 'Error registrando actividad' });
  }
});

// 3. ADMIN: Resumen de actividad e interacciones
router.get('/admin/actividad/resumen', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const [onlineRes, hoyRes, totalEventosRes, rolesRes, rutasRes] = await Promise.all([
      pool.query(`SELECT COUNT(*) as count FROM users WHERE ultimo_acceso >= NOW() - INTERVAL '15 minutes'`),
      pool.query(`SELECT COUNT(DISTINCT id) as count FROM users WHERE DATE(ultimo_acceso) = CURRENT_DATE`),
      pool.query(`SELECT COUNT(*) as count FROM user_actividades WHERE DATE(created_at) = CURRENT_DATE`),
      pool.query(`
        SELECT role, COUNT(*) as count 
        FROM users 
        WHERE ultimo_acceso >= NOW() - INTERVAL '24 hours' 
        GROUP BY role
      `),
      pool.query(`
        SELECT COALESCE(ruta, 'General') as ruta, COUNT(*) as visitas 
        FROM user_actividades 
        WHERE ruta IS NOT NULL AND created_at >= NOW() - INTERVAL '24 hours'
        GROUP BY ruta 
        ORDER BY visitas DESC 
        LIMIT 5
      `)
    ]);

    const rolesMap = { estudiante: 0, anfitrion: 0, admin: 0 };
    rolesRes.rows.forEach(r => {
      if (rolesMap[r.role] !== undefined) {
        rolesMap[r.role] = parseInt(r.count, 10);
      }
    });

    res.json({
      usuarios_online: parseInt(onlineRes.rows[0].count, 10) || 0,
      activos_hoy: parseInt(hoyRes.rows[0].count, 10) || 0,
      interacciones_hoy: parseInt(totalEventosRes.rows[0].count, 10) || 0,
      desglose_roles: rolesMap,
      rutas_populares: rutasRes.rows
    });
  } catch (err) {
    console.error('Error obteniendo resumen de actividad admin:', err);
    res.status(500).json({ error: 'Error obteniendo resumen de actividad' });
  }
});

// 4. ADMIN: Lista de usuarios conectados y recientes
router.get('/admin/actividad/usuarios-online', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const result = await pool.query(`
      SELECT 
        u.id, 
        u.email, 
        u.nombre, 
        u.apellido, 
        u.role, 
        u.campus, 
        u.foto_perfil, 
        u.ultimo_acceso, 
        u.ultima_ruta, 
        u.dispositivo, 
        u.verificado, 
        u.bloqueado,
        (u.ultimo_acceso >= NOW() - INTERVAL '15 minutes') as is_online,
        COALESCE(
          (SELECT descripcion FROM user_actividades WHERE user_id = u.id ORDER BY created_at DESC LIMIT 1),
          'Actividad en plataforma'
        ) as ultima_accion
      FROM users u
      ORDER BY is_online DESC, u.ultimo_acceso DESC NULLS LAST
      LIMIT 100
    `);

    res.json(result.rows);
  } catch (err) {
    console.error('Error listando usuarios online admin:', err);
    res.status(500).json({ error: 'Error obteniendo usuarios en línea' });
  }
});

// 5. ADMIN: Feed cronológico de actividades en tiempo real
router.get('/admin/actividad/feed', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const limit = parseInt(req.query.limit, 10) || 60;
    const filterTipo = req.query.tipo;

    let query = `
      SELECT 
        a.id,
        a.tipo_evento,
        a.descripcion,
        a.ruta,
        a.dispositivo,
        a.metadata,
        a.created_at,
        u.id as user_id,
        u.nombre,
        u.apellido,
        u.email,
        u.role,
        u.foto_perfil,
        u.campus,
        (u.ultimo_acceso >= NOW() - INTERVAL '15 minutes') as is_online
      FROM user_actividades a
      LEFT JOIN users u ON a.user_id = u.id
    `;

    const params = [];
    if (filterTipo && filterTipo !== 'todos') {
      params.push(filterTipo);
      query += ` WHERE a.tipo_evento = $1 `;
    }

    query += ` ORDER BY a.created_at DESC LIMIT $${params.length + 1} `;
    params.push(limit);

    const result = await pool.query(query, params);

    // Si hay muy pocos registros sinteticemos con eventos reales de base de datos
    if (result.rows.length < 5 && (!filterTipo || filterTipo === 'todos')) {
      const syntheticEvents = await pool.query(`
        SELECT * FROM (
          SELECT 
            'reserva' as tipo_evento,
            CONCAT('Solicitó reserva para la propiedad #', r.propiedad_id) as descripcion,
            CONCAT('/propiedad/', r.propiedad_id) as ruta,
            'Escritorio' as dispositivo,
            json_build_object('reserva_id', r.id, 'estado', r.estado) as metadata,
            r.created_at,
            u.id as user_id, u.nombre, u.apellido, u.email, u.role, u.foto_perfil, u.campus,
            (u.ultimo_acceso >= NOW() - INTERVAL '15 minutes') as is_online
          FROM reservas r
          JOIN users u ON r.estudiante_id = u.id

          UNION ALL

          SELECT 
            'propiedad' as tipo_evento,
            CONCAT('Publicó el inmueble: "', p.titulo, '"') as descripcion,
            CONCAT('/propiedad/', p.id) as ruta,
            'Escritorio' as dispositivo,
            json_build_object('propiedad_id', p.id, 'precio', p.precio_mensual) as metadata,
            p.created_at,
            u.id as user_id, u.nombre, u.apellido, u.email, u.role, u.foto_perfil, u.campus,
            (u.ultimo_acceso >= NOW() - INTERVAL '15 minutes') as is_online
          FROM propiedades p
          JOIN users u ON p.anfitrion_id = u.id

          UNION ALL

          SELECT 
            'registro' as tipo_evento,
            CONCAT('Se registró en la plataforma como ', u.role) as descripcion,
            '/registro' as ruta,
            'Escritorio' as dispositivo,
            json_build_object('campus', u.campus) as metadata,
            u.created_at,
            u.id as user_id, u.nombre, u.apellido, u.email, u.role, u.foto_perfil, u.campus,
            (u.ultimo_acceso >= NOW() - INTERVAL '15 minutes') as is_online
          FROM users u
          WHERE u.created_at IS NOT NULL
        ) all_events
        ORDER BY created_at DESC
        LIMIT 40
      `);

      const combined = [...result.rows];
      const existingDates = new Set(combined.map(c => new Date(c.created_at).getTime()));
      for (const item of syntheticEvents.rows) {
        if (!existingDates.has(new Date(item.created_at).getTime())) {
          combined.push({
            id: `legacy-${item.user_id}-${new Date(item.created_at).getTime()}`,
            ...item
          });
        }
      }
      combined.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      return res.json(combined.slice(0, limit));
    }

    res.json(result.rows);
  } catch (err) {
    console.error('Error obteniendo feed de actividad admin:', err);
    res.status(500).json({ error: 'Error obteniendo feed de actividad' });
  }
});

// 6. ADMIN: Historial completo de un usuario
router.get('/admin/actividad/usuario/:id', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado' });
    }

    const userId = parseInt(req.params.id, 10);
    const [userRes, actRes] = await Promise.all([
      pool.query(`
        SELECT id, nombre, apellido, email, role, campus, foto_perfil, ultimo_acceso, ultima_ruta, dispositivo, created_at,
               (ultimo_acceso >= NOW() - INTERVAL '15 minutes') as is_online
        FROM users WHERE id = $1
      `, [userId]),
      pool.query(`
        SELECT id, tipo_evento, descripcion, ruta, dispositivo, metadata, created_at
        FROM user_actividades
        WHERE user_id = $1
        ORDER BY created_at DESC
        LIMIT 50
      `, [userId])
    ]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({
      usuario: userRes.rows[0],
      actividades: actRes.rows
    });
  } catch (err) {
    console.error('Error obteniendo historial de usuario admin:', err);
    res.status(500).json({ error: 'Error obteniendo historial de usuario' });
  }
});

module.exports = router;
