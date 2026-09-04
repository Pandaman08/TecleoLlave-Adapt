import React from 'react';
import { ShieldCheck, ShieldAlert, AlertTriangle } from 'lucide-react';

export default function SystemHealthBanner({ far, frr, eer, score }) {
  const isCritical =
    (far !== undefined && far !== null && far >= 0.15) ||
    (frr !== undefined && frr !== null && frr >= 0.20) ||
    (eer !== undefined && eer !== null && eer >= 0.20) ||
    (score !== undefined && score !== null && score < 0.70);

  const isWarning =
    !isCritical &&
    (
      (far !== undefined && far !== null && far >= 0.05) ||
      (frr !== undefined && frr !== null && frr >= 0.10) ||
      (eer !== undefined && eer !== null && eer >= 0.10)
    );

  const isOk = !isCritical && !isWarning;

  const config = isCritical ? {
    bg: 'var(--danger-bg)',
    border: 'var(--danger-border)',
    color: 'var(--danger)',
    icon: ShieldAlert,
    title: 'Acción Requerida',
    msg: 'Métricas fuera de rango operativo. Considere re-entrenar el modelo o采集 más datos de impostores.'
  } : isWarning ? {
    bg: 'var(--warning-bg)',
    border: 'var(--warning-border)',
    color: 'var(--warning)',
    icon: AlertTriangle,
    title: 'Vigilancia',
    msg: 'Métricas dentro de tolerancia pero acercándose a umbrales. Monitorear tendencia.'
  } : {
    bg: 'var(--success-bg)',
    border: 'var(--success-border)',
    color: 'var(--success)',
    icon: ShieldCheck,
    title: 'Sistema Operativo Normal',
    msg: 'Todas las métricas dentro de rango óptimo.'
  };

  const Icon = config.icon;

  return (
    <div style={{
      backgroundColor: config.bg,
      border: `1px solid ${config.border}`,
      color: config.color,
      borderRadius: 'var(--radius-md)',
      padding: '0.9rem 1.25rem',
      marginBottom: '1.25rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.85rem'
    }}>
      <Icon size={26} strokeWidth={2} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '0.95rem' }}>{config.title}</div>
        <div style={{ fontSize: '0.82rem', opacity: 0.85 }}>{config.msg}</div>
      </div>
    </div>
  );
}
