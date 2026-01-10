import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './services/supabase'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import { ClienteAuthProvider, useCliente } from './contexts/ClienteAuthContext'
import { EmpleadoAuthProvider, useEmpleado } from './contexts/EmpleadoAuthContext'
import PortalLayout from './layouts/PortalLayout'
import LectoristaLayout from './layouts/LectoristaLayout'
import LoginCliente from './pages/portal/LoginCliente'
import LoginEmpleado from './pages/LoginEmpleado'
import LoginLectorista from './pages/lectorista/LoginLectorista'
import DashboardLectorista from './pages/lectorista/DashboardLectorista'
import CargarLectura from './pages/lectorista/CargarLectura'
import MisLecturas from './pages/lectorista/MisLecturas'
import BuscarCliente from './pages/lectorista/BuscarCliente'
import DashboardCliente from './pages/portal/DashboardCliente'
import ReclamosCliente from './pages/portal/ReclamosCliente'
import EstadoCuenta from './pages/portal/EstadoCuenta'
import HistorialPagos from './pages/portal/HistorialPagos'
import MiConsumo from './pages/portal/MiConsumo'
import { ToastProvider, OfflineIndicator } from './components/common'
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

// Componente protegido para rutas de empleados
function ProtectedEmpleadoRoute({ children, requiredModule, requiredPermiso }) {
  const { empleado, loading, tienePermiso, tieneAccesoModulo } = useEmpleado()

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-logo">JahekaY</div>
        <div className="spinner spinner-lg"></div>
        <p className="loading-text">Cargando permisos...</p>
      </div>
    )
  }

  if (!empleado) {
    return <Navigate to="/empleado/login" />
  }

  // Si se requiere un permiso específico, verificarlo
  if (requiredModule && requiredPermiso) {
    if (!tienePermiso(requiredModule, requiredPermiso)) {
      return (
        <div className="access-denied">
          <h2>Acceso Denegado</h2>
          <p>No tienes permisos para acceder a esta sección</p>
          <button onClick={() => window.history.back()}>Volver</button>
        </div>
      )
    }
  }

  // Si solo se requiere acceso al módulo (cualquier permiso)
  if (requiredModule && !requiredPermiso) {
    if (!tieneAccesoModulo(requiredModule)) {
      return (
        <div className="access-denied">
          <h2>Acceso Denegado</h2>
          <p>No tienes permisos para acceder a este módulo</p>
          <button onClick={() => window.history.back()}>Volver</button>
        </div>
      )
    }
  }

  return children
}

// Componente protegido para rutas del lectorista
function ProtectedLectoristaRoute({ children }) {
  const { empleado, loading, tienePermiso } = useEmpleado()

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-logo">JahekaY</div>
        <div className="spinner spinner-lg"></div>
        <p className="loading-text">Cargando...</p>
      </div>
    )
  }

  if (!empleado) {
    return <Navigate to="/lectorista/login" />
  }

  // Verificar permiso de lecturas
  if (!tienePermiso('lecturas', 'crear')) {
    return (
      <div className="access-denied">
        <h2>Acceso Denegado</h2>
        <p>No tienes permisos para acceder al portal de lecturas</p>
        <button onClick={() => window.history.back()}>Volver</button>
      </div>
    )
  }

  return children
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
    <ToastProvider>
      <Router>
        {/* Indicador global de conexión */}
        <OfflineIndicator />

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

          {/* Rutas de Empleados */}
          <Route
            path="/empleado/login"
            element={
              <EmpleadoAuthProvider>
                <LoginEmpleado />
              </EmpleadoAuthProvider>
            }
          />
          <Route
            path="/empleado/dashboard"
            element={
              <EmpleadoAuthProvider>
                <ProtectedEmpleadoRoute>
                  <Dashboard />
                </ProtectedEmpleadoRoute>
              </EmpleadoAuthProvider>
            }
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

          {/* Rutas del Portal del Lectorista */}
          <Route
            path="/lectorista/login"
            element={
              <EmpleadoAuthProvider>
                <LoginLectorista />
              </EmpleadoAuthProvider>
            }
          />
          <Route
            path="/lectorista"
            element={
              <EmpleadoAuthProvider>
                <ProtectedLectoristaRoute>
                  <LectoristaLayout />
                </ProtectedLectoristaRoute>
              </EmpleadoAuthProvider>
            }
          >
            <Route index element={<Navigate to="/lectorista/dashboard" />} />
            <Route path="dashboard" element={<DashboardLectorista />} />
            <Route path="cargar" element={<CargarLectura />} />
            <Route path="mis-lecturas" element={<MisLecturas />} />
            <Route path="buscar-cliente" element={<BuscarCliente />} />
          </Route>

          {/* Ruta por defecto */}
          <Route
            path="/"
            element={<Navigate to={session ? "/dashboard" : "/login"} />}
          />
        </Routes>
      </Router>
    </ToastProvider>
  )
}

export default App
