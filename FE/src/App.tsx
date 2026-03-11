import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import ProtectedRoute from '@/components/ProtectedRoute';

// Pages
import LoginPage from '@/pages/LoginPage';
import RegisterPage from '@/pages/RegisterPage';
import DashboardPage from '@/pages/DashboardPage';
import ReservasPage from '@/pages/ReservasPage';
import ClientesPage from '@/pages/ClientesPage';
import EventosPage from '@/pages/EventosPage';
import MantenimientoPage from '@/pages/MantenimientoPage';
import ReportesPage from '@/pages/ReportesPage';

// =============================================
// App Root
// =============================================

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <Routes>
            {/* Public */}
            <Route path="/login"    element={<LoginPage />} />
            <Route path="/registro" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password"  element={<ResetPassword />} /> 

            {/* Protected - All authenticated users */}
            <Route path="/reservas" element={
              <ProtectedRoute><ReservasPage /></ProtectedRoute>
            } />
            <Route path="/eventos" element={
              <ProtectedRoute><EventosPage /></ProtectedRoute>
            } />

            {/* Protected - Admin only */}
            <Route path="/dashboard" element={
              <ProtectedRoute requiredRole="admin"><DashboardPage /></ProtectedRoute>
            } />
            <Route path="/clientes" element={
              <ProtectedRoute requiredRole="admin"><ClientesPage /></ProtectedRoute>
            } />
            <Route path="/mantenimiento" element={
              <ProtectedRoute requiredRole="admin"><MantenimientoPage /></ProtectedRoute>
            } />
            <Route path="/reportes" element={
              <ProtectedRoute requiredRole="admin"><ReportesPage /></ProtectedRoute>
            } />

            {/* Redirect */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
