import React, { useState, useRef, useCallback, useEffect } from 'react';
import { RotateCcw, CheckCircle2, Shield, Keyboard, AlertTriangle } from 'lucide-react';
import {
  playKeyErrorFeedback,
  playKeyClickFeedback,
  unlockAudioContext
} from '../../utils/captureFeedback';

const TARGET_PHRASE = "La seguridad protege la información";
const PHRASE_LENGTH = TARGET_PHRASE.length; // 35
const MIN_HOLD_TIME = 25;

const normalizeChar = (c) => {
  if (!c) return '';
  return c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
};

export default function CaptchaPhraseInput({
  onSampleComplete,
  disabled = false,
  error = null,
  resetTrigger = 0
}) {
  const [typedText, setTypedText] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [hasKeyError, setHasKeyError] = useState(false);
  const [wrongChar, setWrongChar] = useState(null);

  const inputRef = useRef(null);
  const textScrollRef = useRef(null);
  const currentCharRef = useRef(null);
  const errorTimeoutRef = useRef(null);
  const keydownStacks = useRef({});
  const capturedEventsRef = useRef([]);
  const prevEventRef = useRef(null);
  const deadKeyTime = useRef(null);
  const firstKeydown = useRef(null);

  // Asegurar que el cursor y los caracteres finales ("ión") siempre permanezcan en la zona visible
  useEffect(() => {
    if (currentCharRef.current) {
      currentCharRef.current.scrollIntoView({
        behavior: 'smooth',
        inline: 'nearest',
        block: 'nearest'
      });
    }
    if (textScrollRef.current && (typedText.length >= 24 || isComplete)) {
      textScrollRef.current.scrollLeft = textScrollRef.current.scrollWidth;
    }
  }, [typedText, wrongChar, isComplete]);

  // Limpiar timeout al desmontar
  useEffect(() => {
    return () => {
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    };
  }, []);

  const resetCapture = useCallback(() => {
    setTypedText('');
    setIsComplete(false);
    setHasKeyError(false);
    setWrongChar(null);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    keydownStacks.current = {};
    capturedEventsRef.current = [];
    prevEventRef.current = null;
    deadKeyTime.current = null;
    firstKeydown.current = null;
    onSampleComplete?.(null);
    inputRef.current?.focus();
  }, [onSampleComplete]);

  // Limpiar automáticamente cuando se dispara resetTrigger (ej. al hacer click en Iniciar Sesión)
  useEffect(() => {
    if (resetTrigger > 0) {
      resetCapture();
    }
  }, [resetTrigger, resetCapture]);

  const handleKeyDown = (e) => {
    if (disabled) return;

    // Permitir tecla Backspace para corregir
    if (e.key === 'Backspace') {
      setHasKeyError(false);
      setWrongChar(null);
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      if (capturedEventsRef.current.length > 0) {
        capturedEventsRef.current.pop();
        prevEventRef.current = capturedEventsRef.current[capturedEventsRef.current.length - 1] || null;
        const newText = TARGET_PHRASE.slice(0, capturedEventsRef.current.length);
        setTypedText(newText);
        setIsComplete(false);
        onSampleComplete?.(null);
        // Limpiar stacks pendientes para evitar contaminación con timestamps antiguos
        keydownStacks.current = {};
        deadKeyTime.current = null;
      }
      return;
    }

    if (isComplete) return;

    unlockAudioContext();

    // Evitar que la barra espaciadora desplace la página hacia abajo
    if (e.key === ' ' || e.code === 'Space' || e.keyCode === 32) {
      e.preventDefault();
    }

    const now = performance.now();
    const key = e.key === ' ' ? 'Space' : e.key;

    // Detectar acentos / teclas muertas
    if (key === 'Dead' || key === '´' || key === '`' || key === "'" || key === '^' || key === '~' || key === 'AltGraph') {
      deadKeyTime.current = now;
      if (!keydownStacks.current['Dead']) keydownStacks.current['Dead'] = [];
      keydownStacks.current['Dead'].push(now);
      return;
    }

    if (firstKeydown.current === null) {
      firstKeydown.current = now;
    }

    if (!keydownStacks.current[key]) keydownStacks.current[key] = [];
    keydownStacks.current[key].push(now);

    const norm = normalizeChar(key);
    if (norm) {
      if (!keydownStacks.current[norm]) keydownStacks.current[norm] = [];
      keydownStacks.current[norm].push(now);
    }
  };

  const handleKeyUp = (e) => {
    if (disabled || isComplete || e.key === 'Backspace') return;

    if (e.key === ' ' || e.code === 'Space' || e.keyCode === 32) {
      e.preventDefault();
    }

    const now = performance.now();
    const key = e.key === ' ' ? 'Space' : e.key;

    // Ignorar teclas modificadoras o de navegación sin generar error
    if (
      key === 'Dead' || key === '´' || key === '`' || key === '^' || key === '~' ||
      key === 'AltGraph' || key === 'Shift' || key === 'Control' || key === 'Alt' ||
      key === 'Meta' || key === 'CapsLock' || key === 'Tab' || key === 'Escape' ||
      key.startsWith('Arrow')
    ) {
      return;
    }

    const currentIdx = capturedEventsRef.current.length;
    const expectedChar = TARGET_PHRASE[currentIdx];
    if (!expectedChar) return;

    const isSpace = expectedChar === ' ';
    const isKeySpace = key === ' ' || key === 'Space';
    const matchesExact = isSpace ? isKeySpace : (key === expectedChar);
    const matchesNormalized = !isSpace && (normalizeChar(key) === normalizeChar(expectedChar));

    // Si la tecla no coincide con el siguiente carácter esperado: activar efecto de equivocación
    if (!matchesExact && !matchesNormalized) {
      keydownStacks.current[key]?.shift();
      const norm = normalizeChar(key);
      if (norm) keydownStacks.current[norm]?.shift();

      // Efecto interactivo de error: tono sonoro, sacudida física y resplandor rojo
      playKeyErrorFeedback();
      setHasKeyError(true);
      const displayKey = key === 'Space' ? 'Espacio' : (key.length === 1 ? key : '✗');
      setWrongChar(displayKey);

      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = setTimeout(() => {
        setHasKeyError(false);
        setWrongChar(null);
      }, 360);
      return;
    }

    // Carácter acertado: sonido sutil de pulsación y limpiar cualquier estado de error
    playKeyClickFeedback(expectedChar);
    setHasKeyError(false);
    setWrongChar(null);

    // Resolver tiempo de bajada (keydown) reciente (descartando si tiene más de 900ms para evitar distorsiones por pausa)
    const rawCandidates = [
      keydownStacks.current[key]?.shift(),
      keydownStacks.current[expectedChar]?.shift(),
      keydownStacks.current[normalizeChar(key)]?.shift(),
      keydownStacks.current[normalizeChar(expectedChar)]?.shift(),
      deadKeyTime.current,
      keydownStacks.current['Dead']?.shift()
    ];

    // Filtrar candidatos válidos y no obsoletos (< 900ms)
    let kdTime = rawCandidates.find(v => v !== undefined && v !== null && (now - v) < 900);
    if (kdTime === undefined || kdTime === null) {
      const prevKu = prevEventRef.current?.keyup_ts;
      // Estimar hold time natural de 80ms
      const fallbackBase = prevKu ? prevKu + 15 : now - 80;
      kdTime = Math.max(fallbackBase, now - 120);
    }

    deadKeyTime.current = null;

    const prevEvent = prevEventRef.current;
    if (prevEvent && kdTime < prevEvent.keyup_ts) {
      kdTime = prevEvent.keyup_ts + 1;
    }

    let kuTime = now;
    if (kuTime <= kdTime) {
      kuTime = kdTime + Math.max(MIN_HOLD_TIME, 40);
    }

    const event = {
      key: expectedChar,
      keydown_ts: kdTime,
      keyup_ts: kuTime,
      hold_time: kuTime - kdTime
    };

    prevEventRef.current = event;
    capturedEventsRef.current.push(event);

    const newText = TARGET_PHRASE.slice(0, capturedEventsRef.current.length);
    setTypedText(newText);

    // Si completó los 35 caracteres
    if (capturedEventsRef.current.length >= PHRASE_LENGTH) {
      setIsComplete(true);
      onSampleComplete?.({
        events: [...capturedEventsRef.current],
        phrase_typed: TARGET_PHRASE
      });
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
  };

  return (
    <div style={{
      backgroundColor: 'var(--bg-canvas)',
      border: `1.5px solid ${
        error
          ? 'var(--danger)'
          : isComplete
          ? 'var(--success)'
          : isFocused
          ? 'var(--brand-500)'
          : 'var(--border-subtle)'
      }`,
      borderRadius: 'var(--radius-lg)',
      padding: '1.1rem',
      display: 'flex',
      flexDirection: 'column',
      gap: '0.85rem',
      boxShadow: isFocused ? '0 0 0 3px rgba(99, 102, 241, 0.15)' : 'none',
      transition: 'all 0.2s ease',
      height: '100%',
      justifyContent: 'space-between'
    }}>
      {/* Encabezado integrado */}
      <div>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '0.4rem'
        }}>
          <span style={{
            fontSize: '0.8rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--brand-500)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem'
          }}>
            <Shield size={14} />
            Frase de Verificación
          </span>

          {typedText.length > 0 && (
            <button
              type="button"
              onClick={resetCapture}
              title="Borrar y volver a teclear"
              disabled={disabled}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem',
                fontSize: '0.75rem',
                padding: '0.15rem 0.4rem',
                borderRadius: 'var(--radius-sm)'
              }}
            >
              <RotateCcw size={12} />
              <span>Reiniciar</span>
            </button>
          )}
        </div>

        <p style={{
          fontSize: '0.78rem',
          color: 'var(--text-muted)',
          margin: '0 0 0.6rem',
          lineHeight: 1.4
        }}>
          Escriba la frase de seguridad con su ritmo habitual:
        </p>

        {/* Muestra clara de la frase a escribir */}
        <div style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          padding: '0.65rem 0.85rem',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          fontSize: '0.86rem',
          fontWeight: 600,
          color: 'var(--text-primary)',
          userSelect: 'none',
          letterSpacing: '0.01em',
          textAlign: 'center'
        }}>
          "{TARGET_PHRASE}"
        </div>
      </div>

      {/* Input de tecleo interactivo unificado */}
      <div
        onClick={() => inputRef.current?.focus()}
        style={{
          position: 'relative',
          backgroundColor: hasKeyError ? 'rgba(239, 68, 68, 0.05)' : 'var(--bg-surface)',
          border: `1.5px solid ${
            hasKeyError
              ? 'var(--danger)'
              : error
              ? 'var(--danger)'
              : isComplete
              ? 'var(--success)'
              : isFocused
              ? 'var(--brand-500)'
              : 'var(--border-subtle)'
          }`,
          borderRadius: 'var(--radius-md)',
          padding: '0.65rem 0.75rem',
          minHeight: '48px',
          cursor: disabled ? 'not-allowed' : 'text',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.4rem',
          boxShadow: hasKeyError
            ? '0 0 0 3px rgba(239, 68, 68, 0.25)'
            : isFocused
            ? '0 0 0 3px rgba(99, 102, 241, 0.15)'
            : 'none',
          animation: hasKeyError ? 'tecleo-shake 0.32s ease' : undefined,
          transition: 'border-color 0.15s ease, box-shadow 0.15s ease, background-color 0.15s ease'
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={typedText}
          readOnly
          onKeyDown={handleKeyDown}
          onKeyUp={handleKeyUp}
          onPaste={handlePaste}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          disabled={disabled}
          placeholder=""
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            width: '100%',
            height: '100%',
            cursor: disabled ? 'not-allowed' : 'text'
          }}
          aria-label="Escriba la frase de verificación"
        />

        <div
          ref={textScrollRef}
          style={{
            fontSize: 'clamp(0.81rem, 1.02vw, 0.85rem)',
            fontFamily: "'Inter', monospace",
            letterSpacing: '-0.005em',
            display: 'flex',
            alignItems: 'center',
            overflowX: 'auto',
            overflowY: 'hidden',
            whiteSpace: 'pre',
            flex: 1,
            minWidth: 0,
            padding: '0.15rem 0',
            scrollbarWidth: 'none',
            msOverflowStyle: 'none'
          }}
        >
          {TARGET_PHRASE.split('').map((char, idx) => {
            const isTyped = idx < typedText.length;
            const isCurrent = idx === typedText.length;
            const isPending = idx > typedText.length;
            const isErrorHere = isCurrent && hasKeyError;

            let color = 'var(--text-muted)';
            let bgColor = 'transparent';
            let borderBottom = 'none';

            if (isTyped) {
              color = 'var(--success)';
              borderBottom = '2px solid rgba(16, 185, 129, 0.5)';
            } else if (isErrorHere) {
              color = '#ffffff';
              bgColor = 'var(--danger)';
              borderBottom = '2px solid #ffffff';
            } else if (isCurrent) {
              color = isFocused ? 'var(--brand-500)' : 'var(--text-primary)';
              bgColor = isFocused ? 'rgba(99, 102, 241, 0.16)' : 'transparent';
              borderBottom = isFocused ? '2px solid var(--brand-500)' : 'none';
            }

            return (
              <span
                key={idx}
                ref={isCurrent ? currentCharRef : null}
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: char === ' ' ? '0.52ch' : 'auto',
                  color,
                  fontWeight: isTyped || isCurrent ? 700 : 400,
                  opacity: isPending ? 0.42 : 1,
                  backgroundColor: bgColor,
                  borderRadius: '2px',
                  padding: '0 0.5px',
                  borderBottom,
                  animation: isErrorHere ? 'tecleo-shake 0.28s ease' : undefined,
                  transition: 'background-color 0.1s ease, color 0.1s ease'
                }}
              >
                {/* Cursor indicador vertical con animación de parpadeo */}
                {isCurrent && isFocused && !isErrorHere && (
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '12%',
                      bottom: '12%',
                      width: '2px',
                      backgroundColor: 'var(--brand-500)',
                      borderRadius: '1px',
                      boxShadow: '0 0 8px rgba(99, 102, 241, 0.8)',
                      animation: 'cursorPulse 0.8s infinite alternate'
                    }}
                  />
                )}
                {char === ' ' ? '\u00A0' : char}
              </span>
            );
          })}
          <style>{`
            @keyframes cursorPulse {
              0% { opacity: 1; transform: scaleY(1); }
              50% { opacity: 0.15; transform: scaleY(0.9); }
              100% { opacity: 1; transform: scaleY(1); }
            }
          `}</style>
        </div>

        {isComplete && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            color: 'var(--success)',
            fontSize: '0.78rem',
            fontWeight: 700,
            flexShrink: 0,
            marginLeft: '0.35rem'
          }}>
            <CheckCircle2 size={16} />
            <span>Lista</span>
          </div>
        )}
      </div>

      {/* Pie sutil del bloque derecho */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        fontSize: '0.72rem',
        color: 'var(--text-muted)'
      }}>
        <span>
          Caracteres:{' '}
          <strong style={{ color: isComplete ? 'var(--success)' : 'var(--text-primary)' }}>
            {typedText.length}/{PHRASE_LENGTH}
          </strong>
        </span>
        {hasKeyError ? (
          <span style={{
            color: 'var(--danger)',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            animation: 'fadeIn 0.15s ease'
          }}>
            <AlertTriangle size={12} />
            Carácter incorrecto {wrongChar ? `("${wrongChar}")` : ''}
          </span>
        ) : (
          <span>Backspace para corregir</span>
        )}
      </div>
    </div>
  );
}
