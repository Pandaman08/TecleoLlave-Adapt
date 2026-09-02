import React from 'react';
import { Terminal, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, Lock, Cpu, Sparkles } from 'lucide-react';
import TypingCapture from './TypingCapture';
import { useTheme } from '../context/ThemeContext';

export default function LoginTerminal({
  typingSample,
  setTypingSample,
  decisionResult, // { decision: 'ACCEPT' | 'CHALLENGE' | 'REJECT', score: 0.88, avgHoldTime?: number }
  isEvaluating = false
}) {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const score = decisionResult ? Number(decisionResult.score || 0) : null;
  const decision = decisionResult?.decision; // 'ACCEPT' | 'CHALLENGE' | 'REJECT'
  const scorePercent = score !== null ? (score * 100).toFixed(1) : null;

  return (
    <div style={{
      backgroundColor: 'var(--bg-surface)',
      color: 'var(--text-primary)',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-xl)',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-md)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      transition: 'background-color 0.2s ease, border-color 0.2s ease'
    }}>
      {/* Terminal Title Bar */}
      <div style={{
        backgroundColor: 'var(--bg-surface-elevated)',
        borderBottom: '1px solid var(--border-subtle)',
        padding: '0.75rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between'
      }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#ef4444' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#f59e0b' }} />
          <span style={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: '#10b981' }} />
        </div>

        <div style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.75rem',
          color: 'var(--text-muted)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          fontWeight: 600
        }}>
          <Terminal size={14} style={{ color: 'var(--brand-500)' }} />
          <span>tecleo-auth-engine v2.4 (Hot-Swap Calibrated)</span>
        </div>

        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
          ML: RandomForest
        </div>
      </div>

      <div style={{
        padding: '1.75rem',
        fontFamily: "'JetBrains Mono', 'Consolas', monospace",
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between'
      }}>
        <div>
          {/* CLI Prompt simulation */}
          <div style={{
            color: 'var(--text-secondary)',
            fontSize: '0.82rem',
            marginBottom: '1rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ color: 'var(--brand-500)', fontWeight: 700 }}>$</span>
            <span>tecleo-auth --mode=live-verify --phrase="target"</span>
          </div>

          {/* 3-Zone Decision Engine Visual Meter */}
          <div style={{
            backgroundColor: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)',
            padding: '1rem',
            marginBottom: '1rem'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '0.75rem'
            }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Cpu size={14} style={{ color: 'var(--brand-500)' }} /> Motor de Decisión Tri-Zona (θ_low=45%, θ_high=75%)
              </span>
              {decision && (
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  padding: '0.2rem 0.55rem',
                  borderRadius: '4px',
                  backgroundColor: decision === 'ACCEPT' ? 'var(--success-bg)' : decision === 'CHALLENGE' ? 'var(--warning-bg)' : 'var(--danger-bg)',
                  color: decision === 'ACCEPT' ? 'var(--success)' : decision === 'CHALLENGE' ? 'var(--warning)' : 'var(--danger)',
                  border: `1px solid ${decision === 'ACCEPT' ? 'var(--success-border)' : decision === 'CHALLENGE' ? 'var(--warning-border)' : 'var(--danger-border)'}`
                }}>
                  {decision === 'ACCEPT' && <CheckCircle2 size={12} />}
                  {decision === 'CHALLENGE' && <AlertTriangle size={12} />}
                  {decision === 'REJECT' && <ShieldAlert size={12} />}
                  {decision} ({scorePercent}%)
                </span>
              )}
            </div>

            {/* Tri-zone bar */}
            <div style={{
              height: 12,
              backgroundColor: 'var(--bg-canvas)',
              borderRadius: 9999,
              position: 'relative',
              overflow: 'hidden',
              display: 'flex',
              marginBottom: '0.65rem',
              border: '1px solid var(--border-subtle)'
            }}>
              <div style={{ width: '45%', backgroundColor: isDark ? 'rgba(239, 68, 68, 0.5)' : 'rgba(239, 68, 68, 0.7)' }} title="Zona REJECT (<45%)" />
              <div style={{ width: '30%', backgroundColor: isDark ? 'rgba(245, 158, 11, 0.5)' : 'rgba(245, 158, 11, 0.7)' }} title="Zona CHALLENGE (45% - 75%)" />
              <div style={{ width: '25%', backgroundColor: isDark ? 'rgba(16, 185, 129, 0.5)' : 'rgba(16, 185, 129, 0.7)' }} title="Zona ACCEPT (≥75%)" />
              
              {score !== null && (
                <div
                  style={{
                    position: 'absolute',
                    top: -2,
                    bottom: -2,
                    width: 4,
                    backgroundColor: isDark ? '#ffffff' : '#0f172a',
                    borderRadius: 2,
                    boxShadow: isDark ? '0 0 8px #ffffff' : '0 0 6px rgba(0,0,0,0.5)',
                    left: `${Math.max(0, Math.min(100, score * 100))}%`,
                    transition: 'left 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                  }}
                  title={`Score actual: ${scorePercent}%`}
                />
              )}
            </div>

            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: '0.7rem',
              color: 'var(--text-muted)',
              fontWeight: 600
            }}>
              <span style={{ color: 'var(--danger)' }}>0% REJECT</span>
              <span style={{ color: 'var(--warning)' }}>45% CHALLENGE</span>
              <span style={{ color: 'var(--success)' }}>75% ACCEPT</span>
            </div>
          </div>

          {/* Typing capture widget inside terminal */}
          <div style={{ marginTop: '0.75rem' }}>
            <TypingCapture
              onSampleCaptured={(sample) => {
                setTypingSample(sample);
              }}
              mode="auth"
            />
          </div>
        </div>

        {/* Real-time Decision Feedback Panel */}
        {isEvaluating && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem 1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: 'var(--brand-500)',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--brand-500)' }} />
            Evaluando 100+ características temporales contra perfil activo...
          </div>
        )}

        {decision && !isEvaluating && (
          <div style={{
            marginTop: '1rem',
            padding: '1rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: decision === 'ACCEPT' ? 'var(--success-bg)' : decision === 'CHALLENGE' ? 'var(--warning-bg)' : 'var(--danger-bg)',
            border: `1px solid ${decision === 'ACCEPT' ? 'var(--success-border)' : decision === 'CHALLENGE' ? 'var(--warning-border)' : 'var(--danger-border)'}`,
            color: decision === 'ACCEPT' ? 'var(--success)' : decision === 'CHALLENGE' ? 'var(--warning)' : 'var(--danger)'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              {decision === 'ACCEPT' && <ShieldCheck size={20} style={{ flexShrink: 0 }} />}
              {decision === 'CHALLENGE' && <AlertTriangle size={20} style={{ flexShrink: 0 }} />}
              {decision === 'REJECT' && <ShieldAlert size={20} style={{ flexShrink: 0 }} />}
              
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                  {decision === 'ACCEPT' && 'ZONA ACCEPT: Acceso Biométrico Concedido'}
                  {decision === 'CHALLENGE' && 'ZONA CHALLENGE: Desafío 2FA/TOTP Activado'}
                  {decision === 'REJECT' && 'ZONA REJECT: Acceso Bloqueado por Desviación Rítmica'}
                </div>
                <div style={{ fontSize: '0.78rem', opacity: 0.9, lineHeight: 1.4, color: 'var(--text-secondary)' }}>
                  {decision === 'ACCEPT' && `Ritmo consistente con el modelo activo ($M_t$) con una confianza del ${scorePercent}%.`}
                  {decision === 'CHALLENGE' && `Score en zona intermedia (${scorePercent}%). Se requiere código TOTP de 6 dígitos.`}
                  {decision === 'REJECT' && `El vector rítmico difiere sustancialmente del usuario legítimo (${scorePercent}%).`}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
