import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { authStore } from '@/stores/authStore'
import { gotrue } from '@/lib/gotrue'
import MapPage from '@/pages/MapPage'
import LoginPage from '@/components/auth/LoginPage'
import AdminLayout from '@/pages/admin/AdminLayout'
import LayerConfigPage from '@/pages/admin/LayerConfigPage'
import BasemapPage from '@/pages/admin/BasemapPage'
import AppConfigPage from '@/pages/admin/AppConfigPage'
import AuthProvidersPage from '@/pages/admin/AuthProvidersPage'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, loading } = authStore()

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-950">
        <div className="w-6 h-6 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

export default function App() {
  const { setSession } = authStore()

  // Bootstrap auth session and listen to GoTrue events
  useEffect(() => {
    gotrue.getSession().then(({ data }) => setSession(data.session))

    const { data: listener } = gotrue.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => listener.subscription.unsubscribe()
  }, [setSession])

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={
            authStore.getState().session
              ? <Navigate to="/" replace />
              : <LoginPage />
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="layers" replace />} />
          <Route path="layers"  element={<LayerConfigPage />} />
          <Route path="basemaps" element={<BasemapPage />} />
          <Route path="config"  element={<AppConfigPage />} />
          <Route path="auth"    element={<AuthProvidersPage />} />
        </Route>
        <Route
          path="/*"
          element={
            <ProtectedRoute>
              <MapPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
