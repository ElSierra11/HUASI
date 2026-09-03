import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle2, AlertTriangle, Send } from 'lucide-react';
import api from '../api';
import HuasiAlert from '../utils/alerts';

export default function OlvidoPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const ALLOWED_DOMAINS = ['campusucc.edu.co', 'ucc.edu.co'];

  const isValidDomain = (emailStr) => {
    if (!emailStr || !emailStr.includes('@')) return false;
    const domain = emailStr.split('@')[1]?.toLowerCase();
    return ALLOWED_DOMAINS.includes(domain);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!isValidDomain(email)) {
      const msg = 'Solo se permiten correos institucionales con dominio @campusucc.edu.co o @ucc.edu.co.';
      setError(msg);
      HuasiAlert.warning('Correo no permitido', msg);
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/olvido-password', { email: email.trim().toLowerCase() });
      setSubmitted(true);
      HuasiAlert.toast('Enlace de recuperación enviado', 'success');
    } catch (err) {
      const msg = err.response?.data?.error || 'Ocurrió un error al procesar tu solicitud. Por favor intenta de nuevo.';
      setError(msg);
      HuasiAlert.error('Error', msg);
    } finally {
      setLoading(false);
    }
  };

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
            ¿Olvidaste tu contraseña?
          </h1>
          <p className="subtitle" style={{ marginBottom: 0 }}>
            No te preocupes. Ingresa tu correo institucional y te enviaremos un enlace directo para recuperarla.
          </p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} style={{ flexShrink: 0 }} />
            <span>{error}</span>
          </div>
        )}

        {submitted ? (
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
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: 'var(--ucc-navy)' }}>
              ¡Correo enviado con éxito!
            </h3>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              Hemos enviado un enlace directo a <strong>{email}</strong>. Revisa tu bandeja de entrada o carpeta de spam y sigue las instrucciones para crear una nueva clave.
            </p>
            <p style={{ margin: '8px 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              ⏱️ El enlace es válido durante los próximos 60 minutos.
            </p>

            <Link
              to="/login"
              className="btn btn-primary btn-block"
              style={{ marginTop: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
            >
              <ArrowLeft size={16} /> Volver al Inicio de Sesión
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Correo Institucional UCC</label>
              <div style={{ position: 'relative' }}>
                <Mail size={18} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  id="reset-email"
                  type="email"
                  required
                  autoFocus
                  className="form-control"
                  placeholder="usuario@campusucc.edu.co"
                  style={{ paddingLeft: 44 }}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
              </div>
            </div>

            <button
              id="submit-olvido"
              type="submit"
              className="btn btn-primary btn-block"
              disabled={loading}
              style={{ padding: '14px', fontSize: '0.98rem', marginTop: 6, borderRadius: 'var(--radius-sm)' }}
            >
              {loading ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                  <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} /> Enviando enlace...
                </span>
              ) : (
                <><Send size={18} /> Enviar enlace de recuperación</>
              )}
            </button>

            <div style={{ marginTop: 12, textAlign: 'center' }}>
              <Link 
                to="/login" 
                style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: 6, 
                  fontSize: '0.88rem', 
                  fontWeight: 700, 
                  color: 'var(--text-muted)' 
                }}
              >
                <ArrowLeft size={16} /> Regresar a Iniciar Sesión
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
