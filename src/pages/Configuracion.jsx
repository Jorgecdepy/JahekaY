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

  // Estados para empleados
  const [empleados, setEmpleados] = useState([])
  const [roles, setRoles] = useState([])
  const [isModalEmpleadoOpen, setIsModalEmpleadoOpen] = useState(false)
  const [isModalAsignacionOpen, setIsModalAsignacionOpen] = useState(false)
  const [savingEmpleado, setSavingEmpleado] = useState(false)
  const [empleadoEditar, setEmpleadoEditar] = useState(null)
  const [empleadoAsignar, setEmpleadoAsignar] = useState(null)
  const [clientes, setClientes] = useState([])
  const [clientesSeleccionados, setClientesSeleccionados] = useState([])
  const [formDataEmpleado, setFormDataEmpleado] = useState({
    nombre_completo: '',
    email: '',
    telefono: '',
    direccion: '',
    rol_id: '',
    fecha_contratacion: new Date().toISOString().split('T')[0],
    salario: '',
    notas: ''
  })

  // Estados para gestión de accesos al portal
  const [isModalAccesoOpen, setIsModalAccesoOpen] = useState(false)
  const [clienteAcceso, setClienteAcceso] = useState(null)
  const [savingAcceso, setSavingAcceso] = useState(false)
  const [formDataAcceso, setFormDataAcceso] = useState({
    numero_medidor: '',
    codigo_pin: '',
    acceso_portal_activo: true
  })

  // Estados para crear nuevo cliente con acceso
  const [isModalNuevoClienteOpen, setIsModalNuevoClienteOpen] = useState(false)
  const [savingNuevoCliente, setSavingNuevoCliente] = useState(false)
  const [formDataNuevoCliente, setFormDataNuevoCliente] = useState({
    nombre_completo: '',
    direccion: '',
    telefono: '',
    email: '',
    numero_medidor: '',
    codigo_pin: '',
    acceso_portal_activo: true
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
    cargarRoles()
    cargarEmpleados()
    cargarClientes()
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

  // ================================================================
  // FUNCIONES DE EMPLEADOS
  // ================================================================

  const cargarRoles = async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('nombre', { ascending: true })

    if (error) {
      console.error('Error al cargar roles:', error)
    } else {
      setRoles(data || [])
    }
  }

  const cargarEmpleados = async () => {
    const { data, error } = await supabase
      .from('vista_empleados_roles')
      .select('*')
      .order('nombre_completo', { ascending: true })

    if (error) {
      console.error('Error al cargar empleados:', error)
    } else {
      setEmpleados(data || [])
    }
  }

  const cargarClientes = async () => {
    const { data, error } = await supabase
      .from('usuarios')
      .select('id, nombre_completo, numero_medidor, direccion, codigo_pin, activo')
      .order('nombre_completo', { ascending: true })

    if (error) {
      console.error('Error al cargar clientes:', error)
    } else {
      setClientes(data || [])
    }
  }

  const abrirModalNuevoEmpleado = () => {
    setEmpleadoEditar(null)
    setFormDataEmpleado({
      nombre_completo: '',
      email: '',
      telefono: '',
      direccion: '',
      rol_id: roles[0]?.id || '',
      fecha_contratacion: new Date().toISOString().split('T')[0],
      salario: '',
      notas: ''
    })
    setIsModalEmpleadoOpen(true)
  }

  const abrirModalEditarEmpleado = (empleado) => {
    setEmpleadoEditar(empleado)
    setFormDataEmpleado({
      nombre_completo: empleado.nombre_completo,
      email: empleado.email,
      telefono: empleado.telefono || '',
      direccion: empleado.direccion || '',
      rol_id: empleado.rol_id || '',
      fecha_contratacion: empleado.fecha_contratacion || new Date().toISOString().split('T')[0],
      salario: empleado.salario || '',
      notas: empleado.notas || ''
    })
    setIsModalEmpleadoOpen(true)
  }

  const abrirModalAsignacion = async (empleado) => {
    setEmpleadoAsignar(empleado)

    // Cargar asignaciones actuales del empleado
    const { data, error } = await supabase
      .from('asignaciones_empleados')
      .select('cliente_id')
      .eq('empleado_id', empleado.id)
      .eq('activo', true)

    if (!error && data) {
      setClientesSeleccionados(data.map(a => a.cliente_id))
    }

    setIsModalAsignacionOpen(true)
  }

  const handleSubmitEmpleado = async (e) => {
    e.preventDefault()
    setSavingEmpleado(true)

    try {
      const empleadoData = {
        nombre_completo: formDataEmpleado.nombre_completo,
        email: formDataEmpleado.email,
        telefono: formDataEmpleado.telefono,
        direccion: formDataEmpleado.direccion,
        rol_id: formDataEmpleado.rol_id,
        fecha_contratacion: formDataEmpleado.fecha_contratacion,
        salario: formDataEmpleado.salario ? parseFloat(formDataEmpleado.salario) : null,
        notas: formDataEmpleado.notas,
        activo: true
      }

      let error
      if (empleadoEditar) {
        // Actualizar empleado existente
        const result = await supabase
          .from('empleados')
          .update(empleadoData)
          .eq('id', empleadoEditar.id)
        error = result.error
      } else {
        // Crear nuevo empleado
        const result = await supabase
          .from('empleados')
          .insert([empleadoData])
        error = result.error
      }

      if (error) throw error

      setIsModalEmpleadoOpen(false)
      mostrarMensaje(
        empleadoEditar ? 'Empleado actualizado exitosamente' : 'Empleado creado exitosamente',
        'success'
      )
      cargarEmpleados()
    } catch (error) {
      console.error('Error:', error)
      mostrarMensaje('Error al guardar el empleado: ' + error.message, 'error')
    }

    setSavingEmpleado(false)
  }

  const toggleEmpleadoActivo = async (empleadoId, estadoActual) => {
    const { error } = await supabase
      .from('empleados')
      .update({ activo: !estadoActual })
      .eq('id', empleadoId)

    if (error) {
      console.error('Error:', error)
      mostrarMensaje('Error al actualizar el empleado', 'error')
    } else {
      mostrarMensaje(
        `Empleado ${!estadoActual ? 'activado' : 'desactivado'} exitosamente`,
        'success'
      )
      cargarEmpleados()
    }
  }

  const handleSubmitAsignacion = async (e) => {
    e.preventDefault()
    setSavingEmpleado(true)

    try {
      const { data, error } = await supabase.rpc('asignar_clientes_empleado', {
        p_empleado_id: empleadoAsignar.id,
        p_cliente_ids: clientesSeleccionados,
        p_tipo_asignacion: 'lectura',
        p_zona: null
      })

      if (error) throw error

      setIsModalAsignacionOpen(false)
      mostrarMensaje(data.mensaje || 'Asignaciones actualizadas exitosamente', 'success')
      cargarEmpleados()
    } catch (error) {
      console.error('Error:', error)
      mostrarMensaje('Error al guardar asignaciones: ' + error.message, 'error')
    }

    setSavingEmpleado(false)
  }

  const toggleClienteSeleccionado = (clienteId) => {
    setClientesSeleccionados(prev => {
      if (prev.includes(clienteId)) {
        return prev.filter(id => id !== clienteId)
      } else {
        return [...prev, clienteId]
      }
    })
  }

  // Funciones para gestión de accesos al portal
  const generarPIN = () => {
    // Generar PIN de 6 dígitos
    const pin = Math.floor(100000 + Math.random() * 900000).toString()
    setFormDataAcceso({ ...formDataAcceso, codigo_pin: pin })
  }

  const abrirModalAcceso = (cliente) => {
    setClienteAcceso(cliente)
    setFormDataAcceso({
      numero_medidor: cliente.numero_medidor || '',
      codigo_pin: cliente.codigo_pin || '',
      acceso_portal_activo: cliente.activo !== false
    })
    setIsModalAccesoOpen(true)
  }

  const handleSubmitAcceso = async (e) => {
    e.preventDefault()
    setSavingAcceso(true)

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          numero_medidor: formDataAcceso.numero_medidor,
          codigo_pin: formDataAcceso.codigo_pin,
          activo: formDataAcceso.acceso_portal_activo
        })
        .eq('id', clienteAcceso.id)

      if (error) throw error

      setIsModalAccesoOpen(false)
      mostrarMensaje('Credenciales actualizadas exitosamente', 'success')
      cargarClientes()
    } catch (error) {
      console.error('Error:', error)
      mostrarMensaje('Error al actualizar credenciales: ' + error.message, 'error')
    }

    setSavingAcceso(false)
  }

  const toggleAccesoPortal = async (clienteId, estadoActual) => {
    const { error } = await supabase
      .from('usuarios')
      .update({ activo: !estadoActual })
      .eq('id', clienteId)

    if (error) {
      console.error('Error:', error)
      mostrarMensaje('Error al actualizar el acceso', 'error')
    } else {
      mostrarMensaje(
        `Acceso al portal ${!estadoActual ? 'activado' : 'desactivado'} exitosamente`,
        'success'
      )
      cargarClientes()
    }
  }

  // Funciones para crear nuevo cliente con acceso
  const generarPINNuevoCliente = () => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString()
    setFormDataNuevoCliente({ ...formDataNuevoCliente, codigo_pin: pin })
  }

  const abrirModalNuevoCliente = () => {
    setFormDataNuevoCliente({
      nombre_completo: '',
      direccion: '',
      telefono: '',
      email: '',
      numero_medidor: '',
      codigo_pin: '',
      acceso_portal_activo: true
    })
    setIsModalNuevoClienteOpen(true)
  }

  const handleSubmitNuevoCliente = async (e) => {
    e.preventDefault()
    setSavingNuevoCliente(true)

    try {
      const { data, error } = await supabase
        .from('usuarios')
        .insert([{
          nombre_completo: formDataNuevoCliente.nombre_completo,
          direccion: formDataNuevoCliente.direccion,
          telefono: formDataNuevoCliente.telefono,
          email: formDataNuevoCliente.email,
          numero_medidor: formDataNuevoCliente.numero_medidor,
          codigo_pin: formDataNuevoCliente.codigo_pin,
          activo: formDataNuevoCliente.acceso_portal_activo,
          notas: 'Cliente creado desde portal de configuración'
        }])
        .select()

      if (error) throw error

      setIsModalNuevoClienteOpen(false)
      mostrarMensaje('Cliente creado exitosamente con acceso al portal', 'success')
      cargarClientes()
    } catch (error) {
      console.error('Error:', error)
      mostrarMensaje('Error al crear cliente: ' + error.message, 'error')
    }

    setSavingNuevoCliente(false)
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

      {/* Gestión de Accesos al Portal del Cliente */}
      <div className="config-section">
        <div className="config-section-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Gestión de Accesos al Portal del Cliente</h3>
              <p>Asigna credenciales para que los clientes accedan al portal web</p>
            </div>
            <button className="btn-primary" onClick={abrirModalNuevoCliente}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Nuevo Cliente
            </button>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Nº Medidor</th>
                <th>PIN</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((cliente) => (
                <tr key={cliente.id}>
                  <td>
                    <div>
                      <strong>{cliente.nombre_completo}</strong>
                      <br />
                      <small style={{ color: '#666' }}>{cliente.direccion}</small>
                    </div>
                  </td>
                  <td>
                    {cliente.numero_medidor ? (
                      <span className="badge badge-info">{cliente.numero_medidor}</span>
                    ) : (
                      <span style={{ color: '#999', fontStyle: 'italic' }}>Sin asignar</span>
                    )}
                  </td>
                  <td>
                    {cliente.codigo_pin ? (
                      <span style={{ fontFamily: 'monospace', letterSpacing: '2px' }}>
                        {'•'.repeat(6)}
                      </span>
                    ) : (
                      <span style={{ color: '#999', fontStyle: 'italic' }}>Sin PIN</span>
                    )}
                  </td>
                  <td>
                    {cliente.activo !== false ? (
                      <span className="badge badge-success">Activo</span>
                    ) : (
                      <span className="badge badge-danger">Inactivo</span>
                    )}
                  </td>
                  <td>
                    <div className="table-actions">
                      <button
                        className="btn-icon btn-icon-primary"
                        onClick={() => abrirModalAcceso(cliente)}
                        title="Configurar acceso"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button
                        className={`btn-icon ${cliente.activo !== false ? 'btn-icon-danger' : 'btn-icon-success'}`}
                        onClick={() => toggleAccesoPortal(cliente.id, cliente.activo !== false)}
                        title={cliente.activo !== false ? 'Desactivar acceso' : 'Activar acceso'}
                      >
                        {cliente.activo !== false ? (
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

          {clientes.length === 0 && (
            <div className="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <p>No hay clientes registrados</p>
              <span>Los clientes aparecerán aquí automáticamente</span>
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

      {/* Gestión de Empleados */}
      <div className="config-section">
        <div className="config-section-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3>Gestión de Empleados</h3>
              <p>Administra empleados, roles y asignaciones</p>
            </div>
            <button className="btn-primary" onClick={abrirModalNuevoEmpleado}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Nuevo Empleado
            </button>
          </div>
        </div>

        <div className="tarifas-resumen">
          <div className="tarifa-resumen-card">
            <div className="tarifa-resumen-icon tarifa-resumen-icon-success">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
            </div>
            <div>
              <span className="tarifa-resumen-label">Total Empleados</span>
              <span className="tarifa-resumen-value">
                {empleados.length}
              </span>
            </div>
          </div>

          <div className="tarifa-resumen-card">
            <div className="tarifa-resumen-icon">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </div>
            <div>
              <span className="tarifa-resumen-label">Empleados Activos</span>
              <span className="tarifa-resumen-value">
                {empleados.filter(e => e.activo).length}
              </span>
            </div>
          </div>

          <div className="tarifa-resumen-card">
            <div className="tarifa-resumen-icon tarifa-resumen-icon-warning">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8.5" cy="7" r="4"></circle>
                <polyline points="17 11 19 13 23 9"></polyline>
              </svg>
            </div>
            <div>
              <span className="tarifa-resumen-label">Total Roles</span>
              <span className="tarifa-resumen-value">
                {roles.length}
              </span>
            </div>
          </div>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Teléfono</th>
                <th>Fecha Contratación</th>
                <th>Asignaciones</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {empleados.map((empleado) => (
                <tr key={empleado.id} className={!empleado.activo ? 'row-inactive' : ''}>
                  <td className="td-name">
                    <strong>{empleado.nombre_completo}</strong>
                  </td>
                  <td>{empleado.email}</td>
                  <td>
                    <span className="badge badge-info">
                      {empleado.rol_nombre || 'Sin rol'}
                    </span>
                  </td>
                  <td>{empleado.telefono || '-'}</td>
                  <td>{empleado.fecha_contratacion ? formatFechaSolo(empleado.fecha_contratacion) : '-'}</td>
                  <td className="text-center">
                    <span className="badge badge-secondary">
                      {empleado.total_asignaciones} clientes
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${empleado.activo ? 'badge-success' : 'badge-secondary'}`}>
                      {empleado.activo ? 'ACTIVO' : 'INACTIVO'}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="btn-icon btn-icon-info"
                        title="Asignar clientes"
                        onClick={() => abrirModalAsignacion(empleado)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="8.5" cy="7" r="4"></circle>
                          <line x1="20" y1="8" x2="20" y2="14"></line>
                          <line x1="23" y1="11" x2="17" y2="11"></line>
                        </svg>
                      </button>
                      <button
                        className="btn-icon btn-icon-primary"
                        title="Editar"
                        onClick={() => abrirModalEditarEmpleado(empleado)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                      </button>
                      <button
                        className={`btn-icon ${empleado.activo ? 'btn-icon-warning' : 'btn-icon-success'}`}
                        title={empleado.activo ? 'Desactivar' : 'Activar'}
                        onClick={() => toggleEmpleadoActivo(empleado.id, empleado.activo)}
                      >
                        {empleado.activo ? (
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

          {empleados.length === 0 && (
            <div className="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="9" cy="7" r="4"></circle>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
              </svg>
              <p>No hay empleados registrados</p>
              <span>Agregue un nuevo empleado para comenzar</span>
            </div>
          )}
        </div>
      </div>

      {/* Modal para Nuevo/Editar Empleado */}
      <Modal
        isOpen={isModalEmpleadoOpen}
        onClose={() => setIsModalEmpleadoOpen(false)}
        title={empleadoEditar ? 'Editar Empleado' : 'Nuevo Empleado'}
      >
        <form onSubmit={handleSubmitEmpleado} className="form-container">
          <div className="form-group">
            <label>Nombre Completo *</label>
            <input
              type="text"
              value={formDataEmpleado.nombre_completo}
              onChange={(e) => setFormDataEmpleado({...formDataEmpleado, nombre_completo: e.target.value})}
              placeholder="Juan Pérez"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={formDataEmpleado.email}
                onChange={(e) => setFormDataEmpleado({...formDataEmpleado, email: e.target.value})}
                placeholder="juan@ejemplo.com"
                required
              />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input
                type="tel"
                value={formDataEmpleado.telefono}
                onChange={(e) => setFormDataEmpleado({...formDataEmpleado, telefono: e.target.value})}
                placeholder="0981123456"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Dirección</label>
            <input
              type="text"
              value={formDataEmpleado.direccion}
              onChange={(e) => setFormDataEmpleado({...formDataEmpleado, direccion: e.target.value})}
              placeholder="Calle 1, Ciudad"
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Rol *</label>
              <select
                value={formDataEmpleado.rol_id}
                onChange={(e) => setFormDataEmpleado({...formDataEmpleado, rol_id: e.target.value})}
                required
              >
                <option value="">Seleccione un rol</option>
                {roles.map(rol => (
                  <option key={rol.id} value={rol.id}>
                    {rol.nombre}
                  </option>
                ))}
              </select>
              <small className="form-hint">
                {roles.find(r => r.id === formDataEmpleado.rol_id)?.descripcion || 'Seleccione un rol para ver su descripción'}
              </small>
            </div>
            <div className="form-group">
              <label>Fecha de Contratación</label>
              <input
                type="date"
                value={formDataEmpleado.fecha_contratacion}
                onChange={(e) => setFormDataEmpleado({...formDataEmpleado, fecha_contratacion: e.target.value})}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Salario (Gs.)</label>
            <input
              type="number"
              min="0"
              value={formDataEmpleado.salario}
              onChange={(e) => setFormDataEmpleado({...formDataEmpleado, salario: e.target.value})}
              placeholder="2500000"
            />
          </div>

          <div className="form-group">
            <label>Notas</label>
            <textarea
              value={formDataEmpleado.notas}
              onChange={(e) => setFormDataEmpleado({...formDataEmpleado, notas: e.target.value})}
              placeholder="Observaciones adicionales..."
              rows="3"
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsModalEmpleadoOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={savingEmpleado}>
              {savingEmpleado ? (
                <>
                  <span className="spinner"></span>
                  Guardando...
                </>
              ) : (
                empleadoEditar ? 'Actualizar Empleado' : 'Crear Empleado'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal para Asignación de Clientes */}
      <Modal
        isOpen={isModalAsignacionOpen}
        onClose={() => setIsModalAsignacionOpen(false)}
        title={`Asignar Clientes a ${empleadoAsignar?.nombre_completo}`}
      >
        <form onSubmit={handleSubmitAsignacion} className="form-container">
          <div className="form-group">
            <label>Seleccione los clientes a asignar:</label>
            <div className="clientes-checkboxes">
              <div className="clientes-header">
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setClientesSeleccionados(clientes.map(c => c.id))}
                >
                  Seleccionar todos
                </button>
                <button
                  type="button"
                  className="btn-link"
                  onClick={() => setClientesSeleccionados([])}
                >
                  Limpiar selección
                </button>
              </div>
              <div className="clientes-list">
                {clientes.map(cliente => (
                  <label key={cliente.id} className="cliente-checkbox">
                    <input
                      type="checkbox"
                      checked={clientesSeleccionados.includes(cliente.id)}
                      onChange={() => toggleClienteSeleccionado(cliente.id)}
                    />
                    <span className="cliente-info">
                      <strong>{cliente.nombre_completo}</strong>
                      <small>Medidor: {cliente.numero_medidor} - {cliente.direccion}</small>
                    </span>
                  </label>
                ))}
              </div>
              <p className="form-hint">
                {clientesSeleccionados.length} cliente(s) seleccionado(s)
              </p>
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsModalAsignacionOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={savingEmpleado}>
              {savingEmpleado ? (
                <>
                  <span className="spinner"></span>
                  Guardando...
                </>
              ) : (
                'Guardar Asignaciones'
              )}
            </button>
          </div>
        </form>
      </Modal>

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

      {/* Modal para Configurar Acceso al Portal */}
      <Modal
        isOpen={isModalAccesoOpen}
        onClose={() => setIsModalAccesoOpen(false)}
        title={`Configurar Acceso - ${clienteAcceso?.nombre_completo}`}
      >
        <form onSubmit={handleSubmitAcceso} className="form-container">
          <div className="form-group">
            <label>Número de Medidor *</label>
            <input
              type="text"
              value={formDataAcceso.numero_medidor}
              onChange={(e) => setFormDataAcceso({...formDataAcceso, numero_medidor: e.target.value})}
              placeholder="Ejemplo: 001234"
              required
              maxLength="20"
            />
            <small className="form-hint">
              El cliente usará este número para iniciar sesión
            </small>
          </div>

          <div className="form-group">
            <label>Código PIN (6 dígitos) *</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={formDataAcceso.codigo_pin}
                onChange={(e) => setFormDataAcceso({...formDataAcceso, codigo_pin: e.target.value.replace(/\D/g, '')})}
                placeholder="123456"
                required
                maxLength="6"
                pattern="\d{6}"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={generarPIN}
                title="Generar PIN aleatorio"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                Generar
              </button>
            </div>
            <small className="form-hint">
              PIN de 6 dígitos para acceder al portal. Usa el botón "Generar" para crear uno aleatorio.
            </small>
          </div>

          <div className="form-group">
            <label className="config-label">
              <input
                type="checkbox"
                checked={formDataAcceso.acceso_portal_activo}
                onChange={(e) => setFormDataAcceso({...formDataAcceso, acceso_portal_activo: e.target.checked})}
                className="config-checkbox"
              />
              <span className="config-checkbox-label">
                <strong>Acceso al portal activo</strong>
                <small>Permite al cliente iniciar sesión en el portal web</small>
              </span>
            </label>
          </div>

          <div className="alert alert-info" style={{ marginTop: '1rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <div>
              <strong>URL del Portal:</strong> /portal-cliente/login
              <br />
              <strong>Credenciales:</strong> Medidor + PIN de 6 dígitos
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsModalAccesoOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={savingAcceso}>
              {savingAcceso ? (
                <>
                  <span className="spinner"></span>
                  Guardando...
                </>
              ) : (
                'Guardar Credenciales'
              )}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal para Crear Nuevo Cliente */}
      <Modal
        isOpen={isModalNuevoClienteOpen}
        onClose={() => setIsModalNuevoClienteOpen(false)}
        title="Nuevo Cliente con Acceso al Portal"
      >
        <form onSubmit={handleSubmitNuevoCliente} className="form-container">
          <div className="form-group">
            <label>Nombre Completo *</label>
            <input
              type="text"
              value={formDataNuevoCliente.nombre_completo}
              onChange={(e) => setFormDataNuevoCliente({...formDataNuevoCliente, nombre_completo: e.target.value})}
              placeholder="Juan Pérez"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Dirección *</label>
              <input
                type="text"
                value={formDataNuevoCliente.direccion}
                onChange={(e) => setFormDataNuevoCliente({...formDataNuevoCliente, direccion: e.target.value})}
                placeholder="Calle 1, Barrio San José"
                required
              />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input
                type="tel"
                value={formDataNuevoCliente.telefono}
                onChange={(e) => setFormDataNuevoCliente({...formDataNuevoCliente, telefono: e.target.value})}
                placeholder="0981123456"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formDataNuevoCliente.email}
              onChange={(e) => setFormDataNuevoCliente({...formDataNuevoCliente, email: e.target.value})}
              placeholder="cliente@ejemplo.com"
            />
          </div>

          <div className="alert alert-info" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <div>
              <strong>Credenciales para el Portal</strong>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
                Completa los siguientes campos para que el cliente pueda acceder al portal web
              </p>
            </div>
          </div>

          <div className="form-group">
            <label>Número de Medidor *</label>
            <input
              type="text"
              value={formDataNuevoCliente.numero_medidor}
              onChange={(e) => setFormDataNuevoCliente({...formDataNuevoCliente, numero_medidor: e.target.value})}
              placeholder="Ejemplo: 001234"
              required
              maxLength="20"
            />
            <small className="form-hint">
              El cliente usará este número como usuario para iniciar sesión
            </small>
          </div>

          <div className="form-group">
            <label>Código PIN (6 dígitos) *</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={formDataNuevoCliente.codigo_pin}
                onChange={(e) => setFormDataNuevoCliente({...formDataNuevoCliente, codigo_pin: e.target.value.replace(/\D/g, '')})}
                placeholder="123456"
                required
                maxLength="6"
                pattern="\d{6}"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={generarPINNuevoCliente}
                title="Generar PIN aleatorio"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                Generar
              </button>
            </div>
            <small className="form-hint">
              PIN de 6 dígitos. Usa "Generar" para crear uno aleatorio seguro.
            </small>
          </div>

          <div className="form-group">
            <label className="config-label">
              <input
                type="checkbox"
                checked={formDataNuevoCliente.acceso_portal_activo}
                onChange={(e) => setFormDataNuevoCliente({...formDataNuevoCliente, acceso_portal_activo: e.target.checked})}
                className="config-checkbox"
              />
              <span className="config-checkbox-label">
                <strong>Acceso al portal activo</strong>
                <small>Permite al cliente iniciar sesión inmediatamente</small>
              </span>
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsModalNuevoClienteOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={savingNuevoCliente}>
              {savingNuevoCliente ? (
                <>
                  <span className="spinner"></span>
                  Creando...
                </>
              ) : (
                'Crear Cliente'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Configuracion
