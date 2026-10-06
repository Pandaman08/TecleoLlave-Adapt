import React from 'react';
import {
  Lock, ShieldCheck, ShieldAlert, X, ExternalLink,
  CheckCircle2, AlertTriangle, ArrowRight, Smartphone
} from 'lucide-react';

export default function DeviceLockSetupModal({
  isDeviceSecure = true,
  onOpenSecuritySettings,
  onClose
}) {
  return (
    <div className="tl-modal-overlay" style={{ zIndex: 120 }}>
      <div className="tl-modal-card" style={{ maxWidth: '360px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Lock size={17} color="var(--tl-accent)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--tl-text-primary)' }}>
              Seguridad del Dispositivo
            </span>
          </div>
          <button type="button" onClick={onClose} className="tl-icon-btn" style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ textAlign: 'center', padding: '0.5rem 0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <div style={{
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: isDeviceSecure ? 'var(--tl-success-light)' : 'var(--tl-warning-light)',
            color: isDeviceSecure ? 'var(--tl-success)' : 'var(--tl-warning)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto'
          }}>
            {isDeviceSecure ? <ShieldCheck size={28} /> : <ShieldAlert size={28} />}
          </div>

          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--tl-text-primary)' }}>
            {isDeviceSecure ? 'Dispositivo Protegido' : 'Bloqueo del Teléfono Pendiente'}
          </h3>

          <p style={{ fontSize: '0.75rem', color: 'var(--tl-text-secondary)', lineHeight: '1.45', margin: 0 }}>
            {isDeviceSecure
              ? 'Tu teléfono cuenta con PIN, patrón o biometría activa a nivel del sistema Android. TECLEOLLAVE complementa esta seguridad protegiendo tus aplicaciones críticas con tu ritmo de tecleo.'
              : 'Android requiere que tu dispositivo tenga configurado un método seguro de desbloqueo (PIN, Patrón, Huella) para garantizar la integridad del almacén de claves criptográficas.'}
          </p>

          <div style={{
            padding: '0.75rem',
            borderRadius: '12px',
            background: 'var(--tl-bg-surface-elevated)',
            border: '1px solid var(--tl-border)',
            textAlign: 'left',
            fontSize: '0.72rem',
            color: 'var(--tl-text-muted)',
            lineHeight: '1.4'
          }}>
            <strong style={{ color: 'var(--tl-text-primary)' }}>Directiva de Seguridad Android:</strong>
            <p style={{ margin: '4px 0 0 0' }}>
              Las políticas oficiales de Google prohíben que aplicaciones de terceros reemplacen la pantalla de bloqueo nativa del sistema. TECLEOLLAVE opera como capa de protección de aplicaciones (AppLocker) y autenticación conductual.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
            {!isDeviceSecure && (
              <button
                type="button"
                onClick={onOpenSecuritySettings}
                className="tl-btn-primary"
                style={{ flex: 1 }}
              >
                <span>Configurar en Android</span>
                <ExternalLink size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className={isDeviceSecure ? 'tl-btn-primary' : 'tl-btn-outline'}
              style={{ flex: 1 }}
            >
              <span>Entendido</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
