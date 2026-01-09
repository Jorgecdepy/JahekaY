// Registrar Service Worker para PWA
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('✅ Service Worker registrado:', registration.scope)

          // Verificar actualizaciones cada hora
          setInterval(() => {
            registration.update()
          }, 1000 * 60 * 60)

          // Escuchar actualizaciones
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing
            console.log('🔄 Nueva versión del Service Worker encontrada')

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // Nueva versión disponible
                console.log('📦 Nueva versión disponible')

                // Opcional: Mostrar notificación al usuario
                if (confirm('Nueva versión disponible. ¿Deseas actualizar?')) {
                  newWorker.postMessage({ type: 'SKIP_WAITING' })
                  window.location.reload()
                }
              }
            })
          })
        })
        .catch((error) => {
          console.error('❌ Error al registrar Service Worker:', error)
        })

      // Escuchar cambios en el Service Worker activo
      let refreshing = false
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true
          window.location.reload()
        }
      })

      // Escuchar mensajes del Service Worker
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'CACHE_CLEARED') {
          console.log('✅ Caché limpiada:', event.data.message)
        }
      })
    })
  } else {
    console.warn('⚠️ Service Worker no soportado en este navegador')
  }
}

// Función para limpiar caché manualmente
export function clearCache() {
  if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'CLEAR_CACHE'
    })
  }
}

// Función para verificar si está online/offline
export function setupOnlineOfflineDetection() {
  function updateOnlineStatus() {
    const isOnline = navigator.onLine

    if (isOnline) {
      console.log('🌐 Conexión restaurada')
      // Sincronizar datos pendientes si es necesario
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((registration) => {
          if ('sync' in registration) {
            registration.sync.register('sync-data')
          }
        }).catch((error) => {
          console.warn('⚠️ Error al sincronizar:', error)
        })
      }
    } else {
      console.log('📡 Sin conexión')
    }

    // Emitir evento personalizado
    window.dispatchEvent(new CustomEvent('connectionchange', {
      detail: { isOnline }
    }))
  }

  window.addEventListener('online', updateOnlineStatus)
  window.addEventListener('offline', updateOnlineStatus)

  // Verificar estado inicial
  updateOnlineStatus()
}

// Función para solicitar permisos de notificaciones
export async function requestNotificationPermission() {
  if ('Notification' in window) {
    const permission = await Notification.requestPermission()

    if (permission === 'granted') {
      console.log('✅ Permisos de notificación concedidos')
      return true
    } else {
      console.log('❌ Permisos de notificación denegados')
      return false
    }
  }
  return false
}

// Función para verificar si la app está instalada
export function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true
}

// Función para mostrar prompt de instalación
export function setupInstallPrompt() {
  let deferredPrompt = null

  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevenir que Chrome muestre el prompt automáticamente
    e.preventDefault()
    deferredPrompt = e

    console.log('💾 App lista para instalar')

    // Emitir evento personalizado
    window.dispatchEvent(new CustomEvent('appinstallable', {
      detail: { prompt: deferredPrompt }
    }))
  })

  window.addEventListener('appinstalled', () => {
    console.log('✅ App instalada exitosamente')
    deferredPrompt = null

    // Emitir evento personalizado
    window.dispatchEvent(new CustomEvent('appinstalled'))
  })

  return {
    showInstallPrompt: async () => {
      if (!deferredPrompt) {
        console.log('⚠️ Prompt de instalación no disponible')
        return false
      }

      deferredPrompt.prompt()
      const { outcome } = await deferredPrompt.userChoice

      console.log(`Usuario ${outcome === 'accepted' ? 'aceptó' : 'rechazó'} la instalación`)
      deferredPrompt = null

      return outcome === 'accepted'
    }
  }
}

// Inicializar todo
export function initPWA() {
  registerServiceWorker()
  setupOnlineOfflineDetection()
  const installPrompt = setupInstallPrompt()

  // Retornar funciones útiles
  return {
    clearCache,
    requestNotificationPermission,
    isAppInstalled,
    showInstallPrompt: installPrompt.showInstallPrompt
  }
}
