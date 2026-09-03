import { useState, useEffect } from 'react';
import { 
  Home, 
  Search, 
  MapPin, 
  User, 
  CheckCircle, 
  CheckCircle2,
  XCircle, 
  Ban, 
  Unlock,
  ClipboardCheck,
  Clock,
  AlertTriangle,
  ShieldCheck,
  Building2,
  Users,
  Eye,
  Mail,
  Phone,
  FileText,
  Loader2,
  X,
  Download
} from 'lucide-react';
import api from '../api';
import { useToast } from '../components/Toast';
import { useDebounce } from '../hooks/useDebounce';

export default function Alojamientos({ onActionFinished }) {
  const [alojamientos, setAlojamientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');
  const [filtroCampus, setFiltroCampus] = useState('');
  const { showToast } = useToast();

  // Debounce del término de búsqueda para no filtrar en cada tecla
  const debouncedSearch = useDebounce(searchTerm, 350);

  // Estados para Modal de Inspección / Dictamen
  const [inspectionModal, setInspectionModal] = useState({
    open: false,
    property: null,
    processing: false,
    checklist: {
      salubridad: false,
      servicios: false,
      espacio_digno: false,
      seguridad_entorno: false,
      normas_convivencia: false
    },
    notas: ''
  });

  // Modal para desactivar / reactivar
  const [toggleModal, setToggleModal] = useState({
    open: false,
    propId: null,
    propTitle: null,
    action: null,
    processing: false
  });

  useEffect(() => {
    fetchAlojamientos();
  }, []);

  const fetchAlojamientos = async () => {
    setLoading(true);
    setError('');
    try {
      // Intentar endpoint administrativo dedicado
      const res = await api.get('/propiedades/admin/todas?limit=150');
      setAlojamientos(res.data.propiedades || []);
    } catch (err) {
      console.warn('Fallback a endpoint general de propiedades:', err.message);
      try {
        const resFallback = await api.get('/propiedades?limit=150');
        setAlojamientos(resFallback.data.propiedades || []);
      } catch (fallbackErr) {
        console.error(fallbackErr);
        setError('Error al obtener la lista de alojamientos');
        showToast('Error al cargar los alojamientos', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOpenInspection = (prop) => {
    // Si ya tenía checklist previo, cargarlo
    let initialChecklist = {
      salubridad: false,
      servicios: false,
      espacio_digno: false,
      seguridad_entorno: false,
      normas_convivencia: false
    };

    if (prop.checklist_evaluacion) {
      try {
        const parsed = typeof prop.checklist_evaluacion === 'string' 
          ? JSON.parse(prop.checklist_evaluacion) 
          : prop.checklist_evaluacion;
        initialChecklist = { ...initialChecklist, ...parsed };
      } catch (e) {
        console.error('Error parseando checklist previo:', e);
      }
    }

    setInspectionModal({
      open: true,
      property: prop,
      processing: false,
      checklist: initialChecklist,
      notas: prop.notas_revision || ''
    });
  };

  const handleToggleChecklist = (key) => {
    setInspectionModal(prev => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [key]: !prev.checklist[key]
      }
    }));
  };

  const submitDictamen = async (nuevoEstado) => {
    const { property, checklist, notas } = inspectionModal;
    if (!property) return;

    if ((nuevoEstado === 'en_correccion' || nuevoEstado === 'rechazado') && !notas.trim()) {
      showToast('Por favor ingresa las observaciones u observaciones para el anfitrión', 'warning');
      return;
    }

    setInspectionModal(prev => ({ ...prev, processing: true }));

    try {
      await api.patch(`/propiedades/admin/${property.id}/dictamen`, {
        estado_aprobacion: nuevoEstado,
        notas_revision: notas.trim(),
        checklist_evaluacion: checklist
      });

      showToast(
        nuevoEstado === 'aprobado' 
          ? 'Alojamiento certificado y aprobado con éxito' 
          : nuevoEstado === 'en_correccion'
          ? 'Observaciones enviadas al anfitrión'
          : 'Alojamiento rechazado',
        'success'
      );

      // Actualizar estado local en tabla
      setAlojamientos(prev => prev.map(p => {
        if (p.id === property.id) {
          return {
            ...p,
            estado_aprobacion: nuevoEstado,
            activo: nuevoEstado === 'aprobado',
            notas_revision: notas.trim(),
            checklist_evaluacion: checklist,
            fecha_revision: new Date().toISOString()
          };
        }
        return p;
      }));

      if (onActionFinished) onActionFinished();

      setInspectionModal({
        open: false,
        property: null,
        processing: false,
        checklist: {
          salubridad: false,
          servicios: false,
          espacio_digno: false,
          seguridad_entorno: false,
          normas_convivencia: false
        },
        notas: ''
      });
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || 'Error al registrar dictamen institucional';
      showToast(msg, 'error');
      setInspectionModal(prev => ({ ...prev, processing: false }));
    }
  };

  const confirmToggleState = async () => {
    const { propId, action } = toggleModal;
    setToggleModal(prev => ({ ...prev, processing: true }));

    try {
      if (action === 'desactivar') {
        await api.delete(`/propiedades/${propId}`);
        showToast('Alojamiento dado de baja con éxito', 'success');
      } else {
        await api.patch(`/propiedades/${propId}/activar`);
        showToast('Alojamiento re-publicado con éxito', 'success');
      }
      
      setAlojamientos(prev => prev.map(p => p.id === propId ? { ...p, activo: action === 'activar' } : p));
      if (onActionFinished) onActionFinished();
      setToggleModal({ open: false, propId: null, propTitle: null, action: null, processing: false });
    } catch (err) {
      console.error(err);
      showToast('Error al actualizar el estado del alojamiento', 'error');
      setToggleModal(prev => ({ ...prev, processing: false }));
    }
  };

  const handleExportCSV = () => {
    if (alojamientos.length === 0) {
      showToast('No hay datos para exportar', 'warning');
      return;
    }

    const headers = ['ID', 'Titulo', 'Tipo', 'Capacidad', 'Campus', 'Direccion', 'Anfitrion', 'Email Anfitrion', 'Telefono', 'Estado Aprobacion', 'Revisado Por', 'Fecha Revision', 'Notas', 'Activo'];
    
    const rows = alojamientos.map(p => [
      p.id,
      `"${(p.titulo || '').replace(/"/g, '""')}"`,
      p.tipo || '',
      p.capacidad || 1,
      `"${(p.campus_cercano || '').replace(/"/g, '""')}"`,
      `"${(p.direccion || '').replace(/"/g, '""')}"`,
      `"${(`${p.host_nombre || ''} ${p.host_apellido || ''}`).trim().replace(/"/g, '""')}"`,
      p.host_email || '',
      p.host_telefono || '',
      p.estado_aprobacion || 'aprobado',
      `"${(p.revisado_por || 'Comision UCC').replace(/"/g, '""')}"`,
      p.fecha_revision ? new Date(p.fecha_revision).toLocaleDateString() : 'N/A',
      `"${(p.notas_revision || '').replace(/"/g, '""')}"`,
      p.activo ? 'SI' : 'NO'
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `Reporte_Alojamientos_HUASI_UCC_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Reporte exportado exitosamente', 'success');
  };

  // Contadores para pestañas
  const counts = {
    todos: alojamientos.length,
    pendiente_revision: alojamientos.filter(p => (p.estado_aprobacion || 'pendiente_revision') === 'pendiente_revision').length,
    en_correccion: alojamientos.filter(p => p.estado_aprobacion === 'en_correccion').length,
    aprobado: alojamientos.filter(p => p.estado_aprobacion === 'aprobado').length,
    rechazado: alojamientos.filter(p => p.estado_aprobacion === 'rechazado').length
  };

  const filtered = alojamientos.filter(p => {
    const matchesSearch = `${p.titulo} ${p.host_nombre || ''} ${p.host_apellido || ''} ${p.host_email || ''} ${p.barrio || ''} ${p.ciudad || ''}`
      .toLowerCase()
      .includes(debouncedSearch.toLowerCase());

    const estadoProp = p.estado_aprobacion || 'pendiente_revision';
    const matchesEstado = filtroEstado === 'todos' ? true : estadoProp === filtroEstado;
    const matchesCampus = filtroCampus === '' ? true : p.campus_cercano === filtroCampus;

    return matchesSearch && matchesEstado && matchesCampus;
  });

  const renderApprovalBadge = (estado) => {
    const est = estado || 'pendiente_revision';
    switch (est) {
      case 'aprobado':
        return (
          <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px' }}>
            <ShieldCheck size={13} /> Aprobado UCC
          </span>
        );
      case 'en_correccion':
        return (
          <span className="badge badge-warning" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'rgba(245, 158, 11, 0.12)', color: '#b45309', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
            <AlertTriangle size={13} /> En Corrección
          </span>
        );
      case 'rechazado':
        return (
          <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px' }}>
            <XCircle size={13} /> No Aprobado
          </span>
        );
      case 'pendiente_revision':
      default:
        return (
          <span className="badge" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: 'rgba(2, 132, 199, 0.1)', color: '#0284c7', border: '1px solid rgba(2, 132, 199, 0.25)' }}>
            <Clock size={13} /> Pendiente Revisión
          </span>
        );
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      {/* Encabezado Principal */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h2 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 12, margin: 0, letterSpacing: '-0.5px' }}>
            <Home size={30} color="var(--primary)" /> Inspección y Aprobación de Alojamientos
          </h2>
          <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '0.88rem' }}>
            Comisión de Bienestar Universitario: Auditoría de habitabilidad y seguridad para estancias estudiantiles.
          </p>
        </div>

        {/* Buscador y Filtro Campus */}
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', width: '240px' }}>
            <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', display: 'flex' }}>
              <Search size={16} />
            </span>
            <input 
              type="text" 
              className="form-control" 
              placeholder="Buscar alojamiento, anfitrión..." 
              value={searchTerm} 
              onChange={e => setSearchTerm(e.target.value)} 
              style={{ paddingLeft: 36, height: 38, fontSize: '0.85rem' }}
            />
          </div>

          <select 
            className="form-control" 
            value={filtroCampus} 
            onChange={e => setFiltroCampus(e.target.value)}
            style={{ width: '180px', height: 38, padding: '0 12px', fontSize: '0.85rem' }}
          >
            <option value="">Todos los campus</option>
            <option value="Santa Marta">Santa Marta</option>
            <option value="Bogotá">Bogotá</option>
            <option value="Medellín">Medellín</option>
            <option value="Bucaramanga">Bucaramanga</option>
            <option value="Cali">Cali</option>
            <option value="Ibagué">Ibagué</option>
            <option value="Pasto">Pasto</option>
            <option value="Popayán">Popayán</option>
            <option value="Villavicencio">Villavicencio</option>
            <option value="Montería">Montería</option>
            <option value="Arauca">Arauca</option>
            <option value="Barrancabermeja">Barrancabermeja</option>
            <option value="Neiva">Neiva</option>
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
            title="Exportar informe en formato CSV compatible con Excel"
          >
            <Download size={15} className="text-ucc-green" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Pestañas de Estado con Contadores */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', borderBottom: '1px solid var(--border)', paddingBottom: 12 }}>
        {[
          { id: 'todos', label: 'Todos los Alojamientos', count: counts.todos },
          { id: 'pendiente_revision', label: 'Pendientes de Inspección', count: counts.pendiente_revision, highlight: counts.pendiente_revision > 0 },
          { id: 'en_correccion', label: 'En Corrección', count: counts.en_correccion },
          { id: 'aprobado', label: 'Aprobados y Certificados', count: counts.aprobado },
          { id: 'rechazado', label: 'No Aprobados', count: counts.rechazado }
        ].map(tab => {
          const isActive = filtroEstado === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setFiltroEstado(tab.id)}
              style={{
                background: isActive ? 'var(--primary)' : 'var(--card-bg, #ffffff)',
                color: isActive ? '#ffffff' : 'var(--text)',
                border: `1px solid ${isActive ? 'var(--primary)' : 'var(--border)'}`,
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.2s ease'
              }}
            >
              <span>{tab.label}</span>
              <span style={{
                background: isActive ? 'rgba(255,255,255,0.25)' : (tab.highlight ? 'rgba(2, 132, 199, 0.15)' : 'var(--border)'),
                color: isActive ? '#ffffff' : (tab.highlight ? '#0284c7' : 'var(--text-muted)'),
                padding: '2px 8px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 700
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 24 }}>{error}</div>}

      {/* Tabla de Alojamientos */}
      <div className="table-container">
        <table style={{ minWidth: 960 }}>
          <thead>
            <tr>
              <th>Alojamiento / Ubicación</th>
              <th>Anfitrión Universitario</th>
              <th>Campus</th>
              <th>Capacidad / Tipo</th>
              <th>Estado Dictamen</th>
              <th style={{ textAlign: 'right' }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td colSpan="6" style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)', fontWeight: 500 }}>
                  No se encontraron alojamientos bajo los criterios seleccionados.
                </td>
              </tr>
            ) : (
              filtered.map(p => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: '0.95rem' }}>{p.titulo}</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <MapPin size={12} /> {p.barrio ? `${p.barrio}, ${p.ciudad}` : (p.ciudad || 'Santa Marta')}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--border)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.8rem' }}>
                        {p.host_nombre?.charAt(0) || 'U'}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)' }}>
                          {p.host_nombre} {p.host_apellido}
                        </span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {p.host_email || 'Sin correo registrado'}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: '0.88rem', color: 'var(--text)' }}>{p.campus_cercano || 'Santa Marta'}</span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 600, textTransform: 'capitalize' }}>
                        {p.tipo || 'Habitación'}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Users size={11} /> {p.capacidad || 1} huésped{p.capacidad !== 1 ? 'es' : ''}
                      </span>
                    </div>
                  </td>
                  <td>
                    {renderApprovalBadge(p.estado_aprobacion)}
                  </td>
                  <td style={{ padding: '14px 20px', textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                      <button
                        onClick={() => handleOpenInspection(p)}
                        className="btn btn-primary"
                        style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'inline-flex', alignItems: 'center', gap: 6, borderRadius: '6px' }}
                      >
                        <ClipboardCheck size={14} /> Inspeccionar
                      </button>

                      {p.estado_aprobacion === 'aprobado' && (
                        <button
                          onClick={() => setToggleModal({
                            open: true,
                            propId: p.id,
                            propTitle: p.titulo,
                            action: p.activo ? 'desactivar' : 'activar',
                            processing: false
                          })}
                          className={`btn ${p.activo ? 'btn-danger' : 'btn-success'}`}
                          style={{ fontSize: '0.8rem', padding: '6px 10px', display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: '6px' }}
                          title={p.activo ? 'Desactivar publicación' : 'Activar publicación'}
                        >
                          {p.activo ? <Ban size={14} /> : <Unlock size={14} />}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ================= MODAL DE INSPECCIÓN Y DICTAMEN ================= */}
      {inspectionModal.open && inspectionModal.property && (
        <div className="modal-overlay" onClick={() => !inspectionModal.processing && setInspectionModal(prev => ({ ...prev, open: false }))}>
          <div 
            className="modal-content" 
            onClick={e => e.stopPropagation()} 
            style={{ maxWidth: '820px', width: '90%', maxHeight: '90vh', overflowY: 'auto', padding: '24px 28px' }}
          >
            {/* Header del Modal */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border)', paddingBottom: 16, marginBottom: 20 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <Building2 size={20} color="var(--primary)" />
                  <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text)' }}>
                    Ficha de Inspección Institucional
                  </h3>
                </div>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                  Evaluación de habitabilidad y seguridad según estándares UCC / HUASI
                </span>
              </div>
              <button 
                onClick={() => setInspectionModal(prev => ({ ...prev, open: false }))}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}
                disabled={inspectionModal.processing}
              >
                <X size={20} />
              </button>
            </div>

            {/* Ficha de Detalles del Alojamiento */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16, marginBottom: 20 }}>
              {/* Columna Izquierda: Datos de la Propiedad */}
              <div style={{ background: 'var(--bg, #f8fafc)', padding: 16, borderRadius: '8px', border: '1px solid var(--border)' }}>
                <h4 style={{ margin: '0 0 10px 0', fontSize: '0.92rem', fontWeight: 700, color: 'var(--text)' }}>
                  {inspectionModal.property.titulo}
                </h4>
                
                <div style={{ fontSize: '0.82rem', color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  <div><strong>Dirección exacta:</strong> {inspectionModal.property.direccion}</div>
                  <div><strong>Barrio / Zona:</strong> {inspectionModal.property.barrio || 'No especificado'}</div>
                  <div><strong>Campus cercano:</strong> {inspectionModal.property.campus_cercano || 'Santa Marta'}</div>
                  <div><strong>Tipo de espacio:</strong> {inspectionModal.property.tipo} (Capacidad: {inspectionModal.property.capacidad} personas)</div>
                  {inspectionModal.property.duracion_maxima && (
                    <div><strong>Estancia máxima:</strong> {inspectionModal.property.duracion_maxima} días</div>
                  )}
                </div>

                <div style={{ marginTop: 12, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                    DESCRIPCIÓN DEL ESPACIO:
                  </span>
                  <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.4 }}>
                    {inspectionModal.property.descripcion}
                  </p>
                </div>

                {inspectionModal.property.reglas && (
                  <div style={{ marginTop: 10, borderTop: '1px solid var(--border)', paddingTop: 10 }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 4 }}>
                      NORMAS ESTABLECIDAS:
                    </span>
                    <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.4 }}>
                      {inspectionModal.property.reglas}
                    </p>
                  </div>
                )}
              </div>

              {/* Columna Derecha: Anfitrión y Fotos */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div style={{ background: 'var(--bg, #f8fafc)', padding: 14, borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                    DATOS DEL ANFITRIÓN:
                  </span>
                  <div style={{ fontSize: '0.82rem', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <User size={14} color="var(--primary)" />
                      <strong>{inspectionModal.property.host_nombre} {inspectionModal.property.host_apellido}</strong>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Mail size={14} color="var(--text-muted)" />
                      <span>{inspectionModal.property.host_email || 'No registrado'}</span>
                    </div>
                    {inspectionModal.property.host_telefono && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Phone size={14} color="var(--text-muted)" />
                        <span>{inspectionModal.property.host_telefono}</span>
                      </div>
                    )}
                    <div style={{ marginTop: 4 }}>
                      <span className="badge badge-success" style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <ShieldCheck size={12} /> Comunidad Universitaria UCC
                      </span>
                    </div>
                  </div>
                </div>

                {/* Galería de Fotos */}
                <div style={{ background: 'var(--bg, #f8fafc)', padding: 14, borderRadius: '8px', border: '1px solid var(--border)' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', display: 'block', marginBottom: 8 }}>
                    FOTOGRAFÍAS DEL INMUEBLE:
                  </span>
                  {inspectionModal.property.fotos && inspectionModal.property.fotos.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(75px, 1fr))', gap: 8 }}>
                      {inspectionModal.property.fotos.map((foto, idx) => (
                        <a key={idx} href={foto} target="_blank" rel="noreferrer" style={{ display: 'block', borderRadius: 4, overflow: 'hidden', height: 60, border: '1px solid var(--border)' }}>
                          <img src={foto} alt={`Foto ${idx + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      El anfitrión no adjuntó imágenes adicionales.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Checklist de Habitabilidad Institucional */}
            <div style={{ background: 'rgba(2, 132, 199, 0.04)', border: '1px solid rgba(2, 132, 199, 0.2)', borderRadius: '8px', padding: 16, marginBottom: 20 }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.92rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <ClipboardCheck size={18} /> Checklist de Criterios de Habitabilidad Institucional
              </h4>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[
                  { key: 'salubridad', label: 'Condiciones de higiene y salubridad óptimas en el espacio y baño.' },
                  { key: 'servicios', label: 'Servicios básicos garantizados y continuos (agua, electricidad, internet para estudio).' },
                  { key: 'espacio_digno', label: 'Cama o mobiliario adecuado, ventilación e iluminación apropiada.' },
                  { key: 'seguridad_entorno', label: 'Ubicación con vías de acceso y transporte viable hacia el campus universitario.' },
                  { key: 'normas_convivencia', label: 'Reglas respetuosas con la vida académica (ambiente libre de sustancias y respetuoso).' }
                ].map(item => (
                  <label key={item.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: '0.85rem', color: 'var(--text)', cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={!!inspectionModal.checklist[item.key]} 
                      onChange={() => handleToggleChecklist(item.key)}
                      style={{ marginTop: 3 }}
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Observaciones Oficiales / Feedback al Host */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                Observaciones del Revisor (Se notificarán por correo al anfitrión):
              </label>
              <textarea 
                className="form-control" 
                rows={3} 
                placeholder="Indica observaciones de felicitación, requerimientos de fotos adicionales o motivos de rechazo..."
                value={inspectionModal.notas}
                onChange={e => setInspectionModal(prev => ({ ...prev, notas: e.target.value }))}
                style={{ fontSize: '0.85rem', width: '100%', resize: 'vertical' }}
              />
            </div>

            {/* Botones de Acción / Dictamen */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <button 
                className="btn" 
                onClick={() => setInspectionModal(prev => ({ ...prev, open: false }))}
                disabled={inspectionModal.processing}
                style={{ background: 'var(--bg, #e2e8f0)', color: 'var(--text)', fontSize: '0.85rem', padding: '8px 16px' }}
              >
                Cerrar sin guardar
              </button>

              <div style={{ display: 'flex', gap: 10 }}>
                {/* Botón Rechazar */}
                <button 
                  className="btn btn-danger" 
                  onClick={() => submitDictamen('rechazado')}
                  disabled={inspectionModal.processing}
                  style={{ fontSize: '0.85rem', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 6 }}
                >
                  <XCircle size={15} /> Rechazar Alojamiento
                </button>

                {/* Botón Solicitar Corrección */}
                <button 
                  className="btn" 
                  onClick={() => submitDictamen('en_correccion')}
                  disabled={inspectionModal.processing}
                  style={{ background: '#d97706', color: '#ffffff', fontSize: '0.85rem', padding: '8px 16px', display: 'inline-flex', alignItems: 'center', gap: 6, border: 'none' }}
                >
                  <AlertTriangle size={15} /> Solicitar Ajustes
                </button>

                {/* Botón Aprobar */}
                <button 
                  className="btn btn-success" 
                  onClick={() => submitDictamen('aprobado')}
                  disabled={inspectionModal.processing}
                  style={{ fontSize: '0.85rem', padding: '8px 20px', display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 700 }}
                >
                  {inspectionModal.processing ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={16} />}
                  Aprobar y Certificar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Confirmación Desactivar/Reactivar */}
      {toggleModal.open && (
        <div className="modal-overlay" onClick={() => !toggleModal.processing && setToggleModal(prev => ({ ...prev, open: false }))}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '480px', padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              {toggleModal.action === 'desactivar' ? (
                <Ban size={22} color="var(--danger)" />
              ) : (
                <Unlock size={22} color="var(--success)" />
              )}
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: 'var(--text)' }}>
                {toggleModal.action === 'desactivar' ? 'Dar de baja publicación' : 'Re-publicar alojamiento'}
              </h3>
            </div>

            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5, margin: '0 0 20px 0' }}>
              {toggleModal.action === 'desactivar' ? (
                <>¿Estás seguro de dar de baja el alojamiento <strong>"{toggleModal.propTitle}"</strong>? Se ocultará de la lista pública.</>
              ) : (
                <>¿Deseas volver a activar y hacer público el alojamiento <strong>"{toggleModal.propTitle}"</strong>?</>
              )}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button 
                className="btn" 
                onClick={() => setToggleModal(prev => ({ ...prev, open: false }))}
                disabled={toggleModal.processing}
                style={{ background: 'var(--border)', color: 'var(--text)', fontSize: '0.85rem' }}
              >
                Cancelar
              </button>
              <button 
                className={`btn ${toggleModal.action === 'desactivar' ? 'btn-danger' : 'btn-success'}`}
                onClick={confirmToggleState}
                disabled={toggleModal.processing}
                style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: 6 }}
              >
                {toggleModal.processing && <Loader2 size={14} className="animate-spin" />}
                {toggleModal.action === 'desactivar' ? 'Sí, dar de baja' : 'Sí, activar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
