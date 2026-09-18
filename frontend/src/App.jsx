import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import LiveDemo from './pages/LiveDemo';
import TrainProfile from './pages/TrainProfile';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

// Pages del Aula Virtual
import AulaDashboard from './pages/aula/AulaDashboard';
import ActividadesEscritura from './pages/aula/ActividadesEscritura';
import JuegoMario30 from './pages/aula/JuegoMario30';
import JuegoAjedrez from './pages/aula/JuegoAjedrez';
import PerfilEstudiante from './pages/aula/PerfilEstudiante';

// Componente de Redirección Raíz Inteligente según Rol
function RootRedirect() {
  const { token, role } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  if (role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/aula" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Redirección inteligente de raíz */}
      <Route path="/" element={<RootRedirect />} />

      {/* ========================================================= */}
      {/* APLICACIÓN 1: AULA VIRTUAL (Estudiantes / Usuarios)       */}
      {/* ========================================================= */}
      <Route
        path="/aula"
        element={
          <ProtectedRoute allowedRoles={['user']}>
            <AulaDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/aula/actividades"
        element={
          <ProtectedRoute allowedRoles={['user']}>
            <ActividadesEscritura />
          </ProtectedRoute>
        }
      />
      <Route
        path="/aula/juegos"
        element={
          <ProtectedRoute allowedRoles={['user']}>
            <JuegoMario30 />
          </ProtectedRoute>
        }
      />
      <Route
        path="/aula/juego-mario"
        element={
          <ProtectedRoute allowedRoles={['user']}>
            <JuegoMario30 />
          </ProtectedRoute>
        }
      />
      <Route
        path="/aula/juego-ajedrez"
        element={
          <ProtectedRoute allowedRoles={['user']}>
            <JuegoAjedrez />
          </ProtectedRoute>
        }
      />
      <Route
        path="/aula/perfil"
        element={
          <ProtectedRoute allowedRoles={['user']}>
            <PerfilEstudiante />
          </ProtectedRoute>
        }
      />
      <Route
        path="/aula/entrenamiento"
        element={
          <ProtectedRoute allowedRoles={['user']}>
            <TrainProfile />
          </ProtectedRoute>
        }
      />

      {/* Compatibilidad previa */}
      <Route
        path="/entrenamiento"
        element={
          <ProtectedRoute allowedRoles={['user']}>
            <TrainProfile />
          </ProtectedRoute>
        }
      />

      {/* ========================================================= */}
      {/* APLICACIÓN 2: PANEL ADMINISTRATIVO (Investigación / Admin) */}
      {/* ========================================================= */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/dashboard" element={<Navigate to="/admin" replace />} />

      {/* ========================================================= */}
      {/* RUTAS PÚBLICAS Y SUSTENTACIÓN                             */}
      {/* ========================================================= */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/live-demo" element={<LiveDemo />} />

      {/* Wildcard fallback */}
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}