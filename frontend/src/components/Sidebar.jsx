import React from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  LayoutDashboard,
  LineChart,
  Layers,
  Activity,
  Award,
  ChevronLeft,
  ChevronRight,
  Shield,
  KeyRound,
  UserPlus
} from 'lucide-react';

export default function Sidebar({
  activeSection,
  setActiveSection,
  isCollapsed,
  setIsCollapsed,
  activeModelVersion = '1',
  modelsCount = 0,
  eventsCount = 0
}) {
  const { t } = useTranslation();

  const navItems = [
    {
      id: 'overview',
      label: 'Resumen Ejecutivo',
      icon: LayoutDashboard,
      badge: `v${activeModelVersion}`
    },
    {
      id: 'analytics',
      label: 'Analítica & Gráficos',
      icon: LineChart,
      badge: 'ML'
    },
    {
      id: 'models',
      label: 'Historial de Modelos',
      icon: Layers,
      badge: `${modelsCount}`
    },
    {
      id: 'audit',
      label: 'Auditoría & Eventos',
      icon: Activity,
      badge: `${eventsCount}`
    },
    {
      id: 'cmu',
      label: 'Benchmark CMU',
      icon: Award,
      badge: 'CMU Dataset',
      isHighlight: true
    }
  ];

  return (
    <aside className={`sidebar-container ${isCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'}`}>
      {/* Header */}
      <div className="sidebar-header">
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <Shield size={20} strokeWidth={2} />
          </div>
          {!isCollapsed && (
            <div className="sidebar-brand-text">
              <span className="brand-name">TecleoLlave</span>
              <span className="brand-badge">Adaptive BioAuth</span>
            </div>
          )}
        </div>

        <button
          type="button"
          className="sidebar-collapse-btn"
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? 'Expandir menú lateral' : 'Colapsar menú lateral'}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`sidebar-nav-item ${isActive ? 'active' : ''}`}
              onClick={() => setActiveSection(item.id)}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon size={18} strokeWidth={isActive ? 2 : 1.75} className="nav-icon" />
              {!isCollapsed && (
                <>
                  <span className="nav-label">{item.label}</span>
                  {item.badge && <span className="nav-badge">{item.badge}</span>}
                </>
              )}
            </button>
          );
        })}
      </nav>

      {/* Quick Nav Links (Login / Register) */}
      <div className="sidebar-footer">
        <NavLink
          to="/login"
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          title={isCollapsed ? 'Terminal de Login' : undefined}
        >
          <KeyRound size={18} strokeWidth={1.75} className="nav-icon" />
          {!isCollapsed && <span className="nav-label">Terminal Login</span>}
        </NavLink>

        <NavLink
          to="/register"
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          title={isCollapsed ? 'Enrolamiento Biométrico' : undefined}
        >
          <UserPlus size={18} strokeWidth={1.75} className="nav-icon" />
          {!isCollapsed && <span className="nav-label">Enrolamiento</span>}
        </NavLink>
      </div>
    </aside>
  );
}
