import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import './Reclamos.css'

// Estados del Kanban
const ESTADOS = {
  pendiente: { label: 'Pendiente', color: '#ff9800', icon: '⏳' },
  asignado: { label: 'Asignado', color: '#2196f3', icon: '👤' },
  en_proceso: { label: 'Atendiendo', color: '#9c27b0', icon: '🔧' },
  resuelto: { label: 'Solucionado', color: '#4caf50', icon: '✅' }
}

// Componente de tarjeta de reclamo arrastrable
function ReclamoCard({ reclamo }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: reclamo.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  const getPrioridadColor = (prioridad) => {
    switch (prioridad) {
      case 'urgente': return '#f44336'
      case 'alta': return '#ff9800'
      case 'media': return '#2196f3'
      case 'baja': return '#9e9e9e'
      default: return '#9e9e9e'
    }
  }

  const getPrioridadLabel = (prioridad) => {
    switch (prioridad) {
      case 'urgente': return 'Urgente'
      case 'alta': return 'Alta'
      case 'media': return 'Media'
      case 'baja': return 'Baja'
      default: return prioridad
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
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="reclamo-kanban-card"
    >
      <div className="card-header">
        <div className="tipo-badge">
          <span className="tipo-emoji">{getIconoTipo(reclamo.tipo_nombre)}</span>
          <span className="tipo-nombre">{reclamo.tipo_nombre}</span>
        </div>
        <span
          className="prioridad-badge"
          style={{ backgroundColor: getPrioridadColor(reclamo.prioridad) }}
        >
          {getPrioridadLabel(reclamo.prioridad)}
        </span>
      </div>

      <h4 className="card-titulo">{reclamo.titulo}</h4>

      <p className="card-descripcion">
        {reclamo.descripcion.length > 100
          ? `${reclamo.descripcion.substring(0, 100)}...`
          : reclamo.descripcion}
      </p>

      <div className="card-info">
        <div className="info-item">
          <span className="info-label">Cliente:</span>
          <span className="info-value">{reclamo.cliente_nombre}</span>
        </div>
        <div className="info-item">
          <span className="info-label">📍</span>
          <span className="info-value">{reclamo.ubicacion}</span>
        </div>
      </div>

      {reclamo.asignado_nombre && (
        <div className="card-asignado">
          👤 Asignado a: <strong>{reclamo.asignado_nombre}</strong>
        </div>
      )}

      <div className="card-footer">
        <span className="card-fecha">
          {new Date(reclamo.created_at).toLocaleDateString('es-ES', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
          })}
        </span>
        {reclamo.total_comentarios > 0 && (
          <span className="card-comentarios">
            💬 {reclamo.total_comentarios}
          </span>
        )}
      </div>
    </div>
  )
}

// Componente de columna del Kanban con droppable
function KanbanColumn({ estado, reclamos }) {
  const estadoInfo = ESTADOS[estado]
  const { setNodeRef } = useDroppable({
    id: estado,
  })

  return (
    <div className="kanban-column">
      <div className="column-header" style={{ borderTopColor: estadoInfo.color }}>
        <div className="column-title">
          <span className="column-icon">{estadoInfo.icon}</span>
          <span className="column-label">{estadoInfo.label}</span>
        </div>
        <span className="column-count">{reclamos.length}</span>
      </div>
      <div className="column-content" ref={setNodeRef}>
        <SortableContext
          items={reclamos.map(r => r.id)}
          strategy={verticalListSortingStrategy}
        >
          {reclamos.map(reclamo => (
            <ReclamoCard key={reclamo.id} reclamo={reclamo} />
          ))}
          {reclamos.length === 0 && (
            <div className="empty-column">
              <span>Arrastra reclamos aquí</span>
            </div>
          )}
        </SortableContext>
      </div>
    </div>
  )
}

export default function Reclamos() {
  const [reclamos, setReclamos] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeId, setActiveId] = useState(null)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroPrioridad, setFiltroPrioridad] = useState('todos')
  const [tiposReclamos, setTiposReclamos] = useState([])

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Mínimo movimiento para activar drag
      },
    })
  )

  useEffect(() => {
    cargarReclamos()
    cargarTiposReclamos()
  }, [])

  const cargarReclamos = async () => {
    setLoading(true)
    const { data, error } = await supabase.rpc('obtener_reclamos_admin')

    if (!error && data) {
      setReclamos(data)
    } else {
      console.error('Error al cargar reclamos:', error)
    }
    setLoading(false)
  }

  const cargarTiposReclamos = async () => {
    const { data, error } = await supabase.rpc('obtener_tipos_reclamos')
    if (!error && data) {
      setTiposReclamos(data)
    }
  }

  const handleDragStart = (event) => {
    setActiveId(event.active.id)
  }

  const handleDragEnd = async (event) => {
    const { active, over } = event

    setActiveId(null)

    if (!over) return

    const reclamoId = active.id
    const reclamo = reclamos.find(r => r.id === reclamoId)
    if (!reclamo) return

    // Determinar el nuevo estado
    // Si se soltó sobre una columna (estado), usar ese estado
    // Si se soltó sobre otro reclamo, encontrar el estado de ese reclamo
    let nuevoEstado = over.id

    // Si over.id no es un estado válido, entonces se soltó sobre otro reclamo
    if (!ESTADOS[over.id]) {
      const reclamoDestino = reclamos.find(r => r.id === over.id)
      if (reclamoDestino) {
        nuevoEstado = reclamoDestino.estado
      } else {
        return
      }
    }

    // Si el estado es el mismo, no hacer nada
    if (reclamo.estado === nuevoEstado) return

    // Actualizar optimistamente en el UI
    setReclamos(prevReclamos =>
      prevReclamos.map(r =>
        r.id === reclamoId ? { ...r, estado: nuevoEstado } : r
      )
    )

    // Actualizar en la base de datos
    const { data, error } = await supabase.rpc('actualizar_estado_reclamo', {
      p_reclamo_id: reclamoId,
      p_nuevo_estado: nuevoEstado
    })

    if (error || (data && !data.exito)) {
      console.error('Error al actualizar estado:', error || data.mensaje)
      // Revertir el cambio optimista
      cargarReclamos()
    }
  }

  const handleDragCancel = () => {
    setActiveId(null)
  }

  // Filtrar reclamos
  const reclamosFiltrados = reclamos.filter(reclamo => {
    const pasaTipo = filtroTipo === 'todos' || reclamo.tipo_reclamo_id === filtroTipo
    const pasaPrioridad = filtroPrioridad === 'todos' || reclamo.prioridad === filtroPrioridad
    return pasaTipo && pasaPrioridad
  })

  // Agrupar reclamos por estado
  const reclamosPorEstado = {
    pendiente: reclamosFiltrados.filter(r => r.estado === 'pendiente'),
    asignado: reclamosFiltrados.filter(r => r.estado === 'asignado'),
    en_proceso: reclamosFiltrados.filter(r => r.estado === 'en_proceso'),
    resuelto: reclamosFiltrados.filter(r => r.estado === 'resuelto')
  }

  const reclamoActivo = activeId ? reclamos.find(r => r.id === activeId) : null

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando reclamos...</p>
      </div>
    )
  }

  return (
    <div className="reclamos-admin-container">
      <div className="page-header">
        <div>
          <h2>Gestión de Reclamos</h2>
          <p className="page-subtitle">Arrastra y suelta para cambiar el estado</p>
        </div>
        <button className="btn-refresh" onClick={cargarReclamos}>
          🔄 Actualizar
        </button>
      </div>

      {/* Filtros */}
      <div className="filtros-section">
        <div className="filtro-group">
          <label>Tipo:</label>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="filtro-select"
          >
            <option value="todos">Todos los tipos</option>
            {tiposReclamos.map(tipo => (
              <option key={tipo.id} value={tipo.id}>{tipo.nombre}</option>
            ))}
          </select>
        </div>

        <div className="filtro-group">
          <label>Prioridad:</label>
          <select
            value={filtroPrioridad}
            onChange={(e) => setFiltroPrioridad(e.target.value)}
            className="filtro-select"
          >
            <option value="todos">Todas las prioridades</option>
            <option value="urgente">Urgente</option>
            <option value="alta">Alta</option>
            <option value="media">Media</option>
            <option value="baja">Baja</option>
          </select>
        </div>

        <div className="stats-mini">
          <span className="stat-mini">
            📋 Total: <strong>{reclamosFiltrados.length}</strong>
          </span>
        </div>
      </div>

      {/* Tablero Kanban */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="kanban-board">
          {Object.keys(ESTADOS).map(estado => (
            <KanbanColumn
              key={estado}
              estado={estado}
              reclamos={reclamosPorEstado[estado]}
            />
          ))}
        </div>

        <DragOverlay>
          {reclamoActivo ? (
            <div className="reclamo-kanban-card dragging">
              <div className="card-header">
                <div className="tipo-badge">
                  <span className="tipo-nombre">{reclamoActivo.tipo_nombre}</span>
                </div>
              </div>
              <h4 className="card-titulo">{reclamoActivo.titulo}</h4>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
