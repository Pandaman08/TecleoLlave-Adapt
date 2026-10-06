import { registerPlugin, Capacitor } from '@capacitor/core';

// Registrar plugin nativo de Android si está presente
const AndroidSecurityBridge = registerPlugin('AndroidSecurityBridge');

// Lista fallback de muestra cuando se ejecuta en navegador web / escritorio
const FALLBACK_APPS = [
  { packageName: 'com.whatsapp', name: 'WhatsApp', icon: '', isSystemApp: false, category: 'Redes sociales' },
  { packageName: 'com.instagram.android', name: 'Instagram', icon: '', isSystemApp: false, category: 'Redes sociales' },
  { packageName: 'org.telegram.messenger', name: 'Telegram', icon: '', isSystemApp: false, category: 'Redes sociales' },
  { packageName: 'com.bcp.innovacxion', name: 'BCP Móvil', icon: '', isSystemApp: false, category: 'Finanzas' },
  { packageName: 'com.bcp.yapeapp', name: 'Yape', icon: '', isSystemApp: false, category: 'Finanzas' },
  { packageName: 'com.google.android.apps.photos', name: 'Google Fotos', icon: '', isSystemApp: false, category: 'Privacidad' },
  { packageName: 'com.android.gallery3d', name: 'Galería', icon: '', isSystemApp: true, category: 'Privacidad' },
  { packageName: 'com.google.android.gm', name: 'Gmail', icon: '', isSystemApp: true, category: 'Mensajería' },
  { packageName: 'com.spotify.music', name: 'Spotify', icon: '', isSystemApp: false, category: 'Multimedia' },
  { packageName: 'com.android.settings', name: 'Ajustes', icon: '', isSystemApp: true, category: 'Sistema' }
];

export const isNativeAndroid = () => {
  return typeof window !== 'undefined' && Boolean(window.Capacitor?.isNativePlatform?.());
};

/**
 * Obtiene la lista real de aplicaciones instaladas con sus iconos nativos de Android
 */
export async function getInstalledApps() {
  if (isNativeAndroid()) {
    try {
      const res = await AndroidSecurityBridge.getInstalledApps();
      if (res && Array.isArray(res.apps) && res.apps.length > 0) {
        return res.apps;
      }
    } catch (e) {
      console.warn('[NativeBridge] Error al obtener apps nativas:', e);
    }
  }
  return FALLBACK_APPS;
}

/**
 * Comprueba el estado real de permisos en Android
 */
export async function checkPermissions() {
  if (isNativeAndroid()) {
    try {
      const res = await AndroidSecurityBridge.checkPermissions();
      return {
        usageStats: Boolean(res.usageStats),
        overlay: Boolean(res.overlay),
        deviceSecure: Boolean(res.deviceSecure)
      };
    } catch (e) {
      console.warn('[NativeBridge] Error al comprobar permisos:', e);
    }
  }
  // En modo web simulado
  const savedPerm = localStorage.getItem('tl_sim_permissions');
  if (savedPerm) {
    try { return JSON.parse(savedPerm); } catch {}
  }
  return { usageStats: true, overlay: true, deviceSecure: true };
}

/**
 * Abre la pantalla REAL de Configuración de Acceso de Uso de Android
 */
export async function openUsageSettings() {
  if (isNativeAndroid()) {
    try {
      await AndroidSecurityBridge.openUsageSettings();
      return true;
    } catch (e) {
      console.error('[NativeBridge] Error al abrir configuración de uso:', e);
    }
  }
  return false;
}

/**
 * Abre la pantalla REAL de Configuración de Superposición de Android
 */
export async function openOverlaySettings() {
  if (isNativeAndroid()) {
    try {
      await AndroidSecurityBridge.openOverlaySettings();
      return true;
    } catch (e) {
      console.error('[NativeBridge] Error al abrir configuración de overlay:', e);
    }
  }
  return false;
}

/**
 * Abre la pantalla REAL de Ajustes de Seguridad del Dispositivo Android
 */
export async function openSecuritySettings() {
  if (isNativeAndroid()) {
    try {
      await AndroidSecurityBridge.openSecuritySettings();
      return true;
    } catch (e) {
      console.error('[NativeBridge] Error al abrir configuración de seguridad:', e);
    }
  }
  return false;
}

/**
 * Obtiene el estado real de bloqueo y seguridad del dispositivo
 */
export async function getDeviceSecurityStatus() {
  if (isNativeAndroid()) {
    try {
      const res = await AndroidSecurityBridge.getDeviceSecurityStatus();
      return {
        isDeviceSecure: Boolean(res.isDeviceSecure),
        isKeyguardLocked: Boolean(res.isKeyguardLocked)
      };
    } catch (e) {
      console.warn('[NativeBridge] Error al obtener seguridad del dispositivo:', e);
    }
  }
  return { isDeviceSecure: true, isKeyguardLocked: false };
}

/**
 * Inicia o actualiza el servicio de supervisión en segundo plano de AppLocker
 */
export async function syncAppLockerService({ protectedPackages = [], isEnrolled = false, phrase = 'seguridad unt 2026' }) {
  if (isNativeAndroid()) {
    try {
      await AndroidSecurityBridge.startAppLockerService({
        protectedPackages: Array.isArray(protectedPackages) ? protectedPackages : [],
        isEnrolled: Boolean(isEnrolled),
        phrase: phrase || 'seguridad unt 2026'
      });
      return true;
    } catch (e) {
      console.warn('[NativeBridge] Error al sincronizar AppLockerService:', e);
    }
  }
  return false;
}

/**
 * Desbloquea un paquete temporalmente para la sesión actual
 */
export async function unlockPackageForSession(packageName) {
  if (isNativeAndroid()) {
    try {
      await AndroidSecurityBridge.unlockPackage({ packageName });
      return true;
    } catch (e) {
      console.warn('[NativeBridge] Error al desbloquear paquete:', e);
    }
  }
  return false;
}

/**
 * Minimiza la aplicación TECLEOLLAVE tras un desbloqueo exitoso para mostrar la app objetivo
 */
export async function minimizeApp() {
  if (isNativeAndroid()) {
    try {
      await AndroidSecurityBridge.minimizeApp();
      return true;
    } catch (e) {
      console.warn('[NativeBridge] Error al minimizar app:', e);
    }
  }
  return false;
}

/**
 * Comprueba si hay un reto de bloqueo pendiente por procesar
 */
export async function getPendingChallenge() {
  if (isNativeAndroid()) {
    try {
      return await AndroidSecurityBridge.getPendingChallenge();
    } catch (e) {
      console.warn('[NativeBridge] Error al consultar reto pendiente:', e);
    }
  }
  return { hasChallenge: false, targetPackage: '' };
}

/**
 * Registra listener para retos de bloqueo lanzados desde el servicio en segundo plano
 */
export function addAppChallengeListener(callback) {
  if (isNativeAndroid()) {
    try {
      return AndroidSecurityBridge.addListener('onAppChallenge', callback);
    } catch (e) {
      console.warn('[NativeBridge] Error al registrar listener onAppChallenge:', e);
    }
  }
  return { remove: () => {} };
}
