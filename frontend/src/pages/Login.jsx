import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import { Mail, Lock, LogIn, Home, AlertTriangle } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/');
    } catch (err) {
      if (err.response?.status === 401) {
        setError('Credenciales incorrectas. Por favor, inténtalo de nuevo.');
      } else {
        setError(err.response?.data?.error || 'Ocurrió un error al iniciar sesión. Inténtalo de nuevo.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 24 }} className="flex flex-col items-center">
          <img 
            src="/huasi-monograma.png" 
            alt="HUASI Monograma" 
            className="h-20 w-20 object-contain mb-2 transition-transform duration-300 hover:scale-105" 
          />
          <span className="font-heading font-black text-2xl tracking-wider text-ucc-navy dark:text-white mb-3">
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
            <div style={{ position: 'relative' }}>
              <Lock size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                id="login-password"
                type="password"
                required
                className="form-control"
                placeholder="••••••••"
                style={{ paddingLeft: 44 }}
                value={form.password}
                onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              />
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
            <span>Red de Hospedaje Solidario Universitario</span>
          </span>
        </div>
      </div>
    </div>
  );
}
