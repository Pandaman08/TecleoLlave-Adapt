import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useTypingCapture } from '../hooks/useTypingCapture';
import api from '../services/api';
import {
  Keyboard,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Volume2,
  VolumeX
} from 'lucide-react';
import {
  playCaptureCompleteFeedback,
  isSoundEnabled,
  toggleSoundEnabled
} from '../utils/captureFeedback';

export default function TypingCapture({
  onSampleCaptured,
  onStartCapture,
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
    hasError,
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

  // Feedback sutil (sonido + vibración) al completar la captura de la frase.
  // Se dispara una sola vez por captura (no en cada tecla).
  const feedbackPlayedRef = useRef(false);
  const [soundOn, setSoundOn] = useState(() => isSoundEnabled());

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

  const SoundToggleButton = (
    <button
      type="button"
      onClick={handleToggleSound}
      title={soundOn ? 'Silenciar sonidos de tecleo' : 'Activar sonidos de tecleo'}
      className="btn-icon"
      style={{
        width: 34,
        height: 34,
        minWidth: 34,
        minHeight: 34,
        padding: 0,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-surface)',
        color: soundOn ? 'var(--brand-500)' : 'var(--text-muted)',
        cursor: 'pointer',
        flexShrink: 0
      }}
    >
      {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
    </button>
  );

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
        justifyContent: 'space-between',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
          <Sparkles size={15} strokeWidth={2} style={{ flexShrink: 0, color: 'var(--brand-500)' }} />
          <span style={{ minWidth: 0, display: 'inline' }}>
            Frase biométrica: <strong>"La seguridad protege la información"</strong>
          </span>
        </div>
        {SoundToggleButton}
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
          const isErrorHere = isCurrent && hasError;

          let color = 'var(--text-muted)';
          let bgColor = 'transparent';
          let borderBottom = '2px solid transparent';

          if (isTyped) {
            color = 'var(--success)';
          } else if (isErrorHere) {
            color = '#ffffff';
            bgColor = 'var(--danger)';
            borderBottom = '2px solid #ffffff';
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
                padding: '0 1px',
                transform: isErrorHere ? 'translateX(0)' : undefined,
                animation: isErrorHere ? 'tecleo-shake 0.26s ease' : undefined
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
          fontFamily: "'JetBrains Mono', monospace",
          gap: '0.5rem',
          flexWrap: 'wrap'
        }}>
          <span>Progreso: <b style={{ color: 'var(--text-primary)' }}>{currentIndex} / {phraseLength}</b></span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span
              title={soundOn ? 'Sonidos de tecleo activados' : 'Sonidos de tecleo silenciados'}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.2rem',
                fontSize: '0.7rem',
                color: soundOn ? 'var(--brand-500)' : 'var(--text-muted)'
              }}
            >
              {soundOn ? <Volume2 size={12} /> : <VolumeX size={12} />}
              {soundOn ? 'Audio ON' : 'Audio OFF'}
            </span>
            <span style={{ color: isCapturing ? 'var(--brand-500)' : currentIndex >= phraseLength ? 'var(--success)' : 'var(--text-muted)' }}>
              {isCapturing
                ? '⚡ Capturando pulsaciones en vivo...'
                : currentIndex >= phraseLength
                ? '✅ Muestra completada'
                : 'Listo para iniciar'}
            </span>
          </div>
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
          onClick={() => {
            onStartCapture?.();
            startCapture();
          }}
          style={{ width: '100%', marginTop: '0.5rem', height: 44, fontSize: '0.9rem' }}
        >
          <Keyboard size={16} />
          <span>Iniciar Captura {sampleIndex ? `(${sampleIndex}/${totalSamples})` : ''}</span>
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
            onClick={() => {
              onStartCapture?.();
              startCapture();
            }}
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