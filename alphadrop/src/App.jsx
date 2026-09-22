import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext.jsx'
import AuthPage from './pages/AuthPage.jsx'
import AdminDashboardPage from './pages/AdminDashboardPage.jsx'
import AdminPackagesPage from './pages/AdminPackagesPage.jsx'
import AdminCategoriesPage from './pages/AdminCategoriesPage.jsx'
import AdminPaymentsPage from './pages/AdminPaymentsPage.jsx'
import AdminUploadPage from './pages/AdminUploadPage.jsx'
import UserOverviewPage from './pages/UserOverviewPage.jsx'
import UserSubscriberDataPage from './pages/UserSubscriberDataPage.jsx'
import UserOneTimeDataPage from './pages/UserOneTimeDataPage.jsx'
import UserPackagesPage from './pages/UserPackagesPage.jsx'
import UserPaymentsPage from './pages/UserPaymentsPage.jsx'
import PaymentPolicyPage from './pages/PaymentPolicyPage.jsx'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage.jsx'
import ContactPage from './pages/ContactPage.jsx'
import HomePage from './components/HomePage.jsx'
import { Footer } from './components/ui/Footer.jsx'

function AuthLoading() {
  return (
     <div className="flex min-h-screen items-center justify-center bg-slate-50" role="status" aria-label="Checking authentication">
      <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-100 border-t-blue-600" />
    </div>
  )
}

function PublicRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) return <AuthLoading />

  if (user) {
    return <Navigate to={user.role === 'ADMIN' ? '/admin/dashboard' : '/dashboard'} replace />
  }

  return children
}

function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth()

  if (loading) return <AuthLoading />

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
        <Route path="/" element={<HomePage />} />

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

      <Route path="/payment-policy" element={<PaymentPolicyPage />} />
      <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
      <Route path="/contact" element={<ContactPage />} />

      <Route
        path="/dashboard"
        element={
          <ProtectedRoute role="USER">
            <UserOverviewPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/subscriber-data"
        element={
          <ProtectedRoute role="USER">
            <UserSubscriberDataPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/dashboard/one-time-data"
        element={
          <ProtectedRoute role="USER">
            <UserOneTimeDataPage />
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
        path="/admin/categories"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminCategoriesPage />
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
      <Route
        path="/admin/upload-one-time"
        element={
          <ProtectedRoute role="ADMIN">
            <AdminUploadPage oneTimeOnly />
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
