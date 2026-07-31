import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { MapPin, Star, Users, Home, CheckCircle2, Calendar, MessageSquare, Award, GraduationCap, Bed, Sofa, Trees, Coins, Sparkles, HelpCircle, Sun } from 'lucide-react';
import api from '../api';

const TIPO_LABELS = {
  cama: 'Cama',
  sofa: 'Sofá',
  hamaca: 'Hamaca',
  habitacion: 'Habitación',
  alquiler: 'Alquiler',
  alojamiento_plus: 'Alojamiento +',
  otro: 'Otros',
  'Habitación Privada': 'Habitación Privada',
  'Sofá Cama': 'Sofá Cama',
  'Habitación Compartida': 'Habitación Compartida'
};

const getNormalizedTipo = (tipo) => {
  if (!tipo) return 'otro';
  const t = tipo.toLowerCase();
  if (t.includes('cama')) return 'cama';
  if (t.includes('sofa') || t.includes('sofá')) return 'sofa';
  if (t.includes('hamaca')) return 'hamaca';
  if (t.includes('habitacion') || t.includes('habitación')) return 'habitacion';
  if (t.includes('alquiler')) return 'alquiler';
  if (t.includes('+') || t.includes('plus') || t.includes('alojamiento_plus')) return 'alojamiento_plus';
  return 'otro';
};

const TIPO_ICON_SMALL = {
  cama: <Bed size={16} />,
  sofa: <Sofa size={16} />,
  hamaca: <Trees size={16} />,
  habitacion: <Home size={16} />,
  alquiler: <Coins size={16} />,
  alojamiento_plus: <Sparkles size={16} />,
  otro: <HelpCircle size={16} />
};

const TIPO_THEMES = {
  cama: { gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', shadow: '0 10px 30px rgba(59, 130, 246, 0.3)' },
  sofa: { gradient: 'linear-gradient(135deg, #a855f7, #6b21a8)', shadow: '0 10px 30px rgba(168, 85, 247, 0.3)' },
  hamaca: { gradient: 'linear-gradient(135deg, #10b981, #047857)', shadow: '0 10px 30px rgba(16, 185, 129, 0.3)' },
  habitacion: { gradient: 'linear-gradient(135deg, #0d9488, #0f766e)', shadow: '0 10px 30px rgba(13, 148, 136, 0.3)' },
  alquiler: { gradient: 'linear-gradient(135deg, #f59e0b, #d97706)', shadow: '0 10px 30px rgba(245, 158, 11, 0.3)' },
  alojamiento_plus: { gradient: 'linear-gradient(135deg, #ec4899, #be185d)', shadow: '0 10px 30px rgba(236, 72, 153, 0.3)' },
  otro: { gradient: 'linear-gradient(135deg, #64748b, #334155)', shadow: '0 10px 30px rgba(100, 116, 139, 0.3)' }
};

const TIPO_ICON = {
  cama: <Bed />,
  sofa: <Sofa />,
  hamaca: <Trees />,
  habitacion: <Home />,
  alquiler: <Coins />,
  alojamiento_plus: <Sparkles />,
  otro: <HelpCircle />
};

function PropertyCalendar({ disponibilidad = [], reservasAceptadas = [], fechaInicio, fechaFin, onSelectDates }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayIndex = new Date(year, month, 1).getDay(); // Sunday=0
  
  // Normalize firstDayIndex to make Monday = 0
  const firstDayOffset = firstDayIndex === 0 ? 6 : firstDayIndex - 1;

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const isPast = (date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const isAvailable = (date) => {
    if (disponibilidad.length === 0) return true;
    return disponibilidad.some(d => {
      const start = new Date(d.fecha_inicio + 'T00:00:00');
      const end = new Date(d.fecha_fin + 'T00:00:00');
      return date >= start && date <= end;
    });
  };

  const isBooked = (date) => {
    return reservasAceptadas.some(r => {
      const start = new Date(r.fecha_inicio + 'T00:00:00');
      const end = new Date(r.fecha_fin + 'T00:00:00');
      return date >= start && date <= end;
    });
  };

  const formatDateString = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleDayClick = (dayNum) => {
    const clickedDate = new Date(year, month, dayNum);
    if (isPast(clickedDate) || isBooked(clickedDate) || !isAvailable(clickedDate)) return;

    const clickedStr = formatDateString(clickedDate);

    if (!fechaInicio || (fechaInicio && fechaFin)) {
      onSelectDates(clickedStr, '');
    } else {
      const start = new Date(fechaInicio + 'T00:00:00');
      if (clickedDate < start) {
        onSelectDates(clickedStr, '');
      } else {
        // Verify no booked days exist between start and clickedDate
        let hasBookedBetween = false;
        let curr = new Date(start);
        curr.setDate(curr.getDate() + 1);
        while (curr <= clickedDate) {
          if (isBooked(curr)) {
            hasBookedBetween = true;
            break;
          }
          curr.setDate(curr.getDate() + 1);
        }

        if (hasBookedBetween) {
          alert('No puedes reservar un rango que incluya días ya reservados.');
          return;
        }

        onSelectDates(fechaInicio, clickedStr);
      }
    }
  };

  const days = [];
  // Add empty slots for offset
  for (let i = 0; i < firstDayOffset; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  const isSelected = (dayNum) => {
    if (!dayNum) return false;
    const date = new Date(year, month, dayNum);
    const dateStr = formatDateString(date);
    if (dateStr === fechaInicio || dateStr === fechaFin) return true;
    if (fechaInicio && fechaFin) {
      const start = new Date(fechaInicio + 'T00:00:00');
      const end = new Date(fechaFin + 'T00:00:00');
      return date > start && date < end;
    }
    return false;
  };

  const getDayStatusClass = (dayNum) => {
    if (!dayNum) return 'cal-empty';
    const date = new Date(year, month, dayNum);
    if (isPast(date)) return 'cal-past';
    if (isBooked(date)) return 'cal-booked';
    if (!isAvailable(date)) return 'cal-unavailable';
    return 'cal-available';
  };

  return (
    <div className="custom-calendar-container" style={{ margin: '16px 0', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px', background: 'var(--bg-card)' }}>
      <style>{`
        .cal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .cal-header button { background: none; border: none; font-weight: bold; cursor: pointer; color: var(--primary); padding: 4px 8px; font-size: 1rem; }
        .cal-header span { font-weight: bold; font-family: var(--font-heading); color: var(--primary); }
        .cal-weekdays { display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 0.72rem; font-weight: bold; color: var(--text-muted); margin-bottom: 6px; }
        .cal-grid { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center; }
        .cal-day { font-size: 0.78rem; padding: 6px 0; border-radius: 6px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: 600; min-height: 28px; transition: var(--transition); }
        .cal-empty { cursor: default; }
        .cal-past { color: #cbd5e1; cursor: not-allowed; text-decoration: line-through; }
        .cal-booked { background: #fee2e2; color: #ef4444; cursor: not-allowed; text-decoration: line-through; }
        .dark .cal-booked { background: rgba(239, 68, 68, 0.2); color: #f87171; }
        .cal-unavailable { color: #94a3b8; cursor: not-allowed; opacity: 0.6; }
        .cal-available { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
        .dark .cal-available { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
        .cal-available:hover { background: #dcfce7; }
        .dark .cal-available:hover { background: rgba(16, 185, 129, 0.25); }
        .cal-selected { background: var(--ucc-green) !important; color: white !important; border: 1px solid var(--ucc-green) !important; }
        .cal-legend { display: flex; gap: 10px; justify-content: center; font-size: 0.65rem; font-weight: bold; margin-top: 12px; border-top: 1px solid var(--border); padding-top: 8px; flex-wrap: wrap; }
        .cal-leg-item { display: flex; align-items: center; gap: 4px; }
        .cal-leg-dot { width: 8px; height: 8px; border-radius: 50%; }
      `}</style>
      
      <div className="cal-header">
        <button type="button" onClick={handlePrevMonth}>&lt;</button>
        <span>{monthNames[month]} {year}</span>
        <button type="button" onClick={handleNextMonth}>&gt;</button>
      </div>

      <div className="cal-weekdays">
        <span>L</span><span>M</span><span>M</span><span>J</span><span>V</span><span>S</span><span>D</span>
      </div>

      <div className="cal-grid">
        {days.map((day, idx) => {
          if (day === null) return <div key={`empty-${idx}`} className="cal-day cal-empty" />;
          const statusClass = getDayStatusClass(day);
          const selected = isSelected(day);
          return (
            <div
              key={`day-${day}`}
              className={`cal-day ${statusClass} ${selected ? 'cal-selected' : ''}`}
              onClick={() => handleDayClick(day)}
            >
              {day}
            </div>
          );
        })}
      </div>

      <div className="cal-legend">
        <div className="cal-leg-item">
          <div className="cal-leg-dot" style={{ background: '#f0fdf4', border: '1px solid #bbf7d0' }} />
          <span>Disponible</span>
        </div>
        <div className="cal-leg-item">
          <div className="cal-leg-dot" style={{ background: '#fee2e2' }} />
          <span>Reservado</span>
        </div>
        <div className="cal-leg-item">
          <div className="cal-leg-dot" style={{ background: 'var(--ucc-green)' }} />
          <span>Tu selección</span>
        </div>
      </div>
    </div>
  );
}

export default function PropertyDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [prop, setProp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState({ fecha_inicio: '', fecha_fin: '', mensaje: '', evento: '', num_huespedes: 1 });
  const [bookingLoading, setBookingLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    api.get(`/propiedades/${id}`)
      .then(res => setProp(res.data))
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  }, [id]);

  const getNights = () => {
    if (!booking.fecha_inicio || !booking.fecha_fin) return 0;
    const start = new Date(booking.fecha_inicio + 'T00:00:00');
    const end = new Date(booking.fecha_fin + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return 0;
    const diffTime = Math.abs(end - start);
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const nights = getNights();
  const solesPorNoche = prop?.soles_por_noche || 50;
  const totalSolesRequired = nights * solesPorNoche;
  const hasEnoughSoles = user ? user.soles_balance >= totalSolesRequired : false;

  const getCompatibilityScore = () => {
    if (!user || !user.preferencias_convivencia || !prop?.host_preferencias) {
      return null;
    }
    try {
      const uPrefs = typeof user.preferencias_convivencia === 'string' 
        ? JSON.parse(user.preferencias_convivencia) 
        : user.preferencias_convivencia;
      const hPrefs = typeof prop.host_preferencias === 'string' 
        ? JSON.parse(prop.host_preferencias) 
        : prop.host_preferencias;
      if (!uPrefs || !hPrefs) return null;
      let matches = 0;
      let totalFields = 5;
      if (uPrefs.estudio === hPrefs.estudio) matches++;
      if (uPrefs.ruido === hPrefs.ruido) matches++;
      if (uPrefs.mascotas === hPrefs.mascotas) matches++;
      if (uPrefs.visitas === hPrefs.visitas) matches++;
      if (uPrefs.fumar === hPrefs.fumar) matches++;
      return Math.round((matches / totalFields) * 100);
    } catch (e) {
      console.error('Error calculating compatibility:', e);
      return null;
    }
  };

  const compScore = getCompatibilityScore();

  const handleBooking = async (e) => {
    e.preventDefault();
    if (!user) { navigate('/login'); return; }
    if (!prop.es_pago && !user.verificado) { setError('Debes completar la verificación de tu correo institucional primero'); return; }
    if (!prop.es_pago && !hasEnoughSoles) { setError('Saldo insuficiente para completar la reserva'); return; }
    setBookingLoading(true);
    setError('');
    try {
      const res = await api.post('/reservas', { propiedad_id: parseInt(id), ...booking });
      setSuccess('¡Solicitud de reserva enviada!');
      
      // Abrir chat flotante con el anfitrión tras breve delay
      setTimeout(() => {
        window.dispatchEvent(new CustomEvent('open-chat', { detail: { userId: res.data.host_id } }));
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Error al solicitar reserva');
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;
  if (!prop) return null;

  const rating = parseFloat(prop.calificacion_promedio) || 0;
  const tipoLabel = TIPO_LABELS[prop.tipo] || prop.tipo || 'Alojamiento';
  const normalizedTipo = getNormalizedTipo(prop.tipo);
  const theme = TIPO_THEMES[normalizedTipo] || TIPO_THEMES.otro;
  const largeIcon = TIPO_ICON[normalizedTipo] || TIPO_ICON.otro;
  const smallIcon = TIPO_ICON_SMALL[normalizedTipo] || TIPO_ICON_SMALL.otro;
  const isOwner = Number(user?.id) === Number(prop?.host_id);

  return (
    <div>
      <div className="detail-header">
        <h1 style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: theme.gradient,
            color: 'white',
            borderRadius: '8px',
            padding: '8px',
            boxShadow: '0 4px 10px rgba(0,0,0,0.12)',
            flexShrink: 0
          }}>
            {React.cloneElement(smallIcon, { size: 20, color: 'white' })}
          </div>
          <span>{prop.titulo}</span>
        </h1>
        <div className="detail-meta" style={{ flexWrap: 'wrap', gap: '16px' }}>
          <span><MapPin size={16} style={{marginRight: 4, verticalAlign: 'text-bottom'}} /> {prop.barrio ? `${prop.barrio}, ${prop.ciudad}` : `${prop.direccion}, ${prop.ciudad}`}</span>
          <span><Star size={16} fill="var(--text-muted)" style={{marginRight: 4, verticalAlign: 'text-bottom'}} /> {rating > 0 ? rating.toFixed(1) : 'Nuevo'} ({prop.num_resenas || 0} reseñas)</span>
          <span><Users size={16} style={{marginRight: 4, verticalAlign: 'text-bottom'}} /> {prop.capacidad} {prop.capacidad === 1 ? 'huésped' : 'huéspedes'}</span>
          {prop.campus_cercano && (
            <span style={{ color: 'var(--accent)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <GraduationCap size={16} />
              <span>Campus UCC: {prop.campus_cercano}</span>
            </span>
          )}
          {prop.duracion_maxima && (
            <span style={{ color: 'var(--secondary)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
              <Calendar size={16} />
              <span>Estancia máx: {prop.duracion_maxima} {parseInt(prop.duracion_maxima) === 1 ? 'día' : 'días'}</span>
            </span>
          )}
          <span className="badge badge-aceptada">{tipoLabel}</span>
          {prop.es_pago ? (
            <span className="badge" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white', border: 'none', fontWeight: 800 }}>
              De Pago · ${Number(prop.precio_por_noche).toLocaleString('es-CO')}/noche
            </span>
          ) : (
            <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'rgba(22, 163, 74, 0.1)', color: '#16a34a', borderColor: 'rgba(22, 163, 74, 0.2)', fontWeight: 805 }}>
              <Sun size={14} className="text-amber-500 fill-amber-500" /> Hospedaje Solidario · {prop.soles_por_noche || 50} Soles/noche
            </span>
          )}
          {isOwner && (
            <span className="badge badge-success" style={{ background: 'linear-gradient(135deg, #10b981, #047857)', color: 'white', border: 'none' }}>
              Tu publicación
            </span>
          )}
        </div>
      </div>

      <div className="detail-gallery-banner" style={{
        background: theme.gradient,
        borderRadius: 'var(--radius)',
        minHeight: '200px',
        height: 'clamp(200px, 30vw, 320px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        boxShadow: theme.shadow || '0 10px 30px rgba(0,0,0,0.1)',
        marginBottom: '32px',
        overflow: 'hidden',
        position: 'relative'
      }}>
        <div style={{
          position: 'absolute',
          width: '300px',
          height: '300px',
          background: 'rgba(255,255,255,0.06)',
          borderRadius: '50%',
          top: '-100px',
          right: '-50px'
        }} />
        <div style={{
          position: 'absolute',
          width: '200px',
          height: '200px',
          background: 'rgba(255,255,255,0.04)',
          borderRadius: '50%',
          bottom: '-50px',
          left: '-50px'
        }} />
        
        <div style={{ transform: 'scale(1.6)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {React.cloneElement(largeIcon, { size: 72, color: 'white', style: { filter: 'drop-shadow(0 8px 16px rgba(0,0,0,0.15))' } })}
        </div>
      </div>

      <div className="detail-content">
        <div className="detail-info">
          <section>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Award size={24} color="var(--accent)" /> Anfitrión: {prop.host_nombre} {prop.host_apellido}
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>
              Miembro desde {new Date(prop.host_desde).toLocaleDateString('es-CO', { year: 'numeric', month: 'long' })}
            </p>
            {user && user.id !== prop.host_id && (
              <button
                className="btn btn-secondary btn-sm"
                style={{ marginTop: 12 }}
                onClick={() => window.dispatchEvent(new CustomEvent('open-chat', { detail: { userId: prop.host_id } }))}
              >
                <MessageSquare size={16} /> Contactar anfitrión
              </button>
            )}
          </section>

          {user && compScore !== null && (
            <section style={{ display: 'flex', alignItems: 'center', gap: 20, background: 'var(--bg-light)', border: '1px solid var(--border)', padding: '20px 24px', borderRadius: 18, marginTop: 16 }}>
              <div style={{ position: 'relative', width: 68, height: 68, flexShrink: 0 }}>
                <svg width="68" height="68" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="rgba(0,0,0,0.05)"
                    strokeWidth="3.2"
                  />
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke={compScore >= 70 ? 'var(--ucc-green)' : 'var(--accent)'}
                    strokeWidth="3.2"
                    strokeDasharray={`${compScore}, 100`}
                  />
                </svg>
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.85rem', fontWeight: 900, color: 'var(--text)' }}>
                  {compScore}%
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: '0.95rem', display: 'block', color: 'var(--text)', marginBottom: 4 }}>Compatibilidad de Convivencia</strong>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  {compScore >= 80 
                    ? '¡Excelente compatibilidad! Comparten hábitos y normas de convivencia muy similares.' 
                    : compScore >= 60 
                    ? 'Compatibilidad aceptable. Hay algunas diferencias menores de estilo de vida, conversen en el chat.' 
                    : 'Compatibilidad baja. Consideren charlar previamente para alinear expectativas de orden y ruido.'}
                </span>
              </div>
            </section>
          )}

          {user && compScore === null && (
            <section style={{ background: 'var(--bg-light)', border: '1px dashed var(--border)', padding: '16px 20px', borderRadius: 18, marginTop: 16, fontSize: '0.82rem', color: 'var(--text-muted)' }}>
              ¿Quieres ver tu compatibilidad con {prop.host_nombre}? Completa el <strong>Cuestionario de Convivencia</strong> en tu perfil para calcularla.
            </section>
          )}

          <section>
            <h2>Acerca de este espacio</h2>
            <p style={{ color: 'var(--text-muted)', whiteSpace: 'pre-line' }}>{prop.descripcion || 'Sin descripción disponible.'}</p>
          </section>

          {prop.amenidades?.length > 0 && (
            <section>
              <h2>Lo que ofrece este lugar</h2>
              <div className="amenidades-grid">
                {prop.amenidades.map((a, i) => (
                  <div key={i} className="amenidad-item"><CheckCircle2 size={20} color="var(--success)" /> {a}</div>
                ))}
              </div>
            </section>
          )}

          {prop.reglas && (
            <section>
              <h2>Reglas del lugar</h2>
              <p style={{ color: 'var(--text-muted)', whiteSpace: 'pre-line' }}>{prop.reglas}</p>
            </section>
          )}

          {prop.resenas?.length > 0 && (
            <section style={{ borderBottom: 'none' }}>
              <h2>Reseñas ({prop.resenas.length})</h2>
              {prop.resenas.map(r => (
                <div key={r.id} className="review-card">
                  <div className="review-header">
                    <span className="review-author">{r.autor_nombre} {r.autor_apellido}</span>
                    <span className="review-stars">
                      {Array.from({ length: r.calificacion }).map((_, i) => (
                        <Star key={i} size={14} fill="var(--accent)" color="var(--accent)" />
                      ))}
                    </span>
                  </div>
                  {r.comentario && <p className="review-text">{r.comentario}</p>}
                </div>
              ))}
            </section>
          )}

          {prop.disponibilidad?.length > 0 && (
            <section>
              <h2>Fechas disponibles</h2>
              <div style={{ display: 'grid', gap: 10 }}>
                {prop.disponibilidad.map((d) => (
                  <div key={d.id} className="card" style={{ padding: 14 }}>
                    <strong style={{ color: 'var(--primary)' }}>{new Date(d.fecha_inicio).toLocaleDateString('es-CO')} — {new Date(d.fecha_fin).toLocaleDateString('es-CO')}</strong>
                    <p style={{ fontSize: '0.92rem', marginTop: 4 }}>Rango habilitado por el anfitrión para reservas.</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        <div>
          <div className="booking-card">
            <h3>
              {prop.es_pago ? (
                <>
                  <Coins size={20} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} color="#d97706" />
                  <span>Reserva por ${Number(prop.precio_por_noche).toLocaleString('es-CO')}/noche</span>
                </>
              ) : (
                <>
                  <Sun size={20} style={{ marginRight: 8, verticalAlign: 'text-bottom' }} className="text-amber-500 fill-amber-500" />
                  <span>Hospedaje Solidario · {prop.soles_por_noche || 50} Soles</span>
                </>
              )}
            </h3>
            
            {prop.ya_reservado ? (
              <div style={{ textAlign: 'center', padding: '12px 0' }}>
                <div className={`alert alert-${prop.ya_reservado.estado === 'aceptada' || prop.ya_reservado.estado === 'aprobada' ? 'success' : 'info'}`} style={{ marginBottom: 20 }}>
                  <CheckCircle2 size={24} style={{ marginBottom: 8 }} />
                  <div>
                    <strong style={{ display: 'block', fontSize: '1.1rem', marginBottom: 4 }}>
                      Ya has solicitado una reserva
                    </strong>
                    Estado: <span className={`badge badge-${prop.ya_reservado.estado}`}>
                      {{
                        pendiente: 'Pendiente',
                        aprobada: 'Aprobada',
                        aceptada: 'Aprobada',
                        rechazada: 'Rechazada',
                        cancelada: 'Cancelada'
                      }[prop.ya_reservado.estado] || prop.ya_reservado.estado}
                    </span>
                    <p style={{ marginTop: 8, fontSize: '0.9rem', opacity: 0.9 }}>
                      Para las fechas {new Date(prop.ya_reservado.fecha_inicio).toLocaleDateString()} - {new Date(prop.ya_reservado.fecha_fin).toLocaleDateString()}
                    </p>
                    {prop.ya_reservado.estado === 'aceptada' && prop.direccion_exacta && (
                      <div style={{ marginTop: 12, padding: 12, background: 'rgba(16, 185, 129, 0.1)', borderRadius: 8, border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'left' }}>
                        <strong style={{ color: 'var(--success)' }}>📍 Dirección exacta revelada:</strong>
                        <p style={{ margin: '4px 0 0 0', color: 'var(--text)' }}>{prop.direccion_exacta}</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <button onClick={() => window.dispatchEvent(new CustomEvent('open-chat', { detail: { userId: prop.host_id } }))} className="btn btn-primary btn-block">
                    <MessageSquare size={18} /> Ir al chat con el anfitrión
                  </button>
                  <button onClick={() => navigate('/mis-reservas')} className="btn btn-secondary btn-block">
                    Ver mis reservas
                  </button>
                </div>
              </div>
            ) : success ? (
              <div className="alert alert-success">{success}</div>
            ) : isOwner ? (
              <div className="alert alert-info" style={{ marginBottom: 16 }}>
                <strong>Esta es tu publicación</strong>
                <p style={{ marginTop: 8, marginBottom: 12, color: 'var(--text-muted)' }}>
                  No puedes reservar tu propia propiedad desde aquí. Puedes gestionarla desde tu panel de anfitrión.
                </p>
                <button className="btn btn-primary btn-block" onClick={() => navigate('/host')}>
                  Ir a mi panel
                </button>
              </div>
            ) : (
              <form onSubmit={handleBooking}>
                {error && <div className="alert alert-error">{error}</div>}
                
                <PropertyCalendar
                  disponibilidad={prop.disponibilidad || []}
                  reservasAceptadas={prop.reservas_aceptadas || []}
                  fechaInicio={booking.fecha_inicio}
                  fechaFin={booking.fecha_fin}
                  onSelectDates={(start, end) => {
                    setBooking(b => ({ ...b, fecha_inicio: start, fecha_fin: end }));
                  }}
                />

                <div className="booking-date-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
                  <div className="form-group">
                    <label>Llegada</label>
                    <input type="date" className="form-control" required
                      value={booking.fecha_inicio} onChange={e => setBooking(b => ({ ...b, fecha_inicio: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label>Salida</label>
                    <input type="date" className="form-control" required
                      value={booking.fecha_fin} onChange={e => setBooking(b => ({ ...b, fecha_fin: e.target.value }))} />
                  </div>
                </div>
                <div className="form-group">
                  <label>Huéspedes</label>
                  <input type="number" className="form-control" min="1" max={prop.capacidad}
                    value={booking.num_huespedes} onChange={e => setBooking(b => ({ ...b, num_huespedes: parseInt(e.target.value) }))} />
                </div>
                <div className="form-group">
                  <label>Evento académico</label>
                  <input type="text" className="form-control" placeholder="Ej: Congreso de Ingeniería 2026"
                    value={booking.evento} onChange={e => setBooking(b => ({ ...b, evento: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label>Mensaje al anfitrión</label>
                  <textarea className="form-control" placeholder="Preséntate y cuéntale al anfitrión sobre tu visita..."
                    value={booking.mensaje} onChange={e => setBooking(b => ({ ...b, mensaje: e.target.value }))} />
                </div>
                
                {!prop.es_pago && nights > 0 && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '12px', padding: '12px 16px', marginBottom: 16, fontSize: '0.85rem', color: '#92400e' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Costo por noche:</span>
                      <strong style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Sun size={14} className="text-amber-500 fill-amber-500" /> {solesPorNoche} Soles
                      </strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span>Noches de estadía:</span>
                      <strong>{nights} {nights === 1 ? 'noche' : 'noches'}</strong>
                    </div>
                    <hr style={{ border: 0, borderTop: '1px solid #fde68a', margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: '0.95rem' }}>
                      <span>Total requerido:</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Sun size={16} className="text-amber-500 fill-amber-500" /> {totalSolesRequired} Soles
                      </span>
                    </div>
                    {user && !hasEnoughSoles && (
                      <div style={{ color: '#dc2626', fontSize: '0.75rem', fontWeight: 700, marginTop: 8 }}>
                        Saldo insuficiente (Tienes {user.soles_balance} soles).
                      </div>
                    )}
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn btn-primary btn-block" 
                  disabled={bookingLoading || (!prop.es_pago && user && !hasEnoughSoles)}
                >
                  {bookingLoading ? 'Enviando solicitud...' : 'Solicitar reserva'}
                </button>
                {!user && <p style={{ fontSize: '0.85rem', textAlign: 'center', marginTop: 12, color: 'var(--text-muted)' }}>Debes iniciar sesión para reservar</p>}
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
