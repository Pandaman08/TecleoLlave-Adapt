import { useState, useCallback, useRef, useEffect } from 'react';

const TARGET_PHRASE = "La seguridad protege la información";
const PHRASE_LENGTH = 32;

export function useTypingCapture(onComplete) {
  const [capturedEvents, setCapturedEvents] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCapturing, setIsCapturing] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  
  const keydownTimes = useRef({});
  const keyupTimes = useRef({});
  const startTime = useRef(null);
  const firstKeydown = useRef(null);

  const resetCapture = useCallback(() => {
    setCapturedEvents([]);
    setCurrentIndex(0);
    setIsCapturing(false);
    setError(null);
    setProgress(0);
    keydownTimes.current = {};
    keyupTimes.current = {};
    startTime.current = null;
    firstKeydown.current = null;
  }, []);

  const handleKeyDown = useCallback((e) => {
    if (!isCapturing) return;
    
    const now = performance.now();
    const key = e.key === ' ' ? 'Space' : e.key;
    
    if (firstKeydown.current === null) {
      firstKeydown.current = now;
      startTime.current = now;
    }
    
    if (keydownTimes.current[key] === undefined) {
      keydownTimes.current[key] = now;
    }
  }, [isCapturing]);

  const handleKeyUp = useCallback((e) => {
    if (!isCapturing) return;
    
    const now = performance.now();
    const key = e.key === ' ' ? 'Space' : e.key;
    const expectedChar = TARGET_PHRASE[currentIndex];
    
    const isSpace = expectedChar === ' ';
    const matches = isSpace ? key === 'Space' : key === expectedChar;
    
    if (!matches) {
      return;
    }
    
    const kdTime = keydownTimes.current[key];
    if (kdTime === undefined) {
      return;
    }
    
    keyupTimes.current[key] = now;
    
    const event = {
      key: key,
      keydown_ts: kdTime,
      keyup_ts: now,
      hold_time: now - kdTime,
      expected_char: expectedChar,
      position: currentIndex
    };
    
    setCapturedEvents(prev => [...prev, event]);
    setCurrentIndex(prev => prev + 1);
    setProgress((currentIndex + 1) / PHRASE_LENGTH);
    
    delete keydownTimes.current[key];
    
    if (currentIndex + 1 >= PHRASE_LENGTH) {
      setIsCapturing(false);
      const totalDuration = now - (startTime.current || now);
      onComplete?.({
        events: capturedEvents.concat(event),
        total_duration: totalDuration,
        phrase_typed: TARGET_PHRASE
      });
    }
  }, [isCapturing, currentIndex, capturedEvents, onComplete]);

  const startCapture = useCallback(() => {
    resetCapture();
    setIsCapturing(true);
    setError(null);
  }, [resetCapture]);

  useEffect(() => {
    if (isCapturing) {
      window.addEventListener('keydown', handleKeyDown);
      window.addEventListener('keyup', handleKeyUp);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isCapturing, handleKeyDown, handleKeyUp]);

  return {
    capturedEvents,
    currentIndex,
    isCapturing,
    error,
    progress,
    targetPhrase: TARGET_PHRASE,
    phraseLength: PHRASE_LENGTH,
    startCapture,
    resetCapture,
    setError
  };
}

export { TARGET_PHRASE, PHRASE_LENGTH };