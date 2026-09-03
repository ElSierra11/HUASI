import { useRef, useState, useEffect, useCallback } from 'react';

const OTP_LENGTH = 6;

/**
 * OtpInput — Componente de autenticación OTP de 6 dígitos
 *
 * Props:
 *  - value       {string}    Valor actual del OTP (string de 6 chars)
 *  - onChange    {function}  Callback(newValue: string) cuando el OTP cambia
 *  - onComplete  {function}  Callback(otp: string) cuando los 6 dígitos están llenos
 *  - onResend    {function}  Callback al hacer clic en "Reenviar código"
 *  - resendDelay {number}   Segundos del temporizador (default: 60)
 *  - disabled    {boolean}  Deshabilita todas las casillas
 *  - hasError    {boolean}  Aplica estilos de error
 */
export default function OtpInput({
  value = '',
  onChange,
  onComplete,
  onResend,
  resendDelay = 60,
  disabled = false,
  hasError = false,
}) {
  const inputRefs = useRef([]);
  const [countdown, setCountdown] = useState(resendDelay);
  const [canResend, setCanResend] = useState(false);
  const timerRef = useRef(null);

  // Normalizar el valor a un array de OTP_LENGTH chars
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] || '');

  // ── Temporizador de reenvío ────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    setCountdown(resendDelay);
    setCanResend(false);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [resendDelay]);

  useEffect(() => {
    startTimer();
    return () => clearInterval(timerRef.current);
  }, [startTimer]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const focusAt = (index) => {
    const el = inputRefs.current[index];
    if (el) { el.focus(); el.select(); }
  };

  const updateDigit = (index, char) => {
    const newDigits = [...digits];
    newDigits[index] = char;
    const newValue = newDigits.join('');
    onChange?.(newValue);
    if (newDigits.filter(Boolean).length === OTP_LENGTH) {
      onComplete?.(newValue);
    }
  };

  // ── Eventos de teclado ─────────────────────────────────────────────────────
  const handleKeyDown = (e, index) => {
    if (e.key === 'Backspace') {
      e.preventDefault();
      if (digits[index]) { updateDigit(index, ''); }
      else if (index > 0) { updateDigit(index - 1, ''); focusAt(index - 1); }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      e.preventDefault(); focusAt(index - 1);
    } else if (e.key === 'ArrowRight' && index < OTP_LENGTH - 1) {
      e.preventDefault(); focusAt(index + 1);
    } else if (e.key === 'Delete') {
      e.preventDefault(); updateDigit(index, '');
    }
  };

  const handleInput = (e, index) => {
    const raw = e.target.value.replace(/\D/g, '');
    if (!raw) return;
    updateDigit(index, raw[raw.length - 1]);
    if (index < OTP_LENGTH - 1) focusAt(index + 1);
  };

  // ── Pegado desde portapapeles ──────────────────────────────────────────────
  const handlePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData
      .getData('text')
      .replace(/\D/g, '')
      .slice(0, OTP_LENGTH);
    if (!pasted) return;
    const newDigits = Array.from({ length: OTP_LENGTH }, (_, i) => pasted[i] || '');
    onChange?.(newDigits.join(''));
    const nextEmpty = newDigits.findIndex((d) => d === '');
    focusAt(nextEmpty === -1 ? OTP_LENGTH - 1 : nextEmpty);
    if (pasted.length === OTP_LENGTH) onComplete?.(pasted);
  };

  // ── Reenviar código ────────────────────────────────────────────────────────
  const handleResend = () => {
    if (!canResend) return;
    onChange?.('');
    focusAt(0);
    onResend?.();
    startTimer();
  };

  // ── Clases CSS ─────────────────────────────────────────────────────────────
  const baseCell = [
    'w-11 h-14 sm:w-12 sm:h-16',
    'text-center text-xl sm:text-2xl font-extrabold',
    'rounded-xl border-2 outline-none',
    'transition-all duration-200',
    'bg-white dark:bg-slate-800',
    'text-ucc-navy dark:text-white',
    'disabled:opacity-50 disabled:cursor-not-allowed',
  ].join(' ');

  const cellState = (index) => {
    if (hasError)
      return 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-950/20 focus:border-red-500 focus:ring-2 focus:ring-red-400/30';
    if (digits[index])
      return 'border-ucc-green dark:border-emerald-500 bg-ucc-green-light dark:bg-emerald-950/30 scale-[1.04]';
    return 'border-ucc-border dark:border-slate-600 focus:border-ucc-green focus:ring-2 focus:ring-ucc-green/20 dark:focus:border-emerald-500 dark:focus:ring-emerald-500/20';
  };

  return (
    <div className="flex flex-col items-center gap-5 select-none">
      {/* Casillas OTP */}
      <div
        className="flex items-center gap-2 sm:gap-3"
        onPaste={handlePaste}
        role="group"
        aria-label="Código de verificación de 6 dígitos"
      >
        {digits.map((digit, index) => (
          <input
            key={index}
            ref={(el) => (inputRefs.current[index] = el)}
            id={`otp-digit-${index}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            maxLength={1}
            value={digit}
            disabled={disabled}
            aria-label={`Dígito ${index + 1} de ${OTP_LENGTH}`}
            className={`${baseCell} ${cellState(index)}`}
            onKeyDown={(e) => handleKeyDown(e, index)}
            onInput={(e) => handleInput(e, index)}
            onChange={() => {}}
            onFocus={(e) => e.target.select()}
          />
        ))}
      </div>

      {/* Temporizador y botón de reenvío */}
      <div className="flex flex-col items-center gap-1.5 text-sm">
        {canResend ? (
          <button
            type="button"
            onClick={handleResend}
            className="font-semibold text-ucc-green dark:text-emerald-400 hover:underline transition-colors cursor-pointer"
          >
            Reenviar código
          </button>
        ) : (
          <p className="text-ucc-muted dark:text-slate-400 font-medium">
            Reenviar en{' '}
            <span className="font-bold text-ucc-navy dark:text-white tabular-nums">
              0:{String(countdown).padStart(2, '0')}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}
