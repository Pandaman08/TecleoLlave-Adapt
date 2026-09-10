import { Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Register from './pages/Register';
import LiveDemo from './pages/LiveDemo';
import TrainProfile from './pages/TrainProfile';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/entrenamiento"
        element={
          <ProtectedRoute allowedRoles={['user']}>
            <TrainProfile />
          </ProtectedRoute>
        }
      />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/live-demo" element={<LiveDemo />} />
    </Routes>
  );
}