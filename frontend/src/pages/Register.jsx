import { useState } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import TypingCapture from '../components/TypingCapture';
import {
  UserPlus,
  User,
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Sun,
  Moon,
  KeyRound
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [samples, setSamples] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const REQUIRED_SAMPLES = 5;

  const handleSampleCaptured = (sample) => {
    const updated = [...samples, sample];
    setSamples(updated);

    if (updated.length >= REQUIRED_SAMPLES) {
      setSuccess(`¡Has completado las ${REQUIRED_SAMPLES} muestras requeridas! Haz clic en "Finalizar Enrolamiento".`);
    }
  };

  const handleStep1Next = (e) => {
    e?.preventDefault();
    setError(null);
    if (!username.trim()) {
      setError('Por favor ingresa un nombre de usuario');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }
    setStep(2);
  };

  const handleRegisterSubmit = async () => {
    if (samples.length < REQUIRED_SAMPLES) {
      setError(`Se requieren al menos ${REQUIRED_SAMPLES} muestras biométricas de tecleo.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await api.post('/auth/register', {
        username,
        password,
        samples
      });

      if (res.data?.id) {
        localStorage.setItem('current_user_id', res.data.id);
        localStorage.setItem('current_username', res.data.username);
      }

      setSuccess('Usuario y modelo base v1 (M0) registrados exitosamente.');
      setStep(3);

      setTimeout(() => {
        navigate('/login');
      }, 2200);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error registrando usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', display: 'flex', flexDirection: 'column' }}>
      
      {/* Clean Topbar */}
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
            <UserPlus size={18} />
          </div>
          <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>TecleoLlave Enrolamiento</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <NavLink to="/" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
            Ir al Dashboard
          </NavLink>
          <NavLink to="/login" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
            Terminal Login
          </NavLink>
          <button type="button" className="btn-icon" onClick={toggleTheme}>
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div style={{
        maxWidth: '680px',
        width: '100%',
        margin: '2.5rem auto',
        padding: '0 1.5rem'
      }}>
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '2.25rem',
          boxShadow: 'var(--shadow-md)'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.75rem' }}>
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
              <span>Enrolamiento de Perfil Biométrico</span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.25rem 0' }}>Registro de Nuevo Usuario</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
              Captura 5 muestras de tecleo para inicializar tu vector de calibración $M_0$.
            </p>
          </div>

          {/* Stepper Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '1.75rem',
            padding: '0.75rem 1rem',
            backgroundColor: 'var(--bg-surface-elevated)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: step >= 1 ? 'var(--brand-500)' : 'var(--text-muted)' }}>
              <span style={{
                width: 24, height: 24, borderRadius: '50%',
                backgroundColor: step > 1 ? 'var(--success)' : step === 1 ? 'var(--brand-600)' : 'var(--bg-surface)',
                color: '#fff', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {step > 1 ? '✓' : '1'}
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Credenciales</span>
            </div>

            <div style={{ height: 1, flex: 1, backgroundColor: 'var(--border-subtle)', margin: '0 0.75rem' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: step >= 2 ? 'var(--brand-500)' : 'var(--text-muted)' }}>
              <span style={{
                width: 24, height: 24, borderRadius: '50%',
                backgroundColor: step > 2 ? 'var(--success)' : step === 2 ? 'var(--brand-600)' : 'var(--bg-surface)',
                color: '#fff', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                {step > 2 ? '✓' : '2'}
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Biometría ({samples.length}/{REQUIRED_SAMPLES})</span>
            </div>

            <div style={{ height: 1, flex: 1, backgroundColor: 'var(--border-subtle)', margin: '0 0.75rem' }} />

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: step === 3 ? 'var(--success)' : 'var(--text-muted)' }}>
              <span style={{
                width: 24, height: 24, borderRadius: '50%',
                backgroundColor: step === 3 ? 'var(--success)' : 'var(--bg-surface)',
                color: '#fff', fontSize: '0.75rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                3
              </span>
              <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>Modelo $M_0$</span>
            </div>
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
              <AlertTriangle size={16} />
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
              <CheckCircle2 size={16} />
              <span>{success}</span>
            </div>
          )}

          {/* STEP 1: Account Info */}
          {step === 1 && (
            <form onSubmit={handleStep1Next} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Nombre de Usuario
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <User size={16} style={{ position: 'absolute', left: 12, color: 'var(--text-muted)' }} />
                  <input
                    type="text"
                    className="select-control"
                    style={{ width: '100%', paddingLeft: '2.4rem', height: 42 }}
                    placeholder="ej: analista.seguridad"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    autoFocus
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Contraseña (mínimo 6 caracteres)
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 12, color: 'var(--text-muted)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="select-control"
                    style={{ width: '100%', paddingLeft: '2.4rem', paddingRight: '2.4rem', height: 42 }}
                    placeholder="Contraseña"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              <div>
                <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.4rem' }}>
                  Confirmar Contraseña
                </label>
                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                  <Lock size={16} style={{ position: 'absolute', left: 12, color: 'var(--text-muted)' }} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="select-control"
                    style={{ width: '100%', paddingLeft: '2.4rem', height: 42 }}
                    placeholder="Repite tu contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ height: 42, fontSize: '0.9rem', marginTop: '0.5rem' }}
              >
                <span>Continuar a Captura Biométrica</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* STEP 2: Biometric Capture */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {/* Sample Chips Grid */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(5, 1fr)',
                gap: '0.5rem'
              }}>
                {Array.from({ length: REQUIRED_SAMPLES }).map((_, index) => {
                  const isDone = index < samples.length;
                  const isCurrent = index === samples.length;
                  return (
                    <div
                      key={index}
                      style={{
                        padding: '0.5rem',
                        borderRadius: 'var(--radius-sm)',
                        textAlign: 'center',
                        fontSize: '0.72rem',
                        fontWeight: 600,
                        backgroundColor: isDone ? 'var(--success-bg)' : isCurrent ? 'rgba(99, 102, 241, 0.1)' : 'var(--bg-surface-elevated)',
                        color: isDone ? 'var(--success)' : isCurrent ? 'var(--brand-500)' : 'var(--text-muted)',
                        border: `1px solid ${isDone ? 'var(--success-border)' : isCurrent ? 'rgba(99, 102, 241, 0.3)' : 'var(--border-subtle)'}`
                      }}
                    >
                      {isDone ? '✓ Muestra ' : isCurrent ? '⚡ Muestra ' : '○ Muestra '} {index + 1}
                    </div>
                  );
                })}
              </div>

              {samples.length < REQUIRED_SAMPLES ? (
                <TypingCapture
                  key={`enroll-sample-${samples.length}`}
                  onSampleCaptured={handleSampleCaptured}
                  mode="enrollment"
                  sampleIndex={samples.length + 1}
                  totalSamples={REQUIRED_SAMPLES}
                />
              ) : (
                <div style={{
                  backgroundColor: 'var(--success-bg)',
                  border: '1px solid var(--success-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.5rem',
                  textAlign: 'center'
                }}>
                  <CheckCircle2 size={32} style={{ color: 'var(--success)', margin: '0 auto 0.5rem' }} />
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.25rem', color: 'var(--success)' }}>
                    ¡Muestras de Enrolamiento Completadas!
                  </h3>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0 0 1rem' }}>
                    Se han capturado las 5 secuencias temporales para inicializar tu perfil biométrico.
                  </p>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleRegisterSubmit}
                    disabled={loading}
                    style={{ width: '100%', height: 42 }}
                  >
                    {loading ? 'Entrenando Modelo $M_0$...' : 'Finalizar Enrolamiento y Entrenar Modelo'}
                  </button>
                </div>
              )}

              <button
                type="button"
                className="btn-secondary"
                onClick={() => setStep(1)}
                disabled={loading}
                style={{ fontSize: '0.8rem', alignSelf: 'flex-start' }}
              >
                <ArrowLeft size={14} />
                <span>Volver a Datos de Cuenta</span>
              </button>
            </div>
          )}

          {/* STEP 3: Complete */}
          {step === 3 && (
            <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
              <div style={{
                width: 48,
                height: 48,
                borderRadius: '50%',
                backgroundColor: 'var(--success-bg)',
                color: 'var(--success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 1rem'
              }}>
                <ShieldCheck size={28} />
              </div>
              <h2 style={{ fontSize: '1.3rem', fontWeight: 700, margin: '0 0 0.25rem' }}>
                ¡Perfil Biométrico Inicializado!
              </h2>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '0 0 1.5rem' }}>
                El modelo base <strong>v1 ($M_0$)</strong> para el usuario <strong>{username}</strong> está activo.
              </p>
              <div style={{
                backgroundColor: 'var(--bg-surface-elevated)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '1rem',
                textAlign: 'left',
                fontSize: '0.8rem',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Usuario:</span>
                  <b>{username}</b>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Versión Inicial:</span>
                  <span className="badge-active hero-stat-badge">v1 (Activo)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Motor Adaptativo:</span>
                  <span style={{ color: 'var(--brand-500)', fontWeight: 600 }}>Habilitado ($M_t$)</span>
                </div>
              </div>
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                Redirigiendo a inicio de sesión...
              </span>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}