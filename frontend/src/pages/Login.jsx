import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import TypingCapture from '../components/TypingCapture';

function Login() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [username, setUsername] = useState('user1');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [typingSample, setTypingSample] = useState(null);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [seedLoading, setSeedLoading] = useState(false);

  const [show2FaModal, setShow2FaModal] = useState(false);
  const [otpCode, setOtpCode] = useState('123456');
  const [otpError, setOtpError] = useState(null);
  const [otpLoading, setOtpLoading] = useState(false);

  // Intentar login
  const handleSubmit = async (e) => {
    e?.preventDefault();
    setError(null);
    setSuccess(null);

    if (!username || !password) {
      setError('Por favor ingresa usuario y contraseña');
      return;
    }

    setLoading(true);

    try {
      const tokenRes = await api.post('/auth/login', { username, password });
      const token = tokenRes.data.access_token;
      localStorage.setItem('token', token);

      // Si hay muestra de tecleo, enviar verificación adaptativa
      if (typingSample) {
        try {
          const authRes = await api.post('/adaptive/process-auth-result', {
            username,
            sample: typingSample
          });

          const decision = authRes.data.decision;
          const scorePercent = (authRes.data.score * 100).toFixed(1);

          if (decision === 'CHALLENGE') {
            setShow2FaModal(true);
            setSuccess(`⚠️ Decisión biométrica: CHALLENGE (Score: ${scorePercent}%). Se requiere autenticación secundaria 2FA.`);
            setLoading(false);
            return;
          }

          if (decision === 'REJECT') {
            setError(`⛔ Autenticación biométrica RECHAZADA (Score: ${scorePercent}%). El patrón difiere significativamente del modelo activo.`);
            setLoading(false);
            return;
          }

          setSuccess(`¡Autenticación Biométrica Exitosa! Score: ${scorePercent}% | Decisión: ${decision}`);
        } catch (adaptiveErr) {
          console.warn('Verificación biométrica secundaria falló:', adaptiveErr);
          setSuccess('Autenticación de contraseña exitosa.');
        }
      } else {
        setSuccess('¡Inicio de sesión exitoso! Redirigiendo al Dashboard...');
      }

      setTimeout(() => {
        navigate('/');
      }, 1000);

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
      setSuccess('✅ ' + res.data.message);
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

  // Sembrar datos demo de prueba
  const handleSeedDemo = async () => {
    setSeedLoading(true);
    setError(null);
    try {
      const seedRes = await api.post('/auth/seed-demo');
      setSuccess(`✅ Base de datos sembrada (${seedRes.data.samples_created} muestras creadas). Credenciales: user1 / password123`);
    } catch (err) {
      setError('Error al sembrar datos demo: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSeedLoading(false);
    }
  };

  const handleQuickDemo = (user, pass) => {
    setUsername(user);
    setPassword(pass);
  };

  return (
    <div className="auth-page-container">
      <div className="login-split-layout">
        
        {/* Columna 1: Formulario de Autenticación */}
        <div className="glass-card login-card">
          <div className="wizard-header">
            <div className="wizard-badge">🔐 Acceso Biométrico Adaptativo</div>
            <h1 className="wizard-title">{t('login.title')}</h1>
            <p className="wizard-subtitle">{t('login.subtitle')}</p>
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

          {/* Atajos Rápidos de Perfiles Demo */}
          <div className="demo-shortcuts-box">
            <span className="demo-shortcuts-label">⚡ Perfiles de Prueba Rápidos:</span>
            <div className="demo-pills-row">
              <button
                type="button"
                className={`demo-pill ${username === 'user1' ? 'active' : ''}`}
                onClick={() => handleQuickDemo('user1', 'password123')}
              >
                👤 Usuario 1 (user1)
              </button>
              <button
                type="button"
                className={`demo-pill ${username === 'user2' ? 'active' : ''}`}
                onClick={() => handleQuickDemo('user2', 'password123')}
              >
                👤 Usuario 2 (user2)
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="wizard-form-body">
            <div className="form-group">
              <label className="form-label">
                👤 {t('login.username_label')}
              </label>
              <input
                type="text"
                className="form-input"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Nombre de usuario"
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">
                🔒 {t('login.password_label')}
              </label>
              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Contraseña"
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

            <div className="wizard-actions">
              <button
                type="submit"
                className="btn-primary btn-large"
                disabled={loading}
              >
                {loading ? 'Verificando...' : '🚀 Autenticar y Entrar al Sistema'}
              </button>

              <button
                type="button"
                className="btn-secondary"
                onClick={handleSeedDemo}
                disabled={seedLoading}
                title="Genera muestras y modelos automáticos en la base de datos"
              >
                {seedLoading ? 'Sembrando Datos...' : '🌱 Sembrar Datos de Prueba (Demo)'}
              </button>
            </div>
          </form>
        </div>

        {/* Columna 2: Captura Biométrica Dinámica Opcional */}
        <div className="glass-card biometric-terminal-card">
          <div className="terminal-header">
            <div className="terminal-dot green"></div>
            <div className="terminal-dot yellow"></div>
            <div className="terminal-dot red"></div>
            <span className="terminal-title">Biometric Keystroke Dynamics Terminal</span>
          </div>

          <div className="terminal-content">
            <div className="terminal-info-banner">
              <span className="info-icon">⚡</span>
              <div>
                <strong>Verificación en Tiempo Real:</strong> Teclea la frase biométrica a continuación para evaluar tu ritmo contra el modelo adaptativo activo.
              </div>
            </div>

            <TypingCapture
              onSampleCaptured={(sample) => {
                setTypingSample(sample);
                setSuccess('¡Muestra biométrica capturada! Haz clic en "Autenticar" para evaluar la similitud.');
              }}
              mode="auth"
            />
          </div>
        </div>

      </div>

      {show2FaModal && (
        <div className="modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
        }}>
          <div className="glass-card modal-content" style={{ maxWidth: '420px', width: '90%', padding: '1.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>🔐</div>
            <h3 style={{ margin: '0.5rem 0', color: 'var(--accent-warning)' }}>Desafío 2FA / MFA Requerido</h3>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.2rem', lineHeight: 1.4 }}>
              Tu score biométrico está en zona intermedia (CHALLENGE). Ingresa tu código de autenticación TOTP de 6 dígitos para completar el acceso.
            </p>
            {otpError && (
              <div className="alert-box alert-danger" style={{ marginBottom: '1rem', fontSize: '0.82rem' }}>
                ⚠️ {otpError}
              </div>
            )}
            <form onSubmit={handleVerify2FA}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <input
                  type="text"
                  className="form-input"
                  style={{ textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.4rem', fontWeight: 'bold' }}
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  required
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem', display: 'block' }}>
                  Código demo predeterminado: <code style={{ color: 'var(--accent-primary)' }}>123456</code>
                </span>
              </div>
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.2rem' }}>
                <button type="button" className="btn-secondary" style={{ flex: 1 }} onClick={() => setShow2FaModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary" style={{ flex: 1 }} disabled={otpLoading}>
                  {otpLoading ? 'Verificando...' : 'Verificar 2FA'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Login;