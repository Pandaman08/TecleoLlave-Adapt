import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck, ShieldAlert, Lock, X, RefreshCw,
  CheckCircle2, AlertTriangle, ArrowRight, Clock
} from 'lucide-react';
import api, { getBaseUrl } from '../../services/api';
import { enqueueOfflineActivity, generateUUID } from '../../services/offlineDb';
import offlineSyncService from '../../services/offlineSyncService';

export default function VerificationChallengeModal({
  targetName = 'WhatsApp',
  targetIcon = '',
  targetPackage = '',
  targetPhrase = 'seguridad unt 2026',
  isNativeIntercept = false,
  participant,
  onClose,
  onSuccess
}) {
  const [inputText, setInputText] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState(null); // { authorized: bool, score: number, notice: string, decision: string }

  // Gestión de 5 intentos y penalización de 10 segundos
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutCountdown, setLockoutCountdown] = useState(10);

  // Refs para captura precisa de dinámicas de pulsación
  const keyDownMap = useRef({});
  const lastUpTime = useRef(0);
  const events = useRef([]);
  const inputRef = useRef(null);
  const successTimerRef = useRef(null);

  // Limpieza de temporizador de éxito al desmontar
  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
    };
  }, []);

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

  const IGNORED_KEYS = ['Shift', 'Control', 'Alt', 'Meta', 'CapsLock', 'Tab', 'Escape'];

  const handleKeyDown = (e) => {
    if (isLockedOut) return;
    const key = e.key;
    if (IGNORED_KEYS.includes(key)) return;
    const now = performance.now();
    if (!keyDownMap.current[key]) {
      keyDownMap.current[key] = now;
    }
  };

  const handleKeyUp = (e) => {
    if (isLockedOut) return;
    const key = e.key;
    if (IGNORED_KEYS.includes(key)) return;

    if (key === 'Backspace') {
      delete keyDownMap.current[key];
      if (events.current.length > 0) {
        events.current.pop();
      }
      return;
    }

    const now = performance.now();
    const pressTime = keyDownMap.current[key] || (now - 80);
    delete keyDownMap.current[key];

    const dwellTime = Math.max(15, now - pressTime);
    const flightTime = lastUpTime.current ? Math.max(10, pressTime - lastUpTime.current) : 120;
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

    // Si el usuario borró caracteres, sincronizar tamaño del vector de eventos
    if (events.current.length > val.length) {
      events.current.splice(val.length);
    }

    if (val.trim().toLowerCase() === targetPhrase.trim().toLowerCase()) {
      // Retardo de 60ms para permitir que el evento keyup del último carácter se ejecute limpiamente
      setTimeout(() => {
        if (events.current.length < val.length) {
          const lastChar = val[val.length - 1];
          const now = performance.now();
          const lastEv = events.current[events.current.length - 1];
          const pressTime = keyDownMap.current[lastChar] || (now - 65);
          delete keyDownMap.current[lastChar];
          events.current.push({
            key: lastChar,
            dwell_time: Math.round(Math.max(15, now - pressTime)),
            flight_time: lastEv ? Math.round(Math.max(10, pressTime - (lastEv.release_time || now - 65))) : 120,
            press_time: pressTime,
            release_time: now,
            pressure: 0.65
          });
        }
        submitVerification([...events.current], val);
      }, 60);
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
        is_impostor_mode: false,
        ground_truth: 'LEGITIMATE',
        device_posture: 'ESTATICO'
      });

      isAuth = Boolean(res.data?.authorized ?? res.data?.is_accepted ?? (res.data?.decision === 'DESBLOQUEADO'));
      scoreNum = Math.round((res.data?.similarity_score ?? res.data?.score ?? 0.88) * 100);
      noticeMsg = res.data?.message || (isAuth ? 'Identidad confirmada por dinámica de tecleo' : 'Ritmo de escritura diferente al perfil del dueño');
    } catch (err) {
      isAuth = false;
      scoreNum = 0;
      noticeMsg = 'Servidor no disponible. Conecta a la red para verificar con tu perfil o intenta nuevamente.';

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
            is_impostor_mode: false,
            ground_truth: 'LEGITIMATE',
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
      setFailedAttempts(0);
      setResult({
        authorized: true,
        score: scoreNum,
        notice: noticeMsg,
        decision: 'DESBLOQUEADO'
      });

      // Transición suave de 1.6s para ver confirmación de identidad
      successTimerRef.current = setTimeout(() => {
        onSuccess?.(targetPackage, isNativeIntercept);
      }, 1600);
    } else {
      const nextFailures = failedAttempts + 1;
      setFailedAttempts(nextFailures);

      setInputText('');
      events.current = [];
      keyDownMap.current = {};
      lastUpTime.current = 0;

      if (nextFailures >= 5) {
        setIsLockedOut(true);
        setLockoutCountdown(10);
      } else {
        setResult({
          authorized: false,
          score: scoreNum,
          notice: noticeMsg || 'Ritmo de tecleo diferente al perfil del dueño.',
          decision: 'ACCESO_DENEGADO'
        });
      }
    }
  };

  const [showAlternativeModal, setShowAlternativeModal] = useState(false);

  const handleUseDeviceCredential = async () => {
    try {
      if (window.Capacitor?.isNativePlatform?.()) {
        const { AndroidSecurityBridge } = window.Capacitor.Plugins;
        if (AndroidSecurityBridge?.promptDeviceCredential) {
          const res = await AndroidSecurityBridge.promptDeviceCredential();
          if (res?.success) {
            handleManualContinue();
            return;
          }
        }
      }
      setShowAlternativeModal(true);
    } catch (err) {
      setShowAlternativeModal(true);
    }
  };

  const handleManualContinue = () => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    onSuccess?.(targetPackage, isNativeIntercept);
  };

  const handleReset = () => {
    setInputText('');
    events.current = [];
    keyDownMap.current = {};
    lastUpTime.current = 0;
    setResult(null);
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus();
    }, 50);
  };

  const hasNativeIcon = Boolean(targetIcon && targetIcon.startsWith('data:image'));

  // ---------------------------------------------------------------------------
  // CONTENIDO CENTRAL COMÚN (FORMULARIO, ÉXITO O BLOQUEO)
  // ---------------------------------------------------------------------------
  const renderBodyContent = () => {
    if (isLockedOut) {
      return (
        <div style={{ textAlign: 'center', padding: '1.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.85rem', alignItems: 'center' }}>
          <div style={{
            width: 58,
            height: 58,
            borderRadius: '50%',
            background: 'var(--tl-danger-light)',
            color: 'var(--tl-danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Clock size={30} />
          </div>

          <div>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--tl-danger)' }}>
              Acceso Bloqueado Temporalmente
            </h3>
            <p style={{ fontSize: '0.78rem', color: 'var(--tl-text-secondary)', lineHeight: '1.45', margin: 0, maxWidth: '280px' }}>
              Has superado los <strong>5 intentos permitidos</strong>. El teclado se encuentra suspendido por seguridad:
            </p>
          </div>

          <div style={{
            fontSize: '2.4rem',
            fontWeight: 800,
            color: 'var(--tl-danger)',
            fontFamily: 'monospace',
            letterSpacing: '-0.02em'
          }}>
            {lockoutCountdown}s
          </div>

          <button
            type="button"
            onClick={handleUseDeviceCredential}
            className="tl-btn-outline"
            style={{ fontSize: '0.74rem', padding: '0.5rem 0.9rem' }}
          >
            <span>Usar método alternativo</span>
          </button>
        </div>
      );
    }

    if (result?.authorized) {
      return (
        <div style={{ textAlign: 'center', padding: '1rem 0', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', width: '100%' }}>
          <div style={{
            width: 68,
            height: 68,
            borderRadius: '50%',
            background: 'var(--tl-success-light)',
            border: '2px solid var(--tl-success)',
            color: 'var(--tl-success)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 25px rgba(16, 185, 129, 0.25)'
          }}>
            <CheckCircle2 size={38} />
          </div>

          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.3rem 0', color: 'var(--tl-success)' }}>
              Identidad Verificada
            </h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--tl-text-secondary)', margin: 0 }}>
              {targetPackage ? `Acceso permitido a ${targetName}` : 'Desbloqueo completado exitosamente'}
            </p>
          </div>

          <div style={{
            width: '100%',
            background: 'var(--tl-bg-surface-elevated)',
            borderRadius: '12px',
            padding: '0.75rem 0.9rem',
            border: '1px solid var(--tl-border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--tl-text-secondary)' }}>
              Patrón biométrico:
            </span>
            <span style={{ fontSize: '0.74rem', color: 'var(--tl-success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={14} /> Auténtico
            </span>
          </div>

          <button
            type="button"
            onClick={handleManualContinue}
            className="tl-btn-primary"
            style={{
              background: 'var(--tl-success)',
              borderColor: 'var(--tl-success)',
              boxShadow: 'none',
              padding: '0.75rem',
              width: '100%'
            }}
          >
            <span>Continuar</span>
            <ArrowRight size={16} />
          </button>
        </div>
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', width: '100%' }}>
        <div style={{ textAlign: 'center', padding: '0.1rem 0' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--tl-text-primary)' }}>
            Escribe tu Frase Llave
          </h3>
          <p style={{ fontSize: '0.76rem', color: 'var(--tl-text-secondary)', margin: 0, lineHeight: '1.4' }}>
            Tu forma de escribir valida tu acceso:
          </p>
        </div>

        {/* Frase clave con diseño limpio */}
        <div style={{
          padding: '0.75rem',
          borderRadius: '12px',
          background: 'var(--tl-bg-surface-elevated)',
          border: '1px dashed var(--tl-accent)',
          textAlign: 'center',
          fontFamily: 'monospace',
          fontSize: '0.98rem',
          fontWeight: 700,
          color: 'var(--tl-text-primary)',
          letterSpacing: '0.04em'
        }}>
          {targetPhrase}
        </div>

        {/* Alerta limpia si el intento falló */}
        {result && !result.authorized && (
          <div style={{
            padding: '0.8rem',
            borderRadius: '12px',
            background: 'var(--tl-danger-light)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: 'var(--tl-danger)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontWeight: 700, fontSize: '0.82rem' }}>
              <ShieldAlert size={16} color="var(--tl-danger)" style={{ flexShrink: 0 }} />
              <span>No pudimos verificar tu forma de escribir</span>
            </div>
            <div style={{ fontSize: '0.74rem', lineHeight: '1.4', color: 'var(--tl-text-secondary)' }}>
              Inténtalo nuevamente manteniendo tu ritmo y postura habituales.
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.7rem',
              color: 'var(--tl-text-muted)',
              marginTop: '4px',
              borderTop: '1px dashed var(--tl-border-subtle)',
              paddingTop: '4px'
            }}>
              <span>Intento {failedAttempts} de 5</span>
              <span>Protección activa</span>
            </div>
          </div>
        )}

        {/* Input de tecleo nativo */}
        <div>
          <input
            ref={inputRef}
            type="text"
            disabled={verifying || isLockedOut}
            className="tl-native-keystroke-input"
            placeholder="Escribe la frase con tu ritmo natural..."
            value={inputText}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            autoComplete="off"
            autoCorrect="off"
            spellCheck="false"
            autoCapitalize="none"
          />
          <span style={{ fontSize: '0.67rem', color: 'var(--tl-text-muted)', display: 'block', textAlign: 'center', marginTop: '6px' }}>
            {verifying ? (
              <span style={{ color: 'var(--tl-accent)', fontWeight: 600 }}>
                ⏳ Comprobando...
              </span>
            ) : (
              'Se comprueba automáticamente al completar la frase'
            )}
          </span>
        </div>

        {/* Acciones principales / alternativas */}
        {result && !result.authorized ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', marginTop: '0.2rem' }}>
            <button
              type="button"
              onClick={handleReset}
              className="tl-btn-primary"
              style={{ padding: '0.65rem', fontSize: '0.8rem' }}
            >
              <RefreshCw size={14} />
              <span>Intentar nuevamente</span>
            </button>
            <button
              type="button"
              onClick={handleUseDeviceCredential}
              className="tl-btn-outline"
              style={{ padding: '0.55rem', fontSize: '0.74rem' }}
            >
              <span>Usar método alternativo</span>
            </button>
          </div>
        ) : (
          <div style={{ textAlign: 'center', marginTop: '0.3rem' }}>
            <button
              type="button"
              onClick={handleUseDeviceCredential}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--tl-text-muted)',
                fontSize: '0.72rem',
                cursor: 'pointer',
                textDecoration: 'underline'
              }}
            >
              ¿Tienes problemas para desbloquear?
            </button>
          </div>
        )}
      </div>
    );
  };

  // ===========================================================================
  // VARIANTE A: INTERCEPCIÓN NATIVA FULLSCREEN (EJ. WHATSAPP ABIERTO)
  // ===========================================================================
  if (isNativeIntercept) {
    return (
      <div className="tl-applocker-overlay" style={{ zIndex: 120 }}>
        {/* Cabecera superior con botón de salida */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={16} color="var(--tl-accent)" />
            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--tl-text-muted)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Protección Activa
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="tl-icon-btn"
            style={{ padding: '6px' }}
            title="Cancelar y volver"
          >
            <X size={20} />
          </button>
        </div>

        {/* Centro de la pantalla con ícono y desafío */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          flex: 1,
          maxWidth: '360px',
          margin: '0 auto',
          width: '100%',
          gap: '1rem'
        }}>
          {/* Ícono de la aplicación interceptada */}
          <div style={{
            width: 58,
            height: 58,
            borderRadius: '16px',
            background: 'var(--tl-bg-surface-elevated)',
            border: '1px solid var(--tl-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)'
          }}>
            {hasNativeIcon ? (
              <img src={targetIcon} alt={targetName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <Lock size={26} color="var(--tl-accent)" />
            )}
          </div>

          <div style={{ textAlign: 'center', marginTop: '-0.3rem' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0, color: 'var(--tl-text-primary)' }}>
              {targetName}
            </h2>
            <span style={{ fontSize: '0.72rem', color: 'var(--tl-text-muted)' }}>
              Protegida con tu Frase Llave
            </span>
          </div>

          {/* Formulario / Resultado */}
          {renderBodyContent()}
        </div>

        {/* Pie de página con botón cancelar seguro */}
        <div style={{ textAlign: 'center', width: '100%', paddingTop: '0.5rem' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--tl-text-muted)',
              fontSize: '0.75rem',
              cursor: 'pointer',
              padding: '0.5rem 1rem'
            }}
          >
            Cancelar y volver al inicio
          </button>
        </div>

        {/* Modal de Método Alternativo en Intercepción */}
        {showAlternativeModal && (
          <div className="tl-modal-overlay" style={{ zIndex: 140 }}>
            <div className="tl-modal-card" style={{ maxWidth: '330px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lock size={16} color="var(--tl-accent)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--tl-text-primary)' }}>
                    Método Alternativo
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAlternativeModal(false)}
                  className="tl-icon-btn"
                  style={{ padding: '4px' }}
                >
                  <X size={16} />
                </button>
              </div>

              <p style={{ fontSize: '0.74rem', color: 'var(--tl-text-secondary)', margin: 0, lineHeight: '1.4' }}>
                Si tienes dificultades para replicar tu ritmo de tecleo, utiliza tu método de seguridad Android configurado en el teléfono.
              </p>

              <button
                type="button"
                onClick={async () => {
                  setShowAlternativeModal(false);
                  if (window.Capacitor?.isNativePlatform?.()) {
                    const { AndroidSecurityBridge } = window.Capacitor.Plugins;
                    if (AndroidSecurityBridge?.promptDeviceCredential) {
                      try {
                        const res = await AndroidSecurityBridge.promptDeviceCredential();
                        if (res?.success) {
                          handleManualContinue();
                        }
                      } catch (e) {
                        console.warn('Alternative auth rejected', e);
                      }
                    }
                  }
                }}
                className="tl-btn-primary"
                style={{ padding: '0.7rem' }}
              >
                <span>Huella / PIN de Android</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAlternativeModal(false)}
                className="tl-btn-outline"
                style={{ padding: '0.6rem', fontSize: '0.74rem' }}
              >
                <span>Volver a escribir frase</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ===========================================================================
  // VARIANTE B: MODAL FLOTANTE (PRUEBA RÁPIDA O DESBLOQUEO DE TECLEOLLAVE)
  // ===========================================================================
  return (
    <div className="tl-modal-overlay" style={{ zIndex: 120 }}>
      <div className="tl-modal-card" style={{ maxWidth: '360px' }}>
        {/* Cabecera del modal */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              background: 'var(--tl-bg-surface-elevated)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              {hasNativeIcon ? (
                <img src={targetIcon} alt={targetName} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
              ) : (
                <Lock size={17} color="var(--tl-accent)" />
              )}
            </div>
            <div>
              <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--tl-text-primary)' }}>
                {targetName}
              </div>
              <div style={{ fontSize: '0.67rem', color: 'var(--tl-text-muted)' }}>
                Desbloqueo Biométrico
              </div>
            </div>
          </div>

          <button type="button" onClick={onClose} className="tl-icon-btn" style={{ padding: '4px' }}>
            <X size={17} />
          </button>
        </div>

        {renderBodyContent()}

        {/* Modal de Método Alternativo Flotante */}
        {showAlternativeModal && (
          <div className="tl-modal-overlay" style={{ zIndex: 140 }}>
            <div className="tl-modal-card" style={{ maxWidth: '330px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Lock size={16} color="var(--tl-accent)" />
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--tl-text-primary)' }}>
                    Método Alternativo
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAlternativeModal(false)}
                  className="tl-icon-btn"
                  style={{ padding: '4px' }}
                >
                  <X size={16} />
                </button>
              </div>

              <p style={{ fontSize: '0.74rem', color: 'var(--tl-text-secondary)', margin: 0, lineHeight: '1.4' }}>
                Si tienes dificultades para replicar tu ritmo de tecleo, utiliza tu método de seguridad Android configurado en el teléfono.
              </p>

              <button
                type="button"
                onClick={async () => {
                  setShowAlternativeModal(false);
                  if (window.Capacitor?.isNativePlatform?.()) {
                    const { AndroidSecurityBridge } = window.Capacitor.Plugins;
                    if (AndroidSecurityBridge?.promptDeviceCredential) {
                      try {
                        const res = await AndroidSecurityBridge.promptDeviceCredential();
                        if (res?.success) {
                          handleManualContinue();
                        }
                      } catch (e) {
                        console.warn('Alternative auth rejected', e);
                      }
                    }
                  }
                }}
                className="tl-btn-primary"
                style={{ padding: '0.7rem' }}
              >
                <span>Huella / PIN de Android</span>
              </button>

              <button
                type="button"
                onClick={() => setShowAlternativeModal(false)}
                className="tl-btn-outline"
                style={{ padding: '0.6rem', fontSize: '0.74rem' }}
              >
                <span>Volver a escribir frase</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
