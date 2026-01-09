import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './services/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { ClienteAuthProvider, useCliente } from './contexts/ClienteAuthContext'
import PortalLayout from './layouts/PortalLayout'
import LoginCliente from './pages/portal/LoginCliente'
import DashboardCliente from './pages/portal/DashboardCliente'
import ReclamosCliente from './pages/portal/ReclamosCliente'
import EstadoCuenta from './pages/portal/EstadoCuenta'
import HistorialPagos from './pages/portal/HistorialPagos'
import MiConsumo from './pages/portal/MiConsumo'
import { initPWA } from './registerSW'
import './App.css'

// Componente protegido para rutas del portal del cliente
function ProtectedPortalRoute({ children }) {
  const { isAuthenticated, loading } = useCliente()

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-logo">JahekaY</div>
        <div className="spinner spinner-lg"></div>
        <p className="loading-text">Cargando...</p>
      </div>
    )
  }

  return isAuthenticated ? children : <Navigate to="/portal-cliente/login" />
}

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    // Inicializar PWA
    initPWA()

    return () => subscription.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-logo">JahekaY</div>
        <div className="spinner spinner-lg"></div>
        <p className="loading-text">Cargando sistema...</p>
      </div>
    )
  }

  return (
    <Router>
      <Routes>
        {/* Rutas Administrativas */}
        <Route
          path="/login"
          element={!session ? <Login /> : <Navigate to="/dashboard" />}
        />
        <Route
          path="/dashboard"
          element={session ? <Dashboard /> : <Navigate to="/login" />}
        />

        {/* Rutas del Portal del Cliente */}
        <Route
          path="/portal-cliente/login"
          element={
            <ClienteAuthProvider>
              <LoginCliente />
            </ClienteAuthProvider>
          }
        />
        <Route
          path="/portal-cliente"
          element={
            <ClienteAuthProvider>
              <ProtectedPortalRoute>
                <PortalLayout />
              </ProtectedPortalRoute>
            </ClienteAuthProvider>
          }
        >
          <Route index element={<Navigate to="/portal-cliente/dashboard" />} />
          <Route path="dashboard" element={<DashboardCliente />} />
          <Route path="reclamos" element={<ReclamosCliente />} />
          <Route path="estado-cuenta" element={<EstadoCuenta />} />
          <Route path="historial-pagos" element={<HistorialPagos />} />
          <Route path="mi-consumo" element={<MiConsumo />} />
        </Route>

        {/* Ruta por defecto */}
        <Route
          path="/"
          element={<Navigate to={session ? "/dashboard" : "/login"} />}
        />
      </Routes>
    </Router>
  )
}

export default App
