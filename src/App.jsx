import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import AdminLogin from './pages/AdminLogin'
import AdminDashboard from './pages/AdminDashboard'
import ClientMenu from './pages/ClientMenu'
import LoadingSpinner from './components/shared/LoadingSpinner'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner text="Verificando sesión..." />
  if (!user) return <Navigate to="/admin" replace />
  return children
}

function PublicAdminRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return <LoadingSpinner />
  if (user) return <Navigate to="/admin/dashboard" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Cliente: acceso por QR */}
      <Route path="/menu/:tableId" element={<ClientMenu />} />

      {/* Admin: login */}
      <Route path="/admin" element={
        <PublicAdminRoute>
          <AdminLogin />
        </PublicAdminRoute>
      } />

      {/* Admin: panel (rutas anidadas manejadas adentro) */}
      <Route path="/admin/*" element={
        <ProtectedRoute>
          <AdminDashboard />
        </ProtectedRoute>
      } />

      {/* Redirección raíz */}
      <Route path="/" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <HashRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </HashRouter>
  )
}
