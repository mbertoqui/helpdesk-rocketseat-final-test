/**
 * Sistema HelpDesk - Aplicação Principal React
 * Desenvolvido por: Matheus Bertoqui
 * Data: 2026
 */

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './hooks/useAuth';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './components/Login';
import Register from './components/Register';

// Páginas dos diferentes usuários (serão criadas)
import AdminDashboard from './pages/admin/Dashboard';
import TechnicianDashboard from './pages/technician/Dashboard';
import ClientDashboard from './pages/client/Dashboard';

import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Rotas públicas */}
            <Route path="/" element={<Navigate to="/login" replace />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Área protegida e compartilhada */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/login" replace />} />

              {/* Rotas do Admin */}
              <Route path="admin" element={
                <ProtectedRoute allowedRoles={['ADMIN']}>
                  <AdminDashboard />
                </ProtectedRoute>
              } />
              
              {/* Rotas do Técnico */}
              <Route path="technician" element={
                <ProtectedRoute allowedRoles={['TECHNICIAN']}>
                  <TechnicianDashboard />
                </ProtectedRoute>
              } />
              
              {/* Rotas do Cliente */}
              <Route path="client" element={
                <ProtectedRoute allowedRoles={['CLIENT']}>
                  <ClientDashboard />
                </ProtectedRoute>
              } />
            </Route>
          </Routes>
          
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
            }}
          />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
