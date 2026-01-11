import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmpleado } from '../../contexts/EmpleadoAuthContext'
import { supabase } from '../../services/supabase'
import './DashboardTecnico.css'

export default function DashboardTecnico() {
  const { empleado: tecnico } = useEmpleado()
  const navigate = useNavigate()
  const [stats, setStats] = useState({
    total_asignados: 0,
    pendientes: 0,
    en_proceso: 0,
    resueltos_hoy: 0,
    urgentes: 0
  })
  const [reclamosRecientes, setReclamosRecientes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [tecnico?.id])

  const cargarDatos = async () => {
    if (!tecnico?.id) return

    setLoading(true)
    try {
      // Obtener todos los reclamos asignados
      const { data: reclamos, error } = await supabase.rpc('obtener_reclamos_tecnico', {
        p_tecnico_id: tecnico.id
      })

      if (error) throw error

      if (reclamos) {
        // Calcular estadísticas
        const hoy = new Date().toDateString()
        const stats = {
          total_asignados: reclamos.length,
          pendientes: reclamos.filter(r => r.estado === 'Pendiente' || r.estado === 'Asignado').length,
          en_proceso: reclamos.filter(r => r.estado === 'En Proceso').length,
          resueltos_hoy: reclamos.filter(r => {
            if (r.estado === 'Resuelto' && r.updated_at) {
              return new Date(r.updated_at).toDateString() === hoy
            }
            return false
          }).length,
          urgentes: reclamos.filter(r => (r.prioridad === 'urgente' || r.prioridad === 'alta') && r.estado !== 'Resuelto').length
        }

        setStats(stats)

        // Obtener los 5 reclamos más recientes que no estén resueltos
        const recientes = reclamos
          .filter(r => r.estado !== 'Resuelto')
          .sort((a, b) => {
            // Ordenar por prioridad primero
            const prioridadOrder = { urgente: 1, alta: 2, media: 3, baja: 4 }
            return (prioridadOrder[a.prioridad] || 5) - (prioridadOrder[b.prioridad] || 5)
          })
          .slice(0, 5)

        setReclamosRecientes(recientes)
      }
    } catch (error) {
      console.error('Error cargando datos:', error)
    }
    setLoading(false)
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
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

  const getPrioridadLabel = (prioridad) => {
    const labels = {
      urgente: 'Urgente',
      alta: 'Alta',
      media: 'Media',
      baja: 'Baja'
    }
    return labels[prioridad] || prioridad
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Cargando...</p>
      </div>
    )
  }

  return (
    <div className="dashboard-tecnico">
      <div className="welcome-section">
        <div className="welcome-text">
          <h1>Hola, {tecnico?.nombre_completo?.split(' ')[0] || 'Técnico'}</h1>
          <p>{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button className="btn-ver-reclamos" onClick={() => navigate('/tecnico/reclamos')}>
          <span>🔧</span>
          Mis Reclamos
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-total">
          <span className="stat-icon">📋</span>
          <div className="stat-content">
            <span className="stat-value">{stats.total_asignados}</span>
            <span className="stat-label">Total asignados</span>
          </div>
        </div>
        <div className="stat-card stat-proceso">
          <span className="stat-icon">⚙️</span>
          <div className="stat-content">
            <span className="stat-value">{stats.en_proceso}</span>
            <span className="stat-label">En proceso</span>
          </div>
        </div>
        <div className="stat-card stat-pendientes">
          <span className="stat-icon">⏳</span>
          <div className="stat-content">
            <span className="stat-value">{stats.pendientes}</span>
            <span className="stat-label">Pendientes</span>
          </div>
        </div>
        <div className="stat-card stat-urgentes">
          <span className="stat-icon">⚠️</span>
          <div className="stat-content">
            <span className="stat-value">{stats.urgentes}</span>
            <span className="stat-label">Urgentes</span>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h2>Acciones Rápidas</h2>
        <div className="actions-grid">
          <div className="action-card" onClick={() => navigate('/tecnico/reclamos')}>
            <span className="action-icon">🔧</span>
            <span className="action-label">Mis Reclamos</span>
          </div>
          <div className="action-card" onClick={() => navigate('/tecnico/mapa')}>
            <span className="action-icon">🗺️</span>
            <span className="action-label">Ver Mapa</span>
          </div>
          <div className="action-card" onClick={() => navigate('/tecnico/notificaciones')}>
            <span className="action-icon">📢</span>
            <span className="action-label">Notificaciones</span>
          </div>
          <div className="action-card" onClick={cargarDatos}>
            <span className="action-icon">🔄</span>
            <span className="action-label">Actualizar</span>
          </div>
        </div>
      </div>

      <div className="recent-section">
        <div className="section-header">
          <h2>Reclamos Prioritarios</h2>
          <button className="btn-ver-todas" onClick={() => navigate('/tecnico/reclamos')}>
            Ver todos
          </button>
        </div>

        {reclamosRecientes.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">✅</span>
            <p>No tienes reclamos pendientes</p>
            <p className="empty-subtitle">¡Buen trabajo!</p>
          </div>
        ) : (
          <div className="reclamos-list">
            {reclamosRecientes.map((reclamo) => (
              <div
                key={reclamo.id}
                className="reclamo-item"
                onClick={() => navigate('/tecnico/reclamos')}
              >
                <div className="reclamo-header">
                  <span className="reclamo-tipo">{reclamo.tipo_reclamo_icono} {reclamo.tipo_reclamo_nombre}</span>
                  <span
                    className="prioridad-badge"
                    style={{ backgroundColor: getPrioridadColor(reclamo.prioridad) }}
                  >
                    {getPrioridadLabel(reclamo.prioridad)}
                  </span>
                </div>
                <div className="reclamo-info">
                  <div className="reclamo-cliente">
                    <span className="cliente-icon">👤</span>
                    <div>
                      <span className="cliente-nombre">{reclamo.cliente_nombre}</span>
                      <span className="cliente-direccion">{reclamo.cliente_direccion}</span>
                    </div>
                  </div>
                </div>
                <div className="reclamo-descripcion">
                  {reclamo.descripcion}
                </div>
                <div className="reclamo-footer">
                  <span className={`estado-badge estado-${reclamo.estado.toLowerCase().replace(' ', '-')}`}>
                    {reclamo.estado}
                  </span>
                  <span className="reclamo-fecha">
                    {formatDate(reclamo.created_at)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
