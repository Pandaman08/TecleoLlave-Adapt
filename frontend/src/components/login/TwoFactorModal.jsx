import { useState, useEffect, useRef } from 'react';
import { AlertTriangle, X, ShieldCheck, Clock, Clipboard, Smartphone } from 'lucide-react';

/**
 * TwoFactorModal
 * --------------
 * Modal de desafío 2FA/TOTP cuando el score biométrico cae en zona CHALLENGE.
 * Mejora la versión actual con:
 *  - Countdown del código TOTP (30s con barra de progreso)
 *  - Botón de paste desde portapapeles
 *  - Diferenciación visual entre challenge "amigable" vs "sospechoso"
 *  - Auto-focus y auto-submit cuando se completan 6 dígitos
 *  - Accesibilidad: ESC para cerrar, focus trap
 */
export default function TwoFactorModal({
  isOpen,
  onClose,
  onVerify,
  username,
  score,
  isSuspicious = false,
  loading = false,
  error = null
}) {
  const [code, setCode] = useState('');
  const [secondsLeft, setSecondsLeft] = useState(30);
  const [pasted, setPasted] = useState(false);
  const inputRef = useRef(null);

  // Countdown TOTP (30s cycle)
  useEffect(() => {
    if (!isOpen) return;
    setSecondsLeft(30);
    const interval = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 30 : s - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Reset code on open
  useEffect(() => {
    if (isOpen) {
      setCode('');
      setPasted(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Auto-submit when 6 digits entered
  useEffect(() => {
    if (code.length === 6 && /^\d{6}$/.test(code) && !loading) {
      onVerify?.(code);
    }
  }, [code, loading, onVerify]);

  // ESC to close
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape' && !loading) onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      const digits = text.replace(/\D/g, '').slice(0, 6);
      if (digits.length === 6) {
        setCode(digits);
        setPasted(true);
      }
    } catch {
      // Clipboard API not available or denied
    }
  };

  const progress = (secondsLeft / 30) * 100;
  const isExpiring = secondsLeft <= 5;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="twofa-title"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(9, 13, 22, 0.8)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '1rem',
        animation: 'fadeIn 0.2s ease'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose?.();
      }}
    >
      <div
        style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          maxWidth: '440px',
          width: '100%',
          padding: '2rem',
          boxShadow: 'var(--shadow-lg)',
          animation: 'success-pop 0.3s ease',
          position: 'relative'
        }}
      >
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Cerrar"
          style={{
            position: 'absolute',
            top: 12,
            right: 12,
            width: 32,
            height: 32,
            borderRadius: '50%',
            background: 'transparent',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: loading ? 0.3 : 1
          }}
        >
          <X size={18} />
        </button>

        {/* Icon */}
        <div
          style={{
            width: 56,
            height: 56,
            borderRadius: '50%',
            backgroundColor: isSuspicious ? 'var(--danger-bg)' : 'var(--warning-bg)',
            color: isSuspicious ? 'var(--danger)' : 'var(--warning)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 1.25rem'
          }}
        >
          {isSuspicious ? <AlertTriangle size={28} /> : <Smartphone size={28} />}
        </div>

        {/* Title */}
        <h3
          id="twofa-title"
          style={{
            fontSize: '1.2rem',
            fontWeight: 700,
            margin: '0 0 0.5rem',
            textAlign: 'center',
            color: isSuspicious ? 'var(--danger)' : 'var(--warning)'
          }}
        >
          {isSuspicious ? 'Verificación adicional requerida' : 'Confirma con tu código 2FA'}
        </h3>

        {/* Description */}
        <p
          style={{
            fontSize: '0.82rem',
            color: 'var(--text-muted)',
            lineHeight: 1.5,
            margin: '0 0 1.25rem',
            textAlign: 'center'
          }}
        >
          {isSuspicious
            ? `Detectamos un patrón rítmico inusual (${(score * 100).toFixed(0)}%). Por seguridad, confirma tu identidad con un código TOTP.`
            : `Tu score biométrico (${(score * 100).toFixed(0)}%) está en zona intermedia. Ingresa tu código de 6 dígitos de la app autenticadora.`}
        </p>

        {error && (
          <div
            role="alert"
            style={{
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger)',
              borderRadius: 'var(--radius-md)',
              padding: '0.6rem 0.85rem',
              fontSize: '0.8rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}
          >
            <AlertTriangle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* OTP Input + Paste */}
        <div style={{ marginBottom: '1.25rem' }}>
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              value={code}
              onChange={(e) => {
                const v = e.target.value.replace(/\D/g, '').slice(0, 6);
                setCode(v);
                setPasted(false);
              }}
              placeholder="000000"
              disabled={loading}
              aria-label="Código de 6 dígitos"
              style={{
                width: '100%',
                height: 56,
                textAlign: 'center',
                fontSize: '1.6rem',
                letterSpacing: '0.5rem',
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
                backgroundColor: 'var(--bg-canvas)',
                border: `2px solid ${error ? 'var(--danger)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-md)',
                color: 'var(--text-primary)',
                outline: 'none',
                transition: 'border-color 0.2s ease'
              }}
            />
          </div>

          {/* Paste button + countdown */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '0.6rem',
              fontSize: '0.72rem',
              color: 'var(--text-muted)'
            }}
          >
            <button
              type="button"
              onClick={handlePaste}
              disabled={loading || code.length === 6}
              style={{
                background: 'transparent',
                border: 'none',
                color: pasted ? 'var(--success)' : 'var(--brand-500)',
                cursor: code.length === 6 ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                fontSize: '0.72rem',
                fontWeight: 600,
                padding: 0,
                opacity: code.length === 6 ? 0.5 : 1
              }}
            >
              <Clipboard size={12} />
              <span>{pasted ? '¡Pegado!' : 'Pegar del portapapeles'}</span>
            </button>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                color: isExpiring ? 'var(--danger)' : 'var(--text-muted)'
              }}
            >
              <Clock size={11} />
              <span style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                {secondsLeft}s
              </span>
              <div
                style={{
                  width: 30,
                  height: 3,
                  backgroundColor: 'var(--bg-canvas)',
                  borderRadius: 2,
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${progress}%`,
                    backgroundColor: isExpiring ? 'var(--danger)' : 'var(--brand-500)',
                    transition: 'width 1s linear, background-color 0.3s ease'
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Helper info */}
        <div
          style={{
            padding: '0.6rem 0.75rem',
            backgroundColor: 'var(--info-bg)',
            border: '1px solid var(--info-border)',
            borderRadius: 'var(--radius-sm)',
            color: 'var(--info)',
            fontSize: '0.72rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <ShieldCheck size={12} style={{ flexShrink: 0 }} />
          <span>
            Demo: usa <code style={{ color: 'var(--brand-500)', fontWeight: 700 }}>123456</code> o cualquier código de tu app
            autenticadora.
          </span>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button
            type="button"
            className="btn-secondary"
            onClick={onClose}
            disabled={loading}
            style={{ flex: 1, height: 42 }}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => code.length === 6 && onVerify?.(code)}
            disabled={loading || code.length !== 6}
            style={{ flex: 1, height: 42 }}
          >
            {loading ? (
              <>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    border: '2px solid currentColor',
                    borderTopColor: 'transparent',
                    animation: 'spin 0.8s linear infinite'
                  }}
                />
                <span>Validando...</span>
              </>
            ) : (
              <span>Verificar</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
