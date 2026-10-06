import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Delete } from 'lucide-react';
import './mobile.css';

const KEYBOARD_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'ñ'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm']
];

export default function MobileTouchKeyboard({
  onKeyPress,
  onBackspace,
  targetPhrase = '',
  typedText = '',
  disabled = false,
  showHaptic = true
}) {
  const [activeKey, setActiveKey] = useState(null);
  const activePressesRef = useRef(new Map());

  // Manejo de retroalimentación háptica nativa
  const triggerHaptic = useCallback(() => {
    if (showHaptic && typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(15);
      } catch (e) {
        // Vibración ignorada si no hay permisos de hardware
      }
    }
  }, [showHaptic]);

  // Captura de pointer down (presión de tecla)
  const handlePointerDown = (key, event) => {
    if (disabled) return;
    event.preventDefault();
    triggerHaptic();
    setActiveKey(key);

    const pressTime = performance.now();
    const pressure = event.pressure !== undefined && event.pressure > 0 ? event.pressure : 0.65;
    const width = event.width || 20;

    activePressesRef.current.set(key, {
      pressTime,
      pressure,
      width,
      x: event.clientX,
      y: event.clientY
    });
  };

  // Captura de pointer up (liberación de tecla)
  const handlePointerUp = (key, event) => {
    if (disabled) return;
    event.preventDefault();
    setActiveKey(null);

    const pressData = activePressesRef.current.get(key);
    const releaseTime = performance.now();
    const pressTime = pressData ? pressData.pressTime : releaseTime - 80;
    const holdTime = Math.max(15, releaseTime - pressTime);

    activePressesRef.current.delete(key);

    if (key === 'BACKSPACE') {
      if (onBackspace) onBackspace();
    } else {
      const eventData = {
        char: key,
        press_time: pressTime,
        release_time: releaseTime,
        hold_time: holdTime,
        pressure: pressData ? pressData.pressure : 0.65,
        radius: pressData ? pressData.width : 20
      };
      if (onKeyPress) onKeyPress(key, eventData);
    }
  };

  // Soporte para tecleo físico en computadoras de escritorio
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (disabled) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      const key = e.key.toLowerCase();
      if (key === 'backspace') {
        e.preventDefault();
        triggerHaptic();
        if (onBackspace) onBackspace();
      } else if (key === ' ' || key === 'spacebar') {
        e.preventDefault();
        triggerHaptic();
        const now = performance.now();
        if (onKeyPress) onKeyPress(' ', {
          char: ' ',
          press_time: now,
          release_time: now + 75,
          hold_time: 75,
          pressure: 0.65,
          radius: 25
        });
      } else if (key.length === 1 && /^[a-z0-9ñáéíóú\s]$/i.test(key)) {
        triggerHaptic();
        const now = performance.now();
        if (onKeyPress) onKeyPress(key, {
          char: key,
          press_time: now,
          release_time: now + 85,
          hold_time: 85,
          pressure: 0.65,
          radius: 20
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [disabled, onBackspace, onKeyPress, triggerHaptic]);

  // Tecla esperada actualmente para resaltar sutilmente
  const nextExpectedChar = targetPhrase && typedText.length < targetPhrase.length 
    ? targetPhrase[typedText.length].toLowerCase() 
    : null;

  return (
    <div className="tl-keyboard-container">
      {/* Fila 1 */}
      <div className="tl-keyboard-row">
        {KEYBOARD_ROWS[0].map((k) => {
          const isExpected = nextExpectedChar === k;
          const isActive = activeKey === k;
          return (
            <button
              key={k}
              type="button"
              onPointerDown={(e) => handlePointerDown(k, e)}
              onPointerUp={(e) => handlePointerUp(k, e)}
              onPointerCancel={() => setActiveKey(null)}
              className={`tl-key-btn ${isActive ? 'active' : ''} ${isExpected ? 'expected' : ''}`}
            >
              {k}
            </button>
          );
        })}
      </div>

      {/* Fila 2 */}
      <div className="tl-keyboard-row" style={{ padding: '0 8px' }}>
        {KEYBOARD_ROWS[1].map((k) => {
          const isExpected = nextExpectedChar === k;
          const isActive = activeKey === k;
          return (
            <button
              key={k}
              type="button"
              onPointerDown={(e) => handlePointerDown(k, e)}
              onPointerUp={(e) => handlePointerUp(k, e)}
              onPointerCancel={() => setActiveKey(null)}
              className={`tl-key-btn ${isActive ? 'active' : ''} ${isExpected ? 'expected' : ''}`}
            >
              {k}
            </button>
          );
        })}
      </div>

      {/* Fila 3 con Backspace */}
      <div className="tl-keyboard-row">
        {KEYBOARD_ROWS[2].map((k) => {
          const isExpected = nextExpectedChar === k;
          const isActive = activeKey === k;
          return (
            <button
              key={k}
              type="button"
              onPointerDown={(e) => handlePointerDown(k, e)}
              onPointerUp={(e) => handlePointerUp(k, e)}
              onPointerCancel={() => setActiveKey(null)}
              className={`tl-key-btn ${isActive ? 'active' : ''} ${isExpected ? 'expected' : ''}`}
            >
              {k}
            </button>
          );
        })}

        {/* Tecla Backspace */}
        <button
          type="button"
          onPointerDown={(e) => handlePointerDown('BACKSPACE', e)}
          onPointerUp={(e) => handlePointerUp('BACKSPACE', e)}
          onPointerCancel={() => setActiveKey(null)}
          className={`tl-key-btn backspace ${activeKey === 'BACKSPACE' ? 'active' : ''}`}
          title="Borrar"
        >
          <Delete size={18} />
        </button>
      </div>

      {/* Fila 4: Espacio */}
      <div className="tl-keyboard-row">
        <button
          type="button"
          onPointerDown={(e) => handlePointerDown(' ', e)}
          onPointerUp={(e) => handlePointerUp(' ', e)}
          onPointerCancel={() => setActiveKey(null)}
          className={`tl-key-btn spacebar ${activeKey === ' ' ? 'active' : ''} ${nextExpectedChar === ' ' ? 'expected' : ''}`}
        >
          ESPACIO
        </button>
      </div>
    </div>
  );
}
