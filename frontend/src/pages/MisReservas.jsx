import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Calendar, User, Award, List, Home, Bed, Sofa, Trees, Coins, HelpCircle, CheckCircle2, Star as StarIcon, MessageSquare, FileText } from 'lucide-react';
import api from '../api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';
import { ReservationCardSkeleton } from '../components/SkeletonLoader';
import EmptyState from '../components/EmptyState';
import HuasiAlert from '../utils/alerts';

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
  const [fetchError, setFetchError] = useState(null);
  const [tab, setTab] = useState('todas');
  const toast = useToast();

  // Review modal state
  const [reviewModal, setReviewModal] = useState({ open: false, reservaId: null, calificacion: 5, comentario: '' });

  const loadReservas = () => {
    setLoading(true);
    setFetchError(null);
    api.get('/reservas/mis')
      .then(res => {
        if (Array.isArray(res.data)) {
          setReservas(res.data);
        } else if (res.data && Array.isArray(res.data.reservas)) {
          setReservas(res.data.reservas);
        } else {
          setReservas([]);
        }
      })
      .catch(err => {
        console.error('Error cargando reservas:', err);
        setFetchError(err.response?.data?.error || 'No se pudieron cargar tus reservas');
        setReservas([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReservas();
  }, []);

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Por definir';
    try {
      const cleanStr = String(dateStr).split('T')[0];
      const parts = cleanStr.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('es-CO', { year: 'numeric', month: 'short', day: 'numeric' });
        }
      }
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toLocaleDateString('es-CO');
      }
      return cleanStr;
    } catch {
      return String(dateStr);
    }
  };

  const isCompletedDate = (dateStr) => {
    if (!dateStr) return false;
    try {
      const cleanStr = String(dateStr).split('T')[0];
      const d = new Date(cleanStr + 'T23:59:59');
      return !isNaN(d.getTime()) && d < new Date();
    } catch {
      return false;
    }
  };

  const pedirCancelar = async (id) => {
    const confirmed = await HuasiAlert.confirm({
      title: '¿Cancelar esta reserva?',
      text: 'La habitación o espacio quedará nuevamente disponible para otros compañeros universitarios.',
      confirmText: 'Sí, cancelar reserva',
      cancelText: 'Mantener reserva',
      icon: 'warning',
    });

    if (confirmed) {
      try {
        await api.patch(`/reservas/${id}`, { estado: 'cancelada' });
        setReservas(r => (Array.isArray(r) ? r : []).map(res => res && res.id === id ? { ...res, estado: 'cancelada' } : res));
        HuasiAlert.success('Reserva cancelada', 'Tu solicitud de hospedaje ha sido cancelada correctamente.');
      } catch (err) {
        HuasiAlert.error('Error al cancelar', err.response?.data?.error || 'No se pudo cancelar la reserva');
      }
    }
  };

  const abrirModalReview = (id) => {
    setReviewModal({ open: true, reservaId: id, calificacion: 5, comentario: '' });
  };

  const completarReserva = async (id) => {
    try {
      await api.patch(`/reservas/${id}`, { estado: 'completada' });
      setReservas(r => (Array.isArray(r) ? r : []).map(res => res && res.id === id ? { ...res, estado: 'completada' } : res));
      HuasiAlert.success('Hospedaje completado', 'La reserva ha sido marcada como completada.');
    } catch (err) {
      HuasiAlert.error('Error', err.response?.data?.error || 'No se pudo completar la reserva');
    }
  };

  const enviarResena = async () => {
    try {
      await api.post('/resenas', {
        reserva_id: reviewModal.reservaId,
        calificacion: reviewModal.calificacion,
        comentario: reviewModal.comentario
      });
      HuasiAlert.success('¡Gracias por tu evaluación!', 'Tu testimonio ayuda a toda la comunidad universitaria.');
      setReviewModal({ open: false, reservaId: null, calificacion: 5, comentario: '' });
      loadReservas();
    } catch (err) {
      HuasiAlert.error('Error', err.response?.data?.error || 'No se pudo guardar tu evaluación');
    }
  };

  const safeReservas = Array.isArray(reservas) ? reservas.filter(Boolean) : [];
  const filtered = tab === 'todas' ? safeReservas : safeReservas.filter(r => r && r.estado === tab);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-4">
        <div className="h-8 w-40 bg-slate-200 dark:bg-slate-700 rounded-lg animate-pulse mb-6" />
        <div className="space-y-4">
          <ReservationCardSkeleton />
          <ReservationCardSkeleton />
          <ReservationCardSkeleton />
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="max-w-md mx-auto py-12">
        <EmptyState
          title="No se pudieron cargar tus reservas"
          description={fetchError}
          actionLabel="Reintentar"
          onAction={loadReservas}
        />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="font-heading font-black text-2xl md:text-3xl text-ucc-navy dark:text-white mb-6">Tus Viajes Solidarios</h1>

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
        <EmptyState
          icon={Calendar}
          title={`No tienes reservas ${tab !== 'todas' ? `con estado "${tab}"` : ''}`}
          description="Explora alojamientos solidarios de la comunidad UCC y solicita tu primera estadía."
          actionLabel="Explorar alojamientos"
          actionLink="/"
        />
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
                    {r.titulo || 'Alojamiento Universitario'}
                  </Link>
                </h3>
                <p><MapPin size={16} /> {r.barrio || r.direccion || 'Campus Universitario'}</p>
                <p><Calendar size={16} /> {formatDate(r.fecha_inicio)} — {formatDate(r.fecha_fin)}</p>
                <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={16} /> <span>Anfitrión: {r.host_nombre || ''} {r.host_apellido || ''}</span>
                  {r.host_id && (
                    <button 
                      className="btn btn-secondary btn-sm"
                      style={{ padding: '2px 8px', fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', gap: 4, height: 'auto', margin: 0, marginLeft: 8 }}
                      onClick={() => window.dispatchEvent(new CustomEvent('open-chat', { detail: { userId: r.host_id } }))}
                    >
                      <MessageSquare size={12} /> Chatear
                    </button>
                  )}
                </p>
                {r.evento && <p><Award size={16} /> {r.evento}</p>}
              </div>
              <div className="list-card-actions" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                <span className={`badge badge-${r.estado || 'pendiente'}`}>{STATUS_LABELS[r.estado] || r.estado || 'Pendiente'}</span>
                {(r.estado === 'aceptada' || r.estado === 'completada') && (
                  <button 
                    className="btn btn-outline btn-sm"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4, borderColor: '#0d7c3d', color: '#0d7c3d', fontWeight: 700 }}
                    onClick={() => {
                      const printWin = window.open('', '_blank');
                      const origin = window.location.origin;
                      const token = `HUASI-UCC-${r.id}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
                      const fechaEmision = new Date().toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
                      const fechaInicioFmt = formatDate(r.fecha_inicio);
                      const fechaFinFmt = formatDate(r.fecha_fin);

                      printWin.document.write(`
                        <!DOCTYPE html>
                        <html lang="es">
                          <head>
                            <meta charset="UTF-8" />
                            <title>Comprobante Oficial HUASI UCC - ${token}</title>
                            <style>
                              @page { margin: 14mm 16mm; size: letter portrait; }
                              * { box-sizing: border-box; margin: 0; padding: 0; }
                              body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #ffffff; color: #0f172a; line-height: 1.5; font-size: 12px; }

                              .cert-wrap { max-width: 740px; margin: 0 auto; border: 2px solid #0d7c3d; background: #ffffff; }

                              .accred-strip {
                                background: #0d7c3d; color: #ffffff;
                                display: flex; align-items: center; justify-content: space-between;
                                padding: 7px 20px; font-size: 9px; font-weight: 800;
                                letter-spacing: 0.9px; text-transform: uppercase;
                              }
                              .accred-strip .left { display: flex; align-items: center; gap: 10px; }
                              .accred-strip .badge {
                                background: rgba(255,255,255,0.18); border: 1px solid rgba(255,255,255,0.4);
                                padding: 2px 10px; border-radius: 3px; font-size: 8.5px; letter-spacing: 0.8px;
                              }
                              .accred-strip .token-code {
                                font-family: 'Courier New', monospace; font-size: 9px;
                                font-weight: 700; opacity: 0.92; letter-spacing: 1.2px;
                              }

                              .inst-header {
                                display: flex; align-items: center; justify-content: space-between;
                                padding: 16px 22px 14px; border-bottom: 2px solid #0d7c3d; gap: 16px;
                              }
                              .logos-left { display: flex; align-items: center; gap: 14px; }
                              .logo-divider { width: 1px; height: 30px; background: #cbd5e1; }
                              .logo-img { object-fit: contain; display: block; }
                              .logo-ucc { height: 34px; max-width: 120px; }
                              .logo-territorios { height: 38px; max-width: 42px; }
                              .logo-indesco { height: 30px; max-width: 110px; }
                              .logo-huasi { height: 36px; max-width: 36px; }
                              .stamp-box {
                                border: 1.5px solid #0d7c3d; background: #f0fdf4;
                                padding: 6px 14px; border-radius: 4px; text-align: right;
                              }
                              .stamp-title { font-size: 9.5px; font-weight: 900; color: #0d7c3d; text-transform: uppercase; letter-spacing: 0.8px; }
                              .stamp-sub { font-size: 8.5px; font-weight: 700; color: #047857; margin-top: 1px; }

                              .title-block {
                                text-align: center; padding: 18px 22px 14px;
                                border-bottom: 1px solid #e2e8f0; position: relative;
                              }
                              .watermark {
                                position: absolute; top: 50%; left: 50%;
                                transform: translate(-50%,-50%);
                                font-size: 64px; font-weight: 900;
                                color: rgba(13,124,61,0.04); letter-spacing: 6px;
                                text-transform: uppercase; pointer-events: none;
                                user-select: none; white-space: nowrap;
                              }
                              .institution-name {
                                font-size: 10px; font-weight: 900; color: #0d7c3d;
                                text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 5px;
                              }
                              .main-title { font-size: 20px; font-weight: 900; color: #0f172a; letter-spacing: -0.4px; text-transform: uppercase; }
                              .main-subtitle { font-size: 10.5px; color: #475569; font-weight: 600; margin-top: 3px; }

                              .doc-body { padding: 18px 22px; }

                              .certification-text {
                                background: #f8fafc; border-left: 4px solid #0d7c3d;
                                padding: 11px 15px; font-size: 11.5px; color: #334155;
                                margin-bottom: 18px; line-height: 1.6;
                              }

                              .data-table { width: 100%; border-collapse: collapse; margin-bottom: 18px; font-size: 11.5px; }
                              .data-table th, .data-table td { border: 1px solid #cbd5e1; padding: 9px 13px; text-align: left; }
                              .data-table th {
                                background: #f1f5f9; color: #475569; font-size: 9.5px;
                                text-transform: uppercase; font-weight: 900; letter-spacing: 0.6px; width: 36%;
                              }
                              .data-table td { color: #0f172a; font-weight: 700; background: #ffffff; }
                              .val-green { color: #0d7c3d; font-weight: 900; }
                              .val-status { display: inline-flex; align-items: center; gap: 6px; color: #065f46; font-weight: 900; font-size: 12px; }
                              .status-dot { width: 8px; height: 8px; border-radius: 50%; background: #0d7c3d; display: inline-block; flex-shrink: 0; }

                              .notice-box {
                                background: #f0fdf4; border: 1px solid #86efac;
                                padding: 11px 15px; font-size: 11px; color: #14532d;
                                margin-bottom: 24px; border-radius: 4px; line-height: 1.5;
                              }

                              .signatures-row { display: table; width: 100%; border-collapse: collapse; margin-top: 28px; }
                              .sig-cell { display: table-cell; width: 50%; text-align: center; padding: 0 24px; vertical-align: bottom; }
                              .sig-line { border-top: 1.5px solid #64748b; width: 82%; margin: 0 auto 7px auto; }
                              .sig-name { font-size: 11.5px; font-weight: 900; color: #0f172a; }
                              .sig-role { font-size: 9.5px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 1px; }

                              .footer-logos {
                                display: flex; align-items: center; justify-content: center;
                                gap: 12px; padding: 10px 22px 0; border-top: 1px solid #e2e8f0; margin-top: 20px;
                              }
                              .footer-logo-divider { width: 1px; height: 18px; background: #cbd5e1; }
                              .footer-logo { object-fit: contain; opacity: 0.65; }
                              .footer-text {
                                text-align: center; font-size: 9.5px; color: #94a3b8;
                                margin-top: 8px; padding: 8px 22px 14px; letter-spacing: 0.3px;
                              }

                              .actions-bar { text-align: center; margin: 20px 0 4px; }
                              .btn-print {
                                background: #0d7c3d; color: #ffffff; border: none;
                                padding: 11px 28px; font-size: 13px; font-weight: 800;
                                border-radius: 5px; cursor: pointer; letter-spacing: 0.3px;
                              }
                              .btn-print:hover { background: #0a6432; }
                              @media print {
                                body { background: #ffffff; }
                                .actions-bar { display: none !important; }
                              }
                            </style>
                          </head>
                          <body>
                            <div class="cert-wrap">

                              <div class="accred-strip">
                                <div class="left">
                                  <span>Red Solidaria HUASI</span>
                                  <span class="badge">Documento Oficial Verificado</span>
                                  <span class="badge">Movilidad Universitaria Intersedes</span>
                                </div>
                                <span class="token-code">${token}</span>
                              </div>

                              <div class="inst-header">
                                <div class="logos-left">
                                  <img src="${origin}/huasi-monograma.png" alt="HUASI" class="logo-img logo-huasi" onerror="this.style.display='none'" />
                                  <div class="logo-divider"></div>
                                  <img src="${origin}/ucc_logo.png" alt="Universidad Cooperativa de Colombia" class="logo-img logo-ucc" onerror="this.style.display='none'" />
                                  <div class="logo-divider"></div>
                                  <img src="${origin}/territorios_solidarios.png" alt="Territorios Solidarios" class="logo-img logo-territorios" onerror="this.style.display='none'" />
                                  <div class="logo-divider"></div>
                                  <img src="${origin}/indesco.png" alt="INDESCO" class="logo-img logo-indesco" onerror="this.style.display='none'" />
                                </div>
                                <div>
                                  <div class="stamp-box">
                                    <div class="stamp-title">Documento Oficial Verificado</div>
                                    <div class="stamp-sub">Red Solidaria HUASI &mdash; UCC</div>
                                  </div>
                                </div>
                              </div>

                              <div class="title-block">
                                <div class="watermark">HUASI</div>
                                <div class="institution-name">HUASI &bull; Red de Hospedaje Solidario Universitario &bull; INDESCO &bull; UCC</div>
                                <h1 class="main-title">Comprobante de Hospedaje Universitario</h1>
                                <div class="main-subtitle">Acreditaci&oacute;n Oficial de Estad&iacute;a Universitaria Intersedes</div>
                              </div>

                              <div class="doc-body">
                                <div class="certification-text">
                                  El presente documento certificado acredita la asignaci&oacute;n y confirmaci&oacute;n de espacio de hospedaje solidario dentro de la red universitaria <strong>HUASI &mdash; Hospedaje Solidario</strong>, gestionado por el Instituto de Econom&iacute;a Social y Solidaria <strong>INDESCO</strong> de la <strong>Universidad Cooperativa de Colombia</strong>.
                                </div>

                                <table class="data-table">
                                  <tr><th>C&oacute;digo de Validaci&oacute;n</th><td class="val-green">${token}</td></tr>
                                  <tr><th>Alojamiento Confirmado</th><td>${r.titulo || 'Alojamiento Solidario'}</td></tr>
                                  <tr><th>Anfitri&oacute;n Responsable</th><td>${r.host_nombre || ''} ${r.host_apellido || ''}</td></tr>
                                  <tr><th>Direcci&oacute;n / Ubicaci&oacute;n</th><td>${r.direccion || r.barrio || 'Sede Universitaria'}</td></tr>
                                  <tr><th>Fecha de Llegada</th><td>${fechaInicioFmt}</td></tr>
                                  <tr><th>Fecha de Salida</th><td>${fechaFinFmt}</td></tr>
                                  <tr><th>Motivo / Evento Acad&eacute;mico</th><td>${r.evento || 'Movilidad Acad&eacute;mica / Evento Universitario'}</td></tr>
                                  <tr>
                                    <th>Estado de la Reserva</th>
                                    <td><span class="val-status"><span class="status-dot"></span>APROBADA Y CONFIRMADA</span></td>
                                  </tr>
                                  <tr><th>Fecha de Emisi&oacute;n</th><td>${fechaEmision}</td></tr>
                                </table>

                                <div class="notice-box">
                                  <strong>Soporte Institucional de Movilidad:</strong> Expedido como acreditaci&oacute;n oficial de estad&iacute;a universitaria intersedes. V&aacute;lido para presentar ante facultades, direcciones de programa, vicerrector&iacute;as y dependencias acad&eacute;mico-administrativas de la Universidad Cooperativa de Colombia.
                                </div>

                                <div class="signatures-row">
                                  <div class="sig-cell">
                                    <div class="sig-line"></div>
                                    <div class="sig-name">${r.host_nombre || 'Anfitri&oacute;n'} ${r.host_apellido || ''}</div>
                                    <div class="sig-role">Anfitri&oacute;n Solidario &mdash; UCC</div>
                                  </div>
                                  <div class="sig-cell">
                                    <div class="sig-line"></div>
                                    <div class="sig-name">Coordinaci&oacute;n Red HUASI</div>
                                    <div class="sig-role">INDESCO &mdash; Movilidad Universitaria</div>
                                  </div>
                                </div>
                              </div>

                              <div class="footer-logos">
                                <img src="${origin}/ucc_logo.png" alt="UCC" class="footer-logo" style="height:18px;max-width:80px;" onerror="this.style.display='none'" />
                                <div class="footer-logo-divider"></div>
                                <img src="${origin}/territorios_solidarios.png" alt="Territorios" class="footer-logo" style="height:22px;max-width:26px;" onerror="this.style.display='none'" />
                                <div class="footer-logo-divider"></div>
                                <img src="${origin}/indesco.png" alt="INDESCO" class="footer-logo" style="height:16px;max-width:80px;" onerror="this.style.display='none'" />
                              </div>
                              <div class="footer-text">
                                HUASI &bull; Red de Hospedaje Solidario Universitario &bull; INDESCO &bull; Universidad Cooperativa de Colombia &bull; Generado el ${fechaEmision}
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
                {r.estado === 'aceptada' && isCompletedDate(r.fecha_fin) && (
                  <button className="btn btn-success btn-sm" onClick={() => completarReserva(r.id)}>Marcar como completada</button>
                )}
                {r.estado === 'completada' && (
                  <button className="btn btn-primary btn-sm" onClick={() => abrirModalReview(r.id)}>Dejar reseña</button>
                )}
                {(r.estado === 'pendiente' || r.estado === 'aceptada') && (
                  <button className="btn btn-secondary btn-sm" style={{ color: '#ef4444', borderColor: '#fca5a5' }} onClick={() => pedirCancelar(r.id)}>
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          );
        })
      )}

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
