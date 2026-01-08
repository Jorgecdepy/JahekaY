import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Modal from '../components/Modal'
import './Tarifas.css'

function Tarifas() {
  const [tarifas, setTarifas] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)

  useEffect(() => {
    cargarTarifas()
  }, [])

  const cargarTarifas = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('tarifas')
      .select('*')
      .order('rango_desde', { ascending: true })

    if (error) {
      console.error('Error:', error)
    } else {
      setTarifas(data || [])
    }
    setLoading(false)
  }

  const toggleActivo = async (tarifaId, estadoActual) => {
    const { error } = await supabase
      .from('tarifas')
      .update({ activo: !estadoActual })
      .eq('id', tarifaId)

    if (error) {
      console.error('Error:', error)
      alert('Error al actualizar la tarifa')
    } else {
      cargarTarifas()
    }
  }

  const handleSuccess = () => {
    setIsModalOpen(false)
    cargarTarifas()
  }

  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0
    }).format(monto)
  }

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-PY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const tarifasActivas = tarifas.filter(t => t.activo)
  const cargoFijo = tarifasActivas.length > 0 ? tarifasActivas[0].cargo_fijo_mensual : 0

  if (loading) {
    return <div className="loading-container">Cargando tarifas...</div>
  }

  return (
    <div className="tarifas-container">
      <div className="tarifas-header">
        <h2>Gestión de Tarifas</h2>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          + Nueva Tarifa
        </button>
      </div>

      <div className="tarifas-info">
        <div className="info-card">
          <h3>Cargo Fijo Mensual</h3>
          <p className="info-value">{formatMonto(cargoFijo)}</p>
          <p className="info-desc">Se aplica a todas las facturas</p>
        </div>
        
        <div className="info-card">
          <h3>Tarifas Activas</h3>
          <p className="info-value">{tarifasActivas.length}</p>
          <p className="info-desc">Rangos de consumo configurados</p>
        </div>
      </div>

      <div className="tarifas-table">
        <table>
          <thead>
            <tr>
              <th>Rango (m³)</th>
              <th>Precio por m³</th>
              <th>Cargo Fijo</th>
              <th>Fecha Inicio</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tarifas.map((tarifa) => (
              <tr key={tarifa.id} className={!tarifa.activo ? 'tarifa-inactiva' : ''}>
                <td className="rango-cell">
                  {tarifa.rango_desde} - {tarifa.rango_hasta || '∞'}
                </td>
                <td className="precio-cell">{formatMonto(tarifa.precio_por_m3)}</td>
                <td>{formatMonto(tarifa.cargo_fijo_mensual)}</td>
                <td>{formatFecha(tarifa.fecha_inicio)}</td>
                <td>
                  <span 
                    className="estado-badge" 
                    style={{ backgroundColor: tarifa.activo ? '#27ae60' : '#95a5a6' }}
                  >
                    {tarifa.activo ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </td>
                <td>
                  <button 
                    className={tarifa.activo ? 'btn-action btn-warning' : 'btn-action btn-success'}
                    onClick={() => toggleActivo(tarifa.id, tarifa.activo)}
                  >
                    {tarifa.activo ? 'Desactivar' : 'Activar'}
                  </button>
                  <button className="btn-action">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tarifas.length === 0 && (
        <div className="no-results">
          No hay tarifas configuradas. Agregue una nueva tarifa para comenzar.
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Nueva Tarifa"
      >
        <p>Formulario de tarifa próximamente...</p>
      </Modal>
    </div>
  )
}

export default Tarifas