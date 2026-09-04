/**
 * StatCard.jsx - Migrado a i18n
 * Stat severities son funciones del valor, no hardcoded
 */
import React from 'react';
import {
  ShieldCheck, Cpu, ArrowDown, ArrowUp, Minus, Activity, Layers,
  Target, RefreshCw, Zap, AlertTriangle, AlertCircle, CheckCircle2
} from 'lucide-react';
import { useTranslation } from 'react-i18next';

/**
 * Helper: clasifica severidad de un valor 0-1
 */
function classify(value, okThreshold, warnThreshold) {
  if (value === undefined || value === null) return 'neutral';
  if (value <= okThreshold) return 'ok';
  if (value <= warnThreshold) return 'warn';
  return 'bad';
}

/**
 * HeroStatCard
 */
export function HeroStatCard({
  title, value, badgeText = 'Activo', badgeType = 'active',
  footerText, icon: Icon = ShieldCheck
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
      <div className="hero-stat-value">{value}</div>
      {footerText && (
        <div className="hero-stat-footer">{footerText}</div>
      )}
    </div>
  );
}

/**
 * CompactStatStrip — versión i18n completa
 */
export function CompactStatStrip({
  far = 0, frr = 0, eer = 0, adaptations = 0, totalAuth = 0
}) {
  const { t } = useTranslation();

  const farSeverity = classify(far, 0.05, 0.15);
  const frrSeverity = classify(frr, 0.10, 0.20);
  const eerSeverity = classify(eer, 0.10, 0.20);

  const severityHint = (sev) => {
    if (sev === 'ok') return t('dashboard.stats.severity_optimal');
    if (sev === 'warn') return t('dashboard.stats.severity_acceptable');
    if (sev === 'bad') return t('dashboard.stats.severity_critical');
    return null;
  };

  const items = [
    {
      id: 'far',
      label: t('dashboard.stats.far'),
      value: `${(far * 100).toFixed(2)}%`,
      severity: farSeverity,
      hint: severityHint(farSeverity),
      title: 'False Accept Rate: probability that an impostor is accepted. TARGET: < 5%'
    },
    {
      id: 'frr',
      label: t('dashboard.stats.frr'),
      value: `${(frr * 100).toFixed(2)}%`,
      severity: frrSeverity,
      hint: severityHint(frrSeverity),
      title: 'False Reject Rate: probability that a legitimate user is rejected. TARGET: < 10%'
    },
    {
      id: 'eer',
      label: t('dashboard.stats.eer'),
      value: `${(eer * 100).toFixed(2)}%`,
      severity: eerSeverity,
      hint: severityHint(eerSeverity),
      title: 'Equal Error Rate: point where FAR = FRR. TARGET: < 10%'
    },
    {
      id: 'adaptations',
      label: t('dashboard.stats.adaptations'),
      value: String(adaptations),
      severity: 'neutral',
      hint: t('dashboard.stats.hint_adaptations')
    },
    {
      id: 'attempts',
      label: t('dashboard.stats.attempts'),
      value: String(totalAuth),
      severity: 'neutral',
      hint: t('dashboard.stats.hint_live')
    }
  ];

  const severityIcon = (sev) => {
    if (sev === 'bad') return AlertTriangle;
    if (sev === 'warn') return AlertCircle;
    if (sev === 'ok') return CheckCircle2;
    return Minus;
  };

  return (
    <div className="stat-strip-container">
      {items.map((item) => {
        const Icon = severityIcon(item.severity);
        return (
          <div
            key={item.id}
            className="stat-strip-card"
            title={item.title}
            data-severity={item.severity}
          >
            <div className="stat-strip-label">
              <span>{item.label}</span>
            </div>
            <div className="stat-strip-value-row">
              <span className="stat-strip-value">{item.value}</span>
              <span className={`stat-trend-indicator trend-${item.severity}`}>
                <Icon size={14} strokeWidth={2.5} />
                {item.hint && <span>{item.hint}</span>}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
