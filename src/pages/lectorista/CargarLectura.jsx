import { useState, useEffect, useRef } from 'react'
import { useEmpleado } from '../../contexts/EmpleadoAuthContext'
import { supabase } from '../../services/supabase'
import './CargarLectura.css'

export default function CargarLectura() {
  const { empleado } = useEmpleado()
  const [clientes, setClientes] = useState([])
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [resultadosBusqueda, setResultadosBusqueda] = useState([])
  const [buscando, setBuscando] = useState(false)
  const [ultimaLectura, setUltimaLectura] = useState(null)
  const [loading, setLoading] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const inputLecturaRef = useRef(null)

  const [formData, setFormData] = useState({
    lectura_actual: '',
    observaciones: ''
  })

  // Buscar clientes cuando cambia el texto de búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      if (busqueda.length >= 2) {
        buscarClientes(busqueda)
      } else {
        setResultadosBusqueda([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [busqueda])

  const buscarClientes = async (texto) => {
    setBuscando(true)
    try {
      const { data, error } = await supabase.rpc('buscar_clientes_lectura', {
        p_busqueda: texto
      })

      if (!error && data) {
        setResultadosBusqueda(data)
      }
    } catch (error) {
      console.error('Error al buscar clientes:', error)
    }
    setBuscando(false)
  }

  const seleccionarCliente = async (cliente) => {
    setClienteSeleccionado(cliente)
    setBusqueda('')
    setResultadosBusqueda([])
    setFormData({ lectura_actual: '', observaciones: '' })
    setMensaje(null)

    // Cargar última lectura del cliente
    try {
      const { data, error } = await supabase.rpc('obtener_ultima_lectura_cliente', {
        p_cliente_id: cliente.id
      })

      if (!error && data) {
        setUltimaLectura(data)
      } else {
        setUltimaLectura(null)
      }
    } catch (error) {
      console.error('Error al cargar última lectura:', error)
      setUltimaLectura(null)
    }

    // Enfocar el campo de lectura
    setTimeout(() => {
      inputLecturaRef.current?.focus()
    }, 100)
  }

  const limpiarSeleccion = () => {
    setClienteSeleccionado(null)
    setUltimaLectura(null)
    setFormData({ lectura_actual: '', observaciones: '' })
    setMensaje(null)
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const calcularConsumo = () => {
    if (!formData.lectura_actual || !ultimaLectura) return 0
    const consumo = parseInt(formData.lectura_actual) - (ultimaLectura.lectura_actual || 0)
    return consumo >= 0 ? consumo : 0
  }

  const validarLectura = () => {
    const lecturaActual = parseInt(formData.lectura_actual)
    const lecturaAnterior = ultimaLectura?.lectura_actual || 0

    if (isNaN(lecturaActual) || lecturaActual < 0) {
      return { valido: false, mensaje: 'Ingresa una lectura válida' }
    }

    if (lecturaActual < lecturaAnterior) {
      return { valido: false, mensaje: `La lectura debe ser mayor o igual a ${lecturaAnterior}` }
    }

    const consumo = lecturaActual - lecturaAnterior
    if (consumo > 500) {
      return { valido: true, advertencia: `Consumo alto detectado: ${consumo} m³. ¿Confirmar?` }
    }

    return { valido: true }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!clienteSeleccionado) {
      setMensaje({ tipo: 'error', texto: 'Selecciona un cliente primero' })
      return
    }

    const validacion = validarLectura()
    if (!validacion.valido) {
      setMensaje({ tipo: 'error', texto: validacion.mensaje })
      return
    }

    if (validacion.advertencia) {
      if (!window.confirm(validacion.advertencia)) {
        return
      }
    }

    setLoading(true)
    setMensaje(null)

    try {
      const { data, error } = await supabase.rpc('registrar_lectura_lectorista', {
        p_cliente_id: clienteSeleccionado.id,
        p_empleado_id: empleado.id,
        p_lectura_actual: parseInt(formData.lectura_actual),
        p_observaciones: formData.observaciones || null
      })

      if (error) throw error

      if (data.exito) {
        setMensaje({ tipo: 'exito', texto: '¡Lectura registrada correctamente!' })

        // Limpiar para nueva lectura
        setTimeout(() => {
          limpiarSeleccion()
        }, 2000)
      } else {
        setMensaje({ tipo: 'error', texto: data.mensaje || 'Error al registrar lectura' })
      }
    } catch (error) {
      console.error('Error:', error)
      setMensaje({ tipo: 'error', texto: 'Error al guardar la lectura. Intenta nuevamente.' })
    }

    setLoading(false)
  }

  return (
    <div className="cargar-lectura-container">
      <div className="page-header">
        <h1>📝 Cargar Lectura</h1>
        <p>Registra la lectura del medidor</p>
      </div>

      {/* Buscador de Cliente */}
      {!clienteSeleccionado ? (
        <div className="buscar-cliente-section">
          <div className="search-box">
            <span className="search-icon">🔍</span>
            <input
              type="text"
              placeholder="Buscar por nombre, medidor o dirección..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              autoFocus
            />
            {buscando && <span className="search-spinner"></span>}
          </div>

          {resultadosBusqueda.length > 0 && (
            <div className="resultados-busqueda">
              {resultadosBusqueda.map((cliente) => (
                <div
                  key={cliente.id}
                  className="resultado-item"
                  onClick={() => seleccionarCliente(cliente)}
                >
                  <div className="resultado-info">
                    <span className="resultado-nombre">{cliente.nombre_completo}</span>
                    <span className="resultado-direccion">📍 {cliente.direccion}</span>
                  </div>
                  <div className="resultado-medidor">
                    <span className="medidor-label">Medidor</span>
                    <span className="medidor-numero">{cliente.numero_medidor}</span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {busqueda.length >= 2 && resultadosBusqueda.length === 0 && !buscando && (
            <div className="no-resultados">
              <span>😕</span>
              <p>No se encontraron clientes</p>
            </div>
          )}

          {busqueda.length < 2 && (
            <div className="search-hint">
              <span>💡</span>
              <p>Escribe al menos 2 caracteres para buscar</p>
            </div>
          )}
        </div>
      ) : (
        /* Formulario de Lectura */
        <div className="lectura-section">
          {/* Info del Cliente Seleccionado */}
          <div className="cliente-seleccionado">
            <div className="cliente-header">
              <div className="cliente-info">
                <span className="cliente-icon">👤</span>
                <div>
                  <h3>{clienteSeleccionado.nombre_completo}</h3>
                  <p className="cliente-direccion">📍 {clienteSeleccionado.direccion}</p>
                </div>
              </div>
              <button className="btn-cambiar" onClick={limpiarSeleccion}>
                Cambiar
              </button>
            </div>
            <div className="cliente-medidor">
              <span className="medidor-label">Medidor:</span>
              <span className="medidor-valor">{clienteSeleccionado.numero_medidor}</span>
            </div>
          </div>

          {/* Lectura Anterior */}
          {ultimaLectura && (
            <div className="lectura-anterior">
              <h4>Última Lectura</h4>
              <div className="anterior-grid">
                <div className="anterior-item">
                  <span className="anterior-label">Lectura</span>
                  <span className="anterior-valor">{ultimaLectura.lectura_actual} m³</span>
                </div>
                <div className="anterior-item">
                  <span className="anterior-label">Fecha</span>
                  <span className="anterior-valor">
                    {new Date(ultimaLectura.fecha_lectura).toLocaleDateString('es-ES')}
                  </span>
                </div>
                <div className="anterior-item">
                  <span className="anterior-label">Consumo</span>
                  <span className="anterior-valor">{ultimaLectura.consumo_m3} m³</span>
                </div>
              </div>
            </div>
          )}

          {!ultimaLectura && (
            <div className="sin-lectura-anterior">
              <span>ℹ️</span>
              <p>Primera lectura de este cliente</p>
            </div>
          )}

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="lectura-form">
            {mensaje && (
              <div className={`mensaje mensaje-${mensaje.tipo}`}>
                <span>{mensaje.tipo === 'exito' ? '✅' : '⚠️'}</span>
                {mensaje.texto}
              </div>
            )}

            <div className="form-group">
              <label htmlFor="lectura_actual">Lectura Actual (m³) *</label>
              <input
                ref={inputLecturaRef}
                type="number"
                id="lectura_actual"
                name="lectura_actual"
                value={formData.lectura_actual}
                onChange={handleChange}
                placeholder="Ingresa la lectura del medidor"
                min={ultimaLectura?.lectura_actual || 0}
                required
                className="input-lectura"
              />
            </div>

            {/* Cálculo de consumo en tiempo real */}
            {formData.lectura_actual && (
              <div className="consumo-calculado">
                <span className="consumo-label">Consumo estimado:</span>
                <span className={`consumo-valor ${calcularConsumo() > 100 ? 'consumo-alto' : ''}`}>
                  {calcularConsumo()} m³
                </span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="observaciones">Observaciones (opcional)</label>
              <textarea
                id="observaciones"
                name="observaciones"
                value={formData.observaciones}
                onChange={handleChange}
                placeholder="Medidor dañado, acceso difícil, etc."
                rows="3"
              />
            </div>

            <div className="form-actions">
              <button
                type="button"
                className="btn-cancelar"
                onClick={limpiarSeleccion}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn-guardar"
                disabled={loading || !formData.lectura_actual}
              >
                {loading ? (
                  <>
                    <span className="spinner-small"></span>
                    Guardando...
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    Guardar Lectura
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
