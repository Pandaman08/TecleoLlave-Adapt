import React, { useState, useMemo } from 'react';
import { Keyboard, ArrowRightLeft, Info, Sparkles, Activity } from 'lucide-react';

const KEYBOARD_ROWS = [
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ñ'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M', 'Space']
];

// Baseline metrics per key: Hold Times & Flight Times in ms
const DEFAULT_METRICS = {
  hold: {
    'L': { val: 82, samples: 24, std: 5.2 },
    'A': { val: 95, samples: 32, std: 6.8 },
    'S': { val: 88, samples: 28, std: 5.9 },
    'E': { val: 74, samples: 45, std: 4.8 },
    'G': { val: 91, samples: 18, std: 7.1 },
    'U': { val: 80, samples: 22, std: 5.4 },
    'R': { val: 78, samples: 36, std: 5.1 },
    'I': { val: 84, samples: 29, std: 5.7 },
    'D': { val: 90, samples: 20, std: 6.3 },
    'P': { val: 86, samples: 19, std: 6.0 },
    'O': { val: 79, samples: 34, std: 5.3 },
    'T': { val: 83, samples: 27, std: 5.6 },
    'J': { val: 89, samples: 15, std: 6.5 },
    'N': { val: 87, samples: 23, std: 6.1 },
    'F': { val: 92, samples: 16, std: 7.0 },
    'M': { val: 94, samples: 21, std: 6.9 },
    'C': { val: 85, samples: 25, std: 5.8 },
    'Ó': { val: 98, samples: 14, std: 7.4 },
    'Space': { val: 108, samples: 50, std: 8.2 }
  },
  flight: {
    'L': { val: 135, samples: 24, std: 12.4 },
    'A': { val: 142, samples: 32, std: 14.1 },
    'S': { val: 128, samples: 28, std: 11.2 },
    'E': { val: 115, samples: 45, std: 9.8 },
    'G': { val: 156, samples: 18, std: 15.6 },
    'U': { val: 138, samples: 22, std: 13.0 },
    'R': { val: 122, samples: 36, std: 10.5 },
    'I': { val: 130, samples: 29, std: 11.8 },
    'D': { val: 145, samples: 20, std: 14.2 },
    'P': { val: 160, samples: 19, std: 16.4 },
    'O': { val: 126, samples: 34, std: 11.0 },
    'T': { val: 134, samples: 27, std: 12.1 },
    'J': { val: 148, samples: 15, std: 14.9 },
    'N': { val: 139, samples: 23, std: 13.5 },
    'F': { val: 152, samples: 16, std: 15.1 },
    'M': { val: 165, samples: 21, std: 17.0 },
    'C': { val: 137, samples: 25, std: 12.8 },
    'Ó': { val: 172, samples: 14, std: 18.2 },
    'Space': { val: 185, samples: 50, std: 19.5 }
  }
};

export default function KeystrokeHeatmap({ title = "Mapa de Calor Biométrico" }) {
  const [metricMode, setMetricMode] = useState('hold'); // 'hold' | 'flight'
  const [hoveredKey, setHoveredKey] = useState(null);
  const [selectedKey, setSelectedKey] = useState(null);

  const isHold = metricMode === 'hold';

  // Get data for key
  const getKeyData = (key) => {
    const table = DEFAULT_METRICS[metricMode];
    const data = table[key] || table[key.toUpperCase()];
    if (data) return data;
    // Fallback based on metric mode
    const fallbackVal = isHold ? 84 : 140;
    return { val: fallbackVal, samples: 15, std: 6.0 };
  };

  // Color calculation based on mode and value
  const getKeyStyle = (val) => {
    if (isHold) {
      // Hold Time Ranges: <76ms (emerald), 76-90ms (indigo), 90-105ms (amber), >105ms (red)
      if (val < 76) return { bg: '#059669', border: '#10b981', tag: 'Rápido (<76ms)' };
      if (val < 90) return { bg: '#4f46e5', border: '#6366f1', tag: 'Consistente (76-90ms)' };
      if (val < 105) return { bg: '#d97706', border: '#f59e0b', tag: 'Moderado (90-105ms)' };
      return { bg: '#dc2626', border: '#ef4444', tag: 'Lento (>105ms)' };
    } else {
      // Flight Time Ranges: <125ms (emerald), 125-145ms (indigo), 145-165ms (amber), >165ms (red)
      if (val < 125) return { bg: '#059669', border: '#10b981', tag: 'Transición Rápida (<125ms)' };
      if (val < 145) return { bg: '#4f46e5', border: '#6366f1', tag: 'Transición Nominal (125-145ms)' };
      if (val < 165) return { bg: '#d97706', border: '#f59e0b', tag: 'Latencia Intermedia (145-165ms)' };
      return { bg: '#dc2626', border: '#ef4444', tag: 'Latencia Alta (>165ms)' };
    }
  };

  const activeKeyInfo = hoveredKey || selectedKey;

  return (
    <div className="heatmap-card">
      <div className="heatmap-header" style={{ flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', margin: 0 }}>
            <Keyboard size={18} strokeWidth={2} style={{ color: 'var(--brand-500)' }} />
            {title}
          </h3>
          <p style={{ margin: '0.2rem 0 0', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
            {isHold
              ? 'Duración de pulsación física (Hold Time) registrada por el perfil biométrico activo.'
              : 'Latencia de transición entre pulsaciones consecutivas (Flight / Inter-Key Interval).'}
          </p>
        </div>

        {/* View Mode Switcher: Hold Time vs Flight Time */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            display: 'flex',
            backgroundColor: 'var(--bg-surface-elevated)',
            padding: '3px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-subtle)'
          }}>
            <button
              type="button"
              onClick={() => setMetricMode('hold')}
              style={{
                padding: '0.3rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: isHold ? '#4f46e5' : 'transparent',
                color: isHold ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.2s ease'
              }}
            >
              Hold Time (Pulsación)
            </button>
            <button
              type="button"
              onClick={() => setMetricMode('flight')}
              style={{
                padding: '0.3rem 0.65rem',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                fontWeight: 600,
                border: 'none',
                cursor: 'pointer',
                backgroundColor: !isHold ? '#4f46e5' : 'transparent',
                color: !isHold ? '#ffffff' : 'var(--text-secondary)',
                transition: 'all 0.2s ease'
              }}
            >
              Flight Time (Latencia)
            </button>
          </div>

          {/* Compact Legend */}
          <div className="heatmap-legend" style={{ display: 'flex', gap: '0.5rem', fontSize: '0.72rem' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span className="legend-swatch" style={{ backgroundColor: '#059669' }}></span> {isHold ? '<76ms' : '<125ms'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span className="legend-swatch" style={{ backgroundColor: '#4f46e5' }}></span> {isHold ? '76-90ms' : '125-145ms'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span className="legend-swatch" style={{ backgroundColor: '#d97706' }}></span> {isHold ? '90-105ms' : '145-165ms'}
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span className="legend-swatch" style={{ backgroundColor: '#dc2626' }}></span> {isHold ? '>105ms' : '>165ms'}
            </span>
          </div>
        </div>
      </div>

      {/* Keyboard Grid */}
      <div className="keyboard-chassis" style={{ position: 'relative' }}>
        {KEYBOARD_ROWS.map((row, rIdx) => (
          <div key={rIdx} className="keyboard-row">
            {row.map((key) => {
              const info = getKeyData(key);
              const style = getKeyStyle(info.val);
              const isSpace = key === 'Space';
              const isHovered = hoveredKey?.key === key;
              const isSelected = selectedKey?.key === key;

              return (
                <div
                  key={key}
                  onMouseEnter={() => setHoveredKey({ key, ...info, ...style })}
                  onMouseLeave={() => setHoveredKey(null)}
                  onClick={() => setSelectedKey({ key, ...info, ...style })}
                  className={`key-cap ${isSpace ? 'space-key' : ''}`}
                  style={{
                    backgroundColor: style.bg,
                    borderColor: isSelected || isHovered ? '#ffffff' : style.border,
                    boxShadow: isSelected || isHovered ? '0 0 0 2px #ffffff, 0 4px 12px rgba(0,0,0,0.35)' : 'none',
                    transform: isHovered ? 'translateY(-2px) scale(1.05)' : 'translateY(0)',
                    transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    zIndex: isHovered ? 10 : 1
                  }}
                  title={`Tecla: ${key} | ${info.val} ms (σ=${info.std}ms, ${info.samples} muestras)`}
                >
                  <span className="key-label">{key}</span>
                  {!isSpace && <span className="key-metric">{info.val}ms</span>}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Interactive Tooltip / Key Details Inspector Card */}
      <div style={{
        marginTop: '0.85rem',
        padding: '0.65rem 1rem',
        backgroundColor: 'var(--bg-surface-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        fontSize: '0.8rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.5rem',
        fontFamily: "'JetBrains Mono', monospace",
        transition: 'all 0.2s ease'
      }}>
        {activeKeyInfo ? (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
              <span>
                Tecla: <b style={{ color: 'var(--text-primary)', fontSize: '0.9rem' }}>{activeKeyInfo.key}</b>
              </span>
              <span>
                {isHold ? 'Hold Time Promedio: ' : 'Flight Time Promedio: '}
                <b style={{ color: 'var(--brand-500)', fontSize: '0.9rem' }}>{activeKeyInfo.val} ms</b>
              </span>
              <span style={{ color: 'var(--text-muted)' }}>
                Muestras: <b>{activeKeyInfo.samples}</b> | Desviación: <b>σ = ±{activeKeyInfo.std} ms</b>
              </span>
            </div>
            <span style={{ color: activeKeyInfo.border, fontWeight: 700 }}>
              {activeKeyInfo.tag}
            </span>
          </>
        ) : (
          <div style={{ color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.78rem' }}>
            <Sparkles size={14} style={{ color: 'var(--brand-500)' }} />
            <span>Pasa el cursor sobre cualquier tecla para inspeccionar su latencia rítmica y desviación estándar.</span>
          </div>
        )}
      </div>
    </div>
  );
}
