import React, { useState, useEffect } from 'react';
import {
  Users,
  Calendar,
  BarChart2,
  TrendingUp,
  Activity,
  ShieldCheck,
  AlertCircle,
  Info,
  Layers,
  Sparkles,
  Filter,
  CheckCircle2,
  RefreshCw,
  Clock,
  GraduationCap
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell
} from 'recharts';
import api from '../../services/api';

export default function AgeSegmentationFindings() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCohort, setSelectedCohort] = useState(null);

  useEffect(() => {
    loadFindings();
  }, []);

  const loadFindings = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get('/dashboard/age-segmentation');
      setData(res.data);
    } catch (err) {
      console.error('Error cargando hallazgos por edad:', err);
      setError(err.response?.data?.detail || 'Error al cargar segmentación por edad.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '3rem 1rem',
        gap: '0.75rem'
      }}>
        <RefreshCw size={24} className="animate-spin" style={{ color: 'var(--brand-500)' }} />
        <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Calculando segmentación de hallazgos por edad...
        </span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{
        padding: '1.25rem',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--danger-bg)',
        border: '1px solid var(--danger-border)',
        color: 'var(--danger)',
        fontSize: '0.85rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <AlertCircle size={18} />
        <span>{error || 'No se pudo cargar la información de segmentación.'}</span>
      </div>
    );
  }

  const { cohorts, overall_stats } = data;

  // Transform data for charts
  const chartDecisions = cohorts.map(c => ({
    name: c.cohort_label,
    Aceptación: c.allow_rate,
    Desafío2FA: c.challenge_rate,
    Rechazo: c.reject_rate,
    score: c.avg_score_pct,
    holdTime: c.avg_hold_time_ms,
    users: c.users_count
  }));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* 1. Header & Scientific Notice */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.75rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.25rem' }}>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 800,
                padding: '0.2rem 0.55rem',
                borderRadius: '999px',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--brand-500)'
              }}>
                ANÁLISIS DEMOGRÁFICO DE INVESTIGACIÓN
              </span>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                Segmentación Descriptiva por Rangos Etarios
              </span>
            </div>
            <h2 style={{ fontSize: '1.35rem', fontWeight: 800, margin: 0, color: 'var(--text-primary)' }}>
              Hallazgos de Rendimiento Biométrico por Edad
            </h2>
          </div>

          <button
            type="button"
            onClick={loadFindings}
            className="btn-secondary"
            style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.45rem 0.85rem' }}
          >
            <RefreshCw size={14} />
            <span>Actualizar Datos</span>
          </button>
        </div>

        {/* Metodological Disclaimer Alert */}
        <div style={{
          backgroundColor: 'rgba(99, 102, 241, 0.08)',
          border: '1px solid rgba(99, 102, 241, 0.22)',
          borderRadius: 'var(--radius-md)',
          padding: '0.85rem 1rem',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          lineHeight: 1.5,
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.5rem'
        }}>
          <Info size={16} style={{ color: 'var(--brand-500)', flexShrink: 0, marginTop: '0.15rem' }} />
          <div>
            <strong style={{ color: 'var(--brand-500)' }}>Rigor Metodológico y Tratamiento Descriptivo: </strong>
            {overall_stats.methodology_note} Las variaciones observadas entre grupos reflejan características empíricas de la muestra universitaria y no implican limitaciones biológicas o determinismo motriz.
          </div>
        </div>
      </div>

      {/* 2. Global Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.15rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '0.35rem' }}>
            <Users size={14} />
            <span>Muestra Total Evaluada</span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--brand-500)' }}>
            {overall_stats.total_users_evaluated}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Estudiantes con edad registrada
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.15rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '0.35rem' }}>
            <Calendar size={14} />
            <span>Edad Media de la Muestra</span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {overall_stats.mean_age} <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>años</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Desviación estándar: ±{overall_stats.std_age} años
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.15rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '0.35rem' }}>
            <Activity size={14} />
            <span>Rango de Edad</span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#10b981' }}>
            {overall_stats.min_age} - {overall_stats.max_age} <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-muted)' }}>años</span>
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            Amplitud de la cohorte estudiantil
          </div>
        </div>

        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1.15rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.72rem', marginBottom: '0.35rem' }}>
            <TrendingUp size={14} />
            <span>Correlación Edad vs Score (r)</span>
          </div>
          <div style={{ fontSize: '1.65rem', fontWeight: 800, color: '#f59e0b' }}>
            {overall_stats.correlation_age_score}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            {Math.abs(overall_stats.correlation_age_score) < 0.3 ? 'Correlación débil / no lineal' : 'Correlación moderada'}
          </div>
        </div>
      </div>

      {/* 3. Recharts Graphics: Decision Rates & Hold Time */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))', gap: '1.5rem' }}>
        
        {/* Chart 1: Decision Distribution by Cohort */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.2rem 0', color: 'var(--text-primary)' }}>
                Distribución Tri-Zona por Cohorte Etaria (%)
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Tasa de Aceptación directa, Desafío (2FA) y Rechazo
              </p>
            </div>
            <BarChart2 size={18} style={{ color: 'var(--brand-500)' }} />
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartDecisions} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-muted)" fontSize={11} tickLine={false} unit="%" domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.78rem',
                    color: 'var(--text-primary)'
                  }}
                  formatter={(val) => [`${val}%`, '']}
                />
                <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '8px' }} />
                <Bar dataKey="Aceptación" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Desafío2FA" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Rechazo" fill="#ef4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Average Hold Time & Biometric Score */}
        <div style={{
          backgroundColor: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-lg)',
          padding: '1.5rem',
          boxShadow: 'var(--shadow-sm)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 0.2rem 0', color: 'var(--text-primary)' }}>
                Duración de Pulsación (Hold Time ms) y Score (%)
              </h3>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Tiempo medio de contacto con la tecla y afinidad de autenticación
              </p>
            </div>
            <Activity size={18} style={{ color: '#0ea5e9' }} />
          </div>

          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartDecisions} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-subtle)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--text-muted)" fontSize={11} tickLine={false} />
                <YAxis yAxisId="left" stroke="var(--text-muted)" fontSize={11} tickLine={false} unit="ms" />
                <YAxis yAxisId="right" orientation="right" stroke="var(--text-muted)" fontSize={11} tickLine={false} unit="%" domain={[50, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    borderColor: 'var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    fontSize: '0.78rem',
                    color: 'var(--text-primary)'
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '0.75rem', paddingTop: '8px' }} />
                <Line yAxisId="left" type="monotone" dataKey="holdTime" name="Hold Time (ms)" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4 }} />
                <Line yAxisId="right" type="monotone" dataKey="score" name="Score Medio (%)" stroke="#0ea5e9" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Structured Scientific Findings Table */}
      <div style={{
        backgroundColor: 'var(--bg-surface)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '1.5rem',
        boxShadow: 'var(--shadow-sm)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 0.2rem 0', color: 'var(--text-primary)' }}>
              Tabla Comparativa de Cohortes Etarias
            </h3>
            <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
              Datos tabulados para la documentación y capítulo de resultados del informe de tesis.
            </p>
          </div>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>Cohorte Etaria</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700 }}>Perfil</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700, textAlign: 'center' }}>Sujetos</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700, textAlign: 'center' }}>Intentos</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700, textAlign: 'center' }}>Hold Time</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700, textAlign: 'center' }}>Score Promedio</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700, textAlign: 'center' }}>Aceptación</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700, textAlign: 'center' }}>Desafío (2FA)</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700, textAlign: 'center' }}>Adaptaciones</th>
                <th style={{ padding: '0.75rem 0.5rem', fontWeight: 700, textAlign: 'right' }}>Acción</th>
              </tr>
            </thead>
            <tbody>
              {cohorts.map((c) => {
                const isSelected = selectedCohort?.id === c.id;
                return (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: '1px solid var(--border-subtle)',
                      backgroundColor: isSelected ? 'rgba(99, 102, 241, 0.08)' : 'transparent',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <td style={{ padding: '0.85rem 0.5rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {c.cohort_label}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', color: 'var(--text-muted)' }}>
                      {c.sublabel}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', fontWeight: 700 }}>
                      <span style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '999px',
                        backgroundColor: 'var(--bg-canvas)',
                        border: '1px solid var(--border-subtle)'
                      }}>
                        {c.users_count}
                      </span>
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center' }}>
                      {c.total_attempts}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', fontFamily: 'monospace', fontWeight: 600 }}>
                      {c.avg_hold_time_ms} ms
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', fontWeight: 700, color: 'var(--brand-500)' }}>
                      {c.avg_score_pct}%
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: 'var(--success)', fontWeight: 600 }}>
                      {c.allow_rate}%
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', color: 'var(--warning)', fontWeight: 600 }}>
                      {c.challenge_rate}%
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'center', fontWeight: 600 }}>
                      {c.adaptation_events_count}
                    </td>
                    <td style={{ padding: '0.85rem 0.5rem', textAlign: 'right' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedCohort(isSelected ? null : c)}
                        className="btn-secondary"
                        style={{ fontSize: '0.72rem', padding: '0.25rem 0.6rem' }}
                      >
                        {isSelected ? 'Ocultar' : 'Ver Sujetos'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Drilldown modal/panel when a cohort is selected */}
        {selectedCohort && (
          <div style={{
            marginTop: '1.25rem',
            padding: '1.25rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg-canvas)',
            border: '1px solid var(--border-subtle)',
            animation: 'fadeIn 0.2s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <GraduationCap size={16} style={{ color: 'var(--brand-500)' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Sujetos Registrados en la Cohorte: {selectedCohort.cohort_label} ({selectedCohort.users.length} estudiantes)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCohort(null)}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text-muted)' }}
              >
                ✕ Cerrar detalle
              </button>
            </div>

            {selectedCohort.users.length === 0 ? (
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Aún no hay estudiantes registrados en este rango de edad.
              </p>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '0.75rem' }}>
                {selectedCohort.users.map(u => (
                  <div key={u.id} style={{
                    padding: '0.75rem',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.78rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.2rem'
                  }}>
                    <div style={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                      {u.full_name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--brand-500)' }}>
                      @{u.username} &bull; {u.age} años
                    </div>
                    <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)' }}>
                      {u.career || 'Ingeniería de Sistemas'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
}
