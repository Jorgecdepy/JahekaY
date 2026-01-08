import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Modal from '../components/Modal'
import './Tarifas.css'

function Tarifas() {
  const [tarifas, setTarifas] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    rango_desde: '',
    rango_hasta: '',
    precio_por_m3: '',
    cargo_fijo_mensual: '',
    fecha_inicio: new Date().toISOString().split('T')[0]
  })
  const [saving, setSaving] = useState(false)

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

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)

    const { error } = await supabase
      .from('tarifas')
      .insert([{
        rango_desde: parseInt(formData.rango_desde),
        rango_hasta: formData.rango_hasta ? parseInt(formData.rango_hasta) : null,
        precio_por_m3: parseFloat(formData.precio_por_m3),
        cargo_fijo_mensual: parseFloat(formData.cargo_fijo_mensual),
        fecha_inicio: formData.fecha_inicio,
        activo: true
      }])

    if (error) {
      console.error('Error:', error)
      alert('Error al guardar la tarifa')
    } else {
      setIsModalOpen(false)
      setFormData({
        rango_desde: '',
        rango_hasta: '',
        precio_por_m3: '',
        cargo_fijo_mensual: '',
        fecha_inicio: new Date().toISOString().split('T')[0]
      })
      cargarTarifas()
    }
    setSaving(false)
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
      month: 'short',
      day: 'numeric'
    })
  }

  const tarifasActivas = tarifas.filter(t => t.activo)
  const cargoFijo = tarifasActivas.length > 0 ? tarifasActivas[0].cargo_fijo_mensual : 0

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner spinner-lg"></div>
        <p>Cargando tarifas...</p>
      </div>
    )
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h2>Gestion de Tarifas</h2>
          <p className="page-subtitle">Configura los precios por consumo de agua</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nueva Tarifa
        </button>
      </div>

      <div className="tarifas-cards">
        <div className="tarifa-info-card">
          <div className="tarifa-info-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div className="tarifa-info-content">
            <span className="tarifa-info-label">Cargo Fijo Mensual</span>
            <span className="tarifa-info-value">{formatMonto(cargoFijo)}</span>
            <span className="tarifa-info-desc">Se aplica a todas las facturas</span>
          </div>
        </div>

        <div className="tarifa-info-card">
          <div className="tarifa-info-icon tarifa-info-icon-success">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </div>
          <div className="tarifa-info-content">
            <span className="tarifa-info-label">Tarifas Activas</span>
            <span className="tarifa-info-value">{tarifasActivas.length}</span>
            <span className="tarifa-info-desc">Rangos de consumo configurados</span>
          </div>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Rango (m3)</th>
              <th>Precio por m3</th>
              <th>Cargo Fijo</th>
              <th>Fecha Inicio</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tarifas.map((tarifa) => (
              <tr key={tarifa.id} className={!tarifa.activo ? 'row-inactive' : ''}>
                <td className="td-range">
                  {tarifa.rango_desde} - {tarifa.rango_hasta || '∞'}
                </td>
                <td className="td-price">{formatMonto(tarifa.precio_por_m3)}</td>
                <td>{formatMonto(tarifa.cargo_fijo_mensual)}</td>
                <td>{formatFecha(tarifa.fecha_inicio)}</td>
                <td>
                  <span className={`badge ${tarifa.activo ? 'badge-success' : 'badge-secondary'}`}>
                    {tarifa.activo ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className={`btn-icon ${tarifa.activo ? 'btn-icon-warning' : 'btn-icon-success'}`}
                      title={tarifa.activo ? 'Desactivar' : 'Activar'}
                      onClick={() => toggleActivo(tarifa.id, tarifa.activo)}
                    >
                      {tarifa.activo ? (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="10"></circle>
                          <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                        </svg>
                      ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                      )}
                    </button>
                    <button className="btn-icon" title="Editar">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {tarifas.length === 0 && (
          <div className="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            <p>No hay tarifas configuradas</p>
            <span>Agregue una nueva tarifa para comenzar</span>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nueva Tarifa"
      >
        <form onSubmit={handleSubmit} className="form-container">
          <div className="form-row">
            <div className="form-group">
              <label>Rango Desde (m3)</label>
              <input
                type="number"
                min="0"
                value={formData.rango_desde}
                onChange={(e) => setFormData({...formData, rango_desde: e.target.value})}
                placeholder="0"
                required
              />
            </div>
            <div className="form-group">
              <label>Rango Hasta (m3)</label>
              <input
                type="number"
                min="0"
                value={formData.rango_hasta}
                onChange={(e) => setFormData({...formData, rango_hasta: e.target.value})}
                placeholder="Dejar vacio para infinito"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Precio por m3 (Gs.)</label>
              <input
                type="number"
                min="0"
                value={formData.precio_por_m3}
                onChange={(e) => setFormData({...formData, precio_por_m3: e.target.value})}
                placeholder="1000"
                required
              />
            </div>
            <div className="form-group">
              <label>Cargo Fijo Mensual (Gs.)</label>
              <input
                type="number"
                min="0"
                value={formData.cargo_fijo_mensual}
                onChange={(e) => setFormData({...formData, cargo_fijo_mensual: e.target.value})}
                placeholder="5000"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Fecha de Inicio</label>
            <input
              type="date"
              value={formData.fecha_inicio}
              onChange={(e) => setFormData({...formData, fecha_inicio: e.target.value})}
              required
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? (
                <>
                  <span className="spinner"></span>
                  Guardando...
                </>
              ) : (
                'Guardar Tarifa'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Tarifas
