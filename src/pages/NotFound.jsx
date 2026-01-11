import { Link, useNavigate } from 'react-router-dom'
import './NotFound.css'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="not-found-container">
      <div className="not-found-bg">
        <div className="bg-drop bg-drop-1">💧</div>
        <div className="bg-drop bg-drop-2">💧</div>
        <div className="bg-drop bg-drop-3">💧</div>
      </div>

      <div className="not-found-content">
        <div className="error-code">
          <span className="digit">4</span>
          <span className="digit-drop">💧</span>
          <span className="digit">4</span>
        </div>

        <h1>Página no encontrada</h1>
        <p>Lo sentimos, la página que buscas no existe o ha sido movida.</p>

        <div className="not-found-actions">
          <button onClick={() => navigate(-1)} className="btn-back">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="19" y1="12" x2="5" y2="12"></line>
              <polyline points="12 19 5 12 12 5"></polyline>
            </svg>
            Volver atrás
          </button>

          <Link to="/login" className="btn-home">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            Ir al inicio
          </Link>
        </div>

        <div className="not-found-links">
          <p>¿Buscabas alguno de estos?</p>
          <div className="quick-links">
            <Link to="/login">Iniciar sesión</Link>
            <Link to="/portal-cliente/login">Portal del cliente</Link>
          </div>
        </div>
      </div>

      <div className="not-found-footer">
        <p>Sistema JahekaY - Gestión de Agua Potable</p>
      </div>
    </div>
  )
}
