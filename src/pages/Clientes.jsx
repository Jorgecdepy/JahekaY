import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Modal from '../components/Modal'
import FormularioCliente from '../components/FormularioCliente'
import './Clientes.css'

function Clientes() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isModalEditarOpen, setIsModalEditarOpen] = useState(false)
  const [isModalVerOpen, setIsModalVerOpen] = useState(false)
  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [savingCliente, setSavingCliente] = useState(false)
  const [formDataEditar, setFormDataEditar] = useState({
    nombre_completo: '',
    direccion: '',
    telefono: '',
    email: '',
    numero_medidor: '',
    codigo_pin: '',
    activo: true,
    notas: ''
  })

  useEffect(() => {
    cargarClientes()
  }, [])

  const cargarClientes = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .order('nombre_completo', { ascending: true })

    if (error) {
      console.error('Error:', error)
    } else {
      setClientes(data || [])
    }
    setLoading(false)
  }

  const handleSuccess = () => {
    setIsModalOpen(false)
    cargarClientes()
  }

  const abrirModalVer = (cliente) => {
    setClienteSeleccionado(cliente)
    setIsModalVerOpen(true)
  }

  const abrirModalEditar = (cliente) => {
    setClienteSeleccionado(cliente)
    setFormDataEditar({
      nombre_completo: cliente.nombre_completo || '',
      direccion: cliente.direccion || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      numero_medidor: cliente.numero_medidor || '',
      codigo_pin: cliente.codigo_pin || '',
      activo: cliente.activo !== false,
      notas: cliente.notas || ''
    })
    setIsModalEditarOpen(true)
  }

  const generarPIN = () => {
    const pin = Math.floor(100000 + Math.random() * 900000).toString()
    setFormDataEditar({ ...formDataEditar, codigo_pin: pin })
  }

  const handleSubmitEditar = async (e) => {
    e.preventDefault()
    setSavingCliente(true)

    try {
      const { error } = await supabase
        .from('usuarios')
        .update({
          nombre_completo: formDataEditar.nombre_completo,
          direccion: formDataEditar.direccion,
          telefono: formDataEditar.telefono,
          email: formDataEditar.email,
          numero_medidor: formDataEditar.numero_medidor,
          codigo_pin: formDataEditar.codigo_pin,
          activo: formDataEditar.activo,
          notas: formDataEditar.notas
        })
        .eq('id', clienteSeleccionado.id)

      if (error) throw error

      setIsModalEditarOpen(false)
      cargarClientes()
    } catch (error) {
      console.error('Error:', error)
      alert('Error al actualizar cliente: ' + error.message)
    }

    setSavingCliente(false)
  }

  const clientesFiltrados = clientes.filter(cliente =>
    cliente.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.cedula?.includes(searchTerm) ||
    cliente.numero_medidor?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getEstadoClase = (estado) => {
    switch (estado) {
      case 'activo': return 'badge-success'
      case 'suspendido': return 'badge-danger'
      case 'inactivo': return 'badge-secondary'
      default: return 'badge-secondary'
    }
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner spinner-lg"></div>
        <p>Cargando clientes...</p>
      </div>
    )
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h2>Gestion de Clientes</h2>
          <p className="page-subtitle">Administra los clientes del sistema</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nuevo Cliente
        </button>
      </div>

      <div className="search-section">
        <div className="search-box">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Buscar por nombre, cedula o medidor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="mini-stats">
        <div className="mini-stat">
          <span className="mini-stat-value">{clientes.length}</span>
          <span className="mini-stat-label">Total</span>
        </div>
        <div className="mini-stat">
          <span className="mini-stat-value text-success">{clientes.filter(c => c.estado === 'activo').length}</span>
          <span className="mini-stat-label">Activos</span>
        </div>
        <div className="mini-stat">
          <span className="mini-stat-value text-danger">{clientes.filter(c => c.estado === 'suspendido').length}</span>
          <span className="mini-stat-label">Suspendidos</span>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Cedula</th>
              <th>Medidor</th>
              <th>Direccion</th>
              <th>Telefono</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map((cliente) => (
              <tr key={cliente.id}>
                <td className="td-name">{cliente.nombre_completo}</td>
                <td>{cliente.cedula}</td>
                <td><span className="badge badge-info">{cliente.numero_medidor}</span></td>
                <td className="td-address">{cliente.direccion}</td>
                <td>{cliente.telefono || '-'}</td>
                <td>
                  <span className={`badge ${getEstadoClase(cliente.estado)}`}>
                    {cliente.estado?.toUpperCase()}
                  </span>
                </td>
                <td>
                  <div className="action-buttons">
                    <button
                      className="btn-icon btn-icon-info"
                      title="Ver detalles"
                      onClick={() => abrirModalVer(cliente)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                    <button
                      className="btn-icon btn-icon-primary"
                      title="Editar cliente y credenciales"
                      onClick={() => abrirModalEditar(cliente)}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {clientesFiltrados.length === 0 && (
          <div className="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
            <p>No se encontraron clientes</p>
            <span>Intenta con otros terminos de busqueda</span>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Nuevo Cliente"
      >
        <FormularioCliente
          onSuccess={handleSuccess}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>

      {/* Modal Ver Detalles */}
      <Modal
        isOpen={isModalVerOpen}
        onClose={() => setIsModalVerOpen(false)}
        title="Detalles del Cliente"
      >
        {clienteSeleccionado && (
          <div className="form-container" style={{ padding: '1rem' }}>
            <div className="cliente-detalle-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div>
                <label style={{ fontWeight: '600', color: '#555', fontSize: '0.875rem' }}>Nombre Completo</label>
                <p style={{ marginTop: '0.25rem', fontSize: '1rem' }}>{clienteSeleccionado.nombre_completo}</p>
              </div>
              <div>
                <label style={{ fontWeight: '600', color: '#555', fontSize: '0.875rem' }}>Dirección</label>
                <p style={{ marginTop: '0.25rem', fontSize: '1rem' }}>{clienteSeleccionado.direccion || '-'}</p>
              </div>
              <div>
                <label style={{ fontWeight: '600', color: '#555', fontSize: '0.875rem' }}>Teléfono</label>
                <p style={{ marginTop: '0.25rem', fontSize: '1rem' }}>{clienteSeleccionado.telefono || '-'}</p>
              </div>
              <div>
                <label style={{ fontWeight: '600', color: '#555', fontSize: '0.875rem' }}>Email</label>
                <p style={{ marginTop: '0.25rem', fontSize: '1rem' }}>{clienteSeleccionado.email || '-'}</p>
              </div>
              <div>
                <label style={{ fontWeight: '600', color: '#555', fontSize: '0.875rem' }}>Número de Medidor</label>
                <p style={{ marginTop: '0.25rem', fontSize: '1rem' }}>
                  {clienteSeleccionado.numero_medidor ? (
                    <span className="badge badge-info">{clienteSeleccionado.numero_medidor}</span>
                  ) : '-'}
                </p>
              </div>
              <div>
                <label style={{ fontWeight: '600', color: '#555', fontSize: '0.875rem' }}>Estado</label>
                <p style={{ marginTop: '0.25rem', fontSize: '1rem' }}>
                  <span className={`badge ${clienteSeleccionado.activo !== false ? 'badge-success' : 'badge-danger'}`}>
                    {clienteSeleccionado.activo !== false ? 'ACTIVO' : 'INACTIVO'}
                  </span>
                </p>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <label style={{ fontWeight: '600', color: '#555', fontSize: '0.875rem' }}>Notas</label>
                <p style={{ marginTop: '0.25rem', fontSize: '1rem' }}>{clienteSeleccionado.notas || '-'}</p>
              </div>
            </div>
            <div className="form-actions" style={{ marginTop: '2rem' }}>
              <button type="button" className="btn-secondary" onClick={() => setIsModalVerOpen(false)}>
                Cerrar
              </button>
              <button type="button" className="btn-primary" onClick={() => {
                setIsModalVerOpen(false)
                abrirModalEditar(clienteSeleccionado)
              }}>
                Editar Cliente
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Editar Cliente */}
      <Modal
        isOpen={isModalEditarOpen}
        onClose={() => setIsModalEditarOpen(false)}
        title="Editar Cliente y Credenciales"
      >
        <form onSubmit={handleSubmitEditar} className="form-container">
          <div className="form-group">
            <label>Nombre Completo *</label>
            <input
              type="text"
              value={formDataEditar.nombre_completo}
              onChange={(e) => setFormDataEditar({...formDataEditar, nombre_completo: e.target.value})}
              placeholder="Juan Pérez"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Dirección *</label>
              <input
                type="text"
                value={formDataEditar.direccion}
                onChange={(e) => setFormDataEditar({...formDataEditar, direccion: e.target.value})}
                placeholder="Calle 1, Barrio San José"
                required
              />
            </div>
            <div className="form-group">
              <label>Teléfono</label>
              <input
                type="tel"
                value={formDataEditar.telefono}
                onChange={(e) => setFormDataEditar({...formDataEditar, telefono: e.target.value})}
                placeholder="0981123456"
              />
            </div>
          </div>

          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={formDataEditar.email}
              onChange={(e) => setFormDataEditar({...formDataEditar, email: e.target.value})}
              placeholder="cliente@ejemplo.com"
            />
          </div>

          <div className="alert alert-info" style={{ marginTop: '1rem', marginBottom: '1rem' }}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="16" x2="12" y2="12"></line>
              <line x1="12" y1="8" x2="12.01" y2="8"></line>
            </svg>
            <div>
              <strong>Credenciales para el Portal del Cliente</strong>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.875rem' }}>
                Configura el acceso del cliente al portal web
              </p>
            </div>
          </div>

          <div className="form-group">
            <label>Número de Medidor *</label>
            <input
              type="text"
              value={formDataEditar.numero_medidor}
              onChange={(e) => setFormDataEditar({...formDataEditar, numero_medidor: e.target.value})}
              placeholder="Ejemplo: 001234"
              required
              maxLength="20"
            />
            <small className="form-hint">
              El cliente usará este número como usuario para iniciar sesión
            </small>
          </div>

          <div className="form-group">
            <label>Código PIN (6 dígitos)</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                value={formDataEditar.codigo_pin}
                onChange={(e) => setFormDataEditar({...formDataEditar, codigo_pin: e.target.value.replace(/\D/g, '')})}
                placeholder="123456"
                maxLength="6"
                pattern="\d{6}"
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn-secondary"
                onClick={generarPIN}
                title="Generar PIN aleatorio"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ width: '20px', height: '20px' }}>
                  <polyline points="23 4 23 10 17 10"></polyline>
                  <polyline points="1 20 1 14 7 14"></polyline>
                  <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path>
                </svg>
                Generar
              </button>
            </div>
            <small className="form-hint">
              PIN de 6 dígitos. Usa "Generar" para crear uno aleatorio seguro.
            </small>
          </div>

          <div className="form-group">
            <label>Notas</label>
            <textarea
              value={formDataEditar.notas}
              onChange={(e) => setFormDataEditar({...formDataEditar, notas: e.target.value})}
              placeholder="Observaciones adicionales..."
              rows="3"
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={formDataEditar.activo}
                onChange={(e) => setFormDataEditar({...formDataEditar, activo: e.target.checked})}
                style={{ marginRight: '0.5rem' }}
              />
              <span>
                <strong>Cliente activo</strong>
                <small style={{ display: 'block', color: '#666', fontSize: '0.875rem' }}>
                  Permite al cliente acceder al portal y recibir servicios
                </small>
              </span>
            </label>
          </div>

          <div className="form-actions">
            <button type="button" className="btn-secondary" onClick={() => setIsModalEditarOpen(false)}>
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={savingCliente}>
              {savingCliente ? (
                <>
                  <span className="spinner"></span>
                  Guardando...
                </>
              ) : (
                'Guardar Cambios'
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}

export default Clientes
