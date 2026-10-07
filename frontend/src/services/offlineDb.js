/**
 * offlineDb.js
 * Capa de persistencia local en IndexedDB para la cola de sincronización offline.
 * Compatible con Capacitor 8, Android WebView y navegadores web modernos.
 *
 * Los datos persisten en el sandbox privado de la aplicación Android:
 * /data/data/pe.edu.unt.tecleollave/app_webview/IndexedDB/
 * Sobreviven a cierres forzados, reinicios del teléfono y actualizaciones del APK.
 */

const DB_NAME = 'tecleollave_offline_db';
const DB_VERSION = 1;
const STORE_NAME = 'offline_queue';

let dbInstance = null;

/**
 * Inicializa o abre la base de datos IndexedDB.
 * @returns {Promise<IDBDatabase>}
 */
export function openOfflineDb() {
  if (dbInstance) {
    return Promise.resolve(dbInstance);
  }

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB no está disponible en este entorno.'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'client_event_id' });
        store.createIndex('by_status', 'status', { unique: false });
        store.createIndex('by_server_user', ['server_origin', 'participant_id'], { unique: false });
        store.createIndex('by_created_at', 'created_at', { unique: false });
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      dbInstance.onversionchange = () => {
        dbInstance.close();
        dbInstance = null;
      };
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      console.error('[OfflineDB] Error al abrir IndexedDB:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Genera un UUID v4 criptográficamente seguro en el dispositivo.
 */
export function generateUUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Normaliza el origen del servidor (protocolo + hostname + puerto).
 */
export function normalizeServerOrigin(url) {
  try {
    const parsed = new URL(url, typeof window !== 'undefined' ? window.location.origin : 'http://localhost');
    return parsed.origin;
  } catch {
    return String(url || '').trim().replace(/\/+$/, '');
  }
}

/**
 * Encola una actividad capturada offline en IndexedDB.
 * Garantiza que NO se guarden contraseñas ni credenciales sensibles.
 */
export async function enqueueOfflineActivity({
  client_event_id,
  server_origin,
  participant_id,
  activity_type,
  payload,
  captured_at
}) {
  const db = await openOfflineDb();
  const id = client_event_id || generateUUID();
  const origin = normalizeServerOrigin(server_origin);
  const now = Date.now();

  // Limpieza y minimización de datos: eliminar contraseñas o tokens si estuvieran presentes
  const safePayload = { ...payload };
  delete safePayload.password;
  delete safePayload.token;
  delete safePayload.access_token;

  const queueItem = {
    client_event_id: id,
    server_origin: origin,
    participant_id: Number(participant_id) || 0,
    activity_type: activity_type || 'AUTH_ATTEMPT_TELEMETRY',
    payload: safePayload,
    captured_at: captured_at || new Date(now).toISOString(),
    status: 'pending', // 'pending' | 'syncing' | 'failed'
    retry_count: 0,
    last_error: null,
    created_at: now
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(queueItem);

    request.onsuccess = () => resolve(queueItem);
    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Obtiene los elementos pendientes que corresponden al servidor y participante actual.
 * Limita el tamaño de lote a `limit` para evitar saturar el ancho de banda.
 */
export async function getPendingQueueItems(server_origin, participant_id, limit = 20) {
  const db = await openOfflineDb();
  const origin = normalizeServerOrigin(server_origin);
  const pid = Number(participant_id) || 0;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const all = request.result || [];
      // Filtrar estrictamente por servidor, participante y estado elegible para reintento
      const filtered = all.filter((item) => {
        const matchesServer = item.server_origin === origin;
        const matchesUser = item.participant_id === pid;
        const isEligible = item.status === 'pending' || (item.status === 'failed' && !item.is_permanent_failure);
        return matchesServer && matchesUser && isEligible;
      });

      // Ordenar por tiempo de captura ascendente (FIFO)
      filtered.sort((a, b) => a.created_at - b.created_at);
      resolve(filtered.slice(0, limit));
    };

    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Obtiene estadísticas de la cola para un participante y servidor dado.
 */
export async function getQueueStats(server_origin, participant_id) {
  const db = await openOfflineDb();
  const origin = normalizeServerOrigin(server_origin);
  const pid = Number(participant_id) || 0;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const all = request.result || [];
      const userItems = all.filter((i) => i.server_origin === origin && i.participant_id === pid);
      const pending = userItems.filter((i) => i.status === 'pending' || i.status === 'syncing').length;
      const failed = userItems.filter((i) => i.status === 'failed').length;
      const total = userItems.length;

      resolve({ total, pending, failed, allTotal: all.length });
    };

    request.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Marca un conjunto de IDs como 'syncing'.
 */
export async function markItemsSyncing(ids) {
  if (!ids || ids.length === 0) return;
  const db = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    ids.forEach((id) => {
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) {
          const updated = { ...req.result, status: 'syncing' };
          store.put(updated);
        }
      };
    });

    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Marca un conjunto de IDs como 'failed' con mensaje de error y contador de reintentos.
 */
export async function markItemsFailed(ids, errorMessage, isPermanent = false) {
  if (!ids || ids.length === 0) return;
  const db = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    ids.forEach((id) => {
      const req = store.get(id);
      req.onsuccess = () => {
        if (req.result) {
          const updated = {
            ...req.result,
            status: 'failed',
            retry_count: (req.result.retry_count || 0) + 1,
            last_error: errorMessage || 'Error de red o servidor',
            is_permanent_failure: Boolean(isPermanent)
          };
          store.put(updated);
        }
      };
    });

    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Regla de oro: Elimina de la cola ÚNICAMENTE los elementos confirmados por el servidor.
 */
export async function removeConfirmedItems(confirmedIds) {
  if (!confirmedIds || confirmedIds.length === 0) return 0;
  const db = await openOfflineDb();

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    let count = 0;

    confirmedIds.forEach((id) => {
      const req = store.delete(id);
      req.onsuccess = () => count++;
    });

    tx.oncomplete = () => resolve(count);
    tx.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Restablece los elementos fallidos o bloqueados a estado 'pending' para permitir su reintento forzado.
 */
export async function resetFailedQueueItems(server_origin, participant_id) {
  const db = await openOfflineDb();
  const origin = normalizeServerOrigin(server_origin);
  const pid = Number(participant_id) || 0;

  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();

    req.onsuccess = () => {
      const all = req.result || [];
      let count = 0;
      all.forEach((item) => {
        if (item.server_origin === origin && item.participant_id === pid && item.status === 'failed') {
          const updated = {
            ...item,
            status: 'pending',
            is_permanent_failure: false,
            retry_count: 0,
            last_error: null
          };
          store.put(updated);
          count++;
        }
      });
      tx.oncomplete = () => resolve(count);
    };

    req.onerror = (e) => reject(e.target.error);
  });
}

