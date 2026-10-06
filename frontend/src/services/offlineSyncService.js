/**
 * offlineSyncService.js
 * Orquestador de sincronización offline <-> servidor con soporte para:
 * - Detección de conectividad real mediante endpoint /health
 * - Sincronización automática al recuperar red o reanudar la app (Capacitor AppState)
 * - Lotes limitados (20-25 elementos) y borrado idempotente tras confirmación 200
 * - Retroceso exponencial (exponential backoff) en errores 5xx / desconexión
 * - Manejo de sesión expirada (401/403) sin descartar la cola local
 * - Notificación reactiva del estado para la UI (SyncStatusBar)
 */

import api, { getBaseUrl } from './api';
import {
  normalizeServerOrigin,
  getPendingQueueItems,
  getQueueStats,
  markItemsSyncing,
  markItemsFailed,
  removeConfirmedItems
} from './offlineDb';
import { App as CapApp } from '@capacitor/app';

class OfflineSyncService {
  constructor() {
    this.isServerOnline = false;
    this.isSyncing = false;
    this.pendingCount = 0;
    this.failedCount = 0;
    this.lastSyncTime = null;
    this.syncStatus = 'idle'; // 'idle' | 'syncing' | 'success' | 'error' | 'auth_required'
    this.errorMessage = '';
    this.listeners = new Set();

    this.backoffDelayMs = 2000;
    this.maxBackoffMs = 60000;
    this.retryTimer = null;
    this.heartbeatTimer = null;
    this.isInitialized = false;
  }

  /**
   * Inicializa listeners del sistema y temporizadores.
   */
  init() {
    if (this.isInitialized || typeof window === 'undefined') return;
    this.isInitialized = true;

    // 1. Escuchar eventos del navegador/WebView
    window.addEventListener('online', () => {
      console.log('[OfflineSync] Red restaurada en navegador/dispositivo.');
      this.checkServerHealth().then((online) => {
        if (online) this.syncQueue({ force: true });
      });
    });

    window.addEventListener('offline', () => {
      console.log('[OfflineSync] Conexión de red perdida.');
      this.isServerOnline = false;
      this.syncStatus = 'error';
      this.errorMessage = 'Sin conexión a internet.';
      this._notify();
    });

    // 2. Escuchar cuando la app de Capacitor vuelve al primer plano (resume)
    try {
      if (window.Capacitor?.isNativePlatform?.()) {
        CapApp.addListener('appStateChange', (state) => {
          if (state.isActive) {
            console.log('[OfflineSync] App volvió a primer plano. Verificando conectividad...');
            this.checkServerHealth().then((online) => {
              if (online) this.syncQueue();
            });
          }
        });
      }
    } catch (e) {
      console.warn('[OfflineSync] No se pudo vincular CapApp listener:', e);
    }

    // 3. Heartbeat periódico cada 30 segundos para comprobar salud del servidor
    this.heartbeatTimer = setInterval(() => {
      this.checkServerHealth().then((online) => {
        if (online && this.pendingCount > 0 && !this.isSyncing) {
          this.syncQueue();
        }
      });
    }, 30000);

    // Carga inicial
    this.updateStats();
    this.checkServerHealth();
  }

  /**
   * Suscribe un callback a cambios de estado.
   */
  subscribe(listener) {
    this.listeners.add(listener);
    listener(this.getState());
    return () => this.listeners.delete(listener);
  }

  _notify() {
    const state = this.getState();
    this.listeners.forEach((listener) => {
      try {
        listener(state);
      } catch (err) {
        console.error('[OfflineSync] Error notificando listener:', err);
      }
    });
  }

  getState() {
    return {
      networkStatus: this.isServerOnline ? 'online' : 'offline',
      syncStatus: this.syncStatus,
      pendingCount: this.pendingCount,
      failedCount: this.failedCount,
      lastSyncTime: this.lastSyncTime,
      errorMessage: this.errorMessage,
      serverUrl: getBaseUrl()
    };
  }

  /**
   * Obtiene el participante activo desde localStorage.
   */
  getParticipantId() {
    try {
      const saved = localStorage.getItem('tl_mobile_participant');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed?.id || 0;
      }
    } catch {}
    return 0;
  }

  /**
   * Actualiza el conteo de elementos en la cola para el servidor y participante actual.
   */
  async updateStats() {
    try {
      const serverOrigin = normalizeServerOrigin(getBaseUrl());
      const participantId = this.getParticipantId();
      const stats = await getQueueStats(serverOrigin, participantId);
      this.pendingCount = stats.pending;
      this.failedCount = stats.failed;
      this._notify();
      return stats;
    } catch (err) {
      console.warn('[OfflineSync] Error obteniendo estadísticas:', err);
      return { total: 0, pending: 0, failed: 0 };
    }
  }

  /**
   * Comprueba si el backend responde en el endpoint /health.
   */
  async checkServerHealth(customUrl = null) {
    const rawUrl = (customUrl || getBaseUrl() || '').trim().replace(/\/+$/, '');
    if (!rawUrl) {
      this.isServerOnline = false;
      this._notify();
      return false;
    }

    const healthUrl = rawUrl.endsWith('/api')
      ? `${rawUrl}/health`
      : rawUrl === '/api'
      ? '/api/health'
      : `${rawUrl}/api/health`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const res = await fetch(healthUrl, {
        method: 'GET',
        headers: { Accept: 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        if (data.status === 'ok' || res.status === 200) {
          this.isServerOnline = true;
          if (this.syncStatus === 'error' && this.errorMessage.includes('conexión')) {
            this.syncStatus = 'idle';
            this.errorMessage = '';
          }
          this._notify();
          return true;
        }
      }
    } catch (err) {
      // Conexión fallida o abortada por timeout
    }

    this.isServerOnline = false;
    this._notify();
    return false;
  }

  /**
   * Ejecuta la sincronización de elementos pendientes hacia el backend.
   */
  async syncQueue({ force = false } = {}) {
    if (this.isSyncing) return;

    const serverOrigin = normalizeServerOrigin(getBaseUrl());
    const participantId = this.getParticipantId();

    if (!participantId) {
      await this.updateStats();
      return;
    }

    // Obtener elementos pendientes
    const items = await getPendingQueueItems(serverOrigin, participantId, 25);
    if (!items || items.length === 0) {
      this.syncStatus = 'idle';
      this.errorMessage = '';
      await this.updateStats();
      return;
    }

    // Verificar si el servidor está accesible antes de comenzar el envío
    if (!force && !this.isServerOnline) {
      const online = await this.checkServerHealth();
      if (!online) {
        this.syncStatus = 'error';
        this.errorMessage = 'Backend o túnel inaccesible. Las muestras permanecen seguras en el teléfono.';
        this._scheduleBackoffRetry();
        this._notify();
        return;
      }
    }

    this.isSyncing = true;
    this.syncStatus = 'syncing';
    this.errorMessage = '';
    this._notify();

    const ids = items.map((i) => i.client_event_id);
    await markItemsSyncing(ids);

    try {
      // Enviar lote al backend
      const response = await api.post('/mobile/study/batch-sync', {
        participant_id: participantId,
        events: items
      });

      const data = response.data;
      if (data && data.success) {
        // Regla de oro: Eliminar de la base de datos local ÚNICAMENTE los IDs confirmados por el servidor
        const confirmedIds = data.synced_event_ids || [];
        if (confirmedIds.length > 0) {
          await removeConfirmedItems(confirmedIds);
          console.log(`[OfflineSync] Persistencia confirmada por el servidor: ${confirmedIds.length} elementos eliminados de la cola local.`);
        }

        // Si algunos eventos fallaron en el backend de forma individual, marcarlos
        if (data.failed_events && data.failed_events.length > 0) {
          for (const fe of data.failed_events) {
            await markItemsFailed([fe.client_event_id], fe.error || 'Error en servidor', true);
          }
        }

        // Restablecer retraso de reintento
        this.backoffDelayMs = 2000;
        this.isServerOnline = true;
        this.lastSyncTime = Date.now();

        // Actualizar estadísticas de la cola
        const remainingStats = await this.updateStats();

        // Si aún quedan elementos pendientes en lotes subsecuentes, continuar sincronizando
        if (remainingStats.pending > 0) {
          this.isSyncing = false;
          return this.syncQueue();
        } else {
          this.syncStatus = 'success';
          this.errorMessage = '';
          this._notify();

          // Volver a 'idle' tras 4 segundos
          setTimeout(() => {
            if (this.syncStatus === 'success') {
              this.syncStatus = 'idle';
              this._notify();
            }
          }, 4000);
        }
      } else {
        throw new Error('Respuesta inválida del servidor');
      }
    } catch (err) {
      console.warn('[OfflineSync] Error al sincronizar lote:', err);
      const httpStatus = err.response?.status;

      if (httpStatus === 401 || httpStatus === 403) {
        // Token expirado o no autorizado: pausar sincronización y solicitar inicio de sesión online
        this.syncStatus = 'auth_required';
        this.errorMessage = 'Sesión expirada. Inicia sesión online con tu Gmail para sincronizar los datos.';
        await markItemsFailed(ids, 'Sesión expirada');
      } else if (httpStatus && httpStatus >= 400 && httpStatus < 500) {
        // Error de cliente definitivo (4xx): marcar como fallo permanente sin descartar datos de la cola
        const detail = err.response?.data?.detail || err.message;
        this.syncStatus = 'error';
        this.errorMessage = `Error del cliente (${httpStatus}): ${detail}`;
        await markItemsFailed(ids, detail, true);
      } else {
        // Error de red o 5xx: retroceso exponencial y conservar datos intactos
        this.isServerOnline = false;
        this.syncStatus = 'error';
        this.errorMessage = 'Error de conexión con el backend. Reintentando con retroceso exponencial...';
        await markItemsFailed(ids, 'Fallo transitorio de conexión');
        this._scheduleBackoffRetry();
      }

      await this.updateStats();
    } finally {
      this.isSyncing = false;
      this._notify();
    }
  }

  /**
   * Programa el siguiente reintento automático con retroceso exponencial.
   */
  _scheduleBackoffRetry() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    console.log(`[OfflineSync] Siguiente reintento en ${Math.round(this.backoffDelayMs / 1000)}s`);

    this.retryTimer = setTimeout(() => {
      this.checkServerHealth().then((online) => {
        if (online) {
          this.syncQueue();
        } else {
          this.backoffDelayMs = Math.min(this.maxBackoffMs, this.backoffDelayMs * 2);
          this._scheduleBackoffRetry();
        }
      });
    }, this.backoffDelayMs);

    this.backoffDelayMs = Math.min(this.maxBackoffMs, this.backoffDelayMs * 2);
  }

  /**
   * Acción manual de la UI para reintentar la sincronización inmediatamente.
   */
  async triggerManualSync() {
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.backoffDelayMs = 2000;
    const online = await this.checkServerHealth();
    if (online) {
      return this.syncQueue({ force: true });
    } else {
      this.syncStatus = 'error';
      this.errorMessage = 'No se pudo conectar al servidor. Revisa si tu laptop o túnel Cloudflare están encendidos.';
      this._notify();
    }
  }
}

const offlineSyncService = new OfflineSyncService();
export default offlineSyncService;
