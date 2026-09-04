import { User, Keyboard, ShieldCheck, Check } from 'lucide-react';

/**
 * AuthStepper
 * -----------
 * Stepper visual de 3 pasos para el flujo de autenticación:
 * 1. Credenciales
 * 2. Captura biométrica
 * 3. Resultado
 *
 * Conecta visualmente el formulario (columna izq) con el terminal (columna der)
 * para que el usuario entienda el orden de operaciones.
 */
export default function AuthStepper({ step = 1, hasSample = false, hasDecision = false }) {
  const steps = [
    { num: 1, label: 'Credenciales', icon: User, isDone: step > 1, isActive: step === 1 },
    { num: 2, label: 'Captura Biométrica', icon: Keyboard, isDone: hasDecision, isActive: step === 2 },
    { num: 3, label: 'Resultado', icon: ShieldCheck, isDone: false, isActive: step === 3 }
  ];

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '1.5rem',
        padding: '0.75rem 1rem',
        backgroundColor: 'var(--bg-surface-elevated)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-subtle)',
        gap: '0.5rem'
      }}
    >
      {steps.map((s, idx) => {
        const Icon = s.icon;
        return (
          <div
            key={s.num}
            style={{
              display: 'flex',
              alignItems: 'center',
              flex: idx < steps.length - 1 ? '1 1 0' : '0 0 auto',
              minWidth: 0
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  backgroundColor: s.isDone
                    ? 'var(--success)'
                    : s.isActive
                    ? 'var(--brand-600)'
                    : 'var(--bg-surface)',
                  color: s.isDone || s.isActive ? '#fff' : 'var(--text-muted)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: s.isActive ? '2px solid var(--brand-500)' : 'none',
                  transition: 'all 0.25s ease',
                  flexShrink: 0
                }}
              >
                {s.isDone ? <Check size={14} /> : <Icon size={14} />}
              </div>
              <span
                style={{
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  color: s.isActive
                    ? 'var(--brand-500)'
                    : s.isDone
                    ? 'var(--success)'
                    : 'var(--text-muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}
              >
                {s.label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div
                style={{
                  height: 2,
                  flex: 1,
                  margin: '0 0.75rem',
                  backgroundColor: s.isDone ? 'var(--success)' : 'var(--border-subtle)',
                  transition: 'background-color 0.3s ease',
                  borderRadius: 1
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
