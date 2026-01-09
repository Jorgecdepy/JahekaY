import { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '../services/supabase'

const EmpleadoAuthContext = createContext()

export const useEmpleado = () => {
  const context = useContext(EmpleadoAuthContext)
  if (!context) {
    throw new Error('useEmpleado debe usarse dentro de EmpleadoAuthProvider')
  }
  return context
}

export const EmpleadoAuthProvider = ({ children }) => {
  const [empleado, setEmpleado] = useState(null)
  const [rol, setRol] = useState(null)
  const [permisos, setPermisos] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Verificar sesión actual de Supabase
    verificarSesion()

    // Escuchar cambios en la autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        cargarDatosEmpleado(session.user.id)
      } else {
        setEmpleado(null)
        setRol(null)
        setPermisos({})
        setLoading(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const verificarSesion = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await cargarDatosEmpleado(session.user.id)
    } else {
      setLoading(false)
    }
  }

  const cargarDatosEmpleado = async (usuarioId) => {
    try {
      // Cargar datos del empleado
      const { data: empleadoData, error: empleadoError } = await supabase
        .from('vista_empleados_roles')
        .select('*')
        .eq('usuario_supabase_id', usuarioId)
        .eq('activo', true)
        .single()

      if (empleadoError) throw empleadoError

      if (!empleadoData) {
        console.error('Empleado no encontrado o inactivo')
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      setEmpleado(empleadoData)

      // Cargar rol y permisos si tiene rol asignado
      if (empleadoData.rol_id) {
        const { data: rolData, error: rolError } = await supabase
          .from('roles')
          .select('*')
          .eq('id', empleadoData.rol_id)
          .single()

        if (!rolError && rolData) {
          setRol(rolData)
          setPermisos(rolData.permisos || {})
        }
      }

      setLoading(false)
    } catch (error) {
      console.error('Error al cargar datos del empleado:', error)
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
      setEmpleado(null)
      setRol(null)
      setPermisos({})
    } catch (error) {
      console.error('Error en logout:', error)
    }
  }

  // Función para verificar si tiene un permiso específico
  const tienePermiso = (modulo, permiso) => {
    if (!permisos || !permisos[modulo]) return false
    return permisos[modulo][permiso] === true
  }

  // Función para verificar si tiene acceso a un módulo (al menos un permiso)
  const tieneAccesoModulo = (modulo) => {
    if (!permisos || !permisos[modulo]) return false
    return Object.values(permisos[modulo]).some(p => p === true)
  }

  // Función para obtener todos los permisos de un módulo
  const getPermisosModulo = (modulo) => {
    if (!permisos || !permisos[modulo]) return {}
    return permisos[modulo]
  }

  // Función para verificar si es administrador (todos los permisos)
  const esAdministrador = () => {
    if (!rol || !permisos) return false
    // Un admin tiene al menos ver en todos los módulos
    const modulos = ['dashboard', 'clientes', 'lecturas', 'facturas', 'caja', 'reportes', 'configuracion', 'empleados']
    return modulos.every(mod => permisos[mod]?.ver === true)
  }

  const value = {
    empleado,
    rol,
    permisos,
    loading,
    isAuthenticated: !!empleado,
    login,
    logout,
    tienePermiso,
    tieneAccesoModulo,
    getPermisosModulo,
    esAdministrador,
    cargarDatosEmpleado
  }

  return (
    <EmpleadoAuthContext.Provider value={value}>
      {children}
    </EmpleadoAuthContext.Provider>
  )
}
