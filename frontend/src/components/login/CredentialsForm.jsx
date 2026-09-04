import { useState } from 'react';
import { Lock, User, Eye, EyeOff, ShieldCheck, ArrowRight, AlertTriangle, CheckCircle2, Database } from 'lucide-react';

/**
 * CredentialsForm
 * ---------------
 * Formulario de credenciales refactorizado con:
 *  - Credenciales vacías por defecto (no hardcodeadas)
 *  - Banner DEV solo visible en import.meta.env.DEV
 *  - Recordar dispositivo
 *  - Link "¿Olvidaste tu contraseña?"
 *  - Indicador de requisitos de contraseña
 */
export default function CredentialsForm({
  username,
  password,
  onUsernameChange,
  onPasswordChange,
  onSubmit,
  loading = false,
  error = null,
  success = null,
  hasBiometricSample = false,
  isDev = false,
  devUsers = [],
  onSeedDemo,
  seedLoading = false,
  onFillDemo
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);

  const handleSubmit = (e) => {
    e?.preventDefault();
    onSubmit?.({ username, password, rememberDevice });
  };

  const submitDisabled = loading || !username || !password;

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
      {error && (
        <div
          role="alert"
          style={{
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            borderRadius: 'var(--radius-md)',
            padding: '0.65rem 0.85rem',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <AlertTriangle size={16} style={{ flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div
          role="status"
          style={{
            backgroundColor: 'var(--success-bg)',
            border: '1px solid var(--success-border)',
            color: 'var(--success)',
            borderRadius: 'var(--radius-md)',
            padding: '0.65rem 0.85rem',
            fontSize: '0.82rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <span>{success}</span>
        </div>
      )}

      <Field
        label="Usuario"
        icon={User}
        type="text"
        value={username}
        onChange={onUsernameChange}
        placeholder="ej: juan.perez"
        autoComplete="username"
        autoFocus
      />

      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '0.4rem' }}>
          <label
            htmlFor="password-input"
            style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)' }}
          >
            Contraseña
          </label>
          <a
            href="#"
            onClick={(e) => e.preventDefault()}
            style={{
              fontSize: '0.72rem',
              color: 'var(--brand-500)',
              textDecoration: 'none',
              fontWeight: 500
            }}
          >
            ¿Olvidaste tu contraseña?
          </a>
        </div>
        <Field
          id="password-input"
          icon={Lock}
          type={showPassword ? 'text' : 'password'}
          value={password}
          onChange={onPasswordChange}
          placeholder="Tu contraseña"
          autoComplete="current-password"
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                padding: 0
              }}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
        />
      </div>

      {/* Remember device */}
      <label
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          cursor: 'pointer',
          userSelect: 'none'
        }}
      >
        <input
          type="checkbox"
          checked={rememberDevice}
          onChange={(e) => setRememberDevice(e.target.checked)}
          style={{ accentColor: 'var(--brand-500)', cursor: 'pointer' }}
        />
        <span>Recordar este dispositivo por 30 días</span>
      </label>

      <button
        type="submit"
        className="btn-primary"
        disabled={submitDisabled}
        style={{ width: '100%', height: 44, fontSize: '0.92rem', marginTop: '0.25rem' }}
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
            <span>Evaluando biometría...</span>
          </>
        ) : (
          <>
            <ShieldCheck size={18} />
            <span>{hasBiometricSample ? 'Verificar y Acceder' : 'Acceder (solo credenciales)'}</span>
            <ArrowRight size={16} />
          </>
        )}
      </button>

      {hasBiometricSample && (
        <div
          style={{
            fontSize: '0.72rem',
            color: 'var(--success)',
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.3rem'
          }}
        >
          <CheckCircle2 size={12} />
          <span>Muestra biométrica capturada · Se evaluará al hacer click</span>
        </div>
      )}

      {/* DEV tools */}
      {isDev && (
        <div
          style={{
            marginTop: '0.5rem',
            paddingTop: '1rem',
            borderTop: '1px solid var(--border-subtle)'
          }}
        >
          <div
            style={{
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              fontWeight: 600,
              marginBottom: '0.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <Database size={11} />
            <span>DEV TOOLS (solo local)</span>
          </div>
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {devUsers.map((u) => (
              <button
                key={u}
                type="button"
                className="btn-secondary"
                onClick={() => onFillDemo?.(u)}
                style={{ fontSize: '0.7rem', padding: '0.25rem 0.55rem' }}
              >
                {u}
              </button>
            ))}
            <button
              type="button"
              className="btn-secondary"
              onClick={onSeedDemo}
              disabled={seedLoading}
              style={{ fontSize: '0.7rem', padding: '0.25rem 0.55rem', marginLeft: 'auto' }}
            >
              {seedLoading ? 'Sembrando...' : 'Sembrar DB demo'}
            </button>
          </div>
        </div>
      )}
    </form>
  );
}

function Field({ label, icon: Icon, type = 'text', value, onChange, placeholder, autoComplete, autoFocus, trailing, id }) {
  return (
    <div>
      {label && (
        <label
          htmlFor={id}
          style={{
            display: 'block',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'var(--text-secondary)',
            marginBottom: '0.4rem'
          }}
        >
          {label}
        </label>
      )}
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {Icon && (
          <Icon
            size={16}
            style={{ position: 'absolute', left: 12, color: 'var(--text-muted)', pointerEvents: 'none' }}
          />
        )}
        <input
          id={id}
          type={type}
          className="select-control"
          style={{
            width: '100%',
            paddingLeft: Icon ? '2.4rem' : '0.85rem',
            paddingRight: trailing ? '2.4rem' : '0.85rem',
            height: 42
          }}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
        />
        {trailing && <div style={{ position: 'absolute', right: 10 }}>{trailing}</div>}
      </div>
    </div>
  );
}
