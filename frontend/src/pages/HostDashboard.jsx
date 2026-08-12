import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Home, TrendingUp, CheckCircle, Bell, Edit, MapPin, Star, Bed, Sofa, Trees, Coins, Sparkles, HelpCircle } from 'lucide-react';

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
import api from '../api';

export default function HostDashboard() {
  const [propiedades, setPropiedades] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/propiedades/host/mis')
      .then(res => setPropiedades(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalPendientes = propiedades.reduce((sum, p) => sum + (parseInt(p.reservas_pendientes) || 0), 0);

  const handleActivar = async (id) => {
    try {
      await api.patch(`/propiedades/${id}/activar`);
      setPropiedades(propiedades.map(p => p.id === id ? { ...p, activo: true } : p));
    } catch (err) {
      console.error('Error al volver a publicar:', err);
      alert('Error al volver a publicar la propiedad.');
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="dashboard-header" style={{ display: 'flex', flexWrap: 'wrap' }}>
        <h1>Panel de Anfitrión</h1>
        <Link to="/host/nueva-propiedad" className="btn btn-primary">+ Nueva Propiedad</Link>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><Home size={24} /></div>
          <div className="stat-content">
            <div className="stat-value">{propiedades.length}</div>
            <div className="stat-label">Propiedades publicadas</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{color: 'var(--success)', background: 'var(--success-light)'}}><CheckCircle size={24} /></div>
          <div className="stat-content">
            <div className="stat-value">{propiedades.filter(p => p.activo).length}</div>
            <div className="stat-label">Propiedades activas</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{color: 'var(--warning)', background: 'var(--warning-light)'}}><Bell size={24} /></div>
          <div className="stat-content">
            <div className="stat-value" style={{ color: totalPendientes > 0 ? 'var(--warning)' : undefined }}>
              {totalPendientes}
            </div>
            <div className="stat-label">Solicitudes pendientes</div>
          </div>
        </div>
      </div>

      {totalPendientes > 0 && (
        <div className="alert alert-info" style={{ marginBottom: 24 }}>
          <Bell size={20} /> Tienes <strong>{totalPendientes}</strong> solicitud(es) pendiente(s). <Link to="/host/reservas">Revisar ahora</Link>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h2 style={{ fontSize: '1.4rem' }}>Mis Propiedades</h2>
        <Link to="/host/reservas" className="btn btn-secondary btn-sm">Ver reservas</Link>
      </div>

      {propiedades.length === 0 ? (
        <div className="empty-state">
          <Home size={48} />
          <h3>No tienes propiedades publicadas</h3>
          <p style={{color: 'var(--text-muted)'}}>Ofrece un espacio solidario a estudiantes durante eventos académicos o prácticas de la UCC</p>
          <Link to="/host/nueva-propiedad" className="btn btn-primary" style={{ marginTop: 24 }}>Publicar mi primera propiedad</Link>
        </div>
      ) : (
        propiedades.map(p => {
          const normalizedTipo = getNormalizedTipo(p.tipo);
          const theme = TIPO_THEMES[normalizedTipo] || TIPO_THEMES.otro;
          const icon = TIPO_ICON[normalizedTipo] || TIPO_ICON.otro;
          const smallIcon = TIPO_ICON_SMALL[normalizedTipo] || TIPO_ICON_SMALL.otro;

          return (
            <div key={p.id} className="list-card">
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
                  <span style={{ fontWeight: 700, color: 'var(--primary)' }}>{p.titulo}</span>
                </h3>
                <p><MapPin size={16} /> {p.barrio || p.direccion} · {p.tipo} · {p.capacidad} huéspedes</p>
                <p><Star size={16} fill="var(--text-muted)" /> {parseFloat(p.calificacion_promedio) > 0 ? parseFloat(p.calificacion_promedio).toFixed(1) : 'Nuevo'} · {p.num_resenas || 0} reseñas</p>
              </div>
              <div className="list-card-actions" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <span className={`badge ${p.activo ? 'badge-aceptada' : 'badge-cancelada'}`}>
                  {p.activo ? 'Activa' : 'Archivada'}
                </span>
                {!p.activo && (
                  <button 
                    className="btn btn-primary btn-sm" 
                    onClick={() => handleActivar(p.id)}
                  >
                    Volver a publicar
                  </button>
                )}
                <Link to={`/host/editar/${p.id}`} className="btn btn-secondary btn-sm"><Edit size={16} /> Editar</Link>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
