import { useState, useCallback, useRef, useEffect } from 'react';
import { unlockAudioContext } from '../utils/captureFeedback';

const TARGET_PHRASE = "La seguridad protege la información";
const PHRASE_LENGTH = TARGET_PHRASE.length;

const normalizeChar = (c) => {
  if (!c) return '';
  return c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
};

export function useTypingCapture(onComplete) {
  const [capturedEvents, setCapturedEvents] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [hasError, setHasError] = useState(false);

  const errorTimeoutRef = useRef(null);
  
  const keydownTimes = useRef({});
  const keyupTimes = useRef({});
  const startTime = useRef(null);
  const firstKeydown = useRef(null);
  const deadKeyTime = useRef(null);
  const lastKeydown = useRef({ key: null, time: null });

  const resetCapture = useCallback(() => {
    setCapturedEvents([]);
    setCurrentIndex(0);
    setIsCapturing(false);
    setError(null);
    setProgress(0);
    setHasError(false);
    if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
    keydownTimes.current = {};
    keyupTimes.current = {};
    startTime.current = null;
    firstKeydown.current = null;
    deadKeyTime.current = null;
    lastKeydown.current = { key: null, time: null };
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (!isCapturing) return;
    
    // Desbloquear el audio aquí (gesto de usuario síncrono) para que el
    // sonido de confirmación al completar la captura sí pueda sonar.
    unlockAudioContext();
    
    const now = performance.now();
    const key = e.key === ' ' ? 'Space' : e.key;
    
    // Capturar teclas de acento / teclas muertas
    if (key === 'Dead' || key === '´' || key === '`' || key === "'" || key === '^' || key === '~' || key === 'AltGraph') {
      deadKeyTime.current = now;
      keydownTimes.current['Dead'] = now;
      return;
    }
    
    if (firstKeydown.current === null) {
      firstKeydown.current = now;
      startTime.current = now;
    }
    
    lastKeydown.current = { key, time: now };
    keydownTimes.current[key] = now;

    const norm = normalizeChar(key);
    if (norm) {
      keydownTimes.current[norm] = now;
    }
  }, [isCapturing]);

  const handleKeyUp = useCallback((e) => {
    if (!isCapturing) return;
    
    const now = performance.now();
    const key = e.key === ' ' ? 'Space' : e.key;
    
    // Ignorar liberación de teclas muertas o modificadores solos
    if (key === 'Dead' || key === '´' || key === '`' || key === '^' || key === '~' || key === 'AltGraph' || key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta') {
      return;
    }
    
    const expectedChar = TARGET_PHRASE[currentIndex];
    if (!expectedChar) return;

    const isSpace = expectedChar === ' ';
    const isKeySpace = key === ' ' || key === 'Space';
    
    const matchesExact = isSpace ? isKeySpace : (key === expectedChar);
    const matchesNormalized = !isSpace && (normalizeChar(key) === normalizeChar(expectedChar));
    
    if (!matchesExact && !matchesNormalized) {
      setHasError(true);
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = setTimeout(() => setHasError(false), 260);
      return;
    }
    
    let kdTime = keydownTimes.current[key]
      || keydownTimes.current[expectedChar]
      || keydownTimes.current[normalizeChar(key)]
      || keydownTimes.current[normalizeChar(expectedChar)]
      || deadKeyTime.current
      || keydownTimes.current['Dead']
      || keydownTimes.current['Process']
      || keydownTimes.current['Unidentified']
      || lastKeydown.current.time;
    
    if (kdTime === undefined || kdTime === null) {
      kdTime = now - 50;
    }
    
    deadKeyTime.current = null;
    keyupTimes.current[key] = now;

    setCapturedEvents(prevEvents => {
      const prevEvent = prevEvents[prevEvents.length - 1];
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
        hold_time: kuTime - kdTime,
        expected_char: expectedChar,
        position: currentIndex
      };

      const newCaptured = [...prevEvents, event];
      
      delete keydownTimes.current[key];
      delete keydownTimes.current[expectedChar];
      delete keydownTimes.current[normalizeChar(key)];
      delete keydownTimes.current[normalizeChar(expectedChar)];
      delete keydownTimes.current['Dead'];
      delete keydownTimes.current['Process'];
      
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setProgress(nextIndex / PHRASE_LENGTH);
      
      if (nextIndex >= PHRASE_LENGTH) {
        setIsCapturing(false);
        const totalDuration = kuTime - (startTime.current || kuTime);
        onComplete?.({
          events: newCaptured,
          total_duration: totalDuration,
          phrase_typed: TARGET_PHRASE
        });
      }

      return newCaptured;
    });

  }, [isCapturing, currentIndex, onComplete]);

  const handlePaste = useCallback((e) => {
    if (!isCapturing) return;
    e.preventDefault();
    setError("⚠️ Intento de pegado (paste) detectado. Por seguridad la captura biométrica requiere tecleo manual.");
    resetCapture();
  }, [isCapturing, resetCapture]);

  const startCapture = useCallback(() => {
    resetCapture();
    setIsCapturing(true);
    setError(null);
  }, [resetCapture]);

  useEffect(() => {
    if (isCapturing) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
      window.addEventListener('paste', handlePaste);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('paste', handlePaste);
    };
  }, [isCapturing, handleKeyDown, handleKeyUp, handlePaste]);

  return {
    capturedEvents,
    currentIndex,
    isCapturing,
    error,
    hasError,
    progress,
    targetPhrase: TARGET_PHRASE,
    phraseLength: PHRASE_LENGTH,
    startCapture,
    resetCapture,
    setError
  };
}

export { TARGET_PHRASE, PHRASE_LENGTH };