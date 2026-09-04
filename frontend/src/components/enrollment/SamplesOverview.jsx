import { Check, Clock, Zap } from 'lucide-react';

/**
 * SamplesOverview
 * ---------------
 * Grid de "chips" para las muestras de enrolamiento.
 * Mejora la versión actual (línea 339-365 de Register.jsx) con:
 *  - Duración de cada muestra
 *  - Score de consistencia por muestra
 *  - Estado claro (pendiente / actual / completada)
 *  - Click para revisar la muestra
 */
export default function SamplesOverview({
  samples = [],
  total = 5,
  currentIndex = 0
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${total}, 1fr)`,
        gap: '0.5rem',
        marginBottom: '1rem'
      }}
    >
      {Array.from({ length: total }).map((_, idx) => {
        const isDone = idx < samples.length;
        const isCurrent = idx === samples.length && isDone === false;
        const sample = samples[idx];
        const duration = sample?.total_duration ?? null;
        const consistency = sample?.consistency ?? null;

        return (
          <SampleChip
            key={idx}
            index={idx}
            isDone={isDone}
            isCurrent={isCurrent}
            duration={duration}
            consistency={consistency}
          />
        );
      })}
    </div>
  );
}

function SampleChip({ index, isDone, isCurrent, duration, consistency }) {
  const baseStyle = {
    padding: '0.65rem 0.5rem',
    borderRadius: 'var(--radius-sm)',
    textAlign: 'center',
    fontSize: '0.72rem',
    fontWeight: 600,
    border: '1px solid',
    transition: 'all 0.2s ease',
    cursor: 'default',
    minHeight: 70,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.2rem'
  };

  if (isDone) {
    const scoreColor =
      consistency === null ? 'var(--text-muted)' :
      consistency >= 80 ? 'var(--success)' :
      consistency >= 60 ? 'var(--warning)' : 'var(--danger)';

    return (
      <div
        style={{
          ...baseStyle,
          backgroundColor: 'var(--success-bg)',
          color: 'var(--success)',
          borderColor: 'var(--success-border)'
        }}
        title={`Muestra ${index + 1} completada`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Check size={12} />
          <span>M{index + 1}</span>
        </div>
        {duration !== null && (
          <div
            style={{
              fontSize: '0.65rem',
              color: 'var(--text-muted)',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              gap: '0.15rem'
            }}
          >
            <Clock size={9} />
            <span>{(duration / 1000).toFixed(1)}s</span>
          </div>
        )}
        {consistency !== null && (
          <div
            style={{
              fontSize: '0.65rem',
              color: scoreColor,
              fontWeight: 700,
              fontFamily: "'JetBrains Mono', monospace"
            }}
          >
            {consistency}%
          </div>
        )}
      </div>
    );
  }

  if (isCurrent) {
    return (
      <div
        style={{
          ...baseStyle,
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          color: 'var(--brand-500)',
          borderColor: 'rgba(99, 102, 241, 0.4)',
          boxShadow: '0 0 0 3px rgba(99, 102, 241, 0.15)',
          animation: 'pulse-soft 1.6s ease-in-out infinite'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          <Zap size={12} />
          <span>M{index + 1}</span>
        </div>
        <div style={{ fontSize: '0.65rem', fontWeight: 500 }}>Ahora</div>
      </div>
    );
  }

  return (
    <div
      style={{
        ...baseStyle,
        backgroundColor: 'var(--bg-surface-elevated)',
        color: 'var(--text-muted)',
        borderColor: 'var(--border-subtle)'
      }}
    >
      <div style={{ opacity: 0.6 }}>M{index + 1}</div>
      <div style={{ fontSize: '0.65rem', fontWeight: 500, opacity: 0.6 }}>—</div>
    </div>
  );
}
