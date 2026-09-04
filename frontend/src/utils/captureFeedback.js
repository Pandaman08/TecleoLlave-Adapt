/**
 * Feedback sutil (sonido + vibración) al completar una captura de tecleo.
 * Refuerza la sensación de "esto se registró" sin ser intrusivo.
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

function getAudioCtx() {
  if (sharedCtx) return sharedCtx;
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  sharedCtx = new AudioCtx();
  return sharedCtx;
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
      // No es necesario esperar la promesa; lo importante es que la
      // llamada ocurra dentro del gesto de usuario.
      ctx.resume().catch(() => {});
    }
  } catch (e) {
    // Ignorar: el desbloqueo de audio es una mejora progresiva
  }
}

export function playCaptureCompleteFeedback() {
  try {
    // Vibración breve (móviles / navegadores compatibles)
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

        // Envolvente corta (ataque rápido, caída exponencial) para que
        // suene a "confirmación" y no a pitido molesto
        gain.gain.setValueAtTime(0.0001, now + start);
        gain.gain.linearRampToValueAtTime(peakGain, now + start + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + start);
        osc.stop(now + start + duration + 0.02);
      };

      // Dos notas ascendentes (tipo "chime" de confirmación)
      playTone(660, 0, 0.12, 0.07);
      playTone(880, 0.09, 0.16, 0.08);
    };

    if (ctx.state === 'suspended') {
      // Último intento de desbloqueo por si unlockAudioContext() no se
      // llamó antes (por ejemplo, en modos de captura sin teclado real).
      ctx.resume().then(scheduleTones).catch(() => {});
    } else {
      scheduleTones();
    }
  } catch (e) {
    // Ignorar: algunos navegadores bloquean el audio sin gesto del usuario
  }
}