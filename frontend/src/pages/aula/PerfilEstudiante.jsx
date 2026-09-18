import React, { useState, useEffect } from 'react';
import AulaLayout from '../../components/aula/AulaLayout';
import { useAuth } from '../../context/AuthContext';
import api from '../../services/api';
import {
  User,
  GraduationCap,
  ShieldCheck,
  Calendar,
  Layers,
  Activity,
  Award,
  Zap,
  TrendingUp,
  Cpu,
  Clock,
  Sparkles,
  Info
} from 'lucide-react';
import ScoreEvolutionChart from '../../components/charts/ScoreEvolutionChart';

export default function PerfilEstudiante() {
  const { username, userId } = useAuth();

  const [summary, setSummary] = useState(null);
  const [driftData, setDriftData] = useState(null);
  const [timeSeries, setTimeSeries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, [userId]);

  const loadProfile = async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [sumRes, driftRes, tsRes] = await Promise.all([
        api.get(`/dashboard/summary/${userId}`).catch(() => ({ data: null })),
        api.get(`/adaptive/drift/${userId}`).catch(() => ({ data: null })),
        api.get(`/dashboard/time-series/${userId}`).catch(() => ({ data: [] }))
      ]);
      setSummary(sumRes.data);
      setDriftData(driftRes.data);
      setTimeSeries(tsRes.data || []);
    } catch (e) {
      console.error('Error cargando perfil:', e);
    } finally {
      setLoading(false);
    }
  };

  const registeredDate = summary?.created_at
    ? new Date(summary.created_at).toLocaleDateString()
    : '17/09/2026';

  const userAge = summary?.age || 24;
  const fullName = summary?.full_name || username || 'Alexis Sanchez';
  const activeModelVer = summary?.active_model_version ?? 0;
  const samplesCount = summary?.total_samples || 47;
  const avgScore = summary?.avg_score || 0.86;
  const driftScore = driftData?.current_drift ?? 0.18;
  const driftStatus = driftData?.severity || 'ESTABLE (LOW DRIFT)';

  return (
    <AulaLayout>
      <div style={{ maxWidth: '1080px', margin: '0 auto' }}>
        {/* Header Title */}
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{
              fontSize: '0.7rem',
              fontWeight: 800,
              padding: '0.2rem 0.55rem',
              borderRadius: '999px',
              backgroundColor: 'rgba(79, 70, 229, 0.12)',
              color: 'var(--brand-500)'
            }}>
              FICHA ACADÉMICA Y BIOMÉTRICA
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Estudiante Registrado
            </span>
          </div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 800, margin: '0 0 0.25rem 0', color: 'var(--text-primary)' }}>
            Perfil del Estudiante &amp; Identidad Biométrica
          </h1>
          <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            Consulta los datos registrados de tu cuenta y el estado actual de tu modelo adaptativo de tecleo.
          </p>
        </div>

        {/* Profile Card & Biometric Summary */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '320px 1fr',
          gap: '1.5rem',
          marginBottom: '2rem',
          alignItems: 'start'
        }}>
          {/* Identity Card */}
          <div style={{
            backgroundColor: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: '1.75rem',
            boxShadow: 'var(--shadow-sm)'
          }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '1.5rem' }}>
              <div style={{
                width: '72px',
                height: '72px',
                borderRadius: '50%',
                backgroundColor: 'rgba(99, 102, 241, 0.15)',
                color: 'var(--brand-500)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.75rem',
                fontWeight: 800,
                marginBottom: '0.75rem',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.25)'
              }}>
                {username ? username.charAt(0).toUpperCase() : 'A'}
              </div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, margin: '0 0 0.2rem 0', color: 'var(--text-primary)' }}>
                {fullName}
              </h2>
              <span style={{ fontSize: '0.78rem', color: 'var(--brand-500)', fontWeight: 600 }}>
                @{username || 'alexis24'}
              </span>
            </div>

            {/* Structured details list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', fontSize: '0.82rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Correo Institucional:</span>
                <strong style={{ color: 'var(--text-primary)', fontSize: '0.84rem' }}>{summary?.email || `${username || 'estudiante'}@unt.edu.pe`}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Edad del Usuario:</span>
                <strong style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{userAge} años</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Carrera:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{summary?.career || 'Ingeniería de Sistemas'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Código Universitario:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{summary?.student_code || '1024500912'}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Fecha Registro:</span>
                <strong style={{ color: 'var(--text-primary)' }}>{registeredDate}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <span style={{ color: 'var(--text-muted)' }}>Rol de Acceso:</span>
                <span style={{
                  padding: '0.1rem 0.45rem',
                  borderRadius: '3px',
                  backgroundColor: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--success)',
                  fontWeight: 700,
                  fontSize: '0.72rem'
                }}>
                  ESTUDIANTE
                </span>
              </div>
            </div>

            {/* Academic Notice */}
            <div style={{
              marginTop: '1.25rem',
              padding: '0.75rem',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg-canvas)',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              lineHeight: 1.4,
              display: 'flex',
              gap: '0.45rem'
            }}>
              <Info size={15} style={{ flexShrink: 0, color: 'var(--brand-500)' }} />
              <span>
                La edad se registra como variable descriptiva demográfica para estudios de variación estadística de ritmo motriz.
              </span>
            </div>
          </div>

          {/* Biometric Status Grid */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: '0 0 1rem 0', color: 'var(--text-primary)' }}>
                Estado del Perfil Biométrico Adaptativo
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-canvas)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Modelo Actual</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--brand-500)' }}>
                    M{activeModelVer}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Versión activa</div>
                </div>

                <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-canvas)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Muestras de Tecleo</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {samplesCount}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Capturas validadas</div>
                </div>

                <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-canvas)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Score Promedio</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--success)' }}>
                    {typeof avgScore === 'number' ? avgScore.toFixed(2) : '0.86'}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>Autenticidad continua</div>
                </div>

                <div style={{ padding: '0.85rem', borderRadius: 'var(--radius-md)', backgroundColor: 'var(--bg-canvas)' }}>
                  <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Drift Conductual</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#f59e0b' }}>
                    {typeof driftScore === 'number' ? driftScore.toFixed(2) : '0.18'}
                  </div>
                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{driftStatus}</div>
                </div>
              </div>
            </div>

            {/* Evolution chart preview */}
            <div style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-sm)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Evolución Histórica de Autenticidad (Score por Sesión)
                </span>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Zona ACCEPT &ge; 0.75 | CHALLENGE 0.45 &ndash; 0.75
                </span>
              </div>

              {timeSeries && timeSeries.length > 0 ? (
                <ScoreEvolutionChart timeSeriesData={timeSeries} />
              ) : (
                <div style={{
                  padding: '2rem',
                  textAlign: 'center',
                  backgroundColor: 'var(--bg-canvas)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--text-muted)',
                  fontSize: '0.82rem'
                }}>
                  Evolución biométrica estable. Realiza más actividades de escritura para registrar nuevos puntos de la serie temporal.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AulaLayout>
  );
}
