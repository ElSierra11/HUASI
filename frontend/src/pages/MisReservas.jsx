import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, User, Award, List, Home, Bed, Sofa, Trees, Coins, Sparkles, HelpCircle, CheckCircle2, Star as StarIcon, MessageSquare } from 'lucide-react';
import api from '../api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';

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

const TIPO_ICON = {
  cama: <Bed size={32} />,
  sofa: <Sofa size={32} />,
  hamaca: <Trees size={32} />,
  habitacion: <Home size={32} />,
  alquiler: <Coins size={32} />,
  alojamiento_plus: <Sparkles size={32} />,
  otro: <HelpCircle size={32} />
};

const TIPO_ICON_SMALL = {
  cama: <Bed size={12} />,
  sofa: <Sofa size={12} />,
  hamaca: <Trees size={12} />,
  habitacion: <Home size={12} />,
  alquiler: <Coins size={12} />,
  alojamiento_plus: <Sparkles size={12} />,
  otro: <HelpCircle size={12} />
};

const TIPO_THEMES = {
  cama: { gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
  sofa: { gradient: 'linear-gradient(135deg, #a855f7, #6b21a8)' },
  hamaca: { gradient: 'linear-gradient(135deg, #10b981, #047857)' },
  habitacion: { gradient: 'linear-gradient(135deg, #0d9488, #0f766e)' },
  alquiler: { gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
  alojamiento_plus: { gradient: 'linear-gradient(135deg, #ec4899, #be185d)' },
  otro: { gradient: 'linear-gradient(135deg, #64748b, #334155)' }
};

const STATUS_LABELS = {
  pendiente: 'Pendiente',
  aceptada: 'Reserva confirmada',
  rechazada: 'Solicitud rechazada',
  cancelada: 'Cancelada',
  completada: 'Hospedaje completado'
};

export default function MisReservas() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('todas');
  const toast = useToast();

  // Confirmation modal state
  const [confirmModal, setConfirmModal] = useState({ open: false, reservaId: null, processing: false });
  const [reviewModal, setReviewModal] = useState({ open: false, reservaId: null, calificacion: 5, comentario: '' });

  useEffect(() => {
    api.get('/reservas/mis')
      .then(res => setReservas(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const pedirCancelar = (id) => {
    setConfirmModal({ open: true, reservaId: id, processing: false });
  };

  const confirmarCancelar = async () => {
    const { reservaId } = confirmModal;
    setConfirmModal(m => ({ ...m, processing: true }));
    try {
      await api.patch(`/reservas/${reservaId}`, { estado: 'cancelada' });
      setReservas(r => r.map(res => res.id === reservaId ? { ...res, estado: 'cancelada' } : res));
      toast.success('Reserva cancelada correctamente.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al cancelar la reserva');
    } finally {
      setConfirmModal({ open: false, reservaId: null, processing: false });
    }
  };

  const abrirModalReview = (id) => {
    setReviewModal({ open: true, reservaId: id, calificacion: 5, comentario: '' });
  };

  const confirmarReview = async () => {
    const { reservaId, calificacion, comentario } = reviewModal;
    setReviewModal(m => ({ ...m, processing: true }));
    try {
      await api.post(`/reservas/${reservaId}/review`, { calificacion, comentario });
      setReservas(r => r.map(res => res.id === reservaId ? { ...res, review: { calificacion, comentario } } : res));
      toast.success('Gracias por tu reseña!');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al enviar la reseña');
    } finally {
      setReviewModal({ open: false, reservaId: null, calificacion: 5, comentario: '' });
    }
  };

  const completarReserva = async (id) => {
    try {
      await api.patch(`/reservas/${id}`, { estado: 'completada' });
      setReservas(r => r.map(res => res.id === id ? { ...res, estado: 'completada' } : res));
      toast.success('Reserva marcada como completada.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo completar la reserva');
    }
  };

  const enviarResena = async () => {
    try {
      await api.post('/resenas', {
        reserva_id: reviewModal.reservaId,
        calificacion: reviewModal.calificacion,
        comentario: reviewModal.comentario
      });
      toast.success('Gracias por tu evaluación.');
      setReviewModal({ open: false, reservaId: null, calificacion: 5, comentario: '' });
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se pudo guardar tu evaluación');
    }
  };

  const filtered = tab === 'todas' ? reservas : reservas.filter(r => r.estado === tab);

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <h1 style={{ fontSize: 'clamp(1.8rem, 5vw, 2.2rem)', marginBottom: 24, color: 'var(--primary)' }}>Tus Viajes</h1>

      <div className="tabs" style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {['todas', 'pendiente', 'aceptada', 'completada', 'cancelada'].map(t => {
          const labels = {
            todas: 'Todas',
            pendiente: 'Pendientes',
            aceptada: 'Aceptadas',
            completada: 'Completadas',
            cancelada: 'Canceladas'
          };
          return (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {labels[t]}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">
          <List size={48} />
          <h3>No tienes reservas {tab !== 'todas' ? `con estado "${tab}"` : ''}</h3>
          <p style={{ color: 'var(--text-muted)' }}>Explora alojamientos y solicita tu primera reserva</p>
          <Link to="/" className="btn btn-primary" style={{ marginTop: 24 }}>Explorar alojamientos</Link>
        </div>
      ) : (
        filtered.map(r => {
          const normalizedTipo = getNormalizedTipo(r.tipo_propiedad);
          const theme = TIPO_THEMES[normalizedTipo] || TIPO_THEMES.otro;
          const icon = TIPO_ICON[normalizedTipo] || TIPO_ICON.otro;
          const smallIcon = TIPO_ICON_SMALL[normalizedTipo] || TIPO_ICON_SMALL.otro;

          return (
            <div key={r.id} className="list-card">
              <div className="list-card-img" style={{
                background: theme.gradient,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                borderRadius: 'var(--radius-sm)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
              }}>
                {React.cloneElement(icon, { size: 36, color: 'white' })}
              </div>
              <div className="list-card-info">
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: theme.gradient,
                    color: 'white',
                    borderRadius: '4px',
                    padding: '4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.12)',
                    flexShrink: 0
                  }}>
                    {React.cloneElement(smallIcon, { size: 12, color: 'white' })}
                  </div>
                  <Link to={`/propiedad/${r.propiedad_id}`} style={{ fontWeight: 700, color: 'var(--primary)' }}>
                    {r.titulo}
                  </Link>
                </h3>
                <p><MapPin size={16} /> {r.barrio || r.direccion}</p>
                <p><Calendar size={16} /> {new Date(r.fecha_inicio).toLocaleDateString('es-CO')} — {new Date(r.fecha_fin).toLocaleDateString('es-CO')}</p>
                <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={16} /> <span>Anfitrión: {r.host_nombre} {r.host_apellido}</span>
                  <button 
                    className="btn btn-secondary btn-sm"
                    style={{ padding: '2px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: 4, height: 'auto', margin: 0, marginLeft: 8 }}
                    onClick={() => window.dispatchEvent(new CustomEvent('open-chat', { detail: { userId: r.host_id } }))}
                  >
                    <MessageSquare size={12} /> Chatear
                  </button>
                </p>
                {r.evento && <p><Award size={16} /> {r.evento}</p>}
              </div>
              <div className="list-card-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className={`badge badge-${r.estado}`}>{STATUS_LABELS[r.estado] || r.estado}</span>
                {r.estado === 'aceptada' && new Date(r.fecha_fin) < new Date() && (
                  <button className="btn btn-success btn-sm" onClick={() => completarReserva(r.id)}>Marcar como completada</button>
                )}
                {r.estado === 'completada' && (
                  <button className="btn btn-primary btn-sm" onClick={() => setReviewModal({ open: true, reservaId: r.id, calificacion: 5, comentario: '' })}>Dejar reseña</button>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Custom confirmation modal — replaces browser confirm() */}
      <Modal
        open={confirmModal.open}
        type="danger"
        title="¿Cancelar reserva?"
        message="Esta acción no se puede deshacer. La reserva pasará al estado cancelada y tendrás que hacer una nueva solicitud si cambias de opinión."
        confirmText="Sí, cancelar"
        cancelText="No, volver"
        loading={confirmModal.processing}
        onConfirm={confirmarCancelar}
        onCancel={() => setConfirmModal({ open: false, reservaId: null, processing: false })}
      />

      {/* Review modal */}
      <Modal
        open={reviewModal.open}
        type="success"
        title="Evaluar estadía"
        message="Comparte tu experiencia con el anfitrión para mejorar la red solidaria."
        confirmText="Publicar reseña"
        cancelText="Cancelar"
        onConfirm={enviarResena}
        onCancel={() => setReviewModal({ open: false, reservaId: null, calificacion: 5, comentario: '' })}
      >
        <div style={{ display: 'grid', gap: 12, textAlign: 'left', marginTop: 8 }}>
          <label style={{ fontWeight: 600 }}>Calificación</label>
          <div style={{ display: 'flex', gap: 6 }}>
            {[1,2,3,4,5].map(v => (
              <button key={v} type="button" onClick={() => setReviewModal(m => ({ ...m, calificacion: v }))} style={{ border: '1px solid var(--border)', background: reviewModal.calificacion >= v ? 'var(--accent-light)' : 'white', color: reviewModal.calificacion >= v ? 'var(--accent-hover)' : 'var(--text-muted)', borderRadius: 999, width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                <StarIcon size={16} fill="currentColor" />
              </button>
            ))}
          </div>
          <label style={{ fontWeight: 600 }}>Comentario</label>
          <textarea className="form-control" rows={4} value={reviewModal.comentario} onChange={e => setReviewModal(m => ({ ...m, comentario: e.target.value }))} placeholder="Describe la experiencia, puntualidad y convivencia." />
        </div>
      </Modal>
    </div>
  );
}
