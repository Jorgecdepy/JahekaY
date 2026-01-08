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
                    <button className="btn-icon" title="Ver detalles">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                    <button className="btn-icon" title="Editar">
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
    </div>
  )
}

export default Clientes
