import { useMemo } from 'react';
import { Activity, Clock, Target, TrendingUp, ShieldCheck, Cpu, Hash } from 'lucide-react';

/**
 * MetricsPreview
 * --------------
 * Panel que muestra el resumen de las 5 muestras capturadas ANTES de
 * entrenar el modelo. Reemplaza el mensaje plano actual con un
 * desglose visual de lo que se va a entrenar.
 */
export default function MetricsPreview({ samples = [], totalSamples = 5 }) {
  const metrics = useMemo(() => {
    if (!Array.isArray(samples) || samples.length === 0) return null;

    const validSamples = samples.filter((s) => Array.isArray(s?.events) && s.events.length > 0);
    if (validSamples.length === 0) return null;

    // Hold time promedio y desviación
    const holdTimes = validSamples.map((s) => {
      const events = s.events;
      const total = events.reduce((sum, e) => sum + (e.hold_time || 0), 0);
      return total / events.length;
    });

    const avgHoldTime = holdTimes.reduce((a, b) => a + b, 0) / holdTimes.length;
    const variance = holdTimes.reduce((sum, t) => sum + Math.pow(t - avgHoldTime, 2), 0) / holdTimes.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = (stdDev / avgHoldTime) * 100;

    // Duración total
    const durations = validSamples.map((s) => s.total_duration || 0).filter((d) => d > 0);
    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    // Características (features) detectadas
    const featuresCount = validSamples[0]?.events?.length || 0;

    // Consistencia global (inversa al coeficiente de variación)
    const consistency = Math.max(0, Math.min(100, Math.round(100 - coefficientOfVariation * 1.2)));

    return {
      avgHoldTime: Math.round(avgHoldTime),
      consistency,
      avgDuration: (avgDuration / 1000).toFixed(1),
      featuresCount,
      coefficientOfVariation: coefficientOfVariation.toFixed(1),
      sampleCount: validSamples.length
    };
  }, [samples]);

  if (!metrics) return null;

  return (
    <div
      style={{
        backgroundColor: 'var(--success-bg)',
        border: '1px solid var(--success-border)',
        borderRadius: 'var(--radius-md)',
        padding: '1.25rem',
        marginBottom: '1rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: '50%',
            backgroundColor: 'var(--success)',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ShieldCheck size={18} />
        </div>
        <div>
          <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--success)' }}>
            ¡Muestras listas para entrenar!
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Tu modelo base M₀ se construirá con los siguientes parámetros
          </div>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.6rem',
          marginBottom: '1rem'
        }}
      >
        <Metric
          icon={Activity}
          label="Consistencia"
          value={`${metrics.consistency}%`}
          color={metrics.consistency >= 80 ? 'var(--success)' : metrics.consistency >= 60 ? 'var(--warning)' : 'var(--danger)'}
        />
        <Metric
          icon={Clock}
          label="Tiempo medio"
          value={`${metrics.avgHoldTime}ms`}
          color="var(--text-primary)"
        />
        <Metric
          icon={Target}
          label="Duración"
          value={`${metrics.avgDuration}s`}
          color="var(--text-primary)"
        />
        <Metric
          icon={Hash}
          label="Features"
          value={metrics.featuresCount}
          color="var(--text-primary)"
        />
      </div>

      <div
        style={{
          padding: '0.75rem',
          backgroundColor: 'var(--bg-surface)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.78rem',
          color: 'var(--text-secondary)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          border: '1px solid var(--border-subtle)'
        }}
      >
        <Cpu size={16} style={{ color: 'var(--brand-500)', flexShrink: 0 }} />
        <span>
          Al continuar entrenaremos un <strong>RandomForest + IsolationForest</strong> calibrado
          con tus {metrics.sampleCount} muestras (~3 segundos). Umbral operativo inicial: 75%.
        </span>
      </div>
    </div>
  );
}

function Metric({ icon: Icon, label, value, color }) {
  return (
    <div
      style={{
        padding: '0.6rem',
        backgroundColor: 'var(--bg-surface)',
        borderRadius: 'var(--radius-sm)',
        border: '1px solid var(--border-subtle)',
        textAlign: 'center'
      }}
    >
      <Icon size={14} style={{ color: 'var(--text-muted)', marginBottom: '0.25rem' }} />
      <div
        style={{
          fontSize: '1.1rem',
          fontWeight: 700,
          color,
          fontFamily: "'JetBrains Mono', monospace",
          lineHeight: 1.2
        }}
      >
        {value}
      </div>
      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
        {label}
      </div>
    </div>
  );
}
