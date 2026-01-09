import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import './RolesPermisos.css'

// Definición de módulos y permisos disponibles en el sistema
const MODULOS_SISTEMA = [
  {
    id: 'dashboard',
    nombre: 'Dashboard',
    descripcion: 'Panel de control y estadísticas',
    permisos: ['ver']
  },
  {
    id: 'clientes',
    nombre: 'Clientes',
    descripcion: 'Gestión de clientes del sistema',
    permisos: ['ver', 'crear', 'editar', 'eliminar']
  },
  {
    id: 'lecturas',
    nombre: 'Lecturas',
    descripcion: 'Registro de lecturas de medidores',
    permisos: ['ver', 'crear', 'editar', 'eliminar']
  },
  {
    id: 'facturas',
    nombre: 'Facturas',
    descripcion: 'Gestión de facturación',
    permisos: ['ver', 'crear', 'editar', 'eliminar', 'anular']
  },
  {
    id: 'caja',
    nombre: 'Caja Diaria',
    descripcion: 'Control de ingresos y egresos',
    permisos: ['ver', 'crear', 'editar', 'eliminar', 'cerrar_caja']
  },
  {
    id: 'reportes',
    nombre: 'Reportes',
    descripcion: 'Generación de reportes',
    permisos: ['ver', 'generar', 'exportar']
  },
  {
    id: 'configuracion',
    nombre: 'Configuración',
    descripcion: 'Configuración del sistema',
    permisos: ['ver', 'editar']
  },
  {
    id: 'empleados',
    nombre: 'Empleados',
    descripcion: 'Gestión de empleados y roles',
    permisos: ['ver', 'crear', 'editar', 'eliminar', 'asignar']
  }
]

const PERMISOS_LABELS = {
  ver: 'Ver',
  crear: 'Crear',
  editar: 'Editar',
  eliminar: 'Eliminar',
  anular: 'Anular',
  cerrar_caja: 'Cerrar Caja',
  generar: 'Generar',
  exportar: 'Exportar',
  asignar: 'Asignar'
}

export default function RolesPermisos() {
  const [roles, setRoles] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [vistaActual, setVistaActual] = useState('roles') // 'roles' o 'empleados'
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [rolEditar, setRolEditar] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const [formData, setFormData] = useState({
    nombre: '',
    descripcion: '',
    permisos: {}
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    await Promise.all([cargarRoles(), cargarEmpleados()])
    setLoading(false)
  }

  const cargarRoles = async () => {
    const { data, error } = await supabase
      .from('roles')
      .select('*')
      .order('nombre')

    if (!error && data) {
      setRoles(data)
    }
  }

  const cargarEmpleados = async () => {
    const { data, error } = await supabase
      .from('vista_empleados_roles')
      .select('*')
      .order('nombre_completo')

    if (!error && data) {
      setEmpleados(data)
    }
  }

  const abrirModalNuevo = () => {
    setRolEditar(null)
    setFormData({
      nombre: '',
      descripcion: '',
      permisos: inicializarPermisosVacios()
    })
    setIsModalOpen(true)
  }

  const abrirModalEditar = (rol) => {
    setRolEditar(rol)
    setFormData({
      nombre: rol.nombre,
      descripcion: rol.descripcion || '',
      permisos: rol.permisos || inicializarPermisosVacios()
    })
    setIsModalOpen(true)
  }

  const inicializarPermisosVacios = () => {
    const permisos = {}
    MODULOS_SISTEMA.forEach(modulo => {
      permisos[modulo.id] = {}
      modulo.permisos.forEach(permiso => {
        permisos[modulo.id][permiso] = false
      })
    })
    return permisos
  }

  const togglePermiso = (moduloId, permisoId) => {
    setFormData(prev => ({
      ...prev,
      permisos: {
        ...prev.permisos,
        [moduloId]: {
          ...prev.permisos[moduloId],
          [permisoId]: !prev.permisos[moduloId]?.[permisoId]
        }
      }
    }))
  }

  const toggleTodosModulo = (moduloId) => {
    const modulo = MODULOS_SISTEMA.find(m => m.id === moduloId)
    const todosActivos = modulo.permisos.every(
      p => formData.permisos[moduloId]?.[p]
    )

    const nuevosPermisos = {}
    modulo.permisos.forEach(permiso => {
      nuevosPermisos[permiso] = !todosActivos
    })

    setFormData(prev => ({
      ...prev,
      permisos: {
        ...prev.permisos,
        [moduloId]: nuevosPermisos
      }
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setGuardando(true)

    try {
      const rolData = {
        nombre: formData.nombre,
        descripcion: formData.descripcion,
        permisos: formData.permisos
      }

      if (rolEditar) {
        // Actualizar rol existente
        const { error } = await supabase
          .from('roles')
          .update(rolData)
          .eq('id', rolEditar.id)

        if (error) throw error
        alert('Rol actualizado exitosamente')
      } else {
        // Crear nuevo rol
        const { error } = await supabase
          .from('roles')
          .insert([rolData])

        if (error) throw error
        alert('Rol creado exitosamente')
      }

      setIsModalOpen(false)
      cargarRoles()
    } catch (error) {
      console.error('Error al guardar rol:', error)
      alert('Error al guardar el rol: ' + error.message)
    }

    setGuardando(false)
  }

  const eliminarRol = async (rolId) => {
    if (!confirm('¿Estás seguro de eliminar este rol?')) return

    try {
      const { error } = await supabase
        .from('roles')
        .delete()
        .eq('id', rolId)

      if (error) throw error
      alert('Rol eliminado exitosamente')
      cargarRoles()
    } catch (error) {
      console.error('Error al eliminar rol:', error)
      alert('Error al eliminar el rol: ' + error.message)
    }
  }

  const contarPermisosActivos = (permisos) => {
    if (!permisos) return 0
    let count = 0
    Object.values(permisos).forEach(modulo => {
      Object.values(modulo).forEach(permiso => {
        if (permiso) count++
      })
    })
    return count
  }

  const tienePermisoEnModulo = (permisos, moduloId) => {
    if (!permisos || !permisos[moduloId]) return false
    return Object.values(permisos[moduloId]).some(p => p === true)
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando roles y permisos...</p>
      </div>
    )
  }

  return (
    <div className="roles-permisos-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h2>Roles y Permisos</h2>
          <p className="page-subtitle">Gestiona los roles y permisos del sistema</p>
        </div>
        <button className="btn-primary" onClick={abrirModalNuevo}>
          <span className="btn-icon">+</span>
          Nuevo Rol
        </button>
      </div>

      {/* Tabs de Vista */}
      <div className="vista-tabs">
        <button
          className={`tab-btn ${vistaActual === 'roles' ? 'active' : ''}`}
          onClick={() => setVistaActual('roles')}
        >
          <span>👥</span> Roles ({roles.length})
        </button>
        <button
          className={`tab-btn ${vistaActual === 'empleados' ? 'active' : ''}`}
          onClick={() => setVistaActual('empleados')}
        >
          <span>👤</span> Empleados ({empleados.length})
        </button>
      </div>

      {/* Vista de Roles */}
      {vistaActual === 'roles' && (
        <div className="roles-grid">
          {roles.map(rol => (
            <div key={rol.id} className="rol-card">
              <div className="rol-header">
                <div>
                  <h3>{rol.nombre}</h3>
                  <p className="rol-descripcion">{rol.descripcion || 'Sin descripción'}</p>
                </div>
                <div className="rol-acciones">
                  <button
                    className="btn-icon-action btn-edit"
                    onClick={() => abrirModalEditar(rol)}
                    title="Editar"
                  >
                    ✏️
                  </button>
                  <button
                    className="btn-icon-action btn-delete"
                    onClick={() => eliminarRol(rol.id)}
                    title="Eliminar"
                  >
                    🗑️
                  </button>
                </div>
              </div>

              <div className="rol-stats">
                <span className="stat-badge">
                  {contarPermisosActivos(rol.permisos)} permisos activos
                </span>
                <span className="stat-badge">
                  {empleados.filter(e => e.rol_id === rol.id).length} empleados
                </span>
              </div>

              <div className="rol-permisos-preview">
                <p className="permisos-label">Acceso a módulos:</p>
                <div className="modulos-chips">
                  {MODULOS_SISTEMA.map(modulo => (
                    tienePermisoEnModulo(rol.permisos, modulo.id) && (
                      <span key={modulo.id} className="modulo-chip">
                        {modulo.nombre}
                      </span>
                    )
                  ))}
                </div>
              </div>
            </div>
          ))}

          {roles.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">👥</span>
              <h3>No hay roles creados</h3>
              <p>Crea un rol para comenzar a gestionar permisos</p>
              <button className="btn-primary" onClick={abrirModalNuevo}>
                Crear Primer Rol
              </button>
            </div>
          )}
        </div>
      )}

      {/* Vista de Empleados */}
      {vistaActual === 'empleados' && (
        <div className="empleados-tabla">
          <table>
            <thead>
              <tr>
                <th>Empleado</th>
                <th>Email</th>
                <th>Rol</th>
                <th>Permisos Activos</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {empleados.map(empleado => {
                const rol = roles.find(r => r.id === empleado.rol_id)
                const permisosCount = rol ? contarPermisosActivos(rol.permisos) : 0

                return (
                  <tr key={empleado.id}>
                    <td>
                      <strong>{empleado.nombre_completo}</strong>
                    </td>
                    <td>{empleado.email}</td>
                    <td>
                      <span className="rol-badge">
                        {empleado.rol_nombre || 'Sin rol'}
                      </span>
                    </td>
                    <td>
                      <span className="permisos-count">
                        {permisosCount} permisos
                      </span>
                    </td>
                    <td>
                      <span className={`estado-badge ${empleado.activo ? 'activo' : 'inactivo'}`}>
                        {empleado.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>

          {empleados.length === 0 && (
            <div className="empty-state">
              <span className="empty-icon">👤</span>
              <h3>No hay empleados registrados</h3>
              <p>Los empleados se gestionan desde Configuración</p>
            </div>
          )}
        </div>
      )}

      {/* Modal para Crear/Editar Rol */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{rolEditar ? 'Editar Rol' : 'Nuevo Rol'}</h3>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nombre del Rol *</label>
                  <input
                    type="text"
                    value={formData.nombre}
                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                    placeholder="Ej: Administrador, Cajero, Lector"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Descripción</label>
                  <textarea
                    value={formData.descripcion}
                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                    placeholder="Describe las responsabilidades de este rol..."
                    rows="3"
                  />
                </div>

                <div className="permisos-section">
                  <h4>Configuración de Permisos</h4>
                  <p className="permisos-help">
                    Selecciona los permisos que tendrá este rol en cada módulo del sistema
                  </p>

                  <div className="modulos-permisos">
                    {MODULOS_SISTEMA.map(modulo => (
                      <div key={modulo.id} className="modulo-permisos-card">
                        <div className="modulo-header">
                          <div>
                            <h5>{modulo.nombre}</h5>
                            <p>{modulo.descripcion}</p>
                          </div>
                          <button
                            type="button"
                            className="btn-toggle-all"
                            onClick={() => toggleTodosModulo(modulo.id)}
                          >
                            {modulo.permisos.every(p => formData.permisos[modulo.id]?.[p])
                              ? 'Desmarcar Todos'
                              : 'Marcar Todos'
                            }
                          </button>
                        </div>

                        <div className="permisos-checks">
                          {modulo.permisos.map(permiso => (
                            <label key={permiso} className="permiso-checkbox">
                              <input
                                type="checkbox"
                                checked={formData.permisos[modulo.id]?.[permiso] || false}
                                onChange={() => togglePermiso(modulo.id, permiso)}
                              />
                              <span>{PERMISOS_LABELS[permiso]}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={guardando}
                >
                  {guardando ? 'Guardando...' : (rolEditar ? 'Actualizar Rol' : 'Crear Rol')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
