const express = require('express');
const pool = require('../db');

const router = express.Router();

// ============ EMAIL con Gmail REST API (HTTP - funciona en Render) ============
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
    throw new Error(data.error_description || data.error || 'Error obteniendo access token de Gmail');
  }
  return data.access_token;
};

const sendEmail = async ({ to, subject, html }) => {
  try {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_CLIENT_ID || !process.env.GMAIL_CLIENT_SECRET || !process.env.GMAIL_REFRESH_TOKEN) {
      console.warn('[Gmail API] Variables de Gmail OAuth2 no configuradas en Bookings Service');
      return;
    }

    const accessToken = await getGmailAccessToken();
    const encodeHeader = (str) => `=?UTF-8?B?${Buffer.from(str, 'utf-8').toString('base64')}?=`;

    const rawMessage = [
      `From: ${encodeHeader('HUASI — Hospedaje Solidario UCC')} <${process.env.GMAIL_USER}>`,
      `To: ${to}`,
      `Subject: ${encodeHeader(subject)}`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      Buffer.from(html, 'utf-8').toString('base64'),
    ].join('\r\n');

    const encodedMessage = Buffer.from(rawMessage, 'utf-8').toString('base64url');

    const gmailRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: encodedMessage }),
    });

    const result = await gmailRes.json();
    if (!gmailRes.ok) {
      console.error('[Gmail Send ERROR]', JSON.stringify(result));
      throw new Error(result.error?.message || 'Error enviando email via Gmail API');
    }
    console.log(`✅ [Bookings Email] Notificación enviada a ${to}. Id: ${result.id}`);
    return result;
  } catch (err) {
    console.error('❌ [Bookings Email ERROR]:', err.message);
  }
};

// Normalizar estado de reserva
const normalizeEstadoReserva = (estado = '') => {
  const estadoLower = String(estado).toLowerCase().trim();
  if (estadoLower === 'aprobada') return 'aceptada';
  return estadoLower;
};

// ============ CREAR RESERVA ============
router.post('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { propiedad_id, fecha_inicio, fecha_fin, mensaje, evento, num_huespedes } = req.body;

    if (!propiedad_id || !fecha_inicio || !fecha_fin) {
      return res.status(400).json({ error: 'propiedad_id, fecha_inicio y fecha_fin son obligatorios' });
    }

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const partsInicio = String(fecha_inicio).split('T')[0].split('-');
    const inicio = new Date(Number(partsInicio[0]), Number(partsInicio[1]) - 1, Number(partsInicio[2]));
    inicio.setHours(0, 0, 0, 0);

    const partsFin = String(fecha_fin).split('T')[0].split('-');
    const fin = new Date(Number(partsFin[0]), Number(partsFin[1]) - 1, Number(partsFin[2]));
    fin.setHours(0, 0, 0, 0);

    if (inicio >= fin) {
      return res.status(400).json({ error: 'La fecha de inicio debe ser anterior a la fecha de fin' });
    }

    if (inicio < hoy) {
      return res.status(400).json({ error: 'No puedes reservar en fechas pasadas' });
    }

    // Verificar que la propiedad existe y está activa
    const prop = await pool.query('SELECT * FROM propiedades WHERE id = $1 AND activo = TRUE', [propiedad_id]);
    if (prop.rows.length === 0) {
      return res.status(404).json({ error: 'Propiedad no encontrada o no disponible' });
    }

    // Verificar que el usuario está verificado
    const userCheck = await pool.query('SELECT verificado FROM users WHERE id = $1', [req.user.id]);
    const isVerificado = userCheck.rows.length > 0 && userCheck.rows[0].verificado;
    if (!isVerificado) {
      return res.status(403).json({
        error: 'Debes verificar tu vinculación universitaria antes de reservar un alojamiento',
        requiere_verificacion: true
      });
    }

    // No puede reservar su propia propiedad
    if (prop.rows[0].host_id === req.user.id) {
      return res.status(400).json({ error: 'No puedes reservar tu propia propiedad' });
    }

    // Verificar capacidad
    if (num_huespedes && num_huespedes > prop.rows[0].capacidad) {
      return res.status(400).json({ error: `La propiedad tiene capacidad para ${prop.rows[0].capacidad} huéspedes` });
    }

    // Verificar que la fecha solicitada cae dentro de al menos un rango de disponibilidad definido
    const disponibilidad = await pool.query(
      `SELECT fecha_inicio, fecha_fin FROM disponibilidad
       WHERE propiedad_id = $1 AND disponible = TRUE
       ORDER BY fecha_inicio`,
      [propiedad_id]
    );

    if (disponibilidad.rows.length > 0) {
      // Normalizar todas las fechas a medianoche local para evitar desfases de zona horaria
      const normDate = (d) => {
        const s = String(d).split('T')[0];
        const [y, m, day] = s.split('-');
        const dt = new Date(Number(y), Number(m) - 1, Number(day));
        dt.setHours(0, 0, 0, 0);
        return dt;
      };
      const fechaInicioNorm = normDate(fecha_inicio);
      const fechaFinNorm = normDate(fecha_fin);
      const cubreRango = disponibilidad.rows.some((r) => {
        const rInicio = normDate(r.fecha_inicio);
        const rFin = normDate(r.fecha_fin);
        return rInicio <= fechaInicioNorm && rFin >= fechaFinNorm;
      });

      if (!cubreRango) {
        return res.status(409).json({ error: 'Las fechas solicitadas no están dentro de un rango de disponibilidad habilitado por el anfitrión' });
      }
    }

    // Verificar que no hay reservas que se solapen (aceptadas)
    const overlap = await pool.query(
      `SELECT id FROM reservas
       WHERE propiedad_id = $1 AND estado = 'aceptada'
       AND fecha_inicio < $3 AND fecha_fin > $2`,
      [propiedad_id, fecha_inicio, fecha_fin]
    );

    if (overlap.rows.length > 0) {
      return res.status(409).json({ error: 'La propiedad ya tiene una reserva confirmada en esas fechas' });
    }

    const result = await pool.query(
      `INSERT INTO reservas (propiedad_id, guest_id, fecha_inicio, fecha_fin, mensaje, evento, num_huespedes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [propiedad_id, req.user.id, fecha_inicio, fecha_fin, mensaje || null, evento || null, num_huespedes || 1]
    );

    const reserva = result.rows[0];

    // Enviar correo de notificación al anfitrión
    try {
      const hostQuery = await pool.query('SELECT email, nombre, apellido FROM users WHERE id = $1', [prop.rows[0].host_id]);
      const guestQuery = await pool.query('SELECT nombre, apellido FROM users WHERE id = $1', [req.user.id]);
      const host = hostQuery.rows[0];
      const guest = guestQuery.rows[0];

      await sendEmail({
        to: host.email,
        subject: 'Nueva solicitud de alojamiento - HUASI',
        html: `<h3>Hola ${host.nombre},</h3>
               <p>Has recibido una nueva solicitud de alojamiento para tu propiedad <strong>"${prop.rows[0].titulo}"</strong> por parte de <strong>${guest.nombre} ${guest.apellido}</strong>.</p>
               <p><strong>Fechas:</strong> del ${fecha_inicio} al ${fecha_fin}</p>
               <p><strong>Mensaje:</strong> "${mensaje || 'Sin mensaje'}"</p>
               <p>Por favor, ingresa al panel de HUASI para aprobar o rechazar esta solicitud.</p>`
      });
      console.log(`Notificación de nueva reserva enviada al host (${host.email}) exitosamente.`);
    } catch (mailErr) {
      console.error('Error enviando correo de notificación de reserva:', mailErr);
    }

    // --- INTEGRACIÓN CON CHAT ---
    try {
      const hostId = prop.rows[0].host_id;
      const textoDetalle = (mensaje && mensaje.trim()) ? mensaje.trim() : 'Hola, me gustaría hospedarme en tu alojamiento.';
      
      let convResult = await pool.query(`
        SELECT id FROM conversaciones 
        WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)
      `, [req.user.id, hostId]);

      let conversacionId;
      if (convResult.rows.length === 0) {
        const newConv = await pool.query(
          'INSERT INTO conversaciones (user1_id, user2_id) VALUES ($1, $2) RETURNING id',
          [req.user.id, hostId]
        );
        conversacionId = newConv.rows[0].id;
      } else {
        conversacionId = convResult.rows[0].id;
      }

      await pool.query(
        `INSERT INTO mensajes (conversacion_id, sender_id, contenido)
         VALUES ($1, $2, $3)`,
        [conversacionId, req.user.id, `SOLICITUD DE RESERVA (${fecha_inicio} a ${fecha_fin}): ${textoDetalle}`]
      );

      await pool.query('UPDATE conversaciones SET updated_at = NOW() WHERE id = $1', [conversacionId]);
    } catch (chatErr) {
      console.error('Error al crear chat automático tras reserva:', chatErr);
    }

    res.status(201).json({ ...reserva, host_id: prop.rows[0].host_id });
  } catch (err) {
    console.error('Error creando reserva:', err);
    res.status(500).json({ error: err.message || 'Error interno del servidor' });
  }
});

// ============ MIS RESERVAS (como guest) ============
router.get('/mis', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const result = await pool.query(
      `SELECT r.*, p.titulo, p.direccion, p.barrio, p.tipo AS tipo_propiedad, p.fotos, p.host_id,
              u.nombre AS host_nombre, u.apellido AS host_apellido
       FROM reservas r
       JOIN propiedades p ON r.propiedad_id = p.id
       JOIN users u ON p.host_id = u.id
       WHERE r.guest_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error listando mis reservas:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ RESERVAS PARA HOST ============
router.get('/host', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const result = await pool.query(
      `SELECT r.*, p.titulo, p.direccion, p.fotos,
              u.nombre AS guest_nombre, u.apellido AS guest_apellido,
              u.email AS guest_email, u.telefono AS guest_telefono,
              u.verificado AS guest_verificado,
              v.universidad AS guest_universidad, v.tipo AS guest_tipo_vinculo
       FROM reservas r
       JOIN propiedades p ON r.propiedad_id = p.id
       JOIN users u ON r.guest_id = u.id
       LEFT JOIN verificaciones v ON v.user_id = u.id AND v.estado = 'aprobado'
       WHERE p.host_id = $1
       ORDER BY
         CASE r.estado WHEN 'pendiente' THEN 0 ELSE 1 END,
         r.created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error listando reservas host:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ ACTUALIZAR ESTADO DE RESERVA ============
router.patch('/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { id } = req.params;
    const { estado } = req.body;

    const estadoNormalizado = normalizeEstadoReserva(estado);

    if (!['aceptada', 'rechazada', 'cancelada', 'completada'].includes(estadoNormalizado)) {
      return res.status(400).json({ error: 'Estado inválido' });
    }

    // Obtener la reserva
    const reserva = await pool.query(
      `SELECT r.*, p.host_id, p.titulo AS propiedad_titulo, p.es_pago, p.soles_por_noche FROM reservas r
       JOIN propiedades p ON r.propiedad_id = p.id
       WHERE r.id = $1`,
      [id]
    );

    if (reserva.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }

    const res_data = reserva.rows[0];

    // Permisos: host puede aceptar/rechazar, guest puede cancelar
    if (['aceptada', 'rechazada'].includes(estadoNormalizado) && res_data.host_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo el anfitrión puede aceptar o rechazar' });
    }
    if (estadoNormalizado === 'cancelada' && res_data.guest_id !== req.user.id && res_data.host_id !== req.user.id) {
      return res.status(403).json({ error: 'No tienes permiso para cancelar esta reserva' });
    }

    const result = await pool.query(
      `UPDATE reservas SET estado = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
      [estadoNormalizado, id]
    );

    const updatedRes = result.rows[0];

    // Archivar publicación automáticamente si se acepta
    if (estadoNormalizado === 'aceptada') {
      await pool.query(`UPDATE propiedades SET activo = FALSE WHERE id = $1`, [res_data.propiedad_id]);
    }

    // Enviar correo de notificación por cambio de estado
    try {
      const guestQuery = await pool.query('SELECT email, nombre FROM users WHERE id = $1', [updatedRes.guest_id]);
      const hostQuery = await pool.query('SELECT email, nombre, apellido FROM users WHERE id = $1', [res_data.host_id]);
      
      const guest = guestQuery.rows[0];
      const host = hostQuery.rows[0];

      if (['aceptada', 'rechazada'].includes(estadoNormalizado)) {
        if (guest && guest.email) {
          await sendEmail({
            to: guest.email,
            subject: `Tu solicitud de alojamiento fue ${estadoNormalizado === 'aceptada' ? 'aceptada' : 'rechazada'} - HUASI`,
            html: `<h3>Hola ${guest.nombre},</h3>
                   <p>Tu solicitud para hospedarte en <strong>"${res_data.propiedad_titulo || 'alojamiento'}"</strong> ha sido <strong>${estadoNormalizado === 'aceptada' ? 'ACEPTADA' : 'RECHAZADA'}</strong> por el anfitrión <strong>${host.nombre} ${host.apellido}</strong>.</p>
                   <p><strong>Fechas:</strong> del ${res_data.fecha_inicio.toISOString().split('T')[0]} al ${res_data.fecha_fin.toISOString().split('T')[0]}</p>
                   <p>${estadoNormalizado === 'aceptada' ? '<strong>¡Disfruta tu estadía!</strong>' : 'Te invitamos a buscar otros alojamientos disponibles.'}</p>`
          });
          console.log('Notificación de cambio de estado enviada al guest.');
        }
      } else if (estadoNormalizado === 'cancelada') {
        const esGuest = req.user.id === updatedRes.guest_id;
        const destinatarioEmail = esGuest ? host.email : guest.email;
        const destinatarioNombre = esGuest ? host.nombre : guest.nombre;
        const rolCancelador = esGuest ? 'el huésped' : 'el anfitrión';
        
        if (destinatarioEmail) {
          await sendEmail({
            to: destinatarioEmail,
            subject: 'Reserva cancelada - HUASI',
            html: `<h3>Hola ${destinatarioNombre},</h3>
                   <p>Te informamos que la reserva para la propiedad <strong>"${res_data.propiedad_titulo || 'alojamiento'}"</strong> (fechas: del ${res_data.fecha_inicio.toISOString().split('T')[0]} al ${res_data.fecha_fin.toISOString().split('T')[0]}) ha sido <strong>cancelada</strong> por <strong>${rolCancelador}</strong>.</p>`
          });
          console.log('Notificación de cancelación enviada.');
        }
      }
    } catch (mailErr) {
      console.error('Error enviando correo de cambio de estado de reserva:', mailErr);
    }

    res.json(updatedRes);
  } catch (err) {
    console.error('Error actualizando reserva:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// New route for chat commands (accept, reject, archive)
router.post('/chat/command', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }
    const { reservationId, action } = req.body;
    if (!reservationId || !action) {
      return res.status(400).json({ error: 'reservationId y action son requeridos' });
    }

    // Load reservation and related property
    const reservaResult = await pool.query(
      `SELECT r.*, p.host_id, p.titulo AS propiedad_titulo, p.activo, p.id AS propiedad_id, r.guest_id, p.es_pago, p.soles_por_noche
       FROM reservas r
       JOIN propiedades p ON r.propiedad_id = p.id
       WHERE r.id = $1`,
      [reservationId]
    );
    if (reservaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Reserva no encontrada' });
    }
    const reserva = reservaResult.rows[0];

    // Only the host may accept/reject or archive
    if (reserva.host_id !== req.user.id) {
      return res.status(403).json({ error: 'Solo el anfitrión puede ejecutar esta acción' });
    }

    let updated;
    if (action === 'aceptar' || action === 'rechazar') {
      const nuevoEstado = action === 'aceptar' ? 'aceptada' : 'rechazada';
      const result = await pool.query(
        `UPDATE reservas SET estado = $1, updated_at = NOW() WHERE id = $2 RETURNING *`,
        [nuevoEstado, reservationId]
      );
      updated = result.rows[0];

      // Archivar publicación automáticamente si se acepta
      if (action === 'aceptar') {
        await pool.query(`UPDATE propiedades SET activo = FALSE WHERE id = $1`, [reserva.propiedad_id]);
      }

      // Enviar correo de notificación
      try {
        const guestQuery = await pool.query('SELECT email, nombre FROM users WHERE id = $1', [reserva.guest_id]);
        const hostQuery = await pool.query('SELECT email, nombre, apellido FROM users WHERE id = $1', [reserva.host_id]);
        const guest = guestQuery.rows[0];
        const host = hostQuery.rows[0];

        if (guest && guest.email) {
          await sendEmail({
            to: guest.email,
            subject: `Tu solicitud de alojamiento fue ${nuevoEstado === 'aceptada' ? 'aceptada' : 'rechazada'} - HUASI`,
            html: `<h3>Hola ${guest.nombre},</h3>
                   <p>Tu solicitud para hospedarte en <strong>"${reserva.propiedad_titulo || 'alojamiento'}"</strong> ha sido <strong>${nuevoEstado === 'aceptada' ? 'ACEPTADA' : 'RECHAZADA'}</strong> por el anfitrión <strong>${host.nombre} ${host.apellido}</strong>.</p>
                   <p>${nuevoEstado === 'aceptada' ? '<strong>¡Disfruta tu estadía!</strong>' : 'Te invitamos a buscar otros alojamientos disponibles.'}</p>`
          });
          console.log(`Notificación de cambio de estado enviada al guest (${guest.email}).`);
        }
      } catch (mailErr) {
        console.error('Error enviando correo de cambio de estado de reserva desde chat:', mailErr);
      }
    } else if (action === 'archivar') {
      // Archive the property
      await pool.query(`UPDATE propiedades SET activo = FALSE WHERE id = $1`, [reserva.propiedad_id]);
      updated = { archived: true };
    } else {
      return res.status(400).json({ error: 'Acción no válida' });
    }

    // Insert system message into conversation
    try {
      // Find or create conversation between host and guest
      const convRes = await pool.query(
        `SELECT id FROM conversaciones
         WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)`,
        [reserva.host_id, reserva.guest_id]
      );
      let conversacionId;
      if (convRes.rows.length === 0) {
        const newConv = await pool.query(
          'INSERT INTO conversaciones (user1_id, user2_id) VALUES ($1, $2) RETURNING id',
          [reserva.host_id, reserva.guest_id]
        );
        conversacionId = newConv.rows[0].id;
      } else {
        conversacionId = convRes.rows[0].id;
      }

      let contenido;
      if (action === 'aceptar') {
        contenido = `✅ Reserva aceptada por el anfitrión.`;
      } else if (action === 'rechazar') {
        contenido = `❌ Reserva rechazada por el anfitrión.`;
      } else if (action === 'archivar') {
        contenido = `📦 Publicación archivada por el anfitrión.`;
      }

      await pool.query(
        `INSERT INTO mensajes (conversacion_id, sender_id, contenido) VALUES ($1, $2, $3)`,
        [conversacionId, reserva.host_id, contenido]
      );
      await pool.query('UPDATE conversaciones SET updated_at = NOW() WHERE id = $1', [conversacionId]);
    } catch (msgErr) {
      console.error('Error creando mensaje del chat:', msgErr);
    }

    res.json(updated);
  } catch (err) {
    console.error('Error en chat/command:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
