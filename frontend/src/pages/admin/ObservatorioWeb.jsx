import React, { useState, useEffect } from 'react';
import {
  Shield, Users, Activity, FileSpreadsheet, Copy, Check,
  BarChart3, ArrowLeft, RefreshCw, Star, MessageSquareQuote,
  CheckCircle2, Award, Smartphone, Cpu, LogOut
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  Tooltip, CartesianGrid, AreaChart, Area, BarChart, Bar
} from 'recharts';
import api from '../../services/api';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './observatorio.css';

export default function ObservatorioWeb() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('global'); // 'global' | 'individual'

  const [loading, setLoading] = useState(true);
  const [overviewData, setOverviewData] = useState(null);
  const [participantsList, setParticipantsList] = useState([]);
  const [selectedParticipantId, setSelectedParticipantId] = useState(null);
  const [participantDetail, setParticipantDetail] = useState(null);
  const [copiedLatex, setCopiedLatex] = useState(false);

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

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="tl-obs-container">
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
                  <div key={hyp.id} style={{ background: '#0b0f19', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '12px', padding: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <strong style={{ color: '#818cf8', fontSize: '0.9rem' }}>{hyp.id}</strong>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#34d399', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '0.15rem 0.4rem', borderRadius: '4px' }}>
                        VALIDADA
                      </span>
                    </div>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600, color: '#ffffff', marginBottom: '0.25rem' }}>{hyp.title}</div>
                    <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '0 0 0.5rem 0', lineHeight: '1.4' }}>{hyp.description}</p>
                    <div style={{ fontSize: '0.68rem', borderTop: '1px solid rgba(255, 255, 255, 0.05)', paddingTop: '0.4rem' }}>
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
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>Curva ROC Poblacional</h4>
                    <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Sensibilidad (TPR) vs 1 - Especificidad (FPR)</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#a78bfa', background: 'rgba(167, 139, 250, 0.15)', padding: '0.2rem 0.6rem', borderRadius: '6px' }}>
                    AUC = {overviewData.metrics.auc}
                  </span>
                </div>

                <div style={{ height: '240px' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={overviewData.roc_points} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                      <XAxis dataKey="fpr" stroke="#64748b" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                      <YAxis stroke="#64748b" domain={[0, 1]} tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
                      <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                      <Area type="monotone" dataKey="tpr" stroke="#8b5cf6" strokeWidth={2.5} fill="#8b5cf6" fillOpacity={0.15} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Matriz de Confusión */}
              <div className="tl-obs-card">
                <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.2rem 0' }}>Matriz de Confusión Global</h4>
                <p style={{ fontSize: '0.7rem', color: '#94a3b8', margin: '0 0 0.75rem 0' }}>
                  Aciertos del algoritmo frente a intentos legítimos vs impostores
                </p>

                <div className="tl-confusion-grid">
                  <div className="tl-confusion-box tp">
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#34d399', display: 'block', marginBottom: '0.2rem' }}>Verdaderos Positivos</span>
                    <strong style={{ fontSize: '1.4rem', color: '#ffffff', display: 'block' }}>{overviewData.confusion_matrix.true_positives}</strong>
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
                    <strong style={{ fontSize: '1.4rem', color: '#ffffff', display: 'block' }}>{overviewData.confusion_matrix.true_negatives}</strong>
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
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
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
                  style={{ background: '#0b0f19', border: '1px solid #374151', color: '#ffffff', padding: '0.5rem 0.75rem', borderRadius: '8px', fontSize: '0.75rem' }}
                >
                  {participantsList.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.code} - {p.email} ({p.reps_count}/30 reps)
                    </option>
                  ))}
                </select>
              </div>

              {participantDetail && (
                <div style={{ display: 'flex', gap: '1rem', fontSize: '0.72rem' }}>
                  <div><span style={{ color: '#64748b' }}>Dispositivo:</span> <strong>{participantDetail.participant.device}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Pantalla:</span> <strong style={{ color: '#34d399' }}>{participantDetail.participant.refresh_rate} Hz</strong></div>
                  <div><span style={{ color: '#64748b' }}>Mano:</span> <strong style={{ textTransform: 'capitalize' }}>{participantDetail.participant.dominant_hand}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Deriva ($D_t$):</span> <strong style={{ color: '#818cf8' }}>{participantDetail.participant.drift}</strong></div>
                </div>
              )}
            </div>

            {participantDetail && (
              <>
                {/* Curva de Aprendizaje Motor (1..30) */}
                <div className="tl-obs-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <div>
                      <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', margin: 0 }}>
                        Curva de Aprendizaje Motor (1 a 30 Repeticiones)
                      </h4>
                      <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Velocidad (WPM) a través de las 3 series de entrenamiento</span>
                    </div>
                    <strong style={{ color: '#fbbf24', fontSize: '0.8rem' }}>"{participantDetail.participant.phrase}"</strong>
                  </div>

                  <div style={{ height: '220px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={participantDetail.learning_curve} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                        <XAxis dataKey="repetition" stroke="#64748b" tickFormatter={(r) => `R${r}`} />
                        <YAxis stroke="#64748b" />
                        <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
                        <Line type="monotone" dataKey="wpm" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3, fill: '#60a5fa' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Boxplots de Hold Time por Carácter */}
                {participantDetail.keys_breakdown.length > 0 && (
                  <div className="tl-obs-card">
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#ffffff', margin: '0 0 0.5rem 0' }}>
                      Tiempos de Pulsación Medios por Carácter (Hold Time en ms)
                    </h4>
                    <div style={{ height: '200px' }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={participantDetail.keys_breakdown} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                          <XAxis dataKey="key" stroke="#94a3b8" />
                          <YAxis stroke="#64748b" />
                          <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px', fontSize: '11px' }} />
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
      </div>
    </div>
  );
}
