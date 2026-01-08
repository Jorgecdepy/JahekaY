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
      setClientes(data)
    }
    setLoading(false)
  }

  const handleSuccess = () => {
    setIsModalOpen(false)
    cargarClientes()
  }

  const clientesFiltrados = clientes.filter(cliente =>
    cliente.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cliente.cedula.includes(searchTerm) ||
    cliente.numero_medidor.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getEstadoColor = (estado) => {
    switch(estado) {
      case 'activo': return '#27ae60'
      case 'suspendido': return '#e74c3c'
      case 'inactivo': return '#95a5a6'
      default: return '#95a5a6'
    }
  }

  if (loading) {
    return <div className="loading-container">Cargando clientes...</div>
  }

  return (
    <div className="clientes-container">
      <div className="clientes-header">
        <h2>Gestión de Clientes</h2>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          + Nuevo Cliente
        </button>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Buscar por nombre, cédula o medidor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="clientes-stats">
        <div className="stat-card">
          <p className="stat-label">Total Clientes</p>
          <p className="stat-value">{clientes.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Activos</p>
          <p className="stat-value">{clientes.filter(c => c.estado === 'activo').length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Suspendidos</p>
          <p className="stat-value">{clientes.filter(c => c.estado === 'suspendido').length}</p>
        </div>
      </div>

      <div className="clientes-table">
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Cédula</th>
              <th>Medidor</th>
              <th>Dirección</th>
              <th>Teléfono</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clientesFiltrados.map((cliente) => (
              <tr key={cliente.id}>
                <td>{cliente.nombre_completo}</td>
                <td>{cliente.cedula}</td>
                <td><span className="medidor-badge">{cliente.numero_medidor}</span></td>
                <td>{cliente.direccion}</td>
                <td>{cliente.telefono}</td>
                <td>
                  <span 
                    className="estado-badge" 
                    style={{ backgroundColor: getEstadoColor(cliente.estado) }}
                  >
                    {cliente.estado.toUpperCase()}
                  </span>
                </td>
                <td>
                  <button className="btn-action">Ver</button>
                  <button className="btn-action">Editar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {clientesFiltrados.length === 0 && (
        <div className="no-results">
          No se encontraron clientes con ese criterio de búsqueda.
        </div>
      )}

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