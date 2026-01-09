// Service Worker para JahekaY Portal del Cliente
const CACHE_NAME = 'jahekay-portal-v1.0.0'
const RUNTIME_CACHE = 'jahekay-runtime-v1.0.0'

// Recursos estáticos para cachear en la instalación
const STATIC_RESOURCES = [
  '/',
  '/portal-cliente/dashboard',
  '/portal-cliente/login',
  '/manifest.json',
  '/icon-192x192.png',
  '/icon-512x512.png'
]

// URLs de la API de Supabase (no cachear)
const API_URLS = [
  'supabase.co',
  'supabase.io'
]

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...')

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando recursos estáticos')
        return cache.addAll(STATIC_RESOURCES)
      })
      .then(() => {
        console.log('[SW] Recursos estáticos cacheados')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('[SW] Error al cachear recursos:', error)
      })
  )
})

// Activación del Service Worker
self.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...')

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== RUNTIME_CACHE) {
              console.log('[SW] Eliminando caché antigua:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('[SW] Service Worker activado')
        return self.clients.claim()
      })
  )
})

// Interceptar peticiones (Fetch)
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // No cachear peticiones a la API
  if (API_URLS.some(apiUrl => url.hostname.includes(apiUrl))) {
    event.respondWith(
      fetch(request)
        .catch(() => {
          // Si falla la petición y estamos offline, devolver respuesta offline
          return new Response(
            JSON.stringify({
              error: 'Sin conexión a internet',
              offline: true
            }),
            {
              status: 503,
              statusText: 'Service Unavailable',
              headers: new Headers({
                'Content-Type': 'application/json'
              })
            }
          )
        })
    )
    return
  }

  // Estrategia: Network First, fallback to Cache
  event.respondWith(
    fetch(request)
      .then((response) => {
        // Si la respuesta es válida, cachearla
        if (response && response.status === 200) {
          const responseToCache = response.clone()

          caches.open(RUNTIME_CACHE)
            .then((cache) => {
              cache.put(request, responseToCache)
            })
        }

        return response
      })
      .catch(() => {
        // Si falla la red, buscar en caché
        return caches.match(request)
          .then((cachedResponse) => {
            if (cachedResponse) {
              console.log('[SW] Sirviendo desde caché:', request.url)
              return cachedResponse
            }

            // Si no está en caché y es una navegación, devolver página offline
            if (request.mode === 'navigate') {
              return caches.match('/portal-cliente/dashboard')
                .then((response) => {
                  if (response) {
                    return response
                  }

                  // Página offline básica
                  return new Response(
                    `
                    <!DOCTYPE html>
                    <html lang="es">
                    <head>
                      <meta charset="UTF-8">
                      <meta name="viewport" content="width=device-width, initial-scale=1.0">
                      <title>Sin Conexión - JahekaY</title>
                      <style>
                        body {
                          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                          display: flex;
                          align-items: center;
                          justify-content: center;
                          min-height: 100vh;
                          margin: 0;
                          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                          color: white;
                          text-align: center;
                          padding: 1rem;
                        }
                        .offline-container {
                          max-width: 400px;
                        }
                        .offline-icon {
                          font-size: 5rem;
                          margin-bottom: 1rem;
                        }
                        h1 {
                          font-size: 2rem;
                          margin: 0 0 1rem 0;
                        }
                        p {
                          font-size: 1.1rem;
                          opacity: 0.9;
                          margin: 0 0 2rem 0;
                        }
                        button {
                          background: white;
                          color: #667eea;
                          border: none;
                          padding: 1rem 2rem;
                          border-radius: 12px;
                          font-size: 1rem;
                          font-weight: 600;
                          cursor: pointer;
                          transition: transform 0.3s ease;
                        }
                        button:hover {
                          transform: translateY(-2px);
                        }
                      </style>
                    </head>
                    <body>
                      <div class="offline-container">
                        <div class="offline-icon">📡</div>
                        <h1>Sin Conexión</h1>
                        <p>No hay conexión a internet. Por favor, verifica tu conexión e intenta nuevamente.</p>
                        <button onclick="window.location.reload()">Reintentar</button>
                      </div>
                    </body>
                    </html>
                    `,
                    {
                      headers: new Headers({
                        'Content-Type': 'text/html'
                      })
                    }
                  )
                })
            }

            // Para otros recursos, devolver error
            return new Response('Recurso no disponible offline', {
              status: 404,
              statusText: 'Not Found'
            })
          })
      })
  )
})

// Escuchar mensajes desde la app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys()
        .then((cacheNames) => {
          return Promise.all(
            cacheNames.map((cacheName) => {
              console.log('[SW] Limpiando caché:', cacheName)
              return caches.delete(cacheName)
            })
          )
        })
        .then(() => {
          console.log('[SW] Caché limpiada completamente')
          return self.clients.matchAll()
        })
        .then((clients) => {
          clients.forEach((client) => {
            client.postMessage({
              type: 'CACHE_CLEARED',
              message: 'Caché limpiada exitosamente'
            })
          })
        })
    )
  }
})

// Sincronización en background (cuando vuelva la conexión)
self.addEventListener('sync', (event) => {
  console.log('[SW] Sincronización en background:', event.tag)

  if (event.tag === 'sync-data') {
    event.waitUntil(
      // Aquí puedes implementar lógica para sincronizar datos pendientes
      Promise.resolve()
        .then(() => {
          console.log('[SW] Datos sincronizados')
        })
    )
  }
})

// Notificaciones Push (opcional)
self.addEventListener('push', (event) => {
  console.log('[SW] Push recibido')

  const options = {
    body: event.data ? event.data.text() : 'Nueva notificación de JahekaY',
    icon: '/icon-192x192.png',
    badge: '/icon-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Ver',
        icon: '/icon-96x96.png'
      },
      {
        action: 'close',
        title: 'Cerrar',
        icon: '/icon-96x96.png'
      }
    ]
  }

  event.waitUntil(
    self.registration.showNotification('JahekaY', options)
  )
})

// Click en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Click en notificación:', event.action)

  event.notification.close()

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/portal-cliente/dashboard')
    )
  }
})

console.log('[SW] Service Worker cargado')
