import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import AuthPage from './pages/AuthPage.jsx'
import AdminDashboardPage from './pages/AdminDashboardPage.jsx'
import AdminPackagesPage from './pages/AdminPackagesPage.jsx'
import AdminUsersPage from './pages/AdminUsersPage.jsx'
import AdminPaymentsPage from './pages/AdminPaymentsPage.jsx'
import AdminUploadPage from './pages/AdminUploadPage.jsx'
import UserDashboardPage from './pages/UserDashboardPage.jsx'
import UserPackagesPage from './pages/UserPackagesPage.jsx'
import UserPaymentsPage from './pages/UserPaymentsPage.jsx'
import { Footer } from './components/ui/Footer.jsx'

function PublicRoute({ children }) {
  const { user } = useAuth()

  if (user) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard'} replace />
  }

  return children
}

function ProtectedRoute({ children, role }) {
  const { user } = useAuth()

  if (!user) {
    return <Navigate to="/login" replace />
  }

  if (role && user.role !== role) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard'} replace />
  }

  return children
}

function App() {
  return (
    <>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />

      <Route
        path="/login"
        element={
          <PublicRoute>
            <AuthPage mode="login" />
          </PublicRoute>
        }
      />

      <Route
        path="/register"
        element={
          <PublicRoute>
            <AuthPage mode="register" />
          </PublicRoute>
        }
      />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute role="USER">
            <UserDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/packages"
        element={
          <ProtectedRoute role="USER">
            <UserPackagesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/payments"
        element={
          <ProtectedRoute role="USER">
            <UserPaymentsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminDashboardPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/packages"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminPackagesPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/users"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminUsersPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/payments"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminPaymentsPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/admin/upload"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminUploadPage />
          </ProtectedRoute>
        }
      />

        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <Footer />
    </>
  )
}

export default App
