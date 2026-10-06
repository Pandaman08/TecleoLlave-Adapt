import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck, ShieldAlert, Lock, Unlock, X, RefreshCw,
  Sparkles, CheckCircle2, AlertTriangle, UserX, ArrowRight, Clock
} from 'lucide-react';
import api, { getBaseUrl } from '../../services/api';
import { enqueueOfflineActivity, generateUUID } from '../../services/offlineDb';
import offlineSyncService from '../../services/offlineSyncService';

export default function VerificationChallengeModal({
  targetName = 'WhatsApp',
  targetIcon = '',
  targetPackage = '',
  targetPhrase = 'seguridad unt 2026',
  participant,
  onClose,
  onSuccess
}) {
  const [inputText, setInputText] = useState('');
  const [isImpostorMode, setIsImpostorMode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null); // { authorized: bool, score: number, notice: string }

  // Gestión de 5 intentos y penalización de 10 segundos
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutCountdown, setLockoutCountdown] = useState(10);

  // Refs para captura precisa de dinámicas de pulsación
  const keyDownMap = useRef({});
  const lastUpTime = useRef(0);
  const events = useRef([]);
  const inputRef = useRef(null);

  // Cuenta regresiva de bloqueo temporal de 10 segundos
  useEffect(() => {
    let timer;
    if (isLockedOut && lockoutCountdown > 0) {
      timer = setInterval(() => {
        setLockoutCountdown((prev) => {
          if (prev <= 1) {
            setIsLockedOut(false);
            setFailedAttempts(0);
            return 10;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [isLockedOut, lockoutCountdown]);

  // Enfocar automáticamente el input al montar o al terminar el bloqueo
  useEffect(() => {
    if (!isLockedOut && !result && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isLockedOut, result]);

  const handleKeyDown = (e) => {
    if (isLockedOut) return;
    const key = e.key;
    const now = performance.now();
    if (!keyDownMap.current[key]) {
      keyDownMap.current[key] = now;
    }
  };

  const handleKeyUp = (e) => {
    if (isLockedOut) return;
    const key = e.key;
    const now = performance.now();
    const pressTime = keyDownMap.current[key] || (now - 80);
    delete keyDownMap.current[key];

    const dwellTime = Math.max(15, now - pressTime);
    const flightTime = lastUpTime.current ? Math.max(10, pressTime - lastUpTime.current) : 0;
    lastUpTime.current = now;

    events.current.push({
      key: key,
      dwell_time: Math.round(dwellTime),
      flight_time: Math.round(flightTime),
      press_time: pressTime,
      release_time: now,
      pressure: 0.65
    });
  };

  const handleInputChange = (e) => {
    if (isLockedOut) return;
    const val = e.target.value;
    setInputText(val);

    if (val.trim().toLowerCase() === targetPhrase.trim().toLowerCase()) {
      submitVerification(events.current, val);
    }
  };

  const submitVerification = async (capturedEvents, typedText) => {
    setVerifying(true);
    let isAuth = false;
    let scoreNum = 0;
    let noticeMsg = '';
    const clientEventId = generateUUID();
    const capturedAt = new Date().toISOString();

    try {
      const res = await api.post('/mobile/study/evaluate-auth', {
        client_event_id: clientEventId,
        captured_at: capturedAt,
        participant_id: participant?.id || 1,
        phrase_typed: typedText,
        raw_events: capturedEvents,
        target_app: targetName,
        is_impostor_mode: isImpostorMode,
        ground_truth: isImpostorMode ? 'IMPOSTOR' : 'LEGITIMATE',
        device_posture: 'ESTATICO'
      });

      isAuth = Boolean(res.data?.authorized);
      scoreNum = Math.round((res.data?.score || 0.88) * 100);
      noticeMsg = res.data?.message || (isAuth ? 'Identidad confirmada por dinámica de tecleo' : 'Ritmo de escritura diferente al perfil del dueño');
    } catch (err) {
      // Regla estricta: NO declarar autenticación biométrica exitosa si el servidor no evaluó la muestra
      isAuth = false;
      scoreNum = 0;
      noticeMsg = 'Servidor no disponible. La verificación biométrica con modelo remoto requiere conexión activa. El intento fue registrado localmente en el teléfono.';

      // Persistir la telemetría del intento en la cola segura IndexedDB con sus tiempos originales
      try {
        await enqueueOfflineActivity({
          client_event_id: clientEventId,
          server_origin: getBaseUrl(),
          participant_id: participant?.id || 1,
          activity_type: 'AUTH_ATTEMPT_TELEMETRY',
          payload: {
            participant_id: participant?.id || 1,
            phrase_typed: typedText,
            raw_events: capturedEvents,
            target_app: targetName,
            is_impostor_mode: isImpostorMode,
            ground_truth: isImpostorMode ? 'IMPOSTOR' : 'LEGITIMATE',
            device_posture: 'ESTATICO'
          },
          captured_at: capturedAt
        });
        offlineSyncService.updateStats();
      } catch (dbErr) {
        console.error('Error guardando intento en cola offline:', dbErr);
      }
    } finally {
      setVerifying(false);
    }

    if (isAuth) {
      // ÉXITO: Desbloqueo y cierre del reto
      setFailedAttempts(0);
      setResult({
        authorized: true,
        score: scoreNum,
        notice: noticeMsg
      });
      // Notificar callback de éxito de inmediato tras 400ms para efecto visual
      setTimeout(() => {
        onSuccess?.(targetPackage);
        onClose();
      }, 500);
    } else {
      // FALLO: Incrementar contador de intentos
      const nextFailures = failedAttempts + 1;
      setFailedAttempts(nextFailures);

      if (nextFailures >= 5) {
        // Bloqueo estricto por 10 segundos
        setIsLockedOut(true);
        setLockoutCountdown(10);
        setInputText('');
        events.current = [];
        keyDownMap.current = {};
        lastUpTime.current = 0;
      } else {
        setResult({
          authorized: false,
          score: scoreNum,
          notice: `Intento ${nextFailures} de 5 fallido. Te quedan ${5 - nextFailures} intentos.`
        });
      }
    }
  };

  const handleReset = () => {
    setInputText('');
    events.current = [];
    keyDownMap.current = {};
    lastUpTime.current = 0;
    setResult(null);
  };

  const hasNativeIcon = Boolean(targetIcon && targetIcon.startsWith('data:image'));

  return (
    <div className="tl-modal-overlay" style={{ zIndex: 120 }}>
      <div className="tl-modal-card" style={{ maxWidth: '360px' }}>
        {/* Cabecera de la aplicación a proteger */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--tl-bg-surface-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              {hasNativeIcon ? (
                <img src={targetIcon} alt={targetName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <Lock size={16} color="var(--tl-accent)" />
              )}
            </div>
            <div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--tl-text-primary)' }}>
                {targetName}
              </div>
              <div style={{ fontSize: '0.65rem', color: 'var(--tl-text-muted)' }}>
                Bloqueo Biométrico TECLEOLLAVE
              </div>
            </div>
          </div>

          <button type="button" onClick={onClose} className="tl-icon-btn" style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {/* ============================================================== */}
        {/* BLOQUEO POR 10 SEGUNDOS TRAS 5 INTENTOS FALLIDOS */}
        {/* ============================================================== */}
        {isLockedOut ? (
          <div style={{ textAlign: 'center', padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: 'var(--tl-danger-light)',
              color: 'var(--tl-danger)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto'
            }}>
              <Clock size={28} />
            </div>

            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--tl-danger)' }}>
              Acceso Bloqueado Temporalmente
            </h3>

            <p style={{ fontSize: '0.75rem', color: 'var(--tl-text-secondary)', lineHeight: '1.45', margin: 0 }}>
              Has superado los <strong>5 intentos permitidos</strong>. Por seguridad de la aplicación, el teclado ha sido bloqueado durante:
            </p>

            <div style={{
              fontSize: '2.5rem',
              fontWeight: 800,
              color: 'var(--tl-danger)',
              fontFamily: 'monospace',
              letterSpacing: '-0.02em'
            }}>
              {lockoutCountdown}s
            </div>

            <span style={{ fontSize: '0.68rem', color: 'var(--tl-text-muted)' }}>
              Espera a que expire el tiempo para volver a intentarlo con tu ritmo normal.
            </span>
          </div>
        ) : (
          /* ============================================================== */
          /* FORMULARIO DE DESBLOQUEO / VERIFICACIÓN */
          /* ============================================================== */
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <div style={{ textAlign: 'center', padding: '0.2rem 0' }}>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--tl-text-primary)' }}>
                  ¿Eres tú?
                </h3>
                <p style={{ fontSize: '0.74rem', color: 'var(--tl-text-secondary)', margin: 0, lineHeight: '1.4' }}>
                  Escribe tu frase llave con tu ritmo habitual para desbloquear el acceso:
                </p>
              </div>

              {/* Frase clave */}
              <div style={{
                padding: '0.65rem',
                borderRadius: '10px',
                background: 'var(--tl-bg-surface-elevated)',
                border: '1px dashed var(--tl-accent)',
                textAlign: 'center',
                fontFamily: 'monospace',
                fontSize: '0.92rem',
                fontWeight: 700,
                color: 'var(--tl-text-primary)',
                letterSpacing: '0.04em'
              }}>
                {targetPhrase}
              </div>

              {/* Alerta de Intentos Fallidos */}
              {failedAttempts > 0 && !result?.authorized && (
                <div style={{
                  padding: '0.55rem 0.75rem',
                  borderRadius: '8px',
                  background: 'var(--tl-danger-light)',
                  border: '1px solid rgba(239, 68, 68, 0.3)',
                  color: 'var(--tl-danger)',
                  fontSize: '0.72rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}>
                  <AlertTriangle size={15} style={{ flexShrink: 0 }} />
                  <span>Intento {failedAttempts} de 5 fallido. Te quedan {5 - failedAttempts} intentos antes del bloqueo.</span>
                </div>
              )}

              {/* Input nativo */}
              <div>
                <input
                  ref={inputRef}
                  type="text"
                  disabled={verifying || isLockedOut}
                  className="tl-native-keystroke-input"
                  placeholder="Escribe aquí con tu teclado..."
                  value={inputText}
                  onChange={handleInputChange}
                  onKeyDown={handleKeyDown}
                  onKeyUp={handleKeyUp}
                  autoComplete="off"
                  autoCorrect="off"
                  spellCheck="false"
                  autoCapitalize="none"
                />
                <span style={{ fontSize: '0.65rem', color: 'var(--tl-text-muted)', display: 'block', textAlign: 'center', marginTop: '4px' }}>
                  {verifying ? 'Analizando vector de ritmo biométrico...' : 'Se evalúa automáticamente al completar la frase'}
                </span>
              </div>

              {/* Selector de Prueba: Dueño vs Impostor */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0.5rem 0.75rem',
                borderRadius: '10px',
                background: isImpostorMode ? 'rgba(239, 68, 68, 0.1)' : 'var(--tl-bg-input)',
                border: `1px solid ${isImpostorMode ? 'rgba(239, 68, 68, 0.3)' : 'var(--tl-border)'}`
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <UserX size={15} color={isImpostorMode ? 'var(--tl-danger)' : 'var(--tl-text-muted)'} />
                  <span style={{ fontSize: '0.72rem', color: isImpostorMode ? 'var(--tl-danger)' : 'var(--tl-text-secondary)', fontWeight: 600 }}>
                    Prueba de Intruso (Impostor)
                  </span>
                </div>
                <label className="tl-switch" style={{ width: '38px', height: '20px' }}>
                  <input
                    type="checkbox"
                    checked={isImpostorMode}
                    onChange={(e) => setIsImpostorMode(e.target.checked)}
                  />
                  <span className="tl-slider" />
                </label>
              </div>

              {/* Botón Reintentar si hubo error previo */}
              {result && !result.authorized && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="tl-btn-outline"
                  style={{ padding: '0.65rem', fontSize: '0.78rem' }}
                >
                  <RefreshCw size={14} />
                  <span>Limpiar y Volver a Intentar</span>
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
