import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/Toast';
import { Link, useNavigate } from 'react-router-dom';
import { Clock, CheckCircle, ArrowRight, Loader2, ShieldCheck, RefreshCw, HelpCircle } from 'lucide-react';

export default function Register() {
  const { register, verifyOtp } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', nombre: '', apellido: '', campus: '' });
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

  // Helper para extraer Nombre y Apellido desde el correo de la UCC
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const allowedDomains = ['@campusucc.edu.co', '@ucc.edu.co'];
    if (!allowedDomains.some(domain => form.email.endsWith(domain))) {
      setError('Debes usar un correo institucional válido (@campusucc.edu.co o @ucc.edu.co)');
      setLoading(false);
      return;
    }

    if (!form.campus) {
      setError('Debes seleccionar tu campus UCC.');
      setLoading(false);
      return;
    }

    if (!aceptaTerminos || !aceptaPoliticas) {
      setError('Debes aceptar los Términos y Condiciones y las Políticas de Privacidad.');
      setLoading(false);
      return;
    }

    try {
      const res = await register(form);
      setUserName(form.nombre);
      setSuccessMsg(res.message || 'Código OTP enviado a tu correo.');
      setStep(2);
      setTimeLeft(300);
      toast.success(res.message || 'Código OTP enviado a tu correo.');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Error en el registro');
      toast.error(err.response?.data?.error || err.message || 'Error en el registro');
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
      toast.success('¡Verificación exitosa! Tu correo ha sido verificado.');
    } catch (err) {
      setOtpError(true);
      setError(err.response?.data?.error || err.message || 'El código OTP es incorrecto. Revisa tu correo o solicita uno nuevo.');
      toast.error(err.response?.data?.error || err.message || 'El código OTP es incorrecto. Revisa tu correo o solicita uno nuevo.');
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
      toast.success(res.message || 'Se envió un nuevo código OTP a tu correo.');
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo reenviar el código OTP.');
      toast.error(err.response?.data?.error || 'No se pudo reenviar el código OTP.');
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
            Tu correo institucional ha sido verificado correctamente. Ya puedes explorar y acceder a la red de alojamiento solidario de la Universidad Cooperativa de Colombia.
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

        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <img
            src="/logo_vertical.png"
            alt="HUASI Logo"
            style={{
              height: '85px',
              objectFit: 'contain',
              marginBottom: 12,
              marginLeft: 'auto',
              marginRight: 'auto'
            }}
          />
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
            <div className="form-group">
              <label>Correo Electrónico (@campusucc.edu.co o @ucc.edu.co)</label>
              <input type="email" required className="form-control"
                placeholder="usuario@campusucc.edu.co o usuario@ucc.edu.co"
                value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
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
              <span>⚠️</span>
              <span>
                <strong>Atención:</strong> Tu nombre y apellido deben coincidir <strong>exactamente</strong> con tu carnet o documento universitario para poder aprobar tu cuenta más adelante.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12 }}>
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

              <div className="form-group">
                <label>Contraseña</label>
                <input type="password" required className="form-control" minLength={6}
                  value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} />
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
                <span style={{ color: 'var(--danger)', fontWeight: 600 }}>⚠️</span>
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
              En correos <strong>@campusucc.edu.co</strong> (Outlook), revisa la carpeta <strong>Correo no deseado (Spam)</strong> o la pestaña <strong>"Otros"</strong>.
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
