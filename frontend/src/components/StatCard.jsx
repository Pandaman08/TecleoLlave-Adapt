import React from 'react';
import {
  ShieldCheck,
  Cpu,
  ArrowDown,
  ArrowUp,
  Minus,
  Activity,
  Layers,
  Target,
  RefreshCw,
  Zap
} from 'lucide-react';

/**
 * HeroStatCard: Large prominent card for core system health / active biometric model
 */
export function HeroStatCard({
  title,
  value,
  badgeText = 'Activo',
  badgeType = 'active',
  footerText,
  icon: Icon = ShieldCheck
}) {
  return (
    <div className="hero-stat-card">
      <div className="hero-stat-header">
        <span className="hero-stat-title">
          <Icon size={18} strokeWidth={2} />
          {title}
        </span>
        <span className={`hero-stat-badge badge-${badgeType}`}>
          {badgeText}
        </span>
      </div>
      <div className="hero-stat-value">
        {value}
      </div>
      {footerText && (
        <div className="hero-stat-footer">
          {footerText}
        </div>
      )}
    </div>
  );
}

/**
 * CompactStatStrip: Compact tabular metrics strip for security & ML parameters
 */
export function CompactStatStrip({
  far = 0,
  frr = 0,
  eer = 0,
  adaptations = 0,
  totalAuth = 0
}) {
  const items = [
    {
      id: 'far',
      label: 'FAR (Falsos Aceptos)',
      value: `${(far * 100).toFixed(2)}%`,
      trend: 'down',
      trendGood: true,
      hint: 'Mínimo'
    },
    {
      id: 'frr',
      label: 'FRR (Falsos Rechazos)',
      value: `${(frr * 100).toFixed(2)}%`,
      trend: 'down',
      trendGood: true,
      hint: 'Mitigado'
    },
    {
      id: 'eer',
      label: 'EER (Error Balance)',
      value: `${(eer * 100).toFixed(2)}%`,
      trend: 'neutral',
      hint: 'Óptimo'
    },
    {
      id: 'adaptations',
      label: 'Re-entrenamientos',
      value: String(adaptations),
      trend: 'up',
      trendGood: true,
      hint: 'Hot-Swap'
    },
    {
      id: 'attempts',
      label: 'Sesiones Evaluadas',
      value: String(totalAuth),
      trend: 'neutral',
      hint: 'En Vivo'
    }
  ];

  return (
    <div className="stat-strip-container">
      {items.map((item) => (
        <div key={item.id} className="stat-strip-card">
          <div className="stat-strip-label">
            <span>{item.label}</span>
          </div>
          <div className="stat-strip-value-row">
            <span className="stat-strip-value">{item.value}</span>
            <span className={`stat-trend-indicator ${
              item.trend === 'down' ? 'trend-down-good' :
              item.trend === 'up' ? 'trend-up-good' : 'trend-neutral'
            }`}>
              {item.trend === 'down' && <ArrowDown size={14} strokeWidth={2.5} />}
              {item.trend === 'up' && <ArrowUp size={14} strokeWidth={2.5} />}
              {item.trend === 'neutral' && <Minus size={14} strokeWidth={2} />}
              <span>{item.hint}</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
