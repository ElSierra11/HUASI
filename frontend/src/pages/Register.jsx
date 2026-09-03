import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, ArrowRight, Loader2, ShieldCheck, RefreshCw, HelpCircle, AlertTriangle, Eye, EyeOff, Lock, Check } from 'lucide-react';
import HuasiAlert from '../utils/alerts';

export default function Register() {
  const { register, verifyOtp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', nombre: '', apellido: '', campus: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpArray, setOtpArray] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);
  const [step, setStep] = useState(1); // 1: Formulario, 2: OTP, 3: Éxito
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300);
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [aceptaPoliticas, setAceptaPoliticas] = useState(false);
  const [userName, setUserName] = useState('');
  const [countdown, setCountdown] = useState(4);
  const [otpError, setOtpError] = useState(false);
  const [resending, setResending] = useState(false);

  // Validación de seguridad de contraseña en tiempo real
  const pwdMinLength = form.password.length >= 8;
  const pwdHasLetter = /[a-zA-Z]/.test(form.password);
  const pwdHasNumber = /[0-9]/.test(form.password);
  const pwdHasSpecial = /[^a-zA-Z0-9]/.test(form.password);
  const isPasswordValid = pwdMinLength && pwdHasLetter && pwdHasNumber;

  const getPasswordStrength = () => {
    if (!form.password) return { level: 0, text: '', color: 'var(--border)', percent: '0%' };
    let score = 0;
    if (pwdMinLength) score++;
    if (pwdHasLetter) score++;
    if (pwdHasNumber) score++;
    if (pwdHasSpecial || form.password.length >= 12) score++;

    if (score <= 1) return { level: 1, text: 'Débil', color: '#ef4444', percent: '25%' };
    if (score === 2) return { level: 2, text: 'Aceptable', color: '#f59e0b', percent: '50%' };
    if (score === 3) return { level: 3, text: 'Buena', color: '#10b981', percent: '75%' };
    return { level: 4, text: 'Excelente', color: '#0d7c3d', percent: '100%' };
  };

  const pwdStrength = getPasswordStrength();

  // Helper para extraer Nombre y Apellido desde el correo electrónico
  const extractNameFromEmail = (email) => {
    if (!email) return { nombre: '', apellido: '' };
    const prefix = email.split('@')[0];
    if (!prefix) return { nombre: '', apellido: '' };

    const parts = prefix.split(/[\._\-]/);
    let extractedNombre = '';
    let extractedApellido = '';

    if (parts.length >= 1) {
      extractedNombre = parts[0].replace(/\d+/g, '');
      extractedNombre = extractedNombre.charAt(0).toUpperCase() + extractedNombre.slice(1);
    }
    if (parts.length >= 2) {
      extractedApellido = parts[1].replace(/\d+/g, '');
      extractedApellido = extractedApellido.charAt(0).toUpperCase() + extractedApellido.slice(1);

      if (parts.length >= 3) {
        const third = parts[2].replace(/\d+/g, '');
        if (third) {
          extractedApellido += ' ' + third.charAt(0).toUpperCase() + third.slice(1);
        }
      }
    }
    return { nombre: extractedNombre.trim(), apellido: extractedApellido.trim() };
  };

  // Sincronizar OTP array con el string OTP
  useEffect(() => {
    setOtp(otpArray.join(''));
  }, [otpArray]);

  // Lógica de extracción de nombres en base al correo
  useEffect(() => {
    if (!form.email || !form.email.includes('@')) return;
    const { nombre, apellido } = extractNameFromEmail(form.email);
    setForm(f => ({
      ...f,
      nombre: f.nombre ? f.nombre : nombre,
      apellido: f.apellido ? f.apellido : apellido
    }));
  }, [form.email]);

  // Timer del OTP
  useEffect(() => {
    let timer;
    if (step === 2 && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0 && step === 2) {
      setError('El código OTP ha expirado. Por favor, intenta registrarte de nuevo.');
    }
    return () => clearInterval(timer);
  }, [step, timeLeft]);

  // Countdown de redireccion en paso 3
  useEffect(() => {
    if (step !== 3) return;
    if (countdown <= 0) {
      navigate('/');
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [step, countdown, navigate]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

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
      HuasiAlert.warning('Dominio no permitido', msg);
      return;
    }

    if (!form.campus) {
      const msg = 'Debes seleccionar tu campus o sede universitaria.';
      setError(msg);
      HuasiAlert.warning('Campus requerido', msg);
      return;
    }

    if (!pwdMinLength) {
      const msg = 'La contraseña debe tener al menos 8 caracteres.';
      setError(msg);
      HuasiAlert.warning('Contraseña muy corta', msg);
      return;
    }

    if (!pwdHasLetter || !pwdHasNumber) {
      const msg = 'La contraseña debe incluir al menos una letra y un número.';
      setError(msg);
      HuasiAlert.warning('Contraseña poco segura', msg);
      return;
    }

    if (!aceptaTerminos || !aceptaPoliticas) {
      const msg = 'Debes aceptar los Términos y Condiciones y las Políticas de Privacidad.';
      setError(msg);
      HuasiAlert.warning('Aceptación requerida', msg);
      return;
    }

    setLoading(true);
    try {
      const res = await register(form);
      setUserName(form.nombre);
      setSuccessMsg(res.message || 'Código OTP enviado a tu correo.');
      setStep(2);
      setTimeLeft(300);
      HuasiAlert.success('¡Código Enviado!', 'Hemos enviado un código OTP de 6 dígitos a tu correo institucional.');
    } catch (err) {
      const msg = err.response?.data?.error || err.message || 'Error en el registro';
      setError(msg);
      HuasiAlert.error('Error en el registro', msg);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (value, index) => {
    const cleanValue = value.replace(/[^0-9]/g, '');
    if (!cleanValue) {
      const newOtp = [...otpArray];
      newOtp[index] = '';
      setOtpArray(newOtp);
      return;
    }

    const newOtp = [...otpArray];
    newOtp[index] = cleanValue.substring(cleanValue.length - 1);
    setOtpArray(newOtp);

    const newOtpValue = newOtp.join('');
    if (newOtpValue.length === 6) {
      // Verificar automáticamente si se ingresaron los 6 dígitos
      verifyOtpCode(newOtpValue);
    }

    if (index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      if (!otpArray[index] && index > 0) {
        const newOtp = [...otpArray];
        newOtp[index - 1] = '';
        setOtpArray(newOtp);
        otpRefs.current[index - 1]?.focus();
      } else {
        const newOtp = [...otpArray];
        newOtp[index] = '';
        setOtpArray(newOtp);
      }
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtpArray(newOtp);
      otpRefs.current[5]?.focus();
      if (newOtp.join('').length === 6) {
        // Verificar automáticamente si se pegó un código de 6 dígitos
        verifyOtpCode(newOtp.join(''));
      }
    }
  };

  const verifyOtpCode = async (otpValue = otp) => {
    setError('');
    setOtpError(false);

    if (timeLeft <= 0) {
      setError('El código OTP ha expirado. Solicita uno nuevo para continuar.');
      return;
    }

    if (otpValue.length !== 6) {
      setOtpError(true);
      setError('Ingresa los 6 dígitos del código OTP.');
      return;
    }

    setLoading(true);
    try {
      await verifyOtp(form.email, otpValue);
      setStep(3);
      setSuccessMsg('');
      HuasiAlert.success('¡Cuenta Verificada!', 'Tu identidad universitaria ha sido confirmada con éxito.');
    } catch (err) {
      setOtpError(true);
      const msg = err.response?.data?.error || err.message || 'El código OTP es incorrecto. Revisa tu correo o solicita uno nuevo.';
      setError(msg);
      HuasiAlert.error('Código inválido', msg);
      resetOtp();
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    await verifyOtpCode();
  };

  const handleResendOtp = async () => {
    setResending(true);
    setError('');
    setOtpError(false);
    try {
      const res = await register(form);
      setSuccessMsg(res.message || 'Se envió un nuevo código OTP a tu correo.');
      setStep(2);
      setTimeLeft(300);
      resetOtp();
      HuasiAlert.toast('Nuevo código OTP enviado', 'info');
    } catch (err) {
      const msg = err.response?.data?.error || 'No se pudo reenviar el código OTP.';
      setError(msg);
      HuasiAlert.error('Error al reenviar', msg);
    } finally {
      setResending(false);
    }
  };

  const focusOtp = () => {
    setTimeout(() => otpRefs.current[0]?.focus(), 60);
  };

  const resetOtp = () => {
    setOtpArray(['', '', '', '', '', '']);
    setOtp('');
    setOtpError(false);
    focusOtp();
  };

  // ===================== PASO 3: PANTALLA DE ÉXITO =====================
  if (step === 3) {
    return (
      <div className="auth-page" style={{ maxWidth: '640px' }}>
        <div className="auth-card" style={{ textAlign: 'center', padding: '48px 32px' }}>
          {/* Ícono animado de verificación */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 96,
            height: 96,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #22c55e, #16a34a)',
            boxShadow: '0 0 0 12px rgba(34,197,94,0.15)',
            marginBottom: 28,
            animation: 'pulse 2s infinite'
          }}>
            <CheckCircle size={52} color="white" strokeWidth={2} />
          </div>

          <h2 style={{ fontSize: '1.9rem', marginBottom: 8, color: 'var(--text-primary)' }}>
            ¡Verificación Exitosa!
          </h2>

          <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginBottom: 8 }}>
            ¡Bienvenido a <strong style={{ color: 'var(--accent)' }}>HUASI</strong>, {userName || 'estudiante'}!
          </p>

          <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: 32 }}>
            Tu correo ha sido verificado correctamente. Ya puedes explorar y acceder a la red de alojamiento solidario universitario.
          </p>

          {/* Barra de progreso animada */}
          <div style={{
            width: '100%',
            height: 4,
            background: 'var(--bg-secondary)',
            borderRadius: 2,
            overflow: 'hidden',
            marginBottom: 20
          }}>
            <div style={{
              height: '100%',
              background: 'linear-gradient(90deg, #22c55e, #16a34a)',
              borderRadius: 2,
              animation: `progress-shrink ${countdown + 0.5}s linear forwards`
            }} />
          </div>

          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 24 }}>
            Redirigiendo automáticamente en <strong style={{ color: 'var(--accent)' }}>{countdown}</strong> segundo{countdown !== 1 ? 's' : ''}...
          </p>

          <button
            className="btn btn-primary btn-block"
            onClick={() => navigate('/')}
            style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
          >
            Entrar a HUASI ahora <ArrowRight size={18} />
          </button>
        </div>

        <style>{`
          @keyframes pulse {
            0%, 100% { box-shadow: 0 0 0 12px rgba(34,197,94,0.15); }
            50% { box-shadow: 0 0 0 20px rgba(34,197,94,0.05); }
          }
          @keyframes progress-shrink {
            from { width: 100%; }
            to { width: 0%; }
          }
        `}</style>
      </div>
    );
  }

  // ===================== PASOS 1 y 2 =====================
  return (
    <div className="auth-page" style={{ position: 'relative', overflow: 'visible', maxWidth: '640px' }}>
      {/* Círculos de brillo ambiental premium detrás de la tarjeta */}
      <div style={{
        position: 'absolute',
        width: '280px',
        height: '280px',
        background: 'radial-gradient(circle, rgba(0, 152, 205, 0.15) 0%, transparent 70%)',
        top: '-10%',
        left: '-20%',
        pointerEvents: 'none',
        zIndex: 0
      }} />
      <div style={{
        position: 'absolute',
        width: '300px',
        height: '300px',
        background: 'radial-gradient(circle, rgba(122, 184, 0, 0.12) 0%, transparent 70%)',
        bottom: '-10%',
        right: '-20%',
        pointerEvents: 'none',
        zIndex: 0
      }} />

      <div className="auth-card" style={{
        position: 'relative',
        zIndex: 1,
        backdropFilter: 'blur(16px)',
        background: 'rgba(255, 255, 255, 0.85)',
        border: '1px solid rgba(226, 232, 240, 0.8)',
        boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.08)',
        maxWidth: '100%',
        width: '100%',
        margin: '0 auto'
      }}>
        {/* Stepper Premium */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'relative',
          marginBottom: 36,
          padding: '0 12px'
        }}>
          {/* Línea de fondo */}
          <div style={{
            position: 'absolute',
            top: '18px',
            left: '30px',
            right: '30px',
            height: '3px',
            backgroundColor: 'var(--border)',
            zIndex: 1
          }} />
          {/* Línea de progreso activa */}
          <div style={{
            position: 'absolute',
            top: '18px',
            left: '30px',
            width: step === 1 ? '0%' : step === 2 ? '50%' : '100%',
            height: '3px',
            backgroundColor: 'var(--accent)',
            transition: 'width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
            zIndex: 1
          }} />

          {/* Círculos de los pasos */}
          {[
            { num: 1, label: 'Datos' },
            { num: 2, label: 'Verificar' },
            { num: 3, label: 'Listo' }
          ].map((s) => {
            const isActive = step >= s.num;
            const isCurrent = step === s.num;
            return (
              <div key={s.num} style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                zIndex: 2,
                position: 'relative'
              }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '50%',
                  backgroundColor: isCurrent ? 'var(--accent)' : isActive ? 'var(--secondary)' : 'var(--bg)',
                  border: `2px solid ${isCurrent || isActive ? 'transparent' : 'var(--border)'}`,
                  color: isCurrent || isActive ? 'white' : 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '0.88rem',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: isCurrent ? '0 0 14px rgba(0, 152, 205, 0.4)' : 'none'
                }}>
                  {s.num}
                </div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: isCurrent ? '600' : '500',
                  color: isCurrent ? 'var(--accent)' : 'var(--text-muted)',
                  marginTop: '6px',
                  transition: 'all 0.3s ease'
                }}>{s.label}</span>
              </div>
            );
          })}
        </div>

        <div style={{ textAlign: 'center', marginBottom: 16 }} className="flex flex-col items-center huasi-brand-container">
          <img
            src="/huasi-monograma.png"
            alt="HUASI Monograma"
            className="h-20 w-20 object-contain mb-2 huasi-brand-monogram"
          />
          <span className="font-heading font-black text-2xl tracking-wider text-ucc-navy dark:text-white huasi-brand-text">
            HUASI
          </span>
        </div>
        <h2 style={{ fontSize: '1.8rem', textAlign: 'center', letterSpacing: '-0.02em', color: 'var(--primary)' }}>Únete a HUASI</h2>
        <p className="subtitle" style={{ textAlign: 'center', fontSize: '0.92rem', color: 'var(--text-muted)', marginTop: '4px', marginBottom: '24px' }}>
          {step === 1 ? (
            'Crea tu cuenta para acceder a la red de alojamiento.'
          ) : (
            <>
              Verifica tu identidad ingresando el código OTP enviado al correo:
              <br />
              <strong style={{ color: 'var(--text-primary)', display: 'block', marginTop: '6px', fontSize: '1rem', wordBreak: 'break-all' }}>
                {form.email}
              </strong>
            </>
          )}
        </p>

        {step === 1 ? (
          <form onSubmit={handleSubmit}>
            {/* Error display - visible para paso 1 */}
            {error && (
              <div style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                background: 'rgba(239,68,68,0.08)',
                border: '1.5px solid rgba(239,68,68,0.35)',
                borderRadius: 'var(--radius-sm)',
                padding: '12px 14px',
                marginBottom: 16,
                fontSize: '0.85rem',
                color: '#dc2626',
                fontWeight: 600,
                lineHeight: 1.4
              }}>
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>&#9888;</span>
                <span>{error}</span>
              </div>
            )}
            <div className="form-group">
              <label>Correo Electrónico Institucional</label>
              <input type="email" required className="form-control"
                placeholder="usuario@campusucc.edu.co"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: 4, display: 'block' }}>
                Solo correos <strong>@campusucc.edu.co</strong> o <strong>@ucc.edu.co</strong>
              </small>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
              <div className="form-group">
                <label>Nombre</label>
                <input type="text" required className="form-control"
                  value={form.nombre} onChange={e => setForm(f => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div className="form-group">
                <label>Apellido</label>
                <input type="text" required className="form-control"
                  value={form.apellido} onChange={e => setForm(f => ({ ...f, apellido: e.target.value }))} />
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--accent-light)',
              borderLeft: '4px solid var(--accent)',
              borderRadius: 'var(--radius-sm)',
              padding: '12px',
              fontSize: '0.8rem',
              color: 'var(--accent-hover)',
              marginTop: '-8px',
              marginBottom: '20px',
              lineHeight: '1.4',
              display: 'flex',
              gap: '8px',
              alignItems: 'flex-start'
            }}>
              <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Atención:</strong> Tu nombre y apellido deben coincidir <strong>exactamente</strong> con tu carnet o documento universitario para poder aprobar tu cuenta más adelante.
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: 16 }}>
              <label>Campus / Sede Universitaria</label>
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

            <div className="form-group" style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ margin: 0 }}>Contraseña</label>
                {form.password && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: pwdStrength.color }}>
                    Seguridad: {pwdStrength.text}
                  </span>
                )}
              </div>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={18} style={{ position: 'absolute', left: 14, color: 'var(--text-muted)', pointerEvents: 'none' }} />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  className="form-control"
                  placeholder="Mínimo 8 caracteres (letras y números)"
                  style={{ paddingLeft: 44, paddingRight: 44 }}
                  minLength={8}
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

              {/* Barra visual de fortaleza */}
              {form.password && (
                <div style={{ marginTop: 8, height: 4, width: '100%', background: 'var(--border)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: pwdStrength.percent,
                    background: pwdStrength.color,
                    transition: 'all 0.3s ease'
                  }} />
                </div>
              )}

              {/* Requisitos interactivos en tiempo real */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8, fontSize: '0.75rem' }}>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  borderRadius: '12px',
                  background: pwdMinLength ? 'rgba(13, 124, 61, 0.1)' : 'var(--bg)',
                  color: pwdMinLength ? '#0d7c3d' : 'var(--text-muted)',
                  border: `1px solid ${pwdMinLength ? '#bbf7d0' : 'var(--border)'}`,
                  fontWeight: pwdMinLength ? 600 : 400,
                  transition: 'all 0.2s ease'
                }}>
                  {pwdMinLength ? <Check size={12} strokeWidth={3} /> : <span style={{ width: 12, textAlign: 'center' }}>•</span>}
                  8+ caracteres
                </span>

                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  borderRadius: '12px',
                  background: pwdHasLetter ? 'rgba(13, 124, 61, 0.1)' : 'var(--bg)',
                  color: pwdHasLetter ? '#0d7c3d' : 'var(--text-muted)',
                  border: `1px solid ${pwdHasLetter ? '#bbf7d0' : 'var(--border)'}`,
                  fontWeight: pwdHasLetter ? 600 : 400,
                  transition: 'all 0.2s ease'
                }}>
                  {pwdHasLetter ? <Check size={12} strokeWidth={3} /> : <span style={{ width: 12, textAlign: 'center' }}>•</span>}
                  1+ letra
                </span>

                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 8px',
                  borderRadius: '12px',
                  background: pwdHasNumber ? 'rgba(13, 124, 61, 0.1)' : 'var(--bg)',
                  color: pwdHasNumber ? '#0d7c3d' : 'var(--text-muted)',
                  border: `1px solid ${pwdHasNumber ? '#bbf7d0' : 'var(--border)'}`,
                  fontWeight: pwdHasNumber ? 600 : 400,
                  transition: 'all 0.2s ease'
                }}>
                  {pwdHasNumber ? <Check size={12} strokeWidth={3} /> : <span style={{ width: 12, textAlign: 'center' }}>•</span>}
                  1+ número
                </span>
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <input type="checkbox" id="aceptaTerminos" required checked={aceptaTerminos} onChange={e => setAceptaTerminos(e.target.checked)} style={{ marginTop: 4 }} />
                <label htmlFor="aceptaTerminos" style={{ fontWeight: 'normal', fontSize: '0.82rem', cursor: 'pointer', lineHeight: '1.4', color: 'var(--text-muted)' }}>
                  Acepto los <Link to="/terminos" target="_blank" style={{ color: 'var(--accent)', fontWeight: 600 }}>Términos y Condiciones</Link> de HUASI.
                </label>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <input type="checkbox" id="aceptaPoliticas" required checked={aceptaPoliticas} onChange={e => setAceptaPoliticas(e.target.checked)} style={{ marginTop: 4 }} />
                <label htmlFor="aceptaPoliticas" style={{ fontWeight: 'normal', fontSize: '0.82rem', cursor: 'pointer', lineHeight: '1.4', color: 'var(--text-muted)' }}>
                  Acepto las <Link to="/privacidad" target="_blank" style={{ color: 'var(--accent)', fontWeight: 600 }}>Políticas de Privacidad</Link> de HUASI.
                </label>
              </div>
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading} style={{ marginTop: 16, padding: 16 }}>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Procesando...</span>
                </div>
              ) : (
                'Crear cuenta'
              )}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp}>
            <div className="timer-container" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginBottom: 8,
              color: timeLeft < 60 ? 'var(--danger)' : 'var(--text-muted)',
              fontWeight: 700,
              fontSize: '0.95rem'
            }}>
              <Clock size={18} />
              <span>Tiempo restante: {formatTime(timeLeft)}</span>
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: 8,
              marginBottom: 12,
              color: 'var(--accent-hover)',
              fontSize: '0.9rem',
              fontWeight: 600
            }}>
              <ShieldCheck size={16} />
              <span>Tu correo está a un paso de quedar verificado.</span>
            </div>

            {otpError && (
              <div className="alert alert-error" style={{ borderRadius: 'var(--radius-sm)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
                <span>El código no coincide. Revisa tu correo o solicita uno nuevo.</span>
              </div>
            )}

            <div className="form-group" style={{ textAlign: 'center' }}>
              <label style={{ marginBottom: 12, display: 'block', fontWeight: 600, color: 'var(--text-primary)' }}>Código OTP (6 dígitos)</label>

              <div style={{ display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '8px', margin: '8px 0 8px' }}>
                {otpArray.map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    maxLength={1}
                    ref={el => otpRefs.current[index] = el}
                    value={digit}
                    onChange={e => handleOtpChange(e.target.value, index)}
                    onKeyDown={e => handleOtpKeyDown(e, index)}
                    onPaste={handleOtpPaste}
                    style={{
                      width: '42px',
                      height: '50px',
                      fontSize: '1.5rem',
                      textAlign: 'center',
                      fontWeight: 'bold',
                      border: otpError ? '2px solid var(--danger)' : '2px solid var(--border)',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: otpError ? 'rgba(239, 68, 68, 0.06)' : 'var(--bg-card)',
                      color: otpError ? 'var(--danger)' : 'var(--text)',
                      boxShadow: otpError ? '0 0 0 3px rgba(239, 68, 68, 0.12)' : 'var(--shadow-sm)',
                      animation: otpError ? 'shake 0.25s ease' : 'none',
                      transition: 'all 0.3s ease',
                      outline: 'none'
                    }}
                    className="otp-box"
                    onFocus={e => e.target.style.borderColor = 'var(--accent)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border)'}
                  />
                ))}
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              padding: '14px',
              fontSize: '0.85rem',
              color: 'var(--text-muted)',
              marginBottom: 16,
              lineHeight: '1.5'
            }}>
              <strong className="inline-flex items-center gap-1 text-ucc-navy dark:text-white"><HelpCircle size={15} className="text-ucc-green" /> ¿No encuentras el correo en tu bandeja?</strong><br />
              En tu correo institucional o personal, revisa la carpeta <strong>Correo no deseado (Spam)</strong> o la pestaña <strong>"Otros"</strong>.
            </div>

            <button type="button" className="btn btn-secondary btn-block" onClick={handleResendOtp} disabled={resending || timeLeft === 0} style={{ marginBottom: 10, padding: 14 }}>
              {resending ? <><Loader2 className="animate-spin" size={16} /> Reenviando…</> : <><RefreshCw size={16} /> Reenviar código</>}
            </button>

            <button type="button" className="btn btn-secondary btn-block" onClick={() => setStep(1)} style={{ marginTop: 12, padding: 16 }}>
              Volver y corregir correo
            </button>
          </form>
        )}

        {step === 1 && (
          <p style={{ textAlign: 'center', marginTop: 24, color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            ¿Ya tienes una cuenta? <Link to="/login" style={{ fontWeight: 600, color: 'var(--accent)' }}>Ingresa aquí</Link>
          </p>
        )}
      </div>

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          50% { transform: translateX(4px); }
          75% { transform: translateX(-3px); }
        }
      `}</style>
    </div>
  );
}
