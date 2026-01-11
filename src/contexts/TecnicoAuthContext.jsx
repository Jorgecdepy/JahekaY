import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

const TecnicoAuthContext = createContext()

export const useTecnico = () => {
  const context = useContext(TecnicoAuthContext)
  if (!context) {
    throw new Error('useTecnico debe usarse dentro de TecnicoAuthProvider')
  }
  return context
}

export const TecnicoAuthProvider = ({ children }) => {
  const [tecnico, setTecnico] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar sesión actual de Supabase
    verificarSesion()

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        cargarDatosTecnico(session.user.id)
      } else {
        setTecnico(null)
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const verificarSesion = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await cargarDatosTecnico(session.user.id)
    } else {
      setLoading(false)
    }
  }

  const cargarDatosTecnico = async (usuarioId) => {
    try {
      // Cargar datos del empleado desde la vista
      const { data: empleadoData, error: empleadoError } = await supabase
        .from('vista_empleados_roles')
        .select('*')
        .eq('usuario_supabase_id', usuarioId)
        .eq('activo', true)
        .single()

      if (empleadoError) throw empleadoError

      if (!empleadoData) {
        console.error('Técnico no encontrado o inactivo')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      // Verificar que sea técnico
      if (empleadoData.rol_nombre !== 'Técnico') {
        console.error('El usuario no tiene rol de técnico')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      setTecnico(empleadoData)
      setLoading(false)
    } catch (error) {
      console.error('Error al cargar datos del técnico:', error)
      setLoading(false)
    }
  }

  const login = async (email, password) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      // Verificar que sea técnico
      const { data: empleadoData } = await supabase
        .from('vista_empleados_roles')
        .select('rol_nombre')
        .eq('usuario_supabase_id', data.user.id)
        .eq('activo', true)
        .single()

      if (!empleadoData || empleadoData.rol_nombre !== 'Técnico') {
        await supabase.auth.signOut()
        return {
          success: false,
          error: 'Acceso no autorizado. Esta cuenta no es de técnico.'
        }
      }

      // Los datos se cargarán automáticamente por el listener onAuthStateChange
      return { success: true }
    } catch (error) {
      console.error('Error en login:', error)
      return { success: false, error: error.message }
    }
  }

  const logout = async () => {
    try {
      await supabase.auth.signOut()
      setTecnico(null)
    } catch (error) {
      console.error('Error en logout:', error)
    }
  }

  const value = {
    tecnico,
    loading,
    isAuthenticated: !!tecnico,
    login,
    logout,
    cargarDatosTecnico
  }

  return (
    <TecnicoAuthContext.Provider value={value}>
      {children}
    </TecnicoAuthContext.Provider>
  )
}
