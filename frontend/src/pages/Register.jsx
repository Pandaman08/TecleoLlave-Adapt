import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import TypingCapture from '../components/TypingCapture';

function Register() {
  const { t } = useTranslation();
  const navigate = useNavigate();

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

  // Manejar muestra capturada
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

  // Enviar registro al backend
  const handleRegisterSubmit = async () => {
    if (samples.length < REQUIRED_SAMPLES) {
      setError(`Se requieren al menos ${REQUIRED_SAMPLES} muestras biométricas de tecleo.`);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await api.post('/auth/register', {
        username,
        password,
        samples
      });

      setSuccess(t('register.success_message'));
      setStep(3);

      setTimeout(() => {
        navigate('/login');
      }, 2500);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Error registrando usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page-container">
      <div className="glass-card pro-wizard-card">
        
        {/* Encabezado Principal */}
        <div className="wizard-header">
          <div className="wizard-badge">🧬 Enrolamiento Biométrico Adaptativo</div>
          <h1 className="wizard-title">{t('register.title')}</h1>
          <p className="wizard-subtitle">{t('register.subtitle')}</p>
        </div>

        {/* Barra de Progreso de Pasos (Stepper) */}
        <div className="stepper-wrapper">
          <div className={`step-node ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`}>
            <div className="step-circle">{step > 1 ? '✓' : '1'}</div>
            <div className="step-label">Datos de Cuenta</div>
          </div>
          <div className={`step-connector ${step >= 2 ? 'active' : ''}`}></div>
          <div className={`step-node ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`}>
            <div className="step-circle">{step > 2 ? '✓' : '2'}</div>
            <div className="step-label">Captura Biometría ({samples.length}/{REQUIRED_SAMPLES})</div>
          </div>
          <div className={`step-connector ${step >= 3 ? 'active' : ''}`}></div>
          <div className={`step-node ${step >= 3 ? 'active' : ''}`}>
            <div className="step-circle">3</div>
            <div className="step-label">Modelo v1 Entrenado</div>
          </div>
        </div>

        {error && (
          <div className="alert-box alert-danger">
            ⚠️ {error}
          </div>
        )}

        {success && (
          <div className="alert-box alert-success">
            ✅ {success}
          </div>
        )}

        {/* PASO 1: Datos de Cuenta */}
        {step === 1 && (
          <form onSubmit={handleStep1Next} className="wizard-form-body">
            <div className="form-group">
              <label className="form-label">
                👤 {t('register.username_label')}
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="ej: juan.perez o usuario_demo"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                🔒 {t('register.password_label')}
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="btn-toggle-eye"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">
                🔒 Confirmar Contraseña
              </label>
              <input
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="Repite tu contraseña"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
              />
            </div>

            <div className="wizard-actions">
              <button type="submit" className="btn-primary btn-large">
                Continuar a Captura Biométrica →
              </button>
            </div>
          </form>
        )}

        {/* PASO 2: Captura Biométrica */}
        {step === 2 && (
          <div className="wizard-form-body">
            
            {/* Monitor de Muestras */}
            <div className="sample-tracker-box">
              <div className="tracker-header">
                <span>Progreso de Muestras para Enrolamiento</span>
                <span className="tracker-count">{samples.length} / {REQUIRED_SAMPLES} Muestras</span>
              </div>
              
              <div className="sample-chips-grid">
                {Array.from({ length: REQUIRED_SAMPLES }).map((_, index) => {
                  const isDone = index < samples.length;
                  const isCurrent = index === samples.length;
                  return (
                    <div 
                      key={index} 
                      className={`sample-chip ${isDone ? 'done' : isCurrent ? 'current' : 'pending'}`}
                    >
                      <span className="chip-status-icon">{isDone ? '✅' : isCurrent ? '⚡' : '⭕'}</span>
                      <span>Muestra {index + 1}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Componente de Captura de Tecleo */}
            {samples.length < REQUIRED_SAMPLES ? (
              <TypingCapture
                key={`enroll-sample-${samples.length}`}
                onSampleCaptured={handleSampleCaptured}
                mode="enrollment"
                sampleIndex={samples.length + 1}
                totalSamples={REQUIRED_SAMPLES}
              />
            ) : (
              <div className="samples-completed-card">
                <div className="completed-icon">🎉</div>
                <h3>¡Conjunto de Enrolamiento Completado!</h3>
                <p>Se han registrado las 5 muestras necesarias para construir el vector base de dinámica de tecleo.</p>
                <button
                  type="button"
                  className="btn-primary btn-large"
                  onClick={handleRegisterSubmit}
                  disabled={loading}
                >
                  {loading ? 'Entrenando Modelo v1...' : '🚀 Finalizar Enrolamiento y Entrenar Modelo'}
                </button>
              </div>
            )}

            <div className="wizard-footer-nav">
              <button 
                type="button" 
                className="btn-secondary"
                onClick={() => setStep(1)}
                disabled={loading}
              >
                ← Volver a Datos de Cuenta
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: Éxito y Perfil Creado */}
        {step === 3 && (
          <div className="wizard-success-state">
            <div className="success-icon-badge">🛡️</div>
            <h2>¡Perfil Biométrico Inicializado!</h2>
            <p className="success-desc">
              El modelo base <b>v1 (M0)</b> para el usuario <b>{username}</b> ha sido generado exitosamente con 5 muestras de enrolamiento.
            </p>
            <div className="profile-specs-box">
              <div className="spec-row">
                <span>Usuario:</span>
                <b>{username}</b>
              </div>
              <div className="spec-row">
                <span>Versión de Modelo Inicial:</span>
                <span className="badge badge-active">v1 (Activo)</span>
              </div>
              <div className="spec-row">
                <span>Mecanismo Adaptativo:</span>
                <b>Habilitado (Deriva Continua)</b>
              </div>
            </div>
            <p className="redirect-hint">Redirigiendo a inicio de sesión en unos segundos...</p>
          </div>
        )}

      </div>
    </div>
  );
}

export default Register;