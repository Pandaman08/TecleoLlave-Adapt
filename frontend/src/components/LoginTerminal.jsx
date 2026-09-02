import React from 'react';
import { Terminal, ShieldCheck, ShieldAlert, AlertTriangle, CheckCircle2, Lock, Cpu } from 'lucide-react';
import TypingCapture from './TypingCapture';

export default function LoginTerminal({
  typingSample,
  setTypingSample,
  decisionResult, // { decision: 'ACCEPT' | 'CHALLENGE' | 'REJECT', score: 0.88, avgHoldTime?: number }
  isEvaluating = false
}) {
  const score = decisionResult ? Number(decisionResult.score || 0) : null;
  const decision = decisionResult?.decision; // 'ACCEPT' | 'CHALLENGE' | 'REJECT'
  const scorePercent = score !== null ? (score * 100).toFixed(1) : null;

  return (
    <div className="terminal-card">
      {/* Terminal Title Bar */}
      <div className="terminal-header">
        <div className="terminal-dots">
          <span className="terminal-dot red" />
          <span className="terminal-dot yellow" />
          <span className="terminal-dot green" />
        </div>
        <div className="terminal-title">
          <Terminal size={14} />
          <span>tecleo-auth-engine v2.4 (Hot-Swap Calibrated)</span>
        </div>
        <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
          ML: RandomForest + Isotonic
        </div>
      </div>

      <div className="terminal-body">
        {/* CLI Prompt simulation */}
        <div className="terminal-prompt-line">
          <span className="terminal-prompt-sym">$</span>
          <span>tecleo-auth --mode=live-verify --phrase="target"</span>
        </div>

        {/* 3-Zone Decision Engine Visual Meter */}
        <div className="decision-meter-container" style={{ margin: '0.75rem 0' }}>
          <div className="decision-meter-header">
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Cpu size={14} /> Motor de Decisión Tri-Zona (θ_low=0.45, θ_high=0.75)
            </span>
            {decision && (
              <span className={`decision-zone-badge ${
                decision === 'ACCEPT' ? 'zone-accept' :
                decision === 'CHALLENGE' ? 'zone-challenge' : 'zone-reject'
              }`}>
                {decision === 'ACCEPT' && <CheckCircle2 size={12} />}
                {decision === 'CHALLENGE' && <AlertTriangle size={12} />}
                {decision === 'REJECT' && <ShieldAlert size={12} />}
                {decision} ({scorePercent}%)
              </span>
            )}
          </div>

          <div className="decision-meter-bar">
            <div className="meter-zone meter-zone-reject" title="Zona REJECT (<45%)" />
            <div className="meter-zone meter-zone-challenge" title="Zona CHALLENGE (45% - 75%)" />
            <div className="meter-zone meter-zone-accept" title="Zona ACCEPT (≥75%)" />
            
            {score !== null && (
              <div
                className="meter-marker"
                style={{
                  left: `${Math.max(0, Math.min(100, score * 100))}%`
                }}
                title={`Score actual: ${scorePercent}%`}
              />
            )}
          </div>

          <div className="meter-labels">
            <span style={{ color: 'var(--danger)' }}>0% REJECT (Bloqueo)</span>
            <span style={{ color: 'var(--warning)' }}>45% CHALLENGE (2FA/TOTP)</span>
            <span style={{ color: 'var(--success)' }}>75% ACCEPT (Directo)</span>
          </div>
        </div>

        {/* Typing capture widget inside terminal */}
        <div style={{ marginTop: '1rem' }}>
          <TypingCapture
            onSampleCaptured={(sample) => {
              setTypingSample(sample);
            }}
            mode="auth"
          />
        </div>

        {/* Real-time Decision Feedback Panel */}
        {isEvaluating && (
          <div style={{
            marginTop: '1rem',
            padding: '0.75rem',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            color: '#c7d2fe',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: 'var(--brand-500)' }} />
            Evaluando vector de 100+ características temporales contra perfil activo...
          </div>
        )}

        {decision && !isEvaluating && (
          <div className={`terminal-result-panel ${decision.toLowerCase()}`}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
              {decision === 'ACCEPT' && <ShieldCheck size={20} style={{ flexShrink: 0 }} />}
              {decision === 'CHALLENGE' && <AlertTriangle size={20} style={{ flexShrink: 0 }} />}
              {decision === 'REJECT' && <ShieldAlert size={20} style={{ flexShrink: 0 }} />}
              
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', marginBottom: '0.2rem' }}>
                  {decision === 'ACCEPT' && 'ZONA ACCEPT: Acceso Biométrico Concedido'}
                  {decision === 'CHALLENGE' && 'ZONA CHALLENGE: Desafío de Autenticación 2FA Activado'}
                  {decision === 'REJECT' && 'ZONA REJECT: Acceso Bloqueado por Discrepancia Rítmica'}
                </div>
                <div style={{ fontSize: '0.78rem', opacity: 0.9, lineHeight: 1.4 }}>
                  {decision === 'ACCEPT' && `El ritmo de tecleo coincide con el perfil activo ($M_t$) con una confianza del ${scorePercent}%. No se requiere verificación secundaria.`}
                  {decision === 'CHALLENGE' && `Score de confianza intermedio (${scorePercent}%). Se dispara verificación multifactor TOTP para validar la identidad.`}
                  {decision === 'REJECT' && `El vector biométrico difiere sustancialmente del modelo entrenado (${scorePercent}%). Intento marcado como anómalo.`}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
