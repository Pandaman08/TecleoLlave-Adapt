import React, { useState, useEffect } from 'react';
import {
  Cpu,
  Award,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  Layers,
  Sparkles,
  Info,
  Sliders,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import api from '../services/api';

export default function ModelComparisonPanel({ userId = 1, onModelUpdated }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  const fetchComparison = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get(`/ml/model-comparison/${userId}`);
      setData(res.data);
    } catch (err) {
      console.error('Error cargando comparativa de modelos:', err);
      setError(err.response?.data?.detail || err.message || 'Error cargando datos de comparación');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userId) {
      fetchComparison();
    }
  }, [userId]);

  const handleRunSelection = async () => {
    setEvaluating(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await api.post('/ml/select-best-model', { user_id: userId });
      setData(prev => ({
        ...prev,
        selected_algorithm: res.data.selected_algorithm,
        selection_reason: res.data.selection_reason,
        candidate_comparison: res.data.candidate_comparison,
        model_version: res.data.model_version
      }));
      setSuccessMsg(`¡Proceso completado! Modelo óptimo: ${res.data.selected_algorithm} (v${res.data.model_version}).`);
      if (onModelUpdated) {
        onModelUpdated();
      }
    } catch (err) {
      console.error('Error re-evaluando modelos:', err);
      setError(err.response?.data?.detail || err.message || 'Error al evaluar algoritmos candidatos');
    } finally {
      setEvaluating(false);
    }
  };

  if (loading) {
    return (
      <div className="table-panel" style={{ padding: '2rem', textAlign: 'center' }}>
        <RefreshCw size={24} className="spin" style={{ color: 'var(--brand-500)', margin: '0 auto 0.75rem' }} />
        <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.85rem' }}>
          Cargando matriz comparativa de algoritmos biométricos...
        </p>
      </div>
    );
  }

  const candidates = data?.candidate_comparison || [];
  const winner = candidates.find(c => c.is_winner) || candidates[0];
  const dataStats = data?.data_stats || {};

  return (
    <div className="table-panel animate-fade" style={{ border: '1px solid var(--border-subtle)' }}>
      {/* Header */}
      <div className="table-panel-header" style={{ alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <div style={{
              width: 32, height: 32, borderRadius: 'var(--radius-md)',
              backgroundColor: 'rgba(99, 102, 241, 0.12)',
              color: 'var(--brand-500)',
              display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
              <Cpu size={18} />
            </div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0 }}>
              Comparación y Selección Automática de Algoritmos
            </h3>
          </div>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0, maxWidth: '780px', lineHeight: 1.45 }}>
            En vez de asignar un algoritmo fijo al azar, TecleoLlave evalúa con <strong>validación cruzada</strong> sobre los datos del propio usuario
            (muestras legítimas + impostores de otros usuarios + dataset CMU Benchmark) y selecciona automáticamente el estimador con <strong>menor EER</strong>.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={handleRunSelection}
            disabled={evaluating}
            className="btn-primary"
            style={{ fontSize: '0.8rem', padding: '0.5rem 0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            title="Ejecutar validación cruzada y seleccionar el mejor algoritmo para este usuario"
          >
            <RefreshCw size={14} className={evaluating ? 'spin' : ''} />
            <span>{evaluating ? 'Evaluando Candidatos...' : 'Re-evaluar Candidatos en Vivo'}</span>
          </button>
        </div>
      </div>

      {/* Messages */}
      {error && (
        <div style={{
          margin: '0.75rem 1.25rem',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.25)',
          color: 'var(--danger)',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{
          margin: '0.75rem 1.25rem',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          color: 'var(--success)',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <CheckCircle2 size={16} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Winner Highlight Banner */}
      {winner && (
        <div style={{
          margin: '1rem 1.25rem',
          padding: '1rem 1.25rem',
          borderRadius: 'var(--radius-lg)',
          backgroundColor: 'rgba(16, 185, 129, 0.08)',
          border: '1px solid rgba(16, 185, 129, 0.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div style={{
              width: 44, height: 44, borderRadius: '50%',
              backgroundColor: 'rgba(16, 185, 129, 0.18)',
              color: 'var(--success)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0
            }}>
              <Award size={24} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Algoritmo Seleccionado por EER Mínimo
                </span>
                <span className="hero-stat-badge badge-active" style={{ fontSize: '0.7rem', padding: '0.15rem 0.5rem' }}>
                  Activo v{data?.model_version || 1}
                </span>
              </div>
              <h4 style={{ fontSize: '1.15rem', fontWeight: 800, margin: '0.2rem 0 0', color: 'var(--text-primary)' }}>
                {winner.name} <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-muted)' }}>({winner.family})</span>
              </h4>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Equal Error Rate (EER)</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '1.25rem', fontWeight: 800, color: 'var(--success)' }}>
                {(winner.eer * 100).toFixed(2)}%
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Separación ROC-AUC</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '1.25rem', fontWeight: 800, color: 'var(--brand-500)' }}>
                {(winner.auc * 100).toFixed(1)}%
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Exactitud CV</div>
              <div style={{ fontFamily: 'JetBrains Mono', fontSize: '1.25rem', fontWeight: 800 }}>
                {(winner.accuracy * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dataset Composition Tags */}
      {dataStats && dataStats.n_total > 0 && (
        <div style={{
          margin: '0 1.25rem 1rem',
          padding: '0.6rem 0.9rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'var(--bg-canvas)',
          border: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem',
          fontSize: '0.75rem'
        }}>
          <span style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Composición del Benchmark de Evaluación:</span>
          <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <span>👤 Muestras Legítimas del Usuario: <strong style={{ color: 'var(--success)' }}>{dataStats.n_legit}</strong></span>
            <span>👥 Impostores Otros Usuarios: <strong>{dataStats.n_registered_impostors}</strong></span>
            <span>🏛️ Impostores Dataset CMU: <strong style={{ color: 'var(--brand-500)' }}>{dataStats.n_cmu_impostors}</strong></span>
            <span>📊 Total Vectores Evaluados: <strong>{dataStats.n_total}</strong> (100 features)</span>
          </div>
        </div>
      )}

      {/* Rationale Quote */}
      {data?.selection_reason && (
        <div style={{
          margin: '0 1.25rem 1rem',
          padding: '0.75rem 1rem',
          borderRadius: 'var(--radius-md)',
          backgroundColor: 'rgba(99, 102, 241, 0.05)',
          borderLeft: '4px solid var(--brand-500)',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.45
        }}>
          <strong style={{ color: 'var(--text-primary)' }}>Evidencia de Selección:</strong> {data.selection_reason}
        </div>
      )}

      {/* Main Comparison Table */}
      <div className="table-wrapper" style={{ margin: '0 1.25rem 1.25rem' }}>
        <table className="data-table">
          <thead>
            <tr>
              <th>Algoritmo Candidato</th>
              <th>Familia / Tipo</th>
              <th style={{ textAlign: 'right' }}>FAR (Falsa Acept.)</th>
              <th style={{ textAlign: 'right' }}>FRR (Falso Rech.)</th>
              <th style={{ textAlign: 'right' }}>EER (Equal Error)</th>
              <th style={{ textAlign: 'right' }}>ROC-AUC</th>
              <th style={{ textAlign: 'right' }}>Exactitud</th>
              <th style={{ textAlign: 'right' }}>Latencia CV</th>
              <th style={{ textAlign: 'center' }}>Veredicto</th>
            </tr>
          </thead>
          <tbody>
            {candidates.map((c, idx) => {
              const isWin = c.is_winner;
              return (
                <tr
                  key={c.key || idx}
                  style={{
                    backgroundColor: isWin ? 'rgba(16, 185, 129, 0.04)' : undefined,
                    fontWeight: isWin ? 600 : 400
                  }}
                >
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{
                        fontSize: '0.88rem',
                        fontWeight: 700,
                        color: isWin ? 'var(--success)' : 'var(--text-primary)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}>
                        {isWin && <Award size={14} style={{ color: 'var(--success)' }} />}
                        {c.name}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono' }}>
                        {c.class_name}
                      </span>
                    </div>
                  </td>
                  <td>
                    <span style={{
                      fontSize: '0.75rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-canvas)',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)'
                    }}>
                      {c.family}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: '0.82rem' }}>
                    <span style={{ color: c.far_at_allow === 0 ? 'var(--success)' : undefined }}>
                      {(c.far_at_allow * 100).toFixed(2)}%
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: '0.82rem' }}>
                    <span style={{ color: c.frr_at_allow === 0 ? 'var(--success)' : undefined }}>
                      {(c.frr_at_allow * 100).toFixed(2)}%
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <span style={{
                      fontFamily: 'JetBrains Mono',
                      fontWeight: 800,
                      fontSize: '0.85rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: isWin ? 'rgba(16, 185, 129, 0.15)' : 'var(--bg-canvas)',
                      color: isWin ? 'var(--success)' : 'var(--text-secondary)',
                      border: isWin ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)'
                    }}>
                      {(c.eer * 100).toFixed(2)}%
                    </span>
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: '0.82rem' }}>
                    {(c.auc * 100).toFixed(1)}%
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: '0.82rem' }}>
                    {(c.accuracy * 100).toFixed(1)}%
                  </td>
                  <td style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {c.latency_ms ? `${c.latency_ms.toFixed(0)} ms` : '—'}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    {isWin ? (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.3rem',
                        fontSize: '0.72rem',
                        fontWeight: 800,
                        color: 'var(--success)',
                        backgroundColor: 'rgba(16, 185, 129, 0.15)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        borderRadius: 'var(--radius-full)',
                        padding: '0.2rem 0.6rem'
                      }}>
                        <CheckCircle2 size={12} />
                        ÓPTIMO (ELEGIDO)
                      </span>
                    ) : (
                      <span style={{
                        fontSize: '0.72rem',
                        color: 'var(--text-muted)',
                        backgroundColor: 'var(--bg-canvas)',
                        border: '1px solid var(--border-subtle)',
                        borderRadius: 'var(--radius-full)',
                        padding: '0.2rem 0.55rem'
                      }}>
                        Alternativa
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Visual Comparison Bars */}
      <div style={{
        margin: '0 1.25rem 1.25rem',
        padding: '1rem',
        borderRadius: 'var(--radius-lg)',
        backgroundColor: 'var(--bg-canvas)',
        border: '1px solid var(--border-subtle)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase' }}>
            Comparativa Visual de Tasa de Error EER (Menor es mejor)
          </span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
            Criterio Normativo ISO/IEC 19795-1
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {candidates.map(c => {
            const isWin = c.is_winner;
            const eerVal = c.eer * 100;
            // Visual width mapped safely
            const maxEer = Math.max(...candidates.map(x => x.eer * 100), 5.0);
            const barWidth = Math.max(12, Math.min(100, (eerVal / maxEer) * 100));

            return (
              <div key={c.key} style={{ display: 'grid', gridTemplateColumns: '180px 1fr 90px', alignItems: 'center', gap: '1rem' }}>
                <div style={{ fontSize: '0.8rem', fontWeight: isWin ? 700 : 500, color: isWin ? 'var(--success)' : 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                  {isWin && <Award size={13} style={{ color: 'var(--success)' }} />}
                  {c.name}
                </div>
                <div style={{ height: 18, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-full)', overflow: 'hidden', position: 'relative' }}>
                  <div style={{
                    width: `${barWidth}%`,
                    height: '100%',
                    backgroundColor: isWin ? 'var(--success)' : 'var(--brand-500)',
                    opacity: isWin ? 0.9 : 0.45,
                    borderRadius: 'var(--radius-full)',
                    transition: 'width 0.4s ease'
                  }} />
                </div>
                <div style={{ textAlign: 'right', fontFamily: 'JetBrains Mono', fontSize: '0.8rem', fontWeight: isWin ? 800 : 500, color: isWin ? 'var(--success)' : 'var(--text-muted)' }}>
                  {eerVal.toFixed(2)}% EER
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
