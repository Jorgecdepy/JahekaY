import { useState, useEffect } from 'react'
import { useCliente } from '../../contexts/ClienteAuthContext'
import { supabase } from '../../config/supabaseClient'
import './ReclamosCliente.css'

export default function ReclamosCliente() {
  const { cliente } = useCliente()
  const [reclamos, setReclamos] = useState([])
  const [tiposReclamos, setTiposReclamos] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [reclamoSeleccionado, setReclamoSeleccionado] = useState(null)
  const [comentarios, setComentarios] = useState([])
  const [filtroEstado, setFiltroEstado] = useState('todos')

  const [formData, setFormData] = useState({
    tipo_reclamo_id: '',
    descripcion: '',
    ubicacion: '',
    foto_url: ''
  })

  const [nuevoComentario, setNuevoComentario] = useState('')
  const [enviando, setEnviando] = useState(false)

  useEffect(() => {
    cargarTiposReclamos()
    cargarReclamos()
  }, [cliente.id, filtroEstado])

  const cargarTiposReclamos = async () => {
    const { data, error } = await supabase
      .from('tipos_reclamos')
      .select('*')
      .eq('activo', true)
      .order('nombre')

    if (!error && data) {
      setTiposReclamos(data)
    }
  }

  const cargarReclamos = async () => {
    setLoading(true)

    let query = supabase
      .from('vista_reclamos_completa')
      .select('*')
      .eq('cliente_id', cliente.id)
      .order('fecha_creacion', { ascending: false })

    if (filtroEstado !== 'todos') {
      query = query.eq('estado', filtroEstado)
    }

    const { data, error } = await query

    if (!error && data) {
      setReclamos(data)
    }

    setLoading(false)
  }

  const cargarComentarios = async (reclamoId) => {
    const { data, error } = await supabase
      .from('comentarios_reclamos')
      .select('*')
      .eq('reclamo_id', reclamoId)
      .order('fecha_comentario', { ascending: true })

    if (!error && data) {
      setComentarios(data)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setEnviando(true)

    try {
      const { data, error } = await supabase
        .from('reclamos')
        .insert([{
          cliente_id: cliente.id,
          tipo_reclamo_id: formData.tipo_reclamo_id,
          descripcion: formData.descripcion,
          ubicacion: formData.ubicacion || cliente.direccion,
          foto_url: formData.foto_url || null,
          estado: 'pendiente'
        }])
        .select()

      if (error) throw error

      // Limpiar formulario
      setFormData({
        tipo_reclamo_id: '',
        descripcion: '',
        ubicacion: '',
        foto_url: ''
      })

      setMostrarFormulario(false)
      cargarReclamos()

      // Mostrar mensaje de éxito
      alert('¡Reclamo enviado exitosamente! Le notificaremos cuando sea atendido.')
    } catch (error) {
      console.error('Error al crear reclamo:', error)
      alert('Error al enviar el reclamo. Por favor intenta nuevamente.')
    }

    setEnviando(false)
  }

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const verDetalle = async (reclamo) => {
    setReclamoSeleccionado(reclamo)
    await cargarComentarios(reclamo.id)
  }

  const cerrarDetalle = () => {
    setReclamoSeleccionado(null)
    setComentarios([])
    setNuevoComentario('')
  }

  const agregarComentario = async (e) => {
    e.preventDefault()
    if (!nuevoComentario.trim()) return

    setEnviando(true)

    try {
      const { error } = await supabase
        .from('comentarios_reclamos')
        .insert([{
          reclamo_id: reclamoSeleccionado.id,
          usuario_id: cliente.id,
          comentario: nuevoComentario,
          es_cliente: true
        }])

      if (error) throw error

      setNuevoComentario('')
      await cargarComentarios(reclamoSeleccionado.id)
    } catch (error) {
      console.error('Error al agregar comentario:', error)
      alert('Error al enviar el comentario')
    }

    setEnviando(false)
  }

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'pendiente':
        return '#ff9800'
      case 'en_proceso':
        return '#2196f3'
      case 'resuelto':
        return '#4caf50'
      case 'rechazado':
        return '#f44336'
      default:
        return '#9e9e9e'
    }
  }

  const getEstadoTexto = (estado) => {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente'
      case 'en_proceso':
        return 'En Proceso'
      case 'resuelto':
        return 'Resuelto'
      case 'rechazado':
        return 'Rechazado'
      default:
        return estado
    }
  }

  const getIconoTipo = (tipoNombre) => {
    const iconos = {
      'Falta de Agua': '💧',
      'Tubería Rota': '🔧',
      'Fuga de Agua': '💦',
      'Medidor Dañado': '⚙️',
      'Agua Turbia': '🌫️',
      'Presión Baja': '📉',
      'Alcantarillado': '🚰',
      'Facturación': '💵',
      'Atención al Cliente': '👤',
      'Otro': '📝'
    }
    return iconos[tipoNombre] || '📋'
  }

  return (
    <div className="reclamos-cliente-container">
      {/* Header */}
      <div className="reclamos-header">
        <div className="header-content">
          <h1>Mis Reclamos</h1>
          <p>Gestiona tus solicitudes y reportes</p>
        </div>
        <button
          className="btn-nuevo-reclamo"
          onClick={() => setMostrarFormulario(true)}
        >
          <span className="btn-icon">+</span>
          Nuevo Reclamo
        </button>
      </div>

      {/* Filtros */}
      <div className="filtros-container">
        <div className="filtros">
          <button
            className={`filtro-btn ${filtroEstado === 'todos' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('todos')}
          >
            Todos
          </button>
          <button
            className={`filtro-btn ${filtroEstado === 'pendiente' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('pendiente')}
          >
            Pendientes
          </button>
          <button
            className={`filtro-btn ${filtroEstado === 'en_proceso' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('en_proceso')}
          >
            En Proceso
          </button>
          <button
            className={`filtro-btn ${filtroEstado === 'resuelto' ? 'active' : ''}`}
            onClick={() => setFiltroEstado('resuelto')}
          >
            Resueltos
          </button>
        </div>
      </div>

      {/* Lista de Reclamos */}
      <div className="reclamos-content">
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Cargando reclamos...</p>
          </div>
        ) : reclamos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No hay reclamos</h3>
            <p>
              {filtroEstado === 'todos'
                ? 'Aún no has enviado ningún reclamo'
                : `No tienes reclamos ${getEstadoTexto(filtroEstado).toLowerCase()}`
              }
            </p>
            <button
              className="btn-primary"
              onClick={() => setMostrarFormulario(true)}
            >
              Crear mi primer reclamo
            </button>
          </div>
        ) : (
          <div className="reclamos-grid">
            {reclamos.map((reclamo) => (
              <div
                key={reclamo.id}
                className="reclamo-card"
                onClick={() => verDetalle(reclamo)}
              >
                <div className="reclamo-header-card">
                  <div className="tipo-info">
                    <span className="tipo-icono">
                      {getIconoTipo(reclamo.tipo_nombre)}
                    </span>
                    <div>
                      <h3>{reclamo.tipo_nombre}</h3>
                      <p className="reclamo-fecha">
                        {new Date(reclamo.fecha_creacion).toLocaleDateString('es-ES', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  <span
                    className="estado-badge"
                    style={{ backgroundColor: getEstadoColor(reclamo.estado) }}
                  >
                    {getEstadoTexto(reclamo.estado)}
                  </span>
                </div>

                <p className="reclamo-descripcion">
                  {reclamo.descripcion}
                </p>

                <div className="reclamo-footer">
                  <span className="ubicacion">
                    📍 {reclamo.ubicacion}
                  </span>
                  {reclamo.total_comentarios > 0 && (
                    <span className="comentarios-count">
                      💬 {reclamo.total_comentarios} {reclamo.total_comentarios === 1 ? 'comentario' : 'comentarios'}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Formulario Nuevo Reclamo */}
      {mostrarFormulario && (
        <div className="modal-overlay" onClick={() => setMostrarFormulario(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Nuevo Reclamo</h2>
              <button
                className="btn-close"
                onClick={() => setMostrarFormulario(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="reclamo-form">
              <div className="form-group">
                <label htmlFor="tipo_reclamo_id">Tipo de Reclamo *</label>
                <select
                  id="tipo_reclamo_id"
                  name="tipo_reclamo_id"
                  value={formData.tipo_reclamo_id}
                  onChange={handleChange}
                  required
                >
                  <option value="">Selecciona un tipo</option>
                  {tiposReclamos.map((tipo) => (
                    <option key={tipo.id} value={tipo.id}>
                      {getIconoTipo(tipo.nombre)} {tipo.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="descripcion">Descripción del Problema *</label>
                <textarea
                  id="descripcion"
                  name="descripcion"
                  value={formData.descripcion}
                  onChange={handleChange}
                  placeholder="Describe detalladamente el problema..."
                  rows="4"
                  required
                />
              </div>

              <div className="form-group">
                <label htmlFor="ubicacion">Ubicación</label>
                <input
                  type="text"
                  id="ubicacion"
                  name="ubicacion"
                  value={formData.ubicacion}
                  onChange={handleChange}
                  placeholder={cliente.direccion}
                />
                <small>Deja vacío para usar tu dirección registrada</small>
              </div>

              <div className="form-group">
                <label htmlFor="foto_url">URL de Foto (Opcional)</label>
                <input
                  type="url"
                  id="foto_url"
                  name="foto_url"
                  value={formData.foto_url}
                  onChange={handleChange}
                  placeholder="https://ejemplo.com/foto.jpg"
                />
                <small>Sube una foto a un servicio como Imgur y pega el enlace aquí</small>
              </div>

              <div className="form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setMostrarFormulario(false)}
                  disabled={enviando}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={enviando}
                >
                  {enviando ? 'Enviando...' : 'Enviar Reclamo'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Detalle Reclamo */}
      {reclamoSeleccionado && (
        <div className="modal-overlay" onClick={cerrarDetalle}>
          <div className="modal-content modal-detalle" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>
                  {getIconoTipo(reclamoSeleccionado.tipo_nombre)} {reclamoSeleccionado.tipo_nombre}
                </h2>
                <p className="fecha-detalle">
                  Creado el {new Date(reclamoSeleccionado.fecha_creacion).toLocaleDateString('es-ES', {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </p>
              </div>
              <button className="btn-close" onClick={cerrarDetalle}>✕</button>
            </div>

            <div className="detalle-body">
              <div className="detalle-estado">
                <span
                  className="estado-badge-large"
                  style={{ backgroundColor: getEstadoColor(reclamoSeleccionado.estado) }}
                >
                  {getEstadoTexto(reclamoSeleccionado.estado)}
                </span>
              </div>

              <div className="detalle-section">
                <h3>Descripción</h3>
                <p>{reclamoSeleccionado.descripcion}</p>
              </div>

              <div className="detalle-section">
                <h3>Ubicación</h3>
                <p>📍 {reclamoSeleccionado.ubicacion}</p>
              </div>

              {reclamoSeleccionado.foto_url && (
                <div className="detalle-section">
                  <h3>Foto Adjunta</h3>
                  <img
                    src={reclamoSeleccionado.foto_url}
                    alt="Foto del reclamo"
                    className="reclamo-foto"
                  />
                </div>
              )}

              <div className="detalle-section">
                <h3>Seguimiento y Comentarios</h3>

                {comentarios.length === 0 ? (
                  <p className="sin-comentarios">Aún no hay comentarios en este reclamo</p>
                ) : (
                  <div className="comentarios-lista">
                    {comentarios.map((comentario) => (
                      <div
                        key={comentario.id}
                        className={`comentario ${comentario.es_cliente ? 'comentario-cliente' : 'comentario-admin'}`}
                      >
                        <div className="comentario-header">
                          <span className="comentario-autor">
                            {comentario.es_cliente ? '👤 Tú' : '👨‍💼 Administrador'}
                          </span>
                          <span className="comentario-fecha">
                            {new Date(comentario.fecha_comentario).toLocaleDateString('es-ES', {
                              day: '2-digit',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        <p className="comentario-texto">{comentario.comentario}</p>
                      </div>
                    ))}
                  </div>
                )}

                {reclamoSeleccionado.estado !== 'resuelto' && reclamoSeleccionado.estado !== 'rechazado' && (
                  <form onSubmit={agregarComentario} className="comentario-form">
                    <textarea
                      value={nuevoComentario}
                      onChange={(e) => setNuevoComentario(e.target.value)}
                      placeholder="Agrega información adicional..."
                      rows="3"
                    />
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={enviando || !nuevoComentario.trim()}
                    >
                      {enviando ? 'Enviando...' : 'Agregar Comentario'}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
