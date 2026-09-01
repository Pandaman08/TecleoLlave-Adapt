import { useState } from 'react';
import TypingCapture from '../components/TypingCapture';
import api from '../services/api';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState('credentials'); // credentials -> typing -> complete
  const [token, setToken] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    
    try {
      const response = await api.post('/auth/login', { username, password });
      setToken(response.data.access_token);
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.access_token}`;
      setMessage('Credenciales válidas. Ahora verificación biométrica.');
      setStep('typing');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error en login');
    }
  };

  const handleTypingAuth = async (result) => {
    try {
      const response = await api.post('/typing/authenticate', {
        raw_timestamps: result.events,
        phrase_typed: result.phrase_typed,
        source: 'auth'
      });
      
      const { decision, score, message: msg } = response.data;
      
      if (decision === 'allow') {
        setMessage(`✅ Acceso concedido (score: ${score.toFixed(3)})`);
        setStep('complete');
      } else if (decision === 'challenge') {
        setMessage(`⚠️ Verificación adicional requerida (score: ${score.toFixed(3)})`);
        setError(msg);
      } else {
        setError(`❌ Acceso denegado (score: ${score.toFixed(3)}): ${msg}`);
      }
    } catch (err) {
      setError('Error en autenticación biométrica: ' + (err.response?.data?.detail || err.message));
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'credentials':
        return (
          <div className="card">
            <h2>Login</h2>
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label>Usuario</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>Contraseña</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Iniciar Sesión
              </button>
            </form>
          </div>
        );
      
      case 'typing':
        return (
          <>
            <div className="card">
              <h3>Verificación Biométrica</h3>
              <p style={{ color: '#7f8c8d', marginBottom: '1rem' }}>
                Escribe la frase para verificar tu identidad.
              </p>
              <TypingCapture 
                mode="auth" 
                onSampleCaptured={handleTypingAuth} 
              />
            </div>
          </>
        );
      
      case 'complete':
        return (
          <div className="card" style={{ textAlign: 'center' }}>
            <h2 style={{ color: '#27ae60' }}>✅ Login Exitoso</h2>
            <p>Bienvenido, {username}</p>
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#f8f9fa', borderRadius: '4px', textAlign: 'left' }}>
              <strong>Token JWT:</strong>
              <pre style={{ marginTop: '0.5rem', fontSize: '0.7rem', overflow: 'auto' }}>
                {token}
              </pre>
            </div>
          </div>
        );
    }
  };

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      {message && <div className="card" style={{ background: '#e8f8f5', color: '#27ae60' }}>{message}</div>}
      {error && <div className="card" style={{ background: '#fadbd8', color: '#e74c3c' }}>{error}</div>}
      {renderStep()}
    </div>
  );
}

export default Login;