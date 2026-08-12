import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, User, Award, List, Home, Bed, Sofa, Trees, Coins, Sparkles, HelpCircle, CheckCircle2, Star as StarIcon, MessageSquare, FileText } from 'lucide-react';
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
  return 'otro';
};

const TIPO_ICON = {
  cama: <Bed size={32} />,
  sofa: <Sofa size={32} />,
  hamaca: <Trees size={32} />,
  habitacion: <Home size={32} />,
  alquiler: <Coins size={32} />,
  otro: <HelpCircle size={32} />
};

const TIPO_ICON_SMALL = {
  cama: <Bed size={12} />,
  sofa: <Sofa size={12} />,
  hamaca: <Trees size={12} />,
  habitacion: <Home size={12} />,
  alquiler: <Coins size={12} />,
  otro: <HelpCircle size={12} />
};

const TIPO_THEMES = {
  cama: { gradient: 'linear-gradient(135deg, #3b82f6, #1d4ed8)' },
  sofa: { gradient: 'linear-gradient(135deg, #a855f7, #6b21a8)' },
  hamaca: { gradient: 'linear-gradient(135deg, #10b981, #047857)' },
  habitacion: { gradient: 'linear-gradient(135deg, #0d9488, #0f766e)' },
  alquiler: { gradient: 'linear-gradient(135deg, #f59e0b, #d97706)' },
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
                {(r.estado === 'aceptada' || r.estado === 'completada') && (
                  <button 
                    className="btn btn-outline btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderColor: '#0d7c3d', color: '#0d7c3d', fontWeight: 700 }}
                    onClick={() => {
                      const printWin = window.open('', '_blank');
                      const origin = window.location.origin;
                      const token = `HUASI-UCC-${r.id}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                      const fechaEmision = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
                      const fechaInicioFmt = new Date(r.fecha_inicio).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
                      const fechaFinFmt = new Date(r.fecha_fin).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });

                      printWin.document.write(`
                        <!DOCTYPE html>
                        <html lang="es">
                          <head>
                            <meta charset="UTF-8" />
                            <title>Comprobante Oficial HUASI UCC - ${token}</title>
                            <style>
                              @page { margin: 12mm; size: letter portrait; }
                              * { box-sizing: border-box; margin: 0; padding: 0; }
                              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #ffffff; color: #0f172a; line-height: 1.5; font-size: 12px; padding: 20px; }
                              .cert-box { max-width: 720px; margin: 0 auto; border: 2px solid #0d7c3d; padding: 28px; background: #ffffff; }
                              
                              .header-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; border-bottom: 2px solid #0d7c3d; padding-bottom: 12px; }
                              .header-table td { vertical-align: middle; }
                              .logo-img { max-height: 48px; max-width: 160px; width: auto; height: auto; object-fit: contain; }
                              .stamp-box { border: 1px solid #0d7c3d; background: #f0fdf4; padding: 8px 14px; text-align: right; border-radius: 4px; }
                              .stamp-title { font-size: 10px; font-weight: 800; color: #0d7c3d; text-transform: uppercase; letter-spacing: 0.5px; }
                              .stamp-sub { font-size: 9px; font-weight: 700; color: #047857; }

                              .title-block { text-align: center; margin: 16px 0 20px 0; }
                              .institution-name { font-size: 11px; font-weight: 800; color: #0d7c3d; text-transform: uppercase; letter-spacing: 1.2px; margin-bottom: 4px; }
                              .main-title { font-size: 19px; font-weight: 800; color: #0f172a; letter-spacing: -0.3px; text-transform: uppercase; }

                              .certification-text { background: #f8fafc; border-left: 4px solid #0d7c3d; padding: 12px 16px; font-size: 12px; color: #334155; margin-bottom: 20px; line-height: 1.5; }

                              .data-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 12px; }
                              .data-table th, .data-table td { border: 1px solid #cbd5e1; padding: 9px 12px; text-align: left; }
                              .data-table th { background: #f1f5f9; color: #475569; font-size: 10px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px; width: 35%; }
                              .data-table td { color: #0f172a; font-weight: 700; background: #ffffff; }
                              .highlight-val { color: #0d7c3d; font-weight: 800; }

                              .notice-box { background: #f0fdf4; border: 1px solid #bbf7d0; padding: 12px 16px; font-size: 11px; color: #166534; margin-bottom: 28px; border-radius: 4px; }

                              .signatures-table { width: 100%; border-collapse: collapse; margin-top: 32px; }
                              .signatures-table td { width: 50%; text-align: center; vertical-align: bottom; padding: 0 20px; }
                              .sig-line { border-top: 1px solid #64748b; width: 85%; margin: 0 auto 6px auto; }
                              .sig-name { font-size: 11px; font-weight: 800; color: #0f172a; }
                              .sig-role { font-size: 9.5px; color: #64748b; font-weight: 600; text-transform: uppercase; }

                              .footer-text { text-align: center; font-size: 10px; color: #94a3b8; margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 12px; }

                              .actions-bar { text-align: center; margin-top: 20px; }
                              .btn-print { background: #0d7c3d; color: #ffffff; border: none; padding: 10px 24px; font-size: 13px; font-weight: 800; border-radius: 4px; cursor: pointer; }

                              @media print {
                                body { padding: 0; background: #ffffff; }
                                .actions-bar { display: none !important; }
                                .cert-box { border: 2px solid #0d7c3d !important; padding: 20px !important; }
                              }
                            </style>
                          </head>
                          <body>
                            <div class="cert-box">
                              <table class="header-table">
                                <tr>
                                  <td>
                                    <img src="${origin}/huasi_logo.jpg" alt="HUASI UCC" class="logo-img" style="max-height: 44px; max-width: 150px; width: auto; height: auto; object-fit: contain; margin-right: 12px;" onerror="this.style.display='none'" />
                                    <img src="${origin}/indesco.png" alt="INDESCO" class="logo-img" style="max-height: 36px; max-width: 120px; width: auto; height: auto; object-fit: contain;" onerror="this.style.display='none'" />
                                  </td>
                                  <td style="text-align: right;">
                                    <div class="stamp-box">
                                      <div class="stamp-title">DOCUMENTO OFICIAL VERIFICADO</div>
                                      <div class="stamp-sub">RED SOLIDARIA HUASI UCC</div>
                                    </div>
                                  </td>
                                </tr>
                              </table>

                              <div class="title-block">
                                <div class="institution-name">UNIVERSIDAD COOPERATIVA DE COLOMBIA • INDESCO</div>
                                <h1 class="main-title">Comprobante de Hospedaje Universitario</h1>
                              </div>

                              <div class="certification-text">
                                El presente documento certificado acredita la asignación y confirmación de espacio de hospedaje solidario dentro de la red universitaria <strong>HUASI — Universidad Cooperativa de Colombia</strong>.
                              </div>

                              <table class="data-table">
                                <tr>
                                  <th>Código Token de Validación</th>
                                  <td class="highlight-val">${token}</td>
                                </tr>
                                <tr>
                                  <th>Alojamiento Confirmado</th>
                                  <td>${r.titulo}</td>
                                </tr>
                                <tr>
                                  <th>Anfitrión Responsable</th>
                                  <td>${r.host_nombre} ${r.host_apellido}</td>
                                </tr>
                                <tr>
                                  <th>Dirección / Ubicación</th>
                                  <td>${r.direccion || r.barrio}</td>
                                </tr>
                                <tr>
                                  <th>Fecha de Llegada</th>
                                  <td>${fechaInicioFmt}</td>
                                </tr>
                                <tr>
                                  <th>Fecha de Salida</th>
                                  <td>${fechaFinFmt}</td>
                                </tr>
                                <tr>
                                  <th>Motivo / Evento Académico</th>
                                  <td>${r.evento || 'Movilidad Académica / Evento UCC'}</td>
                                </tr>
                                <tr>
                                  <th>Estado de la Reserva</th>
                                  <td class="highlight-val">APROBADA Y CONFIRMADA</td>
                                </tr>
                              </table>

                              <div class="notice-box">
                                <strong>Soporte Institucional de Movilidad:</strong> Expedido como acreditación oficial de estadía universitaria intersedes para presentar ante facultades, direcciones de programa y vicerrectorías de la Universidad Cooperativa de Colombia.
                              </div>

                              <table class="signatures-table">
                                <tr>
                                  <td>
                                    <div class="sig-line"></div>
                                    <div class="sig-name">Coordinación Red HUASI</div>
                                    <div class="sig-role">Movilidad Universitaria UCC</div>
                                  </td>
                                  <td>
                                    <div class="sig-line"></div>
                                    <div class="sig-name">Dirección INDESCO</div>
                                    <div class="sig-role">Economía Solidaria UCC</div>
                                  </td>
                                </tr>
                              </table>

                              <div class="footer-text">
                                HUASI UCC • Universidad Cooperativa de Colombia e INDESCO • Generado el ${fechaEmision}
                              </div>
                            </div>

                            <div class="actions-bar">
                              <button class="btn-print" onclick="window.print()">Imprimir / Guardar como PDF</button>
                            </div>
                          </body>
                        </html>
                      `);
                      printWin.document.close();
                    }}
                  >
                    <FileText size={12} /> Comprobante PDF
                  </button>
                )}
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
