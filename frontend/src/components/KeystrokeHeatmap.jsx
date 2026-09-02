import React, { useState } from 'react';

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Space']
];

// Sample baseline values per key in ms
const DEFAULT_HOLD_TIMES = {
  'L': 82, 'A': 95, 'S': 88, 'E': 74, 'G': 91, 'U': 80, 'R': 78,
  'I': 84, 'D': 90, 'P': 86, 'O': 79, 'T': 83, 'J': 89, 'N': 87,
  'F': 92, 'M': 94, 'C': 85, 'Ó': 98, 'Space': 110
};

function KeystrokeHeatmap({ holdTimes = DEFAULT_HOLD_TIMES, title = "Mapa de Calor de Tecleo (Hold Times)" }) {
  const [selectedKey, setSelectedKey] = useState(null);

  const getHeatColor = (key) => {
    const val = holdTimes[key] || holdTimes[key.toUpperCase()] || 85;
    // Normalized color gradient between 60ms (fast/green) to 120ms (slow/purple/orange)
    if (val < 75) return 'rgba(16, 185, 129, 0.4)'; // emerald
    if (val < 90) return 'rgba(99, 102, 241, 0.45)'; // indigo
    if (val < 105) return 'rgba(245, 158, 11, 0.45)'; // amber
    return 'rgba(239, 68, 68, 0.45)'; // red
  };

  const getBorderColor = (key) => {
    const val = holdTimes[key] || holdTimes[key.toUpperCase()] || 85;
    if (val < 75) return 'var(--accent-success)';
    if (val < 90) return 'var(--accent-primary)';
    if (val < 105) return 'var(--accent-warning)';
    return 'var(--accent-danger)';
  };

  return (
    <div className="glass-card" style={{ padding: '1.25rem', margin: '1rem 0' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-main)' }}>⌨️ {title}</h3>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Duración promedio de pulsación (Hold Time en ms) por tecla en el perfil activo.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.8rem', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.8)' }}></span> Rápido (&lt;75ms)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(99, 102, 241, 0.8)' }}></span> Normal (75-90ms)
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'rgba(245, 158, 11, 0.8)' }}></span> Moderado (90-105ms)
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', alignItems: 'center', background: 'rgba(15, 23, 42, 0.4)', padding: '1rem', borderRadius: '12px' }}>
        {KEYBOARD_ROWS.map((row, rIdx) => (
          <div key={rIdx} style={{ display: 'flex', gap: '0.4rem', justifyContent: 'center', width: '100%' }}>
            {row.map((key) => {
              const val = holdTimes[key] || holdTimes[key.toUpperCase()] || Math.floor(75 + Math.random() * 25);
              const isSpace = key === 'Space';
              return (
                <div
                  key={key}
                  onClick={() => setSelectedKey({ key, val })}
                  style={{
                    width: isSpace ? '280px' : '44px',
                    height: '42px',
                    borderRadius: '8px',
                    background: getHeatColor(key),
                    border: `1px solid ${getBorderColor(key)}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                  }}
                  title={`Tecla: ${key} | Hold Time: ${val} ms`}
                >
                  <span style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#ffffff' }}>{key}</span>
                  {!isSpace && <span style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.7)' }}>{val}ms</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {selectedKey && (
        <div style={{ marginTop: '0.8rem', padding: '0.5rem 0.8rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--accent-primary)' }}>
          📍 Tecla seleccionada: <b>{selectedKey.key}</b> | Hold Time estimado: <b>{selectedKey.val} ms</b>
        </div>
      )}
    </div>
  );
}

export default KeystrokeHeatmap;
