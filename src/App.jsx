import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './services/supabase'
import Dashboard from './pages/Dashboard'
import { ClienteAuthProvider, useCliente } from './contexts/ClienteAuthContext'
import { EmpleadoAuthProvider, useEmpleado } from './contexts/EmpleadoAuthContext'
import PortalLayout from './layouts/PortalLayout'
import LectoristaLayout from './layouts/LectoristaLayout'
import TecnicoLayout from './layouts/TecnicoLayout'
import LoginCliente from './pages/portal/LoginCliente'
import LoginEmpleado from './pages/LoginEmpleado'
import DashboardLectorista from './pages/lectorista/DashboardLectorista'
import DashboardTecnico from './pages/tecnico/DashboardTecnico'
import CargarLectura from './pages/lectorista/CargarLectura'
import MisLecturas from './pages/lectorista/MisLecturas'
import BuscarCliente from './pages/lectorista/BuscarCliente'
import ReclamosAsignados from './pages/tecnico/ReclamosAsignados'
import NotificacionesAdmin from './pages/tecnico/NotificacionesAdmin'
import MapaZonas from './pages/tecnico/MapaZonas'
import DashboardCliente from './pages/portal/DashboardCliente'
import ReclamosCliente from './pages/portal/ReclamosCliente'
import EstadoCuenta from './pages/portal/EstadoCuenta'
import HistorialPagos from './pages/portal/HistorialPagos'
import MiConsumo from './pages/portal/MiConsumo'
import NotFound from './pages/NotFound'
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

// Componente protegido para rutas de empleados (admin, operadores, cajeros)
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
    return <Navigate to="/login" />
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
    return <Navigate to="/login" />
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

// Componente protegido para rutas del técnico (usa EmpleadoAuthContext)
function ProtectedTecnicoRoute({ children }) {
  const { empleado, rol, loading } = useEmpleado()

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
    return <Navigate to="/login" />
  }

  // Verificar que sea técnico
  const rolNombre = rol?.nombre || empleado.rol_nombre || ''
  const esTecnico = rolNombre.toLowerCase().includes('tecnic') ||
                    rolNombre.toLowerCase().includes('técnic')

  if (!esTecnico) {
    return (
      <div className="access-denied">
        <h2>Acceso Denegado</h2>
        <p>Solo los técnicos pueden acceder a este portal</p>
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
          {/* ============================================
              LOGIN UNIFICADO DE EMPLEADOS
              Todas las rutas de login de empleados redirigen aquí
              ============================================ */}
          <Route
            path="/login"
            element={
              <EmpleadoAuthProvider>
                <LoginEmpleado />
              </EmpleadoAuthProvider>
            }
          />

          {/* Redirecciones de logins antiguos al login unificado */}
          <Route path="/empleado/login" element={<Navigate to="/login" replace />} />
          <Route path="/lectorista/login" element={<Navigate to="/login" replace />} />
          <Route path="/tecnico/login" element={<Navigate to="/login" replace />} />

          {/* ============================================
              RUTAS DEL PANEL ADMINISTRATIVO
              Para: Admin, Gerente, Supervisor, Operador, Cajero
              ============================================ */}
          <Route
            path="/dashboard"
            element={
              <EmpleadoAuthProvider>
                <ProtectedEmpleadoRoute>
                  <Dashboard />
                </ProtectedEmpleadoRoute>
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

          {/* ============================================
              PORTAL DEL CLIENTE (Login separado)
              ============================================ */}
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

          {/* ============================================
              PORTAL DEL LECTORISTA
              Acceso mediante login unificado
              ============================================ */}
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

          {/* ============================================
              PORTAL DEL TÉCNICO
              Acceso mediante login unificado
              ============================================ */}
          <Route
            path="/tecnico"
            element={
              <EmpleadoAuthProvider>
                <ProtectedTecnicoRoute>
                  <TecnicoLayout />
                </ProtectedTecnicoRoute>
              </EmpleadoAuthProvider>
            }
          >
            <Route index element={<Navigate to="/tecnico/dashboard" />} />
            <Route path="dashboard" element={<DashboardTecnico />} />
            <Route path="reclamos" element={<ReclamosAsignados />} />
            <Route path="notificaciones" element={<NotificacionesAdmin />} />
            <Route path="mapa" element={<MapaZonas />} />
          </Route>

          {/* ============================================
              RUTA POR DEFECTO
              ============================================ */}
          <Route
            path="/"
            element={<Navigate to="/login" />}
          />

          {/* Página 404 para rutas no encontradas */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </ToastProvider>
  )
}

export default App
