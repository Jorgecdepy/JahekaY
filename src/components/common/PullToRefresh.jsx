import { usePullToRefresh } from '../../hooks/usePullToRefresh'
import './PullToRefresh.css'

/**
 * Componente PullToRefresh para envolver contenido scrollable
 *
 * @param {Object} props
 * @param {ReactNode} props.children - Contenido a renderizar
 * @param {Function} props.onRefresh - Función async a ejecutar al hacer refresh
 * @param {boolean} props.disabled - Deshabilitar pull-to-refresh
 */
export function PullToRefresh({ children, onRefresh, disabled = false }) {
  const {
    handlers,
    isPulling,
    isRefreshing,
    pullDistance,
    progress,
    shouldRefresh
  } = usePullToRefresh(onRefresh, {
    threshold: 70,
    maxPull: 100,
    resistance: 2.5,
    disabled
  })

  return (
    <div className="pull-to-refresh-container" {...handlers}>
      {/* Indicador de refresh */}
      <div
        className={`pull-indicator ${isRefreshing ? 'refreshing' : ''} ${shouldRefresh ? 'ready' : ''}`}
        style={{
          transform: `translateY(${Math.min(pullDistance - 50, 20)}px)`,
          opacity: progress
        }}
      >
        <div className="pull-indicator-content">
          {isRefreshing ? (
            <div className="pull-spinner" />
          ) : (
            <svg
              className="pull-arrow"
              viewBox="0 0 24 24"
              style={{
                transform: `rotate(${shouldRefresh ? 180 : 0}deg)`,
                transition: 'transform 0.2s ease'
              }}
            >
              <path
                d="M12 4v16m0-16l-6 6m6-6l6 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          )}
          <span className="pull-text">
            {isRefreshing
              ? 'Actualizando...'
              : shouldRefresh
              ? 'Soltar para actualizar'
              : 'Desliza para actualizar'}
          </span>
        </div>
      </div>

      {/* Contenido */}
      <div
        className="pull-content"
        style={{
          transform: isRefreshing
            ? 'translateY(50px)'
            : `translateY(${pullDistance * 0.5}px)`,
          transition: !isPulling ? 'transform 0.3s ease-out' : 'none'
        }}
      >
        {children}
      </div>
    </div>
  )
}

export default PullToRefresh
