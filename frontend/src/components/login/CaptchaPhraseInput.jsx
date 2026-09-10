import React, { useState, useRef, useCallback } from 'react';
import { RotateCcw, CheckCircle2, Shield, Keyboard } from 'lucide-react';

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

  const inputRef = useRef(null);
  const keydownStacks = useRef({});
  const capturedEventsRef = useRef([]);
  const prevEventRef = useRef(null);
  const deadKeyTime = useRef(null);
  const firstKeydown = useRef(null);

  const resetCapture = useCallback(() => {
    setTypedText('');
    setIsComplete(false);
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

    if (key === 'Dead' || key === '´' || key === '`' || key === '^' || key === '~' || key === 'AltGraph' || key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta') {
      return;
    }

    const currentIdx = capturedEventsRef.current.length;
    const expectedChar = TARGET_PHRASE[currentIdx];
    if (!expectedChar) return;

    const isSpace = expectedChar === ' ';
    const isKeySpace = key === ' ' || key === 'Space';
    const matchesExact = isSpace ? isKeySpace : (key === expectedChar);
    const matchesNormalized = !isSpace && (normalizeChar(key) === normalizeChar(expectedChar));

    // Si la tecla no coincide con el siguiente carácter esperado, descartar de la pila para evitar timestamps viejos
    if (!matchesExact && !matchesNormalized) {
      keydownStacks.current[key]?.shift();
      const norm = normalizeChar(key);
      if (norm) keydownStacks.current[norm]?.shift();
      return;
    }

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
          fontSize: '0.88rem',
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
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '0.75rem 0.85rem',
          minHeight: '48px',
          cursor: disabled ? 'not-allowed' : 'text',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '0.5rem'
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

        <div style={{
          fontSize: '0.90rem',
          fontFamily: "'Inter', monospace",
          letterSpacing: '0.02em',
          display: 'flex',
          alignItems: 'center',
          overflowX: 'auto',
          whiteSpace: 'pre',
          flex: 1,
          padding: '0.15rem 0',
          scrollbarWidth: 'none'
        }}>
          {TARGET_PHRASE.split('').map((char, idx) => {
            const isTyped = idx < typedText.length;
            const isCurrent = idx === typedText.length;
            const isPending = idx > typedText.length;

            return (
              <span
                key={idx}
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  minWidth: char === ' ' ? '0.55ch' : 'auto',
                  color: isTyped
                    ? 'var(--success)'
                    : isCurrent
                    ? (isFocused ? 'var(--brand-500)' : 'var(--text-primary)')
                    : 'var(--text-muted)',
                  fontWeight: isTyped || isCurrent ? 700 : 400,
                  opacity: isPending ? 0.42 : 1,
                  backgroundColor: isCurrent && isFocused ? 'rgba(99, 102, 241, 0.16)' : 'transparent',
                  borderRadius: '2px',
                  padding: '0 1px',
                  borderBottom: isCurrent && isFocused ? '2px solid var(--brand-500)' : (isTyped ? '2px solid rgba(16, 185, 129, 0.5)' : 'none'),
                  transition: 'background-color 0.1s ease'
                }}
              >
                {/* Cursor indicador vertical con animación de parpadeo */}
                {isCurrent && isFocused && (
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '12%',
                      bottom: '12%',
                      width: '2.5px',
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
            flexShrink: 0
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
        <span>Caracteres: <strong style={{ color: 'var(--text-primary)' }}>{typedText.length}/{PHRASE_LENGTH}</strong></span>
        <span>Backspace para corregir</span>
      </div>
    </div>
  );
}
