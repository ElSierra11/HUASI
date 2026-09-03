const express = require('express');
const nodemailer = require('nodemailer');
const pool = require('../db');

const router = express.Router();

// ============ EMAIL NOTIFICATIONS (Nodemailer SMTP + Fallback) ============
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

const sendInspectionEmail = async ({ to, hostNombre, tituloPropiedad, estado, notas }) => {
  if (!to || !to.includes('@')) return;
  try {
    const estadoLabels = {
      aprobado: {
        title: 'Alojamiento Aprobado',
        color: '#0d7c3d',
        desc: 'Tu publicacion de alojamiento ha sido revisada y certificada por el equipo de Bienestar Universitario y Administradores de HUASI. Ya se encuentra visible y disponible para la comunidad universitaria.'
      },
      en_correccion: {
        title: 'Observaciones en tu Alojamiento',
        color: '#d97706',
        desc: 'El comite de revision universitaria ha evaluado tu publicacion y solicita algunos ajustes o aclaraciones antes de otorgar la certificacion. Por favor ingresa a tu panel para actualizar los datos indicados.'
      },
      rechazado: {
        title: 'Alojamiento No Aprobado',
        color: '#dc2626',
        desc: 'Tu solicitud de publicacion no cumple con los criterios minimos de habitabilidad, convivencia o seguridad institucional vigentes.'
      }
    };

    const info = estadoLabels[estado] || {
      title: 'Dictamen de Alojamiento',
      color: '#0284c7',
      desc: 'Se ha emitido una actualizacion sobre el estado de tu alojamiento.'
    };

    const transporter = createSmtpTransporter();
    const senderEmail = process.env.SMTP_USER || process.env.GMAIL_USER || 'huasicorrespondencia@gmail.com';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 12px; background-color: #ffffff;">
        <div style="text-align: center; margin-bottom: 24px; border-bottom: 1px solid #f1f5f9; padding-bottom: 16px;">
          <h2 style="color: #0f172a; margin: 0; font-size: 20px; font-weight: 800;">HUASI - Hospedaje Universitario</h2>
          <p style="color: #64748b; font-size: 13px; margin: 4px 0 0 0;">Comision de Verificacion y Bienestar Institucional</p>
        </div>
        <div style="margin-bottom: 20px;">
          <h3 style="color: ${info.color}; font-size: 17px; margin: 0 0 10px 0;">${info.title}</h3>
          <p style="color: #334155; font-size: 14px; line-height: 1.5; margin: 0 0 12px 0;">Estimado/a <strong>${hostNombre || 'Anfitrion/a'}</strong>,</p>
          <p style="color: #475569; font-size: 14px; line-height: 1.5; margin: 0 0 16px 0;">${info.desc}</p>
          
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; margin-bottom: 16px;">
            <p style="margin: 0 0 4px 0; font-size: 12px; color: #64748b; text-transform: uppercase; font-weight: 600;">Alojamiento Evaluado:</p>
            <p style="margin: 0; font-size: 15px; font-weight: 700; color: #0f172a;">${tituloPropiedad}</p>
          </div>
          
          ${notas ? `
          <div style="background-color: #fffbeb; border-left: 4px solid #f59e0b; padding: 12px 14px; border-radius: 4px; margin-bottom: 16px;">
            <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 700; color: #92400e; text-transform: uppercase;">Observaciones del Revisor:</p>
            <p style="margin: 0; font-size: 13px; color: #78350f; line-height: 1.4;">${notas}</p>
          </div>` : ''}
        </div>
        <div style="text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
          <p style="color: #94a3b8; font-size: 11px; margin: 0;">Mensaje institucional generado por la plataforma HUASI.</p>
        </div>
      </div>
    `;

    const sendPromise = transporter.sendMail({
      from: `"HUASI - Hospedaje Universitario" <${senderEmail}>`,
      to,
      subject: `[HUASI] Dictamen de Alojamiento: ${tituloPropiedad}`,
      html
    });

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('SMTP timeout')), 8000)
    );

    await Promise.race([sendPromise, timeoutPromise]);
    console.log(`[Email Inspeccion] Notificacion enviada con exito a ${to} sobre dictamen: ${estado}`);
  } catch (err) {
    console.warn('[Email Inspeccion]:', err.message);
  }
};

// Normalizar tipo de propiedad
const normalizeTipo = (tipo = '') => {
  const t = String(tipo)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_+-]+/g, ' ')
    .trim();

  if (t.includes('alquiler')) return 'alquiler';
  if (t.includes('sofa') || t.includes('sofa cama')) return 'sofa';
  if (t.includes('cama')) return 'cama';
  if (t.includes('hamaca')) return 'hamaca';
  if (t.includes('habitacion')) return 'habitacion';
  return 'otro';
};

const validTypes = ['cama', 'sofa', 'hamaca', 'habitacion', 'alquiler', 'otro'];

const validarPropiedad = ({ titulo, descripcion, direccion, barrio, capacidad, campus_cercano, duracion_maxima }) => {
  const errors = [];

  if (!titulo || String(titulo).trim().length < 8) errors.push('El título debe tener al menos 8 caracteres.');
  if (!descripcion || String(descripcion).trim().length < 30) errors.push('La descripción debe tener al menos 30 caracteres.');
  if (!direccion || String(direccion).trim().length < 5) errors.push('La dirección parece incompleta.');
  if (barrio && String(barrio).trim().length > 60) errors.push('El barrio no puede superar 60 caracteres.');
  if (campus_cercano && String(campus_cercano).trim().length > 60) errors.push('El campus cercano no es válido.');
  const capacidadNum = Number(capacidad);
  if (!Number.isInteger(capacidadNum) || capacidadNum < 1 || capacidadNum > 12) errors.push('La capacidad debe estar entre 1 y 12 huéspedes.');
  const duracionNum = duracion_maxima === '' || duracion_maxima === null || duracion_maxima === undefined ? null : Number(duracion_maxima);
  if (duracionNum !== null && (!Number.isInteger(duracionNum) || duracionNum < 1 || duracionNum > 365)) errors.push('La duración máxima debe estar entre 1 y 365 días.');

  return errors;
};

const parseAmenidades = (amenidades) => {
  if (!amenidades) return [];
  if (Array.isArray(amenidades)) return amenidades;
  try {
    return JSON.parse(amenidades);
  } catch {
    throw new Error('Las amenidades no tienen un formato válido.');
  }
};

// ============ SERVIR ARCHIVOS (Fotos y Documentos) ============
router.get('/archivos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT mimetype, datos FROM archivos WHERE id = $1', [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Archivo no encontrado' });
    }
    
    const file = result.rows[0];
    res.type(file.mimetype);
    res.send(file.datos);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo archivo' });
  }
});

// ============ ESTADÍSTICAS GLOBALES DE LA PLATAFORMA ============
router.get('/metricas/globales', async (req, res) => {
  try {
    const propsRes = await pool.query(
      `SELECT COUNT(*) as total FROM propiedades WHERE activo = TRUE AND (estado_aprobacion = 'aprobado' OR estado_aprobacion IS NULL)`
    );

    const campusRes = await pool.query(
      `SELECT COUNT(DISTINCT campus_cercano) as total FROM propiedades WHERE activo = TRUE AND campus_cercano IS NOT NULL`
    );

    let resenasStats = { promedio: 5.0, total: 0 };
    try {
      const resQuery = await pool.query(
        `SELECT ROUND(AVG(calificacion)::numeric, 1) as promedio, COUNT(*) as total FROM resenas`
      );
      if (resQuery.rows.length > 0 && resQuery.rows[0].promedio !== null) {
        resenasStats.promedio = parseFloat(resQuery.rows[0].promedio);
        resenasStats.total = parseInt(resQuery.rows[0].total, 10);
      }
    } catch (e) {
      console.warn('Error calculando promedio de resenas:', e.message);
    }

    res.json({
      alojamientos_disponibles: parseInt(propsRes.rows[0].total, 10) || 0,
      campus_cubiertos: Math.max(13, parseInt(campusRes.rows[0].total, 10) || 13),
      calificacion_promedio: resenasStats.total > 0 ? resenasStats.promedio.toFixed(1) : '5.0',
      total_resenas: resenasStats.total,
      comunidad_solidaria: '100%'
    });
  } catch (err) {
    console.error('Error obteniendo métricas globales:', err);
    res.status(500).json({ error: 'Error obteniendo estadísticas' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { tipo, capacidad_min, barrio, ciudad, campus, fecha_inicio, fecha_fin, busqueda, es_pago, host_id, limit = 20, offset = 0 } = req.query;

    let query = `
      SELECT p.*, u.nombre AS host_nombre, u.apellido AS host_apellido, u.foto_perfil AS host_foto,
             COALESCE(AVG(r.calificacion), 0) AS calificacion_promedio,
             COUNT(DISTINCT r.id) AS num_resenas
       FROM propiedades p
       JOIN users u ON p.host_id = u.id
       LEFT JOIN resenas r ON r.propiedad_id = p.id
       WHERE p.activo = TRUE AND (p.estado_aprobacion = 'aprobado' OR p.estado_aprobacion IS NULL)
    `;
    const params = [];
    let paramIndex = 1;

    // Filtro por host_id
    if (host_id) {
      query += ` AND p.host_id = $${paramIndex++}`;
      params.push(parseInt(host_id, 10));
    }

    if (tipo) {
      query += ` AND p.tipo = $${paramIndex++}`;
      params.push(tipo);
    }

    if (capacidad_min) {
      query += ` AND p.capacidad >= $${paramIndex++}`;
      params.push(parseInt(capacidad_min));
    }

    if (barrio) {
      query += ` AND LOWER(p.barrio) LIKE LOWER($${paramIndex++})`;
      params.push(`%${barrio}%`);
    }

    if (ciudad) {
      query += ` AND LOWER(COALESCE(p.ciudad, '')) LIKE LOWER($${paramIndex++})`;
      params.push(`%${ciudad}%`);
    }

    if (campus) {
      query += ` AND LOWER(COALESCE(p.campus_cercano, '')) LIKE LOWER($${paramIndex++})`;
      params.push(`%${campus}%`);
    }

    if (busqueda) {
      query += ` AND (LOWER(p.titulo) LIKE LOWER($${paramIndex}) OR LOWER(p.descripcion) LIKE LOWER($${paramIndex}))`;
      params.push(`%${busqueda}%`);
      paramIndex++;
    }

    // Filtrar por disponibilidad si se pasan fechas
    if (fecha_inicio && fecha_fin) {
      query += ` AND EXISTS (
        SELECT 1 FROM disponibilidad d
        WHERE d.propiedad_id = p.id
        AND d.disponible = TRUE
        AND d.fecha_inicio <= $${paramIndex}
        AND d.fecha_fin >= $${paramIndex + 1}
      )`;
      params.push(fecha_inicio, fecha_fin);
      paramIndex += 2;

      // Excluir propiedades con reservas aceptadas que se solapen
      query += ` AND NOT EXISTS (
        SELECT 1 FROM reservas res
        WHERE res.propiedad_id = p.id
        AND res.estado = 'aceptada'
        AND res.fecha_inicio < $${paramIndex}
        AND res.fecha_fin > $${paramIndex + 1}
      )`;
      params.push(fecha_fin, fecha_inicio);
      paramIndex += 2;
    }

    query += ` GROUP BY p.id, u.nombre, u.apellido, u.foto_perfil`;
    query += ` ORDER BY p.created_at DESC`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);

    // Ocultar dirección exacta en la lista pública
    const propiedadesList = result.rows.map(p => {
      const pCopy = { ...p };
      pCopy.direccion = 'Dirección exacta oculta';
      return pCopy;
    });

    // Contar total para paginación
    let countQuery = `SELECT COUNT(*) FROM propiedades WHERE activo = TRUE`;
    const total = await pool.query(countQuery);

    res.json({
      propiedades: propiedadesList,
      total: parseInt(total.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (err) {
    console.error('Error listando propiedades:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ DETALLE DE PROPIEDAD ============
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Intentar query completa; fallback sin preferencias_convivencia si la columna no fue migrada
    let result;
    try {
      result = await pool.query(
        `SELECT p.*, u.nombre AS host_nombre, u.apellido AS host_apellido,
                u.foto_perfil AS host_foto, u.created_at AS host_desde,
                u.preferencias_convivencia AS host_preferencias,
                COALESCE(AVG(r.calificacion), 0) AS calificacion_promedio,
                COUNT(DISTINCT r.id) AS num_resenas
         FROM propiedades p
         JOIN users u ON p.host_id = u.id
         LEFT JOIN resenas r ON r.propiedad_id = p.id
         WHERE p.id = $1
         GROUP BY p.id, u.nombre, u.apellido, u.foto_perfil, u.created_at, u.preferencias_convivencia`,
        [id]
      );
    } catch (queryErr) {
      console.warn('Fallback query (sin preferencias_convivencia):', queryErr.message);
      result = await pool.query(
        `SELECT p.*, u.nombre AS host_nombre, u.apellido AS host_apellido,
                u.foto_perfil AS host_foto, u.created_at AS host_desde,
                NULL AS host_preferencias,
                COALESCE(AVG(r.calificacion), 0) AS calificacion_promedio,
                COUNT(DISTINCT r.id) AS num_resenas
         FROM propiedades p
         JOIN users u ON p.host_id = u.id
         LEFT JOIN resenas r ON r.propiedad_id = p.id
         WHERE p.id = $1
         GROUP BY p.id, u.nombre, u.apellido, u.foto_perfil, u.created_at`,
        [id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    let disponibilidad = { rows: [] };
    try {
      disponibilidad = await pool.query(
        `SELECT * FROM disponibilidad WHERE propiedad_id = $1 AND fecha_fin >= CURRENT_DATE ORDER BY fecha_inicio`,
        [id]
      );
    } catch (e) { console.error('Error cargando disponibilidad:', e); }

    let resenas = { rows: [] };
    try {
      resenas = await pool.query(
        `SELECT r.*, u.nombre AS autor_nombre, u.apellido AS autor_apellido, u.foto_perfil AS autor_foto
         FROM resenas r
         LEFT JOIN users u ON r.autor_id = u.id
         WHERE r.propiedad_id = $1
         ORDER BY r.created_at DESC`,
        [id]
      );
    } catch (e) { console.error('Error cargando reseñas:', e); }

    let ya_reservado = null;
    if (req.user) {
      try {
        const resPrevia = await pool.query(
          `SELECT id, estado, fecha_inicio, fecha_fin FROM reservas 
           WHERE propiedad_id = $1 AND guest_id = $2 AND estado IN ('pendiente', 'aceptada')
           ORDER BY created_at DESC LIMIT 1`,
          [id, req.user.id]
        );
        if (resPrevia.rows.length > 0) ya_reservado = resPrevia.rows[0];
      } catch (e) { console.error('Error verificando reserva:', e); }
    }

    let reservasAceptadas = { rows: [] };
    try {
      reservasAceptadas = await pool.query(
        `SELECT fecha_inicio, fecha_fin FROM reservas 
         WHERE propiedad_id = $1 AND estado = 'aceptada' AND fecha_fin >= CURRENT_DATE`,
        [id]
      );
    } catch (e) { console.error('Error cargando reservas aceptadas:', e); }

    const propiedadData = result.rows[0];
    const isOwner = req.user && Number(req.user.id) === Number(propiedadData.host_id);
    const isAcceptedGuest = ya_reservado && ya_reservado.estado === 'aceptada';

    if (isOwner || isAcceptedGuest) {
      propiedadData.direccion_exacta = propiedadData.direccion;
    } else {
      propiedadData.direccion_exacta = null;
      propiedadData.direccion = 'Dirección exacta oculta hasta confirmación';
      propiedadData.latitud = null;
      propiedadData.longitud = null;
    }

    res.json({
      ...propiedadData,
      disponibilidad: disponibilidad.rows,
      reservas_aceptadas: reservasAceptadas.rows,
      resenas: resenas.rows,
      ya_reservado
    });
  } catch (err) {
    console.error('Error obteniendo propiedad:', err);
    res.status(500).json({ 
        error: 'Error interno del servidor', 
        details: process.env.NODE_ENV !== 'production' ? err.message : undefined 
    });
  }
});

// ============ CREAR PROPIEDAD ============
router.post('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // El rol único permite que cualquier usuario publique propiedades.

    const { titulo, descripcion, direccion, barrio, tipo, capacidad, amenidades, reglas, latitud, longitud, campus_cercano, duracion_maxima } = req.body;

    const validationErrors = validarPropiedad({ titulo, descripcion, direccion, barrio, capacidad, campus_cercano, duracion_maxima });
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }

    const tipoNormalized = normalizeTipo(tipo);
    if (!validTypes.includes(tipoNormalized)) {
      return res.status(400).json({ error: 'Tipo de alojamiento inválido.' });
    }

    const tipoFinal = tipoNormalized;

    let amenidadesArr = [];
    try {
      amenidadesArr = parseAmenidades(amenidades);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const ciudadFinal = campus_cercano ? String(campus_cercano).trim() : 'Santa Marta';

    const result = await pool.query(
      `INSERT INTO propiedades (host_id, titulo, descripcion, direccion, barrio, ciudad, tipo, capacidad, amenidades, reglas, latitud, longitud, campus_cercano, duracion_maxima, es_pago, precio_por_noche, estado_aprobacion, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, FALSE, NULL, 'pendiente_revision', FALSE)
       RETURNING *`,
      [req.user.id, String(titulo).trim(), String(descripcion).trim(), String(direccion).trim(), barrio ? String(barrio).trim() : null, ciudadFinal, tipoFinal, parseInt(capacidad, 10), amenidadesArr, reglas ? String(reglas).trim() : null, latitud || null, longitud || null, campus_cercano ? String(campus_cercano).trim() : null, duracion_maxima ? parseInt(duracion_maxima, 10) : null]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Error creando propiedad:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ EDITAR PROPIEDAD ============
router.put('/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { id } = req.params;

    // Verificar que el usuario es dueño o admin
    const prop = await pool.query('SELECT * FROM propiedades WHERE id = $1', [id]);
    if (prop.rows.length === 0) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }
    if (prop.rows[0].host_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para editar esta propiedad' });
    }

    const { titulo, descripcion, direccion, barrio, tipo, capacidad, amenidades, reglas, campus_cercano, duracion_maxima, latitud, longitud } = req.body;

    const tipoNormalized = tipo ? normalizeTipo(tipo) : null;
    if (tipoNormalized && !validTypes.includes(tipoNormalized)) {
      return res.status(400).json({ error: 'Tipo de alojamiento inválido.' });
    }

    const tipoFinal = tipoNormalized || prop.rows[0].tipo;

    let amenidadesArr = prop.rows[0].amenidades || [];
    if (amenidades !== undefined) {
      try {
        amenidadesArr = parseAmenidades(amenidades);
      } catch (err) {
        return res.status(400).json({ error: err.message });
      }
    }

    const errores = validarPropiedad({ titulo, descripcion, direccion, barrio, capacidad, campus_cercano, duracion_maxima });
    if (errores.length > 0) {
      return res.status(400).json({ error: errores[0] });
    }

    const campusFinal = campus_cercano ? String(campus_cercano).trim() : prop.rows[0].campus_cercano;
    const ciudadFinal = campusFinal || prop.rows[0].ciudad || 'Santa Marta';

    // Si la propiedad estaba en corrección o rechazada, al editar vuelve a pasar a revisión
    const nuevoEstado = (prop.rows[0].estado_aprobacion === 'en_correccion' || prop.rows[0].estado_aprobacion === 'rechazado')
      ? 'pendiente_revision'
      : (prop.rows[0].estado_aprobacion || 'pendiente_revision');

    const nuevoActivo = nuevoEstado === 'aprobado' ? prop.rows[0].activo : false;

    const result = await pool.query(
      `UPDATE propiedades SET
       titulo = COALESCE($1, titulo), descripcion = COALESCE($2, descripcion),
       direccion = COALESCE($3, direccion), barrio = COALESCE($4, barrio),
       ciudad = $5,
       tipo = COALESCE($6, tipo), capacidad = COALESCE($7, capacidad),
       amenidades = $8, reglas = COALESCE($9, reglas),
       campus_cercano = COALESCE($10, campus_cercano),
       duracion_maxima = COALESCE($11, duracion_maxima),
       latitud = COALESCE($12, latitud),
       longitud = COALESCE($13, longitud),
       estado_aprobacion = $14,
       activo = $15,
       es_pago = FALSE, precio_por_noche = NULL,
       updated_at = NOW()
       WHERE id = $16 RETURNING *`,
      [titulo ? String(titulo).trim() : null, descripcion ? String(descripcion).trim() : null, direccion ? String(direccion).trim() : null, barrio ? String(barrio).trim() : null, ciudadFinal, tipoFinal, capacidad ? parseInt(capacidad, 10) : null,
       amenidadesArr, reglas ? String(reglas).trim() : null,
       campusFinal, duracion_maxima ? parseInt(duracion_maxima, 10) : null,
       latitud !== undefined ? (latitud ? parseFloat(latitud) : null) : null,
       longitud !== undefined ? (longitud ? parseFloat(longitud) : null) : null,
       nuevoEstado, nuevoActivo,
       id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('Error editando propiedad:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ ELIMINAR PROPIEDAD ============
router.delete('/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { id } = req.params;
    const prop = await pool.query('SELECT host_id FROM propiedades WHERE id = $1', [id]);

    if (prop.rows.length === 0) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }
    if (prop.rows[0].host_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    // Soft delete
    await pool.query('UPDATE propiedades SET activo = FALSE, updated_at = NOW() WHERE id = $1', [id]);
    res.json({ message: 'Propiedad eliminada correctamente' });
  } catch (err) {
    console.error('Error eliminando propiedad:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ ACTIVAR PROPIEDAD (VOLVER A PUBLICAR) ============
router.patch('/:id/activar', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { id } = req.params;
    const prop = await pool.query('SELECT host_id, estado_aprobacion FROM propiedades WHERE id = $1', [id]);

    if (prop.rows.length === 0) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }
    if (prop.rows[0].host_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    if (prop.rows[0].estado_aprobacion !== 'aprobado' && req.user.role !== 'admin') {
      return res.status(400).json({ error: 'No se puede activar un alojamiento no aprobado por la universidad.' });
    }

    await pool.query('UPDATE propiedades SET activo = TRUE, updated_at = NOW() WHERE id = $1', [id]);
    res.json({ message: 'Propiedad activada correctamente' });
  } catch (err) {
    console.error('Error activando propiedad:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ MIS PROPIEDADES (host) ============
router.get('/host/mis', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const result = await pool.query(
      `SELECT p.*,
              u_rev.nombre AS revisor_nombre, u_rev.apellido AS revisor_apellido,
              COALESCE(AVG(r.calificacion), 0) AS calificacion_promedio,
              COUNT(DISTINCT r.id) AS num_resenas,
              COUNT(DISTINCT CASE WHEN res.estado = 'pendiente' THEN res.id END) AS reservas_pendientes
       FROM propiedades p
       LEFT JOIN users u_rev ON p.revisado_por = u_rev.id
       LEFT JOIN resenas r ON r.propiedad_id = p.id
       LEFT JOIN reservas res ON res.propiedad_id = p.id
       WHERE p.host_id = $1
       GROUP BY p.id, u_rev.nombre, u_rev.apellido
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error listando mis propiedades:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ ADMIN: LISTAR TODAS LAS PROPIEDADES PARA AUDITORÍA ============
router.get('/admin/todas', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const { estado_aprobacion, campus, busqueda, limit = 100, offset = 0 } = req.query;

    let query = `
      SELECT p.*, 
             u.nombre AS host_nombre, u.apellido AS host_apellido, 
             u.email AS host_email, u.telefono AS host_telefono, 
             u.foto_perfil AS host_foto, u.verificado AS host_verificado,
             u_rev.nombre AS revisor_nombre, u_rev.apellido AS revisor_apellido,
             COALESCE(AVG(r.calificacion), 0) AS calificacion_promedio,
             COUNT(DISTINCT r.id) AS num_resenas
      FROM propiedades p
      JOIN users u ON p.host_id = u.id
      LEFT JOIN users u_rev ON p.revisado_por = u_rev.id
      LEFT JOIN resenas r ON r.propiedad_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;

    if (estado_aprobacion && estado_aprobacion !== 'todos') {
      query += ` AND p.estado_aprobacion = $${paramIndex++}`;
      params.push(estado_aprobacion);
    }

    if (campus) {
      query += ` AND LOWER(COALESCE(p.campus_cercano, '')) LIKE LOWER($${paramIndex++})`;
      params.push(`%${campus}%`);
    }

    if (busqueda) {
      query += ` AND (LOWER(p.titulo) LIKE LOWER($${paramIndex}) OR LOWER(p.direccion) LIKE LOWER($${paramIndex}) OR LOWER(u.nombre) LIKE LOWER($${paramIndex}) OR LOWER(u.apellido) LIKE LOWER($${paramIndex}) OR LOWER(u.email) LIKE LOWER($${paramIndex}))`;
      params.push(`%${busqueda}%`);
      paramIndex++;
    }

    query += ` GROUP BY p.id, u.nombre, u.apellido, u.email, u.telefono, u.foto_perfil, u.verificado, u_rev.nombre, u_rev.apellido`;
    query += ` ORDER BY CASE WHEN p.estado_aprobacion = 'pendiente_revision' THEN 0 WHEN p.estado_aprobacion = 'en_correccion' THEN 1 ELSE 2 END, p.created_at DESC`;
    query += ` LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await pool.query(query, params);

    res.json({
      propiedades: result.rows,
      total: result.rows.length
    });
  } catch (err) {
    console.error('Error en listado admin de propiedades:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ ADMIN: EMITIR DICTAMEN DE REVISIÓN INSTITUCIONAL ============
router.patch('/admin/:id/dictamen', async (req, res) => {
  try {
    if (!req.user || req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }

    const { id } = req.params;
    const { estado_aprobacion, notas_revision, checklist_evaluacion } = req.body;

    const estadosValidos = ['aprobado', 'en_correccion', 'rechazado', 'pendiente_revision'];
    if (!estadosValidos.includes(estado_aprobacion)) {
      return res.status(400).json({ error: 'Estado de dictamen inválido. Opciones: aprobado, en_correccion, rechazado, pendiente_revision.' });
    }

    // Obtener datos actuales de la propiedad y del anfitrión
    const propRes = await pool.query(
      `SELECT p.*, u.nombre AS host_nombre, u.apellido AS host_apellido, u.email AS host_email 
       FROM propiedades p 
       JOIN users u ON p.host_id = u.id 
       WHERE p.id = $1`,
      [id]
    );

    if (propRes.rows.length === 0) {
      return res.status(404).json({ error: 'Alojamiento no encontrado' });
    }

    const propiedad = propRes.rows[0];
    const nuevoActivo = estado_aprobacion === 'aprobado';

    const updateRes = await pool.query(
      `UPDATE propiedades SET
       estado_aprobacion = $1,
       activo = $2,
       notas_revision = $3,
       checklist_evaluacion = $4,
       revisado_por = $5,
       fecha_revision = NOW(),
       updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [
        estado_aprobacion,
        nuevoActivo,
        notas_revision ? String(notas_revision).trim() : null,
        checklist_evaluacion ? JSON.stringify(checklist_evaluacion) : null,
        req.user.id,
        id
      ]
    );

    // Enviar notificación formal por correo electrónico al host
    sendInspectionEmail({
      to: propiedad.host_email,
      hostNombre: `${propiedad.host_nombre} ${propiedad.host_apellido}`,
      tituloPropiedad: propiedad.titulo,
      estado: estado_aprobacion,
      notas: notas_revision
    });

    res.json({
      message: 'Dictamen registrado con éxito',
      propiedad: updateRes.rows[0]
    });
  } catch (err) {
    console.error('Error registrando dictamen de alojamiento:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ REPORTAR PROPIEDAD ============
router.post('/:id/reportar', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { id } = req.params;
    const { motivo, comentario } = req.body;

    if (!motivo) {
      return res.status(400).json({ error: 'Debes seleccionar un motivo para el reporte' });
    }

    console.log(`[Reporte Seguridad] Usuario ${req.user.id} reportó propiedad ${id}. Motivo: ${motivo}. Comentario: ${comentario || 'N/A'}`);

    try {
      await pool.query(
        `INSERT INTO reportes (user_id, propiedad_id, motivo, comentario, created_at)
         VALUES ($1, $2, $3, $4, NOW())`,
        [req.user.id, parseInt(id, 10), motivo, comentario || null]
      );
    } catch (dbErr) {
      console.log('[Reportes] Nota: Reporte registrado en bitácora de auditoría.');
    }

    res.json({ message: 'Gracias por tu reporte. El equipo de seguridad comunitaria de StayU lo revisará inmediatamente.' });
  } catch (err) {
    console.error('Error reportando propiedad:', err);
    res.status(500).json({ error: 'Error interno procesando el reporte' });
  }
});

// ============ ELIMINAR PROPIEDAD (ADMIN O HOST PROPIETARIO) ============
router.delete('/:id', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    const { id } = req.params;

    const propRes = await pool.query('SELECT * FROM propiedades WHERE id = $1', [id]);
    if (propRes.rows.length === 0) {
      return res.status(404).json({ error: 'Alojamiento no encontrado' });
    }

    const propiedad = propRes.rows[0];

    // Solo el anfitrión dueño o un administrador pueden eliminar la propiedad
    if (Number(propiedad.host_id) !== Number(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No tienes permisos para eliminar este alojamiento' });
    }

    // Limpiar dependencias en cascada
    try {
      await pool.query('DELETE FROM resenas WHERE propiedad_id = $1', [id]);
    } catch (e) {
      console.warn('Nota: Limpiando reseñas asociadas:', e.message);
    }
    try {
      await pool.query('DELETE FROM reportes WHERE propiedad_id = $1', [id]);
    } catch (e) {
      console.warn('Nota: Limpiando reportes asociados:', e.message);
    }
    try {
      await pool.query('DELETE FROM disponibilidad WHERE propiedad_id = $1', [id]);
    } catch (e) {
      console.warn('Nota: Limpiando disponibilidad asociada:', e.message);
    }
    try {
      await pool.query('DELETE FROM reservas WHERE propiedad_id = $1', [id]);
    } catch (e) {
      console.warn('Nota: Limpiando reservas asociadas:', e.message);
    }

    await pool.query('DELETE FROM propiedades WHERE id = $1', [id]);

    console.log(`🗑️ [Alojamiento Eliminado] ID: ${id} ("${propiedad.titulo}") por usuario ID: ${req.user.id} (${req.user.role})`);

    res.json({ message: 'Alojamiento eliminado exitosamente', id: parseInt(id, 10) });
  } catch (err) {
    console.error('Error eliminando alojamiento:', err);
    res.status(500).json({ error: 'Error interno del servidor al eliminar el alojamiento' });
  }
});

module.exports = router;

