import { Link } from 'react-router-dom'
import './QuickActions.css'

/**
 * Componente de acciones rápidas
 * Muestra accesos directos según el contexto
 */
export default function QuickActions({ actions = [], title = "Acciones Rápidas" }) {
  if (!actions || actions.length === 0) return null

  return (
    <div className="quick-actions">
      <h3 className="quick-actions-title">{title}</h3>
      <div className="quick-actions-grid">
        {actions.map((action, index) => (
          <ActionItem key={index} action={action} />
        ))}
      </div>
    </div>
  )
}

function ActionItem({ action }) {
  const {
    icon,
    label,
    description,
    to,
    onClick,
    color = '#667eea',
    badge,
    disabled = false
  } = action

  const content = (
    <>
      <div className="action-icon" style={{ backgroundColor: `${color}15`, color }}>
        {typeof icon === 'string' ? <span className="action-emoji">{icon}</span> : icon}
      </div>
      <div className="action-content">
        <span className="action-label">{label}</span>
        {description && <span className="action-description">{description}</span>}
      </div>
      {badge !== undefined && badge !== null && (
        <span className="action-badge" style={{ backgroundColor: color }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
      <div className="action-arrow">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </div>
    </>
  )

  if (disabled) {
    return (
      <div className="action-item action-disabled">
        {content}
      </div>
    )
  }

  if (to) {
    return (
      <Link to={to} className="action-item">
        {content}
      </Link>
    )
  }

  return (
    <button className="action-item" onClick={onClick}>
      {content}
    </button>
  )
}

// Acciones predefinidas por rol
export const ACCIONES_ADMIN = [
  {
    icon: '👥',
    label: 'Clientes',
    description: 'Gestionar clientes',
    to: '/dashboard',
    color: '#3b82f6'
  },
  {
    icon: '📊',
    label: 'Reportes',
    description: 'Ver reportes',
    to: '/dashboard',
    color: '#10b981'
  },
  {
    icon: '💰',
    label: 'Caja',
    description: 'Caja diaria',
    to: '/dashboard',
    color: '#f59e0b'
  },
  {
    icon: '⚙️',
    label: 'Configuración',
    description: 'Ajustes del sistema',
    to: '/dashboard',
    color: '#6b7280'
  }
]

export const ACCIONES_LECTORISTA = [
  {
    icon: '📝',
    label: 'Nueva Lectura',
    description: 'Cargar lectura',
    to: '/lectorista/cargar',
    color: '#3b82f6'
  },
  {
    icon: '📋',
    label: 'Mis Lecturas',
    description: 'Ver historial',
    to: '/lectorista/mis-lecturas',
    color: '#10b981'
  },
  {
    icon: '🔍',
    label: 'Buscar Cliente',
    description: 'Buscar por medidor',
    to: '/lectorista/buscar-cliente',
    color: '#f59e0b'
  }
]

export const ACCIONES_TECNICO = [
  {
    icon: '🔧',
    label: 'Mis Reclamos',
    description: 'Ver asignados',
    to: '/tecnico/reclamos',
    color: '#ef4444'
  },
  {
    icon: '🗺️',
    label: 'Mapa',
    description: 'Ver zonas',
    to: '/tecnico/mapa',
    color: '#3b82f6'
  },
  {
    icon: '📢',
    label: 'Notificaciones',
    description: 'Comunicar admin',
    to: '/tecnico/notificaciones',
    color: '#10b981'
  }
]

export const ACCIONES_CLIENTE = [
  {
    icon: '📄',
    label: 'Estado de Cuenta',
    description: 'Ver facturas',
    to: '/portal-cliente/estado-cuenta',
    color: '#3b82f6'
  },
  {
    icon: '📈',
    label: 'Mi Consumo',
    description: 'Ver historial',
    to: '/portal-cliente/mi-consumo',
    color: '#10b981'
  },
  {
    icon: '🔧',
    label: 'Reclamos',
    description: 'Crear o ver',
    to: '/portal-cliente/reclamos',
    color: '#ef4444'
  },
  {
    icon: '💳',
    label: 'Pagos',
    description: 'Historial de pagos',
    to: '/portal-cliente/historial-pagos',
    color: '#f59e0b'
  }
]
