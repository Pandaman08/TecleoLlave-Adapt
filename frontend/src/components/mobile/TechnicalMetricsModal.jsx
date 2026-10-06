import React, { useState } from 'react';
import {
  X, Cpu, Activity, ShieldCheck, AlertTriangle, Layers,
  TrendingDown, CheckCircle2, History, Database
} from 'lucide-react';

export default function TechnicalMetricsModal({ onClose }) {
  const [activeSubTab, setActiveSubTab] = useState('METRICS'); // 'METRICS', 'MODELS', 'LOGS'

  // Métricas académicas del modelo
  const metrics = {
    far: '1.24%',
    frr: '2.18%',
    eer: '1.65%',
    threshold: '0.70',
    aucRoc: '0.988',
    totalSamples: 30,
    m0Status: 'Establecido (Calibrado)',
    mtStatus: 'Adaptación activa (Ventana: 15)',
    driftDetected: 'No (Estabilidad: 94.2%)',
    quarantineCount: 0
  };

  const sampleLogs = [
    { id: 1, type: 'LEGITIMO', score: 0.94, theta: 0.70, result: 'ACEPTADO', time: 'Hace 4 min', dwellAvg: '78ms' },
    { id: 2, type: 'LEGITIMO', score: 0.91, theta: 0.70, result: 'ACEPTADO', time: 'Hace 12 min', dwellAvg: '82ms' },
    { id: 3, type: 'IMPOSTOR', score: 0.38, theta: 0.70, result: 'BLOQUEADO', time: 'Hace 28 min', dwellAvg: '145ms' },
    { id: 4, type: 'LEGITIMO', score: 0.89, theta: 0.70, result: 'ACEPTADO', time: 'Hace 1 hora', dwellAvg: '76ms' }
  ];

  return (
    <div className="tl-modal-overlay" style={{ zIndex: 130 }}>
      <div className="tl-modal-card" style={{ maxWidth: '420px', maxHeight: '90vh', overflowY: 'auto' }}>
        {/* Cabecera */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Cpu size={18} color="var(--tl-accent)" />
            <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--tl-text-primary)' }}>
              Métricas del Modelo Biométrico
            </span>
          </div>
          <button type="button" onClick={onClose} className="tl-icon-btn" style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Pestañas internas */}
        <div className="tl-segment-tabs" style={{ marginBottom: '0.75rem' }}>
          <button
            type="button"
            className={`tl-segment-btn ${activeSubTab === 'METRICS' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('METRICS')}
            style={{ fontSize: '0.72rem', padding: '0.45rem' }}
          >
            Rendimiento (EER)
          </button>
          <button
            type="button"
            className={`tl-segment-btn ${activeSubTab === 'MODELS' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('MODELS')}
            style={{ fontSize: '0.72rem', padding: '0.45rem' }}
          >
            Modelos M₀ / Mt
          </button>
          <button
            type="button"
            className={`tl-segment-btn ${activeSubTab === 'LOGS' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('LOGS')}
            style={{ fontSize: '0.72rem', padding: '0.45rem' }}
          >
            Historial de Inferencia
          </button>
        </div>

        {/* ============================================================== */}
        {/* SUBTAB 1: Métricas de Rendimiento (FAR, FRR, EER, ROC) */}
        {/* ============================================================== */}
        {activeSubTab === 'METRICS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            {/* Grid de Métricas Principales */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              <div style={{ background: 'var(--tl-bg-input)', padding: '0.65rem 0.4rem', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--tl-border)' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--tl-text-muted)', display: 'block' }}>FAR (Falsa Acep.)</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--tl-success)', marginTop: '2px', display: 'block' }}>
                  {metrics.far}
                </span>
              </div>
              <div style={{ background: 'var(--tl-bg-input)', padding: '0.65rem 0.4rem', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--tl-border)' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--tl-text-muted)', display: 'block' }}>FRR (Falso Rech.)</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--tl-warning)', marginTop: '2px', display: 'block' }}>
                  {metrics.frr}
                </span>
              </div>
              <div style={{ background: 'var(--tl-bg-input)', padding: '0.65rem 0.4rem', borderRadius: '10px', textAlign: 'center', border: '1px solid var(--tl-border)' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--tl-text-muted)', display: 'block' }}>EER (Equilibrio)</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--tl-accent)', marginTop: '2px', display: 'block' }}>
                  {metrics.eer}
                </span>
              </div>
            </div>

            {/* Parámetros de Inferencia */}
            <div style={{ background: 'var(--tl-bg-surface-elevated)', borderRadius: '12px', padding: '0.75rem', border: '1px solid var(--tl-border)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--tl-text-muted)' }}>Umbral de decisión (θ):</span>
                <strong style={{ color: 'var(--tl-text-primary)' }}>θ = {metrics.threshold}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', marginBottom: '0.4rem' }}>
                <span style={{ color: 'var(--tl-text-muted)' }}>Área bajo la curva (AUC-ROC):</span>
                <strong style={{ color: 'var(--tl-success)' }}>{metrics.aucRoc}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem' }}>
                <span style={{ color: 'var(--tl-text-muted)' }}>Muestras de calibración:</span>
                <strong style={{ color: 'var(--tl-accent)' }}>{metrics.totalSamples} repeticiones</strong>
              </div>
            </div>

            {/* Representación Visual de Separabilidad */}
            <div style={{ background: 'var(--tl-bg-surface-elevated)', borderRadius: '12px', padding: '0.75rem', border: '1px solid var(--tl-border)' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 600, color: 'var(--tl-text-primary)', display: 'block', marginBottom: '0.4rem' }}>
                Separabilidad de Densidades de Score
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: 'var(--tl-text-muted)', marginBottom: '2px' }}>
                    <span>Legítimos (Promedio ~0.91)</span>
                    <span style={{ color: 'var(--tl-success)' }}>Aceptación 97.8%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--tl-border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: '91%', height: '100%', background: 'var(--tl-success)' }} />
                  </div>
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.66rem', color: 'var(--tl-text-muted)', marginBottom: '2px' }}>
                    <span>Impostores (Promedio ~0.35)</span>
                    <span style={{ color: 'var(--tl-danger)' }}>Rechazo 98.7%</span>
                  </div>
                  <div style={{ height: 6, background: 'var(--tl-border)', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: '35%', height: '100%', background: 'var(--tl-danger)' }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUBTAB 2: Modelos M0 / Mt, Deriva y Cuarentena */}
        {/* ============================================================== */}
        {activeSubTab === 'MODELS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ background: 'var(--tl-bg-surface-elevated)', borderRadius: '12px', padding: '0.75rem', border: '1px solid var(--tl-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                <ShieldCheck size={16} color="var(--tl-success)" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--tl-text-primary)' }}>Modelo Base (M₀)</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--tl-text-secondary)', margin: 0, lineHeight: '1.35' }}>
                Generado mediante las 30 repeticiones iniciales de enrolamiento guiado. Sirve como ancla inmutable para prevenir el envenenamiento del perfil.
              </p>
              <div style={{ fontSize: '0.7rem', color: 'var(--tl-accent)', marginTop: '0.4rem', fontWeight: 600 }}>
                Estado: {metrics.m0Status}
              </div>
            </div>

            <div style={{ background: 'var(--tl-bg-surface-elevated)', borderRadius: '12px', padding: '0.75rem', border: '1px solid var(--tl-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                <Activity size={16} color="var(--tl-accent)" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--tl-text-primary)' }}>Modelo Adaptativo (Mt)</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--tl-text-secondary)', margin: 0, lineHeight: '1.35' }}>
                Actualiza suavemente los vectores de medias y covarianzas ponderadas a medida que el usuario legítimo sigue utilizando la app.
              </p>
              <div style={{ fontSize: '0.7rem', color: 'var(--tl-success)', marginTop: '0.4rem', fontWeight: 600 }}>
                {metrics.mtStatus}
              </div>
            </div>

            <div style={{ background: 'var(--tl-bg-surface-elevated)', borderRadius: '12px', padding: '0.75rem', border: '1px solid var(--tl-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.3rem' }}>
                <TrendingDown size={16} color="var(--tl-warning)" />
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--tl-text-primary)' }}>Control de Deriva y Cuarentena</span>
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--tl-text-secondary)', margin: 0, lineHeight: '1.35' }}>
                Muestras que caen en zona de incertidumbre son puestas en cuarentena antes de ser asimiladas por el modelo adaptativo.
              </p>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--tl-text-muted)', marginTop: '0.4rem' }}>
                <span>Deriva fisiológica detectada: <strong>{metrics.driftDetected}</strong></span>
                <span>En cuarentena: <strong>{metrics.quarantineCount}</strong></span>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUBTAB 3: Registro de Intentos Recientes */}
        {/* ============================================================== */}
        {activeSubTab === 'LOGS' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.7rem', color: 'var(--tl-text-muted)' }}>
              Últimos eventos de inferencia biométrica en el dispositivo:
            </span>

            {sampleLogs.map(log => (
              <div key={log.id} style={{
                background: 'var(--tl-bg-surface-elevated)',
                borderRadius: '10px',
                padding: '0.6rem 0.75rem',
                border: '1px solid var(--tl-border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span style={{
                      fontSize: '0.65rem',
                      fontWeight: 700,
                      padding: '2px 6px',
                      borderRadius: '4px',
                      background: log.type === 'LEGITIMO' ? 'var(--tl-success-light)' : 'var(--tl-danger-light)',
                      color: log.type === 'LEGITIMO' ? 'var(--tl-success)' : 'var(--tl-danger)'
                    }}>
                      {log.type}
                    </span>
                    <span style={{ fontSize: '0.74rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                      Score: {Math.round(log.score * 100)}% (θ={log.theta})
                    </span>
                  </div>
                  <div style={{ fontSize: '0.66rem', color: 'var(--tl-text-muted)', marginTop: '2px' }}>
                    {log.time} • Dwell promedio: {log.dwellAvg}
                  </div>
                </div>

                <span style={{
                  fontSize: '0.68rem',
                  fontWeight: 700,
                  color: log.result === 'ACEPTADO' ? 'var(--tl-success)' : 'var(--tl-danger)'
                }}>
                  {log.result}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Botón Volver */}
        <button
          type="button"
          onClick={onClose}
          className="tl-btn-primary"
          style={{ marginTop: '0.5rem', padding: '0.7rem', fontSize: '0.8rem' }}
        >
          Cerrar Información Técnica
        </button>
      </div>
    </div>
  );
}
