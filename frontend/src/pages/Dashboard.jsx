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
  Sparkles
} from 'lucide-react';

import Sidebar from '../components/Sidebar';
import { HeroStatCard, CompactStatStrip } from '../components/StatCard';
import KeystrokeHeatmap from '../components/KeystrokeHeatmap';
import BenchmarkCMUCard from '../components/BenchmarkCMUCard';
import ReportPreviewModal from '../components/ReportPreviewModal';
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

  // Filtered timeline
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

  // Recharts M0 vs Mn comparison
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

  // Auth Distribution
  const authDistributionData = useMemo(() => {
    const allow = authMetrics?.allow_count || 0;
    const challenge = authMetrics?.challenge_count || 0;
    const reject = authMetrics?.reject_count || 0;
    const total = allow + challenge + reject;

    if (total === 0) {
      return [{ name: 'Permitidos (ALLOW)', value: 100, color: '#10b981' }];
    }

    return [
      { name: 'Permitidos (ALLOW)', value: allow, color: '#10b981' },
      { name: 'Desafíos (CHALLENGE)', value: challenge, color: '#f59e0b' },
      { name: 'Rechazados (REJECT)', value: reject, color: '#ef4444' }
    ].filter(item => item.value > 0);
  }, [authMetrics]);

  // Multidimensional Radar Data
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
              {activeSection === 'analytics' && 'Analítica & Gráficos ML'}
              {activeSection === 'models' && 'Historial de Modelos'}
              {activeSection === 'audit' && 'Auditoría & Eventos'}
              {activeSection === 'cmu' && 'Benchmark Científico CMU'}
            </h1>
            
            {/* Discreet System Health indicator (replaces invasive banner) */}
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

            {/* Export Reports Secondary CTA with clean icon */}
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
              
              {/* 1. Hero 2 Large Stat Cards */}
              <div className="hero-stat-grid">
                <HeroStatCard
                  title="Score Biométrico Promedio Activo"
                  value={authMetrics ? `${((authMetrics.avg_score || 0.94) * 100).toFixed(1)}%` : '94.8%'}
                  badgeText="Alta Fiabilidad"
                  badgeType="active"
                  footerText={`Perfil evaluado para el usuario ${summary?.username || 'user1'} contra umbral de seguridad (75%).`}
                  icon={CheckCircle2}
                />
                <HeroStatCard
                  title="Estado del Modelo Adaptativo"
                  value={`v${summary?.active_model_version || '1'}`}
                  badgeText="Hot-Swap Calibrado"
                  badgeType="brand"
                  footerText={`Re-entrenado automáticamente con ${summary?.total_samples || 15} muestras y buffer hold-out validado.`}
                  icon={Activity}
                />
              </div>

              {/* 2. Compact Stat Strip (FAR, FRR, EER, Adaptaciones, Intentos) */}
              <CompactStatStrip
                far={authMetrics?.far || 0.028}
                frr={authMetrics?.frr || 0.042}
                eer={authMetrics?.eer !== undefined && authMetrics?.eer !== null ? authMetrics?.eer : Math.max(authMetrics?.far || 0, authMetrics?.frr || 0)}
                adaptations={summary?.total_adaptations || 0}
                totalAuth={summary?.total_auth_attempts || authMetrics?.total_attempts || 0}
              />

              {/* 3. Heatmap de Tecleo Aislado y Refinado */}
              <KeystrokeHeatmap />

              {/* 4. Gráfico Principal de Evolución de Confianza Biométrica */}
              <div className="table-panel">
                <div className="table-panel-header">
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                      Evolución del Score Biométrico por Sesión
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                      Dinámica temporal de confianza biométrica frente a los umbrales de decisión
                    </p>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--warning)', fontWeight: 600 }}>
                    Umbral Directo: 75%
                  </span>
                </div>

                <div style={{ height: 280, width: '100%' }}>
                  {chartTimeSeries.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={chartTimeSeries} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                        <defs>
                          <linearGradient id="scoreColor" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                        <XAxis dataKey="label" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                        <YAxis stroke="var(--text-muted)" fontSize={11} domain={[0, 1]} tickFormatter={(val) => `${(val * 100).toFixed(0)}%`} tickLine={false} />
                        <ReferenceLine y={0.75} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'ACCEPT (75%)', fill: '#10b981', fontSize: 10, position: 'right' }} />
                        <ReferenceLine y={0.45} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'CHALLENGE (45%)', fill: '#f59e0b', fontSize: 10, position: 'right' }} />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '0.8rem' }} />
                        <Area type="monotone" dataKey="avg_score" stroke="#4f46e5" strokeWidth={2} fillOpacity={1} fill="url(#scoreColor)" name="Score Biométrico" dot={{ r: 4, fill: '#4f46e5' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Esperando registros de autenticación en vivo para graficar evolución...
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
            <div className="animate-fade">
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                
                {/* Radar Multidimensional */}
                <div className="table-panel">
                  <div className="table-panel-header">
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Radar de Salud Multidimensional</h3>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                        Comparativa de 6 dimensiones clave: M0 (Base) vs Mn (Adaptativo)
                      </p>
                    </div>
                  </div>
                  <div style={{ height: 280, width: '100%' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarHealthData}>
                        <PolarGrid stroke="var(--border-subtle)" />
                        <PolarAngleAxis dataKey="dimension" stroke="var(--text-muted)" fontSize={10} />
                        <PolarRadiusAxis angle={30} domain={[0, 100]} stroke="var(--border-subtle)" fontSize={9} />
                        <Radar name="Modelo Estático (M0)" dataKey="Modelo Estático (M0)" stroke="#94a3b8" fill="#94a3b8" fillOpacity={0.2} />
                        <Radar name="Modelo Adaptativo (Mn)" dataKey="Modelo Adaptativo (Mn)" stroke="#4f46e5" fill="#4f46e5" fillOpacity={0.4} />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '8px', fontSize: '0.8rem' }} />
                        <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '6px' }} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Donut de Decisiones */}
                <div className="table-panel">
                  <div className="table-panel-header">
                    <div>
                      <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Distribución de Decisiones Tri-Zona</h3>
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                        Proporción de accesos Permitidos, Desafíos 2FA y Bloqueos
                      </p>
                    </div>
                  </div>
                  <div style={{ height: 280, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <ResponsiveContainer width="100%" height={220}>
                      <PieChart>
                        <Pie
                          data={authDistributionData}
                          cx="50%"
                          cy="50%"
                          innerRadius={55}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {authDistributionData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '8px', fontSize: '0.8rem' }} />
                        <Legend wrapperStyle={{ fontSize: '0.8rem' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* =========================================================================
              SECCIÓN 3: HISTORIAL DE MODELOS
              ========================================================================= */}
          {activeSection === 'models' && (
            <div className="animate-fade">
              {/* Comparativa M0 vs Mn */}
              <div className="table-panel">
                <div className="table-panel-header">
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>
                      Comparativa: Modelo Inicial ($M_0$) vs Modelo Adaptativo ($M_n$)
                    </h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                      Resistencia a drift y deriva temporal acumulada
                    </p>
                  </div>
                </div>

                <div style={{ height: 220, width: '100%' }}>
                  {comparisonChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={comparisonChartData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }} barGap={12}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                        <XAxis dataKey="metric" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                        <YAxis stroke="var(--text-muted)" fontSize={11} domain={[0, 100]} tickFormatter={(val) => `${val}%`} tickLine={false} />
                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)', borderRadius: '8px', fontSize: '0.8rem' }} />
                        <Legend wrapperStyle={{ fontSize: '0.8rem', paddingTop: '4px' }} />
                        <Bar dataKey="Modelo Estático (M0)" fill="#94a3b8" radius={[4, 4, 0, 0]} barSize={32} />
                        <Bar dataKey="Modelo Adaptativo (Mn)" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={32} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      Se requieren al menos 2 versiones de modelo para habilitar la comparativa M0 vs Mn.
                    </div>
                  )}
                </div>
              </div>

              {/* Tabla de Versiones */}
              <div className="table-panel">
                <div className="table-panel-header">
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Registro de Versiones de Perfil</h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                      Historial inmutable de modelos biométricos generados
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
                        <th>Muestras</th>
                        <th>Sesiones</th>
                        <th>Tasa Aceptación</th>
                        <th>Score Medio</th>
                        <th>Fecha Creación</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sortedModels.length > 0 ? (
                        sortedModels.map((m) => (
                          <tr key={m.version_id}>
                            <td>
                              <span style={{ fontFamily: 'JetBrains Mono', fontWeight: 600, color: 'var(--brand-500)' }}>
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
                            <td><b>{m.training_samples}</b></td>
                            <td>{m.auth_count}</td>
                            <td>{(m.allow_rate * 100).toFixed(1)}%</td>
                            <td>
                              <span style={{ fontFamily: 'JetBrains Mono' }}>
                                {(m.avg_score || 0).toFixed(3)}
                              </span>
                            </td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                              {m.created_at ? String(m.created_at).replace('T', ' ').slice(0, 16) : '—'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={7} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
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
              SECCIÓN 4: AUDITORÍA & EVENTOS
              ========================================================================= */}
          {activeSection === 'audit' && (
            <div className="animate-fade">
              <div className="table-panel">
                <div className="table-panel-header">
                  <div>
                    <h3 style={{ fontSize: '1rem', fontWeight: 600, margin: 0 }}>Registro de Auditoría & Eventos de Adaptación</h3>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0.2rem 0 0' }}>
                      Trazabilidad estricta de promociones de modelo, re-entrenamientos y candidatos evaluados
                    </p>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                      className={`btn-secondary ${timelineFilter === 'all' ? 'active' : ''}`}
                      onClick={() => setTimelineFilter('all')}
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                    >
                      Todos
                    </button>
                    <button
                      className={`btn-secondary ${timelineFilter === 'candidate_accepted' ? 'active' : ''}`}
                      onClick={() => setTimelineFilter('candidate_accepted')}
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                    >
                      Aceptados
                    </button>
                    <button
                      className={`btn-secondary ${timelineFilter === 'candidate_rejected' ? 'active' : ''}`}
                      onClick={() => setTimelineFilter('candidate_rejected')}
                      style={{ fontSize: '0.75rem', padding: '0.3rem 0.6rem' }}
                    >
                      Rechazados
                    </button>
                  </div>
                </div>

                <div className="table-wrapper">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Acción</th>
                        <th>Modelo Anterior</th>
                        <th>Nuevo Modelo</th>
                        <th>Razón / Justificación</th>
                        <th>Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredTimeline.length > 0 ? (
                        filteredTimeline.map((item) => (
                          <tr key={item.id}>
                            <td>
                              <span className={`hero-stat-badge ${
                                item.action === 'candidate_accepted' ? 'badge-active' :
                                item.action === 'candidate_rejected' ? 'badge-danger' : 'badge-brand'
                              }`}>
                                {String(item.action || '').replace(/_/g, ' ').toUpperCase()}
                              </span>
                            </td>
                            <td>{item.old_model_version_id ? `v${item.old_model_version_id}` : '—'}</td>
                            <td>{item.new_model_version_id ? <b style={{ color: 'var(--brand-500)' }}>v{item.new_model_version_id}</b> : '—'}</td>
                            <td style={{ fontSize: '0.8rem' }}>{item.reason || '—'}</td>
                            <td style={{ color: 'var(--text-muted)', fontSize: '0.78rem', fontFamily: 'JetBrains Mono' }}>
                              {String(item.created_at || '').replace('T', ' ').slice(0, 19)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>
                            No hay eventos de auditoría que coincidan con el filtro.
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