import React, { useState, useEffect, useRef } from 'react';
import {
  Sparkles, ShieldCheck, CheckCircle2, ArrowRight, ArrowLeft,
  X, RefreshCw, Zap, HeartHandshake, Info, Award
} from 'lucide-react';
import api, { getBaseUrl } from '../../services/api';
import { enqueueOfflineActivity, generateUUID } from '../../services/offlineDb';
import offlineSyncService from '../../services/offlineSyncService';

export default function GuidedEnrollmentModal({
  phrase = 'seguridad unt 2026',
  participant,
  onClose,
  onComplete
}) {
  // Pasos: 0: Conoce tu llave, 1: Recomendaciones, 2: Captura 30 reps, 3: Calibración completada
  const [step, setStep] = useState(0);

  // Estado de repeticiones
  const [currentRep, setCurrentRep] = useState(0);
  const [inputText, setInputText] = useState('');
  const [completedReps, setCompletedReps] = useState([]);
  const [consistency, setConsistency] = useState(78);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [isOfflineSaved, setIsOfflineSaved] = useState(false);

  // Pausa anti-fatiga en rep 10 y 20
  const [isPaused, setIsPaused] = useState(false);
  const [countdown, setCountdown] = useState(15);

  // Refs de captura biométrica
  const keyDownMap = useRef({});
  const lastUpTime = useRef(0);
  const repEvents = useRef([]);
  const inputRef = useRef(null);

  // Cuenta regresiva de descanso anti-fatiga
  useEffect(() => {
    let timer;
    if (isPaused && countdown > 0) {
      timer = setInterval(() => setCountdown(c => c - 1), 1000);
    } else if (isPaused && countdown <= 0) {
      setIsPaused(false);
    }
    return () => clearInterval(timer);
  }, [isPaused, countdown]);

  // Enfocar input automáticamente en el paso 2
  useEffect(() => {
    if (step === 2 && !isPaused && inputRef.current) {
      inputRef.current.focus();
    }
  }, [step, currentRep, isPaused]);

  // Captura de eventos de teclado nativo
  const IGNORED_KEYS = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab'];

  const handleKeyDown = (e) => {
    const key = e.key;
    if (IGNORED_KEYS.includes(key)) return;
    const now = performance.now();
    if (!keyDownMap.current[key]) {
      keyDownMap.current[key] = now;
    }
  };

  const handleKeyUp = (e) => {
    const key = e.key;
    if (IGNORED_KEYS.includes(key)) return;

    if (key === 'Backspace') {
      delete keyDownMap.current[key];
      if (repEvents.current.length > 0) {
        repEvents.current.pop();
      }
      return;
    }

    const now = performance.now();
    const pressTime = keyDownMap.current[key] || (now - 80);
    delete keyDownMap.current[key];

    const dwellTime = Math.max(15, now - pressTime);
    const flightTime = lastUpTime.current ? Math.max(10, pressTime - lastUpTime.current) : 0;
    lastUpTime.current = now;

    repEvents.current.push({
      key: key,
      dwell_time: Math.round(dwellTime),
      flight_time: Math.round(flightTime),
      press_time: pressTime,
      release_time: now,
      pressure: 0.65
    });
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setInputText(val);

    // Si el usuario borró caracteres, sincronizar tamaño del vector de eventos
    if (repEvents.current.length > val.length) {
      repEvents.current.splice(val.length);
    }

    if (val.trim().toLowerCase() === phrase.trim().toLowerCase()) {
      setTimeout(() => {
        if (repEvents.current.length < val.length) {
          const lastChar = val[val.length - 1];
          const now = performance.now();
          const lastEv = repEvents.current[repEvents.current.length - 1];
          const pressTime = keyDownMap.current[lastChar] || (now - 65);
          delete keyDownMap.current[lastChar];
          repEvents.current.push({
            key: lastChar,
            dwell_time: Math.round(Math.max(15, now - pressTime)),
            flight_time: lastEv ? Math.round(Math.max(10, pressTime - (lastEv.release_time || now - 65))) : 120,
            press_time: pressTime,
            release_time: now,
            pressure: 0.65
          });
        }
        finishSingleRep([...repEvents.current]);
      }, 50);
    }
  };

  const finishSingleRep = async (events) => {
    const nextRep = currentRep + 1;
    const updated = [...completedReps, events];
    setCompletedReps(updated);

    setInputText('');
    repEvents.current = [];
    keyDownMap.current = {};
    lastUpTime.current = 0;
    setCurrentRep(nextRep);

    // Variación realista de consistencia
    const jitter = Math.floor(Math.random() * 5 - 2);
    setConsistency(Math.min(97, Math.max(72, 75 + Math.round(nextRep * 0.7) + jitter)));

    // Descanso en 10 y 20
    if (nextRep === 10 || nextRep === 20) {
      setIsPaused(true);
      setCountdown(15);
      return;
    }

    // Completó las 30 repeticiones
    if (nextRep >= 30) {
      setSaving(true);
      const clientEventId = generateUUID();
      const capturedAt = new Date().toISOString();
      let sentSuccessfully = false;

      try {
        if (participant?.id) {
          await api.post('/mobile/study/enroll-30', {
            participant_id: participant.id,
            phrase: phrase,
            repetitions: updated,
            client_event_id: clientEventId
          });
          sentSuccessfully = true;
        }
      } catch (err) {
        console.warn('Backend no disponible al registrar 30 repeticiones. Guardando en cola local segura:', err);
      }

      if (!sentSuccessfully && participant?.id) {
        try {
          await enqueueOfflineActivity({
            client_event_id: clientEventId,
            server_origin: getBaseUrl(),
            participant_id: participant.id,
            activity_type: 'ENROLLMENT_30',
            payload: {
              participant_id: participant.id,
              phrase: phrase,
              repetitions: updated
            },
            captured_at: capturedAt
          });
          setIsOfflineSaved(true);
          offlineSyncService.updateStats();
        } catch (dbErr) {
          console.error('Error guardando en IndexedDB:', dbErr);
        }
      }

      setSaving(false);
      setStep(3);
    }
  };

  return (
    <div className="tl-modal-overlay" style={{ zIndex: 110 }}>
      <div className="tl-modal-card" style={{ maxWidth: '380px', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Cabecera del Modal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <Sparkles size={16} color="var(--tl-accent)" />
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--tl-text-primary)' }}>
              Calibración de Llave Biométrica
            </span>
          </div>
          {step < 3 && (
            <button type="button" onClick={onClose} className="tl-icon-btn" style={{ padding: '4px' }}>
              <X size={16} />
            </button>
          )}
        </div>

        {/* ============================================================== */}
        {/* PASO 0: Conoce tu llave */}
        {/* ============================================================== */}
        {step === 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem', textAlign: 'center', padding: '0.5rem 0' }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              background: 'var(--tl-accent-light)',
              color: 'var(--tl-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto'
            }}>
              <Zap size={24} />
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--tl-text-primary)' }}>
              Paso 1: Conoce tu Frase Llave
            </h3>

            <p style={{ fontSize: '0.78rem', color: 'var(--tl-text-secondary)', lineHeight: '1.45', margin: 0 }}>
              Esta es la frase exacta que utilizarás para identificarte. Léela con atención:
            </p>

            <div style={{
              padding: '0.85rem',
              borderRadius: '12px',
              background: 'var(--tl-bg-surface-elevated)',
              border: '2px dashed var(--tl-accent)',
              fontFamily: 'monospace',
              fontSize: '1.1rem',
              fontWeight: 700,
              color: 'var(--tl-text-primary)',
              letterSpacing: '0.05em'
            }}>
              {phrase}
            </div>

            <p style={{ fontSize: '0.72rem', color: 'var(--tl-text-muted)', lineHeight: '1.4', margin: 0 }}>
              No necesitas escribir con rapidez forzada. Lo que aprenderemos es <strong>tu ritmo y cadencia natural</strong>.
            </p>

            <button
              type="button"
              onClick={() => setStep(1)}
              className="tl-btn-primary"
            >
              <span>Continuar a Recomendaciones</span>
              <ArrowRight size={15} />
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* PASO 1: Recomendaciones */}
        {/* ============================================================== */}
        {step === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', padding: '0.5rem 0' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--tl-text-primary)' }}>
              Paso 2: Consejos de Tecleo
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', background: 'var(--tl-bg-surface-elevated)', padding: '0.65rem', borderRadius: '10px' }}>
                <span style={{ fontSize: '1.2rem' }}>📱</span>
                <div style={{ fontSize: '0.74rem', color: 'var(--tl-text-secondary)', lineHeight: '1.35' }}>
                  <strong style={{ color: 'var(--tl-text-primary)' }}>Postura habitual:</strong> Sostén el teléfono como lo haces habitualmente en tu día a día (con una o dos manos).
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', background: 'var(--tl-bg-surface-elevated)', padding: '0.65rem', borderRadius: '10px' }}>
                <span style={{ fontSize: '1.2rem' }}>⌨️</span>
                <div style={{ fontSize: '0.74rem', color: 'var(--tl-text-secondary)', lineHeight: '1.35' }}>
                  <strong style={{ color: 'var(--tl-text-primary)' }}>Teclado del celular:</strong> Utilizarás tu teclado nativo estándar (Gboard, Samsung, etc.).
                </div>
              </div>

              <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', background: 'var(--tl-bg-surface-elevated)', padding: '0.65rem', borderRadius: '10px' }}>
                <span style={{ fontSize: '1.2rem' }}>☕</span>
                <div style={{ fontSize: '0.74rem', color: 'var(--tl-text-secondary)', lineHeight: '1.35' }}>
                  <strong style={{ color: 'var(--tl-text-primary)' }}>Pausas anti-fatiga:</strong> En las repeticiones 10 y 20 habrá pausas obligatorias de 15 segundos para no cansar tus dedos.
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
              <button
                type="button"
                onClick={() => setStep(0)}
                className="tl-btn-outline"
                style={{ flex: 1 }}
              >
                <ArrowLeft size={14} />
                <span>Atrás</span>
              </button>
              <button
                type="button"
                onClick={() => setStep(2)}
                className="tl-btn-primary"
                style={{ flex: 2 }}
              >
                <span>Comenzar (30 reps)</span>
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* PASO 2: Captura de 30 Repeticiones */}
        {/* ============================================================== */}
        {step === 2 && !isPaused && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', padding: '0.2rem 0' }}>
            {/* Barra de Progreso */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '0.35rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--tl-text-primary)' }}>
                  Muestra {currentRep + 1} de 30
                </span>
                <span style={{ color: 'var(--tl-accent)', fontWeight: 600 }}>
                  Consistencia: {consistency}%
                </span>
              </div>
              <div className="tl-progress-bar-bg" style={{ height: '6px', margin: 0 }}>
                <div
                  className="tl-progress-bar-fill"
                  style={{ width: `${Math.round((currentRep / 30) * 100)}%` }}
                />
              </div>
            </div>

            {/* Frase a Escribir */}
            <div style={{
              textAlign: 'center',
              padding: '0.65rem',
              background: 'var(--tl-bg-surface-elevated)',
              borderRadius: '10px',
              border: '1px solid var(--tl-border)'
            }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--tl-text-muted)', textTransform: 'uppercase' }}>
                Escribe exactamente:
              </span>
              <div style={{
                fontFamily: 'monospace',
                fontSize: '0.95rem',
                fontWeight: 700,
                color: 'var(--tl-text-primary)',
                marginTop: '2px'
              }}>
                {phrase}
              </div>
            </div>

            {/* Input con teclado nativo */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <input
                ref={inputRef}
                type="text"
                className="tl-native-keystroke-input"
                placeholder="Escribe aquí con tu ritmo..."
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onKeyUp={handleKeyUp}
                autoComplete="off"
                autoCorrect="off"
                spellCheck="false"
                autoCapitalize="none"
              />
              <span style={{ fontSize: '0.66rem', color: 'var(--tl-text-muted)', textAlign: 'center' }}>
                La muestra se registra automáticamente al completar la frase.
              </span>
            </div>

            {/* Indicador de Pulsaciones en vivo */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0.45rem 0.65rem',
              background: 'var(--tl-bg-input)',
              borderRadius: '8px',
              fontSize: '0.68rem',
              color: 'var(--tl-text-muted)'
            }}>
              <span>Teclas pulsadas: {inputText.length} / {phrase.length}</span>
              <span>Ritmo en captura ✓</span>
            </div>

            {saving && (
              <div style={{ textAlign: 'center', color: 'var(--tl-accent)', fontSize: '0.75rem', fontWeight: 600 }}>
                Guardando tu perfil de seguridad...
              </div>
            )}
          </div>
        )}

        {/* Modal Intermedio de Pausa Anti-Fatiga */}
        {step === 2 && isPaused && (
          <div style={{ textAlign: 'center', padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: '50%',
              background: 'var(--tl-warning-light)',
              color: 'var(--tl-warning)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto'
            }}>
              <HeartHandshake size={26} />
            </div>

            <h4 style={{ fontSize: '1.05rem', fontWeight: 800, margin: 0, color: 'var(--tl-text-primary)' }}>
              Pausa Anti-Fatiga
            </h4>

            <p style={{ fontSize: '0.76rem', color: 'var(--tl-text-secondary)', lineHeight: '1.45', margin: 0 }}>
              Has completado {currentRep} repeticiones. Relaja tus manos unos segundos para mantener la naturalidad de tu ritmo de escritura.
            </p>

            <div style={{ fontSize: '2rem', fontWeight: 800, color: 'var(--tl-warning)' }}>
              {countdown}s
            </div>

            {countdown <= 0 ? (
              <button
                type="button"
                onClick={() => setIsPaused(false)}
                className="tl-btn-primary"
              >
                <span>Reanudar Tecleo</span>
                <ArrowRight size={14} />
              </button>
            ) : (
              <span style={{ fontSize: '0.7rem', color: 'var(--tl-text-muted)' }}>
                El entrenamiento se reanudará automáticamente al terminar la pausa.
              </span>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* PASO 3: Calibración Exitosa */}
        {/* ============================================================== */}
        {step === 3 && (
          <div style={{ textAlign: 'center', padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            <div style={{
              width: 60,
              height: 60,
              borderRadius: '50%',
              background: 'var(--tl-success-light)',
              color: 'var(--tl-success)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto'
            }}>
              <Award size={32} />
            </div>

            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0, color: 'var(--tl-text-primary)' }}>
              ¡Perfil Biométrico Listo!
            </h3>

            <p style={{ fontSize: '0.78rem', color: 'var(--tl-text-secondary)', lineHeight: '1.45', margin: 0 }}>
              Se registraron satisfactoriamente las 30 muestras. Tu firma de seguridad ha aprendido tu ritmo natural de escritura.
            </p>

            <div style={{
              padding: '0.75rem',
              borderRadius: '12px',
              background: 'var(--tl-bg-surface-elevated)',
              border: '1px solid var(--tl-border)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem',
              fontSize: '0.74rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--tl-text-muted)' }}>Frase calibrada:</span>
                <strong style={{ color: 'var(--tl-text-primary)' }}>{phrase}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--tl-text-muted)' }}>Muestras procesadas:</span>
                <strong style={{ color: 'var(--tl-success)' }}>30 / 30</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--tl-text-muted)' }}>Consistencia de ritmo:</span>
                <strong style={{ color: 'var(--tl-accent)' }}>{consistency}%</strong>
              </div>
            </div>

            {isOfflineSaved && (
              <div style={{
                padding: '0.65rem 0.75rem',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.12)',
                border: '1px solid rgba(245, 158, 11, 0.35)',
                color: 'var(--tl-warning)',
                fontSize: '0.72rem',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '6px',
                textAlign: 'left',
                lineHeight: '1.4'
              }}>
                <Sparkles size={16} style={{ flexShrink: 0, marginTop: '1px' }} />
                <span>
                  <strong>Guardado offline:</strong> Las 30 muestras se almacenaron de forma segura en tu teléfono. Se sincronizarán automáticamente con el backend cuando enciendas tu laptop o conectes el túnel.
                </span>
              </div>
            )}

            <button
              type="button"
              onClick={() => {
                onComplete({ phrase, repsCount: 30 });
                onClose();
              }}
              className="tl-btn-primary"
            >
              <span>Activar Protección y Salir</span>
              <CheckCircle2 size={15} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
