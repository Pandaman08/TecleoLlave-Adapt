import React from 'react';
import {
  Shield, Moon, Sun,
  LogOut, ExternalLink, CheckCircle2
} from 'lucide-react';

export default function SettingsTab({
  participant,
  theme,
  onToggleTheme,
  permissionsStatus = { usageStats: true, overlay: true, deviceSecure: true },
  onOpenUsageSettings,
  onOpenOverlaySettings,
  onOpenSecuritySettings,
  onLogout
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* 1. Tarjeta de Perfil del Participante */}
      <div className="tl-card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: '50%',
            background: 'var(--tl-accent-light)',
            color: 'var(--tl-accent)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '1.1rem'
          }}>
            {(participant?.full_name || participant?.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--tl-text-primary)' }}>
              {participant?.full_name || 'Usuario del Dispositivo'}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--tl-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {participant?.email}
            </div>
            <div style={{ fontSize: '0.66rem', color: 'var(--tl-accent)', marginTop: '2px' }}>
              {participant?.dominant_hand ? `Mano: ${participant.dominant_hand}` : ''} • {participant?.age_range || '18-25 años'}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Auditoría de Permisos de Android */}
      <div className="tl-card">
        <div className="tl-card-header">
          <h4 className="tl-card-title" style={{ fontSize: '0.88rem' }}>
            <Shield size={16} color="var(--tl-accent)" />
            <span>Permisos del Sistema Android</span>
          </h4>
        </div>
        <p style={{ fontSize: '0.72rem', color: 'var(--tl-text-secondary)', margin: '0 0 0.75rem 0', lineHeight: '1.4' }}>
          Estado de los permisos requeridos por el sistema operativo para la biometría y bloqueo en segundo plano:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {/* Permiso 1: Acceso de Uso */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.65rem 0.75rem',
            borderRadius: '10px',
            background: 'var(--tl-bg-surface-elevated)',
            border: '1px solid var(--tl-border)'
          }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                Acceso de Uso
              </div>
              <div style={{ fontSize: '0.67rem', color: 'var(--tl-text-muted)' }}>
                Detecta la app en primer plano
              </div>
            </div>
            {permissionsStatus.usageStats ? (
              <span style={{ fontSize: '0.7rem', color: 'var(--tl-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={14} /> Concedido
              </span>
            ) : (
              <button
                type="button"
                onClick={onOpenUsageSettings}
                className="tl-btn-outline"
                style={{ padding: '3px 8px', fontSize: '0.68rem', borderColor: 'var(--tl-danger)', color: 'var(--tl-danger)' }}
              >
                <span>Habilitar</span>
                <ExternalLink size={10} />
              </button>
            )}
          </div>

          {/* Permiso 2: Superposición */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.65rem 0.75rem',
            borderRadius: '10px',
            background: 'var(--tl-bg-surface-elevated)',
            border: '1px solid var(--tl-border)'
          }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                Mostrar sobre otras apps
              </div>
              <div style={{ fontSize: '0.67rem', color: 'var(--tl-text-muted)' }}>
                Presenta el reto de desbloqueo
              </div>
            </div>
            {permissionsStatus.overlay ? (
              <span style={{ fontSize: '0.7rem', color: 'var(--tl-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={14} /> Concedido
              </span>
            ) : (
              <button
                type="button"
                onClick={onOpenOverlaySettings}
                className="tl-btn-outline"
                style={{ padding: '3px 8px', fontSize: '0.68rem', borderColor: 'var(--tl-danger)', color: 'var(--tl-danger)' }}
              >
                <span>Habilitar</span>
                <ExternalLink size={10} />
              </button>
            )}
          </div>

          {/* Permiso 3: Bloqueo Seguro de Android (Keyguard) */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.65rem 0.75rem',
            borderRadius: '10px',
            background: 'var(--tl-bg-surface-elevated)',
            border: '1px solid var(--tl-border)'
          }}>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                Bloqueo del Teléfono (Android)
              </div>
              <div style={{ fontSize: '0.67rem', color: 'var(--tl-text-muted)' }}>
                PIN, Huella o Patrón del sistema
              </div>
            </div>
            {permissionsStatus.deviceSecure ? (
              <span style={{ fontSize: '0.7rem', color: 'var(--tl-success)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle2 size={14} /> Seguro
              </span>
            ) : (
              <button
                type="button"
                onClick={onOpenSecuritySettings}
                className="tl-btn-outline"
                style={{ padding: '3px 8px', fontSize: '0.68rem', borderColor: 'var(--tl-warning)', color: 'var(--tl-warning)' }}
              >
                <span>Configurar</span>
                <ExternalLink size={10} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. Ajustes de la Aplicación */}
      <div className="tl-card">
        <div className="tl-card-header">
          <h4 className="tl-card-title" style={{ fontSize: '0.88rem' }}>
            Ajustes de la Aplicación
          </h4>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          {/* Apariencia / Tema */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0.65rem 0.75rem',
            borderRadius: '10px',
            background: 'var(--tl-bg-surface-elevated)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {theme === 'dark' ? <Moon size={16} color="var(--tl-accent)" /> : <Sun size={16} color="var(--tl-warning)" />}
              <div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>Tema Visual</div>
                <div style={{ fontSize: '0.67rem', color: 'var(--tl-text-muted)' }}>
                  {theme === 'dark' ? 'Modo Oscuro' : 'Modo Claro'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onToggleTheme}
              className="tl-btn-outline"
              style={{ padding: '4px 10px', fontSize: '0.72rem' }}
            >
              Cambiar
            </button>
          </div>
        </div>
      </div>

      {/* 4. Botón de Cerrar Sesión */}
      <button
        type="button"
        onClick={onLogout}
        className="tl-btn-outline"
        style={{ borderColor: 'var(--tl-danger)', color: 'var(--tl-danger)', padding: '0.75rem' }}
      >
        <LogOut size={15} />
        <span>Cerrar Sesión</span>
      </button>
    </div>
  );
}
