/**
 * LanguageSelector - Selector de idioma reutilizable
 * Muestra un dropdown con los idiomas disponibles y persiste la elección
 */
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

export default function LanguageSelector({ variant = 'dropdown' }) {
  const { i18n, t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const languages = [
    { code: 'es', label: 'Español', short: 'ES', flag: '🇪🇸' },
    { code: 'en', label: 'English', short: 'EN', flag: '🇺🇸' }
  ];

  const current = languages.find(l => l.code === i18n.language) || languages[0];

  const handleSelect = (code) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (variant === 'compact') {
    return (
      <div ref={containerRef} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="btn-icon"
          aria-label={t('app.language')}
          title={t('app.language')}
          style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.55rem' }}
        >
          <Globe size={14} />
          <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{current.short}</span>
        </button>
        {isOpen && (
          <div style={{
            position: 'absolute', top: 'calc(100% + 4px)', right: 0,
            backgroundColor: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
            zIndex: 100, minWidth: 140, overflow: 'hidden'
          }}>
            {languages.map(lang => (
              <button
                key={lang.code}
                type="button"
                onClick={() => handleSelect(lang.code)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '0.5rem', width: '100%',
                  padding: '0.5rem 0.75rem', background: 'transparent', border: 'none',
                  cursor: 'pointer', fontSize: '0.82rem', textAlign: 'left',
                  color: lang.code === i18n.language ? 'var(--brand-500)' : 'var(--text-primary)',
                  backgroundColor: lang.code === i18n.language ? 'var(--bg-soft)' : 'transparent'
                }}
              >
                <span>{lang.flag}</span>
                <span style={{ flex: 1 }}>{lang.label}</span>
                {lang.code === i18n.language && <span>✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div ref={containerRef} style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
      <Globe size={14} style={{ color: 'var(--text-muted)', marginRight: '0.4rem' }} />
      <select
        className="select-control"
        value={i18n.language}
        onChange={(e) => handleSelect(e.target.value)}
        style={{ padding: '0.4rem 0.5rem', fontSize: '0.78rem' }}
        aria-label={t('app.language')}
      >
        {languages.map(lang => (
          <option key={lang.code} value={lang.code}>
            {lang.flag} {lang.short}
          </option>
        ))}
      </select>
    </div>
  );
}
