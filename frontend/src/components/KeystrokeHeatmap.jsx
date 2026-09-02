import React, { useState } from 'react';
import { Keyboard, Info } from 'lucide-react';

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Space']
];

const DEFAULT_HOLD_TIMES = {
  'L': 82, 'A': 95, 'S': 88, 'E': 74, 'G': 91, 'U': 80, 'R': 78,
  'I': 84, 'D': 90, 'P': 86, 'O': 79, 'T': 83, 'J': 89, 'N': 87,
  'F': 92, 'M': 94, 'C': 85, 'Ó': 98, 'Space': 108
};

export default function KeystrokeHeatmap({
  holdTimes = DEFAULT_HOLD_TIMES,
  title = "Mapa de Calor Biométrico (Hold Times)"
}) {
  const [selectedKey, setSelectedKey] = useState(null);

  // Continuous heatmap scale calculation
  const getKeyMetric = (key) => {
    return holdTimes[key] || holdTimes[key.toUpperCase()] || 85;
  };

  const getHeatStyles = (val) => {
    // Range normalized ~60ms to 120ms
    if (val < 76) {
      return {
        bg: '#059669', // emerald-600
        border: '#10b981',
        label: 'Rápido (<76ms)'
      };
    }
    if (val < 90) {
      return {
        bg: '#4f46e5', // indigo-600
        border: '#6366f1',
        label: 'Consistente (76-90ms)'
      };
    }
    if (val < 105) {
      return {
        bg: '#d97706', // amber-600
        border: '#f59e0b',
        label: 'Moderado (90-105ms)'
      };
    }
    return {
      bg: '#dc2626', // red-600
      border: '#ef4444',
      label: 'Lento / Transición (>105ms)'
    };
  };

  return (
    <div className="heatmap-card">
      <div className="heatmap-header">
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Keyboard size={18} strokeWidth={2} style={{ color: 'var(--brand-500)' }} />
            {title}
          </h3>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            Duración promedio de pulsación (Hold Time en milisegundos) registrada por el motor biométrico.
          </p>
        </div>

        {/* Compact Continuous Legend */}
        <div className="heatmap-legend">
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="legend-swatch" style={{ backgroundColor: '#059669' }}></span> &lt;76ms
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="legend-swatch" style={{ backgroundColor: '#4f46e5' }}></span> 76-90ms
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="legend-swatch" style={{ backgroundColor: '#d97706' }}></span> 90-105ms
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span className="legend-swatch" style={{ backgroundColor: '#dc2626' }}></span> &gt;105ms
          </span>
        </div>
      </div>

      <div className="keyboard-chassis">
        {KEYBOARD_ROWS.map((row, rIdx) => (
          <div key={rIdx} className="keyboard-row">
            {row.map((key) => {
              const val = getKeyMetric(key);
              const styles = getHeatStyles(val);
              const isSpace = key === 'Space';
              const isSelected = selectedKey?.key === key;

              return (
                <div
                  key={key}
                  onClick={() => setSelectedKey({ key, val, ...styles })}
                  className={`key-cap ${isSpace ? 'space-key' : ''}`}
                  style={{
                    backgroundColor: styles.bg,
                    borderColor: isSelected ? '#ffffff' : styles.border,
                    boxShadow: isSelected ? '0 0 0 2px #ffffff' : 'none'
                  }}
                  title={`Tecla: ${key} | Hold Time: ${val} ms`}
                >
                  <span className="key-label">{key}</span>
                  {!isSpace && <span className="key-metric">{val}ms</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {selectedKey && (
        <div style={{
          marginTop: '0.75rem',
          padding: '0.5rem 0.85rem',
          backgroundColor: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-sm)',
          fontSize: '0.8rem',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontFamily: 'JetBrains Mono, monospace'
        }}>
          <span>
            Tecla: <b>{selectedKey.key}</b> | Hold Time: <b>{selectedKey.val} ms</b>
          </span>
          <span style={{ color: selectedKey.border, fontWeight: 600 }}>
            {selectedKey.label}
          </span>
        </div>
      )}
    </div>
  );
}
