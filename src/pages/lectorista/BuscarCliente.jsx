import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import './BuscarCliente.css'

export default function BuscarCliente() {
  const navigate = useNavigate()
  const [busqueda, setBusqueda] = useState('')
  const [clientes, setClientes] = useState([])
  const [clienteDetalle, setClienteDetalle] = useState(null)
  const [loading, setLoading] = useState(false)
  const [loadingDetalle, setLoadingDetalle] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      if (busqueda.length >= 2) {
        buscarClientes()
      } else {
        setClientes([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [busqueda])

  const buscarClientes = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('buscar_clientes_lectura', {
        p_busqueda: busqueda
      })

      if (!error && data) {
        setClientes(data)
      }
    } catch (error) {
      console.error('Error:', error)
    }
    setLoading(false)
  }

  const verDetalleCliente = async (cliente) => {
    setLoadingDetalle(true)
    setClienteDetalle(null)

    try {
      // Cargar detalles del cliente con sus últimas lecturas
      const { data, error } = await supabase.rpc('obtener_detalle_cliente_lectura', {
        p_cliente_id: cliente.id
      })

      if (!error && data) {
        setClienteDetalle(data)
      }
    } catch (error) {
      console.error('Error:', error)
    }
    setLoadingDetalle(false)
  }

  const cerrarDetalle = () => {
    setClienteDetalle(null)
  }

  const irACargarLectura = (clienteId) => {
    navigate('/lectorista/cargar', { state: { clienteId } })
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A'
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  return (
    <div className="buscar-cliente-container">
      <div className="page-header">
        <h1>🔍 Buscar Cliente</h1>
        <p>Consulta información de clientes</p>
      </div>

      {/* Buscador */}
      <div className="search-section">
        <div className="search-box">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            placeholder="Nombre, medidor o dirección..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            autoFocus
          />
          {loading && <span className="search-spinner"></span>}
          {busqueda && (
            <button className="search-clear" onClick={() => setBusqueda('')}>
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Resultados */}
      <div className="resultados-section">
        {busqueda.length < 2 ? (
          <div className="hint-state">
            <span className="hint-icon">💡</span>
            <p>Escribe al menos 2 caracteres para buscar</p>
          </div>
        ) : clientes.length === 0 && !loading ? (
          <div className="empty-state">
            <span className="empty-icon">😕</span>
            <p>No se encontraron clientes</p>
          </div>
        ) : (
          <div className="clientes-list">
            {clientes.map((cliente) => (
              <div
                key={cliente.id}
                className="cliente-card"
                onClick={() => verDetalleCliente(cliente)}
              >
                <div className="cliente-card-header">
                  <div className="cliente-avatar">
                    <span>👤</span>
                  </div>
                  <div className="cliente-info">
                    <span className="cliente-nombre">{cliente.nombre_completo}</span>
                    <span className="cliente-direccion">📍 {cliente.direccion}</span>
                  </div>
                </div>
                <div className="cliente-card-footer">
                  <div className="medidor-info">
                    <span className="medidor-label">Medidor</span>
                    <span className="medidor-valor">{cliente.numero_medidor}</span>
                  </div>
                  <span className="ver-mas">Ver más →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Detalle Cliente */}
      {(clienteDetalle || loadingDetalle) && (
        <div className="modal-overlay" onClick={cerrarDetalle}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            {loadingDetalle ? (
              <div className="loading-detalle">
                <div className="spinner"></div>
                <p>Cargando información...</p>
              </div>
            ) : clienteDetalle && (
              <>
                <div className="modal-header">
                  <h2>Información del Cliente</h2>
                  <button className="btn-close" onClick={cerrarDetalle}>✕</button>
                </div>

                <div className="modal-body">
                  {/* Info Principal */}
                  <div className="detalle-section">
                    <div className="cliente-detalle-header">
                      <div className="cliente-avatar-large">👤</div>
                      <div className="cliente-detalle-info">
                        <h3>{clienteDetalle.nombre_completo}</h3>
                        <p className="cliente-detalle-direccion">
                          📍 {clienteDetalle.direccion}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Datos del Medidor */}
                  <div className="detalle-section">
                    <h4>Datos del Medidor</h4>
                    <div className="datos-grid">
                      <div className="dato-item">
                        <span className="dato-label">Número</span>
                        <span className="dato-valor">{clienteDetalle.numero_medidor}</span>
                      </div>
                      <div className="dato-item">
                        <span className="dato-label">Estado</span>
                        <span className={`estado-badge ${clienteDetalle.activo ? 'activo' : 'inactivo'}`}>
                          {clienteDetalle.activo ? 'Activo' : 'Inactivo'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Última Lectura */}
                  <div className="detalle-section">
                    <h4>Última Lectura</h4>
                    {clienteDetalle.ultima_lectura ? (
                      <div className="ultima-lectura-card">
                        <div className="lectura-dato-large">
                          <span className="lectura-valor-large">
                            {clienteDetalle.ultima_lectura.lectura_actual} m³
                          </span>
                          <span className="lectura-fecha-large">
                            {formatDate(clienteDetalle.ultima_lectura.fecha_lectura)}
                          </span>
                        </div>
                        <div className="consumo-info">
                          <span className="consumo-label">Consumo:</span>
                          <span className="consumo-valor">
                            {clienteDetalle.ultima_lectura.consumo_m3} m³
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="sin-lectura">Sin lecturas registradas</p>
                    )}
                  </div>

                  {/* Historial de Consumo */}
                  {clienteDetalle.historial_lecturas && clienteDetalle.historial_lecturas.length > 0 && (
                    <div className="detalle-section">
                      <h4>Últimas Lecturas</h4>
                      <div className="historial-mini">
                        {clienteDetalle.historial_lecturas.slice(0, 5).map((lectura, index) => (
                          <div key={index} className="historial-item">
                            <span className="historial-fecha">
                              {formatDate(lectura.fecha_lectura)}
                            </span>
                            <span className="historial-lectura">
                              {lectura.lectura_actual} m³
                            </span>
                            <span className="historial-consumo">
                              +{lectura.consumo_m3}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Contacto */}
                  {(clienteDetalle.telefono || clienteDetalle.email) && (
                    <div className="detalle-section">
                      <h4>Contacto</h4>
                      <div className="contacto-info">
                        {clienteDetalle.telefono && (
                          <p>📞 {clienteDetalle.telefono}</p>
                        )}
                        {clienteDetalle.email && (
                          <p>📧 {clienteDetalle.email}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div className="modal-footer">
                  <button className="btn-secondary" onClick={cerrarDetalle}>
                    Cerrar
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => irACargarLectura(clienteDetalle.id)}
                  >
                    📝 Cargar Lectura
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
