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
  Clock
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
      backgroundColor: 'var(--bg-surface)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div style={{
        maxWidth: '1280px',
        margin: '0 auto',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}>
        {/* Brand / Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, var(--brand-500), #6366f1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
          }}>
            <GraduationCap size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                Aula Virtual
              </span>
              <span style={{
                fontSize: '0.65rem',
                fontWeight: 700,
                padding: '0.15rem 0.45rem',
                borderRadius: '999px',
                backgroundColor: 'rgba(16, 185, 129, 0.15)',
                color: 'var(--success)',
                border: '1px solid rgba(16, 185, 129, 0.3)'
              }}>
                Biometría Activa
              </span>
            </div>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Campus Virtual — TecleoLlave-Adapt
            </span>
          </div>
        </div>

        {/* Navigation Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <NavLink
            to="/aula"
            end
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
            style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem', borderRadius: 'var(--radius-md)' }}
          >
            <BookOpen size={16} className="nav-icon" />
            <span className="nav-label">Mis Cursos</span>
          </NavLink>

          <NavLink
            to="/aula/actividades"
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
            style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem', borderRadius: 'var(--radius-md)' }}
          >
            <PenTool size={16} className="nav-icon" />
            <span className="nav-label">Actividades de Escritura</span>
          </NavLink>

          <NavLink
            to="/aula/juegos"
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
            style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem', borderRadius: 'var(--radius-md)' }}
          >
            <Gamepad2 size={16} className="nav-icon" />
            <span className="nav-label">Juegos Interactivos</span>
          </NavLink>

          <NavLink
            to="/aula/perfil"
            className={({ isActive }) => `sidebar-nav-item ${isActive ? 'active' : ''}`}
            style={{ padding: '0.5rem 0.85rem', fontSize: '0.82rem', borderRadius: 'var(--radius-md)' }}
          >
            <User size={16} className="nav-icon" />
            <span className="nav-label">Mi Perfil</span>
          </NavLink>
        </nav>

        {/* User Badge & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button
            type="button"
            onClick={toggleTheme}
            style={{
              padding: '0.45rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              background: 'var(--bg-canvas)',
              color: 'var(--text-secondary)',
              cursor: 'pointer'
            }}
            title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          <LanguageSelector />

          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            padding: '0.35rem 0.75rem',
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--bg-canvas)',
            border: '1px solid var(--border-subtle)'
          }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              backgroundColor: 'var(--brand-100)',
              color: 'var(--brand-700)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '0.8rem'
            }}>
              {username ? username.charAt(0).toUpperCase() : 'U'}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', lineHeight: 1.1 }}>
                {username || 'Estudiante'}
              </span>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>
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
              gap: '0.35rem',
              padding: '0.45rem 0.75rem',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-subtle)',
              backgroundColor: 'var(--bg-canvas)',
              color: 'var(--danger)',
              fontSize: '0.78rem',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            title="Cerrar sesión del aula"
          >
            <LogOut size={15} />
            <span>Salir</span>
          </button>
        </div>
      </div>
    </header>
  );
}
