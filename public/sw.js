// Service Worker para JahekaY Portal del Cliente
const CACHE_VERSION = '1.1.0'
const CACHE_NAME = `jahekay-portal-v${CACHE_VERSION}`
const RUNTIME_CACHE = `jahekay-runtime-v${CACHE_VERSION}`

// Recursos estáticos para cachear en la instalación
const STATIC_RESOURCES = [
  '/',
  '/portal-cliente/dashboard',
  '/portal-cliente/login',
  '/manifest.json',
  '/icon.svg'
]

// URLs de la API de Supabase (no cachear)
const API_PATTERNS = [
  'supabase.co',
  'supabase.io',
  'api.supabase'
]

// Extensiones de archivos para cachear agresivamente
const CACHE_EXTENSIONS = ['.js', '.css', '.woff2', '.woff', '.ttf', '.svg', '.png', '.jpg', '.webp']

// Instalación del Service Worker
self.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker v' + CACHE_VERSION)

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Cacheando recursos estáticos')
        // Usar addAll con catch individual para no fallar si un recurso no existe
        return Promise.allSettled(
          STATIC_RESOURCES.map((url) =>
            cache.add(url).catch((err) => {
              console.warn('[SW] No se pudo cachear:', url, err.message)
            })
          )
        )
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
  console.log('[SW] Activando Service Worker v' + CACHE_VERSION)

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Eliminar cachés antiguas que no coincidan con la versión actual
            if (!cacheName.includes(CACHE_VERSION)) {
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

// Determinar estrategia de caché según el tipo de recurso
function getCacheStrategy(request) {
  const url = new URL(request.url)
  const pathname = url.pathname

  // API requests: Network only (no cachear)
  if (API_PATTERNS.some((pattern) => url.hostname.includes(pattern))) {
    return 'network-only'
  }

  // Navegación HTML: Network first, fallback to cache
  if (request.mode === 'navigate') {
    return 'network-first'
  }

  // Assets estáticos: Cache first
  if (CACHE_EXTENSIONS.some((ext) => pathname.endsWith(ext))) {
    return 'cache-first'
  }

  // Default: Network first
  return 'network-first'
}

// Interceptar peticiones (Fetch)
self.addEventListener('fetch', (event) => {
  const { request } = event
  const strategy = getCacheStrategy(request)

  switch (strategy) {
    case 'network-only':
      event.respondWith(handleNetworkOnly(request))
      break
    case 'cache-first':
      event.respondWith(handleCacheFirst(request))
      break
    case 'network-first':
    default:
      event.respondWith(handleNetworkFirst(request))
      break
  }
})

// Estrategia: Solo red (para API)
async function handleNetworkOnly(request) {
  try {
    return await fetch(request)
  } catch {
    // Respuesta offline para API
    return new Response(
      JSON.stringify({
        error: 'Sin conexión a internet',
        offline: true
      }),
      {
        status: 503,
        statusText: 'Service Unavailable',
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
}

// Estrategia: Caché primero (para assets)
async function handleCacheFirst(request) {
  const cachedResponse = await caches.match(request)

  if (cachedResponse) {
    // Actualizar caché en segundo plano (stale-while-revalidate)
    fetchAndCache(request)
    return cachedResponse
  }

  try {
    const response = await fetch(request)
    if (response && response.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Recurso no disponible', { status: 404 })
  }
}

// Estrategia: Red primero (para HTML)
async function handleNetworkFirst(request) {
  try {
    const response = await fetch(request)

    if (response && response.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, response.clone())
    }

    return response
  } catch {
    // Intentar desde caché
    const cachedResponse = await caches.match(request)

    if (cachedResponse) {
      console.log('[SW] Sirviendo desde caché:', request.url)
      return cachedResponse
    }

    // Si es navegación, mostrar página offline
    if (request.mode === 'navigate') {
      return createOfflinePage()
    }

    return new Response('Recurso no disponible offline', { status: 404 })
  }
}

// Actualizar caché en segundo plano
async function fetchAndCache(request) {
  try {
    const response = await fetch(request)
    if (response && response.status === 200) {
      const cache = await caches.open(RUNTIME_CACHE)
      cache.put(request, response.clone())
    }
  } catch {
    // Ignorar errores de red
  }
}

// Crear página offline
function createOfflinePage() {
  return new Response(
    `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
  <meta name="theme-color" content="#667eea">
  <title>Sin Conexión - JahekaY</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      min-height: 100dvh;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      text-align: center;
      padding: 1.5rem;
      padding-top: calc(1.5rem + env(safe-area-inset-top, 0px));
      padding-bottom: calc(1.5rem + env(safe-area-inset-bottom, 0px));
    }
    .offline-container {
      max-width: 360px;
      background: rgba(255, 255, 255, 0.1);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      border-radius: 20px;
      padding: 2.5rem 2rem;
    }
    .offline-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 1.5rem;
      background: rgba(255, 255, 255, 0.15);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .offline-icon svg {
      width: 40px;
      height: 40px;
      opacity: 0.9;
    }
    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      margin: 0 0 0.75rem 0;
    }
    p {
      font-size: 1rem;
      opacity: 0.9;
      margin: 0 0 2rem 0;
      line-height: 1.5;
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
      width: 100%;
      min-height: 48px;
      touch-action: manipulation;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    button:active {
      transform: scale(0.98);
    }
    @media (min-width: 600px) {
      button:hover {
        transform: translateY(-2px);
        box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
      }
    }
  </style>
</head>
<body>
  <div class="offline-container">
    <div class="offline-icon">
      <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"/>
      </svg>
    </div>
    <h1>Sin Conexión</h1>
    <p>No hay conexión a internet. Por favor, verifica tu conexión e intenta nuevamente.</p>
    <button onclick="window.location.reload()">Reintentar</button>
  </div>
</body>
</html>`,
    {
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    }
  )
}

// Escuchar mensajes desde la app
self.addEventListener('message', (event) => {
  const { type } = event.data || {}

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break

    case 'CLEAR_CACHE':
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
      break

    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_VERSION })
      break
  }
})

// Sincronización en background (cuando vuelva la conexión)
self.addEventListener('sync', (event) => {
  console.log('[SW] Sincronización en background:', event.tag)

  if (event.tag === 'sync-data') {
    event.waitUntil(
      Promise.resolve()
        .then(() => {
          console.log('[SW] Datos sincronizados')
        })
    )
  }
})

// Notificaciones Push
self.addEventListener('push', (event) => {
  console.log('[SW] Push recibido')

  let data = {
    title: 'JahekaY',
    body: 'Nueva notificación',
    icon: '/icon.svg'
  }

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() }
    } catch {
      data.body = event.data.text()
    }
  }

  const options = {
    body: data.body,
    icon: data.icon || '/icon.svg',
    badge: '/icon.svg',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      url: data.url || '/portal-cliente/dashboard'
    },
    actions: [
      { action: 'open', title: 'Ver' },
      { action: 'close', title: 'Cerrar' }
    ],
    requireInteraction: false,
    renotify: false,
    tag: data.tag || 'default'
  }

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  )
})

// Click en notificaciones
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Click en notificación:', event.action)

  event.notification.close()

  if (event.action === 'close') {
    return
  }

  const urlToOpen = event.notification.data?.url || '/portal-cliente/dashboard'

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Buscar ventana existente
        for (const client of clientList) {
          if (client.url.includes('/portal-cliente') && 'focus' in client) {
            client.navigate(urlToOpen)
            return client.focus()
          }
        }
        // Abrir nueva ventana
        if (self.clients.openWindow) {
          return self.clients.openWindow(urlToOpen)
        }
      })
  )
})

console.log('[SW] Service Worker v' + CACHE_VERSION + ' cargado')
