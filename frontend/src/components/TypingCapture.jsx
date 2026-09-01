import { useTypingCapture, TARGET_PHRASE } from '../hooks/useTypingCapture';
import api from '../services/api';

function TypingCapture({ onSampleCaptured, mode = 'enroll' }) {
  const {
    capturedEvents,
    currentIndex,
    isCapturing,
    error,
    progress,
    targetPhrase,
    phraseLength,
    startCapture,
    resetCapture
  } = useTypingCapture(async (result) => {
    try {
      const response = await api.post('/typing/enroll', {
        raw_timestamps: result.events,
        phrase_typed: result.phrase_typed,
        source: mode
      });
      onSampleCaptured?.(response.data);
    } catch (err) {
      console.error('Error saving sample:', err);
    }
  });

  const currentChar = targetPhrase[currentIndex] || '';
  const displayChar = currentChar === ' ' ? '␣' : currentChar;

  const typedPart = targetPhrase.slice(0, currentIndex);
  const currentPart = displayChar;
  const remainingPart = targetPhrase.slice(currentIndex + 1).replace(/ /g, '␣');

  return (
    <div className="card">
      <h2>{mode === 'enroll' ? 'Enrolamiento' : 'Autenticación'} - Dinámica de Teclado</h2>
      
      <div className="phrase-display">
        <span style={{ color: '#27ae60' }}>{typedPart}</span>
        <span style={{ 
          color: isCapturing ? '#f39c12' : '#3498db',
          backgroundColor: isCapturing ? '#fff3cd' : 'transparent',
          padding: '0 0.25rem',
          borderRadius: '4px'
        }}>
          {currentPart}
        </span>
        <span style={{ color: '#95a5a6' }}>{remainingPart}</span>
      </div>

      <div style={{ marginBottom: '1rem' }}>
        <div style={{ 
          height: '8px', 
          backgroundColor: '#ecf0f1', 
          borderRadius: '4px', 
          overflow: 'hidden' 
        }}>
          <div style={{ 
            height: '100%', 
            width: `${progress * 100}%`, 
            backgroundColor: isCapturing ? '#f39c12' : '#3498db',
            transition: 'width 0.1s ease'
          }} />
        </div>
        <small style={{ color: '#7f8c8d' }}>
          {currentIndex} / {phraseLength} caracteres
        </small>
      </div>

      {error && (
        <div style={{ color: '#e74c3c', marginBottom: '1rem', padding: '0.5rem', background: '#fadbd8', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      {!isCapturing && currentIndex === 0 && (
        <button className="btn btn-primary" onClick={startCapture} style={{ width: '100%' }}>
          Iniciar Captura
        </button>
      )}

      {isCapturing && (
        <div style={{ textAlign: 'center', color: '#f39c12', fontWeight: 'bold', marginTop: '1rem' }}>
          🎙️ Capturando... Escribe la frase completa
        </div>
      )}

      {currentIndex >= phraseLength && !isCapturing && (
        <div style={{ textAlign: 'center', color: '#27ae60', fontWeight: 'bold', marginTop: '1rem' }}>
          ✅ Frase completada - Muestra guardada
        </div>
      )}

      {capturedEvents.length > 0 && (
        <details style={{ marginTop: '1rem' }}>
          <summary style={{ cursor: 'pointer', color: '#7f8c8d' }}>
            Ver eventos capturados ({capturedEvents.length})
          </summary>
          <pre style={{ 
            marginTop: '0.5rem', 
            padding: '0.5rem', 
            background: '#f8f9fa', 
            borderRadius: '4px',
            fontSize: '0.75rem',
            overflow: 'auto',
            maxHeight: '200px'
          }}>
            {JSON.stringify(capturedEvents.map(e => ({
              key: e.key,
              hold: Math.round(e.hold_time * 100) / 100,
              pos: e.position
            })), null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

export default TypingCapture;