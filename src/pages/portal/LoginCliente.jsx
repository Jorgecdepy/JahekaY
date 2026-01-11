import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { useClienteAuth } from '../../contexts/ClienteAuthContext'
import './LoginCliente.css'

function LoginCliente() {
  const navigate = useNavigate()
  const { login } = useClienteAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    numero_medidor: '',
    codigo_pin: ''
  })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      // Autenticar cliente
      const { data, error } = await supabase.rpc('autenticar_cliente', {
        p_numero_medidor: formData.numero_medidor,
        p_codigo_pin: formData.codigo_pin
      })

      if (error) throw error

      if (data && data.exito) {
        // Guardar sesión
        login(data.cliente)
        navigate('/portal-cliente/dashboard')
      } else if (data) {
        setError(data.mensaje || 'Error al iniciar sesión')
      } else {
        setError('Error al iniciar sesión. Respuesta inválida del servidor.')
      }
    } catch (error) {
      console.error('Error:', error)
      setError('Error al iniciar sesión. Verifica tus credenciales.')
    }

    setLoading(false)
  }

  return (
    <div className="login-cliente-container">
      <div className="login-cliente-card">
        <div className="login-cliente-header">
          <div className="login-cliente-logo">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
            </svg>
          </div>
          <h1>Portal del Cliente</h1>
          <p>Sistema JahekaY</p>
        </div>

        <form onSubmit={handleSubmit} className="login-cliente-form">
          <div className="form-group">
            <label htmlFor="numero_medidor">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="16"></line>
                <line x1="8" y1="12" x2="16" y2="12"></line>
              </svg>
              Número de Medidor
            </label>
            <input
              id="numero_medidor"
              type="text"
              value={formData.numero_medidor}
              onChange={(e) => setFormData({ ...formData, numero_medidor: e.target.value })}
              placeholder="Ejemplo: 001234"
              required
              autoComplete="off"
            />
          </div>

          <div className="form-group">
            <label htmlFor="codigo_pin">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
              </svg>
              Código PIN
            </label>
            <input
              id="codigo_pin"
              type="password"
              value={formData.codigo_pin}
              onChange={(e) => setFormData({ ...formData, codigo_pin: e.target.value })}
              placeholder="••••••"
              maxLength="6"
              required
              autoComplete="off"
            />
            <small className="form-hint">
              Si no conoces tu PIN, contacta con la administración
            </small>
          </div>

          {error && (
            <div className="login-error">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="12" y1="8" x2="12" y2="12"></line>
                <line x1="12" y1="16" x2="12.01" y2="16"></line>
              </svg>
              {error}
            </div>
          )}

          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? (
              <>
                <span className="spinner"></span>
                Ingresando...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                  <polyline points="10 17 15 12 10 7"></polyline>
                  <line x1="15" y1="12" x2="3" y2="12"></line>
                </svg>
                Ingresar
              </>
            )}
          </button>
        </form>

        <div className="login-cliente-footer">
          <p>¿Necesitas ayuda?</p>
          <p>Contacta con la administración</p>
        </div>
      </div>

      <div className="login-cliente-bg">
        <div className="login-bg-circle login-bg-circle-1"></div>
        <div className="login-bg-circle login-bg-circle-2"></div>
        <div className="login-bg-circle login-bg-circle-3"></div>
      </div>
    </div>
  )
}

export default LoginCliente
