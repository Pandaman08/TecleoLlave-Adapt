import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import LiveDemo from './pages/LiveDemo';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './context/AuthContext';

// Mobile App y Observatorio Científico
import MobileAppContainer from './pages/mobile/MobileAppContainer';
import ObservatorioWeb from './pages/admin/ObservatorioWeb';

// Redirección inteligente de raíz: en APK móvil va directo a la app, en web solo a admin
function RootRedirect() {
  const { token, role } = useAuth();
  
  // Detección de entorno móvil nativo (Capacitor APK)
  const isCapacitorNative = (typeof window !== 'undefined' && Boolean(window.Capacitor?.isNativePlatform?.()));
  if (isCapacitorNative) {
    return <Navigate to="/mobile" replace />;
  }

  if (!token || role !== 'admin') return <Navigate to="/login" replace />;
  return <Navigate to="/admin" replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Redirección raíz inteligente */}
      <Route path="/" element={<RootRedirect />} />

      {/* ========================================================= */}
      {/* PLATAFORMA ADMINISTRATIVA E INVESTIGACIÓN (Solo Admin)    */}
      {/* ========================================================= */}
      {/* La vista principal del Administrador es el Observatorio Científico del Estudio */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ObservatorioWeb />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/observatorio"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ObservatorioWeb />
          </ProtectedRoute>
        }
      />
      <Route
        path="/observatorio"
        element={
          <ProtectedRoute allowedRoles={['admin']}>
            <ObservatorioWeb />
          </ProtectedRoute>
        }
      />

      {/* Consola Técnica y Benchmarking Histórico */}
      <Route
        path="/admin/telemetria"
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
      {/* APP MÓVIL Y SUITE APPLOCKER (Participantes / APK Test)    */}
      {/* ========================================================= */}
      <Route path="/mobile" element={<MobileAppContainer />} />
      <Route path="/mobile/*" element={<MobileAppContainer />} />
      <Route path="/simulador" element={<Navigate to="/mobile" replace />} />
      <Route path="/apk" element={<Navigate to="/mobile" replace />} />

      {/* ========================================================= */}
      {/* AUTENTICACIÓN ADMIN Y SUSTENTACIÓN                        */}
      {/* ========================================================= */}
      <Route path="/login" element={<Login />} />
      <Route path="/live-demo" element={<LiveDemo />} />

      {/* Redirecciones fallback */}
      <Route path="/aula/*" element={<Navigate to="/admin" replace />} />
      <Route path="/entrenamiento" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<RootRedirect />} />
    </Routes>
  );
}