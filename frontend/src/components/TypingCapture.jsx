import { useTranslation } from 'react-i18next';
import { useTypingCapture } from '../hooks/useTypingCapture';
import api from '../services/api';

function TypingCapture({ onSampleCaptured, mode = 'enroll' }) {
  const { t } = useTranslation();

  const {
    capturedEvents,
    currentIndex,
    isCapturing,
    error,
    progress,
    targetPhrase,
    phraseLength,
    startCapture
  } = useTypingCapture(async (result) => {
    try {
      const response = await api.post('/typing/enroll', {
        raw_timestamps: result.events,
        phrase_typed: result.phrase_typed,
        source: mode
      });
      onSampleCaptured?.(response.data);
    } catch (err) {
      console.error('Error enviando muestra de tecleo:', err);
    }
  });

  const currentChar = targetPhrase[currentIndex] || '';
  const displayChar = currentChar === ' ' ? '␣' : currentChar;

  const typedPart = targetPhrase.slice(0, currentIndex);
  const currentPart = displayChar;
  const remainingPart = targetPhrase.slice(currentIndex + 1).replace(/ /g, '␣');

  return (
    <div className="typing-box">
      {/* Notice de frase biométrica fija */}
      <div style={{
        background: 'rgba(245, 158, 11, 0.1)',
        border: '1px solid rgba(245, 158, 11, 0.3)',
        borderRadius: '10px',
        padding: '0.6rem 0.85rem',
        marginBottom: '1rem',
        fontSize: '0.78rem',
        color: 'var(--accent-warning)',
        textAlign: 'left',
        lineHeight: 1.4
      }}>
        <strong>💡 Nota Biométrica:</strong> La frase de enrolamiento (<i>"La seguridad protege la información"</i>) está prefijada en el backend. Modificarla invalidaría los modelos biométricos ya entrenados.
      </div>
      
      {/* Frase Objetivo */}
      <div className="typing-target-phrase" style={{ fontSize: '1.25rem', margin: '1rem 0' }}>
        <span style={{ color: 'var(--accent-success)' }}>{typedPart}</span>
        <span style={{ 
          color: isCapturing ? '#ffffff' : 'var(--accent-primary)',
          backgroundColor: isCapturing ? 'var(--accent-primary)' : 'transparent',
          padding: '0 0.3rem',
          borderRadius: '4px',
          boxShadow: isCapturing ? '0 0 10px rgba(99, 102, 241, 0.6)' : 'none'
        }}>
          {currentPart}
        </span>
        <span style={{ color: 'var(--text-muted)' }}>{remainingPart}</span>
      </div>

      {/* Barra de Progreso */}
      <div style={{ margin: '1rem 0' }}>
        <div className="keystroke-meter">
          <div className="keystroke-progress" style={{ width: `${progress * 100}%` }} />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.4rem' }}>
          <span>{t('typing.progress_label')} <b>{currentIndex} / {phraseLength}</b></span>
          <span>{isCapturing ? '⚡ Capturando Ritmo...' : 'Esperando Inicio'}</span>
        </div>
      </div>

      {error && (
        <div style={{ color: 'var(--accent-danger)', margin: '0.8rem 0', padding: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', fontSize: '0.85rem' }}>
          ⚠️ {error}
        </div>
      )}

      {!isCapturing && currentIndex === 0 && (
        <button className="btn-primary" onClick={startCapture} style={{ width: '100%', marginTop: '0.5rem' }}>
          ⌨️ Iniciar Captura de Tecleo
        </button>
      )}

      {isCapturing && (
        <div className="pulse-glow" style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', color: 'var(--accent-primary)', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '0.75rem' }}>
          👉 Teclea la frase con tu ritmo natural...
        </div>
      )}

      {currentIndex >= phraseLength && !isCapturing && (
        <div style={{ padding: '0.75rem', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.15)', color: 'var(--accent-success)', fontWeight: 'bold', fontSize: '0.9rem', marginTop: '0.75rem' }}>
          ✅ ¡Muestra Biométrica Capturada Exitosamente!
        </div>
      )}
    </div>
  );
}

export default TypingCapture;