import { useState, useEffect } from 'react';
import { 
  ShieldAlert, 
  CheckCircle, 
  Ban, 
  AlertTriangle, 
  User, 
  Calendar, 
  Info,
  ChevronDown,
  CheckCircle2,
  FileText,
  Download
} from 'lucide-react';
import api from '../api';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

export default function Reportes({ onActionFinished }) {
  const [reportes, setReportes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('todos'); // 'todos', 'pendiente', 'resuelto'
  const { showToast } = useToast();

  // Estados para Modal de Resolver Reporte
  const [isResolveModalOpen, setIsResolveModalOpen] = useState(false);
  const [resolveReportId, setResolveReportId] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [submittingResolve, setSubmittingResolve] = useState(false);

  // Estados para Modal de Bloqueo
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockUserId, setBlockUserId] = useState(null);
  const [blockUserEmail, setBlockUserEmail] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockError, setBlockError] = useState('');
  const [submittingBlock, setSubmittingBlock] = useState(false);

  // Estados para Modal de Eliminar Propiedad
  const [isDeletePropModalOpen, setIsDeletePropModalOpen] = useState(false);
  const [deletePropId, setDeletePropId] = useState(null);
  const [deletePropTitle, setDeletePropTitle] = useState('');
  const [submittingDeleteProp, setSubmittingDeleteProp] = useState(false);

  useEffect(() => {
    fetchReportes();
  }, []);

  const fetchReportes = async () => {
    try {
      const res = await api.get('/reportes');
      setReportes(res.data);
    } catch (err) {
      console.error(err);
      setError('Error al obtener la lista de reportes');
      showToast('Error al obtener la lista de reportes', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Resolver Reporte
  const openResolveModal = (id) => {
    setResolveReportId(id);
    setAdminNotes('');
    setIsResolveModalOpen(true);
  };

  const handleResolveConfirm = async () => {
    setSubmittingResolve(true);
    try {
      const res = await api.patch(`/reportes/${resolveReportId}`, {
        estado: 'resuelto',
        notes_admin: adminNotes.trim()
      });

      setReportes(prev => prev.map(r => r.id === resolveReportId ? { 
        ...r, 
        estado: res.data.estado, 
        notas_admin: res.data.notas_admin,
        revisado_por: res.data.revisado_por
      } : r));

      setIsResolveModalOpen(false);
      showToast('Reporte marcado como resuelto', 'success');
      if (onActionFinished) onActionFinished();
      fetchReportes(); // Refrescar reporte completo
    } catch (err) {
      console.error(err);
      showToast('Error al resolver el reporte', 'error');
    } finally {
      setSubmittingResolve(false);
    }
  };

  // Bloquear Usuario Acusado
  const openBlockModal = (report) => {
    setBlockUserId(report.reportado_id);
    setBlockUserEmail(report.reportado_email);
    setBlockReason('');
    setBlockError('');
    setIsBlockModalOpen(true);
  };

  const handleBlockConfirm = async () => {
    setBlockError('');

    if (!blockReason.trim()) {
      setBlockError('Debes ingresar un motivo para suspender al usuario.');
      return;
    }
    if (blockReason.trim().length < 5) {
      setBlockError('El motivo debe tener al menos 5 caracteres.');
      return;
    }

    setSubmittingBlock(true);
    try {
      await api.patch(`/auth/admin/usuarios/${blockUserId}/bloquear`, {
        bloqueado: true,
        motivo_bloqueo: blockReason.trim()
      });
      
      setIsBlockModalOpen(false);
      showToast('Usuario bloqueado con éxito. Se inhabilitó su cuenta.', 'success');
      if (onActionFinished) onActionFinished();
      fetchReportes();
    } catch (err) {
      console.error(err);
      showToast('Error al bloquear al usuario', 'error');
    } finally {
      setSubmittingBlock(false);
    }
  };

  // Eliminar Propiedad Reportada
  const openDeletePropModal = (propId, propTitle) => {
    setDeletePropId(propId);
    setDeletePropTitle(propTitle);
    setIsDeletePropModalOpen(true);
  };

  const handleDeletePropConfirm = async () => {
    setSubmittingDeleteProp(true);
    try {
      await api.delete(`/propiedades/${deletePropId}`);
      setIsDeletePropModalOpen(false);
      showToast('Publicación de alojamiento eliminada con éxito', 'success');
      if (onActionFinished) onActionFinished();
      fetchReportes(); // Refrescar reporte completo
    } catch (err) {
      console.error(err);
      showToast('Error al eliminar la publicación del alojamiento', 'error');
    } finally {
      setSubmittingDeleteProp(false);
    }
  };

  const handleExportCSV = () => {
    if (reportes.length === 0) {
      showToast('No hay reportes para exportar', 'warning');
      return;
    }

    const headers = ['ID', 'Tipo Reporte', 'Estado', 'Motivo / Descripcion', 'Reportante', 'Email Reportante', 'Reportado', 'Email Reportado', 'Propiedad Titulo', 'Fecha Registro', 'Notas Administrador', 'Revisado Por'];
    
    const rows = reportes.map(r => [
      r.id,
      `"${(r.tipo || 'convivencia').replace(/"/g, '""')}"`,
      r.estado || 'pendiente',
      `"${(r.descripcion || r.motivo || '').replace(/"/g, '""')}"`,
      `"${(`${r.reportante_nombre || ''} ${r.reportante_apellido || ''}`).trim().replace(/"/g, '""')}"`,
      r.reportante_email || '',
      `"${(`${r.reportado_nombre || ''} ${r.reportado_apellido || ''}`).trim().replace(/"/g, '""')}"`,
      r.reportado_email || '',
      `"${(r.propiedad_titulo || 'N/A').replace(/"/g, '""')}"`,
      r.created_at ? new Date(r.created_at).toLocaleDateString() : 'N/A',
      `"${(r.notas_admin || '').replace(/"/g, '""')}"`,
      `"${(r.revisado_por || 'Comision UCC').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(row => row.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_PQRs_HUASI_UCC_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Reporte exportado exitosamente', 'success');
  };

  const filteredReportes = reportes.filter(r => {
    if (filtro === 'todos') return true;
    return r.estado === filtro;
  });

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 12, letterSpacing: '-0.5px', margin: 0 }}>
          <ShieldAlert size={30} color="var(--danger)" /> PQRs y Reportes de Convivencia
        </h2>

        {/* Filtro y Botón Exportar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Filtrar por:</span>
          <select 
            className="form-control" 
            value={filtro}
            onChange={(e) => setFiltro(e.target.value)}
            style={{ width: '150px', height: '38px', padding: '0 12px', background: 'var(--bg-surface)', fontSize: '0.85rem' }}
          >
            <option value="todos">Todos</option>
            <option value="pendiente">Pendientes</option>
            <option value="resuelto">Resueltos</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="btn btn-secondary"
            style={{
              height: 38,
              padding: '0 16px',
              fontSize: '0.85rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              borderRadius: 8,
              border: '1px solid var(--border)',
              background: 'white',
              cursor: 'pointer',
              fontWeight: 700
            }}
            title="Exportar PQRs a formato CSV compatible con Excel"
          >
            <Download size={15} className="text-ucc-green" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 24 }}>
          <AlertTriangle size={18} />
          <span>{error}</span>
        </div>
      )}

      {filteredReportes.length === 0 ? (
        <div className="card" style={{ 
          textAlign: 'center', 
          padding: 56, 
          border: '2px dashed var(--border)', 
          background: 'rgba(17, 24, 39, 0.3)',
          boxShadow: 'none'
        }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            background: 'var(--success-bg)', 
            color: 'var(--success)', 
            borderRadius: '50%', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            margin: '0 auto 20px' 
          }}>
            <CheckCircle2 size={32} />
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 8, color: 'var(--text)' }}>
            Sin PQRs {filtro !== 'todos' ? `(${filtro}s)` : ''}
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>La comunidad HUASI se comporta adecuadamente.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 24 }}>
          {filteredReportes.map(r => (
            <div key={r.id} className="card" style={{ 
              borderLeft: `6px solid ${r.estado === 'pendiente' ? 'var(--danger)' : 'var(--primary)'}`,
              background: 'var(--bg-surface)'
            }}>
              {/* Header de la Tarjeta */}
              <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 20, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span className={`badge ${r.estado === 'pendiente' ? 'badge-danger' : 'badge-success'}`}>
                    {r.estado}
                  </span>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Calendar size={14} /> Reportado el {new Date(r.created_at).toLocaleDateString('es-CO')}
                  </span>
                </div>
                
                {r.estado === 'pendiente' && (
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button 
                      className="btn btn-success" 
                      onClick={() => openResolveModal(r.id)} 
                      style={{ fontSize: '0.82rem', padding: '8px 14px', borderRadius: 8 }}
                    >
                      <CheckCircle size={14} /> Resolver Caso
                    </button>
                    <button 
                      className="btn btn-danger" 
                      onClick={() => openBlockModal(r)} 
                      style={{ fontSize: '0.82rem', padding: '8px 14px', borderRadius: 8 }}
                    >
                      <Ban size={14} /> Bloquear Acusado
                    </button>
                  </div>
                )}
              </div>

              {/* Informantes / Acusados Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16, marginBottom: 20 }}>
                {/* Demandante */}
                <div style={{ background: 'var(--bg-surface-hover)', padding: 16, borderRadius: 10, border: '1px solid var(--border)' }}>
                  <strong style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
                    Reportante (Demandante)
                  </strong>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem' }}>{r.reportador_nombre} {r.reportador_apellido}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{r.reportador_email}</div>
                </div>

                {/* Acusado */}
                <div style={{ background: 'var(--danger-bg)', padding: 16, borderRadius: 10, border: '1px solid rgba(239, 68, 68, 0.15)' }}>
                  <strong style={{ fontSize: '0.72rem', color: 'var(--danger)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
                    Reportado (Acusado)
                  </strong>
                  <div style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '0.95rem' }}>{r.reportado_nombre} {r.reportado_apellido}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--danger)', opacity: 0.8, marginTop: 2 }}>{r.reportado_email}</div>
                </div>

                {/* Publicación */}
                {r.propiedad_titulo && (
                  <div style={{ 
                    background: 'var(--bg-surface-hover)', 
                    padding: 16, 
                    borderRadius: 10, 
                    border: '1px solid var(--border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: 12
                  }}>
                    <div>
                      <strong style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
                        Publicación Asociada
                      </strong>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                        <FileText size={14} color="var(--primary)" /> {r.propiedad_titulo}
                      </div>
                    </div>
                    {r.estado === 'pendiente' && (
                      <button 
                        className="btn btn-danger" 
                        onClick={() => openDeletePropModal(r.propiedad_id, r.propiedad_titulo)}
                        style={{ fontSize: '0.75rem', padding: '6px 12px', borderRadius: 6 }}
                      >
                        Eliminar Alojamiento
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Contenido de la PQR */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div>
                  <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <AlertTriangle size={15} color="var(--warning)" /> Motivo de la PQR:
                  </span>
                  <div style={{ background: 'var(--bg-surface-hover)', padding: '12px 16px', borderRadius: 8, border: '1px solid var(--border)', fontWeight: 600, color: 'var(--text)' }}>
                    {r.motivo}
                  </div>
                </div>

                {r.descripcion && (
                  <div>
                    <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>
                      Descripción Detallada:
                    </span>
                    <p style={{ margin: 0, padding: '14px 18px', background: 'var(--bg-surface-hover)', borderRadius: 8, border: '1px solid var(--border)', whiteSpace: 'pre-line', color: 'var(--text)', fontSize: '0.92rem', lineHeight: 1.5 }}>
                      {r.descripcion}
                    </p>
                  </div>
                )}

                {/* Notas Administrativas Existentes */}
                {r.notas_admin && (
                  <div style={{ 
                    background: 'rgba(0, 152, 205, 0.05)', 
                    border: '1px solid rgba(0, 152, 205, 0.2)', 
                    padding: 16, 
                    borderRadius: 8, 
                    marginTop: 4 
                  }}>
                    <strong style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.88rem' }}>
                      <Info size={15} /> Notas del Administrador (Resolución):
                    </strong>
                    <p style={{ margin: 0, marginTop: 6, fontSize: '0.88rem', color: 'var(--text)', lineHeight: 1.5, opacity: 0.9 }}>
                      {r.notas_admin}
                    </p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para Resolver PQR */}
      <Modal
        isOpen={isResolveModalOpen}
        onClose={() => setIsResolveModalOpen(false)}
        title="Resolver PQR de Comportamiento"
        type="success"
        footer={
          <>
            <button 
              className="btn" 
              onClick={() => setIsResolveModalOpen(false)}
              style={{ background: 'transparent', color: 'var(--text-muted)' }}
              disabled={submittingResolve}
            >
              Cancelar
            </button>
            <button 
              className="btn btn-success" 
              onClick={handleResolveConfirm}
              disabled={submittingResolve}
            >
              {submittingResolve ? 'Guardando...' : 'Marcar como Resuelto'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
            Indica las acciones que has tomado para resolver esta PQR (ej. se contactó al estudiante por correo, etc.). Las notas quedarán registradas en el reporte.
          </p>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="adminNotes">Notas Administrativas (Opcional)</label>
            <textarea
              id="adminNotes"
              className="form-control"
              placeholder="Ej. Caso aclarado con ambas partes por correo. Se ha hecho una advertencia formal al acusado."
              rows={4}
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              style={{ resize: 'none', fontFamily: 'var(--font)' }}
              disabled={submittingResolve}
            />
          </div>
        </div>
      </Modal>

      {/* Modal para Bloquear Usuario Acusado */}
      <Modal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        title="Bloquear Usuario Reportado"
        type="danger"
        footer={
          <>
            <button 
              className="btn" 
              onClick={() => setIsBlockModalOpen(false)}
              style={{ background: 'transparent', color: 'var(--text-muted)' }}
              disabled={submittingBlock}
            >
              Cancelar
            </button>
            <button 
              className="btn btn-danger" 
              onClick={handleBlockConfirm}
              disabled={submittingBlock}
            >
              {submittingBlock ? 'Bloqueando...' : 'Confirmar Suspensión'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ 
            background: 'var(--danger-bg)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            padding: '16px 20px', 
            borderRadius: '10px',
            display: 'flex',
            gap: 12,
            color: 'var(--danger)'
          }}>
            <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.88rem', lineHeight: 1.5 }}>
              <strong>Acción Destructiva:</strong> Estás a punto de suspender permanentemente la cuenta de <strong>{blockUserEmail}</strong> debido a esta PQR. Perderá el acceso de inmediato a la plataforma HUASI.
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="reportBlockReason">Motivo de Suspensión (Obligatorio)</label>
            <textarea
              id="reportBlockReason"
              className="form-control"
              placeholder="Ej. Violación de normas de convivencia: comportamiento inapropiado reportado en el alojamiento."
              rows={4}
              value={blockReason}
              onChange={(e) => {
                setBlockReason(e.target.value);
                if (blockError) setBlockError('');
              }}
              style={{ resize: 'none', fontFamily: 'var(--font)' }}
              disabled={submittingBlock}
            />
            {blockError && (
              <span style={{ 
                color: 'var(--danger)', 
                fontSize: '0.8rem', 
                fontWeight: 600, 
                display: 'flex', 
                alignItems: 'center', 
                gap: 4, 
                marginTop: 6 
              }}>
                <AlertTriangle size={12} /> {blockError}
              </span>
            )}
          </div>
        </div>
      </Modal>

      {/* Modal para Eliminar Publicación de Alojamiento */}
      <Modal
        isOpen={isDeletePropModalOpen}
        onClose={() => setIsDeletePropModalOpen(false)}
        title="Eliminar Publicación de Alojamiento"
        type="danger"
        footer={
          <>
            <button 
              className="btn" 
              onClick={() => setIsDeletePropModalOpen(false)}
              style={{ background: 'transparent', color: 'var(--text-muted)' }}
              disabled={submittingDeleteProp}
            >
              Cancelar
            </button>
            <button 
              className="btn btn-danger" 
              onClick={handleDeletePropConfirm}
              disabled={submittingDeleteProp}
            >
              {submittingDeleteProp ? 'Eliminando...' : 'Eliminar Publicación'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ 
            background: 'var(--danger-bg)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            padding: '16px 20px', 
            borderRadius: '10px',
            display: 'flex',
            gap: 12,
            color: 'var(--danger)'
          }}>
            <AlertTriangle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.88rem', lineHeight: 1.5 }}>
              <strong>Acción Irreversible:</strong> Estás a punto de dar de baja el alojamiento <strong>"{deletePropTitle}"</strong> de forma permanente debido a reportes de comportamiento indebido o infracción. Se ocultará de las búsquedas y se cancelarán reservas asociadas.
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
            ¿Estás seguro de que deseas eliminar este alojamiento solidario del sistema?
          </p>
        </div>
      </Modal>
    </div>
  );
}
