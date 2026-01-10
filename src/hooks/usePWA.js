import { useState, useEffect, useCallback } from 'react'

/**
 * Hook personalizado para funcionalidades PWA
 * Maneja instalación, estado de conexión, y actualizaciones
 */
export function usePWA() {
  const [isInstalled, setIsInstalled] = useState(false)
  const [isInstallable, setIsInstallable] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [isUpdating, setIsUpdating] = useState(false)
  const [deferredPrompt, setDeferredPrompt] = useState(null)

  // Verificar si la app está instalada
  useEffect(() => {
    const checkInstalled = () => {
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                           window.navigator.standalone === true
      setIsInstalled(isStandalone)
    }

    checkInstalled()

    // Escuchar cambios en el modo de display
    const mediaQuery = window.matchMedia('(display-mode: standalone)')
    mediaQuery.addEventListener('change', checkInstalled)

    return () => mediaQuery.removeEventListener('change', checkInstalled)
  }, [])

  // Manejar prompt de instalación
  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setIsInstallable(true)
    }

    const handleAppInstalled = () => {
      setDeferredPrompt(null)
      setIsInstallable(false)
      setIsInstalled(true)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  // Manejar estado de conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Función para mostrar prompt de instalación
  const install = useCallback(async () => {
    if (!deferredPrompt) {
      return { accepted: false, reason: 'no-prompt' }
    }

    try {
      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      setDeferredPrompt(null)
      setIsInstallable(false)

      if (outcome === 'accepted') {
        setIsInstalled(true)
      }

      return { accepted: outcome === 'accepted', reason: outcome }
    } catch (error) {
      console.error('Error al instalar PWA:', error)
      return { accepted: false, reason: 'error' }
    }
  }, [deferredPrompt])

  // Función para limpiar caché
  const clearCache = useCallback(async () => {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      return new Promise((resolve) => {
        const messageHandler = (event) => {
          if (event.data?.type === 'CACHE_CLEARED') {
            navigator.serviceWorker.removeEventListener('message', messageHandler)
            resolve(true)
          }
        }

        navigator.serviceWorker.addEventListener('message', messageHandler)
        navigator.serviceWorker.controller.postMessage({ type: 'CLEAR_CACHE' })

        // Timeout por si no hay respuesta
        setTimeout(() => {
          navigator.serviceWorker.removeEventListener('message', messageHandler)
          resolve(false)
        }, 5000)
      })
    }
    return false
  }, [])

  // Función para forzar actualización del SW
  const checkForUpdates = useCallback(async () => {
    if ('serviceWorker' in navigator) {
      try {
        setIsUpdating(true)
        const registration = await navigator.serviceWorker.ready
        await registration.update()
        setIsUpdating(false)
        return true
      } catch (error) {
        console.error('Error al verificar actualizaciones:', error)
        setIsUpdating(false)
        return false
      }
    }
    return false
  }, [])

  // Función para solicitar permisos de notificación
  const requestNotifications = useCallback(async () => {
    if ('Notification' in window) {
      try {
        const permission = await Notification.requestPermission()
        return permission === 'granted'
      } catch (error) {
        console.error('Error al solicitar permisos:', error)
        return false
      }
    }
    return false
  }, [])

  return {
    // Estado
    isInstalled,
    isInstallable,
    isOnline,
    isUpdating,

    // Acciones
    install,
    clearCache,
    checkForUpdates,
    requestNotifications,

    // Utilidades
    isPWASupported: 'serviceWorker' in navigator,
    notificationsSupported: 'Notification' in window,
    notificationPermission: 'Notification' in window ? Notification.permission : 'denied'
  }
}

export default usePWA
