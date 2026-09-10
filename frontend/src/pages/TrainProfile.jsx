import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import TypingCapture from '../components/TypingCapture';
import MultiSessionStepper from '../components/enrollment/MultiSessionStepper';
import TipsAccordion from '../components/enrollment/TipsAccordion';
import LanguageSelector from '../components/LanguageSelector';
import {
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Sun,
  Moon,
  LogOut,
  Coffee,
  Zap,
  MoonStar,
  Target,
  BarChart2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Activity,
  ArrowRight,
  TrendingUp,
  Cpu,
  Clock,
  LogIn,
  X
} from 'lucide-react';

export default function TrainProfile() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { username, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  // Estado del servidor: multi-session status
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [statusData, setStatusData] = useState({
    total_samples: 0,
    sessions_count: 0,
    context_distribution: { normal: 0, 'con prisa': 0, cansado: 0, concentrado: 0 },
    is_ready_for_training: false,
    current_model_version: null
  });

  // Configuración de captura actual
  const [sessionId, setSessionId] = useState('1');
  const [contextTag, setContextTag] = useState('normal');
  const [localCaptureCount, setLocalCaptureCount] = useState(0);

  // Estados de carga y feedback de reentrenamiento
  const [isTraining, setIsTraining] = useState(false);
  const [trainSuccessResult, setTrainSuccessResult] = useState(null);
  const [showPostTrainModal, setShowPostTrainModal] = useState(false);
  const [error, setError] = useState(null);
  const [infoMessage, setInfoMessage] = useState(null);

  const REQUIRED_SAMPLES = 30;
  const REQUIRED_SESSIONS = 3;

  // Definición de las 3 sesiones para captura estructurada
  const sessionDefs = [
    {
      id: '1',
      title: 'Sesión 1: Mañana / Base',
      subtitle: 'Ritmo matutino en frío (08:30 - 09:30)',
      icon: '🌅',
      recommendedContext: 'normal',
      target: 10
    },
    {
      id: '2',
      title: 'Sesión 2: Mediodía / Tarde',
      subtitle: 'Ritmo activo o con prisa (14:00 - 15:30)',
      icon: '☀️',
      recommendedContext: 'con prisa',
      target: 10
    },
    {
      id: '3',
      title: 'Sesión 3: Noche / Cansancio',
      subtitle: 'Ritmo cansado o fin de turno (21:00 - 22:30)',
      icon: '🌙',
      recommendedContext: 'cansado',
      target: 10
    }
  ];

  // Contextos conductuales
  const contextOptions = [
    { id: 'normal', label: 'Normal / Relajado', icon: Coffee, desc: 'Ritmo habitual sin prisa' },
    { id: 'con prisa', label: 'Con Prisa', icon: Zap, desc: 'Tecleo acelerado y enérgico' },
    { id: 'cansado', label: 'Cansado / Fatiga', icon: MoonStar, desc: 'Pausas más largas entre teclas' },
    { id: 'concentrado', label: 'Concentrado', icon: Target, desc: 'Máxima precisión y consistencia' }
  ];

  // Cargar estado real de enrolamiento multi-sesión desde el backend
  const fetchStatus = useCallback(async () => {
    if (!username) return;
    try {
      const res = await api.get(`/typing/multi-session-status/${username}`);
      setStatusData(res.data);
    } catch (err) {
      console.warn('Error al obtener estado multi-sesión:', err);
    } finally {
      setLoadingStatus(false);
    }
  }, [username]);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  // Manejar muestra capturada por TypingCapture
  const handleSampleCaptured = async (result) => {
    setError(null);
    setTrainSuccessResult(null);

    if (!result) {
      setError('No se pudo registrar la muestra de tecleo. Intenta de nuevo.');
      return;
    }

    setLocalCaptureCount(prev => prev + 1);
    setInfoMessage(`¡Muestra biométrica #${(statusData.total_samples || 0) + 1} capturada y almacenada en base de datos!`);

    // Refrescar estado real desde SQLite
    await fetchStatus();
  };

  // Disparar reentrenamiento real del modelo
  const handleTrainModel = async () => {
    if (!username) return;
    setIsTraining(true);
    setError(null);
    setInfoMessage(null);

    try {
      const res = await api.post('/typing/train-user-profile', { username });
      setTrainSuccessResult(res.data);
      setShowPostTrainModal(true);
      await fetchStatus();
    } catch (err) {
      const detail = err.response?.data?.detail || err.message;
      setError(`Error al reentrenar modelo: ${detail}`);
    } finally {
      setIsTraining(false);
    }
  };

  const handleGoToLogin = () => {
    setShowPostTrainModal(false);
    logout();
    navigate('/login', { state: { username, fromTraining: true } });
  };

  const handleContinueTraining = () => {
    setShowPostTrainModal(false);
    setError(null);
    setInfoMessage(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const totalSamples = statusData.total_samples || 0;
  const sessionsCount = statusData.sessions_count || 0;
  const distribution = statusData.context_distribution || {};

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', display: 'flex', flexDirection: 'column' }}>
      {/* Barra superior de navegación */}
      <header style={{
        height: '60px',
        borderBottom: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-surface)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 1.5rem',
        position: 'sticky',
        top: 0,
        zIndex: 50
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--brand-500)'
          }}>
            <Sparkles size={18} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                TecleoLlave-Adapt
              </span>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '0.1rem 0.45rem',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: 'var(--success)'
              }}>
                Usuario: {username}
              </span>
            </div>
            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
              Entrenamiento Continuo de Perfil Biométrico
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <NavLink
            to="/"
            className="btn-secondary"
            style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}
          >
            Dashboard
          </NavLink>
          <NavLink
            to="/live-demo"
            className="btn-secondary"
            style={{
              fontSize: '0.8rem',
              padding: '0.35rem 0.75rem',
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              color: 'var(--brand-500)',
              borderColor: 'var(--brand-500)'
            }}
          >
            Demo en Vivo ⚡
          </NavLink>
          <LanguageSelector variant="compact" />
          <button
            type="button"
            className="btn-icon"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
          <button
            type="button"
            className="btn-secondary"
            onClick={handleLogout}
            style={{
              fontSize: '0.8rem',
              padding: '0.35rem 0.75rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: 'var(--danger)',
              borderColor: 'rgba(239, 68, 68, 0.3)'
            }}
            title="Cerrar Sesión"
          >
            <LogOut size={14} />
            <span>Salir</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal */}
      <main style={{ maxWidth: '980px', width: '100%', margin: '1.5rem auto', padding: '0 1.5rem', flex: 1 }}>
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '2rem',
          boxShadow: 'var(--shadow-md)'
        }}>
          {/* Header del Perfil */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.72rem',
              fontWeight: 700,
              color: 'var(--brand-500)',
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              padding: '0.2rem 0.65rem',
              borderRadius: 'var(--radius-sm)',
              marginBottom: '0.5rem'
            }}>
              <ShieldCheck size={14} />
              <span>PERFIL CONDUCTUAL DE USUARIO REGISTRADO</span>
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0.25rem 0', color: 'var(--text-primary)' }}>
              Entrenamiento Continuo de tu Modelo Biométrico
            </h1>
            <p style={{
              fontSize: '0.85rem',
              color: 'var(--text-secondary)',
              margin: 0,
              maxWidth: '680px',
              marginLeft: 'auto',
              marginRight: 'auto',
              lineHeight: 1.5
            }}>
              Captura nuevas muestras de tecleo en distintas condiciones para enriquecer tu patrón biométrico.
              El sistema seleccionará automáticamente el algoritmo ML óptimo con menor tasa de error (EER).
            </p>
          </div>

          {/* Stepper Multi-Sesión Indicador */}
          <MultiSessionStepper
            step={2}
            samplesCount={totalSamples}
            requiredSamples={REQUIRED_SAMPLES}
            sessionsCount={sessionsCount}
            requiredSessions={REQUIRED_SESSIONS}
            labels={[
              { num: 1, label: 'Cuenta Registrada', isDone: true, isActive: false },
              {
                num: 2,
                label: `Progreso Multi-Sesión (${totalSamples}/${REQUIRED_SAMPLES} m., ${sessionsCount}/${REQUIRED_SESSIONS} ses.)`,
                isDone: totalSamples >= REQUIRED_SAMPLES,
                isActive: true
              },
              {
                num: 3,
                label: statusData.is_ready_for_training ? 'Listo para Entrenar' : 'Entrenamiento Activo',
                isDone: Boolean(trainSuccessResult),
                isActive: false
              }
            ]}
          />

          {/* Mensajes de Alerta */}
          {error && (
            <div style={{
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <AlertTriangle size={16} />
              <span>{error}</span>
            </div>
          )}

          {infoMessage && (
            <div style={{
              backgroundColor: 'rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              color: 'var(--brand-500)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              fontSize: '0.85rem',
              marginBottom: '1rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem'
            }}>
              <CheckCircle2 size={16} />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Bloque 1: Selector de Sesión de Captura */}
          <div style={{ marginBottom: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                1. Selecciona la Sesión de Captura
              </span>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: sessionsCount >= 3 ? 'var(--success)' : 'var(--text-muted)' }}>
                Sesiones en DB: {sessionsCount} / {REQUIRED_SESSIONS} {sessionsCount >= 3 && '✅'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
              {sessionDefs.map((sess) => {
                const isSelected = sessionId === sess.id;
                return (
                  <button
                    key={sess.id}
                    type="button"
                    onClick={() => {
                      setSessionId(sess.id);
                      setContextTag(sess.recommendedContext);
                    }}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-lg)',
                      border: `2px solid ${isSelected ? 'var(--brand-500)' : 'var(--border-subtle)'}`,
                      backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'var(--bg-canvas)',
                      textAlign: 'left',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '0.3rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: '1.1rem' }}>{sess.icon}</span>
                      {isSelected && (
                        <span style={{
                          fontSize: '0.68rem',
                          fontWeight: 700,
                          padding: '0.15rem 0.5rem',
                          borderRadius: '9999px',
                          backgroundColor: 'var(--brand-500)',
                          color: '#fff'
                        }}>
                          Activa
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: isSelected ? 'var(--brand-500)' : 'var(--text-primary)' }}>
                      {sess.title}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                      {sess.subtitle}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bloque 2: Selector de Contexto Conductual */}
          <div style={{ marginBottom: '1.25rem' }}>
            <span style={{
              fontSize: '0.78rem',
              fontWeight: 700,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              display: 'block',
              marginBottom: '0.5rem'
            }}>
              2. Estado / Contexto del Tecleo
            </span>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.5rem' }}>
              {contextOptions.map((ctx) => {
                const Icon = ctx.icon;
                const isSelected = contextTag === ctx.id;
                const count = distribution[ctx.id] || 0;

                return (
                  <button
                    key={ctx.id}
                    type="button"
                    onClick={() => setContextTag(ctx.id)}
                    style={{
                      padding: '0.65rem 0.85rem',
                      borderRadius: 'var(--radius-md)',
                      border: `1.5px solid ${isSelected ? 'var(--brand-500)' : 'var(--border-subtle)'}`,
                      backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.12)' : 'var(--bg-canvas)',
                      color: isSelected ? 'var(--brand-500)' : 'var(--text-primary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', fontSize: '0.82rem', fontWeight: 600 }}>
                      <Icon size={15} />
                      <span>{ctx.label}</span>
                    </div>
                    <span style={{ fontSize: '0.7rem', opacity: 0.75, fontFamily: 'monospace' }}>
                      ({count})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tips de consistencia */}
          <TipsAccordion />

          {/* Bloque 3: Widget de Captura Física de la Frase */}
          <div style={{
            backgroundColor: 'var(--bg-canvas)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.25rem',
            marginBottom: '1.25rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{
                fontSize: '0.82rem',
                fontWeight: 700,
                color: 'var(--text-primary)',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}>
                <span>Capturar Muestra en</span>
                <span style={{ color: 'var(--brand-500)' }}>Sesión {sessionId} ({contextTag})</span>
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Total acumulado en DB: <strong>{totalSamples} muestras</strong>
              </span>
            </div>

            <TypingCapture
              key={`train-${sessionId}-${contextTag}-${totalSamples}`}
              onSampleCaptured={handleSampleCaptured}
              mode="enrollment"
              username={username}
              contextTag={contextTag}
              sessionId={sessionId}
              captureTimeLabel={`Sesión ${sessionId} - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              sampleIndex={totalSamples + 1}
              totalSamples={REQUIRED_SAMPLES}
            />
          </div>

          {/* Bloque 4: Resumen de Distribución de Muestras */}
          {totalSamples > 0 && (
            <div style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              marginBottom: '1.25rem'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  <BarChart2 size={15} style={{ color: 'var(--brand-500)' }} />
                  Distribución de Variabilidad Natural en Base de Datos
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  {totalSamples} muestras registradas
                </span>
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', fontSize: '0.75rem' }}>
                {Object.entries(distribution).map(([ctx, count]) => (
                  <span
                    key={ctx}
                    style={{
                      padding: '0.2rem 0.55rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-canvas)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-primary)'
                    }}
                  >
                    Contexto <strong>{ctx}</strong>: {count} ({totalSamples > 0 ? Math.round((count / totalSamples) * 100) : 0}%)
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Bloque 5: Botón de Reentrenamiento del Modelo */}
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <button
              type="button"
              className="btn-secondary"
              onClick={fetchStatus}
              disabled={loadingStatus || isTraining}
              title="Actualizar estado desde el backend"
              style={{ fontSize: '0.85rem' }}
            >
              <RefreshCw size={15} className={loadingStatus ? 'animate-spin' : ''} />
              <span>Refrescar</span>
            </button>

            <button
              type="button"
              className="btn-primary"
              onClick={handleTrainModel}
              disabled={isTraining || totalSamples < 10}
              style={{
                flex: 1,
                height: 48,
                fontSize: '0.96rem',
                backgroundColor: totalSamples >= REQUIRED_SAMPLES ? 'var(--success)' : 'var(--brand-600)',
                borderColor: totalSamples >= REQUIRED_SAMPLES ? 'var(--success)' : 'var(--brand-600)'
              }}
            >
              {isTraining ? (
                <span>Reentrenando Modelo con Nuevas Muestras...</span>
              ) : (
                <>
                  <Sparkles size={18} />
                  <span>
                    Entrenar / Actualizar mi Modelo ({totalSamples} muestras en DB)
                  </span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Modal Interactivo Post-Reentrenamiento */}
        {showPostTrainModal && trainSuccessResult && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.65)',
              backdropFilter: 'blur(5px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 9999,
              padding: '1.25rem'
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) handleContinueTraining();
            }}
          >
            <div
              style={{
                backgroundColor: 'var(--bg-surface)',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-xl)',
                maxWidth: '520px',
                width: '100%',
                padding: '2rem',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                display: 'flex',
                flexDirection: 'column',
                gap: '1.25rem',
                position: 'relative'
              }}
            >
              <button
                type="button"
                onClick={handleContinueTraining}
                style={{
                  position: 'absolute',
                  top: '1.25rem',
                  right: '1.25rem',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  padding: '0.25rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
                title="Cerrar ventana"
              >
                <X size={20} />
              </button>

              {/* Cabecera del Modal */}
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.65rem' }}>
                <div style={{
                  width: 60,
                  height: 60,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(16, 185, 129, 0.12)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--success)',
                  border: '2px solid rgba(16, 185, 129, 0.3)',
                  boxShadow: '0 0 24px rgba(16, 185, 129, 0.2)'
                }}>
                  <CheckCircle2 size={34} />
                </div>
                <div>
                  <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.3rem 0', color: 'var(--text-primary)' }}>
                    ¡Reentrenamiento Completado!
                  </h2>
                  <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', margin: 0 }}>
                    {trainSuccessResult.message || 'Tu modelo biométrico se ha actualizado con tus muestras más recientes.'}
                  </p>
                </div>
              </div>

              {/* Resumen Métrico del Modelo Actualizado */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '0.75rem',
                backgroundColor: 'var(--bg-canvas)',
                padding: '0.9rem 1rem',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid var(--border-subtle)'
              }}>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Versión del Modelo</span>
                  <strong style={{ fontSize: '0.98rem', color: 'var(--brand-500)' }}>
                    Modelo v{trainSuccessResult.version || statusData.current_model_version || 1}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Algoritmo Seleccionado</span>
                  <strong style={{ fontSize: '0.92rem', color: 'var(--text-primary)' }}>
                    {trainSuccessResult.selected_algorithm || trainSuccessResult.metrics?.algorithm || 'Random Forest'}
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Tasa de Error (EER)</span>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--success)' }}>
                    {((trainSuccessResult.metrics?.eer ?? 0) * 100).toFixed(2)}%
                  </strong>
                </div>
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Muestras Entrenadas</span>
                  <strong style={{ fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {statusData.total_samples || trainSuccessResult.metrics?.n_samples_train || 0} muestras
                  </strong>
                </div>
              </div>

              {/* Callout de Decisión */}
              <div style={{
                padding: '0.85rem 1rem',
                backgroundColor: 'rgba(99, 102, 241, 0.08)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid rgba(99, 102, 241, 0.2)',
                textAlign: 'center'
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.94rem', color: 'var(--brand-500)', marginBottom: '0.25rem' }}>
                  ¿Deseas volver al inicio de sesión o seguir reentrenando?
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                  Tu modelo biométrico ya se reentrenó con éxito. Puedes volver a iniciar sesión para probar tu acceso con el modelo actualizado, o permanecer aquí para seguir enriqueciendo tu perfil.
                </div>
              </div>

              {/* Botones de Acción */}
              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.25rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={handleContinueTraining}
                  style={{
                    flex: 1,
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.88rem'
                  }}
                >
                  <RefreshCw size={15} />
                  <span>Seguir Reentrenando</span>
                </button>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={handleGoToLogin}
                  style={{
                    flex: 1.35,
                    height: 44,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    fontSize: '0.88rem',
                    backgroundColor: 'var(--success)',
                    borderColor: 'var(--success)'
                  }}
                >
                  <LogIn size={16} />
                  <span>Volver al Inicio de Sesión</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
