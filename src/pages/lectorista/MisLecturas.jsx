import { useState, useEffect } from 'react'
import { useEmpleado } from '../../contexts/EmpleadoAuthContext'
import { supabase } from '../../services/supabase'
import './MisLecturas.css'

export default function MisLecturas() {
  const { empleado } = useEmpleado()
  const [lecturas, setLecturas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('hoy')
  const [stats, setStats] = useState({ total: 0, consumoTotal: 0 })

  useEffect(() => {
    cargarLecturas()
  }, [empleado, filtro])

  const cargarLecturas = async () => {
    if (!empleado?.id) return

    setLoading(true)
    try {
      const { data, error } = await supabase.rpc('obtener_lecturas_lectorista', {
        p_empleado_id: empleado.id,
        p_filtro: filtro,
        p_limite: 100
      })

      if (!error && data) {
        setLecturas(data)

        // Calcular estadísticas
        const consumoTotal = data.reduce((acc, l) => acc + (l.consumo_m3 || 0), 0)
        setStats({ total: data.length, consumoTotal })
      }
    } catch (error) {
      console.error('Error al cargar lecturas:', error)
    }
    setLoading(false)
  }

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateShort = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short'
    })
  }

  return (
    <div className="mis-lecturas-container">
      <div className="page-header">
        <h1>📋 Mis Lecturas</h1>
        <p>Historial de lecturas registradas</p>
      </div>

      {/* Filtros */}
      <div className="filtros-section">
        <div className="filtros-tabs">
          <button
            className={`filtro-tab ${filtro === 'hoy' ? 'active' : ''}`}
            onClick={() => setFiltro('hoy')}
          >
            Hoy
          </button>
          <button
            className={`filtro-tab ${filtro === 'semana' ? 'active' : ''}`}
            onClick={() => setFiltro('semana')}
          >
            Esta Semana
          </button>
          <button
            className={`filtro-tab ${filtro === 'mes' ? 'active' : ''}`}
            onClick={() => setFiltro('mes')}
          >
            Este Mes
          </button>
          <button
            className={`filtro-tab ${filtro === 'todos' ? 'active' : ''}`}
            onClick={() => setFiltro('todos')}
          >
            Todos
          </button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="stats-mini">
        <div className="stat-mini">
          <span className="stat-mini-icon">📊</span>
          <span className="stat-mini-value">{stats.total}</span>
          <span className="stat-mini-label">Lecturas</span>
        </div>
        <div className="stat-mini">
          <span className="stat-mini-icon">💧</span>
          <span className="stat-mini-value">{stats.consumoTotal}</span>
          <span className="stat-mini-label">m³ Total</span>
        </div>
      </div>

      {/* Lista de Lecturas */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Cargando lecturas...</p>
        </div>
      ) : lecturas.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <p>No hay lecturas en este período</p>
        </div>
      ) : (
        <div className="lecturas-list">
          {lecturas.map((lectura) => (
            <div key={lectura.id} className="lectura-card">
              <div className="lectura-card-header">
                <div className="cliente-info">
                  <span className="cliente-icon">👤</span>
                  <div>
                    <span className="cliente-nombre">{lectura.cliente_nombre}</span>
                    <span className="cliente-medidor">
                      <span className="medidor-icon">📟</span>
                      {lectura.numero_medidor}
                    </span>
                  </div>
                </div>
                <div className="lectura-fecha">
                  {formatDateShort(lectura.fecha_lectura)}
                </div>
              </div>

              <div className="lectura-card-body">
                <div className="lectura-dato">
                  <span className="dato-label">Anterior</span>
                  <span className="dato-valor">{lectura.lectura_anterior} m³</span>
                </div>
                <div className="lectura-flecha">→</div>
                <div className="lectura-dato">
                  <span className="dato-label">Actual</span>
                  <span className="dato-valor actual">{lectura.lectura_actual} m³</span>
                </div>
                <div className="lectura-consumo">
                  <span className={`consumo-badge ${lectura.consumo_m3 > 50 ? 'alto' : ''}`}>
                    +{lectura.consumo_m3} m³
                  </span>
                </div>
              </div>

              {lectura.observaciones && (
                <div className="lectura-observaciones">
                  <span className="obs-icon">📝</span>
                  {lectura.observaciones}
                </div>
              )}

              <div className="lectura-card-footer">
                <span className="lectura-hora">
                  🕐 {formatDate(lectura.created_at)}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Botón actualizar */}
      <button className="btn-refresh-floating" onClick={cargarLecturas}>
        🔄
      </button>
    </div>
  )
}
