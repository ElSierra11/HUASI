import { useState, useEffect } from 'react';
import { 
  Home, 
  Search, 
  MapPin, 
  User, 
  CheckCircle, 
  XCircle, 
  Coins, 
  Sparkles,
  Heart,
  Ban,
  Unlock
} from 'lucide-react';
import api from '../api';
import { useToast } from '../components/Toast';
import Modal from '../components/Modal';

export default function Alojamientos() {
  const [alojamientos, setAlojamientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [filtroCampus, setFiltroCampus] = useState('');
  const { showToast } = useToast();

  // Estados para Modales de Acción
  const [actionModal, setActionModal] = useState({ open: false, propId: null, propTitle: null, action: null, processing: false });

  useEffect(() => {
    fetchAlojamientos();
  }, []);

  const fetchAlojamientos = async () => {
    try {
      // Obtenemos una lista grande de alojamientos sin filtrar es_pago (ambos)
      // Ajustamos limit a 100 para auditoría general
      const res = await api.get('/propiedades?limit=100');
      setAlojamientos(res.data.propiedades || []);
    } catch (err) {
      console.error(err);
      setError('Error al obtener la lista de alojamientos');
      showToast('Error al cargar los alojamientos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleState = (prop, action) => {
    setActionModal({
      open: true,
      propId: prop.id,
      propTitle: prop.titulo,
      action, // 'desactivar' o 'activar'
      processing: false
    });
  };

  const confirmToggleState = async () => {
    const { propId, action } = actionModal;
    setActionModal(prev => ({ ...prev, processing: true }));

    try {
      if (action === 'desactivar') {
        // Soft delete
        await api.delete(`/propiedades/${propId}`);
        showToast('Alojamiento dado de baja con éxito', 'success');
      } else {
        // Re-publicar
        await api.patch(`/propiedades/${propId}/activar`);
        showToast('Alojamiento re-publicado con éxito', 'success');
      }
      
      // Actualizar estado local
      setAlojamientos(prev => prev.map(p => p.id === propId ? { ...p, activo: action === 'activar' } : p));
      setActionModal({ open: false, propId: null, propTitle: null, action: null, processing: false });
    } catch (err) {
      console.error(err);
      showToast('Error al actualizar el estado del alojamiento', 'error');
    }
  };

  const filtered = alojamientos.filter(p => {
    const matchesSearch = `${p.titulo} ${p.host_nombre} ${p.host_apellido} ${p.barrio || ''} ${p.ciudad || ''}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesTipo = filtroTipo === '' ? true : (filtroTipo === 'solidario' ? !p.es_pago : p.es_pago);
    const matchesCampus = filtroCampus === '' ? true : p.campus_cercano === filtroCampus;
    return matchesSearch && matchesTipo && matchesCampus;
  });

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div style={{ display: 'flex', justify: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
        <h2 style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 12, letterSpacing: '-0.5px', margin: 0 }}>
          <Home size={32} color="var(--primary)" /> Gestión de Alojamientos
        </h2>

        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', width: '100%', maxWidth: '700px', justify: 'flex-end' }}>
          {/* Buscador */}
          <div style={{ position: 'relative', width: '100%', maxWidth: '240px' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
              <Search size={18} />
            </span>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Buscar por título, barrio..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              style={{ paddingLeft: 44, height: 40 }}
            />
          </div>

          {/* Filtro Tipo */}
          <select 
            className="form-control" 
            value={filtroTipo} 
            onChange={e => setFiltroTipo(e.target.value)}
            style={{ width: '160px', height: 40, padding: '0 12px' }}
          >
            <option value="">Todos los tipos</option>
            <option value="solidario">Solidarios (Gratis)</option>
            <option value="pago">Alojamiento Plus</option>
          </select>

          {/* Filtro Campus */}
          <select 
            className="form-control" 
            value={filtroCampus} 
            onChange={e => setFiltroCampus(e.target.value)}
            style={{ width: '180px', height: 40, padding: '0 12px' }}
          >
            <option value="">Todos los campus</option>
            <option value="Santa Marta">Santa Marta</option>
            <option value="Bogotá">Bogotá</option>
            <option value="Medellín">Medellín</option>
            <option value="Bucaramanga">Bucaramanga</option>
            <option value="Cali">Cali</option>
          </select>
        </div>
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 24 }}>{error}</div>}

      <div className="table-container">
        <table style={{ minWidth: 900 }}>
          <thead>
            <tr>
              <th>Alojamiento</th>
              <th>Anfitrión</th>
              <th>Campus Cercano</th>
              <th>Modalidad</th>
              <th>Estado</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>
                  No se encontraron alojamientos registrados.
                </td>
              </tr>
            ) : (
              filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text)' }}>{p.titulo}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={12} /> {p.barrio ? `${p.barrio}, ${p.ciudad}` : p.ciudad}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'var(--border)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justify: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
                        {p.host_nombre?.charAt(0)}
                      </div>
                      <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{p.host_nombre} {p.host_apellido}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{p.campus_cercano || 'Santa Marta'}</span>
                  </td>
                  <td>
                    {p.es_pago ? (
                      <span className="badge" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#d97706', border: '1px solid rgba(245, 158, 11, 0.2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Sparkles size={12} /> Alojamiento Plus
                      </span>
                    ) : (
                      <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#16a34a', border: '1px solid rgba(16, 185, 129, 0.2)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Heart size={12} fill="currentColor" /> Solidario
                      </span>
                    )}
                  </td>
                  <td>
                    {p.activo ? (
                      <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <CheckCircle size={12} /> Publicado
                      </span>
                    ) : (
                      <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <XCircle size={12} /> Desactivado
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '16px 24px', textAlign: 'right' }}>
                    <button
                      className={`btn ${p.activo ? 'btn-danger' : 'btn-success'}`}
                      onClick={() => handleToggleState(p, p.activo ? 'desactivar' : 'activar')}
                      style={{ fontSize: '0.8rem', padding: '8px 14px', display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: '8px' }}
                    >
                      {p.activo ? <Ban size={14} /> : <Unlock size={14} />}
                      {p.activo ? 'Dar de baja' : 'Re-publicar'}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal
        open={actionModal.open}
        onClose={() => setActionModal({ open: false, propId: null, propTitle: null, action: null, processing: false })}
        title={actionModal.action === 'desactivar' ? 'Dar de baja alojamiento' : 'Re-publicar alojamiento'}
        type={actionModal.action === 'desactivar' ? 'danger' : 'success'}
        loading={actionModal.processing}
        confirmText={actionModal.action === 'desactivar' ? 'Sí, dar de baja' : 'Sí, re-publicar'}
        cancelText="Cancelar"
        onConfirm={confirmToggleState}
      >
        <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', lineHeight: 1.5, margin: 0 }}>
          {actionModal.action === 'desactivar' ? (
            <>
              ¿Estás seguro de que deseas dar de baja el alojamiento <strong>"{actionModal.propTitle}"</strong>?
              Se ocultará de las búsquedas públicas y los usuarios no podrán reservarlo.
            </>
          ) : (
            <>
              ¿Estás seguro de que deseas re-publicar el alojamiento <strong>"{actionModal.propTitle}"</strong>?
              Volverá a aparecer en las búsquedas públicas de inmediato.
            </>
          )}
        </p>
      </Modal>
    </div>
  );
}
