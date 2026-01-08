import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Modal from '../components/Modal'
import FormularioFactura from '../components/FormularioFactura'
import './Facturas.css'

function Facturas() {
  const [facturas, setFacturas] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todos')

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)

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

    if (facturasError) {
      console.error('Error:', facturasError)
    } else {
      setFacturas(facturasData || [])
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
    const coincideBusqueda = factura.usuarios?.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      factura.usuarios?.numero_medidor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      factura.usuarios?.cedula?.includes(searchTerm)

    const coincideEstado = filtroEstado === 'todos' || factura.estado === filtroEstado

    return coincideBusqueda && coincideEstado
  })

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-PY', {
      year: 'numeric',
      month: 'short',
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

  const getEstadoClase = (estado) => {
    switch (estado) {
      case 'pagada': return 'badge-success'
      case 'vencida': return 'badge-danger'
      case 'pendiente': return 'badge-warning'
      default: return 'badge-secondary'
    }
  }

  const totalPendiente = facturas
    .filter(f => f.estado === 'pendiente')
    .reduce((sum, f) => sum + parseFloat(f.total || 0), 0)

  const totalPagado = facturas
    .filter(f => f.estado === 'pagada')
    .reduce((sum, f) => sum + parseFloat(f.total || 0), 0)

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner spinner-lg"></div>
        <p>Cargando facturas...</p>
      </div>
    )
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h2>Gestion de Facturas</h2>
          <p className="page-subtitle">Administra las facturas de consumo</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Generar Factura
        </button>
      </div>

      <div className="filters-section">
        <div className="search-box">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre, cedula o medidor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="filter-select"
        >
          <option value="todos">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="pagada">Pagadas</option>
          <option value="vencida">Vencidas</option>
        </select>
      </div>

      <div className="mini-stats">
        <div className="mini-stat">
          <span className="mini-stat-value">{facturas.length}</span>
          <span className="mini-stat-label">Total</span>
        </div>
        <div className="mini-stat">
          <span className="mini-stat-value text-warning">{facturas.filter(f => f.estado === 'pendiente').length}</span>
          <span className="mini-stat-label">Pendientes</span>
        </div>
        <div className="mini-stat">
          <span className="mini-stat-value text-warning mini-stat-money">{formatMonto(totalPendiente)}</span>
          <span className="mini-stat-label">Por Cobrar</span>
        </div>
        <div className="mini-stat">
          <span className="mini-stat-value text-success mini-stat-money">{formatMonto(totalPagado)}</span>
          <span className="mini-stat-label">Cobrado</span>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Medidor</th>
              <th>Periodo</th>
              <th>Consumo</th>
              <th>Total</th>
              <th>Emision</th>
              <th>Vencimiento</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {facturasFiltradas.map((factura) => (
              <tr key={factura.id}>
                <td className="td-name">{factura.usuarios?.nombre_completo}</td>
                <td><span className="badge badge-info">{factura.usuarios?.numero_medidor}</span></td>
                <td>{factura.periodo}</td>
                <td><span className="badge badge-success">{factura.consumo_m3} m3</span></td>
                <td className="td-money">{formatMonto(factura.total)}</td>
                <td>{formatFecha(factura.fecha_emision)}</td>
                <td>{formatFecha(factura.fecha_vencimiento)}</td>
                <td>
                  <span className={`badge ${getEstadoClase(factura.estado)}`}>
                    {factura.estado?.toUpperCase()}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-icon" title="Ver detalles">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                    {factura.estado === 'pendiente' && (
                      <button
                        className="btn-icon btn-icon-success"
                        title="Marcar como pagada"
                        onClick={() => marcarComoPagada(factura.id)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {facturasFiltradas.length === 0 && (
          <div className="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
            </svg>
            <p>No se encontraron facturas</p>
            <span>Intenta con otros terminos de busqueda</span>
          </div>
        )}
      </div>

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
