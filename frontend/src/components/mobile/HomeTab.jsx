import React, { useState } from 'react';
import {
  ShieldCheck, ShieldAlert, KeyRound, Smartphone, Eye, EyeOff,
  Sparkles, CheckCircle2, AlertTriangle, ArrowRight, Lock
} from 'lucide-react';

export default function HomeTab({
  participant,
  phrase,
  isEnrolled,
  enrolledRepsCount,
  protectedApps,
  permissionsStatus,
  onNavigateTab,
  onStartTraining,
  onOpenAppLocker
}) {
  const [showPhrase, setShowPhrase] = useState(false);

  // Determinar estado real de seguridad
  const hasPendingPermissions = !permissionsStatus.usageStats || !permissionsStatus.overlay;
  
  let securityStatus = {
    title: 'Protección activa',
    desc: 'Tu identidad se verifica mediante tu forma de escribir.',
    badgeClass: 'emerald',
    badgeText: 'Activa',
    icon: ShieldCheck,
    color: 'var(--tl-success)'
  };

  if (!isEnrolled || enrolledRepsCount < 30) {
    securityStatus = {
      title: 'Perfil en entrenamiento',
      desc: 'Completa las 30 muestras para activar el reconocimiento de tu ritmo.',
      badgeClass: 'amber',
      badgeText: `${enrolledRepsCount}/30 Muestras`,
      icon: Sparkles,
      color: 'var(--tl-warning)'
    };
  } else if (hasPendingPermissions) {
    securityStatus = {
      title: 'Permiso pendiente',
      desc: 'Habilita los permisos de Android para supervisar las aplicaciones protegidas.',
      badgeClass: 'rose',
      badgeText: 'Atención requerida',
      icon: ShieldAlert,
      color: 'var(--tl-danger)'
    };
  } else if (!phrase) {
    securityStatus = {
      title: 'Configuración incompleta',
      desc: 'Define tu frase llave para iniciar la protección biométrica.',
      badgeClass: 'gray',
      badgeText: 'Sin frase',
      icon: AlertTriangle,
      color: 'var(--tl-text-muted)'
    };
  }

  const StatusIcon = securityStatus.icon;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      {/* 1. Tarjeta Principal: Estado de Seguridad */}
      <div className="tl-card" style={{
        background: 'linear-gradient(135deg, var(--tl-bg-surface) 0%, var(--tl-accent-light) 100%)',
        border: '1px solid var(--tl-border)',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
          <span style={{
            fontSize: '0.68rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            padding: '4px 9px',
            borderRadius: '20px',
            background: securityStatus.badgeClass === 'emerald' ? 'var(--tl-success-light)' : securityStatus.badgeClass === 'amber' ? 'var(--tl-warning-light)' : 'var(--tl-danger-light)',
            color: securityStatus.color,
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <StatusIcon size={13} />
            <span>{securityStatus.badgeText}</span>
          </span>
          <span style={{ fontSize: '0.7rem', color: 'var(--tl-text-muted)' }}>
            TECLEOLLAVE-ADAPT
          </span>
        </div>

        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: '0 0 0.3rem 0', color: 'var(--tl-text-primary)' }}>
          {securityStatus.title}
        </h2>
        <p style={{ fontSize: '0.78rem', color: 'var(--tl-text-secondary)', margin: '0 0 1rem 0', lineHeight: '1.45' }}>
          {securityStatus.desc}
        </p>

        {/* Acceso rápido a verificación o permisos */}
        {hasPendingPermissions ? (
          <button
            type="button"
            onClick={() => onNavigateTab('settings')}
            className="tl-btn-primary"
            style={{ background: 'var(--tl-danger)', boxShadow: 'none' }}
          >
            <span>Resolver Permisos Pendientes</span>
            <ArrowRight size={15} />
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onOpenAppLocker('Prueba de Seguridad')}
            className="tl-btn-primary"
          >
            <Lock size={15} />
            <span>Probar mi Reconocimiento Biométrico</span>
          </button>
        )}
      </div>

      {/* 2. Tarjeta: Mi Frase Llave */}
      <div className="tl-card">
        <div className="tl-card-header">
          <h3 className="tl-card-title">
            <KeyRound size={17} color="var(--tl-accent)" />
            <span>Mi frase llave</span>
          </h3>
          <span style={{ fontSize: '0.72rem', color: isEnrolled ? 'var(--tl-success)' : 'var(--tl-warning)', fontWeight: 600 }}>
            {isEnrolled ? 'Calibrada ✓' : 'Pendiente'}
          </span>
        </div>

        <p style={{ fontSize: '0.75rem', color: 'var(--tl-text-secondary)', margin: '0 0 0.75rem 0', lineHeight: '1.4' }}>
          Tu frase es secreta. Tu forma de escribir es tu identidad.
        </p>

        {/* Frase Oculta / Revelada */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.65rem 0.85rem',
          borderRadius: '12px',
          background: 'var(--tl-bg-surface-elevated)',
          border: '1px solid var(--tl-border)',
          marginBottom: '0.75rem'
        }}>
          <div>
            <div style={{ fontSize: '0.65rem', color: 'var(--tl-text-muted)', marginBottom: '2px' }}>
              Frase configurada
            </div>
            <div style={{
              fontSize: '0.92rem',
              fontWeight: 700,
              fontFamily: 'monospace',
              color: 'var(--tl-text-primary)',
              letterSpacing: showPhrase ? 'normal' : '0.15em'
            }}>
              {showPhrase ? phrase : '••••••••••••••••••••'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPhrase(!showPhrase)}
            className="tl-icon-btn"
            title={showPhrase ? 'Ocultar frase' : 'Ver mi frase'}
          >
            {showPhrase ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {/* Muestras y Botón de Entrenamiento */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem', color: 'var(--tl-text-secondary)', marginBottom: '0.75rem' }}>
          <span>Muestras capturadas: <strong>{enrolledRepsCount} de 30</strong></span>
          <span style={{ color: 'var(--tl-accent)', fontWeight: 600 }}>
            {Math.round((enrolledRepsCount / 30) * 100)}%
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => onNavigateTab('mykey')}
            className="tl-btn-outline"
          >
            <span>Detalles de Llave</span>
          </button>
          <button
            type="button"
            onClick={() => onStartTraining(phrase, 'Frase Llave Principal')}
            className="tl-btn-primary"
            style={{ padding: '0.65rem' }}
          >
            <Sparkles size={15} />
            <span>{isEnrolled ? 'Reentrenar' : 'Entrenar Perfil'}</span>
          </button>
        </div>
      </div>

      {/* 3. Tarjeta: Aplicaciones Protegidas con Iconos Reales */}
      <div className="tl-card">
        <div className="tl-card-header">
          <h3 className="tl-card-title">
            <Smartphone size={17} color="var(--tl-accent)" />
            <span>{protectedApps.length} aplicaciones protegidas</span>
          </h3>
          <span style={{ fontSize: '0.7rem', color: 'var(--tl-text-muted)' }}>
            Supervisión activa
          </span>
        </div>

        {protectedApps.length === 0 ? (
          <p style={{ fontSize: '0.75rem', color: 'var(--tl-text-secondary)', margin: '0 0 0.85rem 0' }}>
            Aún no has seleccionado aplicaciones para proteger con tu ritmo de tecleo.
          </p>
        ) : (
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', overflowX: 'auto', padding: '0.4rem 0 0.85rem 0' }}>
            {protectedApps.slice(0, 6).map((app) => (
              <div
                key={app.packageName}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '4px',
                  minWidth: '52px'
                }}
              >
                {app.icon ? (
                  <img
                    src={app.icon}
                    alt={app.name}
                    style={{ width: '38px', height: '38px', borderRadius: '10px', objectFit: 'contain' }}
                  />
                ) : (
                  <div style={{
                    width: '38px',
                    height: '38px',
                    borderRadius: '10px',
                    background: 'var(--tl-bg-surface-elevated)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '1.2rem'
                  }}>
                    📱
                  </div>
                )}
                <span style={{
                  fontSize: '0.64rem',
                  color: 'var(--tl-text-secondary)',
                  maxWidth: '52px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  textAlign: 'center'
                }}>
                  {app.name}
                </span>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          onClick={() => onNavigateTab('apps')}
          className="tl-btn-outline"
        >
          <span>Administrar Aplicaciones</span>
          <ArrowRight size={15} />
        </button>
      </div>
    </div>
  );
}
