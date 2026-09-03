import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Home, Trash2, Plus, Save, AlertCircle, Heart, DollarSign, Tag, MapPin, Users, GraduationCap } from 'lucide-react';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import HuasiAlert from '../utils/alerts';
import SelectorUbicacionPropiedad from '../components/SelectorUbicacionPropiedad';

const AMENIDADES_OPCIONES = ['WiFi', 'Aire acondicionado', 'Cocina', 'Lavadora', 'Estacionamiento', 'TV', 'Agua caliente', 'Ventilador', 'Piscina', 'Terraza', 'Mascota permitida', 'Acceso independiente'];

const validateForm = (form) => {
  const errors = {};

  if (!form.titulo.trim()) errors.titulo = 'Agrega un título claro para que tu anuncio destaque.';
  else if (form.titulo.trim().length < 8) errors.titulo = 'El título debe tener al menos 8 caracteres.';
  else if (form.titulo.trim().length > 80) errors.titulo = 'El título no puede superar 80 caracteres.';

  if (!form.descripcion.trim()) errors.descripcion = 'Describe tu espacio y qué hace especial tu alojamiento.';
  else if (form.descripcion.trim().length < 30) errors.descripcion = 'Añade al menos 30 caracteres para que la descripción sea útil.';
  else if (form.descripcion.trim().length > 500) errors.descripcion = 'La descripción no puede superar 500 caracteres.';

  if (!form.direccion.trim()) errors.direccion = 'La dirección ayuda a los estudiantes a ubicar tu propiedad.';
  else if (form.direccion.trim().length < 5) errors.direccion = 'La dirección parece incompleta.';

  if (form.barrio && form.barrio.trim().length > 60) errors.barrio = 'El barrio no puede superar 60 caracteres.';

  if (!form.campus_cercano) errors.campus_cercano = 'Selecciona la sede UCC más cercana.';

  if (!form.capacidad || Number(form.capacidad) < 1 || Number(form.capacidad) > 12) {
    errors.capacidad = 'La capacidad debe estar entre 1 y 12 huéspedes.';
  }

  if (form.duracion_maxima && (Number(form.duracion_maxima) < 1 || Number(form.duracion_maxima) > 365)) {
    errors.duracion_maxima = 'La duración máxima debe ser entre 1 y 365 días.';
  }

  return errors;
};

export default function HostPropertyForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { user } = useAuth();
  const isEdit = !!id;

  const [form, setForm] = useState({
    titulo: '', descripcion: '', direccion: '', barrio: '', tipo: 'habitacion',
    capacidad: 1, amenidades: [], reglas: '', campus_cercano: '', duracion_maxima: '',
    latitud: null, longitud: null
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (!isEdit && user && user.campus) {
      setForm(f => ({ ...f, campus_cercano: user.campus }));
    }
  }, [isEdit, user]);

  useEffect(() => {
    if (isEdit) {
      setLoading(true);
      api.get(`/propiedades/${id}`)
        .then(res => {
          const p = res.data;
          setForm({
            titulo: p.titulo, descripcion: p.descripcion || '', direccion: p.direccion,
            barrio: p.barrio || '', tipo: p.tipo, capacidad: p.capacidad,
            amenidades: p.amenidades || [], reglas: p.reglas || '',
            campus_cercano: p.campus_cercano || '', duracion_maxima: p.duracion_maxima || '',
            es_pago: p.es_pago || false, precio_por_noche: p.precio_por_noche || '',
            latitud: p.latitud || null, longitud: p.longitud || null
          });
        })
        .catch(() => navigate('/host'))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const toggleAmenidad = (a) => {
    setForm(f => ({
      ...f,
      amenidades: f.amenidades.includes(a)
        ? f.amenidades.filter(x => x !== a)
        : [...f.amenidades, a]
    }));
  };

  const updateField = (field, value) => {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: undefined }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const nextErrors = validateForm(form);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      setError('Revisa los campos marcados antes de publicar.');
      toast.warning('Completa los campos obligatorios para continuar.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (k === 'amenidades') {
          fd.append(k, JSON.stringify(v));
        } else {
          fd.append(k, v);
        }
      });

      if (isEdit) {
        await api.put(`/propiedades/${id}`, fd);
        await HuasiAlert.success('¡Publicación Actualizada!', 'Los cambios de tu alojamiento se han guardado exitosamente.');
      } else {
        await api.post('/propiedades', fd);
        await HuasiAlert.success('¡Alojamiento Publicado!', 'Tu espacio solidario ya está visible para la comunidad universitaria.');
      }
      navigate('/host');
    } catch (err) {
      console.error('Submission error:', err, err.response?.data);
      const msg = err.response?.data?.error || `Error al guardar propiedad: ${err.message}`;
      setError(msg);
      HuasiAlert.error('Error al guardar', msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  const tipoEtiqueta = {
    cama: 'Cama',
    sofa: 'Sofá',
    hamaca: 'Hamaca',
    habitacion: 'Habitación',
    alquiler: 'Alquiler',
    otro: 'Otro'
  }[form.tipo] || 'Alojamiento';

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', paddingBottom: 60 }}>
      <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
        <Home size={32} color="var(--accent)" />
        {isEdit ? 'Editar propiedad' : 'Publicar nueva propiedad'}
      </h1>
      <p style={{ color: 'var(--text-muted)', marginBottom: 24 }}>Un anuncio claro aumenta tus reservas. Completa los campos esenciales y revisa tu vista previa antes de publicar.</p>

      {error && <div className="alert alert-error"><AlertCircle size={16} style={{ marginRight: 8 }} />{error}</div>}

      <form onSubmit={handleSubmit} className="card" style={{ padding: 32 }}>

        <div className="form-group">
          <label>Título del anuncio *</label>
          <input type="text" className="form-control" placeholder="Ej: Habitación acogedora cerca del campus UCC" required maxLength={80}
            value={form.titulo} onChange={e => updateField('titulo', e.target.value)} />
          <small style={{ color: 'var(--text-muted)' }}>{form.titulo.length}/80 caracteres · Sé específico y breve.</small>
          {errors.titulo && <small style={{ color: 'var(--danger)' }}>{errors.titulo}</small>}
        </div>

        <div className="form-group">
          <label>Descripción *</label>
          <textarea className="form-control" placeholder="Describe tu espacio, incluído, horarios, acceso y por qué es ideal para estudiantes..." required maxLength={500}
            value={form.descripcion} onChange={e => updateField('descripcion', e.target.value)} rows={4} />
          <small style={{ color: 'var(--text-muted)' }}>{form.descripcion.length}/500 caracteres · Menciona comodidades, ubicación y reglas.</small>
          {errors.descripcion && <small style={{ color: 'var(--danger)' }}>{errors.descripcion}</small>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          <div className="form-group">
            <label>Tipo de alojamiento *</label>
            <select className="form-control" value={form.tipo} onChange={e => updateField('tipo', e.target.value)}>
              <option value="cama">Cama</option>
              <option value="sofa">Sofá</option>
              <option value="hamaca">Hamaca</option>
              <option value="habitacion">Habitación</option>
              <option value="alquiler">Alquiler</option>
              <option value="otro">Otro</option>
            </select>
          </div>
          <div className="form-group">
            <label>Capacidad (huéspedes) *</label>
            <input type="number" className="form-control" min="1" max="12" required
              value={form.capacidad} onChange={e => updateField('capacidad', e.target.value)} />
            {errors.capacidad && <small style={{ color: 'var(--danger)' }}>{errors.capacidad}</small>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          <div className="form-group">
            <label>Campus UCC más cercano *</label>
            <select required className="form-control" value={form.campus_cercano} onChange={e => updateField('campus_cercano', e.target.value)}>
              <option value="">Selecciona la sede...</option>
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
            {errors.campus_cercano && <small style={{ color: 'var(--danger)' }}>{errors.campus_cercano}</small>}
          </div>
          <div className="form-group">
            <label>Duración máxima del hospedaje (días)</label>
            <input type="number" className="form-control" min="1" max="365" placeholder="Ej: 15"
              value={form.duracion_maxima} onChange={e => updateField('duracion_maxima', e.target.value)} />
            <small style={{ color: 'var(--text-muted)' }}>Opcional: ayuda a filtrar solicitudes poco realistas.</small>
            {errors.duracion_maxima && <small style={{ color: 'var(--danger)' }}>{errors.duracion_maxima}</small>}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          <div className="form-group">
            <label>Dirección *</label>
            <input type="text" className="form-control" placeholder="Calle, número, edificio..." required
              value={form.direccion} onChange={e => updateField('direccion', e.target.value)} />
            {errors.direccion && <small style={{ color: 'var(--danger)' }}>{errors.direccion}</small>}
          </div>
          <div className="form-group">
            <label>Barrio</label>
            <input type="text" className="form-control" placeholder="Ej: Laureles, Chapinero, Bavaria..."
              value={form.barrio} onChange={e => updateField('barrio', e.target.value)} />
            {errors.barrio && <small style={{ color: 'var(--danger)' }}>{errors.barrio}</small>}
          </div>
        </div>

        {/* Módulo de Validación y Mapa Interactivo con Google Maps y Waze */}
        <SelectorUbicacionPropiedad
          direccion={form.direccion}
          barrio={form.barrio}
          campus={form.campus_cercano}
          latitud={form.latitud}
          longitud={form.longitud}
          onChangeCoordinates={(lat, lng) => {
            setForm(f => ({ ...f, latitud: lat, longitud: lng }));
          }}
        />

        <div className="form-group" style={{ marginTop: 12 }}>
          <label>Amenidades</label>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', marginBottom: 10 }}>Selecciona solo las que realmente ofreces; 4–6 es suficiente.</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {AMENIDADES_OPCIONES.map(a => (
              <button type="button" key={a} onClick={() => toggleAmenidad(a)}
                style={{
                  padding: '8px 14px', borderRadius: 'var(--radius-full)', border: '1px solid',
                  borderColor: form.amenidades.includes(a) ? 'var(--accent)' : 'var(--border)',
                  background: form.amenidades.includes(a) ? 'var(--accent-light)' : 'transparent',
                  color: form.amenidades.includes(a) ? 'var(--accent-hover)' : 'var(--text-muted)',
                  fontSize: '0.9rem', cursor: 'pointer', transition: 'var(--transition)', fontWeight: 500
                }}>
                {a}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label>Reglas del lugar</label>
          <textarea className="form-control" placeholder="Ej: No fumar, no mascotas, llegada hasta las 10pm..."
            value={form.reglas} onChange={e => updateField('reglas', e.target.value)} rows={3} />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={saving} style={{ marginTop: 24, padding: 16, fontSize: '1.1rem' }}>
          {saving ? 'Guardando...' : <><Save size={20} /> {isEdit ? 'Guardar cambios' : 'Publicar propiedad'}</>}
        </button>

        <div className="card" style={{ marginTop: 24, padding: 20, background: 'linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)' }}>
          <h3 style={{ fontSize: '1rem', marginBottom: 8, color: 'var(--primary)' }}>Vista previa rápida</h3>
          <p style={{ fontSize: '0.92rem', marginBottom: 12, color: 'var(--text-muted)' }}>Así se verá tu anuncio para los estudiantes.</p>
          <div style={{ display: 'grid', gap: 8 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center' }}>
              <strong style={{ color: 'var(--primary)' }}>{form.titulo || 'Título del anuncio'}</strong>
              <span className="badge badge-aceptada">{tipoEtiqueta}</span>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', whiteSpace: 'pre-line' }}>{form.descripcion || 'Agrega una descripción para que los estudiantes sepan qué esperar.'}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              <span className="inline-flex items-center gap-1.5"><MapPin size={15} className="text-ucc-green" /> {form.barrio || 'Barrio'}</span>
              <span className="inline-flex items-center gap-1.5"><Users size={15} className="text-ucc-cyan" /> {form.capacidad || 1} huésped(es)</span>
              <span className="inline-flex items-center gap-1.5"><GraduationCap size={15} className="text-emerald-500" /> {form.campus_cercano || 'Campus'}</span>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
