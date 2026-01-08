import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Modal from '../components/Modal'
import FormularioLectura from '../components/FormularioLectura'
import './Lecturas.css'

function Lecturas() {
  const [lecturas, setLecturas] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    
    // Cargar lecturas con información del cliente
    const { data: lecturasData, error: lecturasError } = await supabase
      .from('lecturas')
      .select(`
        *,
        usuarios (
          nombre_completo,
          numero_medidor,
          cedula
        )
      `)
      .order('fecha_lectura', { ascending: false })

    // Cargar clientes activos
    const { data: clientesData, error: clientesError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('estado', 'activo')
      .order('nombre_completo', { ascending: true })

    if (lecturasError) {
      console.error('Error:', lecturasError)
    } else {
      setLecturas(lecturasData || [])
    }

    if (clientesError) {
      console.error('Error:', clientesError)
    } else {
      setClientes(clientesData || [])
    }

    setLoading(false)
  }

  const handleSuccess = () => {
    setIsModalOpen(false)
    cargarDatos()
  }

  const lecturasFiltradas = lecturas.filter(lectura =>
    lectura.usuarios?.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lectura.usuarios?.numero_medidor.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lectura.usuarios?.cedula.includes(searchTerm)
  )

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-PY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getMesNombre = (mes) => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    return meses[mes - 1]
  }

  if (loading) {
    return <div className="loading-container">Cargando lecturas...</div>
  }

  return (
    <div className="lecturas-container">
      <div className="lecturas-header">
        <h2>Gestión de Lecturas</h2>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          + Nueva Lectura
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

      <div className="lecturas-stats">
        <div className="stat-card">
          <p className="stat-label">Total Lecturas</p>
          <p className="stat-value">{lecturas.length}</p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Este Mes</p>
          <p className="stat-value">
            {lecturas.filter(l => l.mes === new Date().getMonth() + 1 && l.anio === new Date().getFullYear()).length}
          </p>
        </div>
        <div className="stat-card">
          <p className="stat-label">Consumo Total (m³)</p>
          <p className="stat-value">
            {lecturas.reduce((sum, l) => sum + (l.consumo_m3 || 0), 0)}
          </p>
        </div>
      </div>

      <div className="lecturas-table">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Medidor</th>
              <th>Periodo</th>
              <th>Lectura Anterior</th>
              <th>Lectura Actual</th>
              <th>Consumo (m³)</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lecturasFiltradas.map((lectura) => (
              <tr key={lectura.id}>
                <td>{lectura.usuarios?.nombre_completo}</td>
                <td><span className="medidor-badge">{lectura.usuarios?.numero_medidor}</span></td>
                <td>{getMesNombre(lectura.mes)} {lectura.anio}</td>
                <td className="lectura-numero">{lectura.lectura_anterior}</td>
                <td className="lectura-numero">{lectura.lectura_actual}</td>
                <td>
                  <span className="consumo-badge">{lectura.consumo_m3} m³</span>
                </td>
                <td>{formatFecha(lectura.fecha_lectura)}</td>
                <td>
                  <button className="btn-action">Ver</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {lecturasFiltradas.length === 0 && (
        <div className="no-results">
          No se encontraron lecturas con ese criterio de búsqueda.
        </div>
      )}

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        title="Nueva Lectura"
      >
        <FormularioLectura 
         onSuccess={handleSuccess}
         onCancel={() => setIsModalOpen(false)}
         clientes={clientes}
        />
      </Modal>
    </div>
  )
}

export default Lecturas