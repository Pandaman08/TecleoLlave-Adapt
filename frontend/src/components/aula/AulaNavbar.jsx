import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  GraduationCap,
  BookOpen,
  PenTool,
  Gamepad2,
  Crown,
  User,
  LogOut,
  ShieldCheck,
  Sparkles,
  Sun,
  Moon,
  Clock,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import LanguageSelector from '../LanguageSelector';

export default function AulaNavbar() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { username, role, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header style={{
      backgroundColor: 'rgba(17, 24, 39, 0.82)',
      backdropFilter: 'blur(14px)',
      WebkitBackdropFilter: 'blur(14px)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{
        maxWidth: '1360px',
        margin: '0 auto',
        padding: '0.65rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.75rem',
        minWidth: 0
      }}>
        {/* Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, minWidth: 0 }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'var(--brand-gradient)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
            flexShrink: 0
          }}>
            <GraduationCap size={20} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'nowrap' }}>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-primary)', letterSpacing: '-0.01em', whiteSpace: 'nowrap' }}>
                Aula Virtual
              </span>
              <span style={{
                fontSize: '0.62rem',
                fontWeight: 700,
                padding: '0.12rem 0.45rem',
                borderRadius: '999px',
                backgroundColor: 'rgba(16, 185, 129, 0.12)',
                color: 'var(--success)',
                border: '1px solid rgba(16, 185, 129, 0.3)',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.35rem',
                whiteSpace: 'nowrap'
              }}>
                <span style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--success)',
                  display: 'inline-block',
                  animation: 'pulse 1.8s infinite'
                }} />
                Biometría Activa
              </span>
            </div>
            <span className="aula-subtitle" style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
              Campus Virtual — TecleoLlave-Adapt
            </span>
          </div>
        </div>

        {/* Navigation Links con colapso responsivo elegante */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', minWidth: 0, flexWrap: 'nowrap' }}>
          <NavLink
            to="/aula"
            end
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
            style={{ padding: '0.42rem 0.65rem', fontSize: '0.8rem', borderRadius: 'var(--radius-md)', width: 'auto', whiteSpace: 'nowrap' }}
            title="Mis Cursos"
          >
            <BookOpen size={15} className="nav-icon" />
            <span className="aula-nav-text">Mis Cursos</span>
          </NavLink>

          <NavLink
            to="/aula/actividades"
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
            style={{ padding: '0.42rem 0.65rem', fontSize: '0.8rem', borderRadius: 'var(--radius-md)', width: 'auto', whiteSpace: 'nowrap' }}
            title="Actividades de Escritura"
          >
            <PenTool size={15} className="nav-icon" />
            <span className="aula-nav-text">Actividades</span>
          </NavLink>

          <NavLink
            to="/aula/juegos"
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
            style={{ padding: '0.42rem 0.65rem', fontSize: '0.8rem', borderRadius: 'var(--radius-md)', width: 'auto', whiteSpace: 'nowrap' }}
            title="Juegos Interactivos"
          >
            <Gamepad2 size={15} className="nav-icon" />
            <span className="aula-nav-text">Juegos</span>
          </NavLink>

          <NavLink
            to="/aula/entrenamiento"
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
            style={{ padding: '0.42rem 0.65rem', fontSize: '0.8rem', borderRadius: 'var(--radius-md)', width: 'auto', whiteSpace: 'nowrap' }}
            title="Reentrenamiento"
          >
            <RefreshCw size={15} className="nav-icon" />
            <span className="aula-nav-text">Reentrenar</span>
          </NavLink>

          <NavLink
            to="/aula/perfil"
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
            style={{ padding: '0.42rem 0.65rem', fontSize: '0.8rem', borderRadius: 'var(--radius-md)', width: 'auto', whiteSpace: 'nowrap' }}
            title="Mi Perfil"
          >
            <User size={15} className="nav-icon" />
            <span className="aula-nav-text">Mi Perfil</span>
          </NavLink>
        </nav>

        {/* User Badge & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              padding: '0.4rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-canvas)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? <Sun size={15} /> : <Moon size={15} />}
          </button>

          <LanguageSelector variant="compact" />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.3rem 0.65rem',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--bg-canvas)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: 'var(--brand-gradient)',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.75rem'
            }}>
              {username ? username.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.1, whiteSpace: 'nowrap' }}>
                {username || 'Estudiante'}
              </span>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>
                Estudiante
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem',
              padding: '0.4rem 0.65rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid rgba(239, 68, 68, 0.25)',
              backgroundColor: 'rgba(239, 68, 68, 0.08)',
              color: 'var(--danger)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'var(--transition)'
            }}
            title="Cerrar sesión del aula"
          >
            <LogOut size={14} />
            <span className="aula-logout-text">Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}
