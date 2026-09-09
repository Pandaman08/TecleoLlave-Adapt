import React, { useState, useEffect, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';
import LiveTypingCapture from '../components/live/LiveTypingCapture';
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  UserCheck,
  UserX,
  KeyRound,
  LayoutDashboard,
  Sun,
  Moon,
  RefreshCw,
  Sparkles,
  Award,
  Zap,
  CheckCircle2,
  XCircle,
  Clock,
  Activity,
  Trash2,
  TrendingUp,
  Cpu,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  Tooltip,
  ReferenceLine,
  Cell
} from 'recharts';
import ModelComparisonPanel from '../components/ModelComparisonPanel';

const DEMO_STORAGE_KEY = 'tecleollave_live_demo_history_v1';

export default function LiveDemo() {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  // Lista de usuarios enrolados
  const [enrolledUsers, setEnrolledUsers] = useState([]);
  const [selectedUsername, setSelectedUsername] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);

  // Modal de evidencia de los 3 algoritmos
  const [showComparisonModal, setShowComparisonModal] = useState(false);

  // Modo del intento: 'legitimate' | 'impostor'
  const [attemptType, setAttemptType] = useState('legitimate');

  // Estado de evaluación
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [lastResult, setLastResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  // Estado Multi-Sesión & Multi-Contexto del usuario seleccionado
  const [multiSessionStatus, setMultiSessionStatus] = useState(null);
  const [seedingMulti, setSeedingMulti] = useState(false);

  const fetchMultiSessionStatus = async (uname) => {
    if (!uname) return;
    try {
      const res = await api.get(`/typing/multi-session-status/${uname}`);
      setMultiSessionStatus(res.data);
    } catch {
      setMultiSessionStatus(null);
    }
  };

  useEffect(() => {
    if (selectedUsername) {
      fetchMultiSessionStatus(selectedUsername);
    }
  }, [selectedUsername]);

  const handleSeedMultiSession = async () => {
    if (!selectedUsername) return;
    setSeedingMulti(true);
    try {
      await api.post('/typing/seed-multisession-demo', { username: selectedUsername });
      await fetchEnrolledUsers();
      await fetchMultiSessionStatus(selectedUsername);
    } catch (err) {
      console.error('Error al sembrar multi-sesión:', err);
    } finally {
      setSeedingMulti(false);
    }
  };

  // Histórico de la sesión en vivo (almacenado en state + localStorage para persistencia en demo)
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(DEMO_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Cargar usuarios con perfiles biométricos
  const fetchEnrolledUsers = async () => {
    setLoadingUsers(true);
    setErrorMsg(null);
    try {
      const res = await api.get('/typing/enrolled-users');
      setEnrolledUsers(res.data || []);
      if (res.data && res.data.length > 0) {
        // Seleccionar por defecto el primer usuario con modelo activo
        const activeUser = res.data.find(u => u.has_active_model) || res.data[0];
        setSelectedUsername(activeUser.username);
      }
    } catch (err) {
      console.error('Error cargando usuarios enrolados:', err);
      setErrorMsg('No se pudo conectar con el backend para cargar usuarios enrolados.');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    fetchEnrolledUsers();
  }, []);

  // Guardar historial en localStorage
  useEffect(() => {
    try {
      localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(history));
    } catch { /* ignore */ }
  }, [history]);

  // Usuario seleccionado actual
  const currentUser = useMemo(() => {
    return enrolledUsers.find(u => u.username === selectedUsername) || null;
  }, [enrolledUsers, selectedUsername]);

  // Manejar muestra tecleada en vivo
  const handleSampleReady = async ({ events, phrase_typed }) => {
    if (!selectedUsername) {
      setErrorMsg('Por favor selecciona un usuario enrolado antes de teclear.');
      return;
    }

    setIsEvaluating(true);
    setErrorMsg(null);

    try {
      const payload = {
        username: selectedUsername,
        raw_timestamps: events,
        phrase_typed,
        attempt_type: attemptType
      };

      const res = await api.post('/typing/live-test', payload);
      const result = res.data;
      setLastResult(result);

      // Agregar al histórico de la sesión
      const historyItem = {
        id: Date.now(),
        index: history.length + 1,
        username: result.username,
        attempt_type: result.attempt_type,
        score: result.score,
        score_pct: result.score_pct,
        decision: result.decision,
        is_recognized: result.is_recognized,
        metrics: result.metrics,
        timestamp: result.timestamp,
        status_type: result.status_type,
        verdict_title: result.verdict_title
      };

      setHistory(prev => [historyItem, ...prev]);
    } catch (err) {
      console.error('Error en prueba biométrica en vivo:', err);
      setErrorMsg(err.response?.data?.detail || err.message || 'Error evaluando la muestra en vivo');
    } finally {
      setIsEvaluating(false);
    }
  };

  // Limpiar sesión de demo
  const handleClearHistory = () => {
    setHistory([]);
    setLastResult(null);
    try {
      localStorage.removeItem(DEMO_STORAGE_KEY);
    } catch { /* ignore */ }
  };

  // Sembrar datos de demo si la BD está vacía
  const handleSeedDemo = async () => {
    setLoadingUsers(true);
    try {
      await api.post('/auth/seed-demo');
      await fetchEnrolledUsers();
    } catch (err) {
      setErrorMsg('Error al inicializar usuarios demo.');
    } finally {
      setLoadingUsers(false);
    }
  };

  // Estadísticas de la sesión comparativa
  const stats = useMemo(() => {
    const legitAttempts = history.filter(h => h.attempt_type === 'legitimate');
    const impostorAttempts = history.filter(h => h.attempt_type === 'impostor');

    const avgLegit = legitAttempts.length > 0
      ? (legitAttempts.reduce((acc, h) => acc + h.score_pct, 0) / legitAttempts.length).toFixed(1)
      : null;

    const avgImpostor = impostorAttempts.length > 0
      ? (impostorAttempts.reduce((acc, h) => acc + h.score_pct, 0) / impostorAttempts.length).toFixed(1)
      : null;

    const separationDelta = (avgLegit !== null && avgImpostor !== null)
      ? (Number(avgLegit) - Number(avgImpostor)).toFixed(1)
      : null;

    return {
      total: history.length,
      nLegit: legitAttempts.length,
      nImpostor: impostorAttempts.length,
      avgLegit,
      avgImpostor,
      separationDelta
    };
  }, [history]);

  // Datos formateados para el gráfico de dispersión (Scatter Plot)
  const scatterData = useMemo(() => {
    return history.slice().reverse().map((h, i) => ({
      intento: i + 1,
      score: h.score_pct,
      tipo: h.attempt_type === 'legitimate' ? 'Dueño Legítimo' : 'Otra Persona',
      attempt_type: h.attempt_type,
      decision: h.decision,
      hora: h.timestamp
    }));
  }, [history]);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-canvas)', display: 'flex', flexDirection: 'column' }}>
      {/* Topbar */}
      <header className="topbar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: 34, height: 34, borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--brand-600)', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Zap size={20} />
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.1, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span>Demostración Biométrica en Vivo</span>
              <span style={{
                fontSize: '0.65rem',
                padding: '0.15rem 0.5rem',
                borderRadius: '9999px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--success)',
                fontWeight: 700
              }}>
                LIVE INTERACTIVE
              </span>
            </div>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
              Sustentación de tolerancia conductual vs. rechazo de suplantación en caliente
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <NavLink to="/" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
            <LayoutDashboard size={14} />
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/login" className="btn-secondary" style={{ fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
            <KeyRound size={14} />
            <span>Terminal Login</span>
          </NavLink>
          <button
            type="button"
            className="btn-icon"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div style={{ maxWidth: '1380px', width: '100%', margin: '1.25rem auto', padding: '0 1.5rem', flex: 1 }}>
        
        {/* Banner de propósito para el evaluador / profesor */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1rem 1.25rem',
          marginBottom: '1.25rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '1rem',
          boxShadow: 'var(--shadow-xs)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              color: 'var(--brand-500)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <Award size={22} />
            </div>
            <div>
              <h1 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0 }}>
                Protocolo de Validación Funcional para Evaluación
              </h1>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0', lineHeight: 1.4 }}>
                Demuestra en tiempo real sobre la misma cuenta: <strong>1)</strong> Que el modelo tolera la variación natural del dueño legítimo, y <strong>2)</strong> Que rechaza a cualquier otra persona que intente acceder, sin simulaciones ni datos fijos.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            {history.length > 0 && (
              <button
                type="button"
                onClick={handleClearHistory}
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem', color: 'var(--danger)', borderColor: 'rgba(239, 68, 68, 0.3)' }}
                title="Reiniciar sesión de prueba y limpiar gráficos"
              >
                <Trash2 size={13} />
                <span>Limpiar Sesión</span>
              </button>
            )}
            <button
              type="button"
              onClick={fetchEnrolledUsers}
              className="btn-secondary"
              style={{ fontSize: '0.75rem', padding: '0.4rem 0.75rem' }}
              title="Recargar usuarios"
            >
              <RefreshCw size={13} className={loadingUsers ? 'spin' : ''} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>

        {/* Top Control Grid: Selector de Usuario & Selector de Modo */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '1.25rem',
          marginBottom: '1.5rem'
        }}>
          {/* Card 1: Selector de Usuario Enrolado */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                1. Cuenta Sujeto de Prueba
              </span>
              {currentUser?.has_active_model && (
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: 'var(--success)',
                  backgroundColor: 'var(--success-bg)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '9999px',
                  border: '1px solid var(--success-border)'
                }}>
                  Modelo Activo (v{currentUser.model_version || 1})
                </span>
              )}
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <select
                value={selectedUsername}
                onChange={(e) => {
                  setSelectedUsername(e.target.value);
                  setLastResult(null);
                }}
                disabled={loadingUsers || enrolledUsers.length === 0}
                style={{
                  flex: 1,
                  padding: '0.65rem 0.85rem',
                  borderRadius: 'var(--radius-md)',
                  border: '1.5px solid var(--border-subtle)',
                  backgroundColor: 'var(--bg-canvas)',
                  color: 'var(--text-primary)',
                  fontSize: '0.95rem',
                  fontWeight: 600,
                  outline: 'none',
                  cursor: 'pointer'
                }}
              >
                {enrolledUsers.map((u) => (
                  <option key={u.id} value={u.username}>
                    {u.username} {u.has_active_model ? `(Perfil Activo - v${u.model_version || 1})` : '(Sin modelo)'}
                  </option>
                ))}
              </select>

              {enrolledUsers.length === 0 && !loadingUsers && (
                <button
                  type="button"
                  onClick={handleSeedDemo}
                  className="btn-primary"
                  style={{ fontSize: '0.8rem', padding: '0.65rem 1rem', whiteSpace: 'nowrap' }}
                >
                  <Sparkles size={14} />
                  <span>Sembrar Demo</span>
                </button>
              )}
            </div>

            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              marginTop: '0.75rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-subtle)',
              flexWrap: 'wrap',
              gap: '0.5rem'
            }}>
              <span>Muestras base: <b>{currentUser?.samples_count || 0}</b></span>
              <span>
                Motor Óptimo: <strong style={{ color: 'var(--brand-500)' }}>{currentUser?.algorithm || 'Random Forest'}</strong>
                {currentUser?.eer !== undefined && currentUser?.eer !== null && (
                  <span style={{ color: 'var(--success)', fontWeight: 700, marginLeft: '0.25rem' }}>
                    (EER: {(currentUser.eer * 100).toFixed(2)}%)
                  </span>
                )}
              </span>
              <button
                type="button"
                onClick={() => setShowComparisonModal(true)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  background: 'none',
                  border: 'none',
                  color: 'var(--brand-500)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textDecoration: 'underline',
                  padding: 0
                }}
                title="Ver evidencia comparativa de los 3 algoritmos candidatos"
              >
                <Cpu size={13} />
                <span>Ver 3 Algoritmos Candidatos</span>
              </button>
            </div>
          </div>

          {/* Card 2: Selector de Rol del Intento */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                2. ¿Quién va a teclear en este intento?
              </span>
              <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                {attemptType === 'legitimate' ? '🟢 Modo Dueño' : '🔴 Modo Impostor'}
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {/* Opción Legítimo */}
              <button
                type="button"
                onClick={() => setAttemptType('legitimate')}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-lg)',
                  border: `2px solid ${attemptType === 'legitimate' ? 'var(--success)' : 'var(--border-subtle)'}`,
                  backgroundColor: attemptType === 'legitimate' ? 'rgba(16, 185, 129, 0.12)' : 'var(--bg-canvas)',
                  color: attemptType === 'legitimate' ? 'var(--success)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '0.25rem',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.9rem' }}>
                  <UserCheck size={18} />
                  <span>Dueño Legítimo</span>
                </div>
                <span style={{ fontSize: '0.7rem', opacity: 0.85, lineHeight: 1.3 }}>
                  Prueba de tolerancia conductual (ritmo propio, fatiga, prisa).
                </span>
              </button>

              {/* Opción Impostor */}
              <button
                type="button"
                onClick={() => setAttemptType('impostor')}
                style={{
                  padding: '0.75rem 1rem',
                  borderRadius: 'var(--radius-lg)',
                  border: `2px solid ${attemptType === 'impostor' ? 'var(--danger)' : 'var(--border-subtle)'}`,
                  backgroundColor: attemptType === 'impostor' ? 'rgba(239, 68, 68, 0.12)' : 'var(--bg-canvas)',
                  color: attemptType === 'impostor' ? 'var(--danger)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'flex-start',
                  gap: '0.25rem',
                  textAlign: 'left',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, fontSize: '0.9rem' }}>
                  <UserX size={18} />
                  <span>Otra Persona</span>
                </div>
                <span style={{ fontSize: '0.7rem', opacity: 0.85, lineHeight: 1.3 }}>
                  Profesor o compañero intentando suplantar la cuenta.
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Tarjeta de Perfil Multi-Sesión & Multi-Contexto del Usuario */}
        {multiSessionStatus && (
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1rem 1.25rem',
            marginBottom: '1.25rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '1rem',
            flexWrap: 'wrap',
            boxShadow: 'var(--shadow-xs)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
              <div style={{
                width: 38, height: 38, borderRadius: 'var(--radius-md)',
                backgroundColor: 'rgba(99, 102, 241, 0.12)', color: 'var(--brand-500)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Layers size={20} />
              </div>
              <div>
                <div style={{ fontSize: '0.9rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <span>Perfil Multi-Sesión ({multiSessionStatus.total_samples} muestras en {multiSessionStatus.sessions_count} sesiones)</span>
                  {multiSessionStatus.is_ready_for_training ? (
                    <span style={{
                      fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: '4px',
                      backgroundColor: 'var(--success-bg)', color: 'var(--success)', border: '1px solid var(--success-border)', fontWeight: 700
                    }}>
                      ENTRENAMIENTO ROBUSTO (≥3 SESIONES) ✓
                    </span>
                  ) : (
                    <span style={{
                      fontSize: '0.68rem', padding: '0.15rem 0.5rem', borderRadius: '4px',
                      backgroundColor: 'var(--warning-bg)', color: 'var(--warning)', border: '1px solid var(--warning-border)', fontWeight: 700
                    }}>
                      ENROLAMIENTO PARCIAL ({multiSessionStatus.sessions_count}/3 sesiones)
                    </span>
                  )}
                </div>
                <div style={{ fontSize: '0.74rem', color: 'var(--text-secondary)', marginTop: '0.2rem' }}>
                  Variación conductual aprendida:{' '}
                  {Object.entries(multiSessionStatus.context_distribution || {}).map(([ctx, cnt]) => (
                    <span key={ctx} style={{
                      display: 'inline-block',
                      padding: '0.1rem 0.4rem',
                      marginRight: '0.4rem',
                      borderRadius: '3px',
                      backgroundColor: 'var(--bg-canvas)',
                      border: '1px solid var(--border-subtle)',
                      fontWeight: 600
                    }}>
                      {ctx}: {cnt} muestras
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <NavLink
                to="/register"
                className="btn-secondary"
                style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                title="Capturar nuevas muestras multi-sesión"
              >
                + Añadir Sesiones
              </NavLink>

              {!multiSessionStatus.is_ready_for_training && (
                <button
                  type="button"
                  onClick={handleSeedMultiSession}
                  disabled={seedingMulti}
                  className="btn-primary"
                  style={{ fontSize: '0.75rem', padding: '0.35rem 0.75rem' }}
                  title="Sembrar 35 muestras en 3 sesiones (Mañana, Tarde, Noche)"
                >
                  <Sparkles size={13} />
                  <span>{seedingMulti ? 'Sembrando...' : 'Sembrar 35 Muestras Demo'}</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error notification if any */}
        {errorMsg && (
          <div style={{
            backgroundColor: 'var(--danger-bg)',
            border: '1px solid var(--danger-border)',
            color: 'var(--danger)',
            borderRadius: 'var(--radius-md)',
            padding: '0.75rem 1rem',
            fontSize: '0.85rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            marginBottom: '1.25rem'
          }}>
            <AlertTriangle size={18} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Central Execution Grid: Captura Interactiva + Panel de Decisión Inmediata */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(350px, 1.2fr) minmax(320px, 1fr)',
          gap: '1.5rem',
          alignItems: 'stretch',
          marginBottom: '1.75rem'
        }}>
          {/* Columna Izquierda: Captura de Teclado en Vivo */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{
                    width: 10, height: 10, borderRadius: '50%',
                    backgroundColor: attemptType === 'legitimate' ? 'var(--success)' : 'var(--danger)'
                  }} />
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
                    {attemptType === 'legitimate' ? 'Tecleo del Dueño de la Cuenta' : 'Tecleo de Otra Persona (Impostor)'}
                  </h3>
                </div>
                <span style={{
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  padding: '0.2rem 0.5rem',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-surface-elevated)',
                  color: 'var(--text-muted)'
                }}>
                  Objetivo: {selectedUsername || 'N/A'}
                </span>
              </div>

              <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', margin: '0 0 1rem', lineHeight: 1.4 }}>
                {attemptType === 'legitimate'
                  ? `Escribe la frase con tu teclado físico como ${selectedUsername}. Puedes teclear rápido, pausado o con prisa para observar la tolerancia.`
                  : `Cualquier otra persona debe teclear la MISMA frase intentando pasar la autenticación de ${selectedUsername}.`}
              </p>

              <LiveTypingCapture
                onSampleReady={handleSampleReady}
                isProcessing={isEvaluating}
                attemptType={attemptType}
                username={selectedUsername}
              />
            </div>

            <div style={{
              marginTop: '1rem',
              paddingTop: '0.75rem',
              borderTop: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontSize: '0.72rem',
              color: 'var(--text-muted)'
            }}>
              <span>Extracción: 100 features deterministas (Hold + Latencias + Stats)</span>
              <span>Protección: Sin contaminación del pool ante intentos de impostor</span>
            </div>
          </div>

          {/* Columna Derecha: Panel de Veredicto & Velocímetro 3-Zonas */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-xl)',
            padding: '1.5rem',
            boxShadow: 'var(--shadow-md)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Resultado Biométrico en Tiempo Real
                </span>
                {lastResult && (
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    Evaluado a las {lastResult.timestamp}
                  </span>
                )}
              </div>

              {/* Si está evaluando */}
              {isEvaluating && (
                <div style={{
                  padding: '2.5rem 1rem',
                  textAlign: 'center',
                  color: 'var(--brand-500)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.75rem'
                }}>
                  <div className="spin" style={{ width: 32, height: 32, border: '3px solid var(--brand-500)', borderTopColor: 'transparent', borderRadius: '50%' }} />
                  <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>
                    Extrayendo 100 características y calculando probabilidad calibrada...
                  </span>
                </div>
              )}

              {/* Si aún no hay intento */}
              {!isEvaluating && !lastResult && (
                <div style={{
                  padding: '2.5rem 1.5rem',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  border: '1px dashed var(--border-subtle)',
                  borderRadius: 'var(--radius-lg)'
                }}>
                  <Cpu size={36} strokeWidth={1.5} style={{ margin: '0 auto 0.75rem', opacity: 0.5 }} />
                  <div style={{ fontWeight: 600, fontSize: '0.92rem', marginBottom: '0.25rem' }}>
                    Esperando primer tecleo en vivo
                  </div>
                  <div style={{ fontSize: '0.78rem', lineHeight: 1.4 }}>
                    Presiona <strong>"Comenzar Intento"</strong> y escribe la frase en el panel izquierdo. El resultado y la aguja del medidor se actualizarán instantáneamente aquí.
                  </div>
                </div>
              )}

              {/* Si ya hay resultado */}
              {!isEvaluating && lastResult && (
                <div>
                  {/* Banner de Veredicto Principal */}
                  <div style={{
                    padding: '1rem 1.15rem',
                    borderRadius: 'var(--radius-lg)',
                    marginBottom: '1.25rem',
                    backgroundColor: lastResult.status_type === 'success' || lastResult.status_type === 'success_security'
                      ? 'var(--success-bg)'
                      : lastResult.status_type === 'warning'
                      ? 'var(--warning-bg)'
                      : 'var(--danger-bg)',
                    border: `1.5px solid ${
                      lastResult.status_type === 'success' || lastResult.status_type === 'success_security'
                        ? 'var(--success-border)'
                        : lastResult.status_type === 'warning'
                        ? 'var(--warning-border)'
                        : 'var(--danger-border)'
                    }`,
                    color: lastResult.status_type === 'success' || lastResult.status_type === 'success_security'
                      ? 'var(--success)'
                      : lastResult.status_type === 'warning'
                      ? 'var(--warning)'
                      : 'var(--danger)'
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                      {lastResult.status_type === 'success' || lastResult.status_type === 'success_security' ? (
                        <ShieldCheck size={28} style={{ flexShrink: 0 }} />
                      ) : lastResult.status_type === 'warning' ? (
                        <AlertTriangle size={28} style={{ flexShrink: 0 }} />
                      ) : (
                        <ShieldAlert size={28} style={{ flexShrink: 0 }} />
                      )}

                      <div>
                        <div style={{ fontWeight: 800, fontSize: '1rem', lineHeight: 1.2, marginBottom: '0.25rem' }}>
                          {lastResult.verdict_title}
                        </div>
                        <div style={{ fontSize: '0.8rem', opacity: 0.92, lineHeight: 1.4, color: 'var(--text-secondary)' }}>
                          {lastResult.verdict_detail}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Medidor visual de 3 zonas */}
                  <div style={{
                    backgroundColor: 'var(--bg-canvas)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '1rem 1.25rem',
                    marginBottom: '1.25rem'
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        Score P(Legítimo | X):
                      </span>
                      <span style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: '1.15rem',
                        fontWeight: 800,
                        color: lastResult.decision === 'ALLOW' ? 'var(--success)' : lastResult.decision === 'CHALLENGE' ? 'var(--warning)' : 'var(--danger)'
                      }}>
                        {lastResult.score_pct}% ({lastResult.decision})
                      </span>
                    </div>

                    {/* Barra de 3 zonas con aguja */}
                    <div style={{
                      height: 14,
                      backgroundColor: 'var(--bg-surface)',
                      borderRadius: 9999,
                      position: 'relative',
                      overflow: 'hidden',
                      display: 'flex',
                      marginBottom: '0.5rem',
                      border: '1px solid var(--border-subtle)'
                    }}>
                      <div style={{ width: '70%', backgroundColor: 'rgba(239, 68, 68, 0.65)' }} title="Zona REJECT (< 70%)" />
                      <div style={{ width: '15%', backgroundColor: 'rgba(245, 158, 11, 0.65)' }} title="Zona CHALLENGE (70% - 85%)" />
                      <div style={{ width: '15%', backgroundColor: 'rgba(16, 185, 129, 0.65)' }} title="Zona ACCEPT (≥ 85%)" />

                      {/* Aguja animada */}
                      <div
                        style={{
                          position: 'absolute',
                          top: -2,
                          bottom: -2,
                          width: 4,
                          backgroundColor: '#ffffff',
                          borderRadius: 2,
                          boxShadow: '0 0 8px rgba(0,0,0,0.8), 0 0 12px #ffffff',
                          left: `${Math.max(0, Math.min(100, lastResult.score_pct))}%`,
                          transition: 'left 0.45s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-muted)' }}>
                      <span style={{ color: 'var(--danger)' }}>0% REJECT</span>
                      <span style={{ color: 'var(--warning)' }}>70% CHALLENGE</span>
                      <span style={{ color: 'var(--success)' }}>85% ACCEPT</span>
                    </div>
                  </div>

                  {/* Grid de Métricas de la Muestra */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
                    <div style={{
                      backgroundColor: 'var(--bg-canvas)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.5rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Velocidad</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace' }}>
                        {lastResult.metrics?.wpm || 0} WPM
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: 'var(--bg-canvas)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.5rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Duración</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace' }}>
                        {((lastResult.metrics?.total_duration_ms || 0) / 1000).toFixed(1)}s
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: 'var(--bg-canvas)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.5rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Hold Med.</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace' }}>
                        {lastResult.metrics?.hold_mean_ms || 0}ms
                      </div>
                    </div>

                    <div style={{
                      backgroundColor: 'var(--bg-canvas)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      padding: '0.5rem',
                      textAlign: 'center'
                    }}>
                      <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Latencia</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, fontFamily: 'monospace' }}>
                        {lastResult.metrics?.latency_mean_ms || 0}ms
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '1rem', textAlign: 'center' }}>
              Los intentos de impostores verifican el modelo sin alterar el buffer de reentrenamiento.
            </div>
          </div>
        </div>

        {/* Panel Comparativo y Evidencia Visual para el Profesor */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-xl)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-md)',
          marginBottom: '2rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <TrendingUp size={20} style={{ color: 'var(--brand-500)' }} />
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0 }}>
                  Panel Comparativo de la Demostración en Vivo
                </h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0' }}>
                Evidencia empírica acumulada: comprueba la separación entre los intentos del dueño legítimo vs. intentos ajenos.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Total intentos en vivo: <b>{stats.total}</b>
              </span>
            </div>
          </div>

          {/* Tarjetas KPI de Separación */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '1rem',
            marginBottom: '1.5rem'
          }}>
            <div style={{
              backgroundColor: 'var(--bg-canvas)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                PROMEDIO INTENTOS DUEÑO
              </div>
              <div style={{
                fontSize: '1.6rem',
                fontWeight: 800,
                color: stats.avgLegit ? 'var(--success)' : 'var(--text-muted)',
                fontFamily: "'JetBrains Mono', monospace",
                margin: '0.25rem 0'
              }}>
                {stats.avgLegit ? `${stats.avgLegit}%` : 'Sin datos'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                {stats.nLegit} intento(s) legítimo(s)
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--bg-canvas)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                PROMEDIO INTENTOS AJENOS
              </div>
              <div style={{
                fontSize: '1.6rem',
                fontWeight: 800,
                color: stats.avgImpostor ? 'var(--danger)' : 'var(--text-muted)',
                fontFamily: "'JetBrains Mono', monospace",
                margin: '0.25rem 0'
              }}>
                {stats.avgImpostor ? `${stats.avgImpostor}%` : 'Sin datos'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                {stats.nImpostor} intento(s) de impostor(es)
              </div>
            </div>

            <div style={{
              backgroundColor: 'var(--bg-canvas)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1rem',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>
                MARGEN DE SEPARACIÓN (&Delta;)
              </div>
              <div style={{
                fontSize: '1.6rem',
                fontWeight: 800,
                color: stats.separationDelta !== null && Number(stats.separationDelta) > 40
                  ? 'var(--brand-500)'
                  : stats.separationDelta !== null
                  ? 'var(--warning)'
                  : 'var(--text-muted)',
                fontFamily: "'JetBrains Mono', monospace",
                margin: '0.25rem 0'
              }}>
                {stats.separationDelta !== null ? `+${stats.separationDelta}%` : 'Pendiente'}
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                Discriminación neta entre clases
              </div>
            </div>
          </div>

          {/* Gráfico de Dispersión / Distribución de Scores en Vivo */}
          {history.length > 0 && (
            <div style={{
              backgroundColor: 'var(--bg-canvas)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.25rem',
              marginBottom: '1.5rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Distribución de Scores por Intento en Vivo (Eje Vertical: % de Confianza)
                </span>
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.75rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--success)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--success)' }} />
                    Dueño Legítimo
                  </span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--danger)' }}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: 'var(--danger)' }} />
                    Otra Persona (Impostor)
                  </span>
                </div>
              </div>

              <div style={{ height: 260, width: '100%' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ScatterChart margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
                    <XAxis
                      dataKey="intento"
                      name="Intento #"
                      unit=""
                      tickLine={false}
                      axisLine={{ stroke: 'var(--border-subtle)' }}
                      stroke="var(--text-muted)"
                      fontSize={12}
                    />
                    <YAxis
                      dataKey="score"
                      name="Score"
                      unit="%"
                      domain={[0, 100]}
                      tickLine={false}
                      axisLine={{ stroke: 'var(--border-subtle)' }}
                      stroke="var(--text-muted)"
                      fontSize={12}
                    />
                    <ZAxis range={[120, 120]} />
                    <Tooltip
                      cursor={{ strokeDasharray: '3 3' }}
                      content={({ active, payload }) => {
                        if (active && payload && payload.length) {
                          const data = payload[0].payload;
                          return (
                            <div style={{
                              backgroundColor: 'var(--bg-surface-elevated)',
                              border: '1px solid var(--border-subtle)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '0.5rem 0.75rem',
                              fontSize: '0.78rem',
                              boxShadow: 'var(--shadow-md)'
                            }}>
                              <div style={{ fontWeight: 700, color: data.attempt_type === 'legitimate' ? 'var(--success)' : 'var(--danger)' }}>
                                {data.tipo} (Intento #{data.intento})
                              </div>
                              <div>Score: <b>{data.score}%</b></div>
                              <div>Decisión: <b>{data.decision}</b></div>
                              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Hora: {data.hora}</div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    {/* Líneas de umbrales */}
                    <ReferenceLine y={85} stroke="var(--success)" strokeDasharray="4 4" label={{ value: 'ACCEPT (≥85%)', fill: 'var(--success)', fontSize: 11, position: 'right' }} />
                    <ReferenceLine y={70} stroke="var(--warning)" strokeDasharray="4 4" label={{ value: 'CHALLENGE (70%)', fill: 'var(--warning)', fontSize: 11, position: 'right' }} />

                    <Scatter data={scatterData}>
                      {scatterData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.attempt_type === 'legitimate' ? 'var(--success)' : 'var(--danger)'}
                          stroke="#ffffff"
                          strokeWidth={1.5}
                        />
                      ))}
                    </Scatter>
                  </ScatterChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Tabla de Registro Histórico de la Demostración */}
          {history.length > 0 ? (
            <div style={{ overflowX: 'auto' }}>
              <table style={{
                width: '100%',
                borderCollapse: 'collapse',
                fontSize: '0.82rem',
                textAlign: 'left'
              }}>
                <thead>
                  <tr style={{
                    borderBottom: '2px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    fontSize: '0.72rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    <th style={{ padding: '0.65rem 0.75rem' }}>#</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Tipo de Intento</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Hora</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Score Biométrico</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Zona Resultante</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Velocidad</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Duración</th>
                    <th style={{ padding: '0.65rem 0.75rem' }}>Veredicto de Seguridad</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((h, i) => {
                    const isLegit = h.attempt_type === 'legitimate';
                    return (
                      <tr
                        key={h.id}
                        style={{
                          borderBottom: '1px solid var(--border-subtle)',
                          backgroundColor: i % 2 === 0 ? 'transparent' : 'var(--bg-canvas)'
                        }}
                      >
                        <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'monospace', fontWeight: 600 }}>
                          #{history.length - i}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          <span style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.35rem',
                            fontWeight: 700,
                            color: isLegit ? 'var(--success)' : 'var(--danger)'
                          }}>
                            {isLegit ? <UserCheck size={14} /> : <UserX size={14} />}
                            {isLegit ? 'Dueño Legítimo' : 'Otra Persona'}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                          {h.timestamp}
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'monospace', fontWeight: 800 }}>
                          <span style={{
                            color: h.decision === 'ALLOW' ? 'var(--success)' : h.decision === 'CHALLENGE' ? 'var(--warning)' : 'var(--danger)'
                          }}>
                            {h.score_pct}%
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.45rem',
                            borderRadius: '4px',
                            backgroundColor: h.decision === 'ALLOW' ? 'var(--success-bg)' : h.decision === 'CHALLENGE' ? 'var(--warning-bg)' : 'var(--danger-bg)',
                            color: h.decision === 'ALLOW' ? 'var(--success)' : h.decision === 'CHALLENGE' ? 'var(--warning)' : 'var(--danger)',
                            border: `1px solid ${h.decision === 'ALLOW' ? 'var(--success-border)' : h.decision === 'CHALLENGE' ? 'var(--warning-border)' : 'var(--danger-border)'}`
                          }}>
                            {h.decision}
                          </span>
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'monospace' }}>
                          {h.metrics?.wpm || 0} WPM
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem', fontFamily: 'monospace' }}>
                          {((h.metrics?.total_duration_ms || 0) / 1000).toFixed(1)}s
                        </td>
                        <td style={{ padding: '0.65rem 0.75rem' }}>
                          {isLegit ? (
                            h.decision === 'ALLOW' || h.decision === 'CHALLENGE' ? (
                              <span style={{ color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <CheckCircle2 size={13} /> Acceso Correcto
                              </span>
                            ) : (
                              <span style={{ color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <XCircle size={13} /> Falso Rechazo
                              </span>
                            )
                          ) : (
                            h.decision === 'REJECT' || h.decision === 'CHALLENGE' ? (
                              <span style={{ color: 'var(--success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <ShieldCheck size={13} /> Impostor Frenado
                              </span>
                            ) : (
                              <span style={{ color: 'var(--danger)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                                <AlertTriangle size={13} /> Falsa Aceptación
                              </span>
                            )
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: 'var(--text-muted)',
              fontSize: '0.85rem'
            }}>
              Aún no hay intentos registrados en esta sesión de demo. Selecciona el modo arriba y comienza a teclear.
            </div>
          )}
        </div>

        {/* Modal de Evidencia de los 3 Algoritmos Candidatos */}
        {showComparisonModal && (
          <div style={{
            position: 'fixed',
            top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem'
          }}>
            <div style={{
              maxWidth: '1150px',
              width: '100%',
              maxHeight: '92vh',
              overflowY: 'auto',
              backgroundColor: 'var(--bg-surface)',
              borderRadius: 'var(--radius-xl)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-xl)'
            }}>
              <div style={{
                padding: '1rem 1.5rem',
                borderBottom: '1px solid var(--border-subtle)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                position: 'sticky',
                top: 0,
                backgroundColor: 'var(--bg-surface)',
                zIndex: 10
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <Award size={20} style={{ color: 'var(--brand-500)' }} />
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700 }}>
                      Evidencia de Comparación y Selección Óptima: {currentUser?.username}
                    </h3>
                    <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Validación cruzada sobre muestras legítimas del usuario frente a impostores registrados y CMU Benchmark
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowComparisonModal(false)}
                  className="btn-secondary"
                  style={{ fontSize: '0.8rem', padding: '0.4rem 0.85rem' }}
                >
                  Cerrar
                </button>
              </div>

              <div style={{ padding: '1.25rem' }}>
                <ModelComparisonPanel
                  userId={currentUser?.id}
                  onModelUpdated={fetchEnrolledUsers}
                />
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
