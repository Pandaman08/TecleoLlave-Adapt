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
      marginBottom: '1.5rem', padding: '0.85rem 1.25rem',
      backgroundColor: 'var(--bg-surface)',
      borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-subtle)',
      boxShadow: 'var(--shadow-sm)'
    }}>
      {stepStates.map((s, i) => (
        <div key={s.num || i} style={{ display: 'flex', alignItems: 'center', flex: i < stepStates.length - 1 ? '1 1 0' : '0 0 auto', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{
              width: 28, height: 28, borderRadius: '50%',
              background: s.isDone ? 'var(--success)' : s.isActive ? 'var(--brand-gradient)' : 'var(--bg-surface-elevated)',
              color: s.isDone || s.isActive ? '#fff' : 'var(--text-muted)',
              fontSize: '0.78rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: s.isActive ? '0 0 0 3px rgba(99, 102, 241, 0.25), 0 2px 8px rgba(79, 70, 229, 0.35)' : 'none',
              border: s.isActive ? '1px solid rgba(255, 255, 255, 0.4)' : '1px solid var(--border-subtle)',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}>
              {s.isDone ? '✓' : (s.num || i + 1)}
            </span>
            <span style={{
              fontSize: '0.82rem', fontWeight: s.isActive ? 700 : 600,
              color: s.isActive ? 'var(--brand-glow)' : s.isDone ? 'var(--success)' : 'var(--text-muted)',
              whiteSpace: 'nowrap'
            }}>
              {s.label}
            </span>
          </div>
          {i < stepStates.length - 1 && (
            <div style={{
              height: 2, flex: 1, margin: '0 0.85rem',
              background: s.isDone
                ? 'linear-gradient(90deg, var(--success) 0%, var(--brand-glow) 100%)'
                : 'var(--border-subtle)',
              borderRadius: '2px',
              transition: 'background 0.3s ease'
            }} />
          )}
        </div>
      ))}
    </div>
  );
}
