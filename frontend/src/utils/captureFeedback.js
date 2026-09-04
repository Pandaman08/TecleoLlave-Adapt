/**
 * Feedback sutil (sonido + vibración) al completar una captura de tecleo
 * y durante el tipeo caracter a caracter. Incluye preferencia persistente
 * para activar/desactivar el audio en login y registro.
 *
 * Se apoya en Web Audio API (sin archivos externos) y en la Vibration API.
 * Ambas son mejoras progresivas: si el navegador las bloquea o no las
 * soporta, fallan en silencio y no interrumpen el flujo de captura.
 *
 * NOTA IMPORTANTE sobre autoplay:
 * Los navegadores (Chrome, y especialmente Safari) crean el AudioContext
 * en estado "suspended" y solo lo desbloquean permanentemente si se llama
 * a resume() de forma SÍNCRONA dentro de un gesto de usuario real
 * (keydown, click, touchstart...). Si se intenta crear/resumir el
 * contexto más tarde (por ejemplo dentro de un useEffect, que ya no es
 * parte de la pila de ejecución del evento original), muchos navegadores
 * lo ignoran silenciosamente y el audio nunca suena, sin lanzar ningún
 * error.
 *
 * Por eso este módulo expone unlockAudioContext(), pensado para llamarse
 * desde el propio handler de keydown (un gesto de usuario síncrono), y
 * reutiliza ese mismo contexto ya desbloqueado cuando llega el momento de
 * reproducir el sonido de confirmación.
 */

let sharedCtx = null;
const SOUND_PREF_KEY = 'tecleollave_sound_enabled';
let lastToneTime = 0;

function getAudioCtx() {
  if (sharedCtx) return sharedCtx;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  sharedCtx = new AudioCtx();
  return sharedCtx;
}

export function isSoundEnabled() {
  try {
    const stored = localStorage.getItem(SOUND_PREF_KEY);
    if (stored === null) return true;
    return stored === 'true';
  } catch (e) {
    return true;
  }
}

export function setSoundEnabled(enabled) {
  try {
    localStorage.setItem(SOUND_PREF_KEY, enabled ? 'true' : 'false');
  } catch (e) {}
  return isSoundEnabled();
}

export function toggleSoundEnabled() {
  const next = !isSoundEnabled();
  setSoundEnabled(next);
  return next;
}

/**
 * Debe llamarse de forma SÍNCRONA dentro de un gesto de usuario
 * (por ejemplo, en el primer keydown de la captura). Es barata de
 * llamar repetidamente: si el contexto ya está desbloqueado, no hace
 * nada.
 */
export function unlockAudioContext() {
  try {
    const ctx = getAudioCtx();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  } catch (e) {
    // Ignorar: el desbloqueo de audio es una mejora progresiva
  }
}

function playClickTone(freq, peakGain = 0.04, duration = 0.05) {
  try {
    if (!isSoundEnabled()) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    if (ctx.state === 'suspended') return;

    const now = ctx.currentTime;
    const throttledNow = Math.max(now, lastToneTime + 0.012);
    lastToneTime = throttledNow;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, throttledNow);

    gain.gain.setValueAtTime(0.0001, throttledNow);
    gain.gain.linearRampToValueAtTime(peakGain, throttledNow + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, throttledNow + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(throttledNow);
    osc.stop(throttledNow + duration + 0.01);
  } catch (e) {
    // Ignorar silenciosamente
  }
}

/**
 * Sonido breve para un caracter correcto registrado.
 * Se usa una frecuencia diferente para vocales, consonantes y espacios
 * para dar una percepción más rica sin distraer.
 */
export function playKeyClickFeedback(char) {
  if (char === ' ' || char === 'Space') {
    playClickTone(220, 0.035, 0.06);
    return;
  }
  const vowels = ['a', 'e', 'i', 'o', 'u', 'á', 'é', 'í', 'ó', 'ú'];
  const normalized = (char || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  if (normalized && vowels.includes(normalized)) {
    playClickTone(880, 0.035, 0.045);
    return;
  }
  playClickTone(620, 0.03, 0.04);
}

/**
 * Sonido de "error" cuando el usuario pulsa una tecla incorrecta.
 */
export function playKeyErrorFeedback() {
  playClickTone(160, 0.05, 0.08);
}

export function playCaptureCompleteFeedback() {
  try {
    if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
      navigator.vibrate(35);
    }
  } catch (e) {
    // Ignorar: la vibración es un extra, no debe romper nada
  }

  try {
    const ctx = getAudioCtx();
    if (!ctx) return;

    const scheduleTones = () => {
      const now = ctx.currentTime;

      const playTone = (freq, start, duration, peakGain) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;

        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.linearRampToValueAtTime(peakGain, now + start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + duration + 0.02);
      };

      const enabled = isSoundEnabled();
      const successGain = enabled ? 0.07 : 0.0001;
      const successGain2 = enabled ? 0.08 : 0.0001;
      playTone(660, 0, 0.12, successGain);
      playTone(880, 0.09, 0.16, successGain2);
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(scheduleTones).catch(() => {});
    } else {
      scheduleTones();
    }
  } catch (e) {
    // Ignorar: algunos navegadores bloquean el audio sin gesto del usuario
  }
}