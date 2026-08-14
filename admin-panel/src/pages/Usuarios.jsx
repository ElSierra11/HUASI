import { useState, useEffect } from 'react';
import { 
  UserCheck, 
  ShieldAlert, 
  CheckCircle, 
  AlertCircle, 
  Ban, 
  Unlock, 
  Mail, 
  Phone, 
  MapPin, 
  AlertTriangle, 
  ShieldCheck,
  Search,
  Trash2,
  KeyRound,
  Copy,
  CheckCheck
} from 'lucide-react';
import api from '../api';
import Modal from '../components/Modal';
import { useToast } from '../components/Toast';

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const { showToast } = useToast();

  // Estados para Modal de Bloqueo
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockUserId, setBlockUserId] = useState(null);
  const [blockUserEmail, setBlockUserEmail] = useState('');
  const [blockReason, setBlockReason] = useState('');
  const [blockError, setBlockError] = useState('');
  const [submittingBlock, setSubmittingBlock] = useState(false);

  // Estados para Modal de Desbloqueo
  const [isUnblockModalOpen, setIsUnblockModalOpen] = useState(false);
  const [unblockUserId, setUnblockUserId] = useState(null);
  const [unblockUserEmail, setUnblockUserEmail] = useState('');
  const [submittingUnblock, setSubmittingUnblock] = useState(false);

  // Estados para Modal de Eliminar
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteUserId, setDeleteUserId] = useState(null);
  const [deleteUserEmail, setDeleteUserEmail] = useState('');
  const [submittingDelete, setSubmittingDelete] = useState(false);

  // Estados para Modal de Reset de Contraseña
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [resetUserId, setResetUserId] = useState(null);
  const [resetUserEmail, setResetUserEmail] = useState('');
  const [submittingReset, setSubmittingReset] = useState(false);
  const [resetResult, setResetResult] = useState(null); // { nueva_password, usuario_email }
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchUsuarios();
  }, []);

  const fetchUsuarios = async () => {
    try {
      const res = await api.get('/auth/admin/usuarios');
      setUsuarios(res.data);
    } catch (err) {
      console.error(err);
      setError('Error al obtener la lista de usuarios');
      showToast('Error al cargar la lista de usuarios', 'error');
    } finally {
      setLoading(false);
    }
  };

  const openBlockModal = (user) => {
    setBlockUserId(user.id);
    setBlockUserEmail(user.email);
    setBlockReason('');
    setBlockError('');
    setIsBlockModalOpen(true);
  };

  const handleBlockConfirm = async () => {
    setBlockError('');

    if (!blockReason.trim()) {
      setBlockError('Debes indicar un motivo para bloquear al usuario.');
      return;
    }
    if (blockReason.trim().length < 5) {
      setBlockError('El motivo debe tener al menos 5 caracteres.');
      return;
    }

    setSubmittingBlock(true);
    try {
      const res = await api.patch(`/auth/admin/usuarios/${blockUserId}/bloquear`, {
        bloqueado: true,
        motivo_bloqueo: blockReason.trim()
      });

      setUsuarios(prev => prev.map(u => u.id === blockUserId ? { 
        ...u, 
        bloqueado: res.data.bloqueado, 
        motivo_bloqueo: res.data.motivo_bloqueo, 
        bloqueado_en: res.data.bloqueado_en 
      } : u));

      setIsBlockModalOpen(false);
      showToast('Usuario bloqueado con éxito', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al bloquear al usuario', 'error');
    } finally {
      setSubmittingBlock(false);
    }
  };

  const openUnblockModal = (user) => {
    setUnblockUserId(user.id);
    setUnblockUserEmail(user.email);
    setIsUnblockModalOpen(true);
  };

  const handleUnblockConfirm = async () => {
    setSubmittingUnblock(true);
    try {
      const res = await api.patch(`/auth/admin/usuarios/${unblockUserId}/bloquear`, {
        bloqueado: false,
        motivo_bloqueo: null
      });

      setUsuarios(prev => prev.map(u => u.id === unblockUserId ? { 
        ...u, 
        bloqueado: res.data.bloqueado, 
        motivo_bloqueo: res.data.motivo_bloqueo, 
        bloqueado_en: res.data.bloqueado_en 
      } : u));

      setIsUnblockModalOpen(false);
      showToast('Usuario desbloqueado con éxito', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al desbloquear al usuario', 'error');
    } finally {
      setSubmittingUnblock(false);
    }
  };

  // Abrir modal eliminar
  const openDeleteModal = (user) => {
    setDeleteUserId(user.id);
    setDeleteUserEmail(user.email);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setSubmittingDelete(true);
    try {
      await api.delete(`/auth/admin/usuarios/${deleteUserId}`);
      setUsuarios(prev => prev.filter(u => u.id !== deleteUserId));
      setIsDeleteModalOpen(false);
      showToast('Cuenta eliminada permanentemente', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Error al eliminar la cuenta', 'error');
    } finally {
      setSubmittingDelete(false);
    }
  };

  // Abrir modal reset password
  const openResetModal = (user) => {
    setResetUserId(user.id);
    setResetUserEmail(user.email);
    setResetResult(null);
    setCopied(false);
    setIsResetModalOpen(true);
  };

  const handleResetConfirm = async () => {
    setSubmittingReset(true);
    try {
      const res = await api.post(`/auth/admin/usuarios/${resetUserId}/reset-password`);
      setResetResult(res.data);
      showToast('Contraseña reseteada con éxito', 'success');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.error || 'Error al resetear la contraseña', 'error');
    } finally {
      setSubmittingReset(false);
    }
  };

  const handleCopyPassword = () => {
    if (resetResult?.nueva_password) {
      navigator.clipboard.writeText(resetResult.nueva_password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const filteredUsuarios = usuarios.filter(u => {
    const searchString = `${u.nombre} ${u.apellido} ${u.email} ${u.campus || ''}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 12, letterSpacing: '-0.5px', margin: 0 }}>
          <UserCheck size={32} color="var(--primary)" /> Gestión de Usuarios
        </h2>

        {/* Buscador */}
        <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
            <Search size={18} />
          </span>
          <input 
            type="text" 
            className="form-control" 
            placeholder="Buscar por nombre, email o sede..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingLeft: 44, height: 44 }}
          />
        </div>
      </div>

      {error && (
        <div className="alert alert-error" style={{ marginBottom: 24 }}>
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      <div className="table-container">
        <table style={{ minWidth: 850 }}>
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Campus / Sede</th>
              <th>Rol</th>
              <th>Verificación</th>
              <th>Estado de Cuenta</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsuarios.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>
                  No se encontraron usuarios registrados.
                </td>
              </tr>
            ) : (
              filteredUsuarios.map(u => (
                <tr key={u.id}>
                  {/* Usuario Info */}
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                      {u.foto_perfil ? (
                        <img 
                          src={u.foto_perfil} 
                          alt="" 
                          style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--border)' }} 
                        />
                      ) : (
                        <div style={{ 
                          width: 44, 
                          height: 44, 
                          borderRadius: '50%', 
                          background: 'linear-gradient(135deg, #0d7c3d, #059669)', 
                          color: 'white', 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontWeight: 700, 
                          fontSize: '0.95rem' 
                        }}>
                          {u.nombre?.charAt(0)}{u.apellido?.charAt(0)}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{u.nombre} {u.apellido}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                          <Mail size={12} /> {u.email}
                        </div>
                        {u.telefono && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <Phone size={12} /> {u.telefono}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Campus */}
                  <td>
                    {u.campus ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--text)', fontSize: '0.9rem', fontWeight: 500 }}>
                        <MapPin size={14} color="var(--primary)" /> {u.campus}
                      </span>
                    ) : (
                      <em style={{ color: '#475569', fontSize: '0.88rem' }}>No especificado</em>
                    )}
                  </td>

                  {/* Rol */}
                  <td>
                    <span style={{ 
                      fontSize: '0.75rem', 
                      textTransform: 'uppercase', 
                      fontWeight: 800, 
                      color: u.role === 'admin' ? 'var(--primary)' : 'var(--text)', 
                      background: u.role === 'admin' ? 'var(--success-bg)' : 'rgba(15, 23, 42, 0.05)', 
                      padding: '4px 10px', 
                      borderRadius: '6px',
                      border: u.role === 'admin' ? '1px solid rgba(13, 124, 61, 0.2)' : '1px solid transparent'
                    }}>
                      {u.role}
                    </span>
                  </td>

                  {/* Verificado */}
                  <td>
                    {u.verificado ? (
                      <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <ShieldCheck size={14} /> Verificado
                      </span>
                    ) : (
                      <span className="badge badge-pendiente" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <AlertCircle size={14} /> Pendiente
                      </span>
                    )}
                  </td>

                  {/* Estado Bloqueado */}
                  <td>
                    {u.bloqueado ? (
                      <div>
                        <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                          <ShieldAlert size={14} /> Bloqueado
                        </span>
                        <div 
                          style={{ 
                            fontSize: '0.75rem', 
                            color: '#ef4444', 
                            marginTop: 6, 
                            maxWidth: 160, 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis', 
                            whiteSpace: 'nowrap',
                            fontWeight: 500
                          }} 
                          title={u.motivo_bloqueo}
                        >
                          Razón: {u.motivo_bloqueo}
                        </div>
                      </div>
                    ) : (
                      <span className="badge" style={{ 
                        background: 'rgba(16, 185, 129, 0.05)', 
                        color: 'var(--success)', 
                        border: '1px solid rgba(16, 185, 129, 0.15)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6
                      }}>
                        Activo
                      </span>
                    )}
                  </td>

                  {/* Acciones */}
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    {u.role !== 'admin' && (
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                        <button 
                          className={`btn ${u.bloqueado ? 'btn-success' : 'btn-danger'}`}
                          onClick={() => u.bloqueado ? openUnblockModal(u) : openBlockModal(u)}
                          style={{ fontSize: '0.8rem', padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: '8px' }}
                          title={u.bloqueado ? 'Desbloquear cuenta' : 'Bloquear cuenta'}
                        >
                          {u.bloqueado ? <Unlock size={14} /> : <Ban size={14} />}
                          {u.bloqueado ? 'Desbloquear' : 'Bloquear'}
                        </button>
                        <button 
                          className="btn"
                          onClick={() => openResetModal(u)}
                          style={{ fontSize: '0.8rem', padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: '8px', background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.3)' }}
                          title="Resetear contraseña"
                        >
                          <KeyRound size={14} /> Reset Pass
                        </button>
                        <button 
                          className="btn"
                          onClick={() => openDeleteModal(u)}
                          style={{ fontSize: '0.8rem', padding: '8px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: '8px', background: 'rgba(220, 38, 38, 0.08)', color: '#dc2626', border: '1px solid rgba(220, 38, 38, 0.25)' }}
                          title="Eliminar cuenta permanentemente"
                        >
                          <Trash2 size={14} /> Eliminar
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal de Bloqueo */}
      <Modal
        isOpen={isBlockModalOpen}
        onClose={() => setIsBlockModalOpen(false)}
        title="Bloquear Cuenta de Usuario"
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
              {submittingBlock ? 'Bloqueando...' : 'Confirmar Bloqueo'}
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
              <strong>¡Advertencia importante!</strong> Estás a punto de suspender al usuario con el correo <strong>{blockUserEmail}</strong>. Al bloquearlo, perderá acceso inmediato a la plataforma, se ocultarán sus publicaciones de alojamiento y no podrá interactuar en la comunidad.
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label htmlFor="blockReason">Motivo de la Suspensión (Obligatorio)</label>
            <textarea
              id="blockReason"
              className="form-control"
              placeholder="Ej. Infracción grave de los términos del servicio y acoso reportado por otro estudiante."
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

      {/* Modal de Desbloqueo */}
      <Modal
        isOpen={isUnblockModalOpen}
        onClose={() => setIsUnblockModalOpen(false)}
        title="Desbloquear Cuenta de Usuario"
        type="warning"
        footer={
          <>
            <button 
              className="btn" 
              onClick={() => setIsUnblockModalOpen(false)}
              style={{ background: 'transparent', color: 'var(--text-muted)' }}
              disabled={submittingUnblock}
            >
              Cancelar
            </button>
            <button 
              className="btn btn-success" 
              onClick={handleUnblockConfirm}
              disabled={submittingUnblock}
            >
              {submittingUnblock ? 'Restableciendo...' : 'Restablecer Acceso'}
            </button>
          </>
        }
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5, margin: 0 }}>
          ¿Estás seguro de que deseas reactivar la cuenta de <strong>{unblockUserEmail}</strong>? Al hacerlo, recuperará todas sus facultades para iniciar sesión, publicar alojamientos y contactar otros usuarios de la comunidad.
        </p>
      </Modal>

      {/* Modal de Eliminación */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Eliminar Cuenta de Usuario"
        type="danger"
        footer={
          <>
            <button 
              className="btn" 
              onClick={() => setIsDeleteModalOpen(false)}
              style={{ background: 'transparent', color: 'var(--text-muted)' }}
              disabled={submittingDelete}
            >
              Cancelar
            </button>
            <button 
              className="btn btn-danger" 
              onClick={handleDeleteConfirm}
              disabled={submittingDelete}
            >
              {submittingDelete ? 'Eliminando...' : '🗑️ Sí, eliminar definitivamente'}
            </button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(239, 68, 68, 0.25)', padding: '16px 20px', borderRadius: '10px', display: 'flex', gap: 12, color: 'var(--danger)' }}>
            <AlertTriangle size={22} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ fontSize: '0.88rem', lineHeight: 1.6 }}>
              <strong>Esta acción es irreversible.</strong> Se eliminará permanentemente la cuenta de <strong>{deleteUserEmail}</strong>, incluyendo su historial de reservas, verificaciones, publicaciones y chats.
            </div>
          </div>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', margin: 0 }}>
            Considera <strong>bloquear</strong> la cuenta si solo deseas impedirle el acceso temporalmente.
          </p>
        </div>
      </Modal>

      {/* Modal de Reset de Contraseña */}
      <Modal
        isOpen={isResetModalOpen}
        onClose={() => { setIsResetModalOpen(false); setResetResult(null); }}
        title="Resetear Contraseña de Usuario"
        type="warning"
        footer={
          resetResult ? (
            <button
              className="btn btn-primary"
              onClick={() => { setIsResetModalOpen(false); setResetResult(null); }}
            >
              Listo, cerrar
            </button>
          ) : (
            <>
              <button 
                className="btn" 
                onClick={() => setIsResetModalOpen(false)}
                style={{ background: 'transparent', color: 'var(--text-muted)' }}
                disabled={submittingReset}
              >
                Cancelar
              </button>
              <button 
                className="btn btn-warning"
                onClick={handleResetConfirm}
                disabled={submittingReset}
                style={{ background: '#f59e0b', color: 'white', border: 'none' }}
              >
                {submittingReset ? 'Generando...' : '🔑 Generar contraseña temporal'}
              </button>
            </>
          )
        }
      >
        {resetResult ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)', borderRadius: 10, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <CheckCircle size={22} color="var(--success)" style={{ flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.9rem' }}>Contraseña reseteada con éxito</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>Para: {resetResult.usuario_email}</div>
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>🔑 Nueva contraseña temporal:</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, background: 'var(--bg)', border: '2px solid var(--border)', borderRadius: 8, padding: '12px 16px', fontFamily: 'monospace', fontSize: '1.1rem', fontWeight: 700, letterSpacing: '3px', color: 'var(--primary)', userSelect: 'all' }}>
                  {resetResult.nueva_password}
                </div>
                <button
                  onClick={handleCopyPassword}
                  className="btn"
                  style={{ padding: '12px 14px', borderRadius: 8, background: copied ? 'rgba(16,185,129,0.1)' : 'rgba(59,130,246,0.1)', color: copied ? 'var(--success)' : 'var(--primary)', border: `1px solid ${copied ? 'rgba(16,185,129,0.3)' : 'rgba(59,130,246,0.3)'}`, flexShrink: 0 }}
                  title="Copiar contraseña"
                >
                  {copied ? <CheckCheck size={18} /> : <Copy size={18} />}
                </button>
              </div>
            </div>

            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, padding: '10px 14px', background: 'rgba(245, 158, 11, 0.06)', borderRadius: 8, border: '1px solid rgba(245,158,11,0.15)' }}>
              ⚠️ <strong>Importante:</strong> Comunica esta contraseña al usuario por un canal seguro. El usuario debería cambiarla al iniciar sesión.
            </p>
          </div>
        ) : (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6, margin: 0 }}>
            Se generará una contraseña temporal aleatoria para <strong>{resetUserEmail}</strong>. La contraseña actual quedará inactiva de inmediato. Deberás comunicarle la nueva clave al usuario para que pueda volver a ingresar.
          </p>
        )}
      </Modal>
    </div>
  );
}
