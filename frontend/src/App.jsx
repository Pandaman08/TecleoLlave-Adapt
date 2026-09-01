import { Routes, Route, Link } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import Register from './pages/Register'
import Login from './pages/Login'

function App() {
  return (
    <div className="container">
      <header style={{ marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid #eee' }}>
        <h1>TECLEOLLAVE-ADAPT</h1>
        <p style={{ color: '#7f8c8d' }}>
          Protótipo académico - Autenticación adaptativa por dinámica de tecleo
        </p>
      </header>

      <nav style={{ marginBottom: '2rem' }}>
        <Link to="/" style={{ marginRight: '1rem' }}>Dashboard</Link>
        <Link to="/register" style={{ marginRight: '1rem' }}>Registro</Link>
        <Link to="/login" style={{ marginRight: '1rem' }}>Login</Link>
      </nav>

      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
      </Routes>

      <footer style={{ marginTop: '3rem', paddingTop: '1rem', borderTop: '1px solid #eee', color: '#7f8c8d', fontSize: '0.9rem' }}>
        <p>Fase 2: Captura de dinámica de tecleo</p>
      </footer>
    </div>
  )
}

export default App