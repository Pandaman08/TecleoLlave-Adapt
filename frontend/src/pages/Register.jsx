import { useState } from 'react';
import TypingCapture from '../components/TypingCapture';
import api from '../services/api';

function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState('credentials'); // credentials -> enroll -> complete
  const [enrolledSamples, setEnrolledSamples] = useState([]);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    
    try {
      const response = await api.post('/auth/register', { username, password });
      setMessage('Usuario registrado. Ahora completa el enrolamiento biométrico.');
      setStep('enroll');
    } catch (err) {
      setError(err.response?.data?.detail || 'Error en registro');
    }
  };

  const handleSampleCaptured = (sampleData) => {
    setEnrolledSamples(prev => [...prev, sampleData]);
    setMessage(`Muestra ${enrolledSamples.length + 1} de 10 guardada`);
    
    if (enrolledSamples.length + 1 >= 10) {
      setStep('complete');
      setMessage('Enrolamiento completado. Entrenando modelo...');
      // Trigger model training
      trainModel();
    }
  };

  const trainModel = async () => {
    try {
      await api.post('/ml/train', { username });
      setMessage('Modelo entrenado exitosamente. ¡Bienvenido!');
    } catch (err) {
      setError('Error entrenando modelo: ' + (err.response?.data?.detail || err.message));
    }
  };

  const renderStep = () => {
    switch (step) {
      case 'credentials':
        return (
          <div className="card">
            <h2>Registro de Usuario</h2>
            <form onSubmit={handleRegister}>
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
                  minLength={6}
                />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
                Registrar
              </button>
            </form>
          </div>
        );
      
      case 'enroll':
        return (
          <>
            <div className="card">
              <h3>Enrolamiento Biométrico</h3>
              <p style={{ color: '#7f8c8d', marginBottom: '1rem' }}>
                Escribe la frase <strong>10 veces</strong> para crear tu perfil de tecleo.
              </p>
              <TypingCapture 
                mode="enroll" 
                onSampleCaptured={handleSampleCaptured} 
              />
            </div>
            <div className="card">
              <h3>Progreso: {enrolledSamples.length} / 10 muestras</h3>
              <div style={{ 
                height: '10px', 
                backgroundColor: '#ecf0f1', 
                borderRadius: '4px', 
                overflow: 'hidden' 
              }}>
                <div style={{ 
                  height: '100%', 
                  width: `${(enrolledSamples.length / 10) * 100}%`, 
                  backgroundColor: '#3498db',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          </>
        );
      
      case 'complete':
        return (
          <div className="card" style={{ textAlign: 'center' }}>
            <h2 style={{ color: '#27ae60' }}>✅ Registro Completado</h2>
            <p>Tu perfil biométrico ha sido creado y el modelo entrenado.</p>
            <button className="btn btn-primary" onClick={() => window.location.href = '/login'} style={{ marginTop: '1rem' }}>
              Ir a Login
            </button>
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

export default Register;