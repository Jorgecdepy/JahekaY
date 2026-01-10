import { useState, useRef, useCallback, useEffect } from 'react'

/**
 * Hook para implementar pull-to-refresh en móviles
 *
 * @param {Function} onRefresh - Función async a ejecutar al hacer refresh
 * @param {Object} options - Opciones de configuración
 * @returns {Object} - Props y estado del pull-to-refresh
 */
export function usePullToRefresh(onRefresh, options = {}) {
  const {
    threshold = 80,        // Distancia para activar refresh
    maxPull = 120,         // Máxima distancia de pull
    resistance = 2.5,      // Resistencia del pull
    disabled = false       // Deshabilitar pull-to-refresh
  } = options

  const [isPulling, setIsPulling] = useState(false)
  const [pullDistance, setPullDistance] = useState(0)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const startY = useRef(0)
  const currentY = useRef(0)
  const containerRef = useRef(null)
  const isAtTop = useRef(true)

  // Verificar si el scroll está en la parte superior
  const checkScrollPosition = useCallback(() => {
    if (containerRef.current) {
      isAtTop.current = containerRef.current.scrollTop <= 0
    } else {
      isAtTop.current = window.scrollY <= 0
    }
  }, [])

  // Manejar inicio del touch
  const handleTouchStart = useCallback((e) => {
    if (disabled || isRefreshing) return

    checkScrollPosition()

    if (!isAtTop.current) return

    startY.current = e.touches[0].clientY
    currentY.current = startY.current
    setIsPulling(true)
  }, [disabled, isRefreshing, checkScrollPosition])

  // Manejar movimiento del touch
  const handleTouchMove = useCallback((e) => {
    if (!isPulling || disabled || isRefreshing) return

    checkScrollPosition()

    if (!isAtTop.current) {
      setPullDistance(0)
      return
    }

    currentY.current = e.touches[0].clientY
    const diff = currentY.current - startY.current

    if (diff > 0) {
      // Aplicar resistencia para sensación natural
      const distance = Math.min(diff / resistance, maxPull)
      setPullDistance(distance)

      // Prevenir scroll normal cuando estamos haciendo pull
      if (distance > 10) {
        e.preventDefault()
      }
    }
  }, [isPulling, disabled, isRefreshing, resistance, maxPull, checkScrollPosition])

  // Manejar fin del touch
  const handleTouchEnd = useCallback(async () => {
    if (!isPulling || disabled) return

    setIsPulling(false)

    if (pullDistance >= threshold && onRefresh) {
      setIsRefreshing(true)

      try {
        await onRefresh()
      } catch (error) {
        console.error('Error en refresh:', error)
      } finally {
        setIsRefreshing(false)
      }
    }

    setPullDistance(0)
  }, [isPulling, disabled, pullDistance, threshold, onRefresh])

  // Escuchar scroll para actualizar posición
  useEffect(() => {
    const handleScroll = () => {
      checkScrollPosition()
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    return () => {
      window.removeEventListener('scroll', handleScroll)
    }
  }, [checkScrollPosition])

  // Calcular estilos y estado
  const progress = Math.min(pullDistance / threshold, 1)
  const shouldRefresh = pullDistance >= threshold

  return {
    // Ref para el contenedor (opcional, para scroll containers)
    containerRef,

    // Handlers para touch events
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    },

    // Estado
    isPulling,
    isRefreshing,
    pullDistance,
    progress,
    shouldRefresh,

    // Estilos para el indicador
    indicatorStyle: {
      transform: `translateY(${pullDistance}px) rotate(${progress * 360}deg)`,
      opacity: progress
    },

    // Estilos para el contenido
    contentStyle: {
      transform: isRefreshing ? 'translateY(50px)' : `translateY(${pullDistance}px)`,
      transition: !isPulling ? 'transform 0.3s ease-out' : 'none'
    }
  }
}

export default usePullToRefresh
