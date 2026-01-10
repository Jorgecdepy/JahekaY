import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { initPWA } from './registerSW'

// Inicializar PWA
if (import.meta.env.PROD) {
  initPWA()
}

// Registro del service worker en desarrollo (opcional)
if (import.meta.env.DEV && 'serviceWorker' in navigator) {
  // En desarrollo, desregistrar SW para evitar problemas de caché
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      registration.unregister()
    })
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
