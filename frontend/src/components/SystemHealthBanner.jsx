/**
 * SystemHealthBanner - Banner de salud general del sistema
 * Color e ícono según severidad calculada de las métricas
 */
import { useTranslation } from 'react-i18next';
import { ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';

export default function SystemHealthBanner({ far, frr, eer, score, metricsReliable = null }) {
  const { t } = useTranslation();

  // BUG FIXED: previously, FAR/FRR/EER computed on a near-empty test set
  // (as few as 1-2 samples) could show "100%" and trigger the scariest
  // "Acción Requerida" (critical) banner, even though the number itself was
  // not statistically meaningful. When the backend flags the underlying
  // test set as too small (metricsReliable === false), we no longer let
  // far/frr/eer drive the severity — only the live `score` (based on real
  // auth attempts, not the training-time test split) does. A distinct
  // neutral "still stabilizing" state communicates this honestly instead of
  // silently hiding the issue or falsely alarming the user.
  const isLowConfidence = metricsReliable === false;

  const isCritical = !isLowConfidence && (
    (far !== undefined && far >= 0.15) ||
    (frr !== undefined && frr >= 0.20) ||
    (eer !== undefined && eer >= 0.20) ||
    (score !== undefined && score !== null && score < 0.70)
  );

  const isWarning = !isCritical && !isLowConfidence && (
    (far !== undefined && far >= 0.05) ||
    (frr !== undefined && frr >= 0.10) ||
    (eer !== undefined && eer >= 0.10) ||
    (score !== undefined && score !== null && score < 0.85)
  );

  // Con muestra insuficiente, seguimos respetando un score en vivo realmente
  // malo (posible problema real), pero no lo escalamos a "crítico" solo por
  // FAR/FRR/EER poco confiables.
  const lowConfidenceIsWarning = isLowConfidence && (
    score !== undefined && score !== null && score < 0.85
  );

  const isOk = !isCritical && !isWarning && !isLowConfidence;

  const config = isCritical ? {
    bg: 'var(--danger-bg)', border: 'var(--danger-border)', color: 'var(--danger)',
    icon: ShieldAlert, key: 'critical'
  } : (isWarning || lowConfidenceIsWarning) ? {
    bg: 'var(--warning-bg)', border: 'var(--warning-border)', color: 'var(--warning)',
    icon: AlertTriangle, key: isLowConfidence ? 'low_confidence' : 'warning'
  } : isLowConfidence ? {
    bg: 'var(--info-bg)', border: 'var(--info-border)', color: 'var(--info)',
    icon: ShieldCheck, key: 'low_confidence'
  } : {
    bg: 'var(--success-bg)', border: 'var(--success-border)', color: 'var(--success)',
    icon: ShieldCheck, key: 'ok'
  };

  const Icon = config.icon;

  // No mostrar banner si no hay datos
  if (far === undefined && frr === undefined && eer === undefined && score === undefined) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        backgroundColor: config.bg,
        border: `1px solid ${config.border}`,
        color: config.color,
        borderRadius: 'var(--radius-md)',
        padding: '0.9rem 1.25rem',
        marginBottom: '1.25rem',
        display: 'flex',
        alignItems: 'center',
        gap: '0.85rem'
      }}
    >
      <Icon size={26} strokeWidth={2} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>
          {t(`dashboard.health.${config.key}_title`)}
        </div>
        <div style={{ fontSize: '0.82rem', opacity: 0.85, marginTop: '0.15rem' }}>
          {t(`dashboard.health.${config.key}_msg`)}
        </div>
      </div>
    </div>
  );
}