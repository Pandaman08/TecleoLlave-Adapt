import React from 'react';
import { useTranslation } from 'react-i18next';
import { useTypingCapture } from '../hooks/useTypingCapture';
import api from '../services/api';
import { Keyboard, RotateCcw, CheckCircle2, AlertTriangle, Sparkles } from 'lucide-react';

export default function TypingCapture({
  onSampleCaptured,
  mode = 'enroll',
  sampleIndex,
  totalSamples,
  variant = 'default' // 'default' | 'terminal'
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
      onSampleCaptured?.(result);
    }
  });

  const isTerminal = variant === 'terminal';

  return (
    <div style={{ width: '100%' }}>
      {/* Notice info */}
      <div style={{
        backgroundColor: isTerminal ? 'rgba(59, 130, 246, 0.1)' : 'var(--info-bg)',
        border: `1px solid ${isTerminal ? 'rgba(59, 130, 246, 0.25)' : 'var(--info-border)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '0.6rem 0.85rem',
        fontSize: '0.78rem',
        color: isTerminal ? '#93c5fd' : 'var(--info)',
        lineHeight: 1.4,
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <Sparkles size={15} strokeWidth={2} style={{ flexShrink: 0, color: isTerminal ? '#60a5fa' : 'var(--brand-500)' }} />
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
          backgroundColor: isTerminal ? '#090d16' : 'var(--bg-canvas)',
          border: `1px solid ${isTerminal ? 'rgba(255, 255, 255, 0.12)' : 'var(--border-subtle)'}`,
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

          let color = isTerminal ? '#64748b' : 'var(--text-muted)';
          let bgColor = 'transparent';
          let borderBottom = '2px solid transparent';

          if (isTyped) {
            color = '#10b981'; // Green
          } else if (isCurrent) {
            color = '#ffffff';
            bgColor = '#4f46e5';
            borderBottom = '2px solid #ffffff';
          } else if (isPendingFirst) {
            color = isTerminal ? '#f8fafc' : 'var(--text-primary)';
            borderBottom = '2px solid #6366f1';
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
          backgroundColor: isTerminal ? 'rgba(255, 255, 255, 0.08)' : 'var(--bg-surface-elevated)',
          borderRadius: '9999px',
          overflow: 'hidden',
          border: `1px solid ${isTerminal ? 'rgba(255, 255, 255, 0.1)' : 'var(--border-subtle)'}`
        }}>
          <div
            style={{
              height: '100%',
              backgroundColor: '#4f46e5',
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
          color: isTerminal ? '#94a3b8' : 'var(--text-muted)',
          marginTop: '0.4rem',
          fontFamily: "'JetBrains Mono', monospace"
        }}>
          <span>Progreso: <b style={{ color: isTerminal ? '#f8fafc' : 'var(--text-primary)' }}>{currentIndex} / {phraseLength}</b></span>
          <span style={{ color: isCapturing ? '#60a5fa' : currentIndex >= phraseLength ? '#34d399' : isTerminal ? '#94a3b8' : 'var(--text-muted)' }}>
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
            backgroundColor: 'rgba(99, 102, 241, 0.15)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#a5b4fc',
            fontSize: '0.82rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#6366f1' }} />
            Teclea la frase en tu teclado físico...
          </div>
          <button
            type="button"
            className="btn-secondary"
            onClick={resetCapture}
            title="Reiniciar muestra"
            style={{
              backgroundColor: isTerminal ? '#1e293b' : 'var(--bg-surface)',
              color: isTerminal ? '#f8fafc' : 'var(--text-primary)',
              borderColor: isTerminal ? 'rgba(255,255,255,0.15)' : 'var(--border-subtle)'
            }}
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