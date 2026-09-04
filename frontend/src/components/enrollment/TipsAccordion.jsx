import { useState } from 'react';
import { ChevronDown, ChevronUp, Lightbulb, Coffee, Keyboard, AlertCircle } from 'lucide-react';

/**
 * TipsAccordion
 * -------------
 * Panel de ayuda colapsable con instrucciones claras sobre cómo tipear
 * durante el enrolamiento. Reduce la ansiedad del usuario y mejora
 * la calidad de las muestras capturadas.
 */
export default function TipsAccordion() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      style={{
        backgroundColor: 'var(--bg-surface-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        marginBottom: '1rem',
        overflow: 'hidden'
      }}
    >
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          width: '100%',
          padding: '0.75rem 1rem',
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: 'var(--text-secondary)',
          fontSize: '0.82rem',
          fontWeight: 600,
          transition: 'background-color 0.15s ease'
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-canvas)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Lightbulb size={16} style={{ color: 'var(--brand-500)' }} />
          <span>¿Cómo tipear para un buen enrolamiento?</span>
        </span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isOpen && (
        <div
          style={{
            padding: '0 1rem 1rem 1rem',
            fontSize: '0.82rem',
            color: 'var(--text-secondary)',
            lineHeight: 1.6,
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
            animation: 'fadeIn 0.2s ease'
          }}
        >
          <Tip
            icon={<Keyboard size={14} style={{ color: 'var(--brand-500)' }} />}
            title="Usa el mismo teclado que usarás después"
            description="Si siempre trabajas en un laptop, enrola ahí. Si usas teclado mecánico externo, hazlo con ese."
          />
          <Tip
            icon={<Coffee size={14} style={{ color: 'var(--brand-500)' }} />}
            title="Tipea de forma natural, sin apurarte"
            description="No busques velocidad ni perfección. Tipea como escribirías normalmente en tu día a día."
          />
          <Tip
            icon={<AlertCircle size={14} style={{ color: 'var(--brand-500)' }} />}
            title="Si te equivocas, reinicia sin miedo"
            description="Presiona el botón 'Reiniciar' o espera el descanso entre muestras. No afecta tu progreso."
          />
          <div
            style={{
              padding: '0.6rem 0.75rem',
              backgroundColor: 'var(--info-bg)',
              border: '1px solid var(--info-border)',
              borderRadius: 'var(--radius-sm)',
              color: 'var(--info)',
              fontSize: '0.78rem'
            }}
          >
            💡 <strong>Tómate un respiro de 5 segundos entre cada muestra</strong> para que el sistema capture
            tu patrón natural y no el de la fatiga acumulada.
          </div>
        </div>
      )}
    </div>
  );
}

function Tip({ icon, title, description }) {
  return (
    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
      <div
        style={{
          flexShrink: 0,
          width: 24,
          height: 24,
          borderRadius: '50%',
          backgroundColor: 'rgba(99, 102, 241, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: 2
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.15rem' }}>
          {title}
        </div>
        <div style={{ color: 'var(--text-muted)' }}>{description}</div>
      </div>
    </div>
  );
}
