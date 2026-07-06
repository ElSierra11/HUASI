import { useState, useEffect } from 'react';
import { Mail, User, GraduationCap, Calendar, Home, Check, X, Inbox, MessageSquare } from 'lucide-react';
import api from '../api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';

const STATUS_LABELS = {
  pendiente: 'Pendiente',
  aceptada: 'Reserva confirmada',
  rechazada: 'Solicitud rechazada',
  cancelada: 'Cancelada',
  completada: 'Hospedaje completado'
};

export default function HostReservas() {
  const [reservas, setReservas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('pendiente');
  const [confirmModal, setConfirmModal] = useState({ open: false, reservaId: null, estado: null, processing: false });
  const toast = useToast();

  useEffect(() => {
    api.get('/reservas/host').then(res => setReservas(res.data)).catch(console.error).finally(() => setLoading(false));
  }, []);

  const pedirConfirmacion = (id, estado) => {
    setConfirmModal({ open: true, reservaId: id, estado, processing: false });
  };

  const confirmarCambioEstado = async () => {
    const { reservaId, estado } = confirmModal;
    if (!reservaId || !estado) return;

    setConfirmModal(m => ({ ...m, processing: true }));
    try {
      await api.patch(`/reservas/${reservaId}`, { estado });
      setReservas(r => r.map(res => res.id === reservaId ? { ...res, estado } : res));
      const labels = { aceptada: 'Reserva aceptada', rechazada: 'Reserva rechazada' };
      toast.success(labels[estado] || 'Estado actualizado');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al actualizar la reserva');
    } finally {
      setConfirmModal({ open: false, reservaId: null, estado: null, processing: false });
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

  const filtered = reservas.filter(r => tab === 'todas' ? true : r.estado === tab);
  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <h1 style={{ fontSize: '2.2rem', marginBottom: 32, color: 'var(--primary)' }}>Solicitudes de Reserva</h1>
      <div className="tabs" style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap' }}>
        {['pendiente', 'aceptada', 'completada', 'rechazada', 'cancelada', 'todas'].map(t => {
          const labels = {
            pendiente: 'Pendientes',
            aceptada: 'Confirmadas',
            completada: 'Completadas',
            rechazada: 'Rechazadas',
            cancelada: 'Canceladas',
            todas: 'Todas'
          };
          return (
            <button key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
              {labels[t]}
            </button>
          );
        })}
      </div>
      {filtered.length === 0 ? (
        <div className="empty-state"><Inbox size={48} /><h3>No hay solicitudes</h3></div>
      ) : filtered.map(r => (
        <div key={r.id} className="card" style={{ padding: 24, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}><Home size={20} color="var(--accent)" /> {r.titulo}</h3>
              <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8 }}><Calendar size={16} /> {new Date(r.fecha_inicio).toLocaleDateString('es-CO')} — {new Date(r.fecha_fin).toLocaleDateString('es-CO')}</p>
              {r.evento && <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}><GraduationCap size={16} /> {r.evento}</p>}
            </div>
            <span className={`badge badge-${r.estado}`} style={{ alignSelf: 'flex-start' }}>
              {{
                pendiente: 'Pendiente',
                aceptada: 'Reserva confirmada',
                rechazada: 'Solicitud rechazada',
                cancelada: 'Cancelada',
                completada: 'Hospedaje completado'
              }[r.estado] || r.estado}
            </span>
          </div>
          
          <div style={{ background: 'var(--bg)', padding: 16, border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)' }}>
            <p style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <User size={16} /> <span>{r.guest_nombre} {r.guest_apellido}</span>
              {r.guest_verificado && <span className="badge badge-verificado" style={{ marginLeft: 8 }}><Check size={12} /> Verificado</span>}
              <button 
                className="btn btn-secondary btn-sm"
                style={{ padding: '2px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: 4, height: 'auto', margin: 0, marginLeft: 'auto' }}
                onClick={() => window.dispatchEvent(new CustomEvent('open-chat', { detail: { userId: r.guest_id } }))}
              >
                <MessageSquare size={12} /> Chatear
              </button>
            </p>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}><Mail size={16} /> {r.guest_email}</p>
            {r.guest_universidad && <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}><GraduationCap size={16} /> {r.guest_universidad} — {r.guest_tipo_vinculo}</p>}
            {r.mensaje && <p style={{ fontSize: '0.95rem', fontStyle: 'italic', marginTop: 16, padding: 12, background: 'white', borderRadius: 8, border: '1px solid var(--border)' }}>"{r.mensaje}"</p>}
          </div>
          
          {r.estado === 'pendiente' && (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-danger" onClick={() => { pedirConfirmacion(r.id, 'rechazada'); }}><X size={16} /> Rechazar</button>
              <button className="btn btn-success" onClick={() => { pedirConfirmacion(r.id, 'aceptada'); }}><Check size={16} /> Aceptar</button>
            </div>
          )}
          {r.estado === 'aceptada' && (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8, flexWrap: 'wrap' }}>
              <button className="btn btn-primary" onClick={() => completarReserva(r.id)}><Check size={16} /> Marcar como completada</button>
            </div>
          )}
        </div>
      ))}
      
      {confirmModal.open && (
        <Modal
          open={confirmModal.open}
          type={confirmModal.estado === 'aceptada' ? 'success' : 'danger'}
          title={confirmModal.estado === 'aceptada' ? '¿Aceptar esta reserva?' : '¿Rechazar esta reserva?'}
          message={confirmModal.estado === 'aceptada'
            ? 'La solicitud pasará a estado aceptada y el huésped recibirá la confirmación.'
            : 'La solicitud pasará a estado rechazada y el huésped podrá buscar otra opción.'}
          confirmText={confirmModal.estado === 'aceptada' ? 'Sí, aceptar' : 'Sí, rechazar'}
          cancelText="Volver"
          loading={confirmModal.processing}
          onConfirm={confirmarCambioEstado}
          onCancel={() => setConfirmModal({ open: false, reservaId: null, estado: null, processing: false })}
        />
      )}
    </div>
  );
}
