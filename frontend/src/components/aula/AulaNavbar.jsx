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
    <header className="aula-navbar">
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

        {/* Navigation Links con legibilidad y contraste óptimo */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', minWidth: 0, flexWrap: 'nowrap' }}>
          <NavLink
            to="/aula"
            end
            className={({ isActive }) => `aula-nav-link ${isActive ? 'active' : ''}`}
            title="Mis Cursos"
          >
            <BookOpen size={15} style={{ flexShrink: 0 }} />
            <span className="aula-nav-text">Mis Cursos</span>
          </NavLink>

          <NavLink
            to="/aula/actividades"
            className={({ isActive }) => `aula-nav-link ${isActive ? 'active' : ''}`}
            title="Actividades de Escritura"
          >
            <PenTool size={15} style={{ flexShrink: 0 }} />
            <span className="aula-nav-text">Actividades</span>
          </NavLink>

          <NavLink
            to="/aula/juegos"
            className={({ isActive }) => `aula-nav-link ${isActive ? 'active' : ''}`}
            title="Juegos Interactivos"
          >
            <Gamepad2 size={15} style={{ flexShrink: 0 }} />
            <span className="aula-nav-text">Juegos</span>
          </NavLink>

          <NavLink
            to="/aula/entrenamiento"
            className={({ isActive }) => `aula-nav-link ${isActive ? 'active' : ''}`}
            title="Reentrenamiento"
          >
            <RefreshCw size={15} style={{ flexShrink: 0 }} />
            <span className="aula-nav-text">Reentrenar</span>
          </NavLink>

          <NavLink
            to="/aula/perfil"
            className={({ isActive }) => `aula-nav-link ${isActive ? 'active' : ''}`}
            title="Mi Perfil"
          >
            <User size={15} style={{ flexShrink: 0 }} />
            <span className="aula-nav-text">Mi Perfil</span>
          </NavLink>
        </nav>

        {/* User Badge & Actions con altura uniforme de 40px */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
          <button
            type="button"
            onClick={toggleTheme}
            className="aula-action-btn"
            style={{ width: '40px', padding: 0 }}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <LanguageSelector variant="compact" />

          <div className="aula-user-pill">
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
            className="aula-btn-logout"
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
