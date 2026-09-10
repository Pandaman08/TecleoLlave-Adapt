/**
 * Register.jsx - Enrolamiento Biométrico Multi-Sesión y Multi-Contexto
 * Permite capturar 30-40 muestras distribuidas en al menos 3 sesiones
 * con etiquetado conductual ("normal", "con prisa", "cansado").
 */
import { useState, useMemo } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import TypingCapture from '../components/TypingCapture';
import TipsAccordion from '../components/enrollment/TipsAccordion';
import QualityRing from '../components/enrollment/QualityRing';
import SamplesOverview from '../components/enrollment/SamplesOverview';
import MetricsPreview from '../components/enrollment/MetricsPreview';
import EnhancedSuccessStep from '../components/enrollment/EnhancedSuccessStep';
import MultiSessionStepper from '../components/enrollment/MultiSessionStepper';
import LanguageSelector from '../components/LanguageSelector';
import {
  UserPlus, User, Lock, Eye, EyeOff, AlertTriangle, ShieldCheck,
  ArrowRight, ArrowLeft, Sun, Moon, CheckCircle2, Clock, Sparkles,
  Layers, Coffee, Zap, MoonStar, Target, BarChart2, Check
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export default function Register() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [samples, setSamples] = useState([]);
  const [sampleStartTime, setSampleStartTime] = useState(null);

  // Multi-Sesión & Multi-Contexto
  const [sessionId, setSessionId] = useState('1');
  const [contextTag, setContextTag] = useState('normal');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const REQUIRED_SAMPLES = 30;
  const REQUIRED_SESSIONS = 3;

  // Sesiones configuradas
  const sessionDefs = [
    {
      id: '1',
      title: 'Sesión 1: Mañana / Línea Base',
      subtitle: 'Ritmo matutino en frío (08:30 - 09:30)',
      icon: '🌅',
      recommendedContext: 'normal',
      target: 10
    },
    {
      id: '2',
      title: 'Sesión 2: Tarde / Mediodía',
      subtitle: 'Ritmo activo o con prisa (14:00 - 15:30)',
      icon: '☀️',
      recommendedContext: 'con prisa',
      target: 10
    },
    {
      id: '3',
      title: 'Sesión 3: Noche / Fatiga',
      subtitle: 'Ritmo cansado o fin de jornada (21:00 - 22:30)',
      icon: '🌙',
      recommendedContext: 'cansado',
      target: 10
    }
  ];

  // Opciones de Contexto
  const contextOptions = [
    { id: 'normal', label: 'Normal / Relajado', icon: Coffee, desc: 'Ritmo habitual sin prisa' },
    { id: 'con prisa', label: 'Con Prisa', icon: Zap, desc: 'Tecleo acelerado y enérgico' },
    { id: 'cansado', label: 'Cansado / Fatiga', icon: MoonStar, desc: 'Pausas más largas entre teclas' },
    { id: 'concentrado', label: 'Concentrado', icon: Target, desc: 'Máxima precisión y consistencia' }
  ];

  // Desglose por sesión actual
  const sessionCounts = useMemo(() => {
    const counts = { '1': 0, '2': 0, '3': 0 };
    samples.forEach(s => {
      const sid = String(s.session_id || '1');
      if (counts[sid] !== undefined) counts[sid]++;
      else counts[sid] = (counts[sid] || 0) + 1;
    });
    return counts;
  }, [samples]);

  const distinctSessionsCount = useMemo(() => {
    return Object.values(sessionCounts).filter(c => c > 0).length;
  }, [sessionCounts]);

  // Desglose por contexto
  const contextStats = useMemo(() => {
    const counts = {};
    samples.forEach(s => {
      const c = s.context_tag || 'normal';
      counts[c] = (counts[c] || 0) + 1;
    });
    return counts;
  }, [samples]);

  const isReadyToTrain = samples.length >= REQUIRED_SAMPLES && distinctSessionsCount >= REQUIRED_SESSIONS;

  const handleSampleCaptured = (sample) => {
    if (!sample) {
      setError('No se pudo procesar la muestra biométrica. Intenta nuevamente.');
      return;
    }
    const captureTime = `${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    const enriched = {
      ...sample,
      session_id: sessionId,
      context_tag: contextTag,
      capture_time_label: `Sesión ${sessionId} (${captureTime}) [${contextTag}]`,
      captured_at: Date.now(),
      total_duration: sample.total_duration ?? (Date.now() - sampleStartTime)
    };
    const updated = [...samples, enriched];
    setSamples(updated);
    setSampleStartTime(null);

    // Si la sesión actual ya alcanzó 10 muestras y hay una siguiente sesión vacía, sugerir cambio
    const currentSessionSamples = updated.filter(s => String(s.session_id) === sessionId).length;
    if (currentSessionSamples >= 10 && sessionId === '1') {
      setSessionId('2');
      setContextTag('con prisa');
      setSuccess('¡Sesión 1 completada! Cambiando automáticamente a Sesión 2 (Contexto: Con prisa).');
    } else if (currentSessionSamples >= 10 && sessionId === '2') {
      setSessionId('3');
      setContextTag('cansado');
      setSuccess('¡Sesión 2 completada! Cambiando a Sesión 3 (Contexto: Cansado / Noche).');
    } else if (updated.length >= REQUIRED_SAMPLES && distinctSessionsCount >= REQUIRED_SESSIONS) {
      setSuccess('¡Meta multi-sesión alcanzada! Has capturado suficientes variaciones en 3 sesiones para entrenar el modelo.');
    } else {
      setSuccess(`Muestra #${updated.length} capturada en Sesión ${sessionId} (${contextTag}).`);
    }
  };

  const handleStartNewSample = () => {
    setSampleStartTime(Date.now());
  };

  const handleStep1Next = (e) => {
    e?.preventDefault();
    setError(null);
    if (!username.trim()) {
      setError('Por favor ingresa un nombre de usuario.');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }
    setStep(2);
    setSampleStartTime(Date.now());
  };

  // Enviar y registrar usuario con todas las muestras multi-sesión
  const handleRegisterSubmit = async () => {
    if (samples.length < 10) {
      setError('Se requieren al menos 10 muestras para registrar.');
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
      setError(err.response?.data?.detail || err.message || 'Error al completar el registro.');
    } finally {
      setLoading(false);
    }
  };

  // Atajo para la sustentación: Sembrar 35 muestras en 3 sesiones directamente
  const handleSeedMultiSessionDemo = async () => {
    if (!username.trim()) {
      setError('Por favor define primero un nombre de usuario en el Paso 1.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      // 1. Registrar primero el usuario si no existe
      try {
        await api.post('/auth/register', {
          username,
          password: password || 'demo123456',
          samples: []
        });
      } catch (err) {
        // Ignorar si el usuario ya existe
      }

      // 2. Sembrar las 35 muestras multi-sesión y entrenar
      const seedRes = await api.post('/typing/seed-multisession-demo', {
        username,
        reset_existing: true
      });

      localStorage.setItem('current_username', username);
      setSuccess(`¡Éxito! ${seedRes.data.message}`);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error al sembrar datos multi-sesión.');
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
            width: 34, height: 34, borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--brand-600)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <UserPlus size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '0.95rem', lineHeight: 1.1 }}>
              Enrolamiento Multi-Sesión & Multi-Contexto
            </div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              Captura de variación conductual legítima (30-40 muestras en ≥3 sesiones)
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <NavLink to="/live-demo" className="btn-secondary" style={{
            fontSize: '0.8rem', padding: '0.35rem 0.75rem',
            backgroundColor: 'rgba(99, 102, 241, 0.12)', color: 'var(--brand-500)', borderColor: 'var(--brand-500)'
          }}>
            Demo en Vivo ⚡
          </NavLink>
          <NavLink to="/" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
            {t('nav.dashboard')}
          </NavLink>
          <NavLink to="/login" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
            {t('nav.login')}
          </NavLink>
          <LanguageSelector variant="compact" />
          <button
            type="button"
            className="btn-icon"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      <div style={{ maxWidth: '960px', width: '100%', margin: '1.5rem auto', padding: '0 1.5rem' }}>
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
              fontSize: '0.72rem', fontWeight: 700, color: 'var(--brand-500)',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              padding: '0.2rem 0.6rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem'
            }}>
              <ShieldCheck size={14} />
              <span>PERFIL BIOMÉTRICO ROBUSTO (MULTI-SESIÓN)</span>
            </div>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: '0.25rem 0' }}>
              Enrolamiento con Tolerancia a Variación Natural
            </h2>
            <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', margin: 0, maxWidth: '650px', marginLeft: 'auto', marginRight: 'auto', lineHeight: 1.5 }}>
              Capturamos tu tecleo en <strong>distintos momentos y estados</strong> (mañana, tarde, noche, con prisa o cansado) para que el modelo aprenda tu rango natural y nunca te rechace en la autenticación.
            </p>
          </div>

          {/* Stepper */}
          <MultiSessionStepper
            step={step}
            samplesCount={samples.length}
            requiredSamples={REQUIRED_SAMPLES}
            sessionsCount={distinctSessionsCount}
            requiredSessions={REQUIRED_SESSIONS}
          />

          {/* Alerts */}
          {error && <Alert type="danger" icon={AlertTriangle}>{error}</Alert>}
          {success && step !== 3 && <Alert type="success" icon={CheckCircle2}>{success}</Alert>}

          {/* STEP 1: Credenciales */}
          {step === 1 && (
            <form onSubmit={handleStep1Next} style={{ maxWidth: '520px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <Field
                label="Nombre de Usuario"
                icon={User}
                value={username}
                onChange={setUsername}
                placeholder="ej. estudiante_seguridad"
                autoFocus
              />
              <Field
                label="Contraseña"
                icon={Lock}
                value={password}
                onChange={setPassword}
                placeholder="Mínimo 6 caracteres"
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

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, height: 44, fontSize: '0.92rem' }}>
                  <span>Continuar al Enrolamiento</span>
                  <ArrowRight size={16} />
                </button>

                <button
                  type="button"
                  onClick={handleSeedMultiSessionDemo}
                  disabled={loading}
                  className="btn-secondary"
                  title="Atajo de sustentación: genera 35 muestras en 3 sesiones instantáneamente"
                  style={{
                    backgroundColor: 'rgba(99, 102, 241, 0.12)',
                    borderColor: 'var(--brand-500)',
                    color: 'var(--brand-500)',
                    fontSize: '0.8rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Sparkles size={14} />
                  <span>Sembrar 35 Muestras (Demo)</span>
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: Captura Biométrica Multi-Sesión & Multi-Contexto */}
          {step === 2 && (
            <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Tarjetas de Sesiones (Mañana, Tarde, Noche) */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    1. Selecciona la Sesión de Captura (Mínimo 3 sesiones)
                  </span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, color: distinctSessionsCount >= 3 ? 'var(--success)' : 'var(--warning)' }}>
                    Sesiones activas: {distinctSessionsCount} / {REQUIRED_SESSIONS} {distinctSessionsCount >= 3 && '✅'}
                  </span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                  {sessionDefs.map(sess => {
                    const count = sessionCounts[sess.id] || 0;
                    const isSelected = sessionId === sess.id;
                    const isComplete = count >= sess.target;

                    return (
                      <button
                        key={sess.id}
                        type="button"
                        onClick={() => {
                          setSessionId(sess.id);
                          setContextTag(sess.recommendedContext);
                        }}
                        style={{
                          padding: '0.85rem 1rem',
                          borderRadius: 'var(--radius-lg)',
                          border: `2px solid ${isSelected ? 'var(--brand-500)' : 'var(--border-subtle)'}`,
                          backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-canvas)',
                          textAlign: 'left',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.35rem',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: '1.1rem' }}>{sess.icon}</span>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '9999px',
                            backgroundColor: isComplete ? 'var(--success-bg)' : 'var(--bg-surface-elevated)',
                            color: isComplete ? 'var(--success)' : 'var(--text-muted)',
                            border: `1px solid ${isComplete ? 'var(--success-border)' : 'var(--border-subtle)'}`
                          }}>
                            {count} / {sess.target} {isComplete && '✓'}
                          </span>
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.88rem', color: isSelected ? 'var(--brand-500)' : 'var(--text-primary)' }}>
                          {sess.title}
                        </div>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          {sess.subtitle}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Selector de Contexto Conductual */}
              <div>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: '0.5rem' }}>
                  2. Etiqueta el Contexto de la Muestra actual
                </span>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
                  {contextOptions.map(ctx => {
                    const Icon = ctx.icon;
                    const isSelected = contextTag === ctx.id;
                    const count = contextStats[ctx.id] || 0;

                    return (
                      <button
                        key={ctx.id}
                        type="button"
                        onClick={() => setContextTag(ctx.id)}
                        style={{
                          padding: '0.65rem 0.85rem',
                          borderRadius: 'var(--radius-md)',
                          border: `1.5px solid ${isSelected ? 'var(--brand-500)' : 'var(--border-subtle)'}`,
                          backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-canvas)',
                          color: isSelected ? 'var(--brand-500)' : 'var(--text-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          cursor: 'pointer',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', fontWeight: 600 }}>
                          <Icon size={15} />
                          <span>{ctx.label}</span>
                        </div>
                        {count > 0 && (
                          <span style={{ fontSize: '0.7rem', opacity: 0.75, fontFamily: 'monospace' }}>
                            ({count})
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Tips de consistencia */}
              <TipsAccordion />

              {/* Widget de Captura Física de la Frase */}
              <div style={{
                backgroundColor: 'var(--bg-canvas)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <span>Escribir Muestra en</span>
                    <span style={{ color: 'var(--brand-500)' }}>Sesión {sessionId} ({contextTag})</span>
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    Total acumulado: <strong>{samples.length} / {REQUIRED_SAMPLES}</strong>
                  </span>
                </div>

                <TypingCapture
                  key={`enroll-${sessionId}-${contextTag}-${samples.length}`}
                  onSampleCaptured={handleSampleCaptured}
                  onStartCapture={handleStartNewSample}
                  mode="enrollment"
                  username={username}
                  contextTag={contextTag}
                  sessionId={sessionId}
                  captureTimeLabel={`Sesión ${sessionId} - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                  sampleIndex={samples.length + 1}
                  totalSamples={REQUIRED_SAMPLES}
                />
              </div>

              {/* Desglose de Muestras y Contextos */}
              {samples.length > 0 && (
                <div style={{
                  backgroundColor: 'var(--bg-surface-elevated)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1rem'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <BarChart2 size={15} style={{ color: 'var(--brand-500)' }} />
                      Distribución Conductual para el Artículo / Sustentación
                    </span>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      Total capturado: {samples.length} muestras
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                    {Object.entries(contextStats).map(([ctx, count]) => (
                      <span key={ctx} style={{
                        padding: '0.2rem 0.55rem',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-canvas)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)'
                      }}>
                        Contexto <strong>{ctx}</strong>: {count} muestras ({Math.round((count / samples.length) * 100)}%)
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Botón de Finalizar Registro y Entrenar */}
              <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', marginTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setStep(1)}
                  disabled={loading}
                  style={{ fontSize: '0.82rem' }}
                >
                  <ArrowLeft size={14} />
                  <span>Volver</span>
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleRegisterSubmit}
                  disabled={loading || samples.length < 10}
                  style={{
                    flex: 1,
                    height: 46,
                    fontSize: '0.95rem',
                    backgroundColor: isReadyToTrain ? 'var(--success)' : 'var(--brand-600)',
                    borderColor: isReadyToTrain ? 'var(--success)' : 'var(--brand-600)'
                  }}
                >
                  {loading ? (
                    <span>Entrenando Perfil Multi-Sesión...</span>
                  ) : (
                    <>
                      <Sparkles size={18} />
                      <span>
                        {isReadyToTrain
                          ? `Finalizar y Entrenar Perfil Multi-Sesión (${samples.length} muestras)`
                          : `Guardar Registro con ${samples.length} muestras (Recomendado: ≥30)`}
                      </span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
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
   Subcomponentes de Formulario
   ========================================================================== */

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
