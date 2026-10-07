import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, KeyRound, Smartphone, Mail,
  CheckCircle2, AlertTriangle, Lock, Unlock, Moon, Sun,
  LogOut, RefreshCw, Sparkles, ChevronRight, Edit3, X, Server
} from 'lucide-react';
import { App as CapApp } from '@capacitor/app';
import api, { getBaseUrl, setCustomBaseUrl } from '../../services/api';
import offlineSyncService from '../../services/offlineSyncService';
import {
  isNativeAndroid,
  getInstalledApps,
  checkPermissions,
  openUsageSettings,
  openOverlaySettings,
  openSecuritySettings,
  getDeviceSecurityStatus,
  syncAppLockerService,
  unlockPackageForSession,
  minimizeApp,
  getPendingChallenge,
  addAppChallengeListener
} from '../../services/nativeBridge';

import '../../components/mobile/mobile.css';
import MobileBottomNav from '../../components/mobile/MobileBottomNav';
import HomeTab from '../../components/mobile/HomeTab';
import MyKeyTab from '../../components/mobile/MyKeyTab';
import AppsTab from '../../components/mobile/AppsTab';
import SettingsTab from '../../components/mobile/SettingsTab';
import GuidedEnrollmentModal from '../../components/mobile/GuidedEnrollmentModal';
import VerificationChallengeModal from '../../components/mobile/VerificationChallengeModal';
import DeviceLockSetupModal from '../../components/mobile/DeviceLockSetupModal';
import ServerConfigModal from '../../components/mobile/ServerConfigModal';
import SyncStatusBar from '../../components/mobile/SyncStatusBar';

export default function MobileAppContainer() {
  // ---------------------------------------------------------------------------
  // 1. TEMA CLARO / OSCURO ADAPTATIVO
  // ---------------------------------------------------------------------------
  const [theme, setTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('tl_theme');
      if (saved) return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    }
    return 'dark';
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-color-scheme: light)');
    const handler = (e) => {
      if (!localStorage.getItem('tl_theme')) {
        setTheme(e.matches ? 'light' : 'dark');
      }
    };
    mq.addEventListener?.('change', handler);
    return () => mq.removeEventListener?.('change', handler);
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('tl_theme', next);
  };

  // ---------------------------------------------------------------------------
  // 2. SESIÓN DE USUARIO Y PARTICIPANTE
  // ---------------------------------------------------------------------------
  const [participantData, setParticipantData] = useState(() => {
    try {
      const saved = localStorage.getItem('tl_mobile_participant');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [authTab, setAuthTab] = useState('login'); // 'login' | 'register'
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [dominantHand, setDominantHand] = useState('diestro');
  const [ageRange, setAgeRange] = useState('18-25');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [authLoading, setAuthLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [deviceModel] = useState(() => {
    if (typeof navigator !== 'undefined') {
      const ua = navigator.userAgent;
      if (ua.includes('Android')) {
        const match = ua.match(/Android[^;]+; ([^)]+)\)/);
        if (match && match[1]) return match[1].split('Build')[0].trim();
      }
    }
    return 'Dispositivo Android';
  });

  // Guardar participante en localStorage
  useEffect(() => {
    if (participantData) {
      localStorage.setItem('tl_mobile_participant', JSON.stringify(participantData));
    } else {
      localStorage.removeItem('tl_mobile_participant');
    }
  }, [participantData]);

  // ---------------------------------------------------------------------------
  // 3. PESTAÑAS PRINCIPALES Y APLICACIONES INSTALADAS
  // ---------------------------------------------------------------------------
  const [activeTab, setActiveTab] = useState('inicio'); // 'inicio' | 'mykey' | 'apps' | 'settings'
  const [installedApps, setInstalledApps] = useState([]);
  const [protectedPackages, setProtectedPackages] = useState(() => {
    try {
      const saved = localStorage.getItem('tl_protected_packages');
      if (saved) return JSON.parse(saved);
    } catch {}
    // Predeterminadas protegidas
    return {
      'com.whatsapp': true,
      'com.bcp.innovacxion': true,
      'com.bcp.yapeapp': true
    };
  });

  // Guardar paquetes protegidos
  useEffect(() => {
    localStorage.setItem('tl_protected_packages', JSON.stringify(protectedPackages));
  }, [protectedPackages]);

  // Frase Llave del Usuario
  const [phrase, setPhrase] = useState(() => {
    return localStorage.getItem('tl_key_phrase') || participantData?.enrollment_phrase || 'seguridad unt 2026';
  });

  useEffect(() => {
    localStorage.setItem('tl_key_phrase', phrase);
  }, [phrase]);

  // Estado de Permisos de Android
  const [permissionsStatus, setPermissionsStatus] = useState({
    usageStats: true,
    overlay: true,
    deviceSecure: true
  });

  const refreshPermissions = useCallback(async () => {
    const status = await checkPermissions();
    setPermissionsStatus(status);
  }, []);

  // Carga inicial de apps y permisos
  useEffect(() => {
    refreshPermissions();
    getInstalledApps().then(apps => {
      if (apps && apps.length > 0) {
        setInstalledApps(apps);
      }
    });
  }, [refreshPermissions]);

  // Sincronizar servicio de supervisión en segundo plano de AppLocker
  useEffect(() => {
    const activePkgs = Object.keys(protectedPackages).filter(pkg => protectedPackages[pkg]);
    const enrolled = Boolean(participantData?.is_enrolled);
    syncAppLockerService({
      protectedPackages: activePkgs,
      isEnrolled: enrolled,
      phrase: phrase
    });
  }, [protectedPackages, participantData?.is_enrolled, phrase]);

  // ---------------------------------------------------------------------------
  // 4. CONTROL DE MODALES Y BLOQUEO MAESTRO DE TECLEOLLAVE
  // ---------------------------------------------------------------------------
  const [isAppMasterUnlocked, setIsAppMasterUnlocked] = useState(false);
  const isAppMasterUnlockedRef = useRef(isAppMasterUnlocked);
  isAppMasterUnlockedRef.current = isAppMasterUnlocked;

  const [showEnrollmentModal, setShowEnrollmentModal] = useState(false);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [challengeTarget, setChallengeTarget] = useState({ name: 'WhatsApp', icon: '', packageName: 'com.whatsapp', phrase: 'seguridad unt 2026' });
  const challengeTargetRef = useRef(challengeTarget);
  challengeTargetRef.current = challengeTarget;

  const [showDeviceLockModal, setShowDeviceLockModal] = useState(false);
  const [showChangePhraseModal, setShowChangePhraseModal] = useState(false);
  const [newPhraseInput, setNewPhraseInput] = useState('');
  const [previousPhrase, setPreviousPhrase] = useState('');
  const [showServerConfigModal, setShowServerConfigModal] = useState(false);
  const [currentServerUrl, setCurrentServerUrl] = useState(() => getBaseUrl());

  const handleSaveServerUrl = (newUrl) => {
    setCustomBaseUrl(newUrl);
    setCurrentServerUrl(getBaseUrl());
    setShowServerConfigModal(false);
    offlineSyncService.checkServerHealth().then((online) => {
      if (online) offlineSyncService.syncQueue();
    });
  };

  // Escuchar cuando el servicio detecta una app protegida abierta en el celular
  // o cuando TecleoLlave arranca y requiere desbloqueo biométrico inicial
  useEffect(() => {
    let isMounted = true;

    const triggerForPackage = (pkgName, isNative = false) => {
      if (!isMounted) return;
      if (pkgName) {
        const found = installedApps.find(a => a.packageName === pkgName);
        setChallengeTarget({
          name: found?.name || pkgName,
          icon: found?.icon || '',
          packageName: pkgName,
          phrase: phrase,
          isNativeIntercept: isNative
        });
      } else {
        setChallengeTarget({
          name: 'TECLEOLLAVE',
          icon: '',
          packageName: '',
          phrase: phrase,
          isNativeIntercept: false
        });
      }
      setShowChallengeModal(true);
    };

    const listener = addAppChallengeListener((data) => {
      if (data?.targetPackage) {
        triggerForPackage(data.targetPackage, true);
      }
    });

    getPendingChallenge().then((res) => {
      if (!isMounted) return;
      if (res?.hasChallenge && res.targetPackage) {
        triggerForPackage(res.targetPackage, true);
      } else if (!modalsRef.current.challenge && participantData?.is_enrolled && !isAppMasterUnlockedRef.current) {
        // Si el usuario ya está calibrado y TecleoLlave está bloqueada, exigir frase al abrir
        triggerForPackage('', false);
      }
    });

    return () => {
      isMounted = false;
      listener?.remove?.();
    };
  }, [installedApps, phrase, participantData?.is_enrolled]);

  // ---------------------------------------------------------------------------
  // 5. MANEJO DE EVENTOS NATIVOS DE ANDROID (BOTÓN ATRÁS & RESUME / SCREEN OFF)
  // ---------------------------------------------------------------------------
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const modalsRef = useRef({
    enrollment: showEnrollmentModal,
    challenge: showChallengeModal,
    deviceLock: showDeviceLockModal,
    changePhrase: showChangePhraseModal
  });

  modalsRef.current = {
    enrollment: showEnrollmentModal,
    challenge: showChallengeModal,
    deviceLock: showDeviceLockModal,
    changePhrase: showChangePhraseModal
  };

  useEffect(() => {
    // Escuchar botón físico / software Atrás de Android
    let backSub;
    try {
      backSub = CapApp.addListener('backButton', () => {
        const m = modalsRef.current;
        if (m.enrollment) { setShowEnrollmentModal(false); return; }
        if (m.challenge) {
          setShowChallengeModal(false);
          if (challengeTargetRef.current.isNativeIntercept) {
            minimizeApp();
          } else if (!challengeTargetRef.current.packageName && !isAppMasterUnlockedRef.current) {
            minimizeApp();
          }
          return;
        }
        if (m.deviceLock) { setShowDeviceLockModal(false); return; }
        if (m.changePhrase) { setShowChangePhraseModal(false); return; }

        if (activeTabRef.current !== 'inicio') {
          setActiveTab('inicio');
          return;
        }

        CapApp.exitApp();
      });
    } catch (e) {
      console.warn('[AndroidApp] Error registrando backButton:', e);
    }

    // Escuchar cuando la app regresa a primer plano o pasa a segundo plano
    let stateSub;
    try {
      stateSub = CapApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) {
          refreshPermissions();
          // Si ya hay un reto nativo de app en curso, no interferir ni sobreescribir con TecleoLlave
          if (challengeTargetRef.current?.isNativeIntercept && modalsRef.current.challenge) {
            return;
          }

          // Comprobar si hubo un reto al volver
          getPendingChallenge().then((res) => {
            if (res?.hasChallenge && res.targetPackage) {
              const found = installedApps.find(a => a.packageName === res.targetPackage);
              setChallengeTarget({
                name: found?.name || res.targetPackage,
                icon: found?.icon || '',
                packageName: res.targetPackage,
                phrase: phrase,
                isNativeIntercept: true
              });
              setShowChallengeModal(true);
            } else if (!modalsRef.current.challenge && participantData?.is_enrolled && !isAppMasterUnlockedRef.current) {
              // Si la app regresa de segundo plano, está bloqueada y no hay reto activo, exigir frase para entrar
              setChallengeTarget({
                name: 'TECLEOLLAVE',
                icon: '',
                packageName: '',
                phrase: phrase,
                isNativeIntercept: false
              });
              setShowChallengeModal(true);
            }
          });
        } else {
          // La app pasó a segundo plano (se minimizó, salió o apagó la pantalla)
          // Bloquear TecleoLlave para volver a pedir frase al regresar
          setIsAppMasterUnlocked(false);
        }
      });
    } catch (e) {
      console.warn('[AndroidApp] Error registrando appStateChange:', e);
    }

    return () => {
      backSub?.then?.(sub => sub.remove?.())?.catch?.(() => {});
      stateSub?.then?.(sub => sub.remove?.())?.catch?.(() => {});
    };
  }, [refreshPermissions, installedApps, phrase, participantData?.is_enrolled]);

  // ---------------------------------------------------------------------------
  // 6. ACCIONES DE AUTENTICACIÓN (LOGIN / REGISTRO / OTP)
  // ---------------------------------------------------------------------------
  const handleSendOtp = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      setErrorMsg('Por favor ingresa un correo Gmail válido.');
      return;
    }

    if (authTab === 'register') {
      if (!consentAccepted) {
        setErrorMsg('Debes aceptar el consentimiento informado para participar.');
        return;
      }
      if (!fullName.trim()) {
        setErrorMsg('Por favor ingresa tu nombre completo.');
        return;
      }
    }

    setAuthLoading(true);
    try {
      await api.post('/mobile/auth/request-otp', { email: cleanEmail });
      setIsOtpStep(true);
    } catch (err) {
      if (!err.response) {
        setErrorMsg('El servidor no está disponible. La creación de cuenta y el envío de códigos requieren conexión activa con el servidor central. Por favor verifica que tu laptop/túnel esté encendido o configura la URL en el ícono de servidor.');
      } else {
        setErrorMsg(err.response?.data?.detail || 'Error al conectar con el servidor.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    const fullCode = otpCode.join('').trim();

    if (fullCode.length !== 6) {
      setErrorMsg('Ingresa los 6 dígitos del código enviado a tu Gmail.');
      return;
    }

    setAuthLoading(true);
    try {
      const res = await api.post('/mobile/auth/verify-otp', {
        email: email.trim().toLowerCase(),
        code: fullCode,
        full_name: fullName.trim() || undefined,
        dominant_hand: dominantHand,
        age_range: ageRange,
        device_model: deviceModel,
        screen_refresh_rate: 60
      });

      if (res.data?.access_token) {
        localStorage.setItem('token', res.data.access_token);
      }

      const participant = res.data.participant;
      setParticipantData(participant);
      if (participant.enrollment_phrase) {
        setPhrase(participant.enrollment_phrase);
      }
      setIsOtpStep(false);
      setActiveTab('inicio');

      // Al iniciar sesión online, sincronizar automáticamente actividades pendientes si existen
      setTimeout(() => {
        offlineSyncService.updateStats().then(() => offlineSyncService.syncQueue());
      }, 500);
    } catch (err) {
      if (!err.response) {
        setErrorMsg('El servidor no respondió. La autenticación y registro de cuenta requieren conexión en línea con el servidor central.');
      } else {
        setErrorMsg(err.response?.data?.detail || 'Código incorrecto o expirado.');
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleOtpDigitChange = (val, idx) => {
    if (!/^[0-9]?$/.test(val)) return;
    const nextOtp = [...otpCode];
    nextOtp[idx] = val;
    setOtpCode(nextOtp);

    if (val && idx < 5) {
      const nextInput = document.getElementById(`tl-otp-${idx + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('tl_mobile_participant');
    localStorage.removeItem('token');
    setParticipantData(null);
    setIsAppMasterUnlocked(false);
    setIsOtpStep(false);
    setEmail('');
    setOtpCode(['', '', '', '', '', '']);
    setActiveTab('inicio');
    offlineSyncService.updateStats();
  };

  // ---------------------------------------------------------------------------
  // 7. GESTIÓN DE ACCIONES DE LA APP
  // ---------------------------------------------------------------------------
  const handleToggleApp = (pkgName) => {
    setProtectedPackages(prev => ({
      ...prev,
      [pkgName]: !prev[pkgName]
    }));
  };

  const handleOpenAppChallenge = (name, icon, pkgName) => {
    setChallengeTarget({
      name: name || 'Aplicación',
      icon: icon || '',
      packageName: pkgName || '',
      phrase: phrase,
      isNativeIntercept: false
    });
    setShowChallengeModal(true);
  };

  const handleChallengeSuccess = async (pkgName, isNativeIntercept = false) => {
    setShowChallengeModal(false);
    if (pkgName) {
      await unlockPackageForSession(pkgName);
      // Solo minimizar TECLEOLLAVE si fue una intercepción nativa en segundo plano de Android
      // para mostrar la app subyacente (WhatsApp, BCP, etc.)
      if (isNativeIntercept) {
        await minimizeApp();
      }
    } else {
      // Desbloqueo exitoso de la propia aplicación TECLEOLLAVE
      setIsAppMasterUnlocked(true);
    }
  };

  const handleChallengeClose = async () => {
    setShowChallengeModal(false);
    // Si era una intercepción nativa de una app externa y el usuario cancela, minimizar
    if (challengeTarget.isNativeIntercept) {
      await minimizeApp();
    } else if (!challengeTarget.packageName && !isAppMasterUnlocked) {
      // Si era para desbloquear TecleoLlave y canceló sin haber desbloqueado,
      // minimizar la app para proteger el acceso
      await minimizeApp();
    }
  };

  const handleEnrollmentClose = () => {
    setShowEnrollmentModal(false);
    // Si estaba calibrando una nueva frase pero canceló antes de terminar las 30 reps,
    // restaurar la frase anterior para mantener activo el modelo calibrado previo
    if (previousPhrase && previousPhrase !== phrase) {
      setPhrase(previousPhrase);
      setPreviousPhrase('');
    }
  };

  const handleEnrollmentComplete = ({ phrase: newKey, repsCount }) => {
    const finalPhrase = newKey || phrase;
    setPhrase(finalPhrase);
    setPreviousPhrase('');
    if (typeof window !== 'undefined') {
      localStorage.setItem('tl_key_phrase', finalPhrase);
    }
    setParticipantData(prev => ({
      ...prev,
      is_enrolled: true,
      enrollment_phrase: finalPhrase,
      enrolled_reps_count: repsCount || 30
    }));
    setIsAppMasterUnlocked(true);
    setShowEnrollmentModal(false);
  };

  const handleChangePhraseSubmit = (e) => {
    e.preventDefault();
    if (!newPhraseInput.trim()) return;
    const clean = newPhraseInput.trim().toLowerCase();
    if (clean === phrase.trim().toLowerCase()) {
      setShowChangePhraseModal(false);
      setNewPhraseInput('');
      return;
    }
    setPreviousPhrase(phrase);
    setPhrase(clean);
    setShowChangePhraseModal(false);
    setNewPhraseInput('');
    // Lanzar de inmediato el entrenamiento guiado de 30 repeticiones para calibrar la nueva frase
    setShowEnrollmentModal(true);
  };

  // Lista formateada de apps protegidas para la tarjeta de inicio
  const protectedAppsList = installedApps.filter(a => protectedPackages[a.packageName]);

  // Comprobar si se ejecuta en escritorio o navegador para marco
  const [isDesktopSim] = useState(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth > 768 && !Boolean(window.Capacitor?.isNativePlatform?.());
    }
    return false;
  });

  return (
    <div className={`tl-native-app tl-theme-${theme} ${isDesktopSim ? 'is-desktop-sim' : ''}`}>
      {/* 0. INTERCEPCIÓN NATIVA DE APP EXTERNA (PANTALLA DE BLOQUEO DEDICADA SIN FLASH DE FONDO) */}
      {showChallengeModal && challengeTarget.isNativeIntercept ? (
        <VerificationChallengeModal
          targetName={challengeTarget.name}
          targetIcon={challengeTarget.icon}
          targetPackage={challengeTarget.packageName}
          targetPhrase={challengeTarget.phrase || phrase}
          isNativeIntercept={true}
          participant={participantData}
          onClose={handleChallengeClose}
          onSuccess={handleChallengeSuccess}
        />
      ) : (
        <>
          {/* =================================================================== */}
          {/* CABECERA DE LA APLICACIÓN */}
          {/* =================================================================== */}
          <header className="tl-app-header">
        <div className="tl-header-left">
          <div className="tl-header-logo-icon">
            <Shield size={19} />
          </div>
          <div>
            <h1 className="tl-header-title">TECLEOLLAVE</h1>
            <p className="tl-header-subtitle">Biometría Conductual de Tecleo</p>
          </div>
        </div>

        <div className="tl-header-actions">
          {participantData && (!participantData.is_enrolled || isAppMasterUnlocked) && (
            <button
              type="button"
              onClick={() => handleOpenAppChallenge('Prueba Rápida', '', '')}
              className="tl-icon-btn"
              title="Probar verificación biométrica"
            >
              <Lock size={17} />
            </button>
          )}

          <button
            type="button"
            onClick={() => setShowServerConfigModal(true)}
            className="tl-icon-btn"
            title="Configurar servidor API / Túnel"
          >
            <Server size={17} />
          </button>

          <button
            type="button"
            onClick={toggleTheme}
            className="tl-icon-btn"
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
      </header>

      {/* =================================================================== */}
      {/* CUERPO PRINCIPAL */}
      {/* =================================================================== */}
      <main className="tl-app-body">
        {/* Barra Reactiva de Estado de Conexión y Cola de Sincronización */}
        <SyncStatusBar onOpenServerConfig={() => setShowServerConfigModal(true)} />

        {/* CASO A: USUARIO NO AUTENTICADO (LOGIN / REGISTRO / OTP) */}
        {!participantData ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingTop: '0.5rem' }}>
            <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
              <div style={{
                width: 52,
                height: 52,
                borderRadius: '16px',
                background: 'var(--tl-accent-light)',
                color: 'var(--tl-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 0.75rem auto'
              }}>
                <KeyRound size={26} />
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.3rem 0', color: 'var(--tl-text-primary)' }}>
                {isOtpStep ? 'Código de Verificación' : 'Acceso al Estudio'}
              </h2>
              <p style={{ fontSize: '0.76rem', color: 'var(--tl-text-secondary)', margin: 0, lineHeight: '1.4' }}>
                {isOtpStep
                  ? `Ingresa el código de 6 dígitos enviado a ${email}`
                  : 'Tu frase es la llave. Tu forma de escribir demuestra que eres tú.'}
              </p>
            </div>

            {errorMsg && (
              <div style={{
                padding: '0.75rem',
                borderRadius: '10px',
                background: 'var(--tl-danger-light)',
                color: 'var(--tl-danger)',
                fontSize: '0.74rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            {!isOtpStep ? (
              <div className="tl-card">
                {/* Selector de Pestaña: Iniciar Sesión / Registro */}
                <div className="tl-segment-tabs">
                  <button
                    type="button"
                    className={`tl-segment-btn ${authTab === 'login' ? 'active' : ''}`}
                    onClick={() => { setAuthTab('login'); setErrorMsg(''); }}
                  >
                    Iniciar Sesión
                  </button>
                  <button
                    type="button"
                    className={`tl-segment-btn ${authTab === 'register' ? 'active' : ''}`}
                    onClick={() => { setAuthTab('register'); setErrorMsg(''); }}
                  >
                    Nuevo Participante
                  </button>
                </div>

                <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  {authTab === 'register' && (
                    <>
                      <div className="tl-form-group">
                        <label className="tl-label">Nombre Completo</label>
                        <input
                          type="text"
                          className="tl-input"
                          placeholder="Ej. Juan Pérez"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                        <div className="tl-form-group">
                          <label className="tl-label">Mano dominante</label>
                          <select
                            className="tl-select"
                            value={dominantHand}
                            onChange={(e) => setDominantHand(e.target.value)}
                          >
                            <option value="diestro">Diestro</option>
                            <option value="zurdo">Zurdo</option>
                            <option value="ambidiestro">Ambidiestro</option>
                          </select>
                        </div>
                        <div className="tl-form-group">
                          <label className="tl-label">Rango de edad</label>
                          <select
                            className="tl-select"
                            value={ageRange}
                            onChange={(e) => setAgeRange(e.target.value)}
                          >
                            <option value="18-25">18 - 25 años</option>
                            <option value="26-35">26 - 35 años</option>
                            <option value="36-50">36 - 50 años</option>
                            <option value="50+">50+ años</option>
                          </select>
                        </div>
                      </div>
                    </>
                  )}

                  <div className="tl-form-group">
                    <label className="tl-label">Correo Electrónico (Gmail)</label>
                    <input
                      type="email"
                      className="tl-input"
                      placeholder="ejemplo@gmail.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  {authTab === 'register' && (
                    <label style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '0.5rem',
                      fontSize: '0.7rem',
                      color: 'var(--tl-text-secondary)',
                      lineHeight: '1.35',
                      cursor: 'pointer'
                    }}>
                      <input
                        type="checkbox"
                        checked={consentAccepted}
                        onChange={(e) => setConsentAccepted(e.target.checked)}
                        style={{ marginTop: '2px' }}
                      />
                      <span>
                        Acepto participar voluntariamente en el estudio de biometría conductual y autorizo el análisis anónimo de dinámicas de tecleo.
                      </span>
                    </label>
                  )}

                  <button
                    type="submit"
                    disabled={authLoading}
                    className="tl-btn-primary"
                    style={{ marginTop: '0.4rem' }}
                  >
                    {authLoading ? <RefreshCw size={16} className="tl-spin" /> : <Mail size={16} />}
                    <span>{authLoading ? 'Enviando código...' : 'Enviar Código a Gmail'}</span>
                  </button>
                </form>
              </div>
            ) : (
              /* PASO OTP: CAJAS DE 6 DÍGITOS */
              <div className="tl-card">
                <form onSubmit={handleVerifyOtp} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="tl-otp-grid">
                    {otpCode.map((digit, idx) => (
                      <input
                        key={idx}
                        id={`tl-otp-${idx}`}
                        type="text"
                        inputMode="numeric"
                        maxLength={1}
                        className="tl-otp-box"
                        value={digit}
                        onChange={(e) => handleOtpDigitChange(e.target.value, idx)}
                        onKeyDown={(e) => {
                          if (e.key === 'Backspace' && !digit && idx > 0) {
                            const prev = document.getElementById(`tl-otp-${idx - 1}`);
                            if (prev) prev.focus();
                          }
                        }}
                      />
                    ))}
                  </div>

                  <button
                    type="submit"
                    disabled={authLoading || otpCode.join('').length < 6}
                    className="tl-btn-primary"
                  >
                    {authLoading ? <RefreshCw size={16} className="tl-spin" /> : <CheckCircle2 size={16} />}
                    <span>{authLoading ? 'Verificando...' : 'Verificar e Ingresar'}</span>
                  </button>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                    <button
                      type="button"
                      onClick={() => setIsOtpStep(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--tl-text-muted)', cursor: 'pointer' }}
                    >
                      ← Cambiar correo
                    </button>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      style={{ background: 'none', border: 'none', color: 'var(--tl-accent)', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Reenviar código
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        ) : !isAppMasterUnlocked && participantData?.is_enrolled ? (
          /* CASO B: TECLEOLLAVE BLOQUEADA (REQUIERE FRASE LLAVE) */
          <div className="tl-card" style={{ textAlign: 'center', padding: '2.5rem 1.25rem', marginTop: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '20px',
              background: 'var(--tl-accent-light)',
              color: 'var(--tl-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '1.2rem',
              boxShadow: '0 8px 24px rgba(99, 102, 241, 0.25)'
            }}>
              <Lock size={32} />
            </div>

            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.5rem 0', color: 'var(--tl-text-primary)' }}>
              TecleoLlave Protegida
            </h2>

            <p style={{ fontSize: '0.8rem', color: 'var(--tl-text-secondary)', margin: '0 0 1.5rem 0', lineHeight: '1.5', maxWidth: '300px' }}>
              Esta aplicación está protegida por tu ritmo biométrico de tecleo. Ingresa tu frase llave para acceder a tus aplicaciones y configuraciones.
            </p>

            <button
              type="button"
              className="tl-btn-primary"
              style={{ width: '100%', maxWidth: '280px', padding: '0.85rem' }}
              onClick={() => {
                setChallengeTarget({
                  name: 'TECLEOLLAVE',
                  icon: '',
                  packageName: '',
                  phrase: phrase,
                  isNativeIntercept: false
                });
                setShowChallengeModal(true);
              }}
            >
              <KeyRound size={18} />
              <span>Desbloquear con mi Frase</span>
            </button>
          </div>
        ) : (
          /* CASO C: ACCESO AUTORIZADO - PESTAÑAS PRINCIPALES */
          <>
            {activeTab === 'inicio' && (
              <HomeTab
                participant={participantData}
                phrase={phrase}
                isEnrolled={Boolean(participantData.is_enrolled)}
                enrolledRepsCount={participantData.enrolled_reps_count || (participantData.is_enrolled ? 30 : 0)}
                protectedApps={protectedAppsList}
                permissionsStatus={permissionsStatus}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onStartTraining={(targetPhrase) => {
                  setPhrase(targetPhrase || phrase);
                  setShowEnrollmentModal(true);
                }}
                onOpenAppLocker={(targetName) => handleOpenAppChallenge(targetName, '', '')}
              />
            )}

            {activeTab === 'mykey' && (
              <MyKeyTab
                phrase={phrase}
                isEnrolled={Boolean(participantData.is_enrolled)}
                enrolledRepsCount={participantData.enrolled_reps_count || (participantData.is_enrolled ? 30 : 0)}
                onStartTraining={(targetPhrase) => {
                  setPhrase(targetPhrase || phrase);
                  setShowEnrollmentModal(true);
                }}
                onChangePhrase={() => {
                  setNewPhraseInput(phrase);
                  setShowChangePhraseModal(true);
                }}
                onTestRecognition={() => handleOpenAppChallenge('Prueba de Llave', '', '')}
              />
            )}

            {activeTab === 'apps' && (
              <AppsTab
                installedApps={installedApps}
                protectedPackages={protectedPackages}
                isEnrolled={Boolean(participantData?.is_enrolled)}
                permissionsStatus={permissionsStatus}
                onToggleAppProtection={handleToggleApp}
                onOpenAppChallenge={handleOpenAppChallenge}
                onOpenUsageSettings={openUsageSettings}
                onOpenOverlaySettings={openOverlaySettings}
                onRequireEnrollment={() => setShowEnrollmentModal(true)}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsTab
                participant={participantData}
                theme={theme}
                onToggleTheme={toggleTheme}
                permissionsStatus={permissionsStatus}
                onOpenUsageSettings={openUsageSettings}
                onOpenOverlaySettings={openOverlaySettings}
                onOpenSecuritySettings={openSecuritySettings}
                onOpenServerConfig={() => setShowServerConfigModal(true)}
                currentServerUrl={currentServerUrl}
                onLogout={handleLogout}
              />
            )}
          </>
        )}
      </main>

      {/* =================================================================== */}
      {/* BARRA DE NAVEGACIÓN INFERIOR */}
      {/* =================================================================== */}
      {participantData && (!participantData.is_enrolled || isAppMasterUnlocked) && (
        <MobileBottomNav
          currentTab={activeTab}
          onSelectTab={(tabId) => setActiveTab(tabId)}
          protectedAppsCount={protectedAppsList.length}
        />
      )}

      {/* =================================================================== */}
      {/* MODALES DEL SISTEMA */}
      {/* =================================================================== */}

      {/* 1. Modal de Calibración / Entrenamiento Guiado de 30 Repeticiones */}
      {showEnrollmentModal && (
        <GuidedEnrollmentModal
          phrase={phrase}
          participant={participantData}
          onClose={handleEnrollmentClose}
          onComplete={handleEnrollmentComplete}
        />
      )}

      {/* 2. Modal de Verificación Biométrica de Frase Llave (para desbloqueo dentro de TecleoLlave) */}
      {showChallengeModal && !challengeTarget.isNativeIntercept && (
        <VerificationChallengeModal
          targetName={challengeTarget.name}
          targetIcon={challengeTarget.icon}
          targetPackage={challengeTarget.packageName}
          targetPhrase={challengeTarget.phrase || phrase}
          isNativeIntercept={false}
          participant={participantData}
          onClose={handleChallengeClose}
          onSuccess={handleChallengeSuccess}
        />
      )}

      {/* 3. Modal de Seguridad del Dispositivo Android */}
      {showDeviceLockModal && (
        <DeviceLockSetupModal
          isDeviceSecure={permissionsStatus.deviceSecure}
          onOpenSecuritySettings={openSecuritySettings}
          onClose={() => setShowDeviceLockModal(false)}
        />
      )}

      {/* 6. Modal para Cambiar Frase Llave */}
      {showChangePhraseModal && (
        <div className="tl-modal-overlay" style={{ zIndex: 120 }}>
          <div className="tl-modal-card" style={{ maxWidth: '350px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Edit3 size={16} color="var(--tl-accent)" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--tl-text-primary)' }}>
                  Definir Nueva Frase Llave
                </span>
              </div>
              <button type="button" onClick={() => setShowChangePhraseModal(false)} className="tl-icon-btn" style={{ padding: '4px' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleChangePhraseSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <p style={{ fontSize: '0.74rem', color: 'var(--tl-text-secondary)', margin: 0, lineHeight: '1.4' }}>
                Escribe tu nueva frase segura. Recuerda que al cambiarla, deberás calibrar tu ritmo de tecleo nuevamente (30 repeticiones).
              </p>

              <input
                type="text"
                className="tl-input"
                placeholder="Ej. seguridad unt 2026"
                value={newPhraseInput}
                onChange={(e) => setNewPhraseInput(e.target.value)}
                autoFocus
              />

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                <button
                  type="button"
                  onClick={() => setShowChangePhraseModal(false)}
                  className="tl-btn-outline"
                  style={{ flex: 1 }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newPhraseInput.trim()}
                  className="tl-btn-primary"
                  style={{ flex: 1.5 }}
                >
                  <span>Guardar y Calibrar</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 7. Modal de Configuración de Servidor / Túnel */}
      {showServerConfigModal && (
        <ServerConfigModal
          currentUrl={currentServerUrl}
          onSaveUrl={handleSaveServerUrl}
          onClose={() => setShowServerConfigModal(false)}
        />
      )}
        </>
      )}
    </div>
  );
}
