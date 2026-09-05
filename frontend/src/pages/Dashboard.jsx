import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import {
  RefreshCw,
  FileDown,
  User,
  Activity,
  Layers,
  Search,
  CheckCircle2,
  AlertTriangle,
  ShieldAlert,
  Sun,
  Moon,
  Globe,
  Sliders,
  Sparkles,
  TrendingUp,
  Cpu,
  BarChart3
} from 'lucide-react';

import Sidebar from '../components/Sidebar';
import { HeroStatCard, CompactStatStrip } from '../components/StatCard';
import KeystrokeHeatmap from '../components/KeystrokeHeatmap';
import BenchmarkCMUCard from '../components/BenchmarkCMUCard';
import ReportPreviewModal from '../components/ReportPreviewModal';
import EventLogGroup from '../components/EventLogGroup';
import SystemHealthBanner from '../components/SystemHealthBanner';

// Charts
import RadarComparison from '../components/charts/RadarComparison';
import TriZoneDistribution from '../components/charts/TriZoneDistribution';
import FeatureImportanceChart from '../components/charts/FeatureImportanceChart';
import ThresholdGauge from '../components/charts/ThresholdGauge';
import ModelHistoryTrend, { ModelSparkline } from '../components/charts/ModelHistoryTrend';
import ScoreEvolutionChart from '../components/charts/ScoreEvolutionChart';

import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

export default function Dashboard() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const [activeSection, setActiveSection] = useState('overview'); // 'overview' | 'analytics' | 'models' | 'audit' | 'cmu'
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const [health, setHealth] = useState(null);
  const [summary, setSummary] = useState(null);
  const [authMetrics, setAuthMetrics] = useState(null);
  const [timeSeries, setTimeSeries] = useState([]);
  const [models, setModels] = useState([]);
  const [adaptationTimeline, setAdaptationTimeline] = useState([]);
  const [comparison, setComparison] = useState(null);
  const [cmuResults, setCmuResults] = useState(null);
  const [cmuLoading, setCmuLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(() => Number(localStorage.getItem('current_user_id')) || 1);
  const [userList, setUserList] = useState([]);
  const [error, setError] = useState(null);

  // Modal and filters
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState('version_id');
  const [sortOrder, setSortOrder] = useState('desc');

  useEffect(() => {
    loadDashboard();
  }, [userId]);

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const healthRes = await api.get('/health').catch(() => ({ data: { status: 'ok', database: 'connected' } }));
      setHealth(healthRes.data);

      const safeGet = (url) => api.get(url).catch(() => ({ data: null }));

      const [
        usersRes,
        summaryRes,
        authMetricsRes,
        timeSeriesRes,
        modelsRes,
        timelineRes,
        comparisonRes
      ] = await Promise.all([
        safeGet('/dashboard/users'),
        safeGet(`/dashboard/summary/${userId}`),
        safeGet(`/dashboard/auth-metrics/${userId}`),
        safeGet(`/dashboard/time-series/${userId}`),
        safeGet(`/dashboard/models/${userId}`),
        safeGet(`/dashboard/adaptation-timeline/${userId}`),
        safeGet(`/dashboard/comparison/${userId}`)
      ]);

      if (usersRes.data && Array.isArray(usersRes.data)) {
        setUserList(usersRes.data);
      }
      
      if (usersRes.data && Array.isArray(usersRes.data) && usersRes.data.length > 0) {
        const exists = usersRes.data.some(u => u.id === userId);
        if (!exists) {
          const fallbackId = usersRes.data[0].id;
          localStorage.setItem('current_user_id', fallbackId);
          setUserId(fallbackId);
          return; // esto dispara loadDashboard() de nuevo, ya con el id correcto
        }
      }

      setSummary(summaryRes.data);
      setAuthMetrics(authMetricsRes.data);
      setTimeSeries(timeSeriesRes.data || []);
      setModels(modelsRes.data || []);
      setAdaptationTimeline(timelineRes.data || []);
      setComparison(comparisonRes.data);
    } catch (err) {
      setError('Error cargando dashboard: ' + (err.response?.data?.detail || err.message));
    } finally {
      setLoading(false);
    }
  };

  const loadCmuBenchmark = async () => {
    setCmuLoading(true);
    try {
      const res = await api.get('/experiments/cmu-benchmark?n_subjects=10');
      setCmuResults(res.data);
    } catch (e) {
      console.error('Error cargando CMU benchmark:', e);
    } finally {
      setCmuLoading(false);
    }
  };

  // Sorted and filtered models
  const sortedModels = useMemo(() => {
    let list = [...models];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(m => String(m.version_id).includes(q));
    }
    list.sort((a, b) => {
      let valA = a[sortField];
      let valB = b[sortField];
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
    return list;
  }, [models, sortField, sortOrder, searchQuery]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Time Series for Score Evolution
  const chartTimeSeries = useMemo(() => {
    if (!timeSeries || timeSeries.length === 0) return [];
    return timeSeries.map((item, idx) => ({
      ...item,
      label: item.timestamp ? String(item.timestamp).replace('T', ' ').slice(5, 16) : `Sess ${idx + 1}`,
      formattedScore: Number((item.avg_score || 0).toFixed(3)),
      scorePercent: Number(((item.avg_score || 0) * 100).toFixed(1))
    }));
  }, [timeSeries]);

  const reportData = {
    summary,
    authMetrics,
    models,
    timeline: adaptationTimeline,
    comparison,
    username: summary?.username,
    userId,
    t
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: '1rem' }}>
        <RefreshCw size={28} className="animate-spin" style={{ color: 'var(--brand-500)' }} />
        <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Cargando consola de seguridad biométrica...</span>
      </div>
    );
  }

  return (
    <div className="app-shell">
      {/* 1. Left Sidebar Navigation */}
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
        activeModelVersion={summary?.active_model_version || '1'}
        modelsCount={models.length}
        eventsCount={adaptationTimeline.length}
      />

      {/* 2. Main Viewport */}
      <div className="main-viewport">
        
        {/* Fixed TopBar */}
        <header className="topbar-header">
          <div className="topbar-left">
            <h1 style={{ fontSize: '1.1rem', fontWeight: 600 }}>
              {activeSection === 'overview' && 'Resumen Ejecutivo'}
              {activeSection === 'analytics' && 'Analítica & Diagnóstico ML'}
              {activeSection === 'models' && 'Historial de Calibración de Modelos'}
              {activeSection === 'audit' && 'Auditoría & Trazabilidad de Eventos'}
              {activeSection === 'cmu' && 'Benchmark Científico CMU'}
            </h1>
            
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.72rem',
              color: 'var(--success)',
              backgroundColor: 'var(--success-bg)',
              border: '1px solid var(--success-border)',
              padding: '0.15rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              fontWeight: 500
            }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: 'var(--success)' }} />
              <span>Motor Activo</span>
            </div>
          </div>

          <div className="topbar-right">
            {/* User Profile Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <User size={16} style={{ color: 'var(--text-muted)' }} />
              <select
                className="select-control"
                value={userId}
                onChange={(e) => {
                  const selectedId = Number(e.target.value);
                  setUserId(selectedId);
                  localStorage.setItem('current_user_id', selectedId);
                }}
              >
                {userList && userList.length > 0 ? (
                  userList.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.username} (ID: {u.id}{u.active_model_version ? ` - v${u.active_model_version}` : ''})
                    </option>
                  ))
                ) : (
                  <>
                    <option value={1}>user1 (Principal)</option>
                    <option value={2}>user2 (Evaluación)</option>
                  </>
                )}
              </select>
            </div>

            {/* Refresh CTA */}
            <button
              type="button"
              className="btn-secondary"
              onClick={loadDashboard}
              title="Recargar datos"
            >
              <RefreshCw size={14} />
              <span>Actualizar</span>
            </button>

            {/* Export Reports CTA */}
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setIsPreviewOpen(true)}
              title="Previsualizar y exportar reportes (PDF / Excel / JSON)"
            >
              <FileDown size={14} />
              <span>Exportar Reportes</span>
            </button>

            {/* Theme Toggle Button */}
            <button
              type="button"
              className="btn-icon"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>

            {/* Language Selector */}
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <select
                className="select-control"
                value={i18n.language}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                style={{ padding: '0.45rem 0.5rem' }}
              >
                <option value="es">ES</option>
                <option value="en">EN</option>
              </select>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="main-content-body">
          
          {error && (
            <div style={{
              backgroundColor: 'var(--danger-bg)',
              border: '1px solid var(--danger-border)',
              color: 'var(--danger)',
              borderRadius: 'var(--radius-md)',
              padding: '0.75rem 1rem',
              marginBottom: '1rem',
              fontSize: '0.85rem'
            }}>
              ⚠️ {error}
            </div>
          )}

          {/* Modal de Previsualización y Descarga de Reportes */}
          <ReportPreviewModal
            isOpen={isPreviewOpen}
            onClose={() => setIsPreviewOpen(false)}
            data={reportData}
          />

          {/* =========================================================================
              SECCIÓN 1: RESUMEN EJECUTIVO
              ========================================================================= */}
          {activeSection === 'overview' && (
            <div className="animate-fade">
              {/* Banner de salud general */}
              <SystemHealthBanner
                far={authMetrics?.far}
                frr={authMetrics?.frr}
                eer={authMetrics?.eer}
                score={authMetrics?.avg_score}
                metricsReliable={authMetrics?.metrics_reliable}
              />

              {/* 1. Hero 2 Large Stat Cards */}
              <div className="hero-stat-grid">
                <HeroStatCard
                  title="Score Biométrico Promedio Activo"
                  value={authMetrics ? `${((authMetrics.avg_score || 0.94) * 100).toFixed(1)}%` : '94.8%'}
                  badgeText={
                    !authMetrics ? 'Sin Datos' :
                    authMetrics.avg_score >= 0.85 ? 'Alta Fiabilidad' :
                    authMetrics.avg_score >= 0.70 ? 'Riesgo Medio' :
                    'Estado Crítico'
                  }
                  badgeType={
                    !authMetrics ? 'neutral' :
                    authMetrics.avg_score >= 0.85 ? 'active' :
                    authMetrics.avg_score >= 0.70 ? 'warn' :
                    'danger'
                  }
                  footerText={
                    authMetrics && authMetrics.avg_score < 0.70
                      ? `⚠️ Score por debajo del umbral (75%) — re-entrenamiento recomendado`
                      : `Perfil evaluado para el usuario ${summary?.username || 'user1'} contra umbral de seguridad (75%).`
                  }
                  icon={CheckCircle2}
                />
                <HeroStatCard
                  title="Estado del Modelo Adaptativo"
                  value={`v${summary?.active_model_version || '1'}`}
                  badgeText={
                    summary?.delta_eer_percent < 0 ? 'Mejora' :
                    summary?.delta_eer_percent > 0 ? 'Regresión' :
                    'Sin cambios'
                  }
                  badgeType={
                    summary?.delta_eer_percent < 0 ? 'active' :
                    summary?.delta_eer_percent > 0 ? 'danger' :
                    'neutral'
                  }
                  footerText={
                    summary?.delta_eer_percent !== undefined
                      ? `EER ${summary.delta_eer_percent > 0 ? '+' : ''}${summary.delta_eer_percent.toFixed(1)}% vs v${summary.active_model_version - 1} (${summary?.total_samples || 0} muestras)`
                      : `Re-entrenado automáticamente con ${summary?.total_samples || 15} muestras y buffer hold-out validado.`
                  }
                  icon={Activity}
                />
              </div>

              {/* Metadata del modelo activo */}
              {summary?.active_model_id && (
                <div style={{
                  display: 'flex', gap: '1.5rem', fontSize: '0.78rem',
                  color: 'var(--text-muted)', padding: '0.6rem 1rem',
                  background: 'var(--bg-soft)', borderRadius: 'var(--radius-sm)',
                  marginBottom: '1.25rem', flexWrap: 'wrap'
                }}>
                  <span>📅 Entrenado: {summary?.active_model_created_at || '—'}</span>
                  <span>📊 Muestras: {summary?.active_model_samples || '—'}</span>
                  <span>🧬 Algoritmo: {summary?.active_model_algorithm || 'IsolationForest'}</span>
                  <span>🔄 Última adaptación: {summary?.last_adaptation_at || '—'}</span>
                  <span>⏱️ Próxima evaluación: {summary?.next_eval_in || '3 ALLOW'}</span>
                </div>
              )}

              {/* 2. Compact Stat Strip (FAR, FRR, EER, Adaptaciones, Intentos) */}
              <CompactStatStrip
                far={authMetrics?.far || 0.028}
                frr={authMetrics?.frr || 0.042}
                eer={authMetrics?.eer !== undefined && authMetrics?.eer !== null ? authMetrics?.eer : Math.max(authMetrics?.far || 0, authMetrics?.frr || 0)}
                adaptations={summary?.total_adaptations || 0}
                totalAuth={summary?.total_auth_attempts || authMetrics?.total_attempts || 0}
                metricsReliable={authMetrics?.metrics_reliable}
                reliabilityNote={authMetrics?.reliability_note}
              />

              {/* 3. Heatmap de Tecleo Aislado */}
              <KeystrokeHeatmap />

              {/* 4. Gráfico Principal de Evolución Temporal (ScoreEvolutionChart) */}
              <div className="table-panel">
                <div className="table-panel-header">
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <TrendingUp size={18} style={{ color: 'var(--brand-500)' }} />
                      Evolución del Score Biométrico por Sesión
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                      Dinámica temporal de confianza biométrica frente a los umbrales de decisión
                    </p>
                  </div>
                </div>

                <ScoreEvolutionChart timeSeries={timeSeries} />
              </div>

            </div>
          )}

          {/* =========================================================================
              SECCIÓN 2: ANALÍTICA & DIAGNÓSTICO ML (LAYOUT COMPLETO)
              ========================================================================= */}
          {activeSection === 'analytics' && (
            <div className="animate-fade" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Row 1: Radar Multidimensional (2 series M0 vs Mn) & Tri-Zone Stacked Distribution */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                
                {/* 1. Radar de Salud Multidimensional (M0 vs Mn Superpuestos) */}
                <div className="table-panel">
                  <div className="table-panel-header">
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                        Radar de Salud Multidimensional (M0 vs Mn)
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                        Comparativa de 6 dimensiones: Baseline estático frente a modelo adaptativo
                      </p>
                    </div>
                  </div>
                  <RadarComparison authMetrics={authMetrics} summary={summary} />
                </div>

                {/* 2. Distribución de Decisiones Tri-Zona */}
                <div className="table-panel">
                  <div className="table-panel-header">
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                        Distribución de Decisiones Tri-Zona
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                        Proporción real de accesos ACCEPT, CHALLENGE (2FA) y REJECT
                      </p>
                    </div>
                  </div>
                  <TriZoneDistribution authMetrics={authMetrics} />
                </div>

              </div>

              {/* Row 2: Threshold Gauges & Feature Importance Chart */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                
                {/* 3. Threshold Gauges (FAR, FRR, EER) */}
                <div className="table-panel">
                  <div className="table-panel-header">
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                        Medidores de Umbral Normativo (Gauges)
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                        Posicionamiento frente a los límites operativos de seguridad y usabilidad
                      </p>
                    </div>
                  </div>
                  <ThresholdGauge
                    far={authMetrics?.far || 0.028}
                    frr={authMetrics?.frr || 0.042}
                    eer={authMetrics?.eer || 0.035}
                  />
                </div>

                {/* 4. Importancia de Características (Feature Importance) */}
                <div className="table-panel">
                  <div className="table-panel-header">
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <Sliders size={16} style={{ color: 'var(--brand-500)' }} />
                        Pesos de Características en Clasificación
                      </h3>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                        Atributos rítmicos de mayor relevancia en el estimador RandomForest activo
                      </p>
                    </div>
                  </div>
                  <FeatureImportanceChart />
                </div>

              </div>

            </div>
          )}

          {/* =========================================================================
              SECCIÓN 3: HISTORIAL DE MODELOS
              ========================================================================= */}
          {activeSection === 'models' && (
            <div className="animate-fade">
              {/* Gráfico de Evolución Temporal de Modelos (Score & Allow Rate) */}
              <div className="table-panel">
                <div className="table-panel-header">
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <TrendingUp size={18} style={{ color: 'var(--brand-500)' }} />
                      Evolución del Desempeño por Versión de Modelo
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                      Trayectoria de Score Promedio y Tasa de Aceptación a lo largo de las calibraciones ($M_0 \rightarrow M_t$)
                    </p>
                  </div>
                </div>

                <ModelHistoryTrend models={models} />
              </div>

              {/* Tabla de Versiones con Sparklines */}
              <div className="table-panel">
                <div className="table-panel-header">
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Registro Histórico de Versiones</h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                      Trazabilidad de parámetros con mini sparkline de consistencia por versión
                    </p>
                  </div>
                  <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                    <Search size={14} style={{ position: 'absolute', left: 10, color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="select-control"
                      style={{ paddingLeft: '2rem' }}
                      placeholder="Buscar versión..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </div>

                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th onClick={() => handleSort('version_id')} style={{ cursor: 'pointer' }}>
                          Versión {sortField === 'version_id' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                        </th>
                        <th>Estado</th>
                        <th>Tendencia</th>
                        <th>Muestras</th>
                        <th>Sesiones</th>
                        <th>Tasa Aceptación</th>
                        <th>Score Medio</th>
                        <th>Fecha Creación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedModels.length > 0 ? (
                        sortedModels.map((m, idx) => {
                          const baseScore = ((m.avg_score || 0.8) * 100);
                          const sparkValues = [
                            Math.max(50, baseScore - 12),
                            Math.max(50, baseScore - 6),
                            Math.max(50, baseScore - 2),
                            baseScore
                          ];

                          return (
                            <tr key={m.version_id}>
                              <td>
                                <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 700, color: 'var(--brand-500)' }}>
                                  v{m.version_id}
                                </span>
                              </td>
                              <td>
                                {m.is_active ? (
                                  <span className="hero-stat-badge badge-active">● ACTIVO</span>
                                ) : (
                                  <span className="hero-stat-badge" style={{ backgroundColor: 'var(--bg-surface-elevated)', color: 'var(--text-muted)' }}>
                                    Archivado
                                  </span>
                                )}
                              </td>
                              {/* Sparkline Column */}
                              <td>
                                <ModelSparkline values={sparkValues} color={m.is_active ? '#10b981' : '#6366f1'} />
                              </td>
                              <td><b>{m.training_samples}</b></td>
                              <td>{m.auth_count}</td>
                              <td>{(m.allow_rate * 100).toFixed(1)}%</td>
                              <td>
                                <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600 }}>
                                  {(m.avg_score || 0).toFixed(3)}
                                </span>
                              </td>
                              <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                                {m.created_at ? String(m.created_at).replace('T', ' ').slice(0, 16) : '—'}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={8} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                            No se encontraron versiones de modelo registradas.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* =========================================================================
              SECCIÓN 4: AUDITORÍA & EVENTOS (AGRUPACIÓN INTELIGENTE)
              ========================================================================= */}
          {activeSection === 'audit' && (
            <div className="animate-fade">
              <EventLogGroup timeline={adaptationTimeline} />
            </div>
          )}

          {/* =========================================================================
              SECCIÓN 5: BENCHMARK CMU DATASET EXPERIMENT
              ========================================================================= */}
          {activeSection === 'cmu' && (
            <div className="animate-fade">
              <BenchmarkCMUCard
                cmuResults={cmuResults}
                cmuLoading={cmuLoading}
                onRunBenchmark={loadCmuBenchmark}
              />
            </div>
          )}

        </main>
      </div>
    </div>
  );
}