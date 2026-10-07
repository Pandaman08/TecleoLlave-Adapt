import React, { useState } from 'react';
import {
  KeyRound, Eye, EyeOff, Sparkles, RefreshCw, Edit3,
  ShieldCheck, Activity, Info, CheckCircle2, ArrowRight, Lock
} from 'lucide-react';

export default function MyKeyTab({
  phrase,
  isEnrolled,
  enrolledRepsCount,
  onStartTraining,
  onChangePhrase,
  onTestRecognition
}) {
  const [showPhrase, setShowPhrase] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {/* 1. Tarjeta Principal: Tu Frase Llave */}
      <div className="tl-card" style={{
        background: 'linear-gradient(135deg, var(--tl-bg-surface) 0%, var(--tl-accent-light) 100%)',
        position: 'relative'
      }}>
        <div className="tl-card-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: 'var(--tl-accent-light)',
              color: 'var(--tl-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <KeyRound size={18} />
            </div>
            <div>
              <h3 className="tl-card-title" style={{ margin: 0, fontSize: '0.95rem' }}>
                Frase Llave Segura
              </h3>
              <span style={{ fontSize: '0.68rem', color: 'var(--tl-text-muted)' }}>
                Identidad biométrica conductual
              </span>
            </div>
          </div>
          <span style={{
            fontSize: '0.7rem',
            fontWeight: 700,
            padding: '3px 8px',
            borderRadius: '12px',
            background: isEnrolled ? 'var(--tl-success-light)' : 'var(--tl-warning-light)',
            color: isEnrolled ? 'var(--tl-success)' : 'var(--tl-warning)'
          }}>
            {isEnrolled ? 'Calibrada ✓' : `${enrolledRepsCount || 0}/30 Muestras`}
          </span>
        </div>

        {/* Visualización de Frase */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.85rem 1rem',
          borderRadius: '14px',
          background: 'var(--tl-bg-surface-elevated)',
          border: '1px solid var(--tl-border)',
          margin: '0.75rem 0'
        }}>
          <div>
            <span style={{ fontSize: '0.65rem', color: 'var(--tl-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Frase configurada
            </span>
            <div style={{
              fontFamily: 'monospace',
              fontSize: '1.05rem',
              fontWeight: 700,
              color: 'var(--tl-text-primary)',
              marginTop: '2px',
              letterSpacing: showPhrase ? '0.04em' : '0.18em'
            }}>
              {showPhrase ? (phrase || 'seguridad unt 2026') : '•••••••••••••••••'}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowPhrase(!showPhrase)}
            className="tl-icon-btn"
            title={showPhrase ? 'Ocultar frase' : 'Mostrar frase'}
          >
            {showPhrase ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>

        {/* Estado del Modelo Biométrico */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '0.6rem',
          marginTop: '0.5rem',
          marginBottom: '1rem'
        }}>
          <div style={{
            background: 'var(--tl-bg-input)',
            padding: '0.65rem',
            borderRadius: '10px',
            border: '1px solid var(--tl-border)'
          }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--tl-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Activity size={12} color="var(--tl-accent)" />
              <span>Consistencia</span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--tl-text-primary)', marginTop: '2px' }}>
              {isEnrolled ? '92.4%' : 'Pendiente'}
            </div>
          </div>
          <div style={{
            background: 'var(--tl-bg-input)',
            padding: '0.65rem',
            borderRadius: '10px',
            border: '1px solid var(--tl-border)'
          }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--tl-text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <ShieldCheck size={12} color="var(--tl-success)" />
              <span>Firma de Seguridad</span>
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--tl-text-primary)', marginTop: '2px' }}>
              {isEnrolled ? 'Calibrada' : 'Sin calibrar'}
            </div>
          </div>
        </div>

        {/* Acciones principales */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button
            type="button"
            onClick={() => onStartTraining(phrase)}
            className="tl-btn-primary"
          >
            <RefreshCw size={15} />
            <span>{isEnrolled ? 'Recalibrar mi Ritmo de Tecleo (30 reps)' : 'Calibrar mi Ritmo (30 reps)'}</span>
          </button>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={onChangePhrase}
              className="tl-btn-outline"
            >
              <Edit3 size={14} />
              <span>Cambiar Frase</span>
            </button>
            <button
              type="button"
              onClick={onTestRecognition}
              className="tl-btn-outline"
            >
              <Lock size={14} />
              <span>Probar Llave</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Tarjeta Pedagógica: ¿Cómo te protege tu ritmo? */}
      <div className="tl-card">
        <div className="tl-card-header">
          <h4 className="tl-card-title" style={{ fontSize: '0.88rem' }}>
            <Info size={16} color="var(--tl-accent)" />
            <span>¿Por qué tu ritmo es único?</span>
          </h4>
        </div>
        <p style={{ fontSize: '0.76rem', color: 'var(--tl-text-secondary)', lineHeight: '1.45', margin: '0 0 0.85rem 0' }}>
          A diferencia de una contraseña tradicional que puede ser observada o copiada, la biometría conductual evalúa la forma única en la que interactúas con el teclado:
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.6rem',
            padding: '0.6rem',
            background: 'var(--tl-bg-surface-elevated)',
            borderRadius: '10px'
          }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'var(--tl-accent-light)',
              color: 'var(--tl-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              flexShrink: 0
            }}>
              1
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                Ritmo y presión al presionar teclas
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--tl-text-muted)', lineHeight: '1.3' }}>
                La duración exacta en milisegundos que cada dedo permanece sobre cada caracter.
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.6rem',
            padding: '0.6rem',
            background: 'var(--tl-bg-surface-elevated)',
            borderRadius: '10px'
          }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'var(--tl-accent-light)',
              color: 'var(--tl-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 700,
              flexShrink: 0
            }}>
              2
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--tl-text-primary)' }}>
                Velocidad de transición entre caracteres
              </div>
              <div style={{ fontSize: '0.7rem', color: 'var(--tl-text-muted)', lineHeight: '1.3' }}>
                El intervalo de tiempo que te toma soltar una tecla y tocar la siguiente en la pantalla.
              </div>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '0.6rem',
            padding: '0.6rem',
            background: 'var(--tl-success-light)',
            borderRadius: '10px',
            border: '1px solid rgba(16, 185, 129, 0.2)'
          }}>
            <CheckCircle2 size={18} color="var(--tl-success)" style={{ flexShrink: 0, marginTop: '2px' }} />
            <div style={{ fontSize: '0.72rem', color: 'var(--tl-text-secondary)', lineHeight: '1.35' }}>
              <strong style={{ color: 'var(--tl-text-primary)' }}>Resistencia contra intrusos:</strong> Si un tercero conoce tu frase y la escribe, sus tiempos de vuelo y pulsación diferirán significativamente, siendo bloqueado de inmediato.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
