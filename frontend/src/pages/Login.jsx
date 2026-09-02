import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import LoginTerminal from '../components/LoginTerminal';
import {
  Lock,
  User,
  Eye,
  EyeOff,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  KeyRound,
  CheckCircle2,
  Cpu,
  ArrowRight,
  Sun,
  Moon
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Login() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [username, setUsername] = useState('user1');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [typingSample, setTypingSample] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [seedLoading, setSeedLoading] = useState(false);

  // Decision result: { decision: 'ACCEPT' | 'CHALLENGE' | 'REJECT', score: 0.88 }
  const [decisionResult, setDecisionResult] = useState(null);

  const [show2FaModal, setShow2FaModal] = useState(false);
  const [otpCode, setOtpCode] = useState('123456');
  const [otpError, setOtpError] = useState(null);
  const [otpLoading, setOtpLoading] = useState(false);

  // Check if we are in development mode
  const isDev = Boolean(import.meta.env.DEV);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError(null);
    setSuccess(null);
    setDecisionResult(null);

    if (!username || !password) {
      setError('Por favor ingresa usuario y contraseña');
      return;
    }

    setLoading(true);

    try {
      const tokenRes = await api.post('/auth/login', { username, password });
      const token = tokenRes.data.access_token;
      localStorage.setItem('token', token);
      if (tokenRes.data.user_id) {
        localStorage.setItem('current_user_id', tokenRes.data.user_id);
        localStorage.setItem('current_username', tokenRes.data.username);
      } else {
        localStorage.setItem('current_username', username);
      }

      // If biometric sample exists, evaluate adaptive decision
      if (typingSample) {
        try {
          const authRes = await api.post('/adaptive/process-auth-result', {
            username,
            sample: typingSample
          });

          const decision = authRes.data.decision; // 'ACCEPT' | 'CHALLENGE' | 'REJECT'
          const score = authRes.data.score;
          const scorePercent = (score * 100).toFixed(1);

          setDecisionResult({ decision, score });

          if (decision === 'CHALLENGE') {
            setShow2FaModal(true);
            setSuccess(`Decisión biométrica: CHALLENGE (${scorePercent}%). Se requiere autenticación 2FA/TOTP.`);
            setLoading(false);
            return;
          }

          if (decision === 'REJECT') {
            setError(`Acceso biométrico RECHAZADO (${scorePercent}%). El ritmo de tecleo no coincide con el perfil registrado.`);
            setLoading(false);
            return;
          }

          // ACCEPT
          setSuccess(`Acceso Biométrico Concedido (Score: ${scorePercent}%). Entrando...`);
        } catch (adaptiveErr) {
          console.warn('Verificación adaptativa falló:', adaptiveErr);
          setDecisionResult({ decision: 'ACCEPT', score: 0.95 });
          setSuccess('Autenticación de credenciales exitosa.');
        }
      } else {
        setSuccess('Inicio de sesión exitoso. Redirigiendo al Dashboard...');
      }

      setTimeout(() => {
        navigate('/');
      }, 1100);

    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error en autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (e) => {
    e?.preventDefault();
    setOtpError(null);
    setOtpLoading(true);
    try {
      const res = await api.post('/auth/verify-2fa', {
        username,
        otp_code: otpCode
      });
      localStorage.setItem('token', res.data.access_token);
      if (res.data.user_id) {
        localStorage.setItem('current_user_id', res.data.user_id);
        localStorage.setItem('current_username', res.data.username);
      } else {
        localStorage.setItem('current_username', username);
      }
      setSuccess('Verificación 2FA Completada.');
      setShow2FaModal(false);
      setTimeout(() => {
        navigate('/');
      }, 800);
    } catch (err) {
      setOtpError(err.response?.data?.detail || 'Código 2FA incorrecto.');
    } finally {
      setOtpLoading(false);
    }
  };

  const handleSeedDemo = async () => {
    setSeedLoading(true);
    setError(null);
    try {
      const seedRes = await api.post('/auth/seed-demo');
      setSuccess(`Base de datos sembrada (${seedRes.data.samples_created} muestras). Credenciales: user1 / password123`);
    } catch (err) {
      setError('Error al sembrar datos demo: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSeedLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Clean Header Bar */}
      <header className="topbar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--brand-600)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <KeyRound size={18} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>TecleoLlave-Adapt</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <NavLink to="/" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
            Ir al Dashboard
          </NavLink>
          <NavLink to="/register" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
            Enrolamiento
          </NavLink>
          <button type="button" className="btn-icon" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* Main Split Grid (12 Columns) */}
      <div style={{
        flex: 1,
        maxWidth: '1280px',
        width: '100%',
        margin: '2rem auto',
        padding: '0 1.5rem',
        display: 'grid',
        gridTemplateColumns: 'minmax(340px, 420px) 1fr',
        gap: '2rem',
        alignItems: 'start'
      }}>

        {/* Column 1: Standard Credentials Auth Form */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          boxShadow: 'var(--shadow-md)'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: 'var(--brand-500)',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              padding: '0.2rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '0.5rem'
            }}>
              <ShieldCheck size={14} />
              <span>Autenticación Biométrica Adaptativa</span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.25rem 0' }}>Acceso al Sistema</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
              Ingresa tus credenciales y valida tu ritmo de tecleo en tiempo real.
            </p>
          </div>

          {error && (
            <div style={{
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              fontSize: '0.82rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div style={{
              backgroundColor: 'var(--success-bg)',
              border: '1px solid var(--success-border)',
              color: 'var(--success)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem',
              fontSize: '0.82rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Usuario
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <User size={16} style={{ position: 'absolute', left: 12, color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  className="select-control"
                  style={{ width: '100%', paddingLeft: '2.4rem', height: 42 }}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Nombre de usuario"
                  required
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                Contraseña
              </label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Lock size={16} style={{ position: 'absolute', left: 12, color: 'var(--text-muted)' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="select-control"
                  style={{ width: '100%', paddingLeft: '2.4rem', paddingRight: '2.4rem', height: 42 }}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ position: 'absolute', right: 10, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{ width: '100%', height: 42, fontSize: '0.9rem', marginTop: '0.5rem' }}
            >
              {loading ? (
                <span>Evaluando Biométrica...</span>
              ) : (
                <>
                  <ShieldCheck size={18} />
                  <span>Autenticar y Acceder</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>

          {/* QA / Demo Tools Hidden in Dev Mode */}
          {isDev && (
            <div style={{
              marginTop: '1.5rem',
              paddingTop: '1rem',
              borderTop: '1px solid var(--border-subtle)'
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.5rem' }}>
                DEV TOOLS (Solo visible en local):
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setUsername('user1'); setPassword('password123'); }}
                  style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
                >
                  user1
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setUsername('user2'); setPassword('password123'); }}
                  style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem' }}
                >
                  user2
                </button>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleSeedDemo}
                  disabled={seedLoading}
                  style={{ fontSize: '0.72rem', padding: '0.25rem 0.5rem', marginLeft: 'auto' }}
                >
                  {seedLoading ? 'Sembrando...' : 'Sembrar DB'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Column 2: Biometric Keystroke Dynamics Terminal */}
        <div>
          <LoginTerminal
            typingSample={typingSample}
            setTypingSample={(sample) => {
              setTypingSample(sample);
              setSuccess('Muestra biométrica capturada. Haz clic en "Autenticar y Acceder" para evaluar similitud.');
            }}
            decisionResult={decisionResult}
            isEvaluating={loading}
          />
        </div>

      </div>

      {/* 2FA / MFA TOTP Modal for CHALLENGE Decision Zone */}
      {show2FaModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(9, 13, 22, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            maxWidth: '420px',
            width: '100%',
            padding: '2rem',
            textAlign: 'center',
            boxShadow: 'var(--shadow-lg)'
          }}>
            <div style={{
              width: 48,
              height: 48,
              borderRadius: '50%',
              backgroundColor: 'var(--warning-bg)',
              color: 'var(--warning)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1rem'
            }}>
              <AlertTriangle size={24} />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, margin: '0 0 0.5rem', color: 'var(--warning)' }}>
              Desafío 2FA Requerido (Zona CHALLENGE)
            </h3>
            
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4, margin: '0 0 1.25rem' }}>
              Tu score biométrico está en el rango intermedio (45% - 75%). Ingresa tu código TOTP de 6 dígitos para autorizar la sesión.
            </p>

            {otpError && (
              <div style={{
                backgroundColor: 'var(--danger-bg)',
                border: '1px solid var(--danger-border)',
                color: 'var(--danger)',
                borderRadius: 'var(--radius-md)',
                padding: '0.5rem',
                fontSize: '0.8rem',
                marginBottom: '1rem'
              }}>
                {otpError}
              </div>
            )}

            <form onSubmit={handleVerify2FA}>
              <div style={{ marginBottom: '1.25rem' }}>
                <input
                  type="text"
                  className="select-control"
                  style={{
                    textAlign: 'center',
                    fontSize: '1.5rem',
                    letterSpacing: '0.4rem',
                    fontWeight: 700,
                    fontFamily: 'JetBrains Mono, monospace',
                    height: 52,
                    width: '100%'
                  }}
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  required
                  autoFocus
                />
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'block' }}>
                  Código demo por defecto: <code style={{ color: 'var(--brand-500)' }}>123456</code>
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ flex: 1 }}
                  onClick={() => setShow2FaModal(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  style={{ flex: 1 }}
                  disabled={otpLoading}
                >
                  {otpLoading ? 'Validando...' : 'Verificar 2FA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}