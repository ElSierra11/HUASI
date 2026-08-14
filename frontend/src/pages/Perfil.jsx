import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { UserCircle, ShieldCheck, Mail, Phone, Edit3, Sun, ArrowUpRight, ArrowDownLeft, GraduationCap } from 'lucide-react';
import api from '../api';

export default function Perfil() {
  const { user, refreshUser } = useAuth();
  const [form, setForm] = useState({ 
    nombre: user?.nombre || '', 
    apellido: user?.apellido || '', 
    telefono: user?.telefono || '',
    campus: user?.campus || ''
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [history, setHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [impact, setImpact] = useState({ noches_ofrecidas: 0, estudiantes_apoyados: 0, dinero_ahorrado: 0 });
  const [loadingImpact, setLoadingImpact] = useState(true);
  
  const [prefForm, setPrefForm] = useState({
    estudio: 'dia',
    ruido: 'medio',
    mascotas: 'si',
    visitas: 'si',
    fumar: 'no'
  });
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [prefsMsg, setPrefsMsg] = useState('');

  useEffect(() => {
    if (user?.preferencias_convivencia) {
      try {
        const parsed = typeof user.preferencias_convivencia === 'string'
          ? JSON.parse(user.preferencias_convivencia)
          : user.preferencias_convivencia;
        if (parsed && typeof parsed === 'object') {
          setPrefForm({
            estudio: parsed.estudio || 'dia',
            ruido: parsed.ruido || 'medio',
            mascotas: parsed.mascotas || 'si',
            visitas: parsed.visitas || 'si',
            fumar: parsed.fumar || 'no'
          });
        }
      } catch (e) {
        console.error('Error parsing user preferences:', e);
      }
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      api.get('/auth/soles/historial')
        .then(res => setHistory(res.data))
        .catch(err => console.error('Error al cargar historial de soles:', err))
        .finally(() => setLoadingHistory(false));

      api.get('/auth/impacto')
        .then(res => setImpact(res.data))
        .catch(err => console.error('Error al cargar impacto:', err))
        .finally(() => setLoadingImpact(false));
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put('/auth/me', form);
      await refreshUser();
      setMsg('Perfil actualizado correctamente');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg('Error al actualizar');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('foto', file);

    try {
      setSaving(true);
      await api.post('/auth/foto-perfil', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await refreshUser();
      setMsg('Foto de perfil actualizada con éxito');
      setTimeout(() => setMsg(''), 3000);
    } catch (err) {
      setMsg(err.response?.data?.error || 'Error al subir foto');
    } finally {
      setSaving(false);
    }
  };

  const handlePrefsSubmit = async (e) => {
    e.preventDefault();
    setSavingPrefs(true);
    try {
      await api.post('/auth/preferencias', { preferencias: prefForm });
      await refreshUser();
      setPrefsMsg('Preferencias de convivencia guardadas correctamente');
      setTimeout(() => setPrefsMsg(''), 3000);
    } catch (err) {
      setPrefsMsg('Error al guardar preferencias');
    } finally {
      setSavingPrefs(false);
    }
  };

  return (
    <div className="profile-page">
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 32, display: 'flex', alignItems: 'center', gap: 12 }}>
        <UserCircle size={32} color="var(--accent)" /> Mi Perfil
      </h1>
      
      <div className="card" style={{ padding: 40 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ position: 'relative', width: 96, height: 96, margin: '0 auto 16px' }}>
            {user?.foto_perfil ? (
              <img src={user.foto_perfil} alt="Avatar" style={{ width: 96, height: 96, borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--accent)' }} />
            ) : (
              <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--primary-light)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 700 }}>
                {user?.nombre?.charAt(0)}{user?.apellido?.charAt(0)}
              </div>
            )}
            <label htmlFor="foto-upload" style={{ position: 'absolute', bottom: 0, right: 0, background: 'var(--accent)', color: 'white', borderRadius: '50%', width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
              <Edit3 size={14} />
            </label>
            <input type="file" id="foto-upload" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
          </div>
          <h3 style={{ fontSize: '1.5rem', marginBottom: 4 }}>{user?.nombre} {user?.apellido}</h3>
          <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <Mail size={16} /> {user?.email}
          </p>
          <p style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}>
            <strong>Sede:</strong> {user?.campus || 'No especificada'}
          </p>
          
          <div style={{ marginTop: 16 }}>
            {user?.verificado ? (
              <span className="badge badge-verificado" style={{ fontSize: '0.9rem', padding: '6px 16px' }}><ShieldCheck size={16} /> Estudiante Verificado</span>
            ) : (
              <Link to="/verificacion" className="btn btn-secondary btn-sm" style={{ marginTop: 8 }}>Verificar mi vinculación universitaria</Link>
            )}
          </div>
        </div>
        
        <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '32px 0' }} />

        {msg && <div className="alert alert-success">{msg}</div>}
        
        <form onSubmit={handleSubmit}>
          <h3 style={{ fontSize: '1.2rem', marginBottom: 20 }}>Editar Información</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div className="form-group">
              <label>Nombre</label>
              <input type="text" className="form-control" value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Apellido</label>
              <input type="text" className="form-control" value={form.apellido} onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))} />
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
            <div className="form-group">
              <label><Phone size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} /> Teléfono de contacto</label>
              <input type="tel" className="form-control" value={form.telefono} onChange={e => setForm(f => ({ ...f, telefono: e.target.value }))} />
            </div>
            <div className="form-group">
              <label>Campus UCC</label>
              <select required className="form-control" value={form.campus} onChange={e => setForm(f => ({ ...f, campus: e.target.value }))}>
                <option value="">Selecciona tu sede...</option>
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
            </div>
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={saving} style={{ marginTop: 24 }}>
            {saving ? 'Guardando...' : <><Edit3 size={18} /> Guardar cambios</>}
          </button>
        </form>
      </div>

      {/* Cuestionario de Convivencia Solidaria */}
      <div className="card" style={{ padding: 40, marginTop: 24 }}>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <GraduationCap size={24} className="text-ucc-green" /> Cuestionario de Convivencia Solidaria
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 20 }}>
          Completa este test rápido para calcular automáticamente el porcentaje de compatibilidad con tus anfitriones o huéspedes antes de reservar.
        </p>

        {prefsMsg && <div className="alert alert-success">{prefsMsg}</div>}

        <form onSubmit={handlePrefsSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {/* Estudio */}
            <div className="form-group">
              <label>Hábitos de estudio preferidos</label>
              <select 
                className="form-control" 
                value={prefForm.estudio} 
                onChange={e => setPrefForm(f => ({ ...f, estudio: e.target.value }))}
              >
                <option value="dia">Estudio Diurno (Mañana/Tarde)</option>
                <option value="noche">Estudio Nocturno (Noche/Madrugada)</option>
              </select>
            </div>

            {/* Ruido */}
            <div className="form-group">
              <label>Nivel de tolerancia al ruido / música</label>
              <select 
                className="form-control" 
                value={prefForm.ruido} 
                onChange={e => setPrefForm(f => ({ ...f, ruido: e.target.value }))}
              >
                <option value="bajo">Tolerancia Baja (Silencio total)</option>
                <option value="medio">Tolerancia Media (Ruido moderado/auriculares)</option>
                <option value="alto">Tolerancia Alta (Música/ambientes activos)</option>
              </select>
            </div>

            {/* Mascotas */}
            <div className="form-group">
              <label>¿Aceptas / convives con mascotas?</label>
              <select 
                className="form-control" 
                value={prefForm.mascotas} 
                onChange={e => setPrefForm(f => ({ ...f, mascotas: e.target.value }))}
              >
                <option value="si">Sí, me gustan / convivo con ellas</option>
                <option value="no">No, prefiero un espacio libre de mascotas</option>
              </select>
            </div>

            {/* Visitas */}
            <div className="form-group">
              <label>¿Permites / realizas visitas de amigos?</label>
              <select 
                className="form-control" 
                value={prefForm.visitas} 
                onChange={e => setPrefForm(f => ({ ...f, visitas: e.target.value }))}
              >
                <option value="si">Sí, visitas ocasionales están bien</option>
                <option value="no">No, prefiero privacidad absoluta</option>
              </select>
            </div>

            {/* Fumar */}
            <div className="form-group">
              <label>¿Tolerancia al humo / cigarrillo?</label>
              <select 
                className="form-control" 
                value={prefForm.fumar} 
                onChange={e => setPrefForm(f => ({ ...f, fumar: e.target.value }))}
              >
                <option value="si">Tolerancia (Permitido fumar en exteriores)</option>
                <option value="no">Sin tolerancia (Espacio 100% libre de humo)</option>
              </select>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-block" disabled={savingPrefs} style={{ marginTop: 24 }}>
            {savingPrefs ? 'Guardando preferencias...' : 'Guardar perfil de convivencia'}
          </button>
        </form>
      </div>

      {/* Dashboard de Impacto Solidario */}
      <div className="card" style={{ padding: 40, marginTop: 24 }}>
        <h3 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <ShieldCheck size={24} className="text-ucc-green" /> Tu Impacto Cooperativo HUASI
        </h3>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 24 }}>
          HUASI promueve la cooperación universitaria a través de la economía solidaria. Cada espacio que compartes ayuda a sostener y democratizar la movilidad educativa de tus compañeros.
        </p>

        {loadingImpact ? (
          <div style={{ textAlign: 'center', padding: '16px 0', color: 'var(--text-muted)' }}>Cargando estadísticas...</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            {/* Tarjeta 1: Noches */}
            <div style={{ padding: 24, background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 16, textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', tracking: 'wider', display: 'block', marginBottom: 8 }}>Noches de Alojamiento Brindadas</span>
              <strong style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--ucc-green)' }}>{impact.noches_ofrecidas}</strong>
              <span style={{ fontSize: '0.75rem', display: 'block', color: 'var(--text-muted)', marginTop: 8 }}>Noches compartidas con estudiantes</span>
            </div>

            {/* Tarjeta 2: Compañeros */}
            <div style={{ padding: 24, background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 16, textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', tracking: 'wider', display: 'block', marginBottom: 8 }}>Estudiantes UCC Apoyados</span>
              <strong style={{ fontSize: '2.2rem', fontWeight: 900, color: 'var(--accent)' }}>{impact.estudiantes_apoyados}</strong>
              <span style={{ fontSize: '0.75rem', display: 'block', color: 'var(--text-muted)', marginTop: 8 }}>Compañeros alojados en tu hogar</span>
            </div>

            {/* Tarjeta 3: Ahorro */}
            <div style={{ padding: 24, background: 'var(--bg-light)', border: '1px solid var(--border)', borderRadius: 16, textAlign: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', tracking: 'wider', display: 'block', marginBottom: 8 }}>Dinero Ahorrado a la Comunidad</span>
              <strong style={{ fontSize: '1.8rem', fontWeight: 900, color: '#b45309', display: 'block', margin: '4px 0' }}>
                ${Number(impact.dinero_ahorrado).toLocaleString('es-CO')}
              </strong>
              <span style={{ fontSize: '0.72rem', display: 'block', color: 'var(--text-muted)', marginTop: 4 }}>Ahorro estimado en hospedajes comerciales</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
