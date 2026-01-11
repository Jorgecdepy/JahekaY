import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmpleado } from '../contexts/EmpleadoAuthContext'
import './LoginEmpleado.css'

// Mapeo de roles a rutas de destino
const RUTAS_POR_ROL = {
  'Administrador': '/empleado/dashboard',
  'Gerente': '/empleado/dashboard',
  'Supervisor': '/empleado/dashboard',
  'Operador': '/empleado/dashboard',
  'Cajero': '/empleado/dashboard',
  'Lectorista': '/lectorista/dashboard',
  'Técnico': '/tecnico/dashboard',
  'Tecnico': '/tecnico/dashboard', // Sin tilde por si acaso
}

// Iconos por rol para mostrar en el mensaje de bienvenida
const ICONOS_ROL = {
  'Administrador': '👔',
  'Gerente': '📊',
  'Supervisor': '📋',
  'Operador': '💻',
  'Cajero': '💰',
  'Lectorista': '📝',
  'Técnico': '🔧',
  'Tecnico': '🔧',
}

export default function LoginEmpleado() {
  const navigate = useNavigate()
  const { login, empleado, rol, isAuthenticated, loading: authLoading } = useEmpleado()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [loginExitoso, setLoginExitoso] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (isAuthenticated && empleado && rol) {
      const rolNombre = rol.nombre || empleado.rol_nombre
      const rutaDestino = obtenerRutaPorRol(rolNombre)
      navigate(rutaDestino)
    }
  }, [isAuthenticated, empleado, rol, navigate])

  const obtenerRutaPorRol = (rolNombre) => {
    // Buscar la ruta correspondiente al rol
    const ruta = RUTAS_POR_ROL[rolNombre]
    if (ruta) return ruta

    // Si no se encuentra el rol exacto, buscar coincidencias parciales
    const rolLower = rolNombre?.toLowerCase() || ''
    if (rolLower.includes('admin') || rolLower.includes('gerente')) {
      return '/empleado/dashboard'
    }
    if (rolLower.includes('lector')) {
      return '/lectorista/dashboard'
    }
    if (rolLower.includes('tecnic') || rolLower.includes('técnic')) {
      return '/tecnico/dashboard'
    }

    // Por defecto, ir al dashboard de empleados
    return '/empleado/dashboard'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await login(formData.email, formData.password)

      if (result.success) {
        setLoginExitoso(true)
        // La redirección se manejará en el useEffect cuando se carguen los datos del empleado
      } else {
        setError(result.error || 'Email o contraseña incorrectos')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Error al iniciar sesión. Intenta nuevamente.')
    }

    setLoading(false)
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  // Mostrar loading mientras se verifica la sesión
  if (authLoading) {
    return (
      <div className="login-empleado-container">
        <div className="login-circles">
          <div className="circle circle-1"></div>
          <div className="circle circle-2"></div>
          <div className="circle circle-3"></div>
        </div>
        <div className="login-card">
          <div className="login-loading">
            <div className="spinner-large"></div>
            <p>Verificando sesión...</p>
          </div>
        </div>
      </div>
    )
  }

  // Mostrar mensaje de bienvenida mientras se redirige
  if (loginExitoso && empleado) {
    const rolNombre = rol?.nombre || empleado.rol_nombre || 'Empleado'
    const icono = ICONOS_ROL[rolNombre] || '👤'

    return (
      <div className="login-empleado-container">
        <div className="login-circles">
          <div className="circle circle-1"></div>
          <div className="circle circle-2"></div>
          <div className="circle circle-3"></div>
        </div>
        <div className="login-card">
          <div className="login-success">
            <div className="success-icon">{icono}</div>
            <h2>Bienvenido/a</h2>
            <p className="success-name">{empleado.nombre_completo}</p>
            <p className="success-rol">{rolNombre}</p>
            <div className="spinner-small"></div>
            <p className="success-redirect">Redirigiendo a tu panel...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="login-empleado-container">
      <div className="login-circles">
        <div className="circle circle-1"></div>
        <div className="circle circle-2"></div>
        <div className="circle circle-3"></div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"/>
            </svg>
          </div>
          <h1>JahekaY</h1>
          <p>Sistema de Gestión</p>
        </div>

        <div className="login-roles-info">
          <div className="roles-grid">
            <span title="Administrador">👔</span>
            <span title="Lectorista">📝</span>
            <span title="Técnico">🔧</span>
            <span title="Cajero">💰</span>
          </div>
          <p>Acceso unificado para todo el personal</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                  <polyline points="22,6 12,13 2,6"></polyline>
                </svg>
              </span>
              <input
                type="email"
                id="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="tu@email.com"
                required
                autoComplete="email"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <div className="input-wrapper">
              <span className="input-icon">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                </svg>
              </span>
              <input
                type="password"
                id="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                autoComplete="current-password"
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-login"
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Verificando credenciales...
              </>
            ) : (
              <>
                <span>🔐</span>
                Iniciar Sesión
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>¿Olvidaste tu contraseña? Contacta al administrador</p>
          <div className="login-divider"></div>
          <a href="/portal-cliente/login" className="link-secondary">
            ¿Eres cliente? Ingresa aquí
          </a>
        </div>
      </div>

      <div className="login-info">
        <p>Sistema de Gestión de Agua Potable</p>
        <p className="version">v2.0.0</p>
      </div>
    </div>
  )
}
