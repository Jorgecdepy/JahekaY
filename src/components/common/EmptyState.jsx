import './EmptyState.css'

/**
 * Componente para mostrar estados vacíos
 * Útil cuando no hay datos para mostrar
 */
export default function EmptyState({
  icon = '📭',
  title = 'No hay datos',
  description = 'No se encontraron elementos para mostrar',
  action,
  actionText,
  onAction,
  size = 'medium' // 'small', 'medium', 'large'
}) {
  return (
    <div className={`empty-state empty-state-${size}`}>
      <div className="empty-icon">
        {typeof icon === 'string' ? icon : icon}
      </div>
      <h3 className="empty-title">{title}</h3>
      {description && <p className="empty-description">{description}</p>}
      {(action || onAction) && (
        <button className="empty-action" onClick={onAction}>
          {actionText || action || 'Agregar'}
        </button>
      )}
    </div>
  )
}

// Estados predefinidos comunes
export const EMPTY_STATES = {
  noResults: {
    icon: '🔍',
    title: 'Sin resultados',
    description: 'No se encontraron resultados para tu búsqueda'
  },
  noData: {
    icon: '📭',
    title: 'Sin datos',
    description: 'No hay datos disponibles en este momento'
  },
  noClientes: {
    icon: '👥',
    title: 'Sin clientes',
    description: 'Aún no hay clientes registrados'
  },
  noFacturas: {
    icon: '📄',
    title: 'Sin facturas',
    description: 'No hay facturas para mostrar'
  },
  noLecturas: {
    icon: '📝',
    title: 'Sin lecturas',
    description: 'No hay lecturas registradas'
  },
  noReclamos: {
    icon: '🔧',
    title: 'Sin reclamos',
    description: 'No hay reclamos pendientes'
  },
  noPagos: {
    icon: '💳',
    title: 'Sin pagos',
    description: 'No hay pagos registrados'
  },
  noNotificaciones: {
    icon: '🔔',
    title: 'Sin notificaciones',
    description: 'No tienes notificaciones nuevas'
  },
  error: {
    icon: '⚠️',
    title: 'Error',
    description: 'Ocurrió un error al cargar los datos'
  },
  offline: {
    icon: '📡',
    title: 'Sin conexión',
    description: 'No hay conexión a internet'
  },
  permisoDenegado: {
    icon: '🔒',
    title: 'Acceso denegado',
    description: 'No tienes permisos para ver este contenido'
  }
}
