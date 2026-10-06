import React, { useState, useEffect } from 'react';
import {
  Wifi, WifiOff, RefreshCw, CheckCircle2, AlertTriangle, KeyRound, Server
} from 'lucide-react';
import offlineSyncService from '../../services/offlineSyncService';

export default function SyncStatusBar({ onOpenServerConfig }) {
  const [syncState, setSyncState] = useState(() => offlineSyncService.getState());

  useEffect(() => {
    const unsub = offlineSyncService.subscribe((state) => {
      setSyncState(state);
    });
    offlineSyncService.init();
    return () => unsub();
  }, []);

  const { networkStatus, syncStatus, pendingCount, errorMessage } = syncState;

  // Si todo está en línea, no hay nada pendiente y no hay errores, mostrar barra sutil o compacta
  const isOnline = networkStatus === 'online';
  const isSyncing = syncStatus === 'syncing';
  const isAuthRequired = syncStatus === 'auth_required';
  const isError = syncStatus === 'error';
  const isSuccess = syncStatus === 'success';

  const handleManualSync = () => {
    offlineSyncService.triggerManualSync();
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0.45rem 0.75rem',
      borderRadius: '10px',
      fontSize: '0.73rem',
      fontWeight: 500,
      marginBottom: '0.65rem',
      transition: 'all 0.25s ease',
      background: isSyncing
        ? 'var(--tl-accent-light)'
        : isAuthRequired || (isError && !isOnline)
        ? 'rgba(239, 68, 68, 0.12)'
        : !isOnline || pendingCount > 0
        ? 'rgba(245, 158, 11, 0.12)'
        : isSuccess
        ? 'rgba(16, 185, 129, 0.12)'
        : 'var(--tl-bg-surface-elevated)',
      border: `1px solid ${
        isSyncing
          ? 'var(--tl-accent)'
          : isAuthRequired || (isError && !isOnline)
          ? 'rgba(239, 68, 68, 0.35)'
          : !isOnline || pendingCount > 0
          ? 'rgba(245, 158, 11, 0.35)'
          : isSuccess
          ? 'rgba(16, 185, 129, 0.35)'
          : 'var(--tl-border)'
      }`,
      color: isSyncing
        ? 'var(--tl-accent)'
        : isAuthRequired || (isError && !isOnline)
        ? 'var(--tl-danger)'
        : !isOnline || pendingCount > 0
        ? 'var(--tl-warning)'
        : isSuccess
        ? 'var(--tl-success)'
        : 'var(--tl-text-secondary)'
    }}>
      {/* Icono + Texto de Estado */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: 0 }}>
        {isSyncing ? (
          <RefreshCw size={15} className="tl-spin" style={{ flexShrink: 0 }} />
        ) : !isOnline ? (
          <WifiOff size={15} style={{ flexShrink: 0 }} />
        ) : isAuthRequired ? (
          <KeyRound size={15} style={{ flexShrink: 0 }} />
        ) : isError ? (
          <AlertTriangle size={15} style={{ flexShrink: 0 }} />
        ) : isSuccess ? (
          <CheckCircle2 size={15} style={{ flexShrink: 0 }} />
        ) : (
          <Wifi size={15} style={{ color: 'var(--tl-success)', flexShrink: 0 }} />
        )}

        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
              {isSyncing
                ? 'Sincronizando datos...'
                : !isOnline
                ? 'Modo fuera de línea'
                : isAuthRequired
                ? 'Sesión expirada'
                : isSuccess
                ? 'Sincronización completa'
                : isError
                ? 'Conexión pendiente'
                : 'Backend conectado'}
            </span>
            {pendingCount > 0 && (
              <span style={{
                fontSize: '0.65rem',
                padding: '1px 6px',
                borderRadius: '10px',
                background: 'var(--tl-warning)',
                color: '#fff',
                fontWeight: 700
              }}>
                {pendingCount} pendiente{pendingCount > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <span style={{
            fontSize: '0.65rem',
            color: 'var(--tl-text-muted)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {!isOnline
              ? 'Capturas guardadas localmente en el teléfono.'
              : isAuthRequired
              ? 'Inicia sesión online para subir la cola.'
              : isSyncing
              ? 'Enviando muestras pendientes al servidor...'
              : errorMessage || (pendingCount > 0 ? 'Esperando sincronización automática.' : 'Listo para capturar actividades.')}
          </span>
        </div>
      </div>

      {/* Acciones */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0, marginLeft: '0.5rem' }}>
        {(pendingCount > 0 || !isOnline || isError) && (
          <button
            type="button"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="tl-btn-outline"
            style={{
              padding: '2px 7px',
              fontSize: '0.68rem',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              height: '24px'
            }}
            title="Intentar sincronizar ahora"
          >
            <RefreshCw size={11} className={isSyncing ? 'tl-spin' : ''} />
            <span>Sincronizar</span>
          </button>
        )}

        {onOpenServerConfig && (
          <button
            type="button"
            onClick={onOpenServerConfig}
            className="tl-icon-btn"
            style={{ padding: '4px', width: '24px', height: '24px' }}
            title="Configurar URL del servidor o túnel"
          >
            <Server size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
