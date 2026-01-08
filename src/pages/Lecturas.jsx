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
    lectura.usuarios?.nombre_completo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lectura.usuarios?.numero_medidor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lectura.usuarios?.cedula?.includes(searchTerm)
  )

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-PY', {
      year: 'numeric',
      month: 'short',
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

  const mesActual = new Date().getMonth() + 1
  const anioActual = new Date().getFullYear()

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner spinner-lg"></div>
        <p>Cargando lecturas...</p>
      </div>
    )
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h2>Gestion de Lecturas</h2>
          <p className="page-subtitle">Registra las lecturas de medidores</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Nueva Lectura
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
          <span className="mini-stat-value">{lecturas.length}</span>
          <span className="mini-stat-label">Total</span>
        </div>
        <div className="mini-stat">
          <span className="mini-stat-value text-success">
            {lecturas.filter(l => l.mes === mesActual && l.anio === anioActual).length}
          </span>
          <span className="mini-stat-label">Este Mes</span>
        </div>
        <div className="mini-stat">
          <span className="mini-stat-value">{lecturas.reduce((sum, l) => sum + (l.consumo_m3 || 0), 0)}</span>
          <span className="mini-stat-label">m3 Total</span>
        </div>
      </div>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Medidor</th>
              <th>Periodo</th>
              <th>Anterior</th>
              <th>Actual</th>
              <th>Consumo</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {lecturasFiltradas.map((lectura) => (
              <tr key={lectura.id}>
                <td className="td-name">{lectura.usuarios?.nombre_completo}</td>
                <td><span className="badge badge-info">{lectura.usuarios?.numero_medidor}</span></td>
                <td>{getMesNombre(lectura.mes)} {lectura.anio}</td>
                <td className="td-number">{lectura.lectura_anterior}</td>
                <td className="td-number">{lectura.lectura_actual}</td>
                <td><span className="badge badge-success">{lectura.consumo_m3} m3</span></td>
                <td>{formatFecha(lectura.fecha_lectura)}</td>
                <td>
                  <div className="action-buttons">
                    <button className="btn-icon" title="Ver detalles">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {lecturasFiltradas.length === 0 && (
          <div className="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
            </svg>
            <p>No se encontraron lecturas</p>
            <span>Intenta con otros terminos de busqueda</span>
          </div>
        )}
      </div>

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
