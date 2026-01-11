import { useState, useEffect } from 'react'
import { useTecnico } from '../../contexts/TecnicoAuthContext'
import { supabase } from '../../services/supabase'
import './NotificacionesAdmin.css'

export default function NotificacionesAdmin() {
  const { tecnico } = useTecnico()
  const [notificaciones, setNotificaciones] = useState([])
  const [reclamos, setReclamos] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [enviando, setEnviando] = useState(false)

  const [formData, setFormData] = useState({
    tipo: 'consulta',
    asunto: '',
    mensaje: '',
    prioridad: 'media',
    reclamo_id: null
  })

  useEffect(() => {
    cargarDatos()
  }, [tecnico?.id])

  const cargarDatos = async () => {
    if (!tecnico?.id) return

    setLoading(true)
    try {
      // Cargar notificaciones
      const { data: notifData, error: notifError } = await supabase.rpc('obtener_mis_notificaciones', {
        p_tecnico_id: tecnico.id
      })

      if (notifError) throw notifError
      setNotificaciones(notifData || [])

      // Cargar reclamos asignados
      const { data: reclamosData, error: reclamosError } = await supabase.rpc('obtener_reclamos_tecnico', {
        p_tecnico_id: tecnico.id
      })

      if (reclamosError) throw reclamosError
      setReclamos(reclamosData || [])
    } catch (error) {
      console.error('Error cargando datos:', error)
    }
    setLoading(false)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.asunto || !formData.mensaje) {
      alert('Por favor completa todos los campos requeridos')
      return
    }

    setEnviando(true)
    try {
      const { data, error } = await supabase.rpc('crear_notificacion_admin', {
        p_tecnico_id: tecnico.id,
        p_reclamo_id: formData.reclamo_id || null,
        p_tipo: formData.tipo,
        p_asunto: formData.asunto,
        p_mensaje: formData.mensaje,
        p_prioridad: formData.prioridad
      })

      if (error) throw error

      if (data && data[0]?.success) {
        alert('Notificación enviada exitosamente')
        setMostrarFormulario(false)
        setFormData({
          tipo: 'consulta',
          asunto: '',
          mensaje: '',
          prioridad: 'media',
          reclamo_id: null
        })
        cargarDatos()
      }
    } catch (error) {
      console.error('Error enviando notificación:', error)
      alert('Error al enviar la notificación')
    }
    setEnviando(false)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTipoIcon = (tipo) => {
    const icons = {
      problema: '⚠️',
      solicitud_material: '📦',
      consulta: '❓',
      reporte: '📊'
    }
    return icons[tipo] || '📝'
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

  if (loading) {
    return (
      <div className="notificaciones-loading">
        <div className="spinner"></div>
        <p>Cargando notificaciones...</p>
      </div>
    )
  }

  return (
    <div className="notificaciones-admin">
      <div className="notificaciones-header">
        <div>
          <h1>Notificaciones a Administración</h1>
          <p>Envía mensajes, solicitudes y reportes al equipo administrativo</p>
        </div>
        <button
          className="btn-nueva"
          onClick={() => setMostrarFormulario(!mostrarFormulario)}
        >
          {mostrarFormulario ? '✕ Cancelar' : '➕ Nueva Notificación'}
        </button>
      </div>

      {mostrarFormulario && (
        <div className="formulario-notificacion">
          <h2>Nueva Notificación</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="tipo">Tipo de Notificación</label>
                <select
                  id="tipo"
                  name="tipo"
                  value={formData.tipo}
                  onChange={handleChange}
                  className="form-select"
                  required
                >
                  <option value="consulta">Consulta</option>
                  <option value="problema">Problema</option>
                  <option value="solicitud_material">Solicitud de Material</option>
                  <option value="reporte">Reporte</option>
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="prioridad">Prioridad</label>
                <select
                  id="prioridad"
                  name="prioridad"
                  value={formData.prioridad}
                  onChange={handleChange}
                  className="form-select"
                  required
                >
                  <option value="baja">Baja</option>
                  <option value="media">Media</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reclamo_id">Relacionado con Reclamo (Opcional)</label>
              <select
                id="reclamo_id"
                name="reclamo_id"
                value={formData.reclamo_id || ''}
                onChange={handleChange}
                className="form-select"
              >
                <option value="">-- Ninguno --</option>
                {reclamos.map(reclamo => (
                  <option key={reclamo.id} value={reclamo.id}>
                    #{reclamo.numero_reclamo} - {reclamo.tipo_reclamo_nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="asunto">Asunto</label>
              <input
                type="text"
                id="asunto"
                name="asunto"
                value={formData.asunto}
                onChange={handleChange}
                placeholder="Ej: Necesito herramienta especial"
                className="form-input"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="mensaje">Mensaje</label>
              <textarea
                id="mensaje"
                name="mensaje"
                value={formData.mensaje}
                onChange={handleChange}
                placeholder="Describe detalladamente tu solicitud o consulta..."
                className="form-textarea"
                rows={6}
                required
              />
            </div>

            <button
              type="submit"
              className="btn-enviar"
              disabled={enviando}
            >
              {enviando ? 'Enviando...' : '📤 Enviar Notificación'}
            </button>
          </form>
        </div>
      )}

      <div className="historial-notificaciones">
        <h2>Historial de Notificaciones</h2>

        {notificaciones.length === 0 ? (
          <div className="empty-state">
            <span className="empty-icon">📭</span>
            <p>No has enviado notificaciones aún</p>
          </div>
        ) : (
          <div className="notificaciones-list">
            {notificaciones.map((notif) => (
              <div key={notif.id} className="notificacion-item">
                <div className="notif-header">
                  <div className="notif-tipo">
                    <span className="tipo-icon">{getTipoIcon(notif.tipo)}</span>
                    <span className="tipo-nombre">{notif.tipo.replace('_', ' ')}</span>
                  </div>
                  <span
                    className="prioridad-badge"
                    style={{ backgroundColor: getPrioridadColor(notif.prioridad) }}
                  >
                    {notif.prioridad.toUpperCase()}
                  </span>
                </div>

                <div className="notif-body">
                  <h3>{notif.asunto}</h3>
                  {notif.numero_reclamo && (
                    <p className="reclamo-ref">Reclamo: #{notif.numero_reclamo}</p>
                  )}
                  <p className="notif-mensaje">{notif.mensaje}</p>
                </div>

                <div className="notif-footer">
                  <div className="notif-status">
                    {notif.respondida ? (
                      <span className="status-respondida">✓ Respondida</span>
                    ) : notif.leida ? (
                      <span className="status-leida">👁️ Leída</span>
                    ) : (
                      <span className="status-pendiente">⏳ Pendiente</span>
                    )}
                  </div>
                  <span className="notif-fecha">{formatDate(notif.created_at)}</span>
                </div>

                {notif.respondida && notif.respuesta && (
                  <div className="notif-respuesta">
                    <div className="respuesta-header">
                      <span className="respuesta-icon">💬</span>
                      <span className="respuesta-label">Respuesta de {notif.respondida_por_nombre}</span>
                      <span className="respuesta-fecha">{formatDate(notif.respondida_en)}</span>
                    </div>
                    <p className="respuesta-texto">{notif.respuesta}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
