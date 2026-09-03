import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import HuasiAlert from '../utils/alerts';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const ALLOWED_DOMAINS = ['campusucc.edu.co', 'ucc.edu.co'];

  const isValidDomain = (email) => {
    if (!email || !email.includes('@')) return false;
    const domain = email.split('@')[1]?.toLowerCase();
    return ALLOWED_DOMAINS.includes(domain);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isValidDomain(form.email)) {
      const msg = 'Solo se permiten correos institucionales con dominio @campusucc.edu.co o @ucc.edu.co.';
      setError(msg);
      HuasiAlert.warning('Correo no permitido', msg);
      return;
    }

    setLoading(true);
    try {
      await login(form.email, form.password);
      HuasiAlert.toast('¡Bienvenido a HUASI!', 'success');
      navigate('/');
    } catch (err) {
      const msg = err.response?.status === 401
        ? 'Credenciales incorrectas. Por favor, verifica tu correo y contraseña.'
        : (err.response?.data?.error || 'Ocurrió un error al iniciar sesión. Inténtalo de nuevo.');
      setError(msg);
      HuasiAlert.error('Error de autenticación', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }} className="flex flex-col items-center huasi-brand-container">
          <img 
            src="/huasi-monograma.png" 
            alt="HUASI Monograma" 
            className="h-20 w-20 object-contain mb-2 huasi-brand-monogram" 
          />
          <span className="font-heading font-black text-2xl tracking-wider text-ucc-navy dark:text-white mb-3 huasi-brand-text">
            HUASI
          </span>
          <h1 style={{ fontSize: '1.9rem', marginBottom: 6 }} className="font-heading font-black text-ucc-navy dark:text-white">¡Bienvenido de nuevo!</h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            Accede a tu cuenta de <strong>HUASI</strong> para continuar.
          </p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Correo Institucional</label>
            <div style={{ position: 'relative' }}>
              <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                id="login-email"
                type="email"
                required
                className="form-control"
                placeholder="usuario@campusucc.edu.co"
                style={{ paddingLeft: 44 }}
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Contraseña</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <Lock size={18} style={{ position: 'absolute', left: 14, color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                required
                className="form-control"
                placeholder="••••••••"
                style={{ paddingLeft: 44, paddingRight: 44 }}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                style={{
                  position: 'absolute',
                  right: 12,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: 4,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '4px',
                  transition: 'color 0.2s ease'
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 6 }}>
              <Link 
                to="/olvido-password" 
                style={{ 
                  fontSize: '0.84rem', 
                  color: 'var(--ucc-green)', 
                  fontWeight: 600,
                  textDecoration: 'none'
                }}
                className="hover:underline"
              >
                ¿Olvidaste tu contraseña?
              </Link>
            </div>
          </div>

          <button
            id="login-submit"
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
            style={{ padding: '15px', fontSize: '1rem', marginTop: 8, borderRadius: 'var(--radius-sm)' }}
          >
            {loading ? (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Ingresando...
              </span>
            ) : (
              <><LogIn size={18} /> Ingresar</>
            )}
          </button>
        </form>

        <div style={{ marginTop: 24, textAlign: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            ¿No tienes una cuenta?{' '}
            <Link to="/registro" style={{ fontWeight: 700, color: 'var(--accent)' }}>
              Regístrate aquí
            </Link>
          </p>
        </div>

        <div style={{
          marginTop: 24, padding: '12px 16px', background: 'var(--bg)',
          borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)',
          fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5
        }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, width: '100%' }}>
            <Lock size={14} style={{ color: 'var(--text-muted)' }} />
            <span>Solo correos <strong>@campusucc.edu.co</strong> o <strong>@ucc.edu.co</strong></span>
          </span>
        </div>
      </div>
    </div>
  );
}
