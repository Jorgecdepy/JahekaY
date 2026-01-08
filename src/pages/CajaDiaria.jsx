import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import Modal from '../components/Modal'
import FormularioTransaccion from '../components/FormularioTransaccion'
import jsPDF from 'jspdf'
import './CajaDiaria.css'

function CajaDiaria() {
  const [cajaActual, setCajaActual] = useState(null)
  const [transacciones, setTransacciones] = useState([])
  const [categorias, setCategorias] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [tipoTransaccion, setTipoTransaccion] = useState('gasto')
  const [searchTerm, setSearchTerm] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('todos')

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)

    // Cargar o crear caja del día actual
    const fechaHoy = new Date().toISOString().split('T')[0]

    let { data: cajaData, error: cajaError } = await supabase
      .from('caja_diaria')
      .select('*')
      .eq('fecha', fechaHoy)
      .single()

    if (cajaError && cajaError.code === 'PGRST116') {
      // No existe caja para hoy, crear una nueva
      const { data: cajaAnterior } = await supabase
        .from('caja_diaria')
        .select('monto_final')
        .order('fecha', { ascending: false })
        .limit(1)
        .single()

      const montoInicial = cajaAnterior?.monto_final || 0

      const { data: nuevaCaja, error: errorNueva } = await supabase
        .from('caja_diaria')
        .insert({
          fecha: fechaHoy,
          monto_inicial: montoInicial,
          hora_apertura: new Date().toISOString(),
          estado: 'abierta'
        })
        .select()
        .single()

      if (errorNueva) {
        console.error('Error al crear caja:', errorNueva)
      } else {
        cajaData = nuevaCaja
      }
    }

    setCajaActual(cajaData)

    // Cargar transacciones de hoy
    if (cajaData) {
      const { data: transaccionesData, error: transaccionesError } = await supabase
        .from('transacciones_caja')
        .select(`
          *,
          categoria:categorias_transaccion (
            nombre,
            color
          ),
          usuario:usuarios (
            nombre_completo
          ),
          factura:facturas (
            periodo
          )
        `)
        .eq('caja_diaria_id', cajaData.id)
        .order('created_at', { ascending: false })

      if (transaccionesError) {
        console.error('Error al cargar transacciones:', transaccionesError)
      } else {
        setTransacciones(transaccionesData || [])
      }
    }

    // Cargar categorías
    const { data: categoriasData, error: categoriasError } = await supabase
      .from('categorias_transaccion')
      .select('*')
      .eq('activo', true)
      .order('nombre')

    if (categoriasError) {
      console.error('Error al cargar categorías:', categoriasError)
    } else {
      setCategorias(categoriasData || [])
    }

    setLoading(false)
  }

  const handleSuccess = () => {
    setIsModalOpen(false)
    cargarDatos()
  }

  const abrirModal = (tipo) => {
    setTipoTransaccion(tipo)
    setIsModalOpen(true)
  }

  const cerrarCaja = async () => {
    if (!cajaActual) return

    const confirmacion = window.confirm(
      '¿Estás seguro de cerrar la caja del día? Esta acción no se puede deshacer.'
    )

    if (!confirmacion) return

    const { error } = await supabase
      .from('caja_diaria')
      .update({
        estado: 'cerrada',
        hora_cierre: new Date().toISOString(),
        arqueo_generado: true
      })
      .eq('id', cajaActual.id)

    if (error) {
      console.error('Error al cerrar caja:', error)
      alert('Error al cerrar la caja')
    } else {
      alert('Caja cerrada exitosamente')
      cargarDatos()
    }
  }

  const eliminarTransaccion = async (id) => {
    if (!window.confirm('¿Eliminar esta transacción?')) return

    const { error } = await supabase
      .from('transacciones_caja')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error:', error)
      alert('Error al eliminar la transacción')
    } else {
      cargarDatos()
    }
  }

  const generarPDF = () => {
    if (!cajaActual) return

    const doc = new jsPDF()
    const fechaHoy = new Date().toLocaleDateString('es-PY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Encabezado
    doc.setFontSize(20)
    doc.text('Sistema JahekaY', 105, 20, { align: 'center' })
    doc.setFontSize(16)
    doc.text('Arqueo de Caja Diaria', 105, 30, { align: 'center' })
    doc.setFontSize(12)
    doc.text(fechaHoy, 105, 40, { align: 'center' })

    // Línea divisoria
    doc.line(20, 45, 190, 45)

    // Resumen de caja
    let y = 55
    doc.setFontSize(14)
    doc.text('Resumen de Caja', 20, y)

    y += 10
    doc.setFontSize(11)
    doc.text(`Monto Inicial: ${formatMonto(cajaActual.monto_inicial)}`, 20, y)

    y += 8
    doc.text(`Total Ingresos: ${formatMonto(cajaActual.total_ingresos)}`, 20, y)

    y += 8
    doc.text(`Total Gastos: ${formatMonto(cajaActual.total_gastos)}`, 20, y)

    y += 8
    doc.setFont(undefined, 'bold')
    doc.text(`Monto Final: ${formatMonto(cajaActual.monto_final)}`, 20, y)
    doc.setFont(undefined, 'normal')

    // Detalle de transacciones
    y += 15
    doc.setFontSize(14)
    doc.text('Detalle de Transacciones', 20, y)

    y += 10
    doc.setFontSize(10)

    // Ingresos
    const ingresos = transacciones.filter(t => t.tipo === 'ingreso')
    if (ingresos.length > 0) {
      doc.setFont(undefined, 'bold')
      doc.text('INGRESOS:', 20, y)
      doc.setFont(undefined, 'normal')
      y += 6

      ingresos.forEach(t => {
        if (y > 270) {
          doc.addPage()
          y = 20
        }
        doc.text(`• ${t.descripcion}`, 25, y)
        doc.text(formatMonto(t.monto), 170, y, { align: 'right' })
        y += 5
      })
      y += 5
    }

    // Gastos
    const gastos = transacciones.filter(t => t.tipo === 'gasto')
    if (gastos.length > 0) {
      if (y > 250) {
        doc.addPage()
        y = 20
      }
      doc.setFont(undefined, 'bold')
      doc.text('GASTOS:', 20, y)
      doc.setFont(undefined, 'normal')
      y += 6

      gastos.forEach(t => {
        if (y > 270) {
          doc.addPage()
          y = 20
        }
        doc.text(`• ${t.descripcion}`, 25, y)
        doc.text(formatMonto(t.monto), 170, y, { align: 'right' })
        y += 5
      })
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.text(
        `Página ${i} de ${pageCount}`,
        105,
        290,
        { align: 'center' }
      )
    }

    // Descargar PDF
    const nombreArchivo = `arqueo_caja_${cajaActual.fecha}.pdf`
    doc.save(nombreArchivo)
  }

  const transaccionesFiltradas = transacciones.filter(t => {
    const coincideBusqueda = t.descripcion?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.categoria?.nombre?.toLowerCase().includes(searchTerm.toLowerCase())

    const coincideTipo = filtroTipo === 'todos' || t.tipo === filtroTipo

    return coincideBusqueda && coincideTipo
  })

  const formatFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-PY', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0
    }).format(monto || 0)
  }

  if (loading) {
    return (
      <div className="page-loading">
        <div className="spinner spinner-lg"></div>
        <p>Cargando caja diaria...</p>
      </div>
    )
  }

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h2>Caja Diaria</h2>
          <p className="page-subtitle">
            Gestión de ingresos y gastos del día
            {cajaActual && (
              <span className={`badge ${cajaActual.estado === 'abierta' ? 'badge-success' : 'badge-secondary'} ml-2`}>
                {cajaActual.estado?.toUpperCase()}
              </span>
            )}
          </p>
        </div>
        <div className="header-actions">
          <button
            className="btn-success"
            onClick={() => abrirModal('ingreso')}
            disabled={cajaActual?.estado !== 'abierta'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Ingreso
          </button>
          <button
            className="btn-danger"
            onClick={() => abrirModal('gasto')}
            disabled={cajaActual?.estado !== 'abierta'}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Gasto
          </button>
        </div>
      </div>

      {/* Resumen de Caja */}
      <div className="caja-resumen">
        <div className="caja-card caja-card-neutral">
          <span className="caja-label">Monto Inicial</span>
          <span className="caja-value">{formatMonto(cajaActual?.monto_inicial)}</span>
        </div>
        <div className="caja-card caja-card-success">
          <span className="caja-label">Ingresos</span>
          <span className="caja-value">{formatMonto(cajaActual?.total_ingresos)}</span>
          <span className="caja-count">{transacciones.filter(t => t.tipo === 'ingreso').length} transacciones</span>
        </div>
        <div className="caja-card caja-card-danger">
          <span className="caja-label">Gastos</span>
          <span className="caja-value">{formatMonto(cajaActual?.total_gastos)}</span>
          <span className="caja-count">{transacciones.filter(t => t.tipo === 'gasto').length} transacciones</span>
        </div>
        <div className="caja-card caja-card-primary">
          <span className="caja-label">Monto Final</span>
          <span className="caja-value caja-value-lg">{formatMonto(cajaActual?.monto_final)}</span>
        </div>
      </div>

      {/* Acciones de Caja */}
      <div className="caja-actions">
        <button
          className="btn-secondary"
          onClick={generarPDF}
          disabled={!cajaActual}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="7 10 12 15 17 10"></polyline>
            <line x1="12" y1="15" x2="12" y2="3"></line>
          </svg>
          Descargar Arqueo PDF
        </button>
        {cajaActual?.estado === 'abierta' && (
          <button
            className="btn-warning"
            onClick={cerrarCaja}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
            Cerrar Caja
          </button>
        )}
      </div>

      {/* Filtros */}
      <div className="filters-section">
        <div className="search-box">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="Buscar transacciones..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          className="filter-select"
        >
          <option value="todos">Todos los tipos</option>
          <option value="ingreso">Ingresos</option>
          <option value="gasto">Gastos</option>
        </select>
      </div>

      {/* Tabla de Transacciones */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Hora</th>
              <th>Tipo</th>
              <th>Categoría</th>
              <th>Descripción</th>
              <th>Método</th>
              <th>Monto</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {transaccionesFiltradas.map((transaccion) => (
              <tr key={transaccion.id}>
                <td>{formatFecha(transaccion.created_at)}</td>
                <td>
                  <span className={`badge ${transaccion.tipo === 'ingreso' ? 'badge-success' : 'badge-danger'}`}>
                    {transaccion.tipo === 'ingreso' ? '↑ INGRESO' : '↓ GASTO'}
                  </span>
                </td>
                <td>
                  {transaccion.categoria && (
                    <span
                      className="badge"
                      style={{ backgroundColor: transaccion.categoria.color }}
                    >
                      {transaccion.categoria.nombre}
                    </span>
                  )}
                </td>
                <td className="td-description">{transaccion.descripcion}</td>
                <td>
                  <span className="badge badge-info">{transaccion.metodo_pago}</span>
                </td>
                <td className={`td-money ${transaccion.tipo === 'ingreso' ? 'text-success' : 'text-danger'}`}>
                  {transaccion.tipo === 'ingreso' ? '+' : '-'} {formatMonto(transaccion.monto)}
                </td>
                <td>
                  <div className="action-buttons">
                    {cajaActual?.estado === 'abierta' && (
                      <button
                        className="btn-icon btn-icon-danger"
                        title="Eliminar"
                        onClick={() => eliminarTransaccion(transaccion.id)}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {transaccionesFiltradas.length === 0 && (
          <div className="empty-state">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
            <p>No hay transacciones registradas</p>
            <span>Agrega tu primer ingreso o gasto del día</span>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={tipoTransaccion === 'ingreso' ? 'Registrar Ingreso' : 'Registrar Gasto'}
      >
        <FormularioTransaccion
          tipo={tipoTransaccion}
          cajaId={cajaActual?.id}
          categorias={categorias.filter(c => c.tipo === tipoTransaccion)}
          onSuccess={handleSuccess}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  )
}

export default CajaDiaria
