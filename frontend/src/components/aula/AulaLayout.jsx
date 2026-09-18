import React from 'react';
import AulaNavbar from './AulaNavbar';
import { ShieldCheck, Lock, Activity } from 'lucide-react';

export default function AulaLayout({ children }) {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: 'var(--bg-canvas)',
      color: 'var(--text-primary)'
    }}>
      <AulaNavbar />

      <main style={{
        flex: 1,
        maxWidth: '1280px',
        width: '100%',
        margin: '0 auto',
        padding: '1.5rem',
        boxSizing: 'border-box'
      }}>
        {children}
      </main>

      <footer style={{
        borderTop: '1px solid var(--border-subtle)',
        backgroundColor: 'var(--bg-surface)',
        padding: '1rem 1.5rem',
        fontSize: '0.78rem',
        color: 'var(--text-muted)'
      }}>
        <div style={{
          maxWidth: '1280px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={16} style={{ color: 'var(--success)' }} />
            <span>
              <strong>TecleoLlave-Adapt</strong> &mdash; Sistema Biométrico Adaptativo de Autenticación Continua por Dinámica de Tecleo
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span>Sesión protegida mediante Random Forest &amp; Isotonic Calibration</span>
            <span>&bull;</span>
            <span>Ambiente Académico Seguro</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
