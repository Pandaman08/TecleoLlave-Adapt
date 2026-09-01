import { Routes, Route, NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from './context/ThemeContext';

import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';

function App() {
  const { t, i18n } = useTranslation();
  const { theme, toggleTheme } = useTheme();

  const changeLanguage = (e) => {
    i18n.changeLanguage(e.target.value);
  };

  return (
    <div className="app-layout">
      {/* Top Fixed/Sticky Glassmorphic Header */}
      <header className="main-header">
        <div className="header-container">
          <div className="navbar-brand">
            <div className="brand-icon">TK</div>
            <div>
              <div className="brand-title">{t('app.title')}</div>
              <div className="brand-subtitle">{t('app.subtitle')}</div>
            </div>
          </div>

          <nav className="nav-links">
            <NavLink to="/" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              {t('nav.dashboard')}
            </NavLink>
            <NavLink to="/register" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              {t('nav.register')}
            </NavLink>
            <NavLink to="/login" className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}>
              {t('nav.login')}
            </NavLink>
          </nav>

          <div className="navbar-actions">
            {/* Theme Toggle */}
            <button className="btn-theme-toggle" onClick={toggleTheme} title="Cambiar Tema Oscuro / Claro">
              {theme === 'dark' ? '☀️ Claro' : '🌙 Oscuro'}
            </button>

            {/* Language Selector */}
            <div className="lang-selector-wrapper">
              <select className="select-control lang-select" value={i18n.language} onChange={changeLanguage}>
                <option value="es">🇪🇸 ES</option>
                <option value="en">🇬🇧 EN</option>
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;