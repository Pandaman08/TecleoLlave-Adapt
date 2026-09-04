import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * QualityRing
 * -----------
 * Anillo de progreso que muestra la consistencia de las muestras capturadas.
 * Compara el vector de Hold Times y Flight Times de la muestra más reciente
 * contra el promedio acumulado.
 *
 * Props:
 *  - samples: array de muestras capturadas (con eventos)
 *  - currentIndex: índice de la última muestra capturada
 *  - target: { min: 70, max: 100 } rango aceptable
 */
export default function QualityRing({ samples = [], currentIndex = 0, target = { min: 70, max: 100 } }) {
  const quality = useMemo(() => {
    if (samples.length < 2) return null;

    // Calcular vector de hold times por muestra
    const vectors = samples
      .filter((s) => Array.isArray(s?.events) && s.events.length > 0)
      .map((s) => s.events.map((e) => e.hold_time ?? 0));

    if (vectors.length < 2) return null;

    // Coeficiente de variación promedio (inverso = consistencia)
    const last = vectors[vectors.length - 1];
    const prev = vectors[vectors.length - 2];

    // Comparar hold times carácter por carácter
    let totalDelta = 0;
    const len = Math.min(last.length, prev.length);
    for (let i = 0; i < len; i++) {
      const a = prev[i] || 1;
      const b = last[i] || 0;
      totalDelta += Math.abs(b - a) / a;
    }
    const avgDelta = totalDelta / len; // 0 = idéntico, >0.5 = muy distinto

    // Convertir a score 0-100 (menor delta = mayor score)
    const score = Math.max(0, Math.min(100, Math.round(100 * (1 - avgDelta * 1.5))));

    let trend = 'stable';
    if (vectors.length >= 3) {
      const before = vectors[vectors.length - 2];
      const beforeLast = vectors[vectors.length - 3];
      const d1 = computeAvgDelta(beforeLast, before);
      const d2 = computeAvgDelta(before, last);
      if (d2 < d1 * 0.85) trend = 'up';
      else if (d2 > d1 * 1.15) trend = 'down';
    }

    return { score, trend, delta: avgDelta };
  }, [samples]);

  if (!quality) {
    return (
      <EmptyQuality message="Necesitamos al menos 2 muestras para medir tu consistencia" />
    );
  }

  const { score, trend } = quality;
  const color =
    score >= target.max * 0.9 ? 'var(--success)' :
    score >= target.min ? 'var(--warning)' :
    'var(--danger)';

  const label =
    score >= target.max * 0.9 ? 'Excelente consistencia' :
    score >= target.min ? 'Consistencia aceptable' :
    'Necesitas mayor consistencia';

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'var(--success)' : trend === 'down' ? 'var(--danger)' : 'var(--text-muted)';

  // SVG ring
  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - score / 100);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '1rem',
        padding: '0.85rem 1rem',
        backgroundColor: 'var(--bg-surface-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1rem'
      }}
    >
      <div style={{ position: 'relative', width: 80, height: 80, flexShrink: 0 }}>
        <svg width="80" height="80" viewBox="0 0 80 80" style={{ transform: 'rotate(-90deg)' }}>
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke="var(--bg-canvas)"
            strokeWidth="6"
          />
          <circle
            cx="40"
            cy="40"
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth="6"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{ transition: 'stroke-dashoffset 0.6s ease, stroke 0.3s ease' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.1rem',
            fontWeight: 700,
            color: 'var(--text-primary)',
            fontFamily: "'JetBrains Mono', monospace"
          }}
        >
          {score}
        </div>
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
            Consistencia de tu ritmo
          </span>
          <TrendIcon size={14} style={{ color: trendColor }} />
        </div>
        <div style={{ fontSize: '0.78rem', color }}>
          {label}
        </div>
        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.2rem' }}>
          {score >= target.min
            ? 'Tu patrón rítmico es estable entre muestras.'
            : 'Tip: intenta tipear de forma más uniforme entre muestras.'}
        </div>
      </div>
    </div>
  );
}

function EmptyQuality({ message }) {
  return (
    <div
      style={{
        padding: '0.75rem 1rem',
        backgroundColor: 'var(--bg-surface-elevated)',
        border: '1px dashed var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1rem',
        fontSize: '0.78rem',
        color: 'var(--text-muted)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          backgroundColor: 'var(--bg-canvas)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <Minus size={14} />
      </div>
      <span>{message}</span>
    </div>
  );
}

function computeAvgDelta(a, b) {
  const len = Math.min(a.length, b.length);
  if (len === 0) return 0;
  let total = 0;
  for (let i = 0; i < len; i++) {
    const x = a[i] || 1;
    total += Math.abs((b[i] || 0) - x) / x;
  }
  return total / len;
}
