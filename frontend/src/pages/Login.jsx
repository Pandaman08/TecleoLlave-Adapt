import { useState, useEffect } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import LoginTerminal from '../components/LoginTerminal';
import AuthStepper from '../components/login/AuthStepper';
import CredentialsForm from '../components/login/CredentialsForm';
import TwoFactorModal from '../components/login/TwoFactorModal';
import DecisionExplainer from '../components/login/DecisionExplainer';
import { ShieldCheck, KeyRound, Sun, Moon, GraduationCap, User2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

const EXPERT_MODE_STORAGE_KEY = 'tecleollave_expert_mode';

export default function Login() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  // Modo de visualización: 'simple' (default, para usuarios reales) vs
  // 'expert' (jerga técnica/académica: nombre del motor, algoritmo ML,
  // umbrales tri-zona). Se recuerda entre sesiones vía localStorage.
  const [expertMode, setExpertMode] = useState(() => {
    try {
      return localStorage.getItem(EXPERT_MODE_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const toggleExpertMode = () => {
    setExpertMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(EXPERT_MODE_STORAGE_KEY, next ? '1' : '0');
      } catch {
        // localStorage no disponible (modo privado, etc.) — no es crítico
      }
      return next;
    });
  };

  // Estado
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [typingSample, setTypingSample] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [seedLoading, setSeedLoading] = useState(false);

  const [decisionResult, setDecisionResult] = useState(null);

  // 2FA modal
  const [show2FaModal, setShow2FaModal] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [otpError, setOtpError] = useState(null);
  const [pendingCredentials, setPendingCredentials] = useState(null);

  // Stepper state
  const [currentStep, setCurrentStep] = useState(1);

  const isDev = Boolean(import.meta.env.DEV);
  const devUsers = ['user1', 'user2'];

  // Update stepper based on state
  useEffect(() => {
    if (decisionResult) {
      setCurrentStep(3);
    } else if (typingSample) {
      setCurrentStep(2);
    } else {
      setCurrentStep(1);
    }
  }, [typingSample, decisionResult]);

  // Reset error/success when inputs change
  useEffect(() => {
    if (error) setError(null);
  }, [username, password]);

  const handleSubmit = async ({ username: u, password: p }) => {
    setError(null);
    setSuccess(null);
    setDecisionResult(null);

    if (!u || !p) {
      setError('Por favor ingresa usuario y contraseña');
      return;
    }

    setLoading(true);

    try {
      // Step 1: Validate credentials
      const tokenRes = await api.post('/auth/login', { username: u, password: p });
      const token = tokenRes.data.access_token;
      localStorage.setItem('token', token);
      if (tokenRes.data.user_id) {
        localStorage.setItem('current_user_id', tokenRes.data.user_id);
        localStorage.setItem('current_username', tokenRes.data.username);
      } else {
        localStorage.setItem('current_username', u);
      }

      // Step 2: If biometric sample exists, process decision
      if (typingSample && typingSample.decision) {
        const decision = typingSample.decision;
        const score = typingSample.score;
        const decisionUpper = decision.toUpperCase();
        const scorePercent = (score * 100).toFixed(1);

        setDecisionResult({ decision: decisionUpper, score });

        if (decisionUpper === 'CHALLENGE') {
          setPendingCredentials({ u, p });
          setShow2FaModal(true);
          setSuccess(`Score biométrico: ${scorePercent}%. Se requiere verificación 2FA.`);
          setLoading(false);
          return;
        }

        if (decisionUpper === 'REJECT') {
          setError(
            `Acceso biométrico rechazado (${scorePercent}%). El ritmo no coincide con tu perfil registrado. ` +
            `Intenta tipear de forma más natural con tu teclado habitual.`
          );
          setLoading(false);
          return;
        }

        // ACCEPT
        setSuccess(`Acceso biométrico concedido (${scorePercent}%). Entrando...`);
      } else {
        setSuccess('Inicio de sesión exitoso. Redirigiendo al Dashboard...');
      }

      setTimeout(() => navigate('/'), 1100);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error en autenticación');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async (code) => {
    setOtpError(null);
    setOtpLoading(true);
    try {
      const res = await api.post('/auth/verify-2fa', {
        username: pendingCredentials?.u || username,
        otp_code: code
      });
      localStorage.setItem('token', res.data.access_token);
      if (res.data.user_id) {
        localStorage.setItem('current_user_id', res.data.user_id);
        localStorage.setItem('current_username', res.data.username);
      }
      setSuccess('Verificación 2FA completada. Entrando...');
      setShow2FaModal(false);
      setTimeout(() => navigate('/'), 800);
    } catch (err) {
      setOtpError(err.response?.data?.detail || 'Código 2FA incorrecto. Intenta de nuevo.');
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

  const handleFillDemo = (u) => {
    setUsername(u);
    setPassword('password123');
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
            <KeyRound size={18} />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.1 }}>TecleoLlave-Adapt</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Autenticación adaptativa por dinámica de tecleo</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <NavLink to="/" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
            Ir al Dashboard
          </NavLink>
          <NavLink to="/register" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
            Enrolamiento
          </NavLink>
          <button
            type="button"
            className="btn-secondary"
            onClick={toggleExpertMode}
            title={expertMode ? 'Cambiar a vista simple' : 'Cambiar a vista académica (detalle técnico)'}
            style={{
              fontSize: '0.75rem',
              padding: '0.35rem 0.7rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: expertMode ? 'var(--brand-500)' : undefined,
              borderColor: expertMode ? 'var(--brand-500)' : undefined
            }}
          >
            {expertMode ? <GraduationCap size={14} /> : <User2 size={14} />}
            <span>{expertMode ? 'Modo académico' : 'Modo simple'}</span>
          </button>
          <button type="button" className="btn-icon" onClick={toggleTheme} aria-label="Cambiar tema">
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* Stepper global */}
      <div style={{ maxWidth: '1280px', width: '100%', margin: '1.5rem auto 0', padding: '0 1.5rem' }}>
        <AuthStepper
          step={currentStep}
          hasSample={!!typingSample}
          hasDecision={!!decisionResult}
        />
      </div>

      {/* Main Split Grid */}
      <div style={{
        flex: 1,
        maxWidth: '1280px',
        width: '100%',
        margin: '0 auto 1.5rem',
        padding: '0 1.5rem',
        display: 'grid',
        gridTemplateColumns: 'minmax(340px, 460px) 1fr',
        gap: '1.75rem',
        alignItems: 'stretch'
      }}>
        {/* Column 1: Credentials */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          boxShadow: 'var(--shadow-md)',
          display: 'flex',
          flexDirection: 'column'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
              fontSize: '0.72rem', fontWeight: 600, color: 'var(--brand-500)',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              padding: '0.2rem 0.55rem', borderRadius: 'var(--radius-sm)', marginBottom: '0.5rem'
            }}>
              <ShieldCheck size={14} />
              <span>Autenticación Biométrica Adaptativa</span>
            </div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0.25rem 0' }}>Acceso al Sistema</h2>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.5 }}>
              Ingresa tus credenciales y luego tipea la frase biométrica en la terminal para validar tu identidad.
            </p>
            <div style={{ marginTop: '0.6rem' }}>
              <DecisionExplainer />
            </div>
          </div>

          <CredentialsForm
            username={username}
            password={password}
            onUsernameChange={setUsername}
            onPasswordChange={setPassword}
            onSubmit={handleSubmit}
            loading={loading}
            error={error}
            success={success}
            hasBiometricSample={!!typingSample}
            isDev={isDev}
            devUsers={devUsers}
            onSeedDemo={handleSeedDemo}
            seedLoading={seedLoading}
            onFillDemo={handleFillDemo}
          />
        </div>

        {/* Column 2: Biometric Terminal */}
        <div>
          <LoginTerminal
            typingSample={typingSample}
            setTypingSample={(sample) => {
              setTypingSample(sample);
              if (sample) {
                setSuccess('Muestra capturada. Click en "Verificar y Acceder" para evaluar.');
              }
            }}
            decisionResult={decisionResult}
            isEvaluating={loading}
            username={username}
            expertMode={expertMode}
          />
        </div>
      </div>

      {/* 2FA Modal */}
      <TwoFactorModal
        isOpen={show2FaModal}
        onClose={() => {
          if (!otpLoading) {
            setShow2FaModal(false);
            setOtpError(null);
          }
        }}
        onVerify={handleVerify2FA}
        username={pendingCredentials?.u || username}
        score={decisionResult?.score || 0.6}
        isSuspicious={(decisionResult?.score || 0.6) < 0.5}
        loading={otpLoading}
        error={otpError}
      />
    </div>
  );
}
