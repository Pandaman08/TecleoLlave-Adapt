import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ArrowRight, BarChart3, Sparkles, Clock, Hash, Activity, Zap, Cpu } from 'lucide-react';

/**
 * EnhancedSuccessStep
 * -------------------
 * Versión mejorada del paso 3 (modelo M₀ entrenado).
 * Muestra información útil del modelo recién entrenado y ofrece
 * dos CTAs: ir al Login o explorar el Dashboard.
 */
export default function EnhancedSuccessStep({ username, modelInfo }) {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (countdown <= 0) {
      navigate('/login');
      return;
    }
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, navigate]);

  return (
    <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
      {/* Success Icon con animación */}
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: '50%',
          backgroundColor: 'var(--success-bg)',
          color: 'var(--success)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          margin: '0 auto 1.25rem',
          position: 'relative',
          animation: 'success-pop 0.5s ease'
        }}
      >
        <ShieldCheck size={32} />
        <div
          style={{
            position: 'absolute',
            inset: -4,
            borderRadius: '50%',
            border: '2px solid var(--success)',
            opacity: 0.3,
            animation: 'ping 1.5s ease-out infinite'
          }}
        />
      </div>

      <h2 style={{ fontSize: '1.4rem', fontWeight: 700, margin: '0 0 0.4rem' }}>
        ¡Tu perfil biométrico está activo!
      </h2>
      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '0 0 1.5rem', lineHeight: 1.5 }}>
        El modelo <strong>v1 (M₀)</strong> para <strong>{username}</strong> fue entrenado exitosamente.
        <br />
        Ya puedes autenticarte con tu ritmo de tecleo único.
      </p>

      {/* Resumen del modelo entrenado */}
      <div
        style={{
          backgroundColor: 'var(--bg-surface-elevated)',
          border: '1px solid var(--border-subtle)',
          borderRadius: 'var(--radius-md)',
          padding: '1rem',
          textAlign: 'left',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
          gap: '0.75rem',
          marginBottom: '1.5rem'
        }}
      >
        <InfoRow icon={Hash} label="Versión" value="v1" />
        <InfoRow icon={Cpu} label="Algoritmo" value="RF+IF" />
        <InfoRow icon={Activity} label="Umbral" value="75%" />
        <InfoRow icon={Zap} label="Motor" value="Activo" highlight />
      </div>

      {/* CTAs principales */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '1rem' }}>
        <button
          type="button"
          className="btn-primary"
          onClick={() => navigate('/login')}
          style={{ height: 46, fontSize: '0.92rem' }}
        >
          <ShieldCheck size={18} />
          <span>Ir a Iniciar Sesión</span>
          <ArrowRight size={16} />
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => navigate('/')}
          style={{ height: 42, fontSize: '0.85rem' }}
        >
          <BarChart3 size={16} />
          <span>Explorar Dashboard</span>
        </button>
      </div>

      {/* Auto-redirect countdown */}
      <div
        style={{
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '0.4rem'
        }}
      >
        <Clock size={12} />
        <span>
          Redirigiendo automáticamente a login en{' '}
          <strong style={{ color: 'var(--brand-500)' }}>{countdown}s</strong>
        </span>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, highlight }) {
  return (
    <div>
      <div
        style={{
          fontSize: '0.7rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          marginBottom: '0.2rem'
        }}
      >
        <Icon size={11} />
        <span>{label}</span>
      </div>
      <div
        style={{
          fontSize: '0.9rem',
          fontWeight: 700,
          color: highlight ? 'var(--success)' : 'var(--text-primary)',
          fontFamily: "'JetBrains Mono', monospace"
        }}
      >
        {value}
      </div>
    </div>
  );
}
