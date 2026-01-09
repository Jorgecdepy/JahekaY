import { createContext, useContext, useState, useEffect } from 'react'

const ClienteAuthContext = createContext()

export const useClienteAuth = () => {
  const context = useContext(ClienteAuthContext)
  if (!context) {
    throw new Error('useClienteAuth debe usarse dentro de ClienteAuthProvider')
  }
  return context
}

// Alias para compatibilidad
export const useCliente = useClienteAuth

export const ClienteAuthProvider = ({ children }) => {
  const [cliente, setCliente] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar si hay sesión guardada
    const clienteGuardado = localStorage.getItem('cliente_jahekay')
    if (clienteGuardado) {
      try {
        setCliente(JSON.parse(clienteGuardado))
      } catch (error) {
        console.error('Error al parsear cliente guardado:', error)
        localStorage.removeItem('cliente_jahekay')
      }
    }
    setLoading(false)
  }, [])

  const login = (clienteData) => {
    setCliente(clienteData)
    localStorage.setItem('cliente_jahekay', JSON.stringify(clienteData))
  }

  const logout = () => {
    setCliente(null)
    localStorage.removeItem('cliente_jahekay')
  }

  const value = {
    cliente,
    loading,
    login,
    logout,
    isAuthenticated: !!cliente
  }

  return (
    <ClienteAuthContext.Provider value={value}>
      {children}
    </ClienteAuthContext.Provider>
  )
}
