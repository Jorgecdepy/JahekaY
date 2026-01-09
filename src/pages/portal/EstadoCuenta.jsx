import { useState, useEffect } from 'react'
import { useCliente } from '../../contexts/ClienteAuthContext'
import { supabase } from '../../config/supabaseClient'
import jsPDF from 'jspdf'
import './EstadoCuenta.css'

export default function EstadoCuenta() {
  const { cliente } = useCliente()
  const [facturas, setFacturas] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todas')
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos')
  const [facturaSeleccionada, setFacturaSeleccionada] = useState(null)
  const [descargando, setDescargando] = useState(false)

  const [resumen, setResumen] = useState({
    total_facturas: 0,
    total_pendiente: 0,
    total_pagado: 0,
    facturas_vencidas: 0
  })

  useEffect(() => {
    cargarFacturas()
  }, [cliente.id, filtroEstado, filtroPeriodo])

  const cargarFacturas = async () => {
    setLoading(true)

    let query = supabase
      .from('facturas')
      .select('*')
      .eq('cliente_id', cliente.id)
      .order('fecha_emision', { ascending: false })

    // Filtro por estado
    if (filtroEstado !== 'todas') {
      query = query.eq('estado', filtroEstado)
    }

    // Filtro por período
    if (filtroPeriodo !== 'todos') {
      const hoy = new Date()
      let fechaInicio

      switch (filtroPeriodo) {
        case 'mes_actual':
          fechaInicio = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
          break
        case 'ultimos_3_meses':
          fechaInicio = new Date(hoy.setMonth(hoy.getMonth() - 3))
          break
        case 'ultimos_6_meses':
          fechaInicio = new Date(hoy.setMonth(hoy.getMonth() - 6))
          break
        case 'este_año':
          fechaInicio = new Date(hoy.getFullYear(), 0, 1)
          break
      }

      if (fechaInicio) {
        query = query.gte('fecha_emision', fechaInicio.toISOString())
      }
    }

    const { data, error } = await query

    if (!error && data) {
      setFacturas(data)
      calcularResumen(data)
    }

    setLoading(false)
  }

  const calcularResumen = (facturas) => {
    const hoy = new Date()

    const resumen = facturas.reduce(
      (acc, factura) => {
        acc.total_facturas++

        if (factura.estado === 'pendiente' || factura.estado === 'vencida') {
          acc.total_pendiente += factura.total
        }

        if (factura.estado === 'pagada') {
          acc.total_pagado += factura.total
        }

        if (factura.estado === 'vencida' ||
            (factura.estado === 'pendiente' && new Date(factura.fecha_vencimiento) < hoy)) {
          acc.facturas_vencidas++
        }

        return acc
      },
      { total_facturas: 0, total_pendiente: 0, total_pagado: 0, facturas_vencidas: 0 }
    )

    setResumen(resumen)
  }

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'pendiente':
        return '#ff9800'
      case 'pagada':
        return '#4caf50'
      case 'vencida':
        return '#f44336'
      case 'cancelada':
        return '#9e9e9e'
      default:
        return '#2196f3'
    }
  }

  const getEstadoTexto = (estado) => {
    switch (estado) {
      case 'pendiente':
        return 'Pendiente'
      case 'pagada':
        return 'Pagada'
      case 'vencida':
        return 'Vencida'
      case 'cancelada':
        return 'Cancelada'
      default:
        return estado
    }
  }

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(valor)
  }

  const descargarFacturaPDF = async (factura) => {
    setDescargando(true)

    try {
      // Crear nuevo documento PDF
      const doc = new jsPDF()

      // Configurar colores
      const colorPrimario = [102, 126, 234]
      const colorSecundario = [118, 75, 162]
      const colorTexto = [51, 51, 51]
      const colorGris = [136, 136, 136]

      // Header con gradiente (simulado con rectángulos)
      doc.setFillColor(colorPrimario[0], colorPrimario[1], colorPrimario[2])
      doc.rect(0, 0, 210, 40, 'F')

      // Logo/Título
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(24)
      doc.setFont('helvetica', 'bold')
      doc.text('JahekaY', 20, 20)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('Sistema de Gestión de Agua Potable', 20, 28)

      // Número de factura
      doc.setFontSize(12)
      doc.setFont('helvetica', 'bold')
      doc.text(`Factura #${factura.numero_factura || factura.id.substring(0, 8)}`, 140, 20)

      // Estado de la factura
      const estadoY = 28
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')

      // Fondo del estado
      const estadoColor = getEstadoColor(factura.estado)
      const rgb = hexToRgb(estadoColor)
      doc.setFillColor(rgb.r, rgb.g, rgb.b)
      doc.roundedRect(135, estadoY - 5, 55, 8, 2, 2, 'F')

      doc.setTextColor(255, 255, 255)
      doc.text(getEstadoTexto(factura.estado).toUpperCase(), 140, estadoY)

      // Información del Cliente
      doc.setTextColor(colorTexto[0], colorTexto[1], colorTexto[2])
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('CLIENTE', 20, 55)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(cliente.nombre_completo, 20, 62)
      doc.text(`Medidor: ${cliente.numero_medidor}`, 20, 68)
      if (cliente.direccion) {
        doc.text(`Dirección: ${cliente.direccion}`, 20, 74)
      }

      // Información de la Factura
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('INFORMACIÓN DE FACTURA', 120, 55)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Fecha Emisión: ${formatearFecha(factura.fecha_emision)}`, 120, 62)
      doc.text(`Fecha Vencimiento: ${formatearFecha(factura.fecha_vencimiento)}`, 120, 68)
      doc.text(`Período: ${factura.periodo_mes}/${factura.periodo_año}`, 120, 74)

      // Línea separadora
      doc.setDrawColor(colorGris[0], colorGris[1], colorGris[2])
      doc.line(20, 85, 190, 85)

      // Detalles de Consumo
      doc.setFillColor(245, 247, 250)
      doc.rect(20, 95, 170, 40, 'F')

      doc.setTextColor(colorTexto[0], colorTexto[1], colorTexto[2])
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('DETALLES DE CONSUMO', 25, 105)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')

      const lecturaAnterior = factura.lectura_anterior || 0
      const lecturaActual = factura.lectura_actual || 0
      const consumo = lecturaActual - lecturaAnterior

      doc.text(`Lectura Anterior:`, 25, 115)
      doc.text(`${lecturaAnterior} m³`, 80, 115)

      doc.text(`Lectura Actual:`, 25, 122)
      doc.text(`${lecturaActual} m³`, 80, 122)

      doc.setFont('helvetica', 'bold')
      doc.text(`Consumo Total:`, 25, 129)
      doc.text(`${consumo} m³`, 80, 129)

      // Desglose de Montos
      let currentY = 150

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('DESGLOSE DE MONTOS', 20, currentY)

      currentY += 10

      // Tabla de conceptos
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')

      const conceptos = [
        { label: 'Consumo de Agua', valor: factura.subtotal || 0 },
        { label: 'Impuestos', valor: factura.impuestos || 0 },
        { label: 'Otros Cargos', valor: factura.otros_cargos || 0 }
      ]

      conceptos.forEach(concepto => {
        doc.text(concepto.label, 25, currentY)
        doc.text(formatearMoneda(concepto.valor), 140, currentY, { align: 'right' })
        currentY += 7
      })

      // Línea separadora antes del total
      currentY += 3
      doc.setLineWidth(0.5)
      doc.line(25, currentY, 165, currentY)
      currentY += 10

      // Total
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.text('TOTAL A PAGAR:', 25, currentY)
      doc.setTextColor(colorPrimario[0], colorPrimario[1], colorPrimario[2])
      doc.text(formatearMoneda(factura.total), 165, currentY, { align: 'right' })

      // Si está pagada, mostrar info de pago
      if (factura.estado === 'pagada' && factura.fecha_pago) {
        currentY += 15
        doc.setFillColor(76, 175, 80)
        doc.rect(20, currentY - 8, 170, 15, 'F')

        doc.setTextColor(255, 255, 255)
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('✓ FACTURA PAGADA', 25, currentY)
        doc.setFont('helvetica', 'normal')
        doc.text(`Fecha de Pago: ${formatearFecha(factura.fecha_pago)}`, 25, currentY + 6)
      }

      // Footer
      const footerY = 270
      doc.setDrawColor(colorGris[0], colorGris[1], colorGris[2])
      doc.line(20, footerY, 190, footerY)

      doc.setTextColor(colorGris[0], colorGris[1], colorGris[2])
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('JahekaY - Sistema de Gestión de Agua Potable', 105, footerY + 5, { align: 'center' })
      doc.text('Gracias por su pago puntual', 105, footerY + 10, { align: 'center' })
      doc.text(`Generado: ${new Date().toLocaleString('es-ES')}`, 105, footerY + 15, { align: 'center' })

      // Guardar PDF
      const nombreArchivo = `Factura_${factura.numero_factura || factura.id.substring(0, 8)}_${factura.periodo_mes}-${factura.periodo_año}.pdf`
      doc.save(nombreArchivo)

    } catch (error) {
      console.error('Error al generar PDF:', error)
      alert('Error al generar el PDF. Por favor intenta nuevamente.')
    }

    setDescargando(false)
  }

  // Función auxiliar para convertir hex a rgb
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 }
  }

  const verDetalle = (factura) => {
    setFacturaSeleccionada(factura)
  }

  const cerrarDetalle = () => {
    setFacturaSeleccionada(null)
  }

  return (
    <div className="estado-cuenta-container">
      {/* Header */}
      <div className="estado-header">
        <div className="header-content">
          <h1>Estado de Cuenta</h1>
          <p>Consulta y descarga tus facturas</p>
        </div>
      </div>

      {/* Resumen */}
      <div className="resumen-container">
        <div className="resumen-cards">
          <div className="resumen-card">
            <div className="resumen-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              📊
            </div>
            <div className="resumen-info">
              <p className="resumen-label">Total Facturas</p>
              <p className="resumen-valor">{resumen.total_facturas}</p>
            </div>
          </div>

          <div className="resumen-card">
            <div className="resumen-icon" style={{ background: 'linear-gradient(135deg, #f44336 0%, #e91e63 100%)' }}>
              💰
            </div>
            <div className="resumen-info">
              <p className="resumen-label">Saldo Pendiente</p>
              <p className="resumen-valor">{formatearMoneda(resumen.total_pendiente)}</p>
            </div>
          </div>

          <div className="resumen-card">
            <div className="resumen-icon" style={{ background: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)' }}>
              ✓
            </div>
            <div className="resumen-info">
              <p className="resumen-label">Total Pagado</p>
              <p className="resumen-valor">{formatearMoneda(resumen.total_pagado)}</p>
            </div>
          </div>

          <div className="resumen-card">
            <div className="resumen-icon" style={{ background: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)' }}>
              ⚠️
            </div>
            <div className="resumen-info">
              <p className="resumen-label">Facturas Vencidas</p>
              <p className="resumen-valor">{resumen.facturas_vencidas}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filtros-container">
        <div className="filtros-row">
          <div className="filtro-group">
            <label>Estado:</label>
            <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              <option value="todas">Todas</option>
              <option value="pendiente">Pendientes</option>
              <option value="pagada">Pagadas</option>
              <option value="vencida">Vencidas</option>
              <option value="cancelada">Canceladas</option>
            </select>
          </div>

          <div className="filtro-group">
            <label>Período:</label>
            <select value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value)}>
              <option value="todos">Todos</option>
              <option value="mes_actual">Mes Actual</option>
              <option value="ultimos_3_meses">Últimos 3 Meses</option>
              <option value="ultimos_6_meses">Últimos 6 Meses</option>
              <option value="este_año">Este Año</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de Facturas */}
      <div className="facturas-content">
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Cargando facturas...</p>
          </div>
        ) : facturas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📄</div>
            <h3>No hay facturas</h3>
            <p>No se encontraron facturas con los filtros seleccionados</p>
          </div>
        ) : (
          <div className="tabla-responsive">
            <table className="facturas-tabla">
              <thead>
                <tr>
                  <th>Período</th>
                  <th>Fecha Emisión</th>
                  <th>Vencimiento</th>
                  <th>Consumo</th>
                  <th>Total</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {facturas.map((factura) => (
                  <tr key={factura.id}>
                    <td data-label="Período">
                      <strong>{factura.periodo_mes}/{factura.periodo_año}</strong>
                    </td>
                    <td data-label="Fecha Emisión">{formatearFecha(factura.fecha_emision)}</td>
                    <td data-label="Vencimiento">{formatearFecha(factura.fecha_vencimiento)}</td>
                    <td data-label="Consumo">
                      {((factura.lectura_actual || 0) - (factura.lectura_anterior || 0))} m³
                    </td>
                    <td data-label="Total">
                      <strong>{formatearMoneda(factura.total)}</strong>
                    </td>
                    <td data-label="Estado">
                      <span
                        className="estado-badge-small"
                        style={{ backgroundColor: getEstadoColor(factura.estado) }}
                      >
                        {getEstadoTexto(factura.estado)}
                      </span>
                    </td>
                    <td data-label="Acciones">
                      <div className="acciones-btns">
                        <button
                          className="btn-accion btn-ver"
                          onClick={() => verDetalle(factura)}
                          title="Ver detalle"
                        >
                          👁️
                        </button>
                        <button
                          className="btn-accion btn-descargar"
                          onClick={() => descargarFacturaPDF(factura)}
                          disabled={descargando}
                          title="Descargar PDF"
                        >
                          📥
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Detalle */}
      {facturaSeleccionada && (
        <div className="modal-overlay" onClick={cerrarDetalle}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2>Factura #{facturaSeleccionada.numero_factura || facturaSeleccionada.id.substring(0, 8)}</h2>
                <p className="periodo-detalle">
                  Período: {facturaSeleccionada.periodo_mes}/{facturaSeleccionada.periodo_año}
                </p>
              </div>
              <button className="btn-close" onClick={cerrarDetalle}>✕</button>
            </div>

            <div className="detalle-body">
              <div className="detalle-estado">
                <span
                  className="estado-badge-large"
                  style={{ backgroundColor: getEstadoColor(facturaSeleccionada.estado) }}
                >
                  {getEstadoTexto(facturaSeleccionada.estado)}
                </span>
              </div>

              <div className="detalle-grid">
                <div className="detalle-section">
                  <h3>Fechas</h3>
                  <p><strong>Emisión:</strong> {formatearFecha(facturaSeleccionada.fecha_emision)}</p>
                  <p><strong>Vencimiento:</strong> {formatearFecha(facturaSeleccionada.fecha_vencimiento)}</p>
                  {facturaSeleccionada.fecha_pago && (
                    <p><strong>Pagada:</strong> {formatearFecha(facturaSeleccionada.fecha_pago)}</p>
                  )}
                </div>

                <div className="detalle-section">
                  <h3>Consumo</h3>
                  <p><strong>Lectura Anterior:</strong> {facturaSeleccionada.lectura_anterior || 0} m³</p>
                  <p><strong>Lectura Actual:</strong> {facturaSeleccionada.lectura_actual || 0} m³</p>
                  <p><strong>Consumo Total:</strong> {((facturaSeleccionada.lectura_actual || 0) - (facturaSeleccionada.lectura_anterior || 0))} m³</p>
                </div>

                <div className="detalle-section">
                  <h3>Desglose</h3>
                  <p><strong>Subtotal:</strong> {formatearMoneda(facturaSeleccionada.subtotal || 0)}</p>
                  <p><strong>Impuestos:</strong> {formatearMoneda(facturaSeleccionada.impuestos || 0)}</p>
                  <p><strong>Otros Cargos:</strong> {formatearMoneda(facturaSeleccionada.otros_cargos || 0)}</p>
                </div>

                <div className="detalle-section total-section">
                  <h3>Total</h3>
                  <p className="total-valor">{formatearMoneda(facturaSeleccionada.total)}</p>
                </div>
              </div>

              <div className="detalle-actions">
                <button
                  className="btn-primary btn-descargar-full"
                  onClick={() => descargarFacturaPDF(facturaSeleccionada)}
                  disabled={descargando}
                >
                  {descargando ? '⏳ Generando PDF...' : '📥 Descargar PDF'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
