import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTypingCapture } from '../../hooks/useTypingCapture';
import {
  Keyboard,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Volume2,
  VolumeX,
  Play
} from 'lucide-react';
import {
  playCaptureCompleteFeedback,
  isSoundEnabled,
  toggleSoundEnabled
} from '../../utils/captureFeedback';

export default function LiveTypingCapture({
  onSampleReady,
  isProcessing = false,
  attemptType = 'legitimate',
  username = ''
}) {
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());
  const feedbackPlayedRef = useRef(false);

  const {
    capturedEvents,
    currentIndex,
    isCapturing,
    error,
    hasError,
    progress,
    targetPhrase,
    phraseLength,
    startCapture,
    resetCapture
  } = useTypingCapture((result) => {
    if (result && result.events && result.events.length > 0) {
      onSampleReady?.({
        events: result.events,
        phrase_typed: result.phrase_typed
      });
    }
  });

  useEffect(() => {
    const justCompleted = currentIndex >= phraseLength && !isCapturing;
    if (justCompleted && !feedbackPlayedRef.current) {
      feedbackPlayedRef.current = true;
      playCaptureCompleteFeedback();
    }
    if (currentIndex === 0) {
      feedbackPlayedRef.current = false;
    }
  }, [currentIndex, isCapturing, phraseLength]);

  const handleToggleSound = useCallback(() => {
    const next = toggleSoundEnabled();
    setSoundOn(next);
  }, []);

  const isLegit = attemptType === 'legitimate';

  return (
    <div style={{ width: '100%' }}>
      {/* Banner de frase a teclear */}
      <div style={{
        backgroundColor: isLegit ? 'rgba(16, 185, 129, 0.08)' : 'rgba(239, 68, 68, 0.08)',
        border: `1px solid ${isLegit ? 'rgba(16, 185, 129, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
        borderRadius: 'var(--radius-md)',
        padding: '0.75rem 1rem',
        fontSize: '0.85rem',
        color: 'var(--text-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        marginBottom: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          <Sparkles
            size={16}
            style={{ color: isLegit ? 'var(--success)' : 'var(--danger)', flexShrink: 0 }}
          />
          <div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>
              Frase biométrica requerida (35 caracteres):
            </span>
            <strong style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.95rem' }}>
              "{targetPhrase}"
            </strong>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleSound}
          title={soundOn ? 'Silenciar audio de tecleo' : 'Activar audio de tecleo'}
          className="btn-icon"
          style={{
            width: 32,
            height: 32,
            borderRadius: 'var(--radius-sm)',
            border: '1px solid var(--border-subtle)',
            backgroundColor: 'var(--bg-surface)',
            color: soundOn ? 'var(--brand-500)' : 'var(--text-muted)'
          }}
        >
          {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
        </button>
      </div>

      {/* Streamer Monospace de Caracteres Fijo */}
      <div
        className="typing-streamer-container"
        style={{
          fontFamily: "'JetBrains Mono', 'Consolas', monospace",
          fontSize: '1.12rem',
          letterSpacing: 'normal',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          padding: '1.1rem 1.25rem',
          backgroundColor: 'var(--bg-canvas)',
          border: `1.5px solid ${isCapturing ? (isLegit ? 'var(--success)' : 'var(--danger)') : 'var(--border-subtle)'}`,
          borderRadius: 'var(--radius-lg)',
          margin: '0.5rem 0',
          lineHeight: '1.9',
          minHeight: '68px',
          boxSizing: 'border-box',
          boxShadow: isCapturing ? `0 0 12px ${isLegit ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)'}` : 'none',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease'
        }}
      >
        {Array.from(targetPhrase).map((char, idx) => {
          const isTyped = idx < currentIndex;
          const isCurrent = idx === currentIndex && isCapturing;
          const isPendingFirst = idx === currentIndex && !isCapturing;
          const isSpace = char === ' ';
          const isErrorHere = isCurrent && hasError;

          let color = 'var(--text-muted)';
          let bgColor = 'transparent';
          let borderBottom = '2px solid transparent';

          if (isTyped) {
            color = isLegit ? 'var(--success)' : 'var(--brand-500)';
          } else if (isErrorHere) {
            color = '#ffffff';
            bgColor = 'var(--danger)';
            borderBottom = '2px solid #ffffff';
          } else if (isCurrent) {
            color = '#ffffff';
            bgColor = isLegit ? 'var(--success)' : 'var(--danger)';
            borderBottom = '2px solid #ffffff';
          } else if (isPendingFirst) {
            color = 'var(--text-primary)';
            borderBottom = `2px solid ${isLegit ? 'var(--success)' : 'var(--danger)'}`;
          }

          return (
            <span
              key={idx}
              style={{
                boxSizing: 'border-box',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minWidth: isSpace ? '0.75ch' : '1.1ch',
                height: '1.6em',
                color,
                backgroundColor: bgColor,
                borderBottom,
                borderRadius: isCurrent ? '3px' : '0px',
                fontWeight: isTyped || isCurrent ? 700 : 400,
                whiteSpace: 'pre',
                textAlign: 'center',
                margin: 0,
                padding: '0 1px',
                animation: isErrorHere ? 'tecleo-shake 0.26s ease' : undefined
              }}
            >
              {char}
            </span>
          );
        })}
      </div>

      {/* Barra de progreso */}
      <div style={{ margin: '0.65rem 0' }}>
        <div style={{
          height: '6px',
          backgroundColor: 'var(--bg-surface-elevated)',
          borderRadius: 9999,
          overflow: 'hidden',
          border: '1px solid var(--border-subtle)'
        }}>
          <div
            style={{
              height: '100%',
              backgroundColor: isLegit ? 'var(--success)' : 'var(--danger)',
              width: `${progress * 100}%`,
              transition: 'width 0.12s ease'
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
          fontFamily: "'JetBrains Mono', monospace"
        }}>
          <span>Progreso: <b style={{ color: 'var(--text-primary)' }}>{currentIndex} / {phraseLength}</b></span>
          <span style={{
            color: isCapturing
              ? (isLegit ? 'var(--success)' : 'var(--danger)')
              : currentIndex >= phraseLength
              ? 'var(--success)'
              : 'var(--text-muted)',
            fontWeight: 600
          }}>
            {isCapturing
              ? '⚡ Capturando pulsaciones físicas...'
              : isProcessing
              ? '⏳ Evaluando vector biométrico en ML...'
              : currentIndex >= phraseLength
              ? '✅ Captura completa'
              : 'Haz clic en Iniciar y teclea la frase'}
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
          <AlertTriangle size={15} />
          <span>{error}</span>
        </div>
      )}

      {/* Controles de inicio y reinicio */}
      <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.65rem' }}>
        {!isCapturing && (
          <button
            type="button"
            className={isLegit ? 'btn-primary' : 'btn-secondary'}
            onClick={() => {
              resetCapture();
              startCapture();
            }}
            disabled={isProcessing}
            style={{
              flex: 1,
              height: 44,
              fontSize: '0.9rem',
              backgroundColor: isLegit ? 'var(--brand-600)' : '#ef4444',
              borderColor: isLegit ? 'var(--brand-600)' : '#ef4444',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem'
            }}
          >
            <Play size={16} />
            <span>
              {currentIndex === 0
                ? (isLegit ? 'Comenzar Intento Legítimo' : 'Comenzar Intento de Otra Persona')
                : 'Teclear Nuevo Intento'}
            </span>
          </button>
        )}

        {isCapturing && (
          <>
            <div style={{
              flex: 1,
              padding: '0.5rem 0.85rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: isLegit ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
              border: `1px solid ${isLegit ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
              color: isLegit ? 'var(--success)' : 'var(--danger)',
              fontSize: '0.82rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: isLegit ? 'var(--success)' : 'var(--danger)',
                animation: 'pulse 1.2s infinite'
              }} />
              {isLegit
                ? 'Dueño legítimo: Teclea con tu ritmo natural en el teclado físico...'
                : 'Otra persona: Teclea la misma frase intentando imitar o probar...'}
            </div>

            <button
              type="button"
              className="btn-secondary"
              onClick={resetCapture}
              title="Reiniciar tecleo"
              style={{ padding: '0 0.85rem', height: 44 }}
            >
              <RotateCcw size={16} />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
