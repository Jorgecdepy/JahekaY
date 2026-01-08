import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Modal from '../components/Modal'
import './Facturas.css'
import FormularioFactura from '../components/FormularioFactura'

function Facturas() {
  const [facturas, setFacturas] = useState([])
  const [lecturas, setLecturas] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    
    // Cargar facturas con información del cliente
    const { data: facturasData, error: facturasError } = await supabase
      .from('facturas')
      .select(`
        *,
        usuarios (
          nombre_completo,
          numero_medidor,
          cedula,
          direccion
        ),
        lecturas (
          lectura_anterior,
          lectura_actual,
          consumo_m3
        )
      `)
      .order('fecha_emision', { ascending: false })

    // Cargar lecturas sin factura
    const { data: lecturasData, error: lecturasError } = await supabase
      .from('lecturas')
      .select(`
        *,
        usuarios (
          nombre_completo,
          numero_medidor,
          cedula
        )
      `)
      .is('id', null)
      .order('fecha_lectura', { ascending: false })

    if (facturasError) {
      console.error('Error:', facturasError)
    } else {
      setFacturas(facturasData || [])
    }

    if (lecturasError) {
      console.error('Error:', lecturasError)
    } else {
      setLecturas(lecturasData || [])
    }

    setLoading(false)
  }

  const handleSuccess = () => {
    setIsModalOpen(false)
    cargarDatos()
  }

  const marcarComoPagada = async (facturaId) => {
    const { error } = await supabase
      .from('facturas')
      .update({ 
        estado: 'pagada',
        fecha_pago: new Date().toISOString().split('T')[0]
      })
      .eq('id', facturaId)

    if (error) {
      console.error('Error:', error)
      alert('Error al actualizar la factura')
    } else {
      cargarDatos()
    }
  }

  const facturasFiltradas = facturas.filter(factura => {
    const coincideBusqueda = factura.usuarios?.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      factura.usuarios?.numero_medidor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      factura.usuarios?.cedula.includes(searchTerm)
    
    const coincideEstado = filtroEstado === 'todos' || factura.estado === filtroEstado

    return coincideBusqueda && coincideEstado
  })

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-PY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0
    }).format(monto)
  }

  const getEstadoColor = (estado) => {
    switch(estado) {
      case 'pagada': return '#27ae60'
      case 'vencida': return '#e74c3c'
      case 'pendiente': return '#f39c12'
      default: return '#95a5a6'
    }
  }

  const totalPendiente = facturas
    .filter(f => f.estado === 'pendiente')
    .reduce((sum, f) => sum + parseFloat(f.total), 0)

  const totalPagado = facturas
    .filter(f => f.estado === 'pagada')
    .reduce((sum, f) => sum + parseFloat(f.total), 0)

  if (loading) {
    return <div className="loading-container">Cargando facturas...</div>
  }

  return (
    <div className="facturas-container">
      <div className="facturas-header">
        <h2>Gestión de Facturas</h2>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          + Generar Factura
        </button>
      </div>

      <div className="filtros-bar">
        <input
          type="text"
          placeholder="Buscar por nombre, cédula o medidor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        
        <select 
          value={filtroEstado} 
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="filtro-select"
        >
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="pagada">Pagadas</option>
          <option value="vencida">Vencidas</option>
        </select>
      </div>

      <div className="facturas-stats">
        <div className="stat-card">
          <p className="stat-label">Total Facturas</p>
          <p className="stat-value">{facturas.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Pendientes</p>
          <p className="stat-value">{facturas.filter(f => f.estado === 'pendiente').length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Por Cobrar</p>
          <p className="stat-value stat-money">{formatMonto(totalPendiente)}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Cobrado</p>
          <p className="stat-value stat-money">{formatMonto(totalPagado)}</p>
        </div>
      </div>

      <div className="facturas-table">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Medidor</th>
              <th>Periodo</th>
              <th>Consumo</th>
              <th>Total</th>
              <th>Emisión</th>
              <th>Vencimiento</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {facturasFiltradas.map((factura) => (
              <tr key={factura.id}>
                <td>{factura.usuarios?.nombre_completo}</td>
                <td><span className="medidor-badge">{factura.usuarios?.numero_medidor}</span></td>
                <td>{factura.periodo}</td>
                <td><span className="consumo-badge">{factura.consumo_m3} m³</span></td>
                <td className="monto-cell">{formatMonto(factura.total)}</td>
                <td>{formatFecha(factura.fecha_emision)}</td>
                <td>{formatFecha(factura.fecha_vencimiento)}</td>
                <td>
                  <span 
                    className="estado-badge" 
                    style={{ backgroundColor: getEstadoColor(factura.estado) }}
                  >
                    {factura.estado.toUpperCase()}
                  </span>
                </td>
                <td>
                  <button className="btn-action">Ver</button>
                  {factura.estado === 'pendiente' && (
                    <button 
                      className="btn-action btn-success"
                      onClick={() => marcarComoPagada(factura.id)}
                    >
                      Pagar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {facturasFiltradas.length === 0 && (
        <div className="no-results">
          No se encontraron facturas con ese criterio de búsqueda.
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Generar Factura"
      >
        <FormularioFactura 
         onSuccess={handleSuccess}
         onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  )
}

export default Facturas