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
  UserPlus,
  Zap,
  Sparkles,
  LogOut
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

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
  const { role, username, isAuthenticated, logout } = useAuth();

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

      {/* Quick Nav Links (Live Demo / Login / Register / Entrenamiento) */}
      <div className="sidebar-footer">
        {/* Enlace a Entrenamiento Continuo: solo visible para role === 'user' */}
        {role === 'user' && (
          <NavLink
            to="/entrenamiento"
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
            style={{ color: 'var(--brand-500)', fontWeight: 600 }}
            title={isCollapsed ? 'Entrenar mi Perfil' : undefined}
          >
            <Sparkles size={18} strokeWidth={2} className="nav-icon" style={{ color: 'var(--brand-500)' }} />
            {!isCollapsed && <span className="nav-label">Entrenar mi Perfil ✨</span>}
          </NavLink>
        )}

        <NavLink
          to="/live-demo"
          className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
          style={{ color: 'var(--brand-500)', fontWeight: 600 }}
          title={isCollapsed ? 'Demo en Vivo (Sustentación)' : undefined}
        >
          <Zap size={18} strokeWidth={2} className="nav-icon" style={{ color: 'var(--brand-500)' }} />
          {!isCollapsed && <span className="nav-label">Demo en Vivo ⚡</span>}
        </NavLink>

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

        {isAuthenticated && !isCollapsed && (
          <div style={{
            padding: '0.4rem 0.6rem',
            marginTop: '0.5rem',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-canvas)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '0.72rem'
          }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {username || 'Sesión Activa'}
            </span>
            <span style={{
              fontWeight: 700,
              textTransform: 'uppercase',
              fontSize: '0.62rem',
              padding: '0.1rem 0.4rem',
              borderRadius: '3px',
              backgroundColor: role === 'admin' ? 'rgba(239, 68, 68, 0.15)' : 'rgba(16, 185, 129, 0.15)',
              color: role === 'admin' ? 'var(--danger)' : 'var(--success)'
            }}>
              {role}
            </span>
          </div>
        )}

        {isAuthenticated && (
          <button
            type="button"
            className="sidebar-nav-item"
            onClick={() => logout()}
            style={{ color: 'var(--danger)', marginTop: '0.25rem' }}
            title={isCollapsed ? 'Cerrar Sesión' : undefined}
          >
            <LogOut size={18} strokeWidth={1.75} className="nav-icon" />
            {!isCollapsed && <span className="nav-label">Cerrar Sesión</span>}
          </button>
        )}
      </div>
    </aside>
  );
}
