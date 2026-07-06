const express = require('express');
const pool = require('../db');

const router = express.Router();

// Normalizar tipo de propiedad
const normalizeTipo = (tipo = '') => {
  const t = String(tipo)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s_+-]+/g, ' ')
    .trim();

  if (t.includes('alojamiento') && (t.includes('plus') || t.includes('+'))) return 'alojamiento_plus';
  if (t.includes('alquiler')) return 'alquiler';
  if (t.includes('sofa') || t.includes('sofa cama')) return 'sofa';
  if (t.includes('cama')) return 'cama';
  if (t.includes('hamaca')) return 'hamaca';
  if (t.includes('habitacion')) return 'habitacion';
  return 'otro';
};

const validTypes = ['cama', 'sofa', 'hamaca', 'habitacion', 'alquiler', 'alojamiento_plus', 'otro'];

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
       WHERE p.activo = TRUE
    `;
    const params = [];
    let paramIndex = 1;

    // Filtro por host_id
    if (host_id) {
      query += ` AND p.host_id = $${paramIndex++}`;
      params.push(parseInt(host_id, 10));
    }

    // Filtro por modalidad: pago o solidario
    if (es_pago !== undefined && es_pago !== '') {
      const esPagoVal = es_pago === 'true' || es_pago === true;
      query += ` AND p.es_pago = $${paramIndex++}`;
      params.push(esPagoVal);
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

    const result = await pool.query(
      `SELECT p.*, u.nombre AS host_nombre, u.apellido AS host_apellido,
              u.foto_perfil AS host_foto, u.created_at AS host_desde,
              COALESCE(AVG(r.calificacion), 0) AS calificacion_promedio,
              COUNT(DISTINCT r.id) AS num_resenas
       FROM propiedades p
       JOIN users u ON p.host_id = u.id
       LEFT JOIN resenas r ON r.propiedad_id = p.id
       WHERE p.id = $1
       GROUP BY p.id, u.nombre, u.apellido, u.foto_perfil, u.created_at`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    // Obtener disponibilidad
    const disponibilidad = await pool.query(
      `SELECT * FROM disponibilidad WHERE propiedad_id = $1 AND fecha_fin >= CURRENT_DATE ORDER BY fecha_inicio`,
      [id]
    );

    // Obtener reseñas
    const resenas = await pool.query(
      `SELECT r.*, u.nombre AS autor_nombre, u.apellido AS autor_apellido, u.foto_perfil AS autor_foto
       FROM resenas r
       JOIN users u ON r.autor_id = u.id
       WHERE r.propiedad_id = $1
       ORDER BY r.created_at DESC`,
      [id]
    );

    // Obtener si el usuario actual ya tiene una reserva para esta propiedad
    let ya_reservado = null;
    if (req.user) {
      const resPrevia = await pool.query(
        `SELECT id, estado, fecha_inicio, fecha_fin FROM reservas 
         WHERE propiedad_id = $1 AND guest_id = $2 AND estado IN ('pendiente', 'aceptada')
         ORDER BY created_at DESC LIMIT 1`,
        [id, req.user.id]
      );
      if (resPrevia.rows.length > 0) {
        ya_reservado = resPrevia.rows[0];
      }
    }

    // Obtener reservas aceptadas (bloqueadas)
    const reservasAceptadas = await pool.query(
      `SELECT fecha_inicio, fecha_fin FROM reservas 
       WHERE propiedad_id = $1 AND estado = 'aceptada' AND fecha_fin >= CURRENT_DATE`,
      [id]
    );

    const propiedadData = result.rows[0];
    const isOwner = req.user && req.user.id === propiedadData.host_id;
    const isAcceptedGuest = ya_reservado && ya_reservado.estado === 'aceptada';

    if (!isOwner && !isAcceptedGuest) {
      propiedadData.direccion_exacta = propiedadData.direccion;
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
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============ CREAR PROPIEDAD ============
router.post('/', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // El rol único permite que cualquier usuario publique propiedades.

    const { titulo, descripcion, direccion, barrio, tipo, capacidad, amenidades, reglas, latitud, longitud, campus_cercano, duracion_maxima, es_pago, precio_por_noche } = req.body;

    const validationErrors = validarPropiedad({ titulo, descripcion, direccion, barrio, capacidad, campus_cercano, duracion_maxima });
    if (validationErrors.length > 0) {
      return res.status(400).json({ error: validationErrors[0] });
    }

    const tipoNormalized = normalizeTipo(tipo);
    if (!validTypes.includes(tipoNormalized)) {
      return res.status(400).json({ error: 'Tipo de alojamiento inválido.' });
    }

    const tipoFinal = tipoNormalized;

    // Validar precio si es alojamiento de pago
    const esPago = es_pago === true || es_pago === 'true';
    let precioFinal = null;
    if (esPago) {
      const precioNum = parseFloat(precio_por_noche);
      if (!precio_por_noche || isNaN(precioNum) || precioNum <= 0) {
        return res.status(400).json({ error: 'El precio por noche es obligatorio para alojamientos de pago y debe ser mayor a 0.' });
      }
      precioFinal = precioNum;
    }

    let amenidadesArr = [];
    try {
      amenidadesArr = parseAmenidades(amenidades);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }

    const result = await pool.query(
      `INSERT INTO propiedades (host_id, titulo, descripcion, direccion, barrio, tipo, capacidad, amenidades, reglas, latitud, longitud, campus_cercano, duracion_maxima, es_pago, precio_por_noche)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
       RETURNING *`,
      [req.user.id, String(titulo).trim(), String(descripcion).trim(), String(direccion).trim(), barrio ? String(barrio).trim() : null, tipoFinal, parseInt(capacidad, 10), amenidadesArr, reglas ? String(reglas).trim() : null, latitud || null, longitud || null, campus_cercano || null, duracion_maxima ? parseInt(duracion_maxima, 10) : null, esPago, precioFinal]
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

    // Verificar que el usuario es dueño
    const prop = await pool.query('SELECT * FROM propiedades WHERE id = $1', [id]);
    if (prop.rows.length === 0) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }
    if (prop.rows[0].host_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso para editar esta propiedad' });
    }

    const { titulo, descripcion, direccion, barrio, tipo, capacidad, amenidades, reglas, campus_cercano, duracion_maxima, es_pago, precio_por_noche } = req.body;

    const tipoNormalized = tipo ? normalizeTipo(tipo) : null;
    if (tipoNormalized && !validTypes.includes(tipoNormalized)) {
      return res.status(400).json({ error: 'Tipo de alojamiento inválido.' });
    }

    const tipoFinal = tipoNormalized || prop.rows[0].tipo;

    // Calcular nuevos valores de pago
    const esPago = es_pago !== undefined ? (es_pago === true || es_pago === 'true') : prop.rows[0].es_pago;
    let precioFinal = prop.rows[0].precio_por_noche;
    if (es_pago !== undefined) {
      if (esPago) {
        const precioNum = parseFloat(precio_por_noche);
        if (!precio_por_noche || isNaN(precioNum) || precioNum <= 0) {
          return res.status(400).json({ error: 'El precio por noche es obligatorio para alojamientos de pago y debe ser mayor a 0.' });
        }
        precioFinal = precioNum;
      } else {
        precioFinal = null;
      }
    } else if (precio_por_noche !== undefined && esPago) {
      const precioNum = parseFloat(precio_por_noche);
      precioFinal = isNaN(precioNum) ? null : precioNum;
    }

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

    const result = await pool.query(
      `UPDATE propiedades SET
       titulo = COALESCE($1, titulo), descripcion = COALESCE($2, descripcion),
       direccion = COALESCE($3, direccion), barrio = COALESCE($4, barrio),
       tipo = COALESCE($5, tipo), capacidad = COALESCE($6, capacidad),
       amenidades = $7, reglas = COALESCE($8, reglas),
       campus_cercano = COALESCE($9, campus_cercano),
       duracion_maxima = COALESCE($10, duracion_maxima),
       es_pago = $11, precio_por_noche = $12,
       updated_at = NOW()
       WHERE id = $13 RETURNING *`,
      [titulo ? String(titulo).trim() : null, descripcion ? String(descripcion).trim() : null, direccion ? String(direccion).trim() : null, barrio ? String(barrio).trim() : null, tipoFinal, capacidad ? parseInt(capacidad, 10) : null,
       amenidadesArr, reglas ? String(reglas).trim() : null,
       campus_cercano || null, duracion_maxima ? parseInt(duracion_maxima, 10) : null,
       esPago, precioFinal, id]
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
    const prop = await pool.query('SELECT host_id FROM propiedades WHERE id = $1', [id]);

    if (prop.rows.length === 0) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }
    if (prop.rows[0].host_id !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'No tienes permiso' });
    }

    await pool.query('UPDATE propiedades SET activo = TRUE, updated_at = NOW() WHERE id = $1', [id]);
    res.json({ message: 'Propiedad publicada correctamente' });
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
              COALESCE(AVG(r.calificacion), 0) AS calificacion_promedio,
              COUNT(DISTINCT r.id) AS num_resenas,
              COUNT(DISTINCT CASE WHEN res.estado = 'pendiente' THEN res.id END) AS reservas_pendientes
       FROM propiedades p
       LEFT JOIN resenas r ON r.propiedad_id = p.id
       LEFT JOIN reservas res ON res.propiedad_id = p.id
       WHERE p.host_id = $1
       GROUP BY p.id
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('Error listando mis propiedades:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

module.exports = router;
