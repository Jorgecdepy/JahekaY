import { useState, useEffect } from 'react'
import { useTecnico } from '../../contexts/TecnicoAuthContext'
import { supabase } from '../../services/supabase'
import './ReclamosAsignados.css'

export default function ReclamosAsignados() {
  const { tecnico } = useTecnico()
  const [reclamos, setReclamos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [reclamoSeleccionado, setReclamoSeleccionado] = useState(null)
  const [mostrarModal, setMostrarModal] = useState(false)
  const [nuevoEstado, setNuevoEstado] = useState('')
  const [resolucion, setResolucion] = useState('')
  const [actualizando, setActualizando] = useState(false)

  useEffect(() => {
    cargarReclamos()
  }, [tecnico?.id])

  const cargarReclamos = async () => {
    if (!tecnico?.id) return

    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('obtener_reclamos_tecnico', {
        p_tecnico_id: tecnico.id
      })

      if (error) throw error
      setReclamos(data || [])
    } catch (error) {
      console.error('Error cargando reclamos:', error)
    }
    setLoading(false)
  }

  const reclamosFiltrados = reclamos.filter(r => {
    if (filtroEstado === 'todos') return true
    if (filtroEstado === 'activos') return r.estado !== 'Resuelto'
    return r.estado === filtroEstado
  })

  const abrirModal = (reclamo) => {
    setReclamoSeleccionado(reclamo)
    setNuevoEstado(reclamo.estado)
    setResolucion(reclamo.resolucion || '')
    setMostrarModal(true)
  }

  const cerrarModal = () => {
    setMostrarModal(false)
    setReclamoSeleccionado(null)
    setNuevoEstado('')
    setResolucion('')
  }

  const actualizarReclamo = async () => {
    if (!reclamoSeleccionado) return

    setActualizando(true)
    try {
      const { data, error } = await supabase.rpc('actualizar_reclamo_tecnico', {
        p_reclamo_id: reclamoSeleccionado.id,
        p_tecnico_id: tecnico.id,
        p_estado: nuevoEstado,
        p_resolucion: resolucion || null
      })

      if (error) throw error

      if (data && data[0]?.success) {
        alert('Reclamo actualizado exitosamente')
        cerrarModal()
        cargarReclamos()
      } else {
        alert('Error al actualizar el reclamo')
      }
    } catch (error) {
      console.error('Error:', error)
      alert('Error al actualizar el reclamo')
    }
    setActualizando(false)
  }

  const iniciarGPS = async (reclamo) => {
    if (!navigator.geolocation) {
      alert('Tu dispositivo no soporta geolocalización')
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords

        try {
          const { data, error } = await supabase.rpc('actualizar_coordenadas_reclamo', {
            p_reclamo_id: reclamo.id,
            p_tecnico_id: tecnico.id,
            p_latitud: latitude,
            p_longitud: longitude
          })

          if (error) throw error

          if (data && data[0]?.success) {
            alert('Ubicación GPS guardada exitosamente')
            cargarReclamos()
          }
        } catch (error) {
          console.error('Error:', error)
          alert('Error al guardar la ubicación')
        }
      },
      (error) => {
        console.error('Error GPS:', error)
        alert('No se pudo obtener la ubicación GPS')
      }
    )
  }

  const getPrioridadColor = (prioridad) => {
    const colores = {
      urgente: '#ef4444',
      alta: '#f59e0b',
      media: '#3b82f6',
      baja: '#6b7280'
    }
    return colores[prioridad] || '#6b7280'
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div className="reclamos-loading">
        <div className="spinner"></div>
        <p>Cargando reclamos...</p>
      </div>
    )
  }

  return (
    <div className="reclamos-asignados">
      <div className="reclamos-header">
        <div>
          <h1>Mis Reclamos</h1>
          <p>{reclamosFiltrados.length} reclamo(s) {filtroEstado !== 'todos' ? `(${filtroEstado})` : ''}</p>
        </div>
        <button className="btn-refresh" onClick={cargarReclamos}>
          🔄 Actualizar
        </button>
      </div>

      <div className="filtros">
        <button
          className={`filtro-btn ${filtroEstado === 'todos' ? 'active' : ''}`}
          onClick={() => setFiltroEstado('todos')}
        >
          Todos ({reclamos.length})
        </button>
        <button
          className={`filtro-btn ${filtroEstado === 'activos' ? 'active' : ''}`}
          onClick={() => setFiltroEstado('activos')}
        >
          Activos ({reclamos.filter(r => r.estado !== 'Resuelto').length})
        </button>
        <button
          className={`filtro-btn ${filtroEstado === 'Pendiente' ? 'active' : ''}`}
          onClick={() => setFiltroEstado('Pendiente')}
        >
          Pendientes ({reclamos.filter(r => r.estado === 'Pendiente').length})
        </button>
        <button
          className={`filtro-btn ${filtroEstado === 'En Proceso' ? 'active' : ''}`}
          onClick={() => setFiltroEstado('En Proceso')}
        >
          En Proceso ({reclamos.filter(r => r.estado === 'En Proceso').length})
        </button>
        <button
          className={`filtro-btn ${filtroEstado === 'Resuelto' ? 'active' : ''}`}
          onClick={() => setFiltroEstado('Resuelto')}
        >
          Resueltos ({reclamos.filter(r => r.estado === 'Resuelto').length})
        </button>
      </div>

      {reclamosFiltrados.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">✅</span>
          <p>No hay reclamos {filtroEstado !== 'todos' ? filtroEstado.toLowerCase() : ''}</p>
        </div>
      ) : (
        <div className="reclamos-grid">
          {reclamosFiltrados.map((reclamo) => (
            <div key={reclamo.id} className="reclamo-card">
              <div className="reclamo-card-header">
                <span className="reclamo-numero">#{reclamo.numero_reclamo}</span>
                <span
                  className="prioridad-badge"
                  style={{ backgroundColor: getPrioridadColor(reclamo.prioridad) }}
                >
                  {reclamo.prioridad.toUpperCase()}
                </span>
              </div>

              <div className="reclamo-card-body">
                <div className="reclamo-tipo">
                  <span className="tipo-icon">{reclamo.tipo_reclamo_icono}</span>
                  <span className="tipo-nombre">{reclamo.tipo_reclamo_nombre}</span>
                </div>

                <div className="reclamo-cliente">
                  <span className="label">Cliente:</span>
                  <span className="value">{reclamo.cliente_nombre}</span>
                </div>

                <div className="reclamo-ubicacion">
                  <span className="label">📍 Ubicación:</span>
                  <span className="value">{reclamo.cliente_direccion}</span>
                </div>

                {reclamo.ubicacion && (
                  <div className="reclamo-descripcion-ubicacion">
                    <span className="label">Descripción ubicación:</span>
                    <span className="value">{reclamo.ubicacion}</span>
                  </div>
                )}

                <div className="reclamo-descripcion">
                  <span className="label">Descripción:</span>
                  <p className="value">{reclamo.descripcion}</p>
                </div>

                <div className="reclamo-gps">
                  {reclamo.latitud && reclamo.longitud ? (
                    <span className="gps-verificado">
                      ✓ GPS Verificado ({reclamo.latitud.toFixed(6)}, {reclamo.longitud.toFixed(6)})
                    </span>
                  ) : (
                    <button
                      className="btn-gps"
                      onClick={() => iniciarGPS(reclamo)}
                    >
                      📍 Marcar Ubicación GPS
                    </button>
                  )}
                </div>
              </div>

              <div className="reclamo-card-footer">
                <span className={`estado-badge estado-${reclamo.estado.toLowerCase().replace(' ', '-')}`}>
                  {reclamo.estado}
                </span>
                <span className="fecha">{formatDate(reclamo.created_at)}</span>
                <button
                  className="btn-actualizar"
                  onClick={() => abrirModal(reclamo)}
                >
                  ✏️ Actualizar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {mostrarModal && reclamoSeleccionado && (
        <div className="modal-overlay" onClick={cerrarModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Actualizar Reclamo</h2>
              <button className="btn-close" onClick={cerrarModal}>✕</button>
            </div>

            <div className="modal-body">
              <div className="modal-info">
                <p><strong>#{reclamoSeleccionado.numero_reclamo}</strong></p>
                <p>{reclamoSeleccionado.tipo_reclamo_icono} {reclamoSeleccionado.tipo_reclamo_nombre}</p>
                <p>Cliente: {reclamoSeleccionado.cliente_nombre}</p>
              </div>

              <div className="form-group">
                <label>Estado del Reclamo</label>
                <select
                  value={nuevoEstado}
                  onChange={(e) => setNuevoEstado(e.target.value)}
                  className="form-select"
                >
                  <option value="Asignado">Asignado</option>
                  <option value="En Proceso">En Proceso</option>
                  <option value="Resuelto">Resuelto</option>
                </select>
              </div>

              <div className="form-group">
                <label>Resolución / Notas</label>
                <textarea
                  value={resolucion}
                  onChange={(e) => setResolucion(e.target.value)}
                  placeholder="Describe qué se hizo para resolver el problema..."
                  className="form-textarea"
                  rows={4}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={cerrarModal}>
                Cancelar
              </button>
              <button
                className="btn-save"
                onClick={actualizarReclamo}
                disabled={actualizando}
              >
                {actualizando ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
