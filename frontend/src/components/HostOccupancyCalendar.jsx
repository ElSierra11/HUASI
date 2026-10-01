import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  Bed,
  Users,
  User,
  CheckCircle,
  Clock,
  MessageSquare,
  Home,
  Info,
  CalendarCheck,
  CalendarX,
  Sparkles,
  ArrowRight
} from 'lucide-react';

export default function HostOccupancyCalendar({ propiedades = [] }) {
  const [currentMonthDate, setCurrentMonthDate] = useState(() => new Date());
  const [selectedPropertyId, setSelectedPropertyId] = useState('all');
  const [selectedDayStr, setSelectedDayStr] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  // Lista de propiedades filtradas
  const activeProperties = useMemo(() => {
    if (selectedPropertyId === 'all') {
      return propiedades;
    }
    return propiedades.filter(p => String(p.id) === String(selectedPropertyId));
  }, [propiedades, selectedPropertyId]);

  // Capacidad total de las propiedades activas
  const totalCapacity = useMemo(() => {
    return activeProperties.reduce((sum, p) => sum + (parseInt(p.capacidad, 10) || 0), 0);
  }, [activeProperties]);

  // Todas las reservas confirmadas agregadas
  const allReservations = useMemo(() => {
    const list = [];
    activeProperties.forEach(p => {
      const confirmados = Array.isArray(p.huespedes_confirmados) ? p.huespedes_confirmados : [];
      confirmados.forEach(h => {
        list.push({
          ...h,
          propiedad_id: p.id,
          propiedad_titulo: p.titulo,
          propiedad_capacidad: p.capacidad
        });
      });
    });
    return list;
  }, [activeProperties]);

  // Navegación de meses
  const nextMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const prevMonth = () => {
    setCurrentMonthDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentMonthDate(new Date(today.getFullYear(), today.getMonth(), 1));
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    setSelectedDayStr(`${y}-${m}-${d}`);
  };

  // Días del mes y offsets
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth(); // 0-indexed

  const monthName = useMemo(() => {
    const formatter = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' });
    const formatted = formatter.format(currentMonthDate);
    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
  }, [currentMonthDate]);

  const daysInMonth = useMemo(() => {
    return new Date(year, month + 1, 0).getDate();
  }, [year, month]);

  // Primer día de la semana (Lunes = 0, Domingo = 6)
  const firstDayWeekIndex = useMemo(() => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  }, [year, month]);

  // Días para renderizar
  const calendarCells = useMemo(() => {
    const cells = [];
    // Espacios vacíos antes del día 1
    for (let i = 0; i < firstDayWeekIndex; i++) {
      cells.push({ isBlank: true, key: `blank-${i}` });
    }

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

    for (let day = 1; day <= daysInMonth; day++) {
      const dayStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      
      // Encontrar reservas activas en este día (fecha_inicio <= dayStr AND dayStr < fecha_fin)
      const dayReservations = allReservations.filter(r => {
        const start = (r.fecha_inicio || '').split('T')[0];
        const end = (r.fecha_fin || '').split('T')[0];
        return start <= dayStr && dayStr < end;
      });

      const occupiedBeds = dayReservations.reduce((sum, r) => sum + (parseInt(r.num_huespedes, 10) || 1), 0);
      const availableBeds = Math.max(0, totalCapacity - occupiedBeds);
      const isToday = dayStr === todayStr;
      const isSelected = dayStr === selectedDayStr;

      cells.push({
        isBlank: false,
        key: dayStr,
        dayNumber: day,
        dayStr,
        isToday,
        isSelected,
        occupiedBeds,
        availableBeds,
        totalCapacity,
        dayReservations
      });
    }

    return cells;
  }, [year, month, daysInMonth, firstDayWeekIndex, allReservations, totalCapacity, selectedDayStr]);

  // Datos del día seleccionado
  const selectedDayData = useMemo(() => {
    if (!selectedDayStr) return null;
    const dayReservations = allReservations.filter(r => {
      const start = (r.fecha_inicio || '').split('T')[0];
      const end = (r.fecha_fin || '').split('T')[0];
      return start <= selectedDayStr && selectedDayStr < end;
    });

    const occupiedBeds = dayReservations.reduce((sum, r) => sum + (parseInt(r.num_huespedes, 10) || 1), 0);
    const availableBeds = Math.max(0, totalCapacity - occupiedBeds);

    let formattedDate = selectedDayStr;
    try {
      const [y, m, d] = selectedDayStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      formattedDate = new Intl.DateTimeFormat('es-CO', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      }).format(dateObj);
      formattedDate = formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1);
    } catch (_) {}

    return {
      dateStr: selectedDayStr,
      formattedDate,
      occupiedBeds,
      availableBeds,
      totalCapacity,
      dayReservations
    };
  }, [selectedDayStr, allReservations, totalCapacity]);

  // Reservas activas o que tocan el mes en curso
  const monthStays = useMemo(() => {
    const monthStartStr = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const monthEndStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;

    return allReservations.filter(r => {
      const start = (r.fecha_inicio || '').split('T')[0];
      const end = (r.fecha_fin || '').split('T')[0];
      return start <= monthEndStr && end >= monthStartStr;
    }).sort((a, b) => (a.fecha_inicio || '').localeCompare(b.fecha_inicio || ''));
  }, [allReservations, year, month, daysInMonth]);

  const formatDateRange = (startStr, endStr) => {
    if (!startStr) return '';
    try {
      const s = new Date(startStr.split('T')[0] + 'T00:00:00');
      const e = endStr ? new Date(endStr.split('T')[0] + 'T00:00:00') : null;
      const opt = { day: 'numeric', month: 'short' };
      if (e && !isNaN(e.getTime())) {
        return `${s.toLocaleDateString('es-CO', opt)} - ${e.toLocaleDateString('es-CO', opt)}`;
      }
      return s.toLocaleDateString('es-CO', opt);
    } catch {
      return `${startStr} - ${endStr}`;
    }
  };

  const handleOpenChat = (guestId) => {
    window.dispatchEvent(new CustomEvent('open-chat', { detail: { userId: guestId } }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Barra de Controles y Filtros */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 14,
        background: 'var(--surface)',
        padding: '16px 20px',
        borderRadius: 12,
        border: '1px solid var(--border)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        {/* Selector de Propiedad */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Home size={16} color="var(--primary)" />
            Alojamiento:
          </span>
          <select
            value={selectedPropertyId}
            onChange={(e) => setSelectedPropertyId(e.target.value)}
            style={{
              padding: '8px 14px',
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'var(--bg)',
              color: 'var(--text)',
              fontSize: '0.86rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            <option value="all">Todos los alojamientos ({propiedades.length})</option>
            {propiedades.map(p => (
              <option key={p.id} value={p.id}>
                {p.titulo} ({p.capacidad} camas)
              </option>
            ))}
          </select>
        </div>

        {/* Navegador de Meses */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={prevMonth}
            className="btn btn-sm btn-outline"
            style={{ padding: '6px 10px', display: 'flex', alignItems: 'center' }}
            title="Mes anterior"
          >
            <ChevronLeft size={16} />
          </button>

          <span style={{ fontSize: '1rem', fontWeight: 800, minWidth: 160, textAlign: 'center', color: 'var(--text)' }}>
            {monthName}
          </span>

          <button
            type="button"
            onClick={nextMonth}
            className="btn btn-sm btn-outline"
            style={{ padding: '6px 10px', display: 'flex', alignItems: 'center' }}
            title="Mes siguiente"
          >
            <ChevronRight size={16} />
          </button>

          <button
            type="button"
            onClick={goToToday}
            className="btn btn-sm btn-secondary"
            style={{ padding: '6px 12px', fontSize: '0.8rem', fontWeight: 700 }}
          >
            Hoy
          </button>
        </div>
      </div>

      {/* Grid Principal: Calendario (Izquierda) + Detalle del Día (Derecha) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 340px', gap: 20, alignItems: 'start' }}>
        
        {/* Contenedor del Calendario */}
        <div style={{
          background: 'var(--surface)',
          borderRadius: 12,
          border: '1px solid var(--border)',
          padding: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          overflowX: 'auto'
        }}>
          {/* Cabecera de días de la semana */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 6,
            marginBottom: 8,
            textAlign: 'center'
          }}>
            {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((d, idx) => (
              <div key={idx} style={{
                fontSize: '0.78rem',
                fontWeight: 700,
                color: 'var(--text-muted)',
                padding: '6px 0',
                textTransform: 'uppercase',
                letterSpacing: '0.04em'
              }}>
                {d}
              </div>
            ))}
          </div>

          {/* Celdas del Calendario */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(7, 1fr)',
            gap: 6
          }}>
            {calendarCells.map((cell) => {
              if (cell.isBlank) {
                return (
                  <div
                    key={cell.key}
                    style={{
                      minHeight: 84,
                      background: 'transparent',
                      borderRadius: 8
                    }}
                  />
                );
              }

              const hasGuests = cell.occupiedBeds > 0;
              const isFull = cell.totalCapacity > 0 && cell.occupiedBeds >= cell.totalCapacity;

              let cellBg = 'var(--surface)';
              let borderStyle = '1px solid var(--border)';
              
              if (cell.isSelected) {
                borderStyle = '2px solid var(--primary)';
              } else if (cell.isToday) {
                borderStyle = '2px solid #0284c7';
              }

              if (isFull) {
                cellBg = 'rgba(239, 68, 68, 0.08)';
              } else if (hasGuests) {
                cellBg = 'rgba(14, 165, 233, 0.07)';
              }

              return (
                <div
                  key={cell.key}
                  onClick={() => setSelectedDayStr(cell.dayStr)}
                  style={{
                    minHeight: 88,
                    padding: 6,
                    borderRadius: 8,
                    background: cellBg,
                    border: borderStyle,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    transition: 'all 0.15s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-1px)';
                    e.currentTarget.style.boxShadow = '0 3px 8px rgba(0,0,0,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'none';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  {/* Encabezado del Día */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      fontSize: '0.84rem',
                      fontWeight: cell.isToday || cell.isSelected ? 800 : 600,
                      color: cell.isToday ? '#0284c7' : 'var(--text)',
                      width: 22,
                      height: 22,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: '50%',
                      background: cell.isToday ? 'rgba(2, 132, 199, 0.15)' : 'transparent'
                    }}>
                      {cell.dayNumber}
                    </span>

                    {cell.isToday && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#0284c7' }}>
                        Hoy
                      </span>
                    )}
                  </div>

                  {/* Estado de Ocupación */}
                  <div style={{ marginTop: 4 }}>
                    {hasGuests ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <div style={{
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          padding: '2px 4px',
                          borderRadius: 4,
                          background: isFull ? '#ef4444' : '#0284c7',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 3,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          <Bed size={10} />
                          <span>{cell.occupiedBeds}/{cell.totalCapacity} camas</span>
                        </div>

                        {/* Huésped principal */}
                        {cell.dayReservations.slice(0, 1).map(r => (
                          <div
                            key={r.reserva_id}
                            style={{
                              fontSize: '0.66rem',
                              color: 'var(--text-muted)',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              marginTop: 1
                            }}
                          >
                            {r.guest_nombre} {r.guest_apellido ? r.guest_apellido.charAt(0) + '.' : ''}
                          </div>
                        ))}
                        {cell.dayReservations.length > 1 && (
                          <div style={{ fontSize: '0.62rem', color: 'var(--primary)', fontWeight: 700 }}>
                            +{cell.dayReservations.length - 1} más
                          </div>
                        )}
                      </div>
                    ) : (
                      <div style={{
                        fontSize: '0.68rem',
                        color: 'var(--text-muted)',
                        padding: '2px 4px'
                      }}>
                        {cell.totalCapacity} libres
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Leyenda de colores profesional */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            marginTop: 16,
            paddingTop: 12,
            borderTop: '1px solid var(--border)',
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(14, 165, 233, 0.2)', border: '1px solid #0284c7' }} />
              <span>Ocupación parcial</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444' }} />
              <span>Capacidad completa</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: 'var(--surface)', border: '1px solid var(--border)' }} />
              <span>Cupos disponibles</span>
            </div>
          </div>
        </div>

        {/* Panel Lateral: Detalle del Día Seleccionado */}
        <div style={{
          background: 'var(--surface)',
          borderRadius: 12,
          border: '1px solid var(--border)',
          padding: 18,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: 16
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--primary)', marginBottom: 4 }}>
              <CalendarCheck size={16} />
              <span style={{ fontSize: '0.8rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                Detalle del Día
              </span>
            </div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', color: 'var(--text)', lineHeight: 1.3 }}>
              {selectedDayData?.formattedDate}
            </h3>
          </div>

          {/* Métricas de Cupos del Día */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 10,
            background: 'var(--bg)',
            padding: 12,
            borderRadius: 8,
            border: '1px solid var(--border)'
          }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                Camas Ocupadas
              </span>
              <strong style={{ fontSize: '1.25rem', color: selectedDayData?.occupiedBeds > 0 ? '#0284c7' : 'var(--text)' }}>
                {selectedDayData?.occupiedBeds || 0}
              </strong>
            </div>
            <div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                Camas Disponibles
              </span>
              <strong style={{ fontSize: '1.25rem', color: '#10b981' }}>
                {selectedDayData?.availableBeds || 0}
              </strong>
            </div>
          </div>

          {/* Lista de huéspedes en esta fecha */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <Users size={15} color="var(--primary)" />
                Huéspedes Alojados ({selectedDayData?.dayReservations.length || 0})
              </span>
            </div>

            {selectedDayData?.dayReservations && selectedDayData.dayReservations.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxHeight: 380, overflowY: 'auto' }}>
                {selectedDayData.dayReservations.map(r => (
                  <div
                    key={r.reserva_id}
                    style={{
                      padding: '10px 12px',
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        {r.guest_foto ? (
                          <img src={r.guest_foto} alt={r.guest_nombre} style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.82rem', flexShrink: 0 }}>
                            {(r.guest_nombre || 'H').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <strong style={{ fontSize: '0.86rem', color: 'var(--text)', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {r.guest_nombre} {r.guest_apellido || ''}
                          </strong>
                          <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                            {r.propiedad_titulo}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenChat(r.guest_id)}
                        className="btn btn-sm"
                        style={{
                          padding: '5px 8px',
                          fontSize: '0.74rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 4,
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer',
                          flexShrink: 0
                        }}
                        title={`Chatear con ${r.guest_nombre}`}
                      >
                        <MessageSquare size={12} />
                        Chat
                      </button>
                    </div>

                    <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Calendar size={12} />
                      <span>{formatDateRange(r.fecha_inicio, r.fecha_fin)}</span>
                      <span>·</span>
                      <Bed size={12} />
                      <span>{r.num_huespedes || 1} {(r.num_huespedes || 1) === 1 ? 'cama' : 'camas'}</span>
                    </div>

                    {r.evento && (
                      <div style={{ fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
                        Evento: {r.evento}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                padding: '24px 16px',
                textAlign: 'center',
                background: 'var(--bg)',
                borderRadius: 8,
                border: '1px dashed var(--border)',
                color: 'var(--text-muted)',
                fontSize: '0.84rem'
              }}>
                <CalendarX size={24} style={{ margin: '0 auto 6px', opacity: 0.6 }} />
                No hay huéspedes alojados en esta fecha. Todos los cupos están libres.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Cronograma Resumen de Estadías del Mes */}
      <div style={{
        background: 'var(--surface)',
        borderRadius: 12,
        border: '1px solid var(--border)',
        padding: '18px 20px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Clock size={18} color="var(--primary)" />
            <h3 style={{ margin: 0, fontSize: '1rem', color: 'var(--text)' }}>
              Cronograma de Estadías de {monthName} ({monthStays.length} reservas)
            </h3>
          </div>
          <Link to="/host/reservas" style={{ fontSize: '0.82rem', color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>
            Gestionar todas las solicitudes y reservas →
          </Link>
        </div>

        {monthStays.length === 0 ? (
          <div style={{
            padding: '20px',
            textAlign: 'center',
            color: 'var(--text-muted)',
            fontSize: '0.86rem',
            background: 'var(--bg)',
            borderRadius: 8,
            border: '1px dashed var(--border)'
          }}>
            No se registran reservas programadas para este mes en los alojamientos seleccionados.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.84rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '8px 12px', fontWeight: 700 }}>Huésped</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700 }}>Alojamiento</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700 }}>Fechas de Estadía</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700 }}>Cupos / Camas</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700 }}>Motivo Académico</th>
                  <th style={{ padding: '8px 12px', fontWeight: 700, textAlign: 'right' }}>Acción</th>
                </tr>
              </thead>
              <tbody>
                {monthStays.map(r => (
                  <tr key={r.reserva_id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {r.guest_foto ? (
                          <img src={r.guest_foto} alt={r.guest_nombre} style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />
                        ) : (
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.76rem' }}>
                            {(r.guest_nombre || 'H').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <strong>{r.guest_nombre} {r.guest_apellido || ''}</strong>
                      </div>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                      {r.propiedad_titulo}
                    </td>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>
                      {formatDateRange(r.fecha_inicio, r.fecha_fin)}
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '2px 8px',
                        borderRadius: 6,
                        background: 'rgba(14, 165, 233, 0.12)',
                        color: '#0284c7',
                        fontWeight: 700,
                        fontSize: '0.78rem'
                      }}>
                        <Bed size={12} />
                        {r.num_huespedes || 1} {(r.num_huespedes || 1) === 1 ? 'cama' : 'camas'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: 'var(--text-muted)' }}>
                      {r.evento || 'Pasantía / Evento UCC'}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => handleOpenChat(r.guest_id)}
                        className="btn btn-sm"
                        style={{
                          padding: '5px 10px',
                          fontSize: '0.76rem',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          background: 'var(--primary)',
                          color: 'white',
                          border: 'none',
                          borderRadius: 6,
                          cursor: 'pointer'
                        }}
                      >
                        <MessageSquare size={12} />
                        Chat
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
