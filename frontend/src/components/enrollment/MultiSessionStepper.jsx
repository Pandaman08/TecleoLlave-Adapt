import React from 'react';

export default function MultiSessionStepper({
  step = 2,
  samplesCount = 0,
  requiredSamples = 30,
  sessionsCount = 0,
  requiredSessions = 3,
  labels = null
}) {
  const defaultLabels = [
    { num: 1, label: 'Credenciales', isDone: step > 1, isActive: step === 1 },
    {
      num: 2,
      label: `Multi-Sesión (${samplesCount}/${requiredSamples} m., ${sessionsCount}/${requiredSessions} ses.)`,
      isDone: step > 2,
      isActive: step === 2
    },
    { num: 3, label: 'Perfil Listo', isDone: step === 3, isActive: step === 3 }
  ];

  const stepStates = labels || defaultLabels;

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      marginBottom: '1.5rem', padding: '0.75rem 1rem',
      backgroundColor: 'var(--bg-surface-elevated)',
      borderRadius: 'var(--radius-md)',
      border: '1px solid var(--border-subtle)'
    }}>
      {stepStates.map((s, i) => (
        <div key={s.num || i} style={{ display: 'flex', alignItems: 'center', flex: i < stepStates.length - 1 ? '1 1 0' : '0 0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              width: 26, height: 26, borderRadius: '50%',
              backgroundColor: s.isDone ? 'var(--success)' : s.isActive ? 'var(--brand-600)' : 'var(--bg-surface)',
              color: s.isDone || s.isActive ? '#fff' : 'var(--text-muted)',
              fontSize: '0.75rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              border: s.isActive ? '2px solid var(--brand-500)' : 'none',
              transition: 'all 0.2s ease'
            }}>
              {s.isDone ? '✓' : (s.num || i + 1)}
            </span>
            <span style={{
              fontSize: '0.8rem', fontWeight: 600,
              color: s.isActive ? 'var(--brand-500)' : s.isDone ? 'var(--success)' : 'var(--text-muted)',
              whiteSpace: 'nowrap'
            }}>
              {s.label}
            </span>
          </div>
          {i < stepStates.length - 1 && (
            <div style={{
              height: 1, flex: 1, margin: '0 0.75rem',
              backgroundColor: s.isDone ? 'var(--success)' : 'var(--border-subtle)',
              transition: 'background-color 0.3s ease'
            }} />
          )}
        </div>
      ))}
    </div>
  );
}
