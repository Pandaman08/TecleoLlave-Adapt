import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { token, role } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    // Redirección estricta según rol para evitar bucles y separar Aula de Admin
    if (role === 'admin') {
      return <Navigate to="/admin" replace />;
    }
    return <Navigate to="/aula" replace />;
  }

  return children;
}
