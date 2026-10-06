import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { token, role, logout } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // Si el usuario no tiene el rol de admin (ej. token antiguo de 'user'), cerrar sesión y redirigir
    logout();
    return <Navigate to="/login" state={{ from: location, error: 'Acceso exclusivo para el Administrador / Investigador.' }} replace />;
  }

  return children;
}

