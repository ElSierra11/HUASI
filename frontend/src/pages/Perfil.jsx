import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { UserCircle, ShieldCheck, Mail, Phone, Edit3 } from 'lucide-react';
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
    </div>
  );
}
