import React, { useState, useMemo } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, Smartphone, Search,
  Lock, Unlock, ExternalLink, SlidersHorizontal, CheckCircle2,
  AlertTriangle, ArrowRight, Layers, Sparkles
} from 'lucide-react';

export default function AppsTab({
  installedApps = [],
  protectedPackages = {},
  isEnrolled = false,
  permissionsStatus = { usageStats: true, overlay: true },
  onToggleAppProtection,
  onOpenAppChallenge,
  onOpenUsageSettings,
  onOpenOverlaySettings,
  onRequireEnrollment
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL'); // 'ALL', 'PROTECTED', 'FINANCE', 'MESSAGING'

  // Filtrado de aplicaciones
  const filteredApps = useMemo(() => {
    return installedApps.filter(app => {
      const name = (app.name || '').toLowerCase();
      const pkg = (app.packageName || '').toLowerCase();
      const query = searchQuery.toLowerCase().trim();

      const matchesQuery = !query || name.includes(query) || pkg.includes(query);
      if (!matchesQuery) return false;

      const isProtected = Boolean(protectedPackages[app.packageName]);

      if (filterCategory === 'PROTECTED') {
        return isProtected;
      }
      if (filterCategory === 'FINANCE') {
        return (app.category || '').toLowerCase().includes('finan') ||
          name.includes('banco') || name.includes('bcp') || name.includes('yape') || name.includes('interbank') || name.includes('bbva');
      }
      if (filterCategory === 'MESSAGING') {
        return (app.category || '').toLowerCase().includes('mensaj') ||
          (app.category || '').toLowerCase().includes('social') ||
          name.includes('whatsapp') || name.includes('telegram') || name.includes('signal') || name.includes('gmail');
      }

      return true;
    });
  }, [installedApps, protectedPackages, searchQuery, filterCategory]);

  const hasPendingPermissions = !permissionsStatus.usageStats || !permissionsStatus.overlay;
  const protectedCount = Object.values(protectedPackages).filter(Boolean).length;

  const handleSwitchChange = (pkgName, appName) => {
    if (!isEnrolled) {
      onRequireEnrollment?.();
      return;
    }
    onToggleAppProtection(pkgName, appName);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
      {/* 1. Alerta de Calibración Requerida si no ha entrenado su perfil */}
      {!isEnrolled && (
        <div className="tl-card" style={{
          background: 'var(--tl-warning-light)',
          border: '1px solid rgba(245, 158, 11, 0.35)',
          padding: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.65rem' }}>
            <Sparkles size={18} color="var(--tl-warning)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '0.82rem', fontWeight: 700, color: 'var(--tl-warning)' }}>
                Calibración de Perfil Requerida
              </h4>
              <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.72rem', color: 'var(--tl-text-secondary)', lineHeight: '1.4' }}>
                La frase llave <strong>solo funcionará si completas el entrenamiento de tu perfil (30 repeticiones)</strong>. Hasta entonces, las aplicaciones no se bloquearán.
              </p>
              <button
                type="button"
                onClick={onRequireEnrollment}
                className="tl-btn-primary"
                style={{
                  padding: '0.45rem 0.85rem',
                  fontSize: '0.72rem',
                  width: 'auto',
                  background: 'var(--tl-warning)',
                  boxShadow: 'none'
                }}
              >
                <span>Calibrar mi Ritmo Ahora (30 reps)</span>
                <ArrowRight size={13} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Alerta de Permisos si están inactivos */}
      {hasPendingPermissions && (
        <div className="tl-card" style={{
          background: 'var(--tl-danger-light)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          padding: '0.85rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem' }}>
            <AlertTriangle size={18} color="var(--tl-danger)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '0.82rem', fontWeight: 700, color: 'var(--tl-danger)' }}>
                Permisos de Android Requeridos
              </h4>
              <p style={{ margin: '0 0 0.6rem 0', fontSize: '0.72rem', color: 'var(--tl-text-secondary)', lineHeight: '1.4' }}>
                Para supervisar en segundo plano y aparecer sobre otras aplicaciones con PIN o huella, TECLEOLLAVE necesita:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                {!permissionsStatus.usageStats && (
                  <button
                    type="button"
                    onClick={onOpenUsageSettings}
                    className="tl-btn-outline"
                    style={{
                      padding: '0.4rem 0.65rem',
                      fontSize: '0.7rem',
                      borderColor: 'var(--tl-danger)',
                      color: 'var(--tl-danger)',
                      background: 'rgba(239, 68, 68, 0.08)'
                    }}
                  >
                    <span>1. Acceso de Uso</span>
                    <ExternalLink size={12} />
                  </button>
                )}
                {!permissionsStatus.overlay && (
                  <button
                    type="button"
                    onClick={onOpenOverlaySettings}
                    className="tl-btn-outline"
                    style={{
                      padding: '0.4rem 0.65rem',
                      fontSize: '0.7rem',
                      borderColor: 'var(--tl-danger)',
                      color: 'var(--tl-danger)',
                      background: 'rgba(239, 68, 68, 0.08)'
                    }}
                  >
                    <span>2. Superposición de Pantalla</span>
                    <ExternalLink size={12} />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. Barra de Búsqueda y Filtros */}
      <div className="tl-card" style={{ padding: '0.75rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          background: 'var(--tl-bg-input)',
          border: '1px solid var(--tl-border)',
          borderRadius: '10px',
          padding: '0.45rem 0.75rem',
          marginBottom: '0.65rem'
        }}>
          <Search size={15} color="var(--tl-text-muted)" />
          <input
            type="text"
            placeholder="Buscar aplicación instalada..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--tl-text-primary)',
              fontSize: '0.8rem',
              width: '100%'
            }}
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              style={{ background: 'none', border: 'none', color: 'var(--tl-text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}
            >
              ✕
            </button>
          )}
        </div>

        {/* Chips de Categorías */}
        <div style={{ display: 'flex', gap: '0.4rem', overflowX: 'auto', paddingBottom: '2px' }}>
          {[
            { id: 'ALL', label: `Todas (${installedApps.length})` },
            { id: 'PROTECTED', label: `Protegidas (${protectedCount})` },
            { id: 'FINANCE', label: 'Finanzas' },
            { id: 'MESSAGING', label: 'Mensajería' }
          ].map(chip => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setFilterCategory(chip.id)}
              style={{
                padding: '4px 10px',
                borderRadius: '16px',
                fontSize: '0.7rem',
                fontWeight: 600,
                border: '1px solid',
                borderColor: filterCategory === chip.id ? 'var(--tl-accent)' : 'var(--tl-border)',
                background: filterCategory === chip.id ? 'var(--tl-accent-light)' : 'transparent',
                color: filterCategory === chip.id ? 'var(--tl-accent)' : 'var(--tl-text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s'
              }}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Lista de Aplicaciones */}
      <div className="tl-card" style={{ padding: '0.5rem 0.75rem' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.5rem 0.25rem',
          borderBottom: '1px solid var(--tl-border-subtle)',
          fontSize: '0.72rem',
          color: 'var(--tl-text-muted)',
          fontWeight: 600
        }}>
          <span>APLICACIÓN ({filteredApps.length})</span>
          <span>ESTADO / BLOQUEO</span>
        </div>

        {filteredApps.length === 0 ? (
          <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--tl-text-muted)' }}>
            <Smartphone size={32} style={{ opacity: 0.4, marginBottom: '0.5rem' }} />
            <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>No se encontraron aplicaciones</div>
            <div style={{ fontSize: '0.7rem' }}>Intenta con otro término de búsqueda o filtro</div>
          </div>
        ) : (
          filteredApps.map(app => {
            const isProtected = Boolean(protectedPackages[app.packageName]);
            const hasNativeIcon = Boolean(app.icon && app.icon.startsWith('data:image'));

            return (
              <div
                key={app.packageName}
                className="tl-app-row"
                style={{ padding: '0.65rem 0.25rem' }}
              >
                {/* Lado izquierdo: Ícono nativo, Nombre y Paquete */}
                <div
                  className="tl-app-row-left"
                  onClick={() => onOpenAppChallenge(app.name, app.icon, app.packageName)}
                  title="Toca para probar el bloqueo biométrico en esta app"
                >
                  <div className="tl-app-icon" style={{
                    overflow: 'hidden',
                    background: hasNativeIcon ? 'transparent' : 'var(--tl-bg-surface-elevated)'
                  }}>
                    {hasNativeIcon ? (
                      <img
                        src={app.icon}
                        alt={app.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 9 }}
                      />
                    ) : (
                      <span>{app.name.charAt(0).toUpperCase()}</span>
                    )}
                  </div>

                  <div className="tl-app-info" style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                      <span className="tl-app-name" style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {app.name}
                      </span>
                      {isProtected && isEnrolled && (
                        <ShieldCheck size={13} color="var(--tl-accent)" style={{ flexShrink: 0 }} />
                      )}
                    </div>
                    <span style={{
                      fontSize: '0.68rem',
                      color: isProtected && isEnrolled ? 'var(--tl-success)' : 'var(--tl-text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      fontWeight: 600
                    }}>
                      {isProtected && isEnrolled ? '● Protegida' : 'Sin proteger'}
                    </span>
                  </div>
                </div>

                {/* Lado derecho: Botón Probar + Switch Toggle */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  {isProtected && isEnrolled && (
                    <button
                      type="button"
                      onClick={() => onOpenAppChallenge(app.name, app.icon, app.packageName)}
                      className="tl-icon-btn"
                      title="Probar verificación biométrica"
                      style={{ padding: '5px', color: 'var(--tl-accent)' }}
                    >
                      <Lock size={15} />
                    </button>
                  )}

                  <label className="tl-switch" title={!isEnrolled ? 'Calibra tu perfil primero' : ''}>
                    <input
                      type="checkbox"
                      checked={isProtected && isEnrolled}
                      onChange={() => handleSwitchChange(app.packageName, app.name)}
                    />
                    <span className="tl-slider" style={{ opacity: isEnrolled ? 1 : 0.6 }} />
                  </label>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
