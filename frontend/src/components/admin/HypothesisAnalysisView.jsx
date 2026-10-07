import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck, AlertTriangle, HelpCircle, CheckCircle2, XCircle,
  Sliders, Download, RefreshCw, Layers, Zap, Clock, Smartphone,
  Info, BarChart2, Eye, FileSpreadsheet, Lock, Sparkles, ChevronDown, ChevronUp
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area,
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend, ReferenceLine
} from 'recharts';
import api from '../../services/api';
import { useTheme } from '../../context/ThemeContext';

export default function HypothesisAnalysisView() {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [activeTab, setActiveTab] = useState('summary'); // 'summary' | 'h1' | 'h2' | 'h3'
  const [loading, setLoading] = useState(true);
  const [theta, setTheta] = useState(0.75);
  const [contextFilter, setContextFilter] = useState('ALL');
  const [impostorSource, setImpostorSource] = useState('ALL');
  const [showQualityDetails, setShowQualityDetails] = useState(false);

  // Datos
  const [summaryData, setSummaryData] = useState(null);
  const [h1Data, setH1Data] = useState(null);
  const [h2Data, setH2Data] = useState(null);
  const [h3Data, setH3Data] = useState(null);

  useEffect(() => {
    loadAllHypothesisData();
  }, [theta, contextFilter, impostorSource]);

  const loadAllHypothesisData = async () => {
    setLoading(true);
    try {
      const qParams = `theta=${theta}&context=${contextFilter}&impostor_source=${impostorSource}`;
      const [sumRes, h1Res, h2Res, h3Res] = await Promise.all([
        api.get(`/mobile/study/hypotheses/summary?${qParams}`),
        api.get(`/mobile/study/hypotheses/h1?${qParams}`),
        api.get(`/mobile/study/hypotheses/h2?${qParams}`),
        api.get(`/mobile/study/hypotheses/h3?${qParams}`)
      ]);
      setSummaryData(sumRes.data);
      setH1Data(h1Res.data);
      setH2Data(h2Res.data);
      setH3Data(h3Res.data);
    } catch (err) {
      console.error('Error cargando datos de análisis de hipótesis:', err);
    } finally {
      setLoading(false);
    }
  };

  // Helper de descarga CSV cliente
  const downloadCsv = (filename, headers, rows) => {
    const csvContent = [
      headers.join(','),
      ...rows.map(r => r.map(val => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.csv`;
    link.click();
  };

  // Helper para exportar SVG de un contenedor Recharts
  const downloadChartSvg = (containerId, filename) => {
    const container = document.getElementById(containerId);
    if (!container) return;
    const svg = container.querySelector('svg');
    if (!svg) return;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}.svg`;
    link.click();
  };

  const downloadPaperSummary = async (format = 'csv') => {
    if (format === 'csv') {
      window.open(`/api/mobile/study/hypotheses/export/summary?format=csv&theta=${theta}`, '_blank');
    } else {
      try {
        const res = await api.get(`/mobile/study/hypotheses/export/summary?format=json&theta=${theta}`);
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `tecleollave_hipotesis_summary_${theta}.json`;
        link.click();
      } catch (err) {
        console.error('Error exportando JSON:', err);
      }
    }
  };

  const getStatusBadge = (status) => {
    if (status === 'CUMPLE') {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
          padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700,
          background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)'
        }}>
          <CheckCircle2 size={13} /> CUMPLE
        </span>
      );
    }
    if (status === 'NO_CUMPLE') {
      return (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
          padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700,
          background: 'rgba(239, 68, 68, 0.15)', color: '#fb7185', border: '1px solid rgba(239, 68, 68, 0.3)'
        }}>
          <XCircle size={13} /> NO CUMPLE
        </span>
      );
    }
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.35rem',
        padding: '0.25rem 0.65rem', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700,
        background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.3)'
      }}>
        <AlertTriangle size={13} /> INCONCLUSO
      </span>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* 1. Barra de Filtros e Indicadores Comunes */}
      <div style={{
        background: isLight ? '#ffffff' : '#0d1322',
        border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
        borderRadius: '12px', padding: '1rem', display: 'flex', flexWrap: 'wrap',
        alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
        boxShadow: isLight ? '0 1px 3px rgba(0, 0, 0, 0.04)' : 'none'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          {/* Slider Umbral Theta */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '0.78rem', color: isLight ? '#475569' : '#94a3b8', fontWeight: 600 }}>
              Umbral $\theta$: <strong style={{ color: '#818cf8', fontSize: '0.88rem' }}>{theta.toFixed(2)}</strong>
            </span>
            <input
              type="range"
              min="0.50"
              max="0.95"
              step="0.01"
              value={theta}
              onChange={(e) => setTheta(parseFloat(e.target.value))}
              style={{ width: '130px', accentColor: '#818cf8', cursor: 'pointer' }}
            />
          </div>

          {/* Fuente de Impostor */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: isLight ? '#475569' : '#94a3b8', fontWeight: 600 }}>Impostores:</span>
            <select
              value={impostorSource}
              onChange={(e) => setImpostorSource(e.target.value)}
              style={{
                background: isLight ? '#ffffff' : '#151d30',
                color: isLight ? '#0f172a' : '#f1f5f9',
                border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.15)',
                padding: '0.35rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', outline: 'none'
              }}
            >
              <option value="ALL">Todos (Reales + CROSS_EVAL)</option>
              <option value="LABELED">Solo Etiquetados Presenciales</option>
              <option value="CROSS_EVAL">Solo Síntesis Cruzada (CROSS_EVAL)</option>
            </select>
          </div>

          {/* Contexto */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.78rem', color: isLight ? '#475569' : '#94a3b8', fontWeight: 600 }}>Contexto:</span>
            <select
              value={contextFilter}
              onChange={(e) => setContextFilter(e.target.value)}
              style={{
                background: isLight ? '#ffffff' : '#151d30',
                color: isLight ? '#0f172a' : '#f1f5f9',
                border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.15)',
                padding: '0.35rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', outline: 'none'
              }}
            >
              <option value="ALL">Todos los Contextos</option>
              <option value="SYSTEM_LOCK">Bloqueo Maestro (SYSTEM_LOCK)</option>
              <option value="APPLOCKER">App Locker (Apps Interceptadas)</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            onClick={() => loadAllHypothesisData()}
            className="tl-obs-btn-secondary"
            title="Recalcular análisis"
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            <span>Recalcular</span>
          </button>

          <button
            onClick={() => downloadPaperSummary('csv')}
            className="tl-obs-btn-secondary"
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', borderColor: 'rgba(52, 211, 153, 0.3)', color: '#34d399' }}
            title="Descargar resumen consolidado CSV para citas"
          >
            <FileSpreadsheet size={14} />
            <span>Citar en Paper (CSV)</span>
          </button>

          <button
            onClick={() => downloadPaperSummary('json')}
            className="tl-obs-btn-secondary"
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem' }}
            title="Descargar JSON para Overleaf / Scripts"
          >
            <Download size={14} />
            <span>JSON</span>
          </button>
        </div>
      </div>

      {/* 2. Tarjetas de Resumen Superior: H1, H2, H3 */}
      {summaryData && summaryData.cards && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1rem' }}>
          {summaryData.cards.map((card) => (
            <div
              key={card.hypothesis_id}
              className="tl-hyp-item-card"
              style={{
                background: isLight ? '#ffffff' : '#0d1322',
                border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
                borderRadius: '12px',
                padding: '1.15rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '0.75rem',
                boxShadow: isLight ? '0 2px 8px rgba(0, 0, 0, 0.04)' : '0 4px 12px rgba(0, 0, 0, 0.25)'
              }}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#818cf8', letterSpacing: '0.02em' }}>
                    {card.hypothesis_id} · {card.title}
                  </span>
                  {getStatusBadge(card.status)}
                </div>

                <div style={{ fontSize: '0.73rem', color: isLight ? '#64748b' : '#94a3b8', marginBottom: '0.6rem' }}>
                  Criterio: <strong style={{ color: isLight ? '#0f172a' : '#cbd5e1' }}>{card.criterion}</strong>
                </div>

                <div style={{
                  display: 'flex', alignItems: 'baseline', gap: '0.75rem',
                  padding: '0.5rem 0.75rem',
                  background: isLight ? '#f8fafc' : '#090d16',
                  borderRadius: '8px',
                  border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.04)'}`,
                  marginBottom: '0.6rem'
                }}>
                  <div>
                    <span style={{ fontSize: '0.65rem', color: isLight ? '#64748b' : '#94a3b8', display: 'block' }}>Valor Observado:</span>
                    <strong style={{ fontSize: '1.05rem', color: isLight ? '#0f172a' : '#ffffff' }}>{card.observed_value}</strong>
                  </div>
                  <div style={{ borderLeft: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`, paddingLeft: '0.75rem' }}>
                    <span style={{ fontSize: '0.65rem', color: isLight ? '#64748b' : '#94a3b8', display: 'block' }}>IC 95% Clopper/Boot:</span>
                    <strong style={{ fontSize: '0.85rem', color: '#818cf8' }}>{card.confidence_interval}</strong>
                  </div>
                </div>

                {card.secondary_metric && (
                  <div style={{ fontSize: '0.72rem', color: isLight ? '#64748b' : '#94a3b8', marginBottom: '0.4rem' }}>
                    Métrica de contraste: <span style={{ color: isLight ? '#0f172a' : '#cbd5e1', fontWeight: 600 }}>{card.secondary_metric}</span>
                  </div>
                )}
              </div>

              <div style={{
                fontSize: '0.7rem', color: card.status === 'CUMPLE' ? '#10b981' : card.status === 'NO_CUMPLE' ? '#ef4444' : '#f59e0b',
                background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.02)', padding: '0.5rem', borderRadius: '6px', lineHeight: '1.4'
              }}>
                {card.verdict_reason}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 3. Panel de Calidad de Datos (Colapsable) */}
      {summaryData?.quality_report && (
        <div style={{
          background: isLight ? '#ffffff' : '#0a0e19',
          border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.06)'}`,
          borderRadius: '10px', overflow: 'hidden',
          boxShadow: isLight ? '0 1px 3px rgba(0, 0, 0, 0.04)' : 'none'
        }}>
          <button
            onClick={() => setShowQualityDetails(!showQualityDetails)}
            style={{
              width: '100%', background: 'transparent', border: 'none', padding: '0.75rem 1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              color: isLight ? '#64748b' : '#94a3b8', cursor: 'pointer', textAlign: 'left'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <Info size={15} color="#818cf8" />
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: isLight ? '#0f172a' : '#e2e8f0' }}>
                Panel de Integridad y Calidad de Datos ({summaryData.quality_report.enrolled_participants} participantes · {summaryData.quality_report.total_samples} muestras registradas)
              </span>
              {summaryData.quality_report.is_publication_ready ? (
                <span style={{ fontSize: '0.65rem', color: '#10b981', background: isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px', border: isLight ? '1px solid #a7f3d0' : 'none' }}>
                  Apto para Publicación
                </span>
              ) : (
                <span style={{ fontSize: '0.65rem', color: '#d97706', background: isLight ? '#fffbeb' : 'rgba(245, 158, 11, 0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px', border: isLight ? '1px solid #fde68a' : 'none' }}>
                  En Recolección
                </span>
              )}
            </div>
            {showQualityDetails ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showQualityDetails && (
            <div style={{ padding: '0.75rem 1rem 1rem', borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.05)'}`, fontSize: '0.75rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '0.75rem', marginBottom: '0.75rem' }}>
                <div><span style={{ color: '#64748b' }}>Sujetos Enrolados (N):</span> <strong style={{ color: isLight ? '#0f172a' : '#ffffff' }}>{summaryData.quality_report.enrolled_participants}</strong></div>
                <div><span style={{ color: '#64748b' }}>Intentos Legítimos:</span> <strong style={{ color: isLight ? '#0f172a' : '#ffffff' }}>{summaryData.quality_report.legitimate_attempts}</strong></div>
                <div><span style={{ color: '#64748b' }}>Intentos Impostor:</span> <strong style={{ color: isLight ? '#0f172a' : '#ffffff' }}>{summaryData.quality_report.impostor_attempts}</strong></div>
                <div><span style={{ color: '#64748b' }}>Muestras sin etiquetar:</span> <strong style={{ color: isLight ? '#0f172a' : '#ffffff' }}>{summaryData.quality_report.unlabeled_samples_pct}%</strong></div>
                <div><span style={{ color: '#64748b' }}>Sin telemetría de latencia:</span> <strong style={{ color: isLight ? '#0f172a' : '#ffffff' }}>{summaryData.quality_report.missing_timing_pct}%</strong></div>
              </div>

              {summaryData.quality_report.warnings?.length > 0 && (
                <div style={{ background: isLight ? '#fffbeb' : 'rgba(245, 158, 11, 0.08)', border: `1px solid ${isLight ? '#fde68a' : 'rgba(245, 158, 11, 0.2)'}`, padding: '0.5rem 0.75rem', borderRadius: '6px' }}>
                  <strong style={{ color: isLight ? '#b45309' : '#fbbf24', display: 'block', marginBottom: '0.2rem' }}>Advertencias de Validez Científica:</strong>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', color: isLight ? '#475569' : '#cbd5e1', lineHeight: '1.4' }}>
                    {summaryData.quality_report.warnings.map((w, idx) => (
                      <li key={idx}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* 4. Selector de Pestañas de Hipótesis */}
      <div style={{
        display: 'flex', gap: '0.5rem', borderBottom: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.08)'}`,
        paddingBottom: '0.2rem', overflowX: 'auto'
      }}>
        <button
          onClick={() => setActiveTab('summary')}
          className={`tl-tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
        >
          <Layers size={14} />
          <span>Visión Integral Comparativa</span>
        </button>

        <button
          onClick={() => setActiveTab('h1')}
          className={`tl-tab-btn ${activeTab === 'h1' ? 'active' : ''}`}
        >
          <ShieldCheck size={14} />
          <span>H1: Contraseñas Comunes</span>
        </button>

        <button
          onClick={() => setActiveTab('h2')}
          className={`tl-tab-btn ${activeTab === 'h2' ? 'active' : ''}`}
        >
          <Smartphone size={14} />
          <span>H2: Protección Dual (Bloqueo vs Apps)</span>
        </button>

        <button
          onClick={() => setActiveTab('h3')}
          className={`tl-tab-btn ${activeTab === 'h3' ? 'active' : ''}`}
        >
          <Zap size={14} />
          <span>H3: Viabilidad Operativa y Usabilidad</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* PESTAÑA: H1 (NEUTRALIZACIÓN DE CONTRASEÑAS COMUNES)                        */}
      {/* ========================================================================= */}
      {activeTab === 'h1' && h1Data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Fila 1: Curva ROC y Curva DET */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem' }}>
            
            {/* Curva ROC */}
            <div className="tl-obs-card" id="h1-roc-chart-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: isLight ? '#0f172a' : '#ffffff', margin: 0 }}>
                    Curva ROC de Discriminación Biométrica
                  </h4>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Sensibilidad (TPR) frente a Tasa de Falsos Positivos (FPR)</span>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#818cf8', background: 'rgba(99, 102, 241, 0.15)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    AUC = {h1Data.metrics.auc || 'N/A'}
                  </span>
                  <button onClick={() => downloadChartSvg('h1-roc-chart-container', 'curva_roc_h1')} className="tl-obs-btn-secondary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}>SVG</button>
                </div>
              </div>

              <div style={{ height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={h1Data.curves.roc_points || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'} />
                    <XAxis dataKey="fpr" type="number" domain={[0, 100]} stroke="#64748b" tickFormatter={(v) => `${v}%`} fontSize={10} />
                    <YAxis dataKey="tpr" type="number" domain={[0, 100]} stroke="#64748b" tickFormatter={(v) => `${v}%`} fontSize={10} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isLight ? '#ffffff' : '#0f172a',
                        borderColor: isLight ? '#cbd5e1' : '#334155',
                        color: isLight ? '#0f172a' : '#ffffff',
                        borderRadius: '8px',
                        fontSize: '11px'
                      }}
                      formatter={(val, name) => [`${val}%`, name === 'tpr' ? 'TPR (Genuinos Aceptados)' : name]}
                    />
                    <Line type="monotone" dataKey="tpr" stroke="#34d399" strokeWidth={2.5} dot={false} name="TPR" />
                    <ReferenceLine x={h1Data.metrics.observed_far_pct || 0} stroke="#fbbf24" strokeDasharray="4 4" label={{ value: `FAR=${h1Data.metrics.observed_far_pct}%`, fill: '#fbbf24', fontSize: 10 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Curva de Compromiso FAR / FRR vs Umbral */}
            <div className="tl-obs-card" id="h1-threshold-chart-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: isLight ? '#0f172a' : '#ffffff', margin: 0 }}>
                    Compromiso FAR vs FRR según Umbral ($\theta$)
                  </h4>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Punto de cruce EER marcado en θ={h1Data.curves.eer_threshold || 'N/A'}</span>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                    EER = {h1Data.metrics.observed_eer_pct}%
                  </span>
                  <button onClick={() => downloadChartSvg('h1-threshold-chart-container', 'far_frr_umbral_h1')} className="tl-obs-btn-secondary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}>SVG</button>
                </div>
              </div>

              <div style={{ height: '260px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={h1Data.curves.threshold_curve || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'} />
                    <XAxis dataKey="threshold" stroke="#64748b" fontSize={10} />
                    <YAxis type="number" domain={[0, 100]} stroke="#64748b" tickFormatter={(v) => `${v}%`} fontSize={10} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isLight ? '#ffffff' : '#0f172a',
                        borderColor: isLight ? '#cbd5e1' : '#334155',
                        color: isLight ? '#0f172a' : '#ffffff',
                        borderRadius: '8px',
                        fontSize: '11px'
                      }}
                      formatter={(val) => [`${val}%`]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '5px' }} />
                    <Line type="monotone" dataKey="far" stroke="#fbbf24" strokeWidth={2} dot={false} name="FAR (Falsa Aceptación)" />
                    <Line type="monotone" dataKey="frr" stroke="#a78bfa" strokeWidth={2} dot={false} name="FRR (Falso Rechazo)" />
                    <ReferenceLine x={theta} stroke="#818cf8" strokeDasharray="3 3" label={{ value: `θ=${theta}`, fill: '#818cf8', fontSize: 10 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Fila 2: Distribución de Puntuaciones y Matriz de Confusión */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.25rem' }}>
            
            {/* Distribución de Scores (Histograma) */}
            <div className="tl-obs-card" id="h1-dist-chart-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div>
                  <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: isLight ? '#0f172a' : '#ffffff', margin: 0 }}>
                    Distribución de Densidad de Similitud
                  </h4>
                  <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>Genuinos (Legítimos) frente a Impostores (Misma Contraseña)</span>
                </div>
                <button onClick={() => downloadChartSvg('h1-dist-chart-container', 'distribucion_scores_h1')} className="tl-obs-btn-secondary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}>SVG</button>
              </div>

              <div style={{ height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={h1Data.score_distribution || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'} />
                    <XAxis dataKey="center" stroke="#64748b" fontSize={9} />
                    <YAxis stroke="#64748b" tickFormatter={(v) => `${v}%`} fontSize={9} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isLight ? '#ffffff' : '#0f172a',
                        borderColor: isLight ? '#cbd5e1' : '#334155',
                        color: isLight ? '#0f172a' : '#ffffff',
                        borderRadius: '8px',
                        fontSize: '11px'
                      }}
                      formatter={(v) => [`${v}%`]}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px' }} />
                    <Bar dataKey="legitimate_pct" fill="#34d399" opacity={0.85} name="Genuinos" />
                    <Bar dataKey="impostor_pct" fill="#fb7185" opacity={0.85} name="Impostores" />
                    <ReferenceLine x={theta} stroke="#818cf8" strokeWidth={2} strokeDasharray="4 4" label={{ value: `θ=${theta}`, fill: '#818cf8', fontSize: 10 }} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Matriz de Confusión 2x2 */}
            <div className="tl-obs-card">
              <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: isLight ? '#0f172a' : '#ffffff', margin: '0 0 0.5rem 0' }}>
                Matriz de Confusión al Umbral $\theta = {theta}$
              </h4>
              <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '0 0 0.75rem 0' }}>
                Clasificación de decisiones con $N={h1Data.confusion_matrix.total}$ intentos evaluados.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem', textAlign: 'center' }}>
                <div style={{ background: isLight ? '#ecfdf5' : 'rgba(16, 185, 129, 0.08)', border: `1px solid ${isLight ? '#a7f3d0' : 'rgba(16, 185, 129, 0.25)'}`, borderRadius: '8px', padding: '0.75rem' }}>
                  <span style={{ fontSize: '0.65rem', color: isLight ? '#059669' : '#34d399', fontWeight: 700, display: 'block' }}>VERDADEROS POSITIVOS (TP)</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff' }}>{h1Data.confusion_matrix.tp}</div>
                  <span style={{ fontSize: '0.65rem', color: '#64748b' }}>TPR: {h1Data.confusion_matrix.tpr_pct}%</span>
                </div>

                <div style={{ background: isLight ? '#fff1f2' : 'rgba(239, 68, 68, 0.08)', border: `1px solid ${isLight ? '#fecdd3' : 'rgba(239, 68, 68, 0.25)'}`, borderRadius: '8px', padding: '0.75rem' }}>
                  <span style={{ fontSize: '0.65rem', color: isLight ? '#e11d48' : '#fb7185', fontWeight: 700, display: 'block' }}>FALSOS POSITIVOS (FP - FAR)</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fb7185' }}>{h1Data.confusion_matrix.fp}</div>
                  <span style={{ fontSize: '0.65rem', color: '#64748b' }}>FAR: {h1Data.confusion_matrix.far_pct}%</span>
                </div>

                <div style={{ background: isLight ? '#fffbeb' : 'rgba(167, 139, 250, 0.08)', border: `1px solid ${isLight ? '#fde68a' : 'rgba(167, 139, 250, 0.25)'}`, borderRadius: '8px', padding: '0.75rem' }}>
                  <span style={{ fontSize: '0.65rem', color: isLight ? '#d97706' : '#a78bfa', fontWeight: 700, display: 'block' }}>FALSOS NEGATIVOS (FN - FRR)</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isLight ? '#d97706' : '#a78bfa' }}>{h1Data.confusion_matrix.fn}</div>
                  <span style={{ fontSize: '0.65rem', color: '#64748b' }}>FRR: {h1Data.confusion_matrix.frr_pct}%</span>
                </div>

                <div style={{ background: isLight ? '#eff6ff' : 'rgba(56, 189, 248, 0.08)', border: `1px solid ${isLight ? '#bfdbfe' : 'rgba(56, 189, 248, 0.25)'}`, borderRadius: '8px', padding: '0.75rem' }}>
                  <span style={{ fontSize: '0.65rem', color: isLight ? '#2563eb' : '#38bdf8', fontWeight: 700, display: 'block' }}>VERDADEROS NEGATIVOS (TN)</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff' }}>{h1Data.confusion_matrix.tn}</div>
                  <span style={{ fontSize: '0.65rem', color: '#64748b' }}>TNR: {h1Data.confusion_matrix.tnr_pct}%</span>
                </div>
              </div>

              {/* Comparación por Sesión (Reintentos) */}
              <div style={{
                marginTop: '0.75rem',
                background: isLight ? '#f8fafc' : '#090d16',
                padding: '0.6rem 0.75rem',
                borderRadius: '8px',
                border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.04)'}`
              }}>
                <span style={{ fontSize: '0.68rem', color: isLight ? '#64748b' : '#94a3b8', display: 'block', marginBottom: '0.25rem' }}>
                  Análisis de Riesgo Acumulado por Sesión (Hasta 3 Intentos Permitidos):
                </span>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span>FAR por Intento Único: <strong style={{ color: '#fbbf24' }}>{h1Data.session_analysis.far_single_attempt}%</strong></span>
                  <span>FAR en Sesión de 3 Intentos: <strong style={{ color: '#fb7185' }}>{h1Data.session_analysis.far_3_retries_session}%</strong></span>
                </div>
              </div>
            </div>
          </div>

          {/* Fila 3: Tabla de EER individual por Participante */}
          {h1Data.per_participant_eer?.length > 0 && (
            <div className="tl-obs-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: isLight ? '#0f172a' : '#ffffff', margin: 0 }}>
                  Desglose de Equal Error Rate (EER) por Participante Individual
                </h4>
                <button
                  onClick={() => downloadCsv(
                    'eer_por_participante_h1',
                    ['participante_id', 'eer_pct', 'muestras_legitimas', 'muestras_impostor'],
                    h1Data.per_participant_eer.map(p => [p.participant_id, p.eer, p.n_leg, p.n_imp])
                  )}
                  className="tl-obs-btn-secondary"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                >
                  Descargar CSV
                </button>
              </div>

              <div style={{ overflowX: 'auto', maxHeight: '200px' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)'}`, color: isLight ? '#64748b' : '#94a3b8' }}>
                      <th style={{ padding: '0.4rem' }}>ID Sujeto</th>
                      <th style={{ padding: '0.4rem' }}>EER Individual</th>
                      <th style={{ padding: '0.4rem' }}>Intentos Legítimos</th>
                      <th style={{ padding: '0.4rem' }}>Intentos Impostor</th>
                      <th style={{ padding: '0.4rem' }}>Criterio (&le; 2.50%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {h1Data.per_participant_eer.map((row) => (
                      <tr key={row.participant_id} style={{ borderBottom: `1px solid ${isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.04)'}` }}>
                        <td style={{ padding: '0.4rem', color: '#818cf8', fontWeight: 600 }}>Sujeto #{row.participant_id}</td>
                        <td style={{ padding: '0.4rem', fontWeight: 700, color: row.eer <= 2.50 ? '#34d399' : '#fb7185' }}>{row.eer}%</td>
                        <td style={{ padding: '0.4rem', color: isLight ? '#334155' : 'inherit' }}>{row.n_leg}</td>
                        <td style={{ padding: '0.4rem', color: isLight ? '#334155' : 'inherit' }}>{row.n_imp}</td>
                        <td style={{ padding: '0.4rem' }}>
                          {row.eer <= 2.50 ? (
                            <span style={{ color: '#34d399', fontSize: '0.7rem' }}>✓ Conforme</span>
                          ) : (
                            <span style={{ color: '#fb7185', fontSize: '0.7rem' }}>✗ Excede</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA: H2 (PROTECCIÓN DUAL: SISTEMA VS APP LOCKER)                       */}
      {/* ========================================================================= */}
      {activeTab === 'h2' && h2Data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Fila 1: Dos Matrices de Confusión lado a lado */}
          {h2Data.matrices && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '1.25rem' }}>
              
              {/* Contexto 1: Bloqueo Maestro */}
              <div className="tl-obs-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#818cf8', margin: 0 }}>
                    1. Bloqueo Maestro (Escudo de Pantalla Móvil)
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700 }}>
                    EER = {h2Data.comparison?.system_lock?.eer_pct || 'N/A'}%
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
                  <div className="tl-stat-subbox">
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>FAR (Falsa Aceptación)</span>
                    <strong style={{ display: 'block', fontSize: '1rem', color: '#fbbf24' }}>{h2Data.matrices.system_lock?.far_pct}%</strong>
                  </div>
                  <div className="tl-stat-subbox">
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>FRR (Falso Rechazo)</span>
                    <strong style={{ display: 'block', fontSize: '1rem', color: '#a78bfa' }}>{h2Data.matrices.system_lock?.frr_pct}%</strong>
                  </div>
                  <div className="tl-stat-subbox">
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Exactitud Global</span>
                    <strong style={{ display: 'block', fontSize: '1rem', color: '#34d399' }}>{h2Data.matrices.system_lock?.accuracy_pct}%</strong>
                  </div>
                  <div className="tl-stat-subbox">
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Total Evaluados</span>
                    <strong style={{ display: 'block', fontSize: '1rem', color: isLight ? '#0f172a' : '#ffffff' }}>{h2Data.matrices.system_lock?.total}</strong>
                  </div>
                </div>
              </div>

              {/* Contexto 2: App Locker */}
              <div className="tl-obs-card">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                  <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: '#34d399', margin: 0 }}>
                    2. App Locker (WhatsApp, BCP, Bancos, Galería)
                  </h4>
                  <span style={{ fontSize: '0.72rem', color: '#34d399', fontWeight: 700 }}>
                    EER = {h2Data.comparison?.applocker?.eer_pct || 'N/A'}%
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', textAlign: 'center' }}>
                  <div className="tl-stat-subbox">
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>FAR (Falsa Aceptación)</span>
                    <strong style={{ display: 'block', fontSize: '1rem', color: '#fbbf24' }}>{h2Data.matrices.applocker?.far_pct}%</strong>
                  </div>
                  <div className="tl-stat-subbox">
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>FRR (Falso Rechazo)</span>
                    <strong style={{ display: 'block', fontSize: '1rem', color: '#a78bfa' }}>{h2Data.matrices.applocker?.frr_pct}%</strong>
                  </div>
                  <div className="tl-stat-subbox">
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Exactitud Global</span>
                    <strong style={{ display: 'block', fontSize: '1rem', color: '#34d399' }}>{h2Data.matrices.applocker?.accuracy_pct}%</strong>
                  </div>
                  <div className="tl-stat-subbox">
                    <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>Total Evaluados</span>
                    <strong style={{ display: 'block', fontSize: '1rem', color: isLight ? '#0f172a' : '#ffffff' }}>{h2Data.matrices.applocker?.total}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Fila 2: Pruebas Estadísticas Inferenciales (Wilcoxon, TOST, McNemar) */}
          <div className="tl-obs-card">
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: isLight ? '#0f172a' : '#ffffff', margin: '0 0 0.4rem 0' }}>
              Pruebas Estadísticas de Invarianza y Equivalencia Inter-Contexto
            </h4>
            <p style={{ fontSize: '0.72rem', color: '#94a3b8', margin: '0 0 0.9rem 0', lineHeight: '1.4' }}>
              Para comprobar la Hipótesis $H_2$, se evalúa si el comportamiento biométrico del usuario es consistente cuando desbloquea la pantalla general frente a cuando accede a una app sensible protegida.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '0.75rem' }}>
              
              {/* Prueba de Wilcoxon */}
              <div className="tl-hyp-item-card">
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8', display: 'block', marginBottom: '0.2rem' }}>
                  Prueba de Rangos con Signo de Wilcoxon
                </span>
                <div style={{ fontSize: '0.75rem', color: isLight ? '#0f172a' : '#e2e8f0', marginBottom: '0.4rem' }}>
                  Estadístico W: <strong>{h2Data.statistical_tests?.wilcoxon_signed_rank?.statistic}</strong> · p-value: <strong style={{ color: h2Data.statistical_tests?.wilcoxon_signed_rank?.p_value > 0.05 ? '#34d399' : '#fb7185' }}>{h2Data.statistical_tests?.wilcoxon_signed_rank?.p_value}</strong>
                </div>
                <p style={{ fontSize: '0.68rem', color: '#94a3b8', margin: 0 }}>
                  {h2Data.statistical_tests?.wilcoxon_signed_rank?.conclusion}
                </p>
              </div>

              {/* Prueba de Equivalencia TOST */}
              <div className="tl-hyp-item-card">
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#34d399', display: 'block', marginBottom: '0.2rem' }}>
                  Prueba de Equivalencia TOST (Margen $\pm {h2Data.statistical_tests?.tost_equivalence?.margin_epsilon}%$)
                </span>
                <div style={{ fontSize: '0.75rem', color: isLight ? '#0f172a' : '#e2e8f0', marginBottom: '0.4rem' }}>
                  IC 95% de la diferencia: <strong style={{ color: '#818cf8' }}>[{h2Data.comparison?.diff_ci_95?.[0]}%, {h2Data.comparison?.diff_ci_95?.[1]}%]</strong>
                </div>
                <p style={{ fontSize: '0.68rem', color: '#94a3b8', margin: 0 }}>
                  {h2Data.statistical_tests?.tost_equivalence?.conclusion}
                </p>
              </div>
            </div>
          </div>

          {/* Fila 3: Desglose por Aplicación Protegida */}
          {h2Data.app_breakdown?.length > 0 && (
            <div className="tl-obs-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: isLight ? '#0f172a' : '#ffffff', margin: 0 }}>
                  Desglose de Eficacia por Aplicación Protegida (App Locker)
                </h4>
                <button
                  onClick={() => downloadCsv(
                    'desglose_apps_h2',
                    ['app_nombre', 'intentos', 'far_pct', 'frr_pct', 'exactitud_pct'],
                    h2Data.app_breakdown.map(a => [a.app_name, a.attempts, a.far_pct, a.frr_pct, a.accuracy_pct])
                  )}
                  className="tl-obs-btn-secondary"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                >
                  Descargar CSV
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)'}`, color: isLight ? '#64748b' : '#94a3b8' }}>
                      <th style={{ padding: '0.4rem' }}>Aplicación Destino</th>
                      <th style={{ padding: '0.4rem' }}>Intentos Registrados</th>
                      <th style={{ padding: '0.4rem' }}>FAR (%)</th>
                      <th style={{ padding: '0.4rem' }}>FRR (%)</th>
                      <th style={{ padding: '0.4rem' }}>Precisión (%)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {h2Data.app_breakdown.map((row) => (
                      <tr key={row.app_name} style={{ borderBottom: `1px solid ${isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.04)'}` }}>
                        <td style={{ padding: '0.4rem', color: isLight ? '#0f172a' : '#ffffff', fontWeight: 600 }}>{row.app_name}</td>
                        <td style={{ padding: '0.4rem', color: isLight ? '#334155' : 'inherit' }}>{row.attempts}</td>
                        <td style={{ padding: '0.4rem', color: '#fbbf24' }}>{row.far_pct}%</td>
                        <td style={{ padding: '0.4rem', color: '#a78bfa' }}>{row.frr_pct}%</td>
                        <td style={{ padding: '0.4rem', color: '#34d399', fontWeight: 700 }}>{row.accuracy_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA: H3 (VIABILIDAD OPERATIVA Y USABILIDAD)                             */}
      {/* ========================================================================= */}
      {activeTab === 'h3' && h3Data && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Fila 1: Tarjetas de Latencias y Percentiles */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
            
            {/* Inferencia */}
            <div className="tl-obs-card">
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#818cf8', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Zap size={14} /> Tiempo de Inferencia Algorítmica
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff', margin: '0.4rem 0 0.2rem' }}>
                p95 = {h3Data.latencies?.inference_ms?.p95 || 'N/A'} ms
              </div>
              <span style={{ fontSize: '0.7rem', color: isLight ? '#059669' : '#34d399', fontWeight: 600 }}>
                Meta: &lt; 50.0 ms ({h3Data.latencies?.inference_ms?.compliance_pct}% de muestras cumplen)
              </span>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: isLight ? '#64748b' : '#94a3b8', marginTop: '0.5rem', borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'}`, paddingTop: '0.4rem' }}>
                <span>p50: <strong style={{ color: isLight ? '#0f172a' : '#ffffff' }}>{h3Data.latencies?.inference_ms?.p50} ms</strong></span>
                <span>p99: <strong style={{ color: isLight ? '#0f172a' : '#ffffff' }}>{h3Data.latencies?.inference_ms?.p99} ms</strong></span>
              </div>
            </div>

            {/* Retardo de Desbloqueo */}
            <div className="tl-obs-card">
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isLight ? '#059669' : '#34d399', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Clock size={14} /> Retardo Total de Desbloqueo
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff', margin: '0.4rem 0 0.2rem' }}>
                p95 = {h3Data.latencies?.unlock_delay_ms?.p95 || 'N/A'} ms
              </div>
              <span style={{ fontSize: '0.7rem', color: isLight ? '#059669' : '#34d399', fontWeight: 600 }}>
                Meta: &lt; 1800 ms ({h3Data.latencies?.unlock_delay_ms?.compliance_pct}% de muestras cumplen)
              </span>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: isLight ? '#64748b' : '#94a3b8', marginTop: '0.5rem', borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'}`, paddingTop: '0.4rem' }}>
                <span>p50: <strong style={{ color: isLight ? '#0f172a' : '#ffffff' }}>{h3Data.latencies?.unlock_delay_ms?.p50} ms</strong></span>
                <span>p99: <strong style={{ color: isLight ? '#0f172a' : '#ffffff' }}>{h3Data.latencies?.unlock_delay_ms?.p99} ms</strong></span>
              </div>
            </div>

            {/* Falso Rechazo Biológico Neto */}
            <div className="tl-obs-card">
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: isLight ? '#7c3aed' : '#a78bfa', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldCheck size={14} /> Falso Rechazo Biológico (FRR Neto)
              </span>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: isLight ? '#0f172a' : '#ffffff', margin: '0.4rem 0 0.2rem' }}>
                {h3Data.frr_analysis?.clean_observed_frr || 'N/A'}%
              </div>
              <span style={{ fontSize: '0.7rem', color: isLight ? '#7c3aed' : '#a78bfa', fontWeight: 600 }}>
                IC 95% Clopper: [{h3Data.frr_analysis?.clean_frr_ci?.[0]}%, {h3Data.frr_analysis?.clean_frr_ci?.[1]}%]
              </span>
              <div style={{ fontSize: '0.68rem', color: isLight ? '#64748b' : '#94a3b8', marginTop: '0.5rem', borderTop: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'}`, paddingTop: '0.4rem' }}>
                Meta científica: Límite superior &lt; 2.00%
              </div>
            </div>
          </div>

          {/* Fila 2: Curvas ECDF de Latencia */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.25rem' }}>
            
            {/* ECDF Inferencia */}
            <div className="tl-obs-card" id="h3-ecdf-inf-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: isLight ? '#0f172a' : '#ffffff', margin: 0 }}>
                  Función ECDF: Tiempo de Inferencia (ms)
                </h4>
                <button onClick={() => downloadChartSvg('h3-ecdf-inf-container', 'ecdf_inferencia_h3')} className="tl-obs-btn-secondary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}>SVG</button>
              </div>
              <div style={{ height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={h3Data.ecdf?.inference || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'} />
                    <XAxis dataKey="value" stroke="#64748b" tickFormatter={(v) => `${v}ms`} fontSize={10} />
                    <YAxis dataKey="cumulative_pct" stroke="#64748b" tickFormatter={(v) => `${v}%`} fontSize={10} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isLight ? '#ffffff' : '#0f172a',
                        borderColor: isLight ? '#cbd5e1' : '#334155',
                        color: isLight ? '#0f172a' : '#ffffff',
                        borderRadius: '8px',
                        fontSize: '11px'
                      }}
                      formatter={(v) => [`${v}% acumulado`]}
                    />
                    <Area type="stepAfter" dataKey="cumulative_pct" stroke="#818cf8" fill="rgba(99, 102, 241, 0.2)" strokeWidth={2} name="ECDF" />
                    <ReferenceLine x={50.0} stroke="#fb7185" strokeDasharray="4 4" label={{ value: 'Límite 50ms', fill: '#fb7185', fontSize: 10 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* ECDF Retardo Total */}
            <div className="tl-obs-card" id="h3-ecdf-delay-container">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: isLight ? '#0f172a' : '#ffffff', margin: 0 }}>
                  Función ECDF: Retardo Total de Desbloqueo (ms)
                </h4>
                <button onClick={() => downloadChartSvg('h3-ecdf-delay-container', 'ecdf_retardo_h3')} className="tl-obs-btn-secondary" style={{ padding: '0.2rem 0.4rem', fontSize: '0.7rem' }}>SVG</button>
              </div>
              <div style={{ height: '240px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={h3Data.ecdf?.delay || []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'} />
                    <XAxis dataKey="value" stroke="#64748b" tickFormatter={(v) => `${v}ms`} fontSize={10} />
                    <YAxis dataKey="cumulative_pct" stroke="#64748b" tickFormatter={(v) => `${v}%`} fontSize={10} domain={[0, 100]} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: isLight ? '#ffffff' : '#0f172a',
                        borderColor: isLight ? '#cbd5e1' : '#334155',
                        color: isLight ? '#0f172a' : '#ffffff',
                        borderRadius: '8px',
                        fontSize: '11px'
                      }}
                      formatter={(v) => [`${v}% acumulado`]}
                    />
                    <Area type="stepAfter" dataKey="cumulative_pct" stroke="#34d399" fill="rgba(16, 185, 129, 0.2)" strokeWidth={2} name="ECDF" />
                    <ReferenceLine x={1800.0} stroke="#fb7185" strokeDasharray="4 4" label={{ value: 'Límite 1.8s', fill: '#fb7185', fontSize: 10 }} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Fila 3: Desglose por Tipo de Red */}
          {h3Data.network_breakdown?.length > 0 && (
            <div className="tl-obs-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                <h4 style={{ fontSize: '0.85rem', fontWeight: 700, color: isLight ? '#0f172a' : '#ffffff', margin: 0 }}>
                  Rendimiento Operativo por Tipo de Red (Wi-Fi frente a Celular)
                </h4>
                <button
                  onClick={() => downloadCsv(
                    'rendimiento_red_h3',
                    ['tipo_red', 'intentos', 'media_inferencia_ms', 'p95_retardo_ms', 'frr_pct'],
                    h3Data.network_breakdown.map(n => [n.network_type, n.attempts, n.mean_inference_ms, n.p95_delay_ms, n.frr_pct])
                  )}
                  className="tl-obs-btn-secondary"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                >
                  Descargar CSV
                </button>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.1)'}`, color: isLight ? '#64748b' : '#94a3b8' }}>
                      <th style={{ padding: '0.4rem' }}>Conexión</th>
                      <th style={{ padding: '0.4rem' }}>Muestras</th>
                      <th style={{ padding: '0.4rem' }}>Inferencia Promedio</th>
                      <th style={{ padding: '0.4rem' }}>Retardo Desbloqueo (p95)</th>
                      <th style={{ padding: '0.4rem' }}>Tasa Falso Rechazo (FRR)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {h3Data.network_breakdown.map((row) => (
                      <tr key={row.network_type} style={{ borderBottom: `1px solid ${isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.04)'}` }}>
                        <td style={{ padding: '0.4rem', color: isLight ? '#0f172a' : '#ffffff', fontWeight: 600 }}>{row.network_type}</td>
                        <td style={{ padding: '0.4rem', color: isLight ? '#334155' : 'inherit' }}>{row.attempts}</td>
                        <td style={{ padding: '0.4rem', color: '#818cf8' }}>{row.mean_inference_ms} ms</td>
                        <td style={{ padding: '0.4rem', color: '#34d399' }}>{row.p95_delay_ms} ms</td>
                        <td style={{ padding: '0.4rem', color: '#a78bfa' }}>{row.frr_pct}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* PESTAÑA: RESUMEN INTEGRAL (COMPARATIVA)                                   */}
      {/* ========================================================================= */}
      {activeTab === 'summary' && (
        <div className="tl-obs-card">
          <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: isLight ? '#0f172a' : '#ffffff', margin: '0 0 0.5rem 0' }}>
            Consolidado Metodológico de Validación Experimental
          </h4>
          <p style={{ fontSize: '0.75rem', color: isLight ? '#64748b' : '#94a3b8', margin: '0 0 1rem 0', lineHeight: '1.4' }}>
            Resumen exhaustivo de los criterios y resultados para la redacción de la sección de Discusión y Conclusiones del artículo de investigación.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            <div className="tl-hyp-item-card" style={{ background: isLight ? '#f8fafc' : '#090d16', padding: '1rem', borderRadius: '10px', border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.05)'}` }}>
              <strong style={{ color: '#818cf8', display: 'block', marginBottom: '0.3rem' }}>$H_1$: Contraseñas Comunes</strong>
              <p style={{ fontSize: '0.72rem', color: isLight ? '#475569' : '#cbd5e1', margin: '0 0 0.5rem 0' }}>
                Demuestra que usuarios tecleando la misma clave son diferenciados por dinámica neuromuscular.
              </p>
              <div style={{ fontSize: '0.7rem', color: isLight ? '#64748b' : '#94a3b8' }}>
                FAR observado: <strong style={{ color: isLight ? '#0f172a' : '#ffffff' }}>{h1Data?.metrics?.observed_far_pct ?? 'N/A'}%</strong> (Límite superior: {h1Data?.metrics?.far_ci?.[1] ?? 'N/A'}%)<br />
                EER observado: <strong style={{ color: isLight ? '#0f172a' : '#ffffff' }}>{h1Data?.metrics?.observed_eer_pct ?? 'N/A'}%</strong> (Límite superior: {h1Data?.metrics?.eer_ci?.[1] ?? 'N/A'}%)
              </div>
            </div>

            <div className="tl-hyp-item-card" style={{ background: isLight ? '#f8fafc' : '#090d16', padding: '1rem', borderRadius: '10px', border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.05)'}` }}>
              <strong style={{ color: '#34d399', display: 'block', marginBottom: '0.3rem' }}>$H_2$: Protección Dual</strong>
              <p style={{ fontSize: '0.72rem', color: isLight ? '#475569' : '#cbd5e1', margin: '0 0 0.5rem 0' }}>
                Demuestra que el comportamiento de tecleo es consistente entre el desbloqueo maestro y el bloqueo de apps individuales.
              </p>
              <div style={{ fontSize: '0.7rem', color: isLight ? '#64748b' : '#94a3b8' }}>
                Diferencia EER: <strong style={{ color: isLight ? '#0f172a' : '#ffffff' }}>{h2Data?.comparison?.diff_eer_pct ?? 'N/A'}%</strong><br />
                Wilcoxon signed-rank: <strong style={{ color: isLight ? '#0f172a' : '#ffffff' }}>p = {h2Data?.statistical_tests?.wilcoxon_signed_rank?.p_value ?? 'N/A'}</strong>
              </div>
            </div>

            <div className="tl-hyp-item-card" style={{ background: isLight ? '#f8fafc' : '#090d16', padding: '1rem', borderRadius: '10px', border: `1px solid ${isLight ? '#e2e8f0' : 'rgba(255, 255, 255, 0.05)'}` }}>
              <strong style={{ color: '#fbbf24', display: 'block', marginBottom: '0.3rem' }}>$H_3$: Viabilidad Operativa</strong>
              <p style={{ fontSize: '0.72rem', color: isLight ? '#475569' : '#cbd5e1', margin: '0 0 0.5rem 0' }}>
                Demuestra que las latencias de desbloqueo e inferencia no degradan la experiencia de uso en el teléfono.
              </p>
              <div style={{ fontSize: '0.7rem', color: isLight ? '#64748b' : '#94a3b8' }}>
                Inferencia p95: <strong style={{ color: isLight ? '#0f172a' : '#ffffff' }}>{h3Data?.latencies?.inference_ms?.p95 ?? 'N/A'} ms</strong> (&lt; 50 ms)<br />
                Retardo p95: <strong style={{ color: isLight ? '#0f172a' : '#ffffff' }}>{h3Data?.latencies?.unlock_delay_ms?.p95 ?? 'N/A'} ms</strong> (&lt; 1800 ms)
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
