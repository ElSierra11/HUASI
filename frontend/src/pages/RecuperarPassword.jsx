import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Lock, Eye, EyeOff, CheckCircle2, AlertTriangle, KeyRound, ArrowLeft } from 'lucide-react';
import api from '../api';
import HuasiAlert from '../utils/alerts';

export default function RecuperarPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token') || '';
  const email = searchParams.get('email') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!token || !email) {
      setError('El enlace de recuperación es inválido o faltan parámetros.');
      return;
    }

    if (password.length < 6) {
      setError('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/recuperar-password', {
        token,
        email,
        nuevo_password: password
      });

      setSuccess(true);
      HuasiAlert.success('¡Contraseña actualizada!', 'Tu clave ha sido restablecida con éxito.');
      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      const msg = err.response?.data?.error || 'Error al restablecer la contraseña. El enlace puede haber expirado.';
      setError(msg);
      HuasiAlert.error('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <div className="auth-page">
        <div className="auth-card" style={{ textAlign: 'center' }}>
          <div style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            background: '#fef2f2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px'
          }}>
            <AlertTriangle size={30} />
          </div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: 8 }}>
            Enlace inválido o incompleto
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 20 }}>
            No se encontraron los datos necesarios en este enlace para restablecer tu contraseña.
          </p>
          <Link to="/olvido-password" className="btn btn-primary btn-block">
            Solicitar nuevo enlace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Brand Header */}
        <div style={{ textAlign: 'center', marginBottom: 24 }} className="flex flex-col items-center huasi-brand-container">
          <img 
            src="/huasi-monograma.png" 
            alt="HUASI Monograma" 
            className="h-16 w-16 object-contain mb-2 huasi-brand-monogram" 
          />
          <span className="font-heading font-black text-2xl tracking-wider text-ucc-navy dark:text-white mb-2 huasi-brand-text">
            HUASI
          </span>
          <h1 style={{ fontSize: '1.75rem', marginBottom: 6 }} className="font-heading font-black text-ucc-navy dark:text-white">
            Crear Nueva Contraseña
          </h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            Restableciendo clave para <strong>{email}</strong>
          </p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div style={{
            background: 'linear-gradient(135deg, rgba(13,124,61,0.08), rgba(5,150,105,0.04))',
            border: '1px solid rgba(13,124,61,0.25)',
            borderRadius: 'var(--radius)',
            padding: '24px 20px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 12
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              background: 'var(--ucc-green)',
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <CheckCircle2 size={28} />
            </div>
            <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--ucc-navy)' }}>
              ¡Contraseña Restablecida!
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
              Tu nueva clave ya está activa. Serás redirigido al inicio de sesión en unos instantes...
            </p>
            <Link to="/login" className="btn btn-primary" style={{ marginTop: 12 }}>
              Ir al Login Ahora
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Nueva Contraseña (mínimo 6 caracteres)</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={18} style={{ position: 'absolute', left: 14, color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  id="new-password"
                  type={showPass ? 'text' : 'password'}
                  required
                  autoFocus
                  className="form-control"
                  placeholder="••••••••"
                  style={{ paddingLeft: 44, paddingRight: 44 }}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(prev => !prev)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: 4
                  }}
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Confirmar Nueva Contraseña</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={18} style={{ position: 'absolute', left: 14, color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  id="confirm-password"
                  type={showConfirm ? 'text' : 'password'}
                  required
                  className="form-control"
                  placeholder="••••••••"
                  style={{ paddingLeft: 44, paddingRight: 44 }}
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(prev => !prev)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--text-muted)',
                    padding: 4
                  }}
                >
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              id="submit-new-password"
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
              style={{ padding: '14px', fontSize: '0.98rem', marginTop: 6, borderRadius: 'var(--radius-sm)' }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Actualizando clave...
                </span>
              ) : (
                <><KeyRound size={18} /> Guardar Nueva Contraseña</>
              )}
            </button>

            <div style={{ marginTop: 8, textAlign: 'center' }}>
              <Link 
                to="/login" 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: 6, 
                  fontSize: '0.85rem', 
                  fontWeight: 600, 
                  color: 'var(--text-muted)' 
                }}
              >
                <ArrowLeft size={14} /> Cancelar y volver al Login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
