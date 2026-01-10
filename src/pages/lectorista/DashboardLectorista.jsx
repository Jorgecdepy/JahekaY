import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useEmpleado } from '../../contexts/EmpleadoAuthContext'
import { supabase } from '../../services/supabase'
import './DashboardLectorista.css'

export default function DashboardLectorista() {
  const { empleado } = useEmpleado()
  const navigate = useNavigate()
  const [stats, setStats] = useState(null)
  const [ultimasLecturas, setUltimasLecturas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [empleado?.id])

  const cargarDatos = async () => {
    if (!empleado?.id) return

    setLoading(true)
    try {
      const { data: statsData } = await supabase.rpc('obtener_stats_lectorista', {
        p_empleado_id: empleado.id
      })

      if (statsData) {
        setStats(statsData)
      }

      const { data: lecturasData } = await supabase.rpc('obtener_lecturas_lectorista', {
        p_empleado_id: empleado.id,
        p_limite: 5
      })

      if (lecturasData) {
        setUltimasLecturas(lecturasData)
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

  const formatTime = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
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
    <div className="dashboard-lectorista">
      <div className="welcome-section">
        <div className="welcome-text">
          <h1>Hola, {empleado?.nombre_completo?.split(' ')[0] || 'Lectorista'}</h1>
          <p>{new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <button className="btn-cargar-rapido" onClick={() => navigate('/lectorista/cargar')}>
          <span>📝</span>
          Cargar Lectura
        </button>
      </div>

      <div className="stats-grid">
        <div className="stat-card stat-hoy">
          <span className="stat-icon">📊</span>
          <div className="stat-content">
            <span className="stat-value">{stats?.lecturas_hoy || 0}</span>
            <span className="stat-label">Lecturas hoy</span>
          </div>
        </div>
        <div className="stat-card stat-mes">
          <span className="stat-icon">📅</span>
          <div className="stat-content">
            <span className="stat-value">{stats?.lecturas_mes || 0}</span>
            <span className="stat-label">Este mes</span>
          </div>
        </div>
        <div className="stat-card stat-pendientes">
          <span className="stat-icon">⏳</span>
          <div className="stat-content">
            <span className="stat-value">{stats?.clientes_pendientes || 0}</span>
            <span className="stat-label">Pendientes</span>
          </div>
        </div>
      </div>

      <div className="quick-actions">
        <h2>Acciones Rápidas</h2>
        <div className="actions-grid">
          <div className="action-card" onClick={() => navigate('/lectorista/cargar')}>
            <span className="action-icon">📝</span>
            <span className="action-label">Nueva Lectura</span>
          </div>
          <div className="action-card" onClick={() => navigate('/lectorista/mis-lecturas')}>
            <span className="action-icon">📋</span>
            <span className="action-label">Mis Lecturas</span>
          </div>
          <div className="action-card" onClick={() => navigate('/lectorista/buscar-cliente')}>
            <span className="action-icon">🔍</span>
            <span className="action-label">Buscar</span>
          </div>
          <div className="action-card" onClick={cargarDatos}>
            <span className="action-icon">🔄</span>
            <span className="action-label">Actualizar</span>
          </div>
        </div>
      </div>

      <div className="recent-section">
        <div className="section-header">
          <h2>Últimas Lecturas</h2>
          <button className="btn-ver-todas" onClick={() => navigate('/lectorista/mis-lecturas')}>
            Ver todas
          </button>
        </div>

        {ultimasLecturas.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📋</span>
            <p>No has registrado lecturas aún</p>
            <button className="btn-primary" onClick={() => navigate('/lectorista/cargar')}>
              Cargar primera lectura
            </button>
          </div>
        ) : (
          <div className="lecturas-list">
            {ultimasLecturas.map((lectura) => (
              <div key={lectura.id} className="lectura-item">
                <div className="lectura-info">
                  <div className="lectura-cliente">
                    <span className="cliente-icon">👤</span>
                    <div>
                      <span className="cliente-nombre">{lectura.cliente_nombre}</span>
                      <span className="cliente-medidor">Medidor: {lectura.numero_medidor}</span>
                    </div>
                  </div>
                </div>
                <div className="lectura-datos">
                  <div className="dato-lectura">
                    <span className="dato-valor">{lectura.lectura_actual}</span>
                    <span className="dato-label">m³</span>
                  </div>
                  <span className="consumo-badge">+{lectura.consumo_m3}</span>
                </div>
                <span className="lectura-fecha">
                  {formatDate(lectura.created_at)}
                  <br />
                  {formatTime(lectura.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
