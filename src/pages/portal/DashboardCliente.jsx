import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../services/supabase'
import { useClienteAuth } from '../../contexts/ClienteAuthContext'
import './DashboardCliente.css'

function DashboardCliente() {
  const navigate = useNavigate()
  const { cliente, logout } = useClienteAuth()
  const [loading, setLoading] = useState(true)
  const [estadisticas, setEstadisticas] = useState(null)
  const [facturasPendientes, setFacturasPendientes] = useState([])
  const [notificaciones, setNotificaciones] = useState([])
  const [ultimaLectura, setUltimaLectura] = useState(null)

  useEffect(() => {
    if (!cliente) {
      navigate('/portal-cliente/login')
      return
    }
    cargarDatos()
  }, [cliente])

  const cargarDatos = async () => {
    setLoading(true)
    try {
      await Promise.all([
        cargarEstadisticas(),
        cargarFacturasPendientes(),
        cargarNotificaciones(),
        cargarUltimaLectura()
      ])
    } catch (error) {
      console.error('Error al cargar datos:', error)
    }
    setLoading(false)
  }

  const cargarEstadisticas = async () => {
    const { data, error } = await supabase.rpc('obtener_estadisticas_cliente', {
      p_cliente_id: cliente.id
    })

    if (!error && data) {
      setEstadisticas(data)
    }
  }

  const cargarFacturasPendientes = async () => {
    // Usar RPC para obtener facturas (funciona sin sesión de Supabase Auth)
    const { data, error } = await supabase.rpc('obtener_facturas_cliente', {
      p_cliente_id: cliente.id,
      p_estado: null,
      p_limite: 5
    })

    if (!error && data) {
      // Filtrar solo pendientes y vencidas
      const pendientes = data.filter(f => f.estado === 'pendiente' || f.estado === 'vencida')
      setFacturasPendientes(pendientes)
    }
  }

  const cargarNotificaciones = async () => {
    // Usar RPC para obtener notificaciones (funciona sin sesión de Supabase Auth)
    const { data, error } = await supabase.rpc('obtener_notificaciones_cliente', {
      p_cliente_id: cliente.id,
      p_limite: 5
    })

    if (!error && data) {
      setNotificaciones(data)
    }
  }

  const cargarUltimaLectura = async () => {
    // Usar RPC para obtener lecturas (funciona sin sesión de Supabase Auth)
    const { data, error } = await supabase.rpc('obtener_lecturas_cliente', {
      p_cliente_id: cliente.id,
      p_limite: 1
    })

    if (!error && data && data.length > 0) {
      setUltimaLectura(data[0])
    }
  }

  const marcarNotificacionLeida = async (notificacionId) => {
    // Usar RPC para marcar notificación (funciona sin sesión de Supabase Auth)
    await supabase.rpc('marcar_notificacion_leida', {
      p_notificacion_id: notificacionId,
      p_cliente_id: cliente.id
    })

    cargarNotificaciones()
  }

  const handleLogout = () => {
    logout()
    navigate('/portal-cliente/login')
  }

  const formatMonto = (monto) => {
    return 'Gs. ' + new Intl.NumberFormat('es-PY', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(monto || 0)
  }

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-PY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getEstadoBadge = (estado) => {
    switch (estado) {
      case 'pendiente':
        return 'badge-warning'
      case 'vencida':
        return 'badge-danger'
      case 'pagada':
        return 'badge-success'
      default:
        return 'badge-secondary'
    }
  }

  const getNotificacionIcono = (tipo) => {
    switch (tipo) {
      case 'factura':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
            <polyline points="14 2 14 8 20 8"></polyline>
          </svg>
        )
      case 'pago':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        )
      case 'reclamo':
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
        )
      default:
        return (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
        )
    }
  }

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner-large"></div>
        <p>Cargando información...</p>
      </div>
    )
  }

  return (
    <div className="dashboard-cliente">
      {/* Header */}
      <header className="dashboard-header">
        <div className="dashboard-header-content">
          <div className="dashboard-user">
            <div className="dashboard-avatar">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div className="dashboard-user-info">
              <h2>Hola, {cliente?.nombre_completo}</h2>
              <p>Medidor: {cliente?.numero_medidor}</p>
            </div>
          </div>
          <button className="btn-logout" onClick={handleLogout}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
              <polyline points="16 17 21 12 16 7"></polyline>
              <line x1="21" y1="12" x2="9" y2="12"></line>
            </svg>
            Salir
          </button>
        </div>
      </header>

      {/* Estadísticas Cards */}
      <div className="dashboard-stats">
        <div className="stat-card stat-card-primary">
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">Consumo Promedio</span>
            <span className="stat-value">{estadisticas?.consumo_promedio?.toFixed(1) || '0'} m³</span>
          </div>
        </div>

        <div className="stat-card stat-card-danger">
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">Saldo Pendiente</span>
            <span className="stat-value">{formatMonto(estadisticas?.saldo_pendiente || 0)}</span>
          </div>
        </div>

        <div className="stat-card stat-card-success">
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">Facturas Pagadas</span>
            <span className="stat-value">{estadisticas?.facturas_pagadas || 0}</span>
          </div>
        </div>

        <div className="stat-card stat-card-warning">
          <div className="stat-icon">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          </div>
          <div className="stat-info">
            <span className="stat-label">Facturas Pendientes</span>
            <span className="stat-value">{estadisticas?.facturas_pendientes || 0}</span>
          </div>
        </div>
      </div>

      {/* Accesos Rápidos */}
      <div className="dashboard-section">
        <h3 className="section-title">Accesos Rápidos</h3>
        <div className="quick-actions">
          <button className="quick-action-card" onClick={() => navigate('/portal-cliente/estado-cuenta')}>
            <div className="quick-action-icon quick-action-primary">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
              </svg>
            </div>
            <span>Estado de Cuenta</span>
          </button>

          <button className="quick-action-card" onClick={() => navigate('/portal-cliente/historial-pagos')}>
            <div className="quick-action-icon quick-action-success">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
              </svg>
            </div>
            <span>Historial de Pagos</span>
          </button>

          <button className="quick-action-card" onClick={() => navigate('/portal-cliente/reclamos')}>
            <div className="quick-action-icon quick-action-warning">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
              </svg>
            </div>
            <span>Mis Reclamos</span>
          </button>

          <button className="quick-action-card" onClick={() => navigate('/portal-cliente/consumo')}>
            <div className="quick-action-icon quick-action-info">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="20" x2="12" y2="10"></line>
                <line x1="18" y1="20" x2="18" y2="4"></line>
                <line x1="6" y1="20" x2="6" y2="16"></line>
              </svg>
            </div>
            <span>Mi Consumo</span>
          </button>
        </div>
      </div>

      {/* Última Lectura */}
      {ultimaLectura && (
        <div className="dashboard-section">
          <h3 className="section-title">Última Lectura</h3>
          <div className="lectura-card">
            <div className="lectura-info">
              <div className="lectura-item">
                <span className="lectura-label">Fecha</span>
                <span className="lectura-value">{formatFecha(ultimaLectura.fecha_lectura)}</span>
              </div>
              <div className="lectura-item">
                <span className="lectura-label">Consumo</span>
                <span className="lectura-value lectura-value-highlight">{ultimaLectura.consumo_m3} m³</span>
              </div>
              <div className="lectura-item">
                <span className="lectura-label">Lectura Actual</span>
                <span className="lectura-value">{ultimaLectura.lectura_actual}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Facturas Pendientes */}
      {facturasPendientes.length > 0 && (
        <div className="dashboard-section">
          <h3 className="section-title">Facturas Pendientes</h3>
          <div className="facturas-list">
            {facturasPendientes.map((factura) => (
              <div key={factura.id} className="factura-item">
                <div className="factura-info">
                  <span className="factura-periodo">{factura.periodo}</span>
                  <span className={`badge ${getEstadoBadge(factura.estado)}`}>
                    {factura.estado.toUpperCase()}
                  </span>
                </div>
                <div className="factura-detalles">
                  <span className="factura-monto">{formatMonto(factura.total)}</span>
                  <span className="factura-vencimiento">
                    Vence: {formatFecha(factura.fecha_vencimiento)}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button className="btn-ver-mas" onClick={() => navigate('/portal-cliente/estado-cuenta')}>
            Ver todas las facturas
          </button>
        </div>
      )}

      {/* Notificaciones */}
      {notificaciones.length > 0 && (
        <div className="dashboard-section">
          <h3 className="section-title">Notificaciones Recientes</h3>
          <div className="notificaciones-list">
            {notificaciones.map((notificacion) => (
              <div
                key={notificacion.id}
                className={`notificacion-item ${!notificacion.leida ? 'notificacion-no-leida' : ''}`}
                onClick={() => !notificacion.leida && marcarNotificacionLeida(notificacion.id)}
              >
                <div className="notificacion-icon">
                  {getNotificacionIcono(notificacion.tipo)}
                </div>
                <div className="notificacion-content">
                  <strong>{notificacion.titulo}</strong>
                  <p>{notificacion.mensaje}</p>
                  <span className="notificacion-fecha">{formatFecha(notificacion.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default DashboardCliente
