import { useState, useCallback, useRef, useEffect } from 'react';
import {
  unlockAudioContext,
  playKeyClickFeedback,
  playKeyErrorFeedback
} from '../utils/captureFeedback';

const TARGET_PHRASE = "La seguridad protege la información";
const PHRASE_LENGTH = TARGET_PHRASE.length;
const MIN_HOLD_TIME = 25;

const normalizeChar = (c) => {
  if (!c) return '';
  return c.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
};

const pushToKeyStack = (store, key, value) => {
  if (!store[key]) store[key] = [];
  store[key].push(value);
};

const popFromKeyStack = (store, key) => {
  if (!store[key] || store[key].length === 0) return undefined;
  return store[key].shift();
};

const peekFromKeyStack = (store, key) => {
  if (!store[key] || store[key].length === 0) return undefined;
  return store[key][0];
};

export function useTypingCapture(onComplete) {
  const [capturedEvents, setCapturedEvents] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const [hasError, setHasError] = useState(false);

  const errorTimeoutRef = useRef(null);
  const keydownStacks = useRef({});
  const keyupTimes = useRef({});
  const startTime = useRef(null);
  const firstKeydown = useRef(null);
  const deadKeyTime = useRef(null);
  const lastKeydown = useRef({ key: null, time: null });
  const isCapturingRef = useRef(false);
  const currentIndexRef = useRef(0);
  const capturedEventsRef = useRef([]);
  const onCompleteRef = useRef(onComplete);
  const prevEventRef = useRef(null);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const resetCapture = useCallback(() => {
    setCapturedEvents([]);
    setCurrentIndex(0);
    setIsCapturing(false);
    setError(null);
    setProgress(0);
    setHasError(false);
    currentIndexRef.current = 0;
    isCapturingRef.current = false;
    capturedEventsRef.current = [];
    prevEventRef.current = null;
    if (errorTimeoutRef.current) {
      clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = null;
    }
    keydownStacks.current = {};
    keyupTimes.current = {};
    startTime.current = null;
    firstKeydown.current = null;
    deadKeyTime.current = null;
    lastKeydown.current = { key: null, time: null };
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (!isCapturingRef.current) return;

    unlockAudioContext();

    const now = performance.now();
    const key = e.key === ' ' ? 'Space' : e.key;

    if (key === 'Dead' || key === '´' || key === '`' || key === "'" || key === '^' || key === '~' || key === 'AltGraph') {
      deadKeyTime.current = now;
      pushToKeyStack(keydownStacks.current, 'Dead', now);
      return;
    }

    if (firstKeydown.current === null) {
      firstKeydown.current = now;
      startTime.current = now;
    }

    lastKeydown.current = { key, time: now };
    pushToKeyStack(keydownStacks.current, key, now);

    const norm = normalizeChar(key);
    if (norm) {
      pushToKeyStack(keydownStacks.current, norm, now);
    }
  }, []);

  const handleKeyUp = useCallback((e) => {
    if (!isCapturingRef.current) return;

    const now = performance.now();
    const key = e.key === ' ' ? 'Space' : e.key;

    if (key === 'Dead' || key === '´' || key === '`' || key === '^' || key === '~' || key === 'AltGraph' || key === 'Shift' || key === 'Control' || key === 'Alt' || key === 'Meta') {
      return;
    }

    const idx = currentIndexRef.current;
    const expectedChar = TARGET_PHRASE[idx];
    if (!expectedChar) return;

    const isSpace = expectedChar === ' ';
    const isKeySpace = key === ' ' || key === 'Space';

    const matchesExact = isSpace ? isKeySpace : (key === expectedChar);
    const matchesNormalized = !isSpace && (normalizeChar(key) === normalizeChar(expectedChar));

    if (!matchesExact && !matchesNormalized) {
      playKeyErrorFeedback();
      setHasError(true);
      if (errorTimeoutRef.current) clearTimeout(errorTimeoutRef.current);
      errorTimeoutRef.current = setTimeout(() => setHasError(false), 260);
      return;
    }

    const candidates = [
      popFromKeyStack(keydownStacks.current, key),
      popFromKeyStack(keydownStacks.current, expectedChar),
      popFromKeyStack(keydownStacks.current, normalizeChar(key)),
      popFromKeyStack(keydownStacks.current, normalizeChar(expectedChar)),
      deadKeyTime.current,
      popFromKeyStack(keydownStacks.current, 'Dead'),
      peekFromKeyStack(keydownStacks.current, 'Process'),
      peekFromKeyStack(keydownStacks.current, 'Unidentified'),
      lastKeydown.current.time
    ];

    let kdTime = candidates.find(v => v !== undefined && v !== null);

    if (kdTime === undefined || kdTime === null) {
      const prevKu = prevEventRef.current?.keyup_ts;
      const base = prevKu || firstKeydown.current || (now - MIN_HOLD_TIME);
      kdTime = Math.max(base + 1, now - MIN_HOLD_TIME);
    }

    deadKeyTime.current = null;
    keyupTimes.current[key] = now;

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
      hold_time: kuTime - kdTime,
      expected_char: expectedChar,
      position: idx
    };

    prevEventRef.current = event;
    capturedEventsRef.current = [...capturedEventsRef.current, event];
    setCapturedEvents(capturedEventsRef.current);
    playKeyClickFeedback(expectedChar);

    const nextIndex = idx + 1;
    currentIndexRef.current = nextIndex;
    setCurrentIndex(nextIndex);
    setProgress(nextIndex / PHRASE_LENGTH);

    if (nextIndex >= PHRASE_LENGTH) {
      isCapturingRef.current = false;
      setIsCapturing(false);
      const totalDuration = kuTime - (startTime.current || kuTime);
      onCompleteRef.current?.({
        events: capturedEventsRef.current,
        total_duration: totalDuration,
        phrase_typed: TARGET_PHRASE
      });
    }
  }, []);

  const handlePaste = useCallback((e) => {
    if (!isCapturingRef.current) return;
    e.preventDefault();
    setError("⚠️ Intento de pegado (paste) detectado. Por seguridad la captura biométrica requiere tecleo manual.");
    resetCapture();
  }, [resetCapture]);

  const startCapture = useCallback(() => {
    resetCapture();
    isCapturingRef.current = true;
    setIsCapturing(true);
    setError(null);
  }, [resetCapture]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('paste', handlePaste);
    };
  }, [handleKeyDown, handleKeyUp, handlePaste]);

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