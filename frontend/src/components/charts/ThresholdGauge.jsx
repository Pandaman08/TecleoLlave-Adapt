import React from 'react';
import { ShieldCheck, ShieldAlert, Target, CheckCircle2 } from 'lucide-react';

export default function ThresholdGauge({
  far = 0.028,
  frr = 0.042,
  eer = 0.035
}) {
  const gauges = [
    {
      id: 'far',
      label: 'FAR (Falsa Aceptación)',
      valuePct: far * 100,
      thresholdPct: 3.0,
      unit: '%',
      direction: 'lower-is-better',
      desc: 'Objetivo de Seguridad: < 3.00%'
    },
    {
      id: 'frr',
      label: 'FRR (Falso Rechazo)',
      valuePct: frr * 100,
      thresholdPct: 5.0,
      unit: '%',
      direction: 'lower-is-better',
      desc: 'Objetivo de Usabilidad: < 5.00%'
    },
    {
      id: 'eer',
      label: 'EER (Equal Error Rate)',
      valuePct: eer * 100,
      thresholdPct: 4.0,
      unit: '%',
      direction: 'lower-is-better',
      desc: 'Punto de Balance Óptimo: < 4.00%'
    }
  ];

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '1rem',
      width: '100%'
    }}>
      {gauges.map((g) => {
        const isOptimal = g.valuePct <= g.thresholdPct;
        const progressRatio = Math.min(1, g.valuePct / (g.thresholdPct * 1.5));
        const color = isOptimal ? '#10b981' : g.valuePct <= g.thresholdPct * 1.2 ? '#f59e0b' : '#ef4444';

        return (
          <div
            key={g.id}
            style={{
              backgroundColor: 'var(--bg-surface-elevated)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              textAlign: 'center'
            }}
          >
            <div style={{
              fontSize: '0.75rem',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              marginBottom: '0.5rem'
            }}>
              {g.label}
            </div>

            {/* Semicircular / Circular Gauge Ring */}
            <div style={{ position: 'relative', width: 90, height: 90, margin: '0.5rem 0' }}>
              <svg width="90" height="90" viewBox="0 0 90 90">
                <circle
                  cx="45"
                  cy="45"
                  r="36"
                  fill="transparent"
                  stroke="var(--border-subtle)"
                  strokeWidth="8"
                />
                <circle
                  cx="45"
                  cy="45"
                  r="36"
                  fill="transparent"
                  stroke={color}
                  strokeWidth="8"
                  strokeDasharray={2 * Math.PI * 36}
                  strokeDashoffset={2 * Math.PI * 36 * (1 - progressRatio)}
                  strokeLinecap="round"
                  transform="rotate(-90 45 45)"
                  style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                />
              </svg>
              <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <span style={{
                  fontSize: '1.05rem',
                  fontWeight: 700,
                  fontFamily: 'JetBrains Mono, monospace',
                  color: 'var(--text-primary)'
                }}>
                  {g.valuePct.toFixed(2)}%
                </span>
              </div>
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.72rem',
              fontWeight: 600,
              color: isOptimal ? 'var(--success)' : 'var(--warning)',
              backgroundColor: isOptimal ? 'var(--success-bg)' : 'var(--warning-bg)',
              padding: '0.15rem 0.5rem',
              borderRadius: 'var(--radius-sm)',
              marginTop: '0.25rem'
            }}>
              {isOptimal ? <CheckCircle2 size={12} /> : <ShieldAlert size={12} />}
              <span>{isOptimal ? 'En Rango Óptimo' : 'Requiere Calibración'}</span>
            </div>

            <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
              {g.desc}
            </span>
          </div>
        );
      })}
    </div>
  );
}
