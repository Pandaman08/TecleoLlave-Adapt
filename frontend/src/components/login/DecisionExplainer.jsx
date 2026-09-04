import { useState } from 'react';
import { HelpCircle, X, ShieldCheck, AlertTriangle, ShieldAlert } from 'lucide-react';

/**
 * DecisionExplainer
 * -----------------
 * Componente informativo que muestra al usuario qué significan
 * las 3 zonas de decisión (ACCEPT, CHALLENGE, REJECT) y los umbrales.
 * Reduce la ansiedad del usuario explicándole la tecnología.
 */
export default function DecisionExplainer() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'var(--text-muted)',
          fontSize: '0.75rem',
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.3rem',
          padding: '0.25rem 0.5rem',
          borderRadius: 'var(--radius-sm)',
          transition: 'background-color 0.15s ease'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-surface-elevated)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <HelpCircle size={13} />
        <span>¿Cómo funciona?</span>
      </button>

      {isOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIsOpen(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(9, 13, 22, 0.8)',
            backdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9998,
            padding: '1rem',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              maxWidth: '520px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: 'var(--shadow-lg)',
              animation: 'success-pop 0.3s ease',
              position: 'relative',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="Cerrar"
              style={{
                position: 'absolute',
                top: 12,
                right: 12,
                width: 32,
                height: 32,
                borderRadius: '50%',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-muted)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={18} />
            </button>

            <h3
              style={{
                fontSize: '1.1rem',
                fontWeight: 700,
                margin: '0 0 0.25rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem'
              }}
            >
              <HelpCircle size={18} style={{ color: 'var(--brand-500)' }} />
              ¿Cómo evalúa tu identidad el sistema?
            </h3>
            <p
              style={{
                fontSize: '0.82rem',
                color: 'var(--text-muted)',
                margin: '0 0 1.25rem',
                lineHeight: 1.5
              }}
            >
              Al tipear la frase, medimos <strong>100+ características temporales</strong> (hold time, flight time,
              dígrafos) y las comparamos con tu perfil M₀ + adaptativo Mₜ. El resultado cae en una de 3 zonas:
            </p>

            <ZoneCard
              icon={ShieldCheck}
              color="var(--success)"
              bg="var(--success-bg)"
              border="var(--success-border)"
              zone="ACCEPT"
              threshold="≥ 75%"
              title="Acceso transparente"
              description="Tu ritmo coincide con el perfil registrado. Acceso directo sin fricción."
            />

            <ZoneCard
              icon={AlertTriangle}
              color="var(--warning)"
              bg="var(--warning-bg)"
              border="var(--warning-border)"
              zone="CHALLENGE"
              threshold="45% - 75%"
              title="Verificación adicional"
              description="Hay variación (cansancio, nuevo teclado). Se solicita código TOTP para confirmar."
            />

            <ZoneCard
              icon={ShieldAlert}
              color="var(--danger)"
              bg="var(--danger-bg)"
              border="var(--danger-border)"
              zone="REJECT"
              threshold="< 45%"
              title="Bloqueo preventivo"
              description="El patrón rítmico difiere sustancialmente. Posible intento de suplantación."
            />

            <div
              style={{
                marginTop: '1.25rem',
                padding: '0.75rem',
                backgroundColor: 'var(--bg-surface-elevated)',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.75rem',
                color: 'var(--text-secondary)',
                lineHeight: 1.5
              }}
            >
              💡 <strong>Tip:</strong> tipea con tu teclado habitual y de forma natural. El sistema aprende
              contigo con cada autenticación exitosa, así que entre más uses el sistema, menos fricción tendrás.
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function ZoneCard({ icon: Icon, color, bg, border, zone, threshold, title, description }) {
  return (
    <div
      style={{
        padding: '0.85rem 1rem',
        backgroundColor: bg,
        border: `1px solid ${border}`,
        borderRadius: 'var(--radius-md)',
        marginBottom: '0.75rem',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '0.75rem'
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          backgroundColor: color,
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <Icon size={18} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.2rem' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color }}>{zone}</span>
          <code
            style={{
              fontSize: '0.7rem',
              padding: '0.1rem 0.4rem',
              backgroundColor: 'var(--bg-canvas)',
              borderRadius: 4,
              color,
              fontFamily: "'JetBrains Mono', monospace"
            }}
          >
            {threshold}
          </code>
        </div>
        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
          {title}
        </div>
        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 1.45 }}>
          {description}
        </div>
      </div>
    </div>
  );
}
