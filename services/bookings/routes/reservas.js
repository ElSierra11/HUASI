const express = require('express');
const pool = require('../db');
const nodemailer = require('nodemailer');

const router = express.Router();

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

    if (new Date(fecha_inicio) >= new Date(fecha_fin)) {
      return res.status(400).json({ error: 'La fecha de inicio debe ser anterior a la fecha de fin' });
    }

    // Permitir reserva para el día de hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const inicio = new Date(fecha_inicio);
    inicio.setHours(0, 0, 0, 0);
    if (inicio < hoy) {
      return res.status(400).json({ error: 'No puedes reservar en fechas pasadas' });
    }

    // Verificar que la propiedad existe y está activa
    const prop = await pool.query('SELECT * FROM propiedades WHERE id = $1 AND activo = TRUE', [propiedad_id]);
    if (prop.rows.length === 0) {
      return res.status(404).json({ error: 'Propiedad no encontrada o no disponible' });
    }

    // Verificar que el usuario está verificado y tiene soles suficientes si la propiedad es solidaria (gratuita)
    if (!prop.rows[0].es_pago) {
      const userCheck = await pool.query('SELECT verificado, soles_balance FROM users WHERE id = $1', [req.user.id]);
      const isVerificado = userCheck.rows.length > 0 && userCheck.rows[0].verificado;
      if (!isVerificado) {
        return res.status(403).json({
          error: 'Debes verificar tu vinculación universitaria antes de reservar un alojamiento solidario',
          requiere_verificacion: true
        });
      }

      // Calcular soles requeridos
      const start = new Date(fecha_inicio);
      const end = new Date(fecha_fin);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      const solesPorNoche = prop.rows[0].soles_por_noche || 50;
      const totalSoles = diffDays * solesPorNoche;

      const currentBalance = userCheck.rows.length > 0 ? userCheck.rows[0].soles_balance : 0;
      if (currentBalance < totalSoles) {
        return res.status(400).json({
          error: `Saldo de soles insuficiente. Necesitas ${totalSoles} soles (tienes ${currentBalance} soles). Puedes obtener soles hospedando a otros estudiantes en tu casa.`
        });
      }
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
      const fechaInicio = new Date(fecha_inicio);
      const fechaFin = new Date(fecha_fin);
      const cubreRango = disponibilidad.rows.some((r) => {
        const inicio = new Date(r.fecha_inicio);
        const fin = new Date(r.fecha_fin);
        return inicio <= fechaInicio && fin >= fechaFin;
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

      const info = await transporter.sendMail({
        from: `"HUASI - Universidad Cooperativa" <${process.env.SMTP_USER}>`,
        to: host.email,
        subject: 'Nueva solicitud de alojamiento - HUASI',
        text: `Hola ${host.nombre},\n\nHas recibido una nueva solicitud de alojamiento para tu propiedad "${prop.rows[0].titulo}" por parte de ${guest.nombre} ${guest.apellido}.\n\nFechas: del ${fecha_inicio} al ${fecha_fin}.\nMensaje: "${mensaje || 'Sin mensaje'}"\n\nInicia sesión en la plataforma para responder a esta solicitud.\n\nAtentamente,\nEl equipo de HUASI`,
        html: `<h3>Hola ${host.nombre},</h3>
               <p>Has recibido una nueva solicitud de alojamiento para tu propiedad <strong>"${prop.rows[0].titulo}"</strong> por parte de <strong>${guest.nombre} ${guest.apellido}</strong>.</p>
               <p><strong>Fechas:</strong> del ${fecha_inicio} al ${fecha_fin}</p>
               <p><strong>Mensaje:</strong> "${mensaje || 'Sin mensaje'}"</p>
               <p>Por favor, ingresa al panel de HUASI para aprobar o rechazar esta solicitud.</p>`
      });
      console.log(`Notificación de nueva reserva enviada al host (${host.email}) exitosamente.`);
      console.log('Ethereal URL (si aplica):', nodemailer.getTestMessageUrl(info));
    } catch (mailErr) {
      console.error('Error enviando correo de notificación de reserva:', mailErr);
    }

    // --- INTEGRACIÓN CON CHAT ---
    // Si hay un mensaje, crear conversación y enviarlo al chat automáticamente
    if (mensaje && mensaje.trim()) {
      try {
        const hostId = prop.rows[0].host_id;
        
        // 1. Obtener o crear conversación
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

        // 2. Insertar el mensaje de la reserva en el chat
        await pool.query(
          `INSERT INTO mensajes (conversacion_id, sender_id, contenido)
           VALUES ($1, $2, $3)`,
          [conversacionId, req.user.id, `SOLICITUD DE RESERVA (${fecha_inicio} a ${fecha_fin}): ${mensaje}`]
        );

        // Actualizar timestamp de la conversación
        await pool.query('UPDATE conversaciones SET updated_at = NOW() WHERE id = $1', [conversacionId]);
      } catch (chatErr) {
        console.error('Error al crear chat automático tras reserva:', chatErr);
        // No bloqueamos la respuesta de la reserva si el chat falla
      }
    }

    res.status(201).json({ ...reserva, host_id: prop.rows[0].host_id });
  } catch (err) {
    console.error('Error creando reserva:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
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

      // Transferir soles si la propiedad es solidaria
      if (!res_data.es_pago) {
        try {
          const start = new Date(res_data.fecha_inicio);
          const end = new Date(res_data.fecha_fin);
          const diffTime = Math.abs(end - start);
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const solesPorNoche = res_data.soles_por_noche || 50;
          const totalSoles = diffDays * solesPorNoche;

          // Descontar al huésped
          await pool.query(
            "UPDATE users SET soles_balance = soles_balance - $1 WHERE id = $2",
            [totalSoles, res_data.guest_id]
          );
          // Abonar al anfitrión
          await pool.query(
            "UPDATE users SET soles_balance = soles_balance + $1 WHERE id = $2",
            [totalSoles, res_data.host_id]
          );

          // Registrar transacciones
          await pool.query(
            "INSERT INTO soles_transacciones (user_id, reserva_id, cantidad, motivo) VALUES ($1, $2, $3, 'hospedaje_gasto')",
            [res_data.guest_id, id, -totalSoles]
          );
          await pool.query(
            "INSERT INTO soles_transacciones (user_id, reserva_id, cantidad, motivo) VALUES ($1, $2, $3, 'hospedaje_ganancia')",
            [res_data.host_id, id, totalSoles]
          );
          console.log(`[Soles] Transferidos ${totalSoles} soles de ${res_data.guest_id} a ${res_data.host_id} por reserva ${id}`);
        } catch (solesErr) {
          console.error('Error al transferir soles:', solesErr);
        }
      }
    }

    // Devolución/Reembolso de soles si se cancela una reserva que ya estaba aceptada
    if (estadoNormalizado === 'cancelada' && res_data.estado === 'aceptada' && !res_data.es_pago) {
      try {
        const start = new Date(res_data.fecha_inicio);
        const end = new Date(res_data.fecha_fin);
        const diffTime = Math.abs(end - start);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const solesPorNoche = res_data.soles_por_noche || 50;
        const totalSoles = diffDays * solesPorNoche;

        // Devolver al huésped
        await pool.query(
          "UPDATE users SET soles_balance = soles_balance + $1 WHERE id = $2",
          [totalSoles, res_data.guest_id]
        );
        // Descontar al anfitrión
        await pool.query(
          "UPDATE users SET soles_balance = soles_balance - $1 WHERE id = $2",
          [totalSoles, res_data.host_id]
        );

        // Registrar transacciones de reembolso
        await pool.query(
          "INSERT INTO soles_transacciones (user_id, reserva_id, cantidad, motivo) VALUES ($1, $2, $3, 'hospedaje_reembolso')",
          [res_data.guest_id, id, totalSoles]
        );
        await pool.query(
          "INSERT INTO soles_transacciones (user_id, reserva_id, cantidad, motivo) VALUES ($1, $2, $3, 'hospedaje_devolucion')",
          [res_data.host_id, id, -totalSoles]
        );
        console.log(`[Soles] Reembolsados ${totalSoles} soles de ${res_data.host_id} a ${res_data.guest_id} por cancelación de reserva ${id}`);
      } catch (solesErr) {
        console.error('Error al reembolsar soles:', solesErr);
      }
    }

    // Enviar correo de notificación por cambio de estado
    try {
      const guestQuery = await pool.query('SELECT email, nombre FROM users WHERE id = $1', [updatedRes.guest_id]);
      const hostQuery = await pool.query('SELECT email, nombre, apellido FROM users WHERE id = $1', [res_data.host_id]);
      
      const guest = guestQuery.rows[0];
      const host = hostQuery.rows[0];

      if (['aceptada', 'rechazada'].includes(estadoNormalizado)) {
        if (guest && guest.email) {
          const info = await transporter.sendMail({
            from: `"HUASI - Universidad Cooperativa" <${process.env.SMTP_USER}>`,
            to: guest.email,
            subject: `Tu solicitud de alojamiento fue ${estadoNormalizado === 'aceptada' ? 'aceptada' : 'rechazada'} - HUASI`,
            text: `Hola ${guest.nombre},\n\nTu solicitud para hospedarte en "${res_data.propiedad_titulo || 'alojamiento'}" del ${res_data.fecha_inicio.toISOString().split('T')[0]} al ${res_data.fecha_fin.toISOString().split('T')[0]} ha sido ${estadoNormalizado === 'aceptada' ? 'ACEPTADA' : 'RECHAZADA'} por el anfitrión ${host.nombre} ${host.apellido}.\n\n${estadoNormalizado === 'aceptada' ? '¡Disfruta tu estadía!' : 'Te invitamos a buscar otros alojamientos disponibles.'}\n\nAtentamente,\nEl equipo de HUASI`,
            html: `<h3>Hola ${guest.nombre},</h3>
                   <p>Tu solicitud para hospedarte en <strong>"${res_data.propiedad_titulo || 'alojamiento'}"</strong> ha sido <strong>${estadoNormalizado === 'aceptada' ? 'ACEPTADA' : 'RECHAZADA'}</strong> por el anfitrión <strong>${host.nombre} ${host.apellido}</strong>.</p>
                   <p><strong>Fechas:</strong> del ${res_data.fecha_inicio.toISOString().split('T')[0]} al ${res_data.fecha_fin.toISOString().split('T')[0]}</p>
                   <p>${estadoNormalizado === 'aceptada' ? '<strong>¡Disfruta tu estadía!</strong>' : 'Te invitamos a buscar otros alojamientos disponibles.'}</p>`
          });
          console.log('Notificación de cambio de estado enviada al guest. Ethereal URL:', nodemailer.getTestMessageUrl(info));
        }
      } else if (estadoNormalizado === 'cancelada') {
        const esGuest = req.user.id === updatedRes.guest_id;
        const destinatarioEmail = esGuest ? host.email : guest.email;
        const destinatarioNombre = esGuest ? host.nombre : guest.nombre;
        const rolCancelador = esGuest ? 'el huésped' : 'el anfitrión';
        
        if (destinatarioEmail) {
          const info = await transporter.sendMail({
            from: `"HUASI - Universidad Cooperativa" <${process.env.SMTP_USER}>`,
            to: destinatarioEmail,
            subject: 'Reserva cancelada - HUASI',
            text: `Hola ${destinatarioNombre},\n\nTe informamos que la reserva para la propiedad "${res_data.propiedad_titulo || 'alojamiento'}" (fechas del ${res_data.fecha_inicio.toISOString().split('T')[0]} al ${res_data.fecha_fin.toISOString().split('T')[0]}) ha sido cancelada por ${rolCancelador}.\n\nAtentamente,\nEl equipo de HUASI`,
            html: `<h3>Hola ${destinatarioNombre},</h3>
                   <p>Te informamos que la reserva para la propiedad <strong>"${res_data.propiedad_titulo || 'alojamiento'}"</strong> (fechas: del ${res_data.fecha_inicio.toISOString().split('T')[0]} al ${res_data.fecha_fin.toISOString().split('T')[0]}) ha sido <strong>cancelada</strong> por <strong>${rolCancelador}</strong>.</p>`
          });
          console.log('Notificación de cancelación de reserva enviada. Ethereal URL:', nodemailer.getTestMessageUrl(info));
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

        // Transferir soles si la propiedad es solidaria
        if (!reserva.es_pago) {
          try {
            const start = new Date(reserva.fecha_inicio);
            const end = new Date(reserva.fecha_fin);
            const diffTime = Math.abs(end - start);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const solesPorNoche = reserva.soles_por_noche || 50;
            const totalSoles = diffDays * solesPorNoche;

            // Descontar al huésped
            await pool.query(
              "UPDATE users SET soles_balance = soles_balance - $1 WHERE id = $2",
              [totalSoles, reserva.guest_id]
            );
            // Abonar al anfitrión
            await pool.query(
              "UPDATE users SET soles_balance = soles_balance + $1 WHERE id = $2",
              [totalSoles, reserva.host_id]
            );

            // Registrar transacciones
            await pool.query(
              "INSERT INTO soles_transacciones (user_id, reserva_id, cantidad, motivo) VALUES ($1, $2, $3, 'hospedaje_gasto')",
              [reserva.guest_id, reservationId, -totalSoles]
            );
            await pool.query(
              "INSERT INTO soles_transacciones (user_id, reserva_id, cantidad, motivo) VALUES ($1, $2, $3, 'hospedaje_ganancia')",
              [reserva.host_id, reservationId, totalSoles]
            );
            console.log(`[Soles Chat] Transferidos ${totalSoles} soles de ${reserva.guest_id} a ${reserva.host_id} por reserva ${reservationId}`);
          } catch (solesErr) {
            console.error('Error al transferir soles por chat command:', solesErr);
          }
        }
      }

      // Enviar correo de notificación
      try {
        const guestQuery = await pool.query('SELECT email, nombre FROM users WHERE id = $1', [reserva.guest_id]);
        const hostQuery = await pool.query('SELECT email, nombre, apellido FROM users WHERE id = $1', [reserva.host_id]);
        const guest = guestQuery.rows[0];
        const host = hostQuery.rows[0];

        if (guest && guest.email) {
          const info = await transporter.sendMail({
            from: `"HUASI - Universidad Cooperativa" <${process.env.SMTP_USER}>`,
            to: guest.email,
            subject: `Tu solicitud de alojamiento fue ${nuevoEstado === 'aceptada' ? 'aceptada' : 'rechazada'} - HUASI`,
            text: `Hola ${guest.nombre},\n\nTu solicitud para hospedarte en "${reserva.propiedad_titulo || 'alojamiento'}" ha sido ${nuevoEstado === 'aceptada' ? 'ACEPTADA' : 'RECHAZADA'} por el anfitrión ${host.nombre} ${host.apellido}.\n\n${nuevoEstado === 'aceptada' ? '¡Disfruta tu estadía!' : 'Te invitamos a buscar otros alojamientos disponibles.'}\n\nAtentamente,\nEl equipo de HUASI`,
            html: `<h3>Hola ${guest.nombre},</h3>
                   <p>Tu solicitud para hospedarte en <strong>"${reserva.propiedad_titulo || 'alojamiento'}"</strong> ha sido <strong>${nuevoEstado === 'aceptada' ? 'ACEPTADA' : 'RECHAZADA'}</strong> por el anfitrión <strong>${host.nombre} ${host.apellido}</strong>.</p>
                   <p>${nuevoEstado === 'aceptada' ? '<strong>¡Disfruta tu estadía!</strong>' : 'Te invitamos a buscar otros alojamientos disponibles.'}</p>`
          });
          console.log(`Notificación de cambio de estado enviada exitosamente al guest (${guest.email}).`);
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
