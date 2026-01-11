import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTecnico } from '../../contexts/TecnicoAuthContext'
import './LoginTecnico.css'

export default function LoginTecnico() {
  const navigate = useNavigate()
  const { login, isAuthenticated, loading: authLoading } = useTecnico()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/tecnico/dashboard')
    }
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const result = await login(formData.email, formData.password)

      if (result.success) {
        navigate('/tecnico/dashboard')
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

  if (authLoading) {
    return (
      <div className="login-tecnico-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="login-tecnico-container">
      <div className="login-background">
        <div className="bg-circle bg-circle-1"></div>
        <div className="bg-circle bg-circle-2"></div>
        <div className="bg-circle bg-circle-3"></div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="login-logo">
            <span className="logo-drop">💧</span>
          </div>
          <h1>JahekaY</h1>
          <p className="login-subtitle">Portal del Técnico</p>
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
              <span className="input-icon">📧</span>
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
              <span className="input-icon">🔒</span>
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
                Iniciando sesión...
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
          <p>¿Olvidaste tu contraseña?</p>
          <p className="footer-hint">Contacta al administrador del sistema</p>
        </div>
      </div>

      <div className="login-info">
        <p>Sistema de Gestión de Agua Potable</p>
        <p className="version">Portal Técnico v1.0</p>
      </div>
    </div>
  )
}
