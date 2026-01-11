import './StatCard.css'

/**
 * Componente para mostrar estadísticas/métricas
 * Útil para dashboards y resúmenes
 */
export default function StatCard({
  icon,
  label,
  value,
  subtitle,
  trend,
  trendValue,
  color = '#667eea',
  loading = false,
  onClick
}) {
  const getTrendIcon = () => {
    if (trend === 'up') return '↑'
    if (trend === 'down') return '↓'
    return '→'
  }

  const getTrendClass = () => {
    if (trend === 'up') return 'trend-up'
    if (trend === 'down') return 'trend-down'
    return 'trend-neutral'
  }

  if (loading) {
    return (
      <div className="stat-card stat-loading">
        <div className="stat-icon-skeleton"></div>
        <div className="stat-content">
          <div className="stat-label-skeleton"></div>
          <div className="stat-value-skeleton"></div>
        </div>
      </div>
    )
  }

  const CardWrapper = onClick ? 'button' : 'div'

  return (
    <CardWrapper
      className={`stat-card ${onClick ? 'stat-clickable' : ''}`}
      onClick={onClick}
      style={{ '--stat-color': color }}
    >
      <div className="stat-icon" style={{ backgroundColor: `${color}15`, color }}>
        {typeof icon === 'string' ? <span className="stat-emoji">{icon}</span> : icon}
      </div>

      <div className="stat-content">
        <span className="stat-label">{label}</span>
        <span className="stat-value">{value}</span>
        {(subtitle || trendValue) && (
          <div className="stat-footer">
            {subtitle && <span className="stat-subtitle">{subtitle}</span>}
            {trendValue && (
              <span className={`stat-trend ${getTrendClass()}`}>
                {getTrendIcon()} {trendValue}
              </span>
            )}
          </div>
        )}
      </div>

      {onClick && (
        <div className="stat-arrow">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      )}
    </CardWrapper>
  )
}

/**
 * Grid de tarjetas de estadísticas
 */
export function StatGrid({ children, columns = 4 }) {
  return (
    <div className="stat-grid" style={{ '--stat-columns': columns }}>
      {children}
    </div>
  )
}
