-- ============================================
-- StayU - Seed de Base de Datos (Datos de Prueba)
-- ============================================

-- Nota: Todos los usuarios tienen la contraseña 'password' 
-- usando un hash simulado para desarrollo local.
-- Hash real para 'password' con bcrypt: $2b$10$.j.FbO/mDfdvK.xpPjwacuodARggzkIcdTU5D7IcUlStBOYUmurm2

-- Limpiar tablas (Opcional, pero util para no duplicar si se corre varias veces)
TRUNCATE TABLE resenas, reservas, disponibilidad, propiedades, verificaciones, users CASCADE;

-- Insertar Usuarios de Prueba (Hosts y Guests)
INSERT INTO users (id, email, password_hash, nombre, apellido, telefono, role, verificado, email_verificado) VALUES
(101, 'carlos@stayu.com', '$2b$10$.j.FbO/mDfdvK.xpPjwacuodARggzkIcdTU5D7IcUlStBOYUmurm2', 'Carlos', 'Perez', '3001234567', 'host', TRUE, TRUE),
(102, 'maria@stayu.com', '$2b$10$.j.FbO/mDfdvK.xpPjwacuodARggzkIcdTU5D7IcUlStBOYUmurm2', 'Maria', 'Gomez', '3019876543', 'host', TRUE, TRUE),
(103, 'juan@stayu.com', '$2b$10$.j.FbO/mDfdvK.xpPjwacuodARggzkIcdTU5D7IcUlStBOYUmurm2', 'Juan', 'Martinez', '3157778899', 'guest', TRUE, TRUE),
(104, 'ana@stayu.com', '$2b$10$.j.FbO/mDfdvK.xpPjwacuodARggzkIcdTU5D7IcUlStBOYUmurm2', 'Ana', 'Torres', '3201112233', 'guest', FALSE, TRUE)
ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

-- Ajustar la secuencia de ID de usuarios
SELECT setval('users_id_seq', 200);

-- Insertar Propiedades (Alojamientos)
INSERT INTO propiedades (id, host_id, titulo, descripcion, direccion, barrio, ciudad, tipo, capacidad, amenidades, reglas, fotos, activo) VALUES
(1, 101, 'Habitación privada cerca a Unimagdalena', 'Habitación fresca con ventilador, escritorio y silla ideal para estudiar. A solo 10 minutos caminando de la universidad.', 'Calle 22 # 15-20', 'Los Alcazares', 'Santa Marta', 'Habitación Privada', 1, '{"WiFi", "Cocina", "Lavadora"}', 'No fumar, no hacer ruido después de las 10 PM.', '{"https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af"}', TRUE),
(2, 102, 'Sofá cama en apartamento céntrico', 'Sofá cama muy cómodo en la sala de mi apartamento. Vivo cerca a la bahía y es muy fácil tomar transporte para cualquier lado.', 'Cra 3 # 12-45', 'Centro Histórico', 'Santa Marta', 'Sofá Cama', 1, '{"WiFi", "Cocina", "Aire Acondicionado"}', 'Ser organizado con el espacio común.', '{"https://images.unsplash.com/photo-1555041469-a586c61ea9bc"}', TRUE),
(3, 101, 'Cuarto compartido para dos estudiantes', 'Cuarto grande con dos camas sencillas. Ideal si vienes con un amigo o no te molesta compartir. Ambiente estudiantil tranquilo.', 'Cra 19 # 29-10', 'Bavaria', 'Santa Marta', 'Habitación Compartida', 2, '{"WiFi", "Cocina", "Baño Privado"}', 'Mantener limpio el baño, visitas hasta las 8 PM.', '{"https://images.unsplash.com/photo-1513694203232-719a280e022f"}', TRUE)
ON CONFLICT (id) DO UPDATE SET titulo = EXCLUDED.titulo;

-- Ajustar la secuencia de ID de propiedades
SELECT setval('propiedades_id_seq', 10);

-- Insertar Reservas
INSERT INTO reservas (id, propiedad_id, guest_id, fecha_inicio, fecha_fin, estado, mensaje, num_huespedes) VALUES
(1, 1, 103, '2026-06-01', '2026-06-15', 'aprobada', 'Voy para un congreso en la universidad, soy estudiante de ing. sistemas.', 1),
(2, 2, 104, '2026-07-10', '2026-07-15', 'pendiente', 'Necesito quedarme un par de días mientras hago unos trámites.', 1)
ON CONFLICT (id) DO UPDATE SET estado = EXCLUDED.estado;

-- Ajustar la secuencia de ID de reservas
SELECT setval('reservas_id_seq', 10);

-- Insertar Reseñas
INSERT INTO resenas (reserva_id, autor_id, destino_id, propiedad_id, calificacion, comentario) VALUES
(1, 103, 101, 1, 5, 'Carlos fue un excelente anfitrión. La habitación es perfecta para estudiar, cero ruido y muy cerca a la U.');

-- Insertar Disponibilidad (Fechas bloqueadas/disponibles)
INSERT INTO disponibilidad (propiedad_id, fecha_inicio, fecha_fin, disponible) VALUES
(1, '2026-06-01', '2026-06-15', FALSE),
(2, '2026-07-10', '2026-07-15', FALSE);
