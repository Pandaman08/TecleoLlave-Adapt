import React from 'react';
import { Shield, KeyRound, Smartphone, Settings } from 'lucide-react';

export default function MobileBottomNav({ currentTab, onSelectTab, protectedAppsCount = 0 }) {
  const tabs = [
    { id: 'inicio', label: 'Inicio', icon: Shield },
    { id: 'mykey', label: 'Mi llave', icon: KeyRound },
    { id: 'apps', label: 'Apps', icon: Smartphone, badge: protectedAppsCount > 0 ? protectedAppsCount : null },
    { id: 'settings', label: 'Ajustes', icon: Settings }
  ];

  return (
    <nav className="tl-bottom-nav">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            className={`tl-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onSelectTab(tab.id)}
            aria-label={tab.label}
          >
            <div style={{ position: 'relative', display: 'inline-flex' }}>
              <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
              {tab.badge && (
                <span style={{
                  position: 'absolute',
                  top: '-4px',
                  right: '-8px',
                  background: 'var(--tl-accent)',
                  color: '#ffffff',
                  fontSize: '0.6rem',
                  fontWeight: 700,
                  borderRadius: '10px',
                  padding: '1px 5px',
                  minWidth: '14px',
                  textAlign: 'center',
                  lineHeight: '1.2'
                }}>
                  {tab.badge}
                </span>
              )}
            </div>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </nav>
  );
}
