import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Modal from '../components/Modal'
import './Configuracion.css'

function Configuracion() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [ejecutando, setEjecutando] = useState(false)
  const [historial, setHistorial] = useState([])
  const [mensaje, setMensaje] = useState(null)

  // Estados para tarifas
  const [tarifas, setTarifas] = useState([])
  const [isModalTarifaOpen, setIsModalTarifaOpen] = useState(false)
  const [savingTarifa, setSavingTarifa] = useState(false)
  const [formDataTarifa, setFormDataTarifa] = useState({
    rango_desde: '',
    rango_hasta: '',
    precio_por_m3: '',
    cargo_fijo_mensual: '',
    fecha_inicio: new Date().toISOString().split('T')[0]
  })

  const [config, setConfig] = useState({
    facturacion_automatica_activa: false,
    facturacion_dia_mes: '1',
    facturacion_hora: '00:00',
    facturacion_dias_vencimiento: '15',
    facturacion_notificar_admin: true,
    facturacion_email_admin: ''
  })

  useEffect(() => {
    cargarConfiguracion()
    cargarHistorial()
    cargarTarifas()
  }, [])

  const cargarConfiguracion = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('configuracion_sistema')
      .select('*')
      .in('clave', [
        'facturacion_automatica_activa',
        'facturacion_dia_mes',
        'facturacion_hora',
        'facturacion_dias_vencimiento',
        'facturacion_notificar_admin',
        'facturacion_email_admin'
      ])

    if (error) {
      console.error('Error al cargar configuración:', error)
      mostrarMensaje('Error al cargar configuración', 'error')
    } else {
      const configObj = {}
      data.forEach(item => {
        if (item.tipo === 'boolean') {
          configObj[item.clave] = item.valor === 'true'
        } else {
          configObj[item.clave] = item.valor
        }
      })
      setConfig(configObj)
    }

    setLoading(false)
  }

  const cargarHistorial = async () => {
    const { data, error } = await supabase
      .from('historial_facturacion_automatica')
      .select('*')
      .order('fecha_ejecucion', { ascending: false })
      .limit(10)

    if (error) {
      console.error('Error al cargar historial:', error)
    } else {
      setHistorial(data || [])
    }
  }

  const handleChange = (clave, valor) => {
    setConfig(prev => ({
      ...prev,
      [clave]: valor
    }))
  }

  const guardarConfiguracion = async () => {
    setSaving(true)
    setMensaje(null)

    try {
      for (const [clave, valor] of Object.entries(config)) {
        const valorString = typeof valor === 'boolean' ? String(valor) : valor

        const { error } = await supabase
          .from('configuracion_sistema')
          .update({
            valor: valorString,
            updated_at: new Date().toISOString()
          })
          .eq('clave', clave)

        if (error) throw error
      }

      mostrarMensaje('Configuración guardada exitosamente', 'success')
      cargarConfiguracion()
    } catch (error) {
      console.error('Error al guardar:', error)
      mostrarMensaje('Error al guardar la configuración', 'error')
    }

    setSaving(false)
  }

  const ejecutarFacturacionManual = async () => {
    if (!window.confirm('¿Estás seguro de generar facturas manualmente? Esto creará facturas para todos los clientes con lecturas del mes actual.')) {
      return
    }

    setEjecutando(true)
    setMensaje(null)

    try {
      const { data, error } = await supabase.rpc('generar_facturas_automaticas')

      if (error) throw error

      if (data.success) {
        mostrarMensaje(
          `Facturación completada: ${data.facturas_generadas} facturas generadas, ${data.facturas_con_error} errores`,
          data.facturas_con_error > 0 ? 'warning' : 'success'
        )
        cargarHistorial()
      } else {
        mostrarMensaje(data.mensaje || 'Error al generar facturas', 'error')
      }
    } catch (error) {
      console.error('Error:', error)
      mostrarMensaje('Error al ejecutar facturación: ' + error.message, 'error')
    }

    setEjecutando(false)
  }

  const mostrarMensaje = (texto, tipo) => {
    setMensaje({ texto, tipo })
    setTimeout(() => setMensaje(null), 5000)
  }

  // ================================================================
  // FUNCIONES DE TARIFAS
  // ================================================================

  const cargarTarifas = async () => {
    const { data, error } = await supabase
      .from('tarifas')
      .select('*')
      .order('rango_desde', { ascending: true })

    if (error) {
      console.error('Error al cargar tarifas:', error)
    } else {
      setTarifas(data || [])
    }
  }

  const toggleTarifaActiva = async (tarifaId, estadoActual) => {
    const { error } = await supabase
      .from('tarifas')
      .update({ activo: !estadoActual })
      .eq('id', tarifaId)

    if (error) {
      console.error('Error:', error)
      mostrarMensaje('Error al actualizar la tarifa', 'error')
    } else {
      mostrarMensaje(
        `Tarifa ${!estadoActual ? 'activada' : 'desactivada'} exitosamente`,
        'success'
      )
      cargarTarifas()
    }
  }

  const handleSubmitTarifa = async (e) => {
    e.preventDefault()
    setSavingTarifa(true)

    const { error } = await supabase
      .from('tarifas')
      .insert([{
        rango_desde: parseInt(formDataTarifa.rango_desde),
        rango_hasta: formDataTarifa.rango_hasta ? parseInt(formDataTarifa.rango_hasta) : null,
        precio_por_m3: parseFloat(formDataTarifa.precio_por_m3),
        cargo_fijo_mensual: parseFloat(formDataTarifa.cargo_fijo_mensual),
        fecha_inicio: formDataTarifa.fecha_inicio,
        activo: true
      }])

    if (error) {
      console.error('Error:', error)
      mostrarMensaje('Error al guardar la tarifa', 'error')
    } else {
      setIsModalTarifaOpen(false)
      setFormDataTarifa({
        rango_desde: '',
        rango_hasta: '',
        precio_por_m3: '',
        cargo_fijo_mensual: '',
        fecha_inicio: new Date().toISOString().split('T')[0]
      })
      mostrarMensaje('Tarifa creada exitosamente', 'success')
      cargarTarifas()
    }
    setSavingTarifa(false)
  }

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleString('es-PY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatFechaSolo = (fecha) => {
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
    }).format(monto || 0)
  }

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'completado': return 'badge-success'
      case 'error': return 'badge-danger'
      case 'parcial': return 'badge-warning'
      case 'procesando': return 'badge-info'
      default: return 'badge-secondary'
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner spinner-lg"></div>
        <p>Cargando configuración...</p>
      </div>
    )
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h2>Configuración del Sistema</h2>
          <p className="page-subtitle">Gestiona la facturación automática y otras configuraciones</p>
        </div>
      </div>

      {mensaje && (
        <div className={`alert alert-${mensaje.tipo}`}>
          {mensaje.tipo === 'success' && (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          )}
          {mensaje.tipo === 'error' && (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          )}
          {mensaje.tipo === 'warning' && (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* Sección de Facturación Automática */}
      <div className="config-section">
        <div className="config-section-header">
          <h3>Facturación Automática</h3>
          <p>Configura la generación automática de facturas mensualmente</p>
        </div>

        <div className="config-grid">
          <div className="config-item">
            <label className="config-label">
              <input
                type="checkbox"
                checked={config.facturacion_automatica_activa}
                onChange={(e) => handleChange('facturacion_automatica_activa', e.target.checked)}
                className="config-checkbox"
              />
              <span className="config-checkbox-label">
                <strong>Activar facturación automática</strong>
                <small>Genera facturas automáticamente cada mes</small>
              </span>
            </label>
          </div>

          <div className="config-item">
            <label className="config-label-simple">
              Día del mes para generar facturas
            </label>
            <select
              value={config.facturacion_dia_mes}
              onChange={(e) => handleChange('facturacion_dia_mes', e.target.value)}
              className="config-input"
              disabled={!config.facturacion_automatica_activa}
            >
              {[...Array(31)].map((_, i) => (
                <option key={i + 1} value={i + 1}>
                  Día {i + 1}
                </option>
              ))}
            </select>
            <small className="config-hint">
              Las facturas se generarán automáticamente este día cada mes
            </small>
          </div>

          <div className="config-item">
            <label className="config-label-simple">
              Hora de generación
            </label>
            <input
              type="time"
              value={config.facturacion_hora}
              onChange={(e) => handleChange('facturacion_hora', e.target.value)}
              className="config-input"
              disabled={!config.facturacion_automatica_activa}
            />
            <small className="config-hint">
              Hora del día en que se ejecutará la facturación
            </small>
          </div>

          <div className="config-item">
            <label className="config-label-simple">
              Días para vencimiento
            </label>
            <input
              type="number"
              value={config.facturacion_dias_vencimiento}
              onChange={(e) => handleChange('facturacion_dias_vencimiento', e.target.value)}
              className="config-input"
              min="1"
              max="90"
            />
            <small className="config-hint">
              Días de gracia desde la emisión hasta el vencimiento de la factura
            </small>
          </div>
        </div>

        <div className="config-actions">
          <button
            onClick={guardarConfiguracion}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? (
              <>
                <span className="spinner"></span>
                Guardando...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                  <polyline points="17 21 17 13 7 13 7 21"></polyline>
                  <polyline points="7 3 7 8 15 8"></polyline>
                </svg>
                Guardar Configuración
              </>
            )}
          </button>

          <button
            onClick={ejecutarFacturacionManual}
            disabled={ejecutando}
            className="btn-secondary"
          >
            {ejecutando ? (
              <>
                <span className="spinner"></span>
                Generando...
              </>
            ) : (
              <>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <polyline points="12 6 12 12 16 14"></polyline>
                </svg>
                Generar Facturas Ahora
              </>
            )}
          </button>
        </div>
      </div>

      {/* Historial de Facturación Automática */}
      <div className="config-section">
        <div className="config-section-header">
          <h3>Historial de Facturaciones</h3>
          <p>Registro de ejecuciones de facturación automática</p>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Periodo</th>
                <th>Facturas Generadas</th>
                <th>Errores</th>
                <th>Clientes</th>
                <th>Duración</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {historial.map((item) => (
                <tr key={item.id}>
                  <td>{formatFecha(item.fecha_ejecucion)}</td>
                  <td>{item.periodo}</td>
                  <td className="text-success">{item.facturas_generadas}</td>
                  <td className={item.facturas_con_error > 0 ? 'text-danger' : ''}>
                    {item.facturas_con_error}
                  </td>
                  <td>{item.clientes_procesados}</td>
                  <td>{item.duracion_segundos ? `${item.duracion_segundos}s` : '-'}</td>
                  <td>
                    <span className={`badge ${getEstadoBadge(item.estado)}`}>
                      {item.estado?.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {historial.length === 0 && (
            <div className="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <p>No hay historial de facturaciones</p>
              <span>Las facturaciones automáticas aparecerán aquí</span>
            </div>
          )}
        </div>
      </div>

      {/* Gestión de Tarifas */}
      <div className="config-section">
        <div className="config-section-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Gestión de Tarifas</h3>
              <p>Configura los precios por consumo de agua</p>
            </div>
            <button className="btn-primary" onClick={() => setIsModalTarifaOpen(true)}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Nueva Tarifa
            </button>
          </div>
        </div>

        <div className="tarifas-resumen">
          <div className="tarifa-resumen-card">
            <div className="tarifa-resumen-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
            </div>
            <div>
              <span className="tarifa-resumen-label">Cargo Fijo Mensual</span>
              <span className="tarifa-resumen-value">
                {formatMonto(tarifas.find(t => t.activo)?.cargo_fijo_mensual || 0)}
              </span>
            </div>
          </div>

          <div className="tarifa-resumen-card">
            <div className="tarifa-resumen-icon tarifa-resumen-icon-success">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
            </div>
            <div>
              <span className="tarifa-resumen-label">Tarifas Activas</span>
              <span className="tarifa-resumen-value">
                {tarifas.filter(t => t.activo).length}
              </span>
            </div>
          </div>
        </div>

        <div className="table-container">
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
                <tr key={tarifa.id} className={!tarifa.activo ? 'row-inactive' : ''}>
                  <td className="td-range">
                    {tarifa.rango_desde} - {tarifa.rango_hasta || '∞'}
                  </td>
                  <td className="td-price">{formatMonto(tarifa.precio_por_m3)}</td>
                  <td>{formatMonto(tarifa.cargo_fijo_mensual)}</td>
                  <td>{formatFechaSolo(tarifa.fecha_inicio)}</td>
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
                        onClick={() => toggleTarifaActiva(tarifa.id, tarifa.activo)}
                      >
                        {tarifa.activo ? (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {tarifas.length === 0 && (
            <div className="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <line x1="12" y1="1" x2="12" y2="23"></line>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              <p>No hay tarifas configuradas</p>
              <span>Agregue una nueva tarifa para comenzar</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal para Nueva Tarifa */}
      <Modal
        isOpen={isModalTarifaOpen}
        onClose={() => setIsModalTarifaOpen(false)}
        title="Nueva Tarifa"
      >
        <form onSubmit={handleSubmitTarifa} className="form-container">
          <div className="form-row">
            <div className="form-group">
              <label>Rango Desde (m³) *</label>
              <input
                type="number"
                min="0"
                value={formDataTarifa.rango_desde}
                onChange={(e) => setFormDataTarifa({...formDataTarifa, rango_desde: e.target.value})}
                placeholder="0"
                required
              />
            </div>
            <div className="form-group">
              <label>Rango Hasta (m³)</label>
              <input
                type="number"
                min="0"
                value={formDataTarifa.rango_hasta}
                onChange={(e) => setFormDataTarifa({...formDataTarifa, rango_hasta: e.target.value})}
                placeholder="Dejar vacío para infinito"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Precio por m³ (Gs.) *</label>
              <input
                type="number"
                min="0"
                value={formDataTarifa.precio_por_m3}
                onChange={(e) => setFormDataTarifa({...formDataTarifa, precio_por_m3: e.target.value})}
                placeholder="1000"
                required
              />
            </div>
            <div className="form-group">
              <label>Cargo Fijo Mensual (Gs.) *</label>
              <input
                type="number"
                min="0"
                value={formDataTarifa.cargo_fijo_mensual}
                onChange={(e) => setFormDataTarifa({...formDataTarifa, cargo_fijo_mensual: e.target.value})}
                placeholder="5000"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Fecha de Inicio *</label>
            <input
              type="date"
              value={formDataTarifa.fecha_inicio}
              onChange={(e) => setFormDataTarifa({...formDataTarifa, fecha_inicio: e.target.value})}
              required
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsModalTarifaOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={savingTarifa}>
              {savingTarifa ? (
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

export default Configuracion
