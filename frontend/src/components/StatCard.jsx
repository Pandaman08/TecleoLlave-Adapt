import React from 'react';
import {
  ShieldCheck,
  Cpu,
  Minus,
  Activity,
  Layers,
  Target,
  RefreshCw,
  Zap,
  AlertTriangle,
  AlertCircle,
  CheckCircle2
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
      severity: far < 0.05 ? 'ok' : far < 0.15 ? 'warn' : 'bad',
      hint: far < 0.05 ? 'Óptimo' : far < 0.15 ? 'Aceptable' : 'Crítico',
    },
    {
      id: 'frr',
      label: 'FRR (Falsos Rechazos)',
      value: `${(frr * 100).toFixed(2)}%`,
      severity: frr < 0.10 ? 'ok' : frr < 0.20 ? 'warn' : 'bad',
      hint: frr < 0.10 ? 'Óptimo' : frr < 0.20 ? 'Aceptable' : 'Crítico',
    },
    {
      id: 'eer',
      label: 'EER (Error Balance)',
      value: `${(eer * 100).toFixed(2)}%`,
      severity: eer < 0.10 ? 'ok' : eer < 0.20 ? 'warn' : 'bad',
      hint: eer < 0.10 ? 'Óptimo' : eer < 0.20 ? 'Aceptable' : 'Crítico',
    },
    {
      id: 'adaptations',
      label: 'Re-entrenamientos',
      value: String(adaptations),
      severity: 'neutral',
      hint: 'Hot-Swap',
    },
    {
      id: 'attempts',
      label: 'Sesiones Evaluadas',
      value: String(totalAuth),
      severity: 'neutral',
      hint: 'En Vivo',
    },
  ];

  return (
    <div className="stat-strip-container">
      {items.map((item) => (
        <div
          key={item.id}
          className="stat-strip-card"
          title={
            item.id === 'far' ? 'False Accept Rate: probabilidad de que un impostor sea aceptado. OBJETIVO: < 5%' :
            item.id === 'frr' ? 'False Reject Rate: probabilidad de que un usuario legítimo sea rechazado. OBJETIVO: < 10%' :
            item.id === 'eer' ? 'Equal Error Rate: punto donde FAR = FRR. OBJETIVO: < 10%' :
            item.id === 'adaptations' ? 'Cantidad de re-entrenamientos automáticos ejecutados' :
            'Total de sesiones de autenticación evaluadas'
          }
        >
          <div className="stat-strip-label">
            <span>{item.label}</span>
          </div>
          <div className="stat-strip-value-row">
            <span className="stat-strip-value">{item.value}</span>
            <span className={`stat-trend-indicator trend-${item.severity}`}>
              {item.severity === 'bad' && <AlertTriangle size={14} strokeWidth={2.5} />}
              {item.severity === 'warn' && <AlertCircle size={14} strokeWidth={2.5} />}
              {item.severity === 'ok' && <CheckCircle2 size={14} strokeWidth={2.5} />}
              {item.severity === 'neutral' && <Minus size={14} strokeWidth={2} />}
              <span>{item.hint}</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
