import { useState, useEffect, useMemo } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import TypingCapture from '../components/TypingCapture';
import TipsAccordion from '../components/enrollment/TipsAccordion';
import QualityRing from '../components/enrollment/QualityRing';
import SamplesOverview from '../components/enrollment/SamplesOverview';
import MetricsPreview from '../components/enrollment/MetricsPreview';
import EnhancedSuccessStep from '../components/enrollment/EnhancedSuccessStep';
import {
  UserPlus,
  User,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  ShieldCheck,
  ArrowRight,
  ArrowLeft,
  Sun,
  Moon,
  CheckCircle2,
  Clock,
  Sparkles
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
  const [sampleStartTime, setSampleStartTime] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const REQUIRED_SAMPLES = 5;

  // Tiempo restante estimado: ~6 segundos por muestra (3s tipeo + 3s descanso)
  const ETA_SECONDS = (REQUIRED_SAMPLES - samples.length) * 6;
  const etaLabel = useMemo(() => {
    if (samples.length === 0) return '~30 segundos';
    if (samples.length >= REQUIRED_SAMPLES) return null;
    if (ETA_SECONDS < 60) return `~${ETA_SECONDS}s`;
    const m = Math.floor(ETA_SECONDS / 60);
    const s = ETA_SECONDS % 60;
    return `~${m}m ${s}s`;
  }, [samples.length, ETA_SECONDS]);

  const handleSampleCaptured = (sample) => {
    if (!sample) {
      setError('Error al capturar la muestra. Por favor intenta de nuevo.');
      return;
    }
    const enriched = {
      ...sample,
      captured_at: Date.now(),
      total_duration: sample.total_duration ?? (Date.now() - sampleStartTime)
    };
    const updated = [...samples, enriched];
    setSamples(updated);
    setSampleStartTime(null);

    if (updated.length >= REQUIRED_SAMPLES) {
      setSuccess('¡Has completado las 5 muestras! Revisa el resumen y entrena tu modelo.');
    } else {
      setSuccess(`Muestra ${updated.length}/${REQUIRED_SAMPLES} capturada. ${etaLabel} restantes.`);
    }
  };

  const handleStartNewSample = () => {
    setSampleStartTime(Date.now());
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
    setSampleStartTime(Date.now());
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
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error registrando usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', display: 'flex', flexDirection: 'column' }}>
      {/* Topbar */}
      <header className="topbar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 32, height: 32, borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--brand-600)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
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

      <div style={{ maxWidth: '720px', width: '100%', margin: '2rem auto', padding: '0 1.5rem' }}>
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          boxShadow: 'var(--shadow-md)'
        }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              fontSize: '0.72rem', fontWeight: 600, color: 'var(--brand-500)',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              padding: '0.2rem 0.5rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem'
            }}>
              <ShieldCheck size={14} />
              <span>Enrolamiento de Perfil Biométrico</span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.25rem 0' }}>Registro de Nuevo Usuario</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
              Captura 5 muestras de tecleo para inicializar tu vector de calibración M₀.
            </p>
          </div>

          {/* Stepper mejorado */}
          <EnhancedStepper step={step} samplesCount={samples.length} required={REQUIRED_SAMPLES} />

          {/* Alerts */}
          {error && <Alert type="danger" icon={AlertTriangle}>{error}</Alert>}
          {success && step !== 3 && <Alert type="success" icon={CheckCircle2}>{success}</Alert>}

          {/* STEP 1: Credenciales */}
          {step === 1 && (
            <form onSubmit={handleStep1Next} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <Field
                label="Nombre de Usuario"
                icon={User}
                value={username}
                onChange={setUsername}
                placeholder="ej: analista.seguridad"
                autoFocus
              />
              <Field
                label="Contraseña (mínimo 6 caracteres)"
                icon={Lock}
                value={password}
                onChange={setPassword}
                placeholder="Contraseña"
                type={showPassword ? 'text' : 'password'}
                trailing={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                }
              />
              <Field
                label="Confirmar Contraseña"
                icon={Lock}
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Repite tu contraseña"
                type={showPassword ? 'text' : 'password'}
              />

              <button type="submit" className="btn-primary" style={{ height: 42, fontSize: '0.9rem', marginTop: '0.5rem' }}>
                <span>Continuar a Captura Biométrica</span>
                <ArrowRight size={16} />
              </button>
            </form>
          )}

          {/* STEP 2: Captura Biométrica */}
          {step === 2 && (
            <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <TipsAccordion />

              {/* Header de progreso con ETA */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '0.6rem 0.85rem',
                backgroundColor: 'var(--bg-surface-elevated)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Sparkles size={14} style={{ color: 'var(--brand-500)' }} />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Progreso de captura
                  </span>
                </div>
                {etaLabel && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: '0.3rem',
                    fontSize: '0.75rem', color: 'var(--text-muted)',
                    fontFamily: "'JetBrains Mono', monospace"
                  }}>
                    <Clock size={11} />
                    <span>{etaLabel}</span>
                  </div>
                )}
              </div>

              <SamplesOverview
                samples={samples}
                total={REQUIRED_SAMPLES}
                currentIndex={samples.length}
              />

              <QualityRing samples={samples} currentIndex={samples.length} />

              {samples.length < REQUIRED_SAMPLES ? (
                <TypingCapture
                  key={`enroll-sample-${samples.length}`}
                  onSampleCaptured={handleSampleCaptured}
                  onStartCapture={handleStartNewSample}
                  mode="enrollment"
                  sampleIndex={samples.length + 1}
                  totalSamples={REQUIRED_SAMPLES}
                />
              ) : (
                <>
                  <MetricsPreview samples={samples} totalSamples={REQUIRED_SAMPLES} />
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={handleRegisterSubmit}
                    disabled={loading}
                    style={{ width: '100%', height: 46, fontSize: '0.95rem' }}
                  >
                    {loading ? (
                      <>
                        <span style={{
                          width: 14, height: 14, borderRadius: '50%',
                          border: '2px solid currentColor',
                          borderTopColor: 'transparent',
                          animation: 'spin 0.8s linear infinite'
                        }} />
                        <span>Entrenando modelo M₀...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={18} />
                        <span>Entrenar modelo y finalizar enrolamiento</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </>
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

          {/* STEP 3: Éxito */}
          {step === 3 && <EnhancedSuccessStep username={username} />}
        </div>
      </div>
    </div>
  );
}

/* ==========================================================================
   Subcomponentes auxiliares
   ========================================================================== */

function EnhancedStepper({ step, samplesCount, required }) {
  const stepStates = [
    { num: 1, label: 'Credenciales', isDone: step > 1, isActive: step === 1 },
    { num: 2, label: `Biometría (${samplesCount}/${required})`, isDone: step > 2, isActive: step === 2 },
    { num: 3, label: 'Modelo M₀', isDone: step === 3, isActive: step === 3 }
  ];
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: '1.5rem', padding: '0.75rem 1rem',
      backgroundColor: 'var(--bg-surface-elevated)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-subtle)'
    }}>
      {stepStates.map((s, i) => (
        <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: i < stepStates.length - 1 ? '1 1 0' : '0 0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              width: 26, height: 26, borderRadius: '50%',
              backgroundColor: s.isDone ? 'var(--success)' : s.isActive ? 'var(--brand-600)' : 'var(--bg-surface)',
              color: s.isDone || s.isActive ? '#fff' : 'var(--text-muted)',
              fontSize: '0.75rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: s.isActive ? '2px solid var(--brand-500)' : 'none',
              transition: 'all 0.2s ease'
            }}>
              {s.isDone ? '✓' : s.num}
            </span>
            <span style={{
              fontSize: '0.8rem', fontWeight: 600,
              color: s.isActive ? 'var(--brand-500)' : s.isDone ? 'var(--success)' : 'var(--text-muted)',
              whiteSpace: 'nowrap'
            }}>
              {s.label}
            </span>
          </div>
          {i < stepStates.length - 1 && (
            <div style={{
              height: 1, flex: 1, margin: '0 0.75rem',
              backgroundColor: s.isDone ? 'var(--success)' : 'var(--border-subtle)',
              transition: 'background-color 0.3s ease'
            }} />
          )}
        </div>
      ))}
    </div>
  );
}

function Field({ label, icon: Icon, value, onChange, placeholder, type = 'text', autoFocus, trailing }) {
  return (
    <div>
      <label style={{
        display: 'block', fontSize: '0.8rem', fontWeight: 600,
        color: 'var(--text-secondary)', marginBottom: '0.4rem'
      }}>
        {label}
      </label>
      <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
        {Icon && <Icon size={16} style={{ position: 'absolute', left: 12, color: 'var(--text-muted)' }} />}
        <input
          type={type}
          className="select-control"
          style={{
            width: '100%',
            paddingLeft: Icon ? '2.4rem' : '0.85rem',
            paddingRight: trailing ? '2.4rem' : '0.85rem',
            height: 42
          }}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required
          autoFocus={autoFocus}
        />
        {trailing && <div style={{ position: 'absolute', right: 10 }}>{trailing}</div>}
      </div>
    </div>
  );
}

function Alert({ type, icon: Icon, children }) {
  const palette = {
    danger: { bg: 'var(--danger-bg)', border: 'var(--danger-border)', color: 'var(--danger)' },
    success: { bg: 'var(--success-bg)', border: 'var(--success-border)', color: 'var(--success)' }
  };
  const p = palette[type] || palette.danger;
  return (
    <div style={{
      backgroundColor: p.bg, border: `1px solid ${p.border}`, color: p.color,
      borderRadius: 'var(--radius-md)', padding: '0.75rem',
      fontSize: '0.82rem', marginBottom: '1rem',
      display: 'flex', alignItems: 'center', gap: '0.5rem'
    }}>
      {Icon && <Icon size={16} style={{ flexShrink: 0 }} />}
      <span>{children}</span>
    </div>
  );
}
