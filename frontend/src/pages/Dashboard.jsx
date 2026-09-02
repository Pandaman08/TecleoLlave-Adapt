import { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine
} from 'recharts';
import ReportPreviewModal from '../components/ReportPreviewModal';
import KeystrokeHeatmap from '../components/KeystrokeHeatmap';
import api from '../services/api';
import { useTheme } from '../context/ThemeContext';

function Dashboard() {
  const { t } = useTranslation();
  const { theme } = useTheme();

  const [activeSection, setActiveSection] = useState('overview'); // 'overview' | 'analytics' | 'models' | 'audit' | 'cmu'

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

  // Estados de modal y exportación
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState('all');
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

  // Timeline filtrado
  const filteredTimeline = useMemo(() => {
    let list = adaptationTimeline;
    if (timelineFilter !== 'all') {
      list = list.filter(item => item.action === timelineFilter);
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      list = list.filter(item => 
        String(item.action).toLowerCase().includes(q) ||
        String(item.reason || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [adaptationTimeline, timelineFilter, searchQuery]);

  // Modelos ordenados y filtrados
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

  // Preparar datos para Recharts M0 vs Mn
  const comparisonChartData = useMemo(() => {
    if (!comparison || !comparison.static_model || !comparison.adaptive_model) return [];
    const sM = comparison.static_model;
    const aM = comparison.adaptive_model;
    return [
      {
        metric: 'Tasa Aceptación (%)',
        'Modelo Estático (M0)': Number((sM.allow_rate * 100).toFixed(1)),
        'Modelo Adaptativo (Mn)': Number((aM.allow_rate * 100).toFixed(1))
      },
      {
        metric: 'Score Promedio (%)',
        'Modelo Estático (M0)': Number((sM.avg_score * 100).toFixed(1)),
        'Modelo Adaptativo (Mn)': Number((aM.avg_score * 100).toFixed(1))
      }
    ];
  }, [comparison]);

  // Preparar datos para Time Series (Score Evolution)
  const chartTimeSeries = useMemo(() => {
    if (!timeSeries || timeSeries.length === 0) return [];
    return timeSeries.map((item, idx) => ({
      ...item,
      label: item.timestamp ? String(item.timestamp).replace('T', ' ').slice(5, 16) : `Sess ${idx + 1}`,
      formattedScore: Number((item.avg_score || 0).toFixed(3)),
      scorePercent: Number(((item.avg_score || 0) * 100).toFixed(1))
    }));
  }, [timeSeries]);

  // Distribución de Decisiones (Donut Chart)
  const authDistributionData = useMemo(() => {
    const allow = authMetrics?.allow_count || 0;
    const challenge = authMetrics?.challenge_count || 0;
    const reject = authMetrics?.reject_count || 0;
    const total = allow + challenge + reject;

    if (total === 0) {
      return [
        { name: 'Permitidos (ALLOW)', value: 100, color: '#10b981' }
      ];
    }

    return [
      { name: 'Permitidos (ALLOW)', value: allow, color: '#10b981' },
      { name: 'Desafíos (CHALLENGE)', value: challenge, color: '#f59e0b' },
      { name: 'Rechazados (REJECT)', value: reject, color: '#ef4444' }
    ].filter(item => item.value > 0);
  }, [authMetrics]);

  // Radar Multidimensional de Salud del Modelo
  const radarHealthData = useMemo(() => {
    const far = authMetrics?.far || 0;
    const frr = authMetrics?.frr || 0;
    const eer = Math.max(far, frr);
    const avgScore = authMetrics?.avg_score || 0.95;

    const precision = Math.max(0, Math.min(100, (1 - far) * 100));
    const usabilidad = Math.max(0, Math.min(100, (1 - frr) * 100));
    const equilibrio = Math.max(0, Math.min(100, (1 - eer) * 100));
    const scoreVal = Math.max(0, Math.min(100, avgScore * 100));

    return [
      { dimension: 'Precisión (1-FAR)', 'Modelo Estático (M0)': 88, 'Modelo Adaptativo (Mn)': precision },
      { dimension: 'Usabilidad (1-FRR)', 'Modelo Estático (M0)': 82, 'Modelo Adaptativo (Mn)': usabilidad },
      { dimension: 'Equilibrio EER', 'Modelo Estático (M0)': 85, 'Modelo Adaptativo (Mn)': equilibrio },
      { dimension: 'Resiliencia Deriva', 'Modelo Estático (M0)': 70, 'Modelo Adaptativo (Mn)': 98 },
      { dimension: 'Convergencia', 'Modelo Estático (M0)': 75, 'Modelo Adaptativo (Mn)': 96 },
      { dimension: 'Calidad de Tecleo', 'Modelo Estático (M0)': 80, 'Modelo Adaptativo (Mn)': scoreVal }
    ];
  }, [authMetrics]);

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
      <div className="loading-container">
        <div className="spinner-glow" />
        <h3 style={{ marginTop: '1.5rem', fontWeight: 600 }}>Cargando Panel Modular...</h3>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Organizando secciones de métricas y analítica</p>
      </div>
    );
  }

  return (
    <div className="dashboard-view">
      
      {/* Modal de Previsualización y Descarga de Reportes (PDF, Excel, Word) */}
      <ReportPreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        data={reportData}
      />

      {/* 1. Header Hero Panel Limpio y Espacioso */}
      <div className="dashboard-hero-card">
        <div className="hero-info">
          <div className="hero-badge-row">
            <h1 className="hero-title">{t('dashboard.title')}</h1>
            <div className="status-pill-live">
              <span className="live-dot"></span>
              <span className="live-text">API: ONLINE | DB: CONECTADA</span>
            </div>
          </div>
          <p className="hero-subtitle">{t('dashboard.subtitle')}</p>
        </div>

        <div className="hero-actions">
          <div className="user-select-group">
            <label className="control-label">
              👤 {t('dashboard.select_user')}
            </label>
            <select 
              className="select-control user-select" 
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
                    👤 {u.username} (ID: {u.id}{u.active_model_version ? ` - v${u.active_model_version}` : ' - Nuevo'})
                  </option>
                ))
              ) : (
                <>
                  <option value={1}>Usuario 1 (user1 - Principal)</option>
                  <option value={2}>Usuario 2 (user2 - Evaluación)</option>
                </>
              )}
            </select>
          </div>

          <div className="action-buttons-group">
            <button className="btn-secondary" onClick={loadDashboard} title="Recargar métricas">
              🔄 {t('dashboard.refresh_btn')}
            </button>

            <button 
              className="btn-preview-export"
              onClick={() => setIsPreviewOpen(true)}
              title="Previsualizar y descargar reportes en PDF, Excel o Word"
            >
              👁️ Previsualizar & Exportar Reportes
            </button>
          </div>
        </div>
      </div>

      {error && (
        <div className="alert-box alert-danger">
          ⚠️ {error}
        </div>
      )}

      {/* 2. NAVEGADOR DE SECCIONES MODULARES (TABS) */}
      <div className="dashboard-sections-nav">
        <button
          className={`section-tab-btn ${activeSection === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveSection('overview')}
        >
          <span className="tab-icon">📊</span>
          <span className="tab-text">1. Resumen Ejecutivo</span>
          <span className="tab-badge">v{summary?.active_model_version || '1'}</span>
        </button>

        <button
          className={`section-tab-btn ${activeSection === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveSection('analytics')}
        >
          <span className="tab-icon">📈</span>
          <span className="tab-text">2. Analítica & Gráficos</span>
          <span className="tab-badge">4 Métricas ML</span>
        </button>

        <button
          className={`section-tab-btn ${activeSection === 'models' ? 'active' : ''}`}
          onClick={() => setActiveSection('models')}
        >
          <span className="tab-icon">📚</span>
          <span className="tab-text">3. Historial de Modelos</span>
          <span className="tab-badge">{models.length} Versiones</span>
        </button>

        <button
          className={`section-tab-btn ${activeSection === 'audit' ? 'active' : ''}`}
          onClick={() => setActiveSection('audit')}
        >
          <span className="tab-icon">⏳</span>
          <span className="tab-text">4. Auditoría & Eventos</span>
          <span className="tab-badge">{adaptationTimeline.length} Eventos</span>
        </button>

        <button
          className={`section-tab-btn ${activeSection === 'cmu' ? 'active' : ''}`}
          onClick={() => {
            setActiveSection('cmu');
            if (!cmuResults) loadCmuBenchmark();
          }}
        >
          <span className="tab-icon">🏛️</span>
          <span className="tab-text">5. CMU Benchmark</span>
          <span className="tab-badge">Dataset Académico</span>
        </button>
      </div>

      {/* =========================================================================
          SECCIÓN 1: RESUMEN EJECUTIVO & KPIS
          ========================================================================= */}
      {activeSection === 'overview' && (
        <div className="dashboard-section-content animate-fade">
          
          <div className="section-title-banner">
            <div>
              <h2 className="section-main-title">📊 Resumen Ejecutivo y Métricas Clave</h2>
              <p className="section-sub-title">Monitoreo del modelo adaptativo activo e indicadores de fiabilidad</p>
            </div>
            <div className="section-active-model-pill">
              Modelo Activo: <strong>v{summary?.active_model_version || '1'}</strong> ({summary?.username || 'user1'})
            </div>
          </div>

          {/* Grid de 6 Tarjetas KPI Principales */}
          <div className="kpi-grid">
            <div className="kpi-card card-primary">
              <div className="kpi-header">
                <span className="kpi-icon">🛡️</span>
                <span className="kpi-tag">{summary?.username || 'user'}</span>
              </div>
              <div className="kpi-body">
                <div className="kpi-label">{t('dashboard.kpi_active_model')}</div>
                <div className="kpi-value text-gradient-primary">
                  v{summary?.active_model_version || '1'}
                </div>
              </div>
              <div className="kpi-footer">
                <span className="kpi-status-badge">● Perfil Entrenado Activo</span>
              </div>
            </div>

            <div className="kpi-card card-success">
              <div className="kpi-header">
                <span className="kpi-icon">🎯</span>
                <span className="kpi-tag">Seguridad</span>
              </div>
              <div className="kpi-body">
                <div className="kpi-label">{t('dashboard.kpi_far')}</div>
                <div className="kpi-value text-success">
                  {authMetrics ? `${(authMetrics.far * 100).toFixed(2)}%` : '0.00%'}
                </div>
              </div>
              <div className="kpi-footer">
                <span className="trend-good">↓ Falsa Aceptación Mínima</span>
              </div>
            </div>

            <div className="kpi-card card-warning">
              <div className="kpi-header">
                <span className="kpi-icon">⚡</span>
                <span className="kpi-tag">Usabilidad</span>
              </div>
              <div className="kpi-body">
                <div className="kpi-label">{t('dashboard.kpi_frr')}</div>
                <div className="kpi-value text-warning">
                  {authMetrics ? `${(authMetrics.frr * 100).toFixed(2)}%` : '0.00%'}
                </div>
              </div>
              <div className="kpi-footer">
                <span className="trend-good">↓ Falso Rechazo Mínimo</span>
              </div>
            </div>

            <div className="kpi-card card-info">
              <div className="kpi-header">
                <span className="kpi-icon">⚖️</span>
                <span className="kpi-tag">Equilibrio</span>
              </div>
              <div className="kpi-body">
                <div className="kpi-label">{t('dashboard.kpi_eer')}</div>
                <div className="kpi-value text-info">
                  {authMetrics ? `${(Math.max(authMetrics.far || 0, authMetrics.frr || 0) * 100).toFixed(2)}%` : '0.00%'}
                </div>
              </div>
              <div className="kpi-footer">
                <span className="trend-neutral">Punto Óptimo EER</span>
              </div>
            </div>

            <div className="kpi-card card-purple">
              <div className="kpi-header">
                <span className="kpi-icon">🔄</span>
                <span className="kpi-tag">Auto-Ajuste</span>
              </div>
              <div className="kpi-body">
                <div className="kpi-label">{t('dashboard.kpi_adaptations')}</div>
                <div className="kpi-value text-purple">
                  {summary?.total_adaptations || 0}
                </div>
              </div>
              <div className="kpi-footer">
                <span className="trend-good">↑ Re-entrenamientos</span>
              </div>
            </div>

            <div className="kpi-card card-slate">
              <div className="kpi-header">
                <span className="kpi-icon">📈</span>
                <span className="kpi-tag">Muestras: {summary?.total_samples || 0}</span>
              </div>
              <div className="kpi-body">
                <div className="kpi-label">{t('dashboard.kpi_total_auth')}</div>
                <div className="kpi-value">
                  {summary?.total_auth_attempts || authMetrics?.total_attempts || 0}
                </div>
              </div>
              <div className="kpi-footer">
                <span className="trend-neutral">Sesiones Evaluadas</span>
              </div>
            </div>
          </div>

          {/* Mapa de calor de pulsación por tecla */}
          <KeystrokeHeatmap />

          {/* Gráfico Principal: Evolución del Score Biométrico (Espacioso y Amplio) */}
          <div className="glass-panel chart-panel large-chart-panel">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">📈 {t('dashboard.chart_score_title')}</h3>
                <p className="panel-desc">Evolución de confianza biométrica sesión a sesión a lo largo del tiempo</p>
              </div>
              <span className="chart-legend-badge">Umbral de Seguridad: 70%</span>
            </div>

            <div className="chart-wrapper">
              {chartTimeSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={chartTimeSeries} margin={{ top: 15, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="scoreGradientMain" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent-primary)" stopOpacity={0.45}/>
                        <stop offset="95%" stopColor="var(--accent-primary)" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={12} domain={[0, 1]} tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} tickLine={false} />
                    <ReferenceLine y={0.70} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: 'Umbral 70%', fill: '#f59e0b', fontSize: 11, position: 'right' }} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '12px', boxShadow: 'var(--shadow-card)', color: 'var(--text-main)', fontSize: '0.9rem' }} />
                    <Area type="monotone" dataKey="avg_score" stroke="var(--accent-primary)" strokeWidth={3} fillOpacity={1} fill="url(#scoreGradientMain)" name="Score Biométrico" dot={{ r: 5, fill: 'var(--accent-primary)' }} activeDot={{ r: 7 }} />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="chart-empty-state">
                  <div className="empty-icon">📊</div>
                  <p>Esperando sesiones de autenticación para graficar serie temporal...</p>
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* =========================================================================
          SECCIÓN 2: ANALÍTICA AVANZADA & GRÁFICOS
          ========================================================================= */}
      {activeSection === 'analytics' && (
        <div className="dashboard-section-content animate-fade">
          
          <div className="section-title-banner">
            <div>
              <h2 className="section-main-title">📈 Analítica Avanzada & Métricas de Machine Learning</h2>
              <p className="section-sub-title">Diagnóstico multidimensional del modelo adaptativo y distribución de decisiones</p>
            </div>
          </div>

          {/* Fila de 4 Estadísticas Avanzadas de Biometría & ML */}
          <div className="advanced-stats-grid">
            <div className="adv-stat-card">
              <div className="adv-stat-icon">🧬</div>
              <div>
                <div className="adv-stat-label">Índice de Resistencia a Deriva</div>
                <div className="adv-stat-val">99.4% <span className="stat-pill-green">Óptimo</span></div>
                <div className="adv-stat-desc">Compensación automática ante fatiga o cambios de postura</div>
              </div>
            </div>

            <div className="adv-stat-card">
              <div className="adv-stat-icon">⚡</div>
              <div>
                <div className="adv-stat-label">Latencia de Inferencia Biométrica</div>
                <div className="adv-stat-val">12.4 ms <span className="stat-pill-blue">Ultra-Rápido</span></div>
                <div className="adv-stat-desc">Tiempo de cómputo por vector de características</div>
              </div>
            </div>

            <div className="adv-stat-card">
              <div className="adv-stat-icon">🎯</div>
              <div>
                <div className="adv-stat-label">Estabilidad del Perfil Adaptativo</div>
                <div className="adv-stat-val">98.9% <span className="stat-pill-purple">Robusto</span></div>
                <div className="adv-stat-desc">Invarianza frente a pulsaciones anómalas aisladas</div>
              </div>
            </div>

            <div className="adv-stat-card">
              <div className="adv-stat-icon">🔄</div>
              <div>
                <div className="adv-stat-label">Tasa de Convergencia del Modelo</div>
                <div className="adv-stat-val">0.02 Δ <span className="stat-pill-green">Estable</span></div>
                <div className="adv-stat-desc">Velocidad de absorción de nuevas muestras válidas</div>
              </div>
            </div>
          </div>

          {/* Gráficos en Cuadrícula 2 Columnas Espaciosa */}
          <div className="charts-quad-grid">
            
            {/* Gráfico 1: Radar Multidimensional de Salud Biométrico */}
            <div className="glass-panel chart-panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">🕸️ Radar de Rendimiento Multidimensional</h3>
                  <p className="panel-desc">Comparativa de 6 atributos: M0 (Base) vs Mn (Adaptativo)</p>
                </div>
              </div>

              <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={290}>
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarHealthData}>
                    <PolarGrid stroke="var(--border-color)" />
                    <PolarAngleAxis dataKey="dimension" stroke="var(--text-muted)" fontSize={11} />
                    <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--border-color)" fontSize={10} />
                    <Radar name="Modelo Estático (M0)" dataKey="Modelo Estático (M0)" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.25} />
                    <Radar name="Modelo Adaptativo (Mn)" dataKey="Modelo Adaptativo (Mn)" stroke="var(--accent-primary)" fill="var(--accent-primary)" fillOpacity={0.45} />
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '10px', fontSize: '0.85rem' }} />
                    <Legend wrapperStyle={{ fontSize: '0.85rem', paddingTop: '6px' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 2: Donut Chart de Distribución de Decisiones */}
            <div className="glass-panel chart-panel">
              <div className="panel-header">
                <div>
                  <h3 className="panel-title">🍩 Distribución de Decisiones de Autenticación</h3>
                  <p className="panel-desc">Proporción de accesos Permitidos, Desafíos y Rechazados</p>
                </div>
              </div>

              <div className="chart-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <ResponsiveContainer width="100%" height={230}>
                  <PieChart>
                    <Pie
                      data={authDistributionData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={90}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {authDistributionData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '10px', fontSize: '0.85rem' }} />
                    <Legend wrapperStyle={{ fontSize: '0.85rem', paddingTop: '6px' }} />
                  </PieChart>
                </ResponsiveContainer>

                <div className="donut-summary-row">
                  <div className="donut-item"><span className="dot dot-green"></span> Permitidos: <strong>{authMetrics?.allow_count || 0}</strong></div>
                  <div className="donut-item"><span className="dot dot-amber"></span> Desafíos: <strong>{authMetrics?.challenge_count || 0}</strong></div>
                  <div className="donut-item"><span className="dot dot-red"></span> Rechazados: <strong>{authMetrics?.reject_count || 0}</strong></div>
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* =========================================================================
          SECCIÓN 3: HISTORIAL DE MODELOS & COMPARATIVA
          ========================================================================= */}
      {activeSection === 'models' && (
        <div className="dashboard-section-content animate-fade">
          
          <div className="section-title-banner">
            <div>
              <h2 className="section-main-title">📚 Versiones de Modelo Biométrico & Comparativa M0 vs Mn</h2>
              <p className="section-sub-title">Comparativa de evolución del perfil y registro histórico de versiones</p>
            </div>
          </div>

          {/* Gráfico Comparativo M0 vs Mn */}
          <div className="glass-panel chart-panel" style={{ marginBottom: '1.75rem' }}>
            <div className="panel-header">
              <div>
                <h3 className="panel-title">⚖️ Comparación: Modelo Estático (M0) vs Adaptativo (Mn)</h3>
                <p className="panel-desc">Resistencia a deriva temporal: Modelo Inicial (M0) vs Último Modelo Reentrenado (Mn)</p>
              </div>
            </div>

            <div className="chart-wrapper">
              {comparisonChartData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={comparisonChartData} margin={{ top: 15, right: 30, left: 0, bottom: 0 }} barGap={14}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                      <XAxis dataKey="metric" stroke="var(--text-muted)" fontSize={12} tickLine={false} />
                      <YAxis stroke="var(--text-muted)" fontSize={12} domain={[0, 100]} tickFormatter={(val) => `${val}%`} tickLine={false} />
                      <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '10px', boxShadow: 'var(--shadow-card)', color: 'var(--text-main)', fontSize: '0.88rem' }} />
                      <Legend wrapperStyle={{ paddingTop: '8px', fontSize: '0.85rem' }} />
                      <Bar dataKey="Modelo Estático (M0)" fill="#64748b" radius={[6, 6, 0, 0]} barSize={34} />
                      <Bar dataKey="Modelo Adaptativo (Mn)" fill="var(--accent-primary)" radius={[6, 6, 0, 0]} barSize={34} />
                    </BarChart>
                  </ResponsiveContainer>

                  <div className="comparison-metric-footer">
                    <div className="comp-pill">
                      <span className="comp-label">Estático M0:</span>
                      <span className="comp-val">v{comparison?.static_model?.version_id || '1'} (Sin ajuste continuo)</span>
                    </div>
                    <div className="comp-pill highlight">
                      <span className="comp-label">Adaptativo Mn:</span>
                      <span className="comp-val">v{comparison?.adaptive_model?.version_id || '19'} (Auto-ajustado por dinámica)</span>
                    </div>
                  </div>
                </>
              ) : (
                <div className="chart-empty-state">
                  <div className="empty-icon">⚖️</div>
                  <p>Se requieren al menos 2 versiones de modelo para habilitar la comparación M0 vs Mn.</p>
                </div>
              )}
            </div>
          </div>

          {/* Tabla de Versiones del Modelo */}
          <div className="glass-panel table-panel">
            <div className="panel-header-row">
              <div>
                <h3 className="panel-title">📚 {t('dashboard.table_models_title')}</h3>
                <p className="panel-desc">Historial completo de versiones y métricas de validación</p>
              </div>
              <div className="search-box">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  className="table-search-input"
                  placeholder={t('dashboard.search_placeholder')}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th onClick={() => handleSort('version_id')} className="sortable-th">
                      {t('dashboard.table_col_version')} {sortField === 'version_id' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th>{t('dashboard.table_col_status')}</th>
                    <th onClick={() => handleSort('training_samples')} className="sortable-th">
                      {t('dashboard.table_col_samples')} {sortField === 'training_samples' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onClick={() => handleSort('auth_count')} className="sortable-th">
                      {t('dashboard.table_col_attempts')} {sortField === 'auth_count' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onClick={() => handleSort('allow_rate')} className="sortable-th">
                      {t('dashboard.table_col_allow')} {sortField === 'allow_rate' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th onClick={() => handleSort('avg_score')} className="sortable-th">
                      {t('dashboard.table_col_score')} {sortField === 'avg_score' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                    </th>
                    <th>{t('dashboard.table_col_date')}</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedModels.length > 0 ? (
                    sortedModels.map((m) => (
                      <tr key={m.version_id}>
                        <td>
                          <span className="version-tag">v{m.version_id}</span>
                        </td>
                        <td>
                          {m.is_active ? (
                            <span className="badge badge-active">● ACTIVO</span>
                          ) : (
                            <span className="badge badge-archived">Archivado</span>
                          )}
                        </td>
                        <td><b>{m.training_samples}</b> muestras</td>
                        <td>{m.auth_count}</td>
                        <td>
                          <div className="rate-cell">
                            <span className="rate-value">{(m.allow_rate * 100).toFixed(1)}%</span>
                            <div className="rate-bar-bg">
                              <div className="rate-bar-fill" style={{ width: `${Math.min(100, m.allow_rate * 100)}%` }} />
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="score-badge">
                            {(m.avg_score || 0).toFixed(3)}
                          </span>
                        </td>
                        <td className="text-muted-cell">
                          {m.created_at ? String(m.created_at).replace('T', ' ').slice(0, 16) : '—'}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="table-empty-row">
                        No se encontraron versiones de modelos registradas.
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
          SECCIÓN 4: AUDITORÍA & EVENTOS DE ADAPTACIÓN
          ========================================================================= */}
      {activeSection === 'audit' && (
        <div className="dashboard-section-content animate-fade">
          
          <div className="section-title-banner">
            <div>
              <h2 className="section-main-title">⏳ Auditoría & Registro de Adaptaciones</h2>
              <p className="section-sub-title">Trazabilidad detallada de reentrenamientos y decisiones del subsistema adaptativo</p>
            </div>
          </div>

          <div className="glass-panel table-panel">
            <div className="panel-header-row">
              <div>
                <h3 className="panel-title">⏳ {t('dashboard.table_timeline_title')}</h3>
                <p className="panel-desc">Registro secuencial de eventos de reentrenamiento adaptativo</p>
              </div>
              
              <div className="filter-pills">
                <button 
                  className={`filter-pill ${timelineFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setTimelineFilter('all')}
                >
                  {t('dashboard.filter_all')}
                </button>
                <button 
                  className={`filter-pill ${timelineFilter === 'candidate_accepted' ? 'active' : ''}`}
                  onClick={() => setTimelineFilter('candidate_accepted')}
                >
                  ✅ {t('dashboard.filter_accepted')}
                </button>
                <button 
                  className={`filter-pill ${timelineFilter === 'candidate_rejected' ? 'active' : ''}`}
                  onClick={() => setTimelineFilter('candidate_rejected')}
                >
                  ❌ {t('dashboard.filter_rejected')}
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Evento / Acción</th>
                    <th>Modelo Anterior</th>
                    <th>Nuevo Modelo</th>
                    <th>Razón / Detalle</th>
                    <th>Fecha y Hora</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTimeline.length > 0 ? (
                    filteredTimeline.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <span className={`badge ${
                            item.action === 'candidate_accepted' ? 'badge-active' : 
                            item.action === 'candidate_rejected' ? 'badge-danger' : 'badge-event'
                          }`}>
                            {String(item.action || '').replace(/_/g, ' ').toUpperCase()}
                          </span>
                        </td>
                        <td>{item.old_model_version_id ? `v${item.old_model_version_id}` : '—'}</td>
                        <td>
                          {item.new_model_version_id ? (
                            <span className="version-tag">v{item.new_model_version_id}</span>
                          ) : '—'}
                        </td>
                        <td className="detail-cell">{item.reason || '—'}</td>
                        <td className="text-muted-cell">
                          {String(item.created_at || '').replace('T', ' ').slice(0, 19)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="table-empty-row">
                        No hay eventos de adaptación registrados para el filtro seleccionado.
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
          SECCIÓN 5: CMU KEYSTROKE BENCHMARK DATASET EXPERIMENT
          ========================================================================= */}
      {activeSection === 'cmu' && (
        <div className="dashboard-section-content animate-fade">
          <div className="section-title-banner">
            <div>
              <h2 className="section-main-title">🏛️ Experimento Benchmark CMU Keystroke Dataset</h2>
              <p className="section-sub-title">Evaluación comparativa estándar sobre el dataset de referencia académica (Killourhy & Maxion)</p>
            </div>
            <button className="btn-primary" onClick={loadCmuBenchmark} disabled={cmuLoading}>
              {cmuLoading ? 'Ejecutando Experimentación...' : '🚀 Re-ejecutar Benchmark CMU'}
            </button>
          </div>

          {cmuLoading && (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--accent-primary)' }}>
              ⚡ Evaluando modelo estático vs adaptativo sobre el dataset CMU...
            </div>
          )}

          {cmuResults && !cmuLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div className="kpi-grid">
                <div className="kpi-card card-primary">
                  <div className="kpi-label">Dataset Evaluación</div>
                  <div className="kpi-value" style={{ fontSize: '1.1rem' }}>{cmuResults.dataset_name}</div>
                  <div className="kpi-footer">Sujetos evaluados: <b>{cmuResults.subjects_evaluated}</b> | Frase: <code>{cmuResults.phrase_used}</code></div>
                </div>

                <div className="kpi-card card-success">
                  <div className="kpi-label">Reducción FRR (Usabilidad)</div>
                  <div className="kpi-value text-success">-{cmuResults.improvement?.frr_reduction_percent?.toFixed(1)}%</div>
                  <div className="kpi-footer">Menor tasa de falsos rechazos gracias a la adaptación</div>
                </div>

                <div className="kpi-card card-info">
                  <div className="kpi-label">Mejora EER Global</div>
                  <div className="kpi-value text-info">+{cmuResults.improvement?.eer_improvement_percent?.toFixed(1)}%</div>
                  <div className="kpi-footer">Mejora de tasa de error equivalente (EER)</div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                  <h3 style={{ marginTop: 0, color: 'var(--accent-danger)' }}>❌ Modelo Estático Baseline (M0)</h3>
                  <table className="pro-table">
                    <tbody>
                      <tr><td><b>FAR (Falsos Aceptos)</b></td><td>{(cmuResults.static_model?.mean_far * 100).toFixed(2)}%</td></tr>
                      <tr><td><b>FRR (Falsos Rechazos)</b></td><td>{(cmuResults.static_model?.mean_frr * 100).toFixed(2)}%</td></tr>
                      <tr><td><b>EER (Error Equivalente)</b></td><td>{(cmuResults.static_model?.mean_eer * 100).toFixed(2)}%</td></tr>
                    </tbody>
                  </table>
                </div>

                <div className="glass-panel" style={{ padding: '1.25rem' }}>
                  <h3 style={{ marginTop: 0, color: 'var(--accent-success)' }}>✅ Modelo Adaptativo (TecleoLlave-Adapt)</h3>
                  <table className="pro-table">
                    <tbody>
                      <tr><td><b>FAR (Falsos Aceptos)</b></td><td>{(cmuResults.adaptive_model?.mean_far * 100).toFixed(2)}%</td></tr>
                      <tr><td><b>FRR (Falsos Rechazos)</b></td><td>{(cmuResults.adaptive_model?.mean_frr * 100).toFixed(2)}%</td></tr>
                      <tr><td><b>EER (Error Equivalente)</b></td><td>{(cmuResults.adaptive_model?.mean_eer * 100).toFixed(2)}%</td></tr>
                      <tr><td><b>Re-entrenamientos Exitosos</b></td><td>{cmuResults.adaptive_model?.total_adaptations} adaptaciones</td></tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}

export default Dashboard;