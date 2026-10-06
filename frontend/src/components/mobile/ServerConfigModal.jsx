import React, { useState } from 'react';
import {
  Server, X, CheckCircle2, AlertTriangle, RefreshCw, ArrowRight
} from 'lucide-react';

export default function ServerConfigModal({
  currentUrl,
  onSaveUrl,
  onClose
}) {
  const [urlInput, setUrlInput] = useState(currentUrl || '');
  const [status, setStatus] = useState(null); // { success: bool, message: string }
  const [loading, setLoading] = useState(false);

  const handleTestAndSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);

    let clean = urlInput.trim().replace(/\/+$/, '');
    if (!clean) clean = '/api';

    try {
      const endpoint = clean.endsWith('/api') ? `${clean}/health` : clean === '/api' ? '/api/health' : `${clean}/api/health`;
      const res = await fetch(endpoint, { method: 'GET', signal: AbortSignal.timeout(6000) });
      const data = await res.json();

      if (res.ok && data.status === 'ok') {
        setStatus({
          success: true,
          message: '¡Conexión exitosa con el backend TECLEOLLAVE!'
        });
        onSaveUrl(clean);
      } else {
        setStatus({
          success: false,
          message: 'El servidor respondió pero no tiene el formato esperado.'
        });
      }
    } catch (err) {
      // Si la URL es válida pero CORS o timeout, avisar al usuario
      setStatus({
        success: false,
        message: 'No se pudo conectar. Verifica que el túnel Cloudflare o backend esté activo.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="tl-modal-overlay" style={{ zIndex: 120 }}>
      <div className="tl-modal-card" style={{ maxWidth: '360px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Server size={17} color="var(--tl-accent)" />
            <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--tl-text-primary)' }}>
              Servidor API y Túnel
            </span>
          </div>
          <button type="button" onClick={onClose} className="tl-icon-btn" style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleTestAndSave} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <p style={{ fontSize: '0.74rem', color: 'var(--tl-text-secondary)', margin: 0, lineHeight: '1.4' }}>
            Ingresa la URL pública de Cloudflare o de tu servidor backend para conectar el APK desde tu celular:
          </p>

          <input
            type="text"
            className="tl-input"
            placeholder="https://tu-tunel.trycloudflare.com"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            style={{ fontSize: '0.78rem' }}
          />

          {status && (
            <div style={{
              padding: '0.65rem',
              borderRadius: '8px',
              fontSize: '0.72rem',
              background: status.success ? 'var(--tl-success-light)' : 'var(--tl-danger-light)',
              color: status.success ? 'var(--tl-success)' : 'var(--tl-danger)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.4rem'
            }}>
              {status.success ? <CheckCircle2 size={15} style={{ flexShrink: 0 }} /> : <AlertTriangle size={15} style={{ flexShrink: 0 }} />}
              <span>{status.message}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.3rem' }}>
            <button
              type="button"
              onClick={onClose}
              className="tl-btn-outline"
              style={{ flex: 1 }}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="tl-btn-primary"
              style={{ flex: 1.5 }}
            >
              {loading ? <RefreshCw size={14} className="tl-spin" /> : <CheckCircle2 size={14} />}
              <span>{loading ? 'Probando...' : 'Guardar y Probar'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
