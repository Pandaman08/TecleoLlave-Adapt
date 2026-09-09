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
  error = null
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
      }
      return;
    }

    if (isComplete) return;

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

    // Si la tecla no coincide con el siguiente carácter esperado
    if (!matchesExact && !matchesNormalized) {
      return;
    }

    // Resolver tiempo de bajada (keydown)
    const candidates = [
      keydownStacks.current[key]?.shift(),
      keydownStacks.current[expectedChar]?.shift(),
      keydownStacks.current[normalizeChar(key)]?.shift(),
      keydownStacks.current[normalizeChar(expectedChar)]?.shift(),
      deadKeyTime.current,
      keydownStacks.current['Dead']?.shift()
    ];

    let kdTime = candidates.find(v => v !== undefined && v !== null);
    if (kdTime === undefined || kdTime === null) {
      const prevKu = prevEventRef.current?.keyup_ts;
      const base = prevKu || firstKeydown.current || (now - MIN_HOLD_TIME);
      kdTime = Math.max(base + 1, now - MIN_HOLD_TIME);
    }

    deadKeyTime.current = null;

    const prevEvent = prevEventRef.current;
    if (prevEvent && kdTime < prevEvent.keyup_ts) {
      kdTime = prevEvent.keyup_ts + 1;
    }

    let kuTime = now;
    if (kuTime <= kdTime) {
      kuTime = kdTime + 1;
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
          fontSize: '0.88rem',
          fontFamily: "'Inter', sans-serif",
          color: 'var(--text-primary)',
          letterSpacing: '0.01em',
          display: 'flex',
          alignItems: 'center',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          flex: 1
        }}>
          {typedText ? (
            <>
              <span>{typedText}</span>
              {!isComplete && isFocused && (
                <span style={{
                  display: 'inline-block',
                  width: '2px',
                  height: '1.1em',
                  backgroundColor: 'var(--brand-500)',
                  marginLeft: '2px',
                  animation: 'pulse 1s infinite'
                }} />
              )}
            </>
          ) : (
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Keyboard size={14} />
              Haga clic aquí y teclee la frase...
            </span>
          )}
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
