import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTypingCapture } from '../hooks/useTypingCapture';
import api from '../services/api';
import { Keyboard, RotateCcw, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

export default function TypingCapture({
  onSampleCaptured,
  mode = 'enroll',
  username,
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
      const isAuth = mode === 'auth';
      const endpoint = isAuth ? '/typing/authenticate' : '/typing/enroll';
      const payload = isAuth
        ? { raw_timestamps: result.events, phrase_typed: result.phrase_typed, username }
        : { raw_timestamps: result.events, phrase_typed: result.phrase_typed, source: mode };
      const response = await api.post(endpoint, payload);
      onSampleCaptured?.(response.data);
    } catch (err) {
      console.error('Error enviando muestra de tecleo:', err);
      onSampleCaptured?.(mode === 'auth' ? null : result);
    }
  });

  return (
    <div style={{ width: '100%' }}>
      {/* Notice info */}
      <div style={{
        backgroundColor: 'var(--info-bg)',
        border: '1px solid var(--info-border)',
        borderRadius: 'var(--radius-md)',
        padding: '0.6rem 0.85rem',
        fontSize: '0.78rem',
        color: 'var(--info)',
        lineHeight: 1.4,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <Sparkles size={15} strokeWidth={2} style={{ flexShrink: 0, color: 'var(--brand-500)' }} />
        <span>
          Frase biométrica: <strong>"La seguridad protege la información"</strong>
        </span>
      </div>

      {/* Streamer Monospace de Caracteres Fijo (Sin saltos de espacio ni tracking roto) */}
      <div
        className="typing-streamer-container"
        style={{
          fontFamily: "'JetBrains Mono', 'Consolas', monospace",
          fontSize: '1.05rem',
          letterSpacing: 'normal',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          padding: '1rem 1.25rem',
          backgroundColor: 'var(--bg-canvas)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          margin: '0.85rem 0',
          lineHeight: '1.8',
          minHeight: '62px',
          boxSizing: 'border-box'
        }}
      >
        {Array.from(targetPhrase).map((char, idx) => {
          const isTyped = idx < currentIndex;
          const isCurrent = idx === currentIndex && isCapturing;
          const isPendingFirst = idx === currentIndex && !isCapturing;
          const isSpace = char === ' ';

          let color = 'var(--text-muted)';
          let bgColor = 'transparent';
          let borderBottom = '2px solid transparent';

          if (isTyped) {
            color = 'var(--success)';
          } else if (isCurrent) {
            color = '#ffffff';
            bgColor = 'var(--brand-600)';
            borderBottom = '2px solid #ffffff';
          } else if (isPendingFirst) {
            color = 'var(--text-primary)';
            borderBottom = '2px solid var(--brand-500)';
          }

          return (
            <span
              key={idx}
              style={{
                boxSizing: 'border-box',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: isSpace ? '0.7ch' : '1.05ch',
                height: '1.6em',
                color,
                backgroundColor: bgColor,
                borderBottom,
                borderRadius: isCurrent ? '2px' : '0px',
                fontWeight: isTyped || isCurrent ? 700 : 400,
                whiteSpace: 'pre',
                textAlign: 'center',
                margin: 0,
                padding: '0 1px'
              }}
            >
              {char}
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
          marginTop: '0.4rem',
          fontFamily: "'JetBrains Mono', monospace"
        }}>
          <span>Progreso: <b style={{ color: 'var(--text-primary)' }}>{currentIndex} / {phraseLength}</b></span>
          <span style={{ color: isCapturing ? 'var(--brand-500)' : currentIndex >= phraseLength ? 'var(--success)' : 'var(--text-muted)' }}>
            {isCapturing
              ? '⚡ Capturando pulsaciones en vivo...'
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
          style={{ width: '100%', marginTop: '0.5rem', height: 42 }}
        >
          <Keyboard size={16} />
          <span>Iniciar Captura de Tecleo {sampleIndex ? `(Muestra ${sampleIndex}/${totalSamples})` : ''}</span>
        </button>
      )}

      {isCapturing && (
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
          <div style={{
            flex: 1,
            padding: '0.5rem 0.85rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--brand-500)',
            fontSize: '0.82rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--brand-500)' }} />
            Teclea la frase en tu teclado físico...
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
            style={{ width: '100%', height: 42 }}
          >
            <CheckCircle2 size={16} />
            <span>Capturar Siguiente {sampleIndex && totalSamples && sampleIndex < totalSamples ? `(${sampleIndex + 1}/${totalSamples})` : ''}</span>
          </button>
        </div>
      )}
    </div>
  );
}