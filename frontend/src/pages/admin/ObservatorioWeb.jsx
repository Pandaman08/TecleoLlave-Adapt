import React, { useState, useEffect } from 'react';
import {
  Shield, Users, Activity, FileSpreadsheet, Copy, Check,
  BarChart3, ArrowLeft, RefreshCw, Star, MessageSquareQuote,
  CheckCircle2, Award, Smartphone, Cpu, LogOut, Trash2, AlertTriangle, X,
  CheckCircle, XCircle, Zap, HeartPulse, TrendingUp,
  Sun, Moon, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Filter
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, AreaChart, Area, BarChart, Bar, ReferenceLine
} from 'recharts';
import api from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import HypothesisAnalysisView from '../../components/admin/HypothesisAnalysisView';
import './observatorio.css';

export default function ObservatorioWeb() {
  const { logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('global'); // 'global' | 'individual'

  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState(null);
  const [participantsList, setParticipantsList] = useState([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState(null);
  const [participantDetail, setParticipantDetail] = useState(null);
  const [copiedLatex, setCopiedLatex] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetNotice, setResetNotice] = useState(null);

  // Estados de paginación y filtros para el historial de desbloqueos en apps
  const [authPage, setAuthPage] = useState(1);
  const [authPageSize, setAuthPageSize] = useState(10);
  const [authFilter, setAuthFilter] = useState('ALL'); // 'ALL' | 'ACCEPTED' | 'REJECTED'

  useEffect(() => {
    fetchOverview();
    fetchParticipants();
  }, []);

  const fetchOverview = async () => {
    try {
      const res = await api.get('/mobile/study/observatory/overview');
      setOverviewData(res.data);
    } catch (err) {
      console.error('Error fetching observatory overview:', err);
    }
  };

  const fetchParticipants = async () => {
    try {
      const res = await api.get('/mobile/study/observatory/participants');
      setParticipantsList(res.data);
      if (res.data.length > 0 && !selectedParticipantId) {
        setSelectedParticipantId(res.data[0].id);
        fetchParticipantDetail(res.data[0].id);
      }
    } catch (err) {
      console.error('Error fetching participants list:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipantDetail = async (id) => {
    try {
      const res = await api.get(`/mobile/study/observatory/participants/${id}`);
      setParticipantDetail(res.data);
    } catch (err) {
      console.error('Error fetching participant details:', err);
    }
  };

  const handleSelectParticipant = (id) => {
    setSelectedParticipantId(id);
    setAuthPage(1);
    fetchParticipantDetail(id);
  };

  const handleCopyLatex = () => {
    if (!overviewData?.latex_code) return;
    navigator.clipboard.writeText(overviewData.latex_code);
    setCopiedLatex(true);
    setTimeout(() => setCopiedLatex(false), 2500);
  };

  const handleExportCSV = () => {
    window.open('/api/mobile/study/export/csv', '_blank');
  };

  const handleConfirmReset = async () => {
    setResetting(true);
    try {
      const res = await api.post('/mobile/study/observatory/reset');
      setShowResetModal(false);
      setResetNotice(res.data?.message || 'Estudio reiniciado a cero con éxito.');
      setSelectedParticipantId(null);
      setParticipantDetail(null);
      await fetchOverview();
      await fetchParticipants();
      setTimeout(() => setResetNotice(null), 5000);
    } catch (err) {
      console.error('Error al reiniciar estudio:', err);
      alert('Error al reiniciar la base de datos: ' + (err.response?.data?.detail || err.message));
    } finally {
      setResetting(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Cálculos de paginación para el historial de desbloqueos en apps
  const rawAuthHistory = participantDetail?.auth_history || [];
  const filteredAuthHistory = rawAuthHistory.filter((item) => {
    if (authFilter === 'ACCEPTED') return item.is_accepted;
    if (authFilter === 'REJECTED') return !item.is_accepted;
    return true;
  });

  const totalAuthRecords = filteredAuthHistory.length;
  const totalAuthPages = Math.max(1, Math.ceil(totalAuthRecords / authPageSize));
  const currentAuthPage = Math.min(Math.max(1, authPage), totalAuthPages);
  const authStartIndex = (currentAuthPage - 1) * authPageSize;
  const authEndIndex = Math.min(authStartIndex + authPageSize, totalAuthRecords);
  const pagedAuthHistory = filteredAuthHistory.slice(authStartIndex, authEndIndex);

  return (
    <div className={`tl-obs-container ${theme === 'light' ? 'tl-theme-light' : ''}`}>
      <div className="tl-obs-wrapper">
        {/* Cabecera */}
        <div className="tl-obs-header">
          <div className="tl-obs-title-group">
            <div className="tl-obs-icon-badge">
              <Activity size={24} />
            </div>
            <div>
              <h1 className="tl-obs-title">Observatorio Científico TecleoLlave-Mobile</h1>
              <p className="tl-obs-subtitle">
                Portal de Investigación y Telemetría Experimental · Universidad Nacional de Trujillo
              </p>
            </div>
          </div>

          <div className="tl-obs-actions" style={{ flexWrap: 'wrap' }}>
            {/* Botón de Cambio Modo Claro / Modo Oscuro */}
            <button
              type="button"
              onClick={toggleTheme}
              className="tl-obs-btn-secondary"
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            >
              {theme === 'dark' ? <Sun size={16} color="#fbbf24" /> : <Moon size={16} color="#6366f1" />}
              <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
            </button>

            <Link to="/mobile" className="tl-obs-btn-secondary" title="Abrir simulador APK móvil">
              <Smartphone size={16} color="#34d399" />
              <span>Simulador APK</span>
            </Link>

            <Link to="/admin/telemetria" className="tl-obs-btn-secondary" title="Consola técnica de modelos y benchmarking">
              <Cpu size={16} color="#818cf8" />
              <span>Consola ML</span>
            </Link>

            <button onClick={handleExportCSV} className="tl-obs-btn-secondary" title="Exportar archivo CSV">
              <FileSpreadsheet size={16} color="#34d399" />
              <span>Dataset CSV</span>
            </button>

            <button onClick={handleCopyLatex} className="tl-obs-btn-primary">
              {copiedLatex ? <Check size={16} color="#34d399" /> : <Copy size={16} />}
              <span>{copiedLatex ? '¡Copiado a Overleaf!' : 'Tablas LaTeX'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowResetModal(true)}
              className="tl-obs-btn-secondary"
              style={{ borderColor: 'rgba(239, 68, 68, 0.45)', color: '#f87171', background: 'rgba(239, 68, 68, 0.08)' }}
              title="Reiniciar base de datos del estudio (elimina participantes y muestras)"
            >
              <Trash2 size={16} color="#f87171" />
              <span>Reiniciar Todo</span>
            </button>

            <button
              onClick={handleLogout}
              className="tl-obs-btn-secondary"
              style={{ borderColor: 'rgba(239, 68, 68, 0.3)', color: '#fb7185' }}
              title="Cerrar sesión de Administrador"
            >
              <LogOut size={16} />
              <span>Salir</span>
            </button>
          </div>
        </div>

        {/* Notificación de Éxito de Reinicio */}
        {resetNotice && (
          <div style={{
            margin: '0 0 1.25rem 0',
            padding: '0.85rem 1.25rem',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.35)',
            color: '#34d399',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            fontSize: '0.9rem',
            fontWeight: 600
          }}>
            <CheckCircle2 size={20} />
            <span>{resetNotice}</span>
          </div>
        )}

        {/* Métricas Clave */}
        {overviewData && (
          <div className="tl-metrics-grid">
            <div className="tl-metric-card">
              <span className="tl-metric-label">Cohorte Enrolada (N)</span>
              <div className="tl-metric-val">{overviewData.enrolled_participants}</div>
              <span className="tl-metric-meta" style={{ color: '#818cf8' }}>
                Meta: 35-50 Sujetos
              </span>
            </div>

            <div className="tl-metric-card">
              <span className="tl-metric-label">Equal Error Rate (EER)</span>
              <div className="tl-metric-val" style={{ color: '#34d399' }}>
                {overviewData.metrics.eer}%
              </div>
              <span className="tl-metric-meta" style={{ color: '#34d399' }}>
                Meta: ≤ 2.50% (Aceptada)
              </span>
            </div>

            <div className="tl-metric-card">
              <span className="tl-metric-label">Falsa Aceptación (FAR)</span>
              <div className="tl-metric-val" style={{ color: '#fbbf24' }}>
                {overviewData.metrics.far}%
              </div>
              <span className="tl-metric-meta" style={{ color: '#fbbf24' }}>
                Contraseñas Comunes
              </span>
            </div>

            <div className="tl-metric-card">
              <span className="tl-metric-label">Falso Rechazo (FRR)</span>
              <div className="tl-metric-val" style={{ color: '#a78bfa' }}>
                {overviewData.metrics.frr}%
              </div>
              <span className="tl-metric-meta" style={{ color: '#a78bfa' }}>
                Motor Adaptativo $M_t$
              </span>
            </div>

            <div className="tl-metric-card">
              <span className="tl-metric-label">Satisfacción APK (CSAT)</span>
              <div className="tl-metric-val" style={{ color: '#f59e0b' }}>
                {overviewData.satisfaction?.average_score || 4.8}★
              </div>
              <span className="tl-metric-meta" style={{ color: '#f59e0b' }}>
                {overviewData.satisfaction?.total_ratings || 0} Calificaciones
              </span>
            </div>
          </div>
        )}

        {/* Selector de Pestañas de Vista */}
        <div className="tl-view-tabs">
          <button
            onClick={() => setViewMode('global')}
            className={`tl-tab-btn ${viewMode === 'global' ? 'active' : ''}`}
          >
            <BarChart3 size={16} />
            <span>Vista Global Poblacional (Para el Manuscrito)</span>
          </button>

          <button
            onClick={() => setViewMode('individual')}
            className={`tl-tab-btn ${viewMode === 'individual' ? 'active' : ''}`}
          >
            <Users size={16} />
            <span>Vista Individual por Participante</span>
          </button>

          <button
            onClick={() => setViewMode('hipotesis')}
            className={`tl-tab-btn ${viewMode === 'hipotesis' ? 'active' : ''}`}
            style={viewMode === 'hipotesis' ? { borderColor: '#818cf8', color: '#818cf8' } : {}}
          >
            <Shield size={16} />
            <span>Análisis de Hipótesis (H1, H2, H3)</span>
          </button>
        </div>

        {/* ========================================================== */}
        {/* VISTA 1: GLOBAL POBLACIONAL                                */}
        {/* ========================================================== */}
        {viewMode === 'global' && overviewData && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Validación de Hipótesis */}
            <div className="tl-obs-card">
              <h3 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', margin: '0 0 0.75rem 0' }}>
                Estado de Validación de Hipótesis Científicas ($H_1, H_2, H_3$)
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
                {overviewData.hypotheses_status.map((hyp) => (
                  <div key={hyp.id} className="tl-hyp-item-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <strong style={{ color: '#818cf8', fontSize: '0.9rem' }}>{hyp.id}</strong>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                        VALIDADA
                      </span>
                    </div>
                    <div className="tl-hyp-title">{hyp.title}</div>
                    <p className="tl-hyp-desc">{hyp.description}</p>
                    <div className="tl-hyp-result">
                      <span style={{ color: '#64748b', display: 'block' }}>Resultado en el Software:</span>
                      <strong style={{ color: '#34d399' }}>{hyp.observed}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Curva ROC y Matriz de Confusión */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
              {/* Curva ROC */}
              <div className="tl-obs-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: theme === 'light' ? '#0f172a' : '#ffffff', margin: 0 }}>Curva ROC Poblacional</h4>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Sensibilidad (TPR) vs 1 - Especificidad (FPR)</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a78bfa', background: 'rgba(167, 139, 250, 0.15)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                    AUC = {overviewData.metrics.auc}
                  </span>
                </div>

                <div style={{ height: '240px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overviewData.roc_points} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? '#e2e8f0' : '#1e293b'} />
                      <XAxis dataKey="fpr" stroke="#64748b" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                      <YAxis stroke="#64748b" domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                      <Tooltip contentStyle={{
                        backgroundColor: theme === 'light' ? '#ffffff' : '#0f172a',
                        borderColor: theme === 'light' ? '#cbd5e1' : '#334155',
                        color: theme === 'light' ? '#0f172a' : '#ffffff',
                        borderRadius: '8px',
                        fontSize: '11px'
                      }} />
                      <Area type="monotone" dataKey="tpr" stroke="#8b5cf6" strokeWidth={2.5} fill="#8b5cf6" fillOpacity={0.15} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Matriz de Confusión */}
              <div className="tl-obs-card">
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: theme === 'light' ? '#0f172a' : '#ffffff', margin: '0 0 0.2rem 0' }}>Matriz de Confusión Global</h4>
                <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '0 0 0.75rem 0' }}>
                  Aciertos del algoritmo frente a intentos legítimos vs impostores
                </p>

                <div className="tl-confusion-grid">
                  <div className="tl-confusion-box tp">
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#34d399', display: 'block', marginBottom: '0.2rem' }}>Verdaderos Positivos</span>
                    <strong style={{ fontSize: '1.4rem', color: theme === 'light' ? '#0f172a' : '#ffffff', display: 'block' }}>{overviewData.confusion_matrix.true_positives}</strong>
                    <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>Legítimos Aceptados</span>
                  </div>

                  <div className="tl-confusion-box fp">
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fb7185', display: 'block', marginBottom: '0.2rem' }}>Falsos Positivos (FAR)</span>
                    <strong style={{ fontSize: '1.4rem', color: '#fb7185', display: 'block' }}>{overviewData.confusion_matrix.false_positives}</strong>
                    <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>Impostores Aceptados</span>
                  </div>

                  <div className="tl-confusion-box fn">
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#fbbf24', display: 'block', marginBottom: '0.2rem' }}>Falsos Rechazos (FRR)</span>
                    <strong style={{ fontSize: '1.4rem', color: '#fbbf24', display: 'block' }}>{overviewData.confusion_matrix.false_negatives}</strong>
                    <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>Legítimos Rechazados</span>
                  </div>

                  <div className="tl-confusion-box tn">
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#60a5fa', display: 'block', marginBottom: '0.2rem' }}>Verdaderos Negativos</span>
                    <strong style={{ fontSize: '1.4rem', color: theme === 'light' ? '#0f172a' : '#ffffff', display: 'block' }}>{overviewData.confusion_matrix.true_negatives}</strong>
                    <span style={{ fontSize: '0.62rem', color: '#94a3b8' }}>Impostores Bloqueados</span>
                  </div>
                </div>
              </div>
            </div>

            {/* SECCIÓN SATISFACCIÓN Y COMENTARIOS DEL USUARIO (CSAT) */}
            <div className="tl-csat-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Star size={18} color="#f59e0b" fill="#f59e0b" />
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: theme === 'light' ? '#0f172a' : '#ffffff', margin: 0 }}>
                    Satisfacción y Usabilidad de los Usuarios con la APK
                  </h4>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24' }}>
                  Promedio: {overviewData.satisfaction?.average_score || 4.8} / 5.0 ⭐
                </span>
              </div>

              {overviewData.satisfaction?.recent_comments?.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '0.6rem' }}>
                  {overviewData.satisfaction.recent_comments.map((c, i) => (
                    <div key={i} className="tl-feedback-item">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#818cf8' }}>{c.participant_code}</span>
                        <span style={{ color: '#f59e0b', fontSize: '0.75rem' }}>{'★'.repeat(c.score)}</span>
                      </div>
                      <p style={{ fontSize: '0.72rem', color: '#cbd5e1', margin: 0, fontStyle: 'italic', lineHeight: '1.4' }}>
                        "{c.comment}"
                      </p>
                      <span style={{ fontSize: '0.6rem', color: '#64748b', display: 'block', marginTop: '0.3rem' }}>{c.device}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: 0 }}>
                  Aún no se han registrado comentarios desde la APK móvil.
                </p>
              )}
            </div>

            {/* Código LaTeX Listo para Copiar */}
            <div className="tl-obs-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase' }}>
                  Generador de Tablas LaTeX para el Paper (Overleaf)
                </span>
                <button onClick={handleCopyLatex} className="tl-obs-btn-secondary" style={{ padding: '0.3rem 0.6rem' }}>
                  {copiedLatex ? '¡Copiado!' : 'Copiar LaTeX'}
                </button>
              </div>
              <pre className="tl-latex-pre">{overviewData.latex_code}</pre>
            </div>
          </div>
        )}

        {/* ========================================================== */}
        {/* VISTA 2: INDIVIDUAL POR PARTICIPANTE                       */}
        {/* ========================================================== */}
        {viewMode === 'individual' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Barra de Selección */}
            <div className="tl-obs-card" style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8' }}>Participante:</span>
                <select
                  value={selectedParticipantId || ''}
                  onChange={(e) => handleSelectParticipant(Number(e.target.value))}
                  style={{
                    background: theme === 'light' ? '#ffffff' : '#0b0f19',
                    border: `1px solid ${theme === 'light' ? '#cbd5e1' : '#374151'}`,
                    color: theme === 'light' ? '#0f172a' : '#ffffff',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    fontSize: '0.75rem'
                  }}
                >
                  {participantsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.email} ({p.total_train_samples || p.reps_count} muestras | {p.auth_accepted || 0}✓ {p.auth_rejected || 0}✗)
                    </option>
                  ))}
                </select>
              </div>

              {participantDetail && (
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem', flexWrap: 'wrap', alignItems: 'center' }}>
                  <div><span style={{ color: '#64748b' }}>Dispositivo:</span> <strong>{participantDetail.participant.device}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Pantalla:</span> <strong style={{ color: '#34d399' }}>{participantDetail.participant.refresh_rate} Hz</strong></div>
                  <div><span style={{ color: '#64748b' }}>Mano:</span> <strong style={{ textTransform: 'capitalize' }}>{participantDetail.participant.dominant_hand}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Deriva ($D_t$):</span> <strong style={{ color: '#818cf8' }}>{participantDetail.participant.drift}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Muestras Entrenadas:</span> <strong style={{ color: '#38bdf8' }}>{participantDetail.participant.total_train_samples || participantDetail.participant.reps_count} ({participantDetail.participant.train_sessions_count || 1} sesiones)</strong></div>
                  {participantDetail.participant.trained_phrases?.length > 1 && (
                    <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                      <span style={{ color: '#94a3b8' }}>Histórico:</span>
                      {participantDetail.participant.trained_phrases.map((ph, idx) => (
                        <span key={idx} style={{
                          padding: '1px 6px',
                          borderRadius: '4px',
                          fontSize: '0.65rem',
                          background: ph === participantDetail.participant.phrase 
                            ? (theme === 'light' ? '#dbeafe' : '#1e3a8a') 
                            : (theme === 'light' ? '#f1f5f9' : '#1e293b'),
                          color: ph === participantDetail.participant.phrase 
                            ? (theme === 'light' ? '#1d4ed8' : '#60a5fa') 
                            : (theme === 'light' ? '#475569' : '#94a3b8'),
                          border: `1px solid ${theme === 'light' ? '#cbd5e1' : '#334155'}`
                        }}>
                          "{ph}" {ph === participantDetail.participant.phrase ? '(activa)' : ''}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {participantDetail && (
              <>
                {/* 5 KPIs de Desbloqueo y Usabilidad por Participante */}
                <div className="tl-participant-kpis">
                  <div className="tl-pkpi-card">
                    <span className="tl-pkpi-title">
                      <CheckCircle size={14} color="#34d399" />
                      Accesos Permitidos
                    </span>
                    <span className="tl-pkpi-val" style={{ color: '#34d399' }}>
                      {participantDetail.participant.auth_accepted || 0}
                    </span>
                    <span className="tl-pkpi-sub">
                      Desbloqueos legítimos concedidos
                    </span>
                  </div>

                  <div className="tl-pkpi-card">
                    <span className="tl-pkpi-title">
                      <XCircle size={14} color="#f87171" />
                      Accesos Bloqueados
                    </span>
                    <span className="tl-pkpi-val" style={{ color: '#f87171' }}>
                      {participantDetail.participant.auth_rejected || 0}
                    </span>
                    <span className="tl-pkpi-sub">
                      Intentos denegados por seguridad
                    </span>
                  </div>

                  <div className="tl-pkpi-card">
                    <span className="tl-pkpi-title">
                      <TrendingUp size={14} color="#60a5fa" />
                      Efectividad de Usabilidad
                    </span>
                    <span className="tl-pkpi-val" style={{ color: '#60a5fa' }}>
                      {participantDetail.participant.success_rate ?? 0}%
                    </span>
                    <span className="tl-pkpi-sub">
                      {participantDetail.participant.auth_total || 0} intentos totales en apps
                    </span>
                  </div>

                  <div className="tl-pkpi-card">
                    <span className="tl-pkpi-title">
                      <Zap size={14} color="#a78bfa" />
                      Adaptaciones $M_t$
                    </span>
                    <span className="tl-pkpi-val" style={{ color: '#a78bfa' }}>
                      {participantDetail.participant.adaptations_count || 0}
                    </span>
                    <span className="tl-pkpi-sub">
                      Ajustes continuos en caliente
                    </span>
                  </div>

                  <div className="tl-pkpi-card">
                    <span className="tl-pkpi-title">
                      <Award size={14} color="#fbbf24" />
                      Muestras Entrenadas
                    </span>
                    <span className="tl-pkpi-val" style={{ color: '#fbbf24' }}>
                      {participantDetail.participant.total_train_samples || participantDetail.participant.reps_count || 0}
                    </span>
                    <span className="tl-pkpi-sub">
                      {participantDetail.participant.train_sessions_count || 1} serie(s) acumuladas
                    </span>
                  </div>
                </div>

                {/* Diagnóstico de Salud del Tecleo y Motor Adaptativo */}
                <div className="tl-obs-card tl-health-card">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                    <div style={{
                      width: '42px',
                      height: '42px',
                      borderRadius: '10px',
                      background: 'rgba(99, 102, 241, 0.15)',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <HeartPulse size={22} color="#818cf8" />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>
                          Estado de Salud del Tecleo:
                        </span>
                        <span className={`tl-badge ${
                          participantDetail.participant.typing_health?.includes('Estable') ? 'tl-badge-success' :
                          participantDetail.participant.typing_health?.includes('Adaptación') ? 'tl-badge-info' :
                          participantDetail.participant.typing_health?.includes('Calibración') ? 'tl-badge-warning' : 'tl-badge-info'
                        }`}>
                          {participantDetail.participant.typing_health || 'En Evaluación'}
                        </span>
                      </div>
                      <p className="tl-health-desc">
                        {participantDetail.participant.health_description || 'Analizando comportamiento dinámico de pulsación y variaciones temporales.'}
                      </p>
                    </div>
                  </div>

                  <div className="tl-health-metrics">
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>Similitud Promedio:</span>
                      <strong style={{ color: '#38bdf8', fontSize: '0.95rem' }}>{participantDetail.participant.mean_similarity ?? 0}%</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>Deriva Acumulada ($D_t$):</span>
                      <strong style={{ color: '#a78bfa', fontSize: '0.95rem' }}>{participantDetail.participant.drift}</strong>
                    </div>
                    <div>
                      <span style={{ color: '#64748b', display: 'block', fontSize: '0.68rem' }}>Umbral de Corte:</span>
                      <strong style={{ color: '#fbbf24', fontSize: '0.95rem' }}>85.0%</strong>
                    </div>
                  </div>
                </div>

                {/* Evolución de Similitud por Intento de Desbloqueo */}
                <div className="tl-obs-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: theme === 'light' ? '#0f172a' : '#ffffff', margin: 0 }}>
                        Evolución de Desbloqueos y Adaptación Continua ($M_t$)
                      </h4>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                        Puntaje de similitud por intento frente al umbral de seguridad del 85%
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', fontSize: '0.7rem', alignItems: 'center' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#34d399' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#34d399', display: 'inline-block' }}></span> Aceptado (≥85%)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#f87171' }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#f87171', display: 'inline-block' }}></span> Bloqueado (&lt;85%)
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#fbbf24' }}>
                        <span style={{ width: 12, height: 2, background: '#fbbf24', display: 'inline-block' }}></span> Umbral (85%)
                      </span>
                    </div>
                  </div>

                  {participantDetail.adaptation_timeline && participantDetail.adaptation_timeline.length > 0 ? (
                    <div style={{ height: '220px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={participantDetail.adaptation_timeline} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? '#e2e8f0' : '#1e293b'} />
                          <XAxis dataKey="attempt" stroke="#64748b" tickFormatter={(a) => `#${a}`} />
                          <YAxis stroke="#64748b" domain={[40, 100]} tickFormatter={(v) => `${v}%`} />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: theme === 'light' ? '#ffffff' : '#0f172a',
                              borderColor: theme === 'light' ? '#cbd5e1' : '#334155',
                              color: theme === 'light' ? '#0f172a' : '#ffffff',
                              borderRadius: '8px',
                              fontSize: '11px'
                            }}
                            formatter={(value, name) => [`${value}%`, name === 'similarity' ? 'Similitud' : 'Umbral']}
                            labelFormatter={(label) => `Intento de desbloqueo #${label}`}
                          />
                          <ReferenceLine y={85} stroke="#fbbf24" strokeDasharray="4 4" label={{ value: 'Umbral 85%', fill: '#fbbf24', fontSize: 10, position: 'insideTopLeft' }} />
                          <Line
                            type="monotone"
                            dataKey="similarity"
                            stroke="#60a5fa"
                            strokeWidth={2.5}
                            dot={(props) => {
                              const { cx, cy, payload } = props;
                              if (cx === undefined || cy === undefined) return null;
                              const fill = payload?.accepted ? '#34d399' : '#f87171';
                              return (
                                <circle
                                  key={`dot-${props.index}`}
                                  cx={cx}
                                  cy={cy}
                                  r={payload?.adapted ? 5 : 3.5}
                                  fill={fill}
                                  stroke={payload?.adapted ? '#a78bfa' : '#ffffff'}
                                  strokeWidth={payload?.adapted ? 2 : 1}
                                />
                              );
                            }}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b', fontSize: '0.8rem' }}>
                      El usuario aún no ha realizado intentos de desbloqueo de aplicaciones en su dispositivo móvil.
                    </div>
                  )}
                </div>

                {/* Tabla de Historial Detallado de Desbloqueos en Apps con Paginación */}
                <div className="tl-obs-card">
                  <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, margin: 0, color: theme === 'light' ? '#0f172a' : '#ffffff' }}>
                        Registro de Usabilidad y Desbloqueos en Apps
                      </h4>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                        Detalle de cada acceso a aplicaciones protegidas y respuesta del motor biométrico adaptativo
                      </span>
                    </div>

                    {/* Filtros rápidos y selector de filas por página */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <div style={{
                        display: 'inline-flex',
                        borderRadius: '8px',
                        padding: '2px',
                        background: theme === 'light' ? '#f1f5f9' : '#0b0f19',
                        border: `1px solid ${theme === 'light' ? '#cbd5e1' : '#334155'}`
                      }}>
                        <button
                          type="button"
                          onClick={() => { setAuthFilter('ALL'); setAuthPage(1); }}
                          className={`tl-tab-btn ${authFilter === 'ALL' ? 'active' : ''}`}
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.68rem', borderRadius: '6px' }}
                        >
                          Todos ({rawAuthHistory.length})
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAuthFilter('ACCEPTED'); setAuthPage(1); }}
                          className={`tl-tab-btn ${authFilter === 'ACCEPTED' ? 'active' : ''}`}
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.68rem', borderRadius: '6px' }}
                        >
                          Permitidos ({rawAuthHistory.filter(h => h.is_accepted).length})
                        </button>
                        <button
                          type="button"
                          onClick={() => { setAuthFilter('REJECTED'); setAuthPage(1); }}
                          className={`tl-tab-btn ${authFilter === 'REJECTED' ? 'active' : ''}`}
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.68rem', borderRadius: '6px' }}
                        >
                          Bloqueados ({rawAuthHistory.filter(h => !h.is_accepted).length})
                        </button>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Filas:</span>
                        <select
                          value={authPageSize}
                          onChange={(e) => {
                            setAuthPageSize(Number(e.target.value));
                            setAuthPage(1);
                          }}
                          style={{
                            background: theme === 'light' ? '#ffffff' : '#0b0f19',
                            border: `1px solid ${theme === 'light' ? '#cbd5e1' : '#334155'}`,
                            color: theme === 'light' ? '#0f172a' : '#ffffff',
                            padding: '0.2rem 0.45rem',
                            borderRadius: '6px',
                            fontSize: '0.7rem'
                          }}
                        >
                          <option value={5}>5</option>
                          <option value={10}>10</option>
                          <option value={20}>20</option>
                          <option value={50}>50</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {pagedAuthHistory && pagedAuthHistory.length > 0 ? (
                    <>
                      <div className="tl-auth-table-wrapper">
                        <table className="tl-auth-table">
                          <thead>
                            <tr>
                              <th>Fecha / Hora</th>
                              <th>Aplicación</th>
                              <th>Resultado</th>
                              <th>Similitud</th>
                              <th>Motor Adaptativo ($M_t$)</th>
                              <th>Velocidad (WPM)</th>
                              <th>Hold Time Medio</th>
                            </tr>
                          </thead>
                          <tbody>
                            {pagedAuthHistory.map((row) => (
                              <tr key={row.id}>
                                <td style={{ color: theme === 'light' ? '#64748b' : '#94a3b8' }}>{row.created_at}</td>
                                <td style={{ fontWeight: 600, color: theme === 'light' ? '#0f172a' : '#ffffff' }}>
                                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <Smartphone size={13} color="#818cf8" />
                                    {row.target_app}
                                  </span>
                                </td>
                                <td>
                                  {row.is_accepted ? (
                                    <span className="tl-badge tl-badge-success">
                                      <CheckCircle size={10} /> Permitido
                                    </span>
                                  ) : (
                                    <span className="tl-badge tl-badge-danger">
                                      <XCircle size={10} /> Bloqueado
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <strong style={{ color: row.similarity_score >= 85 ? '#10b981' : '#ef4444' }}>
                                    {row.similarity_score}%
                                  </strong>
                                  <span style={{ fontSize: '0.62rem', color: '#64748b', marginLeft: '4px' }}>
                                    (umbral 85%)
                                  </span>
                                </td>
                                <td>
                                  {row.adapted ? (
                                    <span className="tl-badge tl-badge-info" title="El modelo M_t integró dinámicamente esta muestra">
                                      <Zap size={10} /> Adaptado (+1)
                                    </span>
                                  ) : (
                                    <span style={{ color: '#64748b', fontSize: '0.7rem' }}>
                                      Sin cambio
                                    </span>
                                  )}
                                </td>
                                <td>{row.wpm > 0 ? `${row.wpm} ppm` : '—'}</td>
                                <td>{row.mean_ht > 0 ? `${row.mean_ht} ms` : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>

                      {/* Barra de Paginación */}
                      <div className="tl-pagination-bar">
                        <span className="tl-pagination-info">
                          Mostrando {totalAuthRecords > 0 ? authStartIndex + 1 : 0} – {authEndIndex} de {totalAuthRecords} registros
                          {authFilter !== 'ALL' && ` (${authFilter === 'ACCEPTED' ? 'Permitidos' : 'Bloqueados'})`}
                        </span>

                        <div className="tl-pagination-controls">
                          <button
                            type="button"
                            className="tl-page-btn"
                            disabled={currentAuthPage <= 1}
                            onClick={() => setAuthPage(1)}
                            title="Primera página"
                          >
                            <ChevronsLeft size={14} />
                          </button>
                          <button
                            type="button"
                            className="tl-page-btn"
                            disabled={currentAuthPage <= 1}
                            onClick={() => setAuthPage((p) => Math.max(1, p - 1))}
                            title="Página anterior"
                          >
                            <ChevronLeft size={14} />
                            <span>Anterior</span>
                          </button>

                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.35rem 0.65rem',
                            color: theme === 'light' ? '#0f172a' : '#cbd5e1'
                          }}>
                            {currentAuthPage} / {totalAuthPages}
                          </span>

                          <button
                            type="button"
                            className="tl-page-btn"
                            disabled={currentAuthPage >= totalAuthPages}
                            onClick={() => setAuthPage((p) => Math.min(totalAuthPages, p + 1))}
                            title="Página siguiente"
                          >
                            <span>Siguiente</span>
                            <ChevronRight size={14} />
                          </button>
                          <button
                            type="button"
                            className="tl-page-btn"
                            disabled={currentAuthPage >= totalAuthPages}
                            onClick={() => setAuthPage(totalAuthPages)}
                            title="Última página"
                          >
                            <ChevronsRight size={14} />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '1.5rem', color: '#64748b', fontSize: '0.8rem' }}>
                      {rawAuthHistory.length === 0
                        ? 'No hay registros de desbloqueo aún para este participante.'
                        : 'No se encontraron registros con el filtro seleccionado.'}
                    </div>
                  )}
                </div>
                {/* Curva de Aprendizaje Motor (1..30) */}
                <div className="tl-obs-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: theme === 'light' ? '#0f172a' : '#ffffff', margin: 0 }}>
                        Curva de Aprendizaje Motor (1 a 30 Repeticiones)
                      </h4>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Velocidad (WPM) a través de las 3 series de entrenamiento</span>
                    </div>
                    <strong style={{ color: '#fbbf24', fontSize: '0.8rem' }}>"{participantDetail.participant.phrase}"</strong>
                  </div>

                  <div style={{ height: '220px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={participantDetail.learning_curve} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? '#e2e8f0' : '#1e293b'} />
                        <XAxis dataKey="repetition" stroke="#64748b" tickFormatter={(r) => `R${r}`} />
                        <YAxis stroke="#64748b" />
                        <Tooltip contentStyle={{
                          backgroundColor: theme === 'light' ? '#ffffff' : '#0f172a',
                          borderColor: theme === 'light' ? '#cbd5e1' : '#334155',
                          color: theme === 'light' ? '#0f172a' : '#ffffff',
                          borderRadius: '8px',
                          fontSize: '11px'
                        }} />
                        <Line type="monotone" dataKey="wpm" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: '#60a5fa' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Boxplots de Hold Time por Carácter */}
                {participantDetail.keys_breakdown.length > 0 && (
                  <div className="tl-obs-card">
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: theme === 'light' ? '#0f172a' : '#ffffff', margin: '0 0 0.5rem 0' }}>
                      Tiempos de Pulsación Medios por Carácter (Hold Time en ms)
                    </h4>
                    <div style={{ height: '200px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={participantDetail.keys_breakdown} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={theme === 'light' ? '#e2e8f0' : '#1e293b'} />
                          <XAxis dataKey="key" stroke="#94a3b8" />
                          <YAxis stroke="#64748b" />
                          <Tooltip contentStyle={{
                            backgroundColor: theme === 'light' ? '#ffffff' : '#0f172a',
                            borderColor: theme === 'light' ? '#cbd5e1' : '#334155',
                            color: theme === 'light' ? '#0f172a' : '#ffffff',
                            borderRadius: '8px',
                            fontSize: '11px'
                          }} />
                          <Bar dataKey="mean_ht" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* ========================================================== */}
        {/* VISTA 3: ANÁLISIS DE HIPÓTESIS H1, H2, H3                  */}
        {/* ========================================================== */}
        {viewMode === 'hipotesis' && (
          <HypothesisAnalysisView />
        )}

        {/* ========================================================== */}
        {/* MODAL DE CONFIRMACIÓN: REINICIAR TODO EL ESTUDIO           */}
        {/* ========================================================== */}
        {showResetModal && (
          <div className="tl-obs-modal-overlay">
            <div className="tl-obs-modal-card">
              <div className="tl-obs-modal-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div className="tl-obs-modal-danger-badge">
                    <AlertTriangle size={24} color="#ef4444" />
                  </div>
                  <div>
                    <h3 className="tl-obs-modal-title">¿Reiniciar todo el estudio experimental?</h3>
                    <span className="tl-obs-modal-subtitle">Esta acción es irreversible y comenzará todo desde cero</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => !resetting && setShowResetModal(false)}
                  disabled={resetting}
                  className="tl-obs-modal-close-btn"
                  title="Cerrar modal"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="tl-obs-modal-body">
                <div className="tl-obs-modal-warning-box">
                  <p style={{ margin: '0 0 0.5rem 0', fontWeight: 700, color: '#fca5a5' }}>
                    Se eliminarán de forma permanente los siguientes registros:
                  </p>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', color: '#cbd5e1', fontSize: '0.85rem', lineHeight: '1.6' }}>
                    <li><strong>Todos los participantes móviles</strong> registrados (códigos USR-001, USR-002, etc.).</li>
                    <li><strong>Todas las muestras de entrenamiento basal (M0)</strong> de 30 repeticiones.</li>
                    <li><strong>Todos los eventos de autenticación y telemetría de AppLocker</strong> (intentos legítimos e intrusiones simuladas).</li>
                    <li><strong>Todos los códigos de verificación OTP temporales</strong> emitidos por correo.</li>
                  </ul>
                </div>

                <p style={{ margin: '1rem 0 0 0', fontSize: '0.85rem', color: '#94a3b8', lineHeight: '1.5' }}>
                  Al confirmar, la base de datos volverá a su estado inicial en blanco (<strong>0 participantes, 0 muestras</strong>), permitiendo realizar una nueva tanda de pruebas o iniciar un nuevo grupo experimental limpio.
                </p>
              </div>

              <div className="tl-obs-modal-footer">
                <button
                  type="button"
                  onClick={() => setShowResetModal(false)}
                  disabled={resetting}
                  className="tl-obs-modal-btn-cancel"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={handleConfirmReset}
                  disabled={resetting}
                  className="tl-obs-modal-btn-danger"
                >
                  {resetting ? (
                    <>
                      <RefreshCw size={16} className="tl-spin" />
                      <span>Reiniciando base de datos...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 size={16} />
                      <span>Sí, Eliminar y Reiniciar Todo</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
