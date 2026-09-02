import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTypingCapture } from '../hooks/useTypingCapture';
import api from '../services/api';
import { Keyboard, RotateCcw, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

export default function TypingCapture({
  onSampleCaptured,
  mode = 'enroll',
  sampleIndex,
  totalSamples
}) {
  const { t } = useTranslation();

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
      console.error('Error enviando muestra de tecleo:', err);
      // Even if offline/local, pass the captured raw result
      onSampleCaptured?.(result);
    }
  });

  return (
    <div style={{ width: '100%' }}>
      {/* Notice info */}
      <div style={{
        backgroundColor: 'var(--info-bg)',
        border: '1px solid var(--info-border)',
        borderRadius: 'var(--radius-md)',
        padding: '0.65rem 0.85rem',
        fontSize: '0.78rem',
        color: 'var(--info)',
        lineHeight: 1.4,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <Sparkles size={16} strokeWidth={2} style={{ flexShrink: 0 }} />
        <span>
          Frase biométrica fija: <strong>"La seguridad protege la información"</strong>. Escribe a tu ritmo natural.
        </span>
      </div>

      {/* Streamer Monospace de Caracteres (Fix de tokenización y espaciado) */}
      <div className="typing-streamer-container" tabIndex={0}>
        {Array.from(targetPhrase).map((char, idx) => {
          const isTyped = idx < currentIndex;
          const isCurrent = idx === currentIndex && isCapturing;
          const isPendingCurrent = idx === currentIndex && !isCapturing;
          const isSpace = char === ' ';

          let statusClass = 'remaining';
          if (isTyped) statusClass = 'typed';
          else if (isCurrent) statusClass = 'current';
          else if (isPendingCurrent) statusClass = 'pending-first';

          return (
            <span
              key={idx}
              className={`char-token ${statusClass}`}
              style={{
                padding: isCurrent ? '0 2px' : '0',
                margin: '0 1px'
              }}
            >
              {isSpace ? (
                <span className="char-space-marker">␣</span>
              ) : (
                char
              )}
            </span>
          );
        })}
      </div>

      {/* Progress Bar & Status */}
      <div style={{ margin: '0.75rem 0' }}>
        <div style={{
          height: '6px',
          backgroundColor: 'var(--bg-surface-elevated)',
          borderRadius: '9999px',
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)'
        }}>
          <div
            style={{
              height: '100%',
              backgroundColor: 'var(--brand-500)',
              width: `${progress * 100}%`,
              transition: 'width 0.15s ease'
            }}
          />
        </div>

        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          marginTop: '0.35rem',
          fontFamily: 'JetBrains Mono, monospace'
        }}>
          <span>Progreso: <b>{currentIndex} / {phraseLength}</b></span>
          <span>
            {isCapturing
              ? '⚡ Capturando dinámica de tecleo...'
              : currentIndex >= phraseLength
              ? '✅ Muestra completada'
              : 'Listo para iniciar'}
          </span>
        </div>
      </div>

      {error && (
        <div style={{
          backgroundColor: 'var(--danger-bg)',
          border: '1px solid var(--danger-border)',
          color: 'var(--danger)',
          borderRadius: 'var(--radius-md)',
          padding: '0.5rem 0.75rem',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          margin: '0.5rem 0'
        }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Actions */}
      {!isCapturing && currentIndex === 0 && (
        <button
          type="button"
          className="btn-primary"
          onClick={startCapture}
          style={{ width: '100%', marginTop: '0.5rem' }}
        >
          <Keyboard size={16} />
          <span>Iniciar Captura {sampleIndex ? `(Muestra ${sampleIndex}/${totalSamples})` : ''}</span>
        </button>
      )}

      {isCapturing && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <div style={{
            flex: 1,
            padding: '0.5rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.25)',
            color: 'var(--brand-500)',
            fontSize: '0.82rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--brand-500)' }} />
            Teclea la frase en tu teclado...
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={resetCapture}
            title="Reiniciar muestra"
          >
            <RotateCcw size={16} />
          </button>
        </div>
      )}

      {currentIndex >= phraseLength && !isCapturing && (
        <div style={{ marginTop: '0.5rem' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={startCapture}
            style={{ width: '100%' }}
          >
            <CheckCircle2 size={16} />
            <span>Capturar Siguiente {sampleIndex && totalSamples && sampleIndex < totalSamples ? `(${sampleIndex + 1}/${totalSamples})` : ''}</span>
          </button>
        </div>
      )}
    </div>
  );
}