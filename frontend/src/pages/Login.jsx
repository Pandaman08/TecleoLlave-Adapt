import React, { useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import CaptchaPhraseInput from '../components/login/CaptchaPhraseInput';
import TwoFactorModal from '../components/login/TwoFactorModal';
import LanguageSelector from '../components/LanguageSelector';
import { ShieldCheck, KeyRound, Sun, Moon, Lock, User, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Estados de los 3 campos
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [typingSample, setTypingSample] = useState(null);

  // Estados de feedback y carga
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // 2FA modal
  const [show2FaModal, setShow2FaModal] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const [pendingToken, setPendingToken] = useState(null);

  const isDev = Boolean(import.meta.env.DEV);

  // Limpiar errores al cambiar credenciales
  useEffect(() => {
    if (error) setError(null);
  }, [username, password]);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError(null);
    setSuccess(null);

    const u = username.trim();
    const p = password;

    if (!u || !p) {
      setError('Por favor complete su usuario y contraseña.');
      return;
    }

    if (!typingSample || !typingSample.events || typingSample.events.length < 35) {
      setError('Por favor complete la frase de verificación de seguridad en la sección derecha.');
      return;
    }

    setLoading(true);

    try {
      // PASO 1: Validación de credenciales de usuario (Paso 1 del login)
      let tokenRes;
      try {
        tokenRes = await api.post('/auth/login', { username: u, password: p });
      } catch (authErr) {
        setError(`Usuario o contraseña incorrectos.`);
        setLoading(false);
        return;
      }

      const token = tokenRes.data.access_token;
      const userId = tokenRes.data.user_id;

      // PASO 2: Evaluación biométrica silenciosa del patrón de tecleo capturado
      const authPayload = {
        raw_timestamps: typingSample.events,
        phrase_typed: typingSample.phrase_typed,
        username: u
      };

      const bioRes = await api.post('/typing/authenticate', authPayload);
      const decision = String(bioRes.data.decision || '').toLowerCase();

      // RESPUESTA DEL SISTEMA SEGÚN DECISIÓN TRI-ZONA:

      // CASO 1: ACCEPT / ALLOW -> Acceso concedido
      if (decision === 'allow' || decision === 'accept') {
        localStorage.setItem('token', token);
        if (userId) {
          localStorage.setItem('current_user_id', userId);
          localStorage.setItem('current_username', tokenRes.data.username || u);
        } else {
          localStorage.setItem('current_username', u);
        }
        setSuccess(`¡Identidad confirmada! Bienvenido, ${u}.`);
        setTimeout(() => navigate('/'), 700);
        return;
      }

      // CASO 2: CHALLENGE -> Desafío 2FA/TOTP sin exponer score biométrico
      if (decision === 'challenge') {
        setPendingToken({ token, userId, username: tokenRes.data.username || u });
        setShow2FaModal(true);
        setLoading(false);
        return;
      }

      // CASO 3: REJECT -> La biometría detectó que quien teclea NO es el dueño de la cuenta
      setError(`Acceso denegado: El patrón biométrico de tecleo no coincide. Tú no eres el usuario '${u}'.`);
      setTypingSample(null);
    } catch (err) {
      setError(`Acceso denegado: El patrón biométrico de tecleo no coincide. Tú no eres el usuario '${u}'.`);
      setTypingSample(null);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (code) => {
    setOtpError(null);
    setOtpLoading(true);
    try {
      const res = await api.post('/auth/verify-2fa', {
        username: pendingToken?.username || username,
        otp_code: code
      });
      localStorage.setItem('token', res.data.access_token || pendingToken?.token);
      if (pendingToken?.userId) {
        localStorage.setItem('current_user_id', pendingToken.userId);
        localStorage.setItem('current_username', pendingToken.username);
      }
      setSuccess('Verificación completada exitosamente.');
      setShow2FaModal(false);
      setTimeout(() => navigate('/'), 600);
    } catch (err) {
      setOtpError('Código de verificación incorrecto o expirado.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleFillDemo = (u) => {
    setUsername(u);
    if (u === 'demo_user') {
      setPassword('demo123456');
    } else {
      setPassword('123456');
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: 'var(--bg-canvas)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Topbar limpia */}
      <header className="topbar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--brand-600)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <KeyRound size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.1 }}>{t('app.title')}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Portal de Autenticación Segura</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <NavLink
            to="/live-demo"
            className="btn-secondary"
            style={{
              fontSize: '0.8rem',
              padding: '0.35rem 0.75rem',
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              color: 'var(--brand-500)',
              borderColor: 'var(--brand-500)',
              fontWeight: 600
            }}
          >
            Demo en Vivo (Sustentación) ⚡
          </NavLink>
          <NavLink to="/register" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
            Crear Cuenta (Enrolamiento)
          </NavLink>
          <LanguageSelector variant="compact" />
          <button
            type="button"
            className="btn-icon"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? t('app.theme_toggle_light') : t('app.theme_toggle_dark')}
            title={theme === 'dark' ? t('app.theme_toggle_light') : t('app.theme_toggle_dark')}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* Contenedor central: Tarjeta en 2 Columnas Horizontales */}
      <main style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1.5rem 1.5rem'
      }}>
        <div style={{
          maxWidth: '860px',
          width: '100%',
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem 2.25rem',
          boxShadow: 'var(--shadow-lg)'
        }}>
          {/* Encabezado compacto */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.5rem',
            paddingBottom: '1rem',
            borderBottom: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                backgroundColor: 'rgba(99, 102, 241, 0.1)',
                color: 'var(--brand-500)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <h1 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                  Iniciar Sesión
                </h1>
                <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                  Credenciales de acceso con verificación de seguridad integrada
                </p>
              </div>
            </div>

            <span style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              padding: '0.2rem 0.55rem',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'rgba(99, 102, 241, 0.08)',
              color: 'var(--brand-500)',
              border: '1px solid rgba(99, 102, 241, 0.2)'
            }}>
              Acceso Seguro
            </span>
          </div>

          {/* Alertas de error o éxito */}
          {error && (
            <div style={{
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger)',
              padding: '0.65rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              marginBottom: '1.25rem',
              textAlign: 'center',
              lineHeight: 1.4
            }}>
              {error}
            </div>
          )}

          {success && (
            <div style={{
              backgroundColor: 'var(--success-bg)',
              border: '1px solid var(--success-border)',
              color: 'var(--success)',
              padding: '0.65rem 0.9rem',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.82rem',
              marginBottom: '1.25rem',
              textAlign: 'center',
              lineHeight: 1.4
            }}>
              {success}
            </div>
          )}

          {/* Formulario en 2 Secciones (Grid de 2 Columnas) */}
          <form onSubmit={handleSubmit}>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '1.75rem',
              alignItems: 'stretch',
              marginBottom: '1.5rem'
            }}>
              {/* SECCIÓN 1 (IZQUIERDA): Credenciales de Usuario */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '1.1rem'
              }}>
                <div>
                  <div style={{
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: 'var(--text-secondary)',
                    marginBottom: '0.9rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.35rem'
                  }}>
                    <User size={14} style={{ color: 'var(--brand-500)' }} />
                    <span>1. Credenciales de Cuenta</span>
                  </div>

                  {/* Campo 1: Usuario */}
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '0.4rem'
                    }}>
                      Usuario
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="ej. alexis o user1"
                        autoComplete="username"
                        disabled={loading}
                        style={{
                          width: '100%',
                          height: 44,
                          padding: '0 0.85rem 0 2.5rem',
                          backgroundColor: 'var(--bg-canvas)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem',
                          outline: 'none',
                          transition: 'border-color 0.15s ease'
                        }}
                      />
                      <User size={16} style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)'
                      }} />
                    </div>
                  </div>

                  {/* Campo 2: Contraseña */}
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.82rem',
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      marginBottom: '0.4rem'
                    }}>
                      Contraseña
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoComplete="current-password"
                        disabled={loading}
                        style={{
                          width: '100%',
                          height: 44,
                          padding: '0 2.75rem 0 2.5rem',
                          backgroundColor: 'var(--bg-canvas)',
                          border: '1px solid var(--border-subtle)',
                          borderRadius: 'var(--radius-md)',
                          color: 'var(--text-primary)',
                          fontSize: '0.9rem',
                          outline: 'none',
                          transition: 'border-color 0.15s ease'
                        }}
                      />
                      <Lock size={16} style={{
                        position: 'absolute',
                        left: 12,
                        top: '50%',
                        transform: 'translateY(-50%)',
                        color: 'var(--text-muted)'
                      }} />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: 10,
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '0.25rem',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        title={showPassword ? 'Ocultar contraseña' : 'Ver contraseña'}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Atajos rápidos en desarrollo */}
                {isDev && (
                  <div style={{
                    paddingTop: '0.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Atajos demo:
                    </span>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleFillDemo('demo_user')}
                      style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}
                    >
                      demo_user
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleFillDemo('alexis')}
                      style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}
                    >
                      alexis
                    </button>
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => handleFillDemo('profesor')}
                      style={{ fontSize: '0.72rem', padding: '0.15rem 0.5rem' }}
                    >
                      profesor
                    </button>
                  </div>
                )}
              </div>

              {/* SECCIÓN 2 (DERECHA): Verificación de Seguridad en Bloque Unificado */}
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <CaptchaPhraseInput
                  onSampleComplete={setTypingSample}
                  disabled={loading}
                  error={error}
                />
              </div>
            </div>

            {/* Botón Principal (Abarca todo el ancho) */}
            <button
              type="submit"
              disabled={loading}
              className="btn-primary"
              style={{
                width: '100%',
                height: 48,
                fontSize: '0.98rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                borderRadius: 'var(--radius-md)'
              }}
            >
              {loading ? (
                <>
                  <span style={{
                    width: 18, height: 18, border: '2px solid rgba(255,255,255,0.3)',
                    borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block',
                    animation: 'spin 0.8s linear infinite'
                  }} />
                  <span>Verificando acceso...</span>
                </>
              ) : (
                <>
                  <span>Iniciar Sesión</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {/* Pie con enlace a registro */}
          <div style={{
            marginTop: '1.25rem',
            textAlign: 'center',
            fontSize: '0.82rem',
            color: 'var(--text-muted)'
          }}>
            ¿No tiene una cuenta?{' '}
            <NavLink
              to="/register"
              style={{ color: 'var(--brand-500)', fontWeight: 600, textDecoration: 'none' }}
            >
              Crear cuenta nueva
            </NavLink>
          </div>
        </div>
      </main>

      {/* Modal 2FA genérico cuando el motor tri-zona activa CHALLENGE */}
      <TwoFactorModal
        isOpen={show2FaModal}
        onClose={() => {
          if (!otpLoading) {
            setShow2FaModal(false);
            setOtpError(null);
          }
        }}
        onVerify={handleVerify2FA}
        username={pendingToken?.username || username}
        score={0.75}
        isSuspicious={false}
        loading={otpLoading}
        error={otpError}
      />
    </div>
  );
}
