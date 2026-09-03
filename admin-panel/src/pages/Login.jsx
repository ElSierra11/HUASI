import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Shield, Mail, Lock, LogIn, AlertCircle } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);

  const validate = () => {
    const newErrors = {};
    const emailTrim = form.email.trim();
    if (!emailTrim) {
      newErrors.email = 'El correo electrónico es obligatorio';
    } else if (!/^\S+@\S+\.\S+$/.test(emailTrim)) {
      newErrors.email = 'El formato del correo electrónico no es válido';
    }
    if (!form.password) {
      newErrors.password = 'La contraseña es obligatoria';
    } else if (form.password.length < 6) {
      newErrors.password = 'La contraseña debe tener al menos 6 caracteres';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');
    
    if (!validate()) {
      showToast('Por favor, corrige los errores en el formulario', 'error');
      return;
    }

    setLoading(true);
    try {
      await login(form.email.trim(), form.password);
      showToast('¡Inicio de sesión exitoso! Bienvenido al Panel de Control', 'success');
      navigate('/');
    } catch (err) {
      console.error(err);
      const errMsg = err.response?.status === 401
        ? 'Credenciales incorrectas. Por favor, inténtalo de nuevo.'
        : (err.response?.data?.error || 'Ocurrió un error al iniciar sesión. Inténtalo de nuevo.');
      setServerError(errMsg);
      showToast(errMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      minHeight: '100vh',
      backgroundColor: 'var(--bg-main)'
    }}>
      {/* Lado Izquierdo: Imagen Institucional (Split Screen) */}
      <div style={{
        flex: 1,
        display: 'none',
        position: 'relative',
        background: 'linear-gradient(135deg, #0d7c3d, #0098cd)',
        backgroundImage: 'url("https://images.unsplash.com/photo-1541339907198-e08756dedf3f?auto=format&fit=crop&q=80&w=1400")',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        '@media (min-width: 900px)': {
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '60px'
        }
      }} className="login-split-image">
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(13, 124, 61, 0.85), rgba(0, 152, 205, 0.85))' }} />
        
        <div style={{ position: 'relative', zIndex: 10 }}>
          <div style={{ background: 'white', padding: '10px 20px', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', gap: '10px', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
            <img src="/huasi-monograma.png" alt="HUASI" style={{ height: '24px', width: '24px', objectFit: 'contain' }} />
            <span style={{ fontWeight: 800, color: 'var(--primary)', letterSpacing: '1px' }}>HUASI</span>
          </div>
        </div>

        <div style={{ position: 'relative', zIndex: 10, maxWidth: '500px', color: 'white' }}>
          <h1 style={{ fontSize: '3rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '20px' }}>
            Panel de Administración Global
          </h1>
          <p style={{ fontSize: '1.1rem', opacity: 0.9, lineHeight: 1.6, fontWeight: 500 }}>
            Gestiona la comunidad de HUASI. Revisa solicitudes de estudiantes, modera reportes de comportamiento y asegura que la red solidaria funcione a la perfección.
          </p>
        </div>
      </div>

      {/* Lado Derecho: Formulario Blanco */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        backgroundColor: '#ffffff',
        position: 'relative'
      }}>
        <div style={{
          width: '100%',
          maxWidth: '440px',
        }}>
          
          <div style={{ marginBottom: '36px' }}>
            {/* Logo HUASI */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
              <img
                src="/huasi-monograma.png"
                alt="HUASI"
                style={{ width: 52, height: 52, objectFit: 'contain' }}
              />
              <div>
                <div style={{ fontWeight: 900, fontSize: '1.5rem', color: 'var(--primary)', letterSpacing: '-0.5px', lineHeight: 1 }}>HUASI</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.8px', marginTop: 3 }}>Panel de Administración</div>
              </div>
            </div>
            <h2 style={{ fontSize: '1.7rem', fontWeight: 800, color: 'var(--text)', marginBottom: '6px', letterSpacing: '-0.5px' }}>
              Bienvenido de nuevo
            </h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.92rem', fontWeight: 500 }}>
              Ingresa tus credenciales administrativas para continuar.
            </p>
          </div>

          {serverError && (
            <div className="alert alert-error" style={{ marginBottom: '24px', animation: 'fadeIn 0.3s' }}>
              <AlertCircle size={18} style={{ flexShrink: 0 }} />
              <span>{serverError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label htmlFor="email">Correo Electrónico Administrador</label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: errors.email ? 'var(--danger)' : 'var(--text-muted)',
                  display: 'flex',
                  transition: 'var(--transition)'
                }}>
                  <Mail size={18} />
                </span>
                <input
                  id="email"
                  type="email"
                  className="form-control"
                  placeholder="admin@stayu.com"
                  value={form.email}
                  onChange={e => {
                    setForm(f => ({ ...f, email: e.target.value }));
                    if (errors.email) setErrors(errs => ({ ...errs, email: null }));
                  }}
                  style={{
                    paddingLeft: '46px',
                    borderColor: errors.email ? 'var(--danger)' : 'var(--border)',
                    backgroundColor: '#f8fafc',
                    height: '52px'
                  }}
                  disabled={loading}
                />
              </div>
              {errors.email && (
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.8rem',
                  color: 'var(--danger)',
                  marginTop: '8px',
                  fontWeight: 600
                }}>
                  <AlertCircle size={14} /> {errors.email}
                </span>
              )}
            </div>

            <div className="form-group" style={{ marginBottom: '36px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label htmlFor="password">Contraseña</label>
              </div>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute',
                  left: '16px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: errors.password ? 'var(--danger)' : 'var(--text-muted)',
                  display: 'flex',
                  transition: 'var(--transition)'
                }}>
                  <Lock size={18} />
                </span>
                <input
                  id="password"
                  type="password"
                  className="form-control"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => {
                    setForm(f => ({ ...f, password: e.target.value }));
                    if (errors.password) setErrors(errs => ({ ...errs, password: null }));
                  }}
                  style={{
                    paddingLeft: '46px',
                    borderColor: errors.password ? 'var(--danger)' : 'var(--border)',
                    backgroundColor: '#f8fafc',
                    height: '52px'
                  }}
                  disabled={loading}
                />
              </div>
              {errors.password && (
                <span style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '0.8rem',
                  color: 'var(--danger)',
                  marginTop: '8px',
                  fontWeight: 600
                }}>
                  <AlertCircle size={14} /> {errors.password}
                </span>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
              style={{ padding: '16px 20px', borderRadius: '12px', fontSize: '1rem', fontWeight: 700 }}
            >
              {loading ? (
                <>
                  <span className="spinner" style={{ width: '20px', height: '20px', borderWidth: '3px', marginRight: '10px' }}></span>
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <LogIn size={20} />
                  Acceder al Panel
                </>
              )}
            </button>
          </form>

          {/* Franja institucional de logos */}
          <div style={{
            marginTop: 36,
            paddingTop: 24,
            borderTop: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 16
          }}>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px', margin: 0 }}>
              Una iniciativa de
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
              <img
                src="/ucc_logo.png"
                alt="Universidad Cooperativa de Colombia"
                style={{ height: 36, objectFit: 'contain', opacity: 0.85 }}
                title="Universidad Cooperativa de Colombia"
              />
              <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
              <img
                src="/indesco.png"
                alt="INDESCO"
                style={{ height: 30, objectFit: 'contain', opacity: 0.85 }}
                title="INDESCO"
              />
              <div style={{ width: 1, height: 28, background: 'var(--border)' }} />
              <img
                src="/territorios_solidarios.png"
                alt="Territorios Solidarios"
                style={{ height: 30, objectFit: 'contain', opacity: 0.85 }}
                title="Territorios Solidarios"
              />
            </div>
            <p style={{ textAlign: 'center', fontSize: '0.78rem', color: 'var(--text-muted)', fontWeight: 500, margin: 0 }}>
              &copy; {new Date().getFullYear()} Red de Hospedaje Solidario HUASI &mdash; Todos los derechos reservados.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
