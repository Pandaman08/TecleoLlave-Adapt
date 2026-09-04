/**
 * i18n configuration for TECLEOLLAVE-ADAPT
 * Detects browser language, persists user choice, supports lazy loading
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import esTranslation from './locales/es.json';
import enTranslation from './locales/en.json';

/**
 * Detección robusta del idioma inicial:
 * 1) Preferencia guardada en localStorage (manual del usuario)
 * 2) Idioma del navegador (es, en-us, en, etc.)
 * 3) Fallback: español
 */
const detectInitialLanguage = () => {
  // 1) Persisted preference
  try {
    const saved = localStorage.getItem('i18n_lang');
    if (saved && ['es', 'en'].includes(saved)) return saved;
  } catch (e) {
    // localStorage no disponible
  }

  // 2) Browser language
  const browser = (navigator.language || navigator.userLanguage || 'es').toLowerCase();
  if (browser.startsWith('en')) return 'en';
  if (browser.startsWith('es')) return 'es';

  // 3) Fallback
  return 'es';
};

i18n
  .use(initReactI18next)
  .init({
    resources: {
      es: { translation: esTranslation },
      en: { translation: enTranslation }
    },
    lng: detectInitialLanguage(),
    fallbackLng: 'es',
    supportedLngs: ['es', 'en'],
    interpolation: {
      escapeValue: false
    },
    // En desarrollo, loguea keys faltantes para detectar gaps
    saveMissing: import.meta.env.DEV,
    missingKeyHandler: (lng, ns, key) => {
      if (import.meta.env.DEV) {
        console.warn(`[i18n] Missing translation: ${lng}.${key}`);
      }
    }
  });

i18n.on('languageChanged', (lng) => {
  try {
    localStorage.setItem('i18n_lang', lng);
  } catch (e) {
    // ignore
  }
  // Actualizar el atributo lang del HTML para accesibilidad
  document.documentElement.setAttribute('lang', lng);
});

// Set initial lang attribute
document.documentElement.setAttribute('lang', i18n.language);

export default i18n;
