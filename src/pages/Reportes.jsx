import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { jsPDF } from 'jspdf'
import './Reportes.css'

function Reportes() {
  const [loading, setLoading] = useState(false)
  const [generando, setGenerando] = useState(false)
  const [tipoReporte, setTipoReporte] = useState('ingresos_mensuales')
  const [fechaDesde, setFechaDesde] = useState(
    new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]
  )
  const [fechaHasta, setFechaHasta] = useState(new Date().toISOString().split('T')[0])
  const [datosReporte, setDatosReporte] = useState(null)
  const [mensaje, setMensaje] = useState(null)

  const tiposReportes = [
    { id: 'ingresos_mensuales', nombre: 'Ingresos Mensuales', icono: '💰', descripcion: 'Reporte detallado de ingresos del mes' },
    { id: 'ingresos_anuales', nombre: 'Ingresos Anuales', icono: '📊', descripcion: 'Resumen de ingresos por año' },
    { id: 'facturas_estado', nombre: 'Facturas por Estado', icono: '📄', descripcion: 'Facturas pendientes, pagadas y vencidas' },
    { id: 'clientes_morosos', nombre: 'Clientes Morosos', icono: '⚠️', descripcion: 'Clientes con facturas vencidas' },
    { id: 'consumo_agua', nombre: 'Consumo de Agua', icono: '💧', descripcion: 'Análisis de consumo por cliente' },
    { id: 'caja_diaria', nombre: 'Movimientos de Caja', icono: '💵', descripcion: 'Ingresos y gastos diarios' },
    { id: 'lecturas_periodo', nombre: 'Lecturas del Período', icono: '📖', descripcion: 'Lecturas realizadas en el rango' }
  ]

  const generarReporte = async () => {
    setLoading(true)
    setGenerando(true)
    setDatosReporte(null)
    setMensaje(null)

    try {
      let datos = null

      switch (tipoReporte) {
        case 'ingresos_mensuales':
          datos = await generarReporteIngresosMensuales()
          break
        case 'ingresos_anuales':
          datos = await generarReporteIngresosAnuales()
          break
        case 'facturas_estado':
          datos = await generarReporteFacturasEstado()
          break
        case 'clientes_morosos':
          datos = await generarReporteClientesMorosos()
          break
        case 'consumo_agua':
          datos = await generarReporteConsumoAgua()
          break
        case 'caja_diaria':
          datos = await generarReporteCajaDiaria()
          break
        case 'lecturas_periodo':
          datos = await generarReporteLecturasPeriodo()
          break
        default:
          throw new Error('Tipo de reporte no válido')
      }

      setDatosReporte(datos)
      mostrarMensaje('Reporte generado exitosamente', 'success')
    } catch (error) {
      console.error('Error al generar reporte:', error)
      mostrarMensaje('Error al generar el reporte: ' + error.message, 'error')
    }

    setLoading(false)
    setGenerando(false)
  }

  // ================================================================
  // GENERADORES DE REPORTES
  // ================================================================

  const generarReporteIngresosMensuales = async () => {
    const { data: facturas, error } = await supabase
      .from('facturas')
      .select(`
        *,
        usuarios (nombre_completo, numero_medidor)
      `)
      .eq('estado', 'pagada')
      .gte('fecha_pago', fechaDesde)
      .lte('fecha_pago', fechaHasta)
      .order('fecha_pago', { ascending: false })

    if (error) throw error

    const totalIngresos = facturas.reduce((sum, f) => sum + parseFloat(f.total || 0), 0)
    const promedioFactura = facturas.length > 0 ? totalIngresos / facturas.length : 0

    return {
      tipo: 'ingresos_mensuales',
      titulo: 'Reporte de Ingresos Mensuales',
      periodo: `${formatFechaSolo(fechaDesde)} - ${formatFechaSolo(fechaHasta)}`,
      resumen: {
        totalIngresos,
        cantidadFacturas: facturas.length,
        promedioFactura
      },
      datos: facturas
    }
  }

  const generarReporteIngresosAnuales = async () => {
    const año = new Date(fechaDesde).getFullYear()
    const { data: facturas, error } = await supabase
      .from('facturas')
      .select('*')
      .eq('estado', 'pagada')
      .gte('fecha_pago', `${año}-01-01`)
      .lte('fecha_pago', `${año}-12-31`)

    if (error) throw error

    // Agrupar por mes
    const porMes = {}
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

    meses.forEach((mes, idx) => {
      porMes[mes] = { nombre: mes, ingresos: 0, cantidad: 0 }
    })

    facturas.forEach(f => {
      const mes = new Date(f.fecha_pago).getMonth()
      const nombreMes = meses[mes]
      porMes[nombreMes].ingresos += parseFloat(f.total || 0)
      porMes[nombreMes].cantidad++
    })

    const totalAnual = facturas.reduce((sum, f) => sum + parseFloat(f.total || 0), 0)

    return {
      tipo: 'ingresos_anuales',
      titulo: `Reporte de Ingresos Anuales ${año}`,
      periodo: `Año ${año}`,
      resumen: {
        totalAnual,
        cantidadTotal: facturas.length,
        promedioMensual: totalAnual / 12
      },
      datos: Object.values(porMes)
    }
  }

  const generarReporteFacturasEstado = async () => {
    const { data: facturas, error } = await supabase
      .from('facturas')
      .select(`
        *,
        usuarios (nombre_completo, numero_medidor, telefono)
      `)
      .gte('fecha_emision', fechaDesde)
      .lte('fecha_emision', fechaHasta)
      .order('fecha_emision', { ascending: false })

    if (error) throw error

    const porEstado = {
      pendiente: [],
      pagada: [],
      vencida: []
    }

    facturas.forEach(f => {
      if (porEstado[f.estado]) {
        porEstado[f.estado].push(f)
      }
    })

    const totalPendiente = porEstado.pendiente.reduce((sum, f) => sum + parseFloat(f.total || 0), 0)
    const totalPagado = porEstado.pagada.reduce((sum, f) => sum + parseFloat(f.total || 0), 0)
    const totalVencido = porEstado.vencida.reduce((sum, f) => sum + parseFloat(f.total || 0), 0)

    return {
      tipo: 'facturas_estado',
      titulo: 'Reporte de Facturas por Estado',
      periodo: `${formatFechaSolo(fechaDesde)} - ${formatFechaSolo(fechaHasta)}`,
      resumen: {
        totalPendiente,
        totalPagado,
        totalVencido,
        cantidadPendiente: porEstado.pendiente.length,
        cantidadPagada: porEstado.pagada.length,
        cantidadVencida: porEstado.vencida.length
      },
      datos: porEstado
    }
  }

  const generarReporteClientesMorosos = async () => {
    const { data: facturas, error } = await supabase
      .from('facturas')
      .select(`
        *,
        usuarios (
          id,
          nombre_completo,
          numero_medidor,
          telefono,
          direccion
        )
      `)
      .eq('estado', 'vencida')
      .order('fecha_vencimiento', { ascending: true })

    if (error) throw error

    // Agrupar por cliente
    const clientesMap = {}
    facturas.forEach(f => {
      const clienteId = f.usuarios?.id
      if (!clienteId) return

      if (!clientesMap[clienteId]) {
        clientesMap[clienteId] = {
          ...f.usuarios,
          facturas: [],
          totalAdeudado: 0
        }
      }

      clientesMap[clienteId].facturas.push(f)
      clientesMap[clienteId].totalAdeudado += parseFloat(f.total || 0)
    })

    const clientesMorosos = Object.values(clientesMap)
    const totalAdeudado = clientesMorosos.reduce((sum, c) => sum + c.totalAdeudado, 0)

    return {
      tipo: 'clientes_morosos',
      titulo: 'Reporte de Clientes Morosos',
      periodo: `Al ${formatFechaSolo(new Date().toISOString().split('T')[0])}`,
      resumen: {
        cantidadClientes: clientesMorosos.length,
        totalAdeudado,
        totalFacturas: facturas.length
      },
      datos: clientesMorosos
    }
  }

  const generarReporteConsumoAgua = async () => {
    const { data: lecturas, error } = await supabase
      .from('lecturas')
      .select(`
        *,
        usuarios (nombre_completo, numero_medidor, direccion)
      `)
      .gte('fecha_lectura', fechaDesde)
      .lte('fecha_lectura', fechaHasta)
      .order('consumo_m3', { ascending: false })

    if (error) throw error

    const totalConsumo = lecturas.reduce((sum, l) => sum + parseFloat(l.consumo_m3 || 0), 0)
    const promedioConsumo = lecturas.length > 0 ? totalConsumo / lecturas.length : 0
    const consumoMaximo = lecturas.length > 0 ? Math.max(...lecturas.map(l => l.consumo_m3)) : 0
    const consumoMinimo = lecturas.length > 0 ? Math.min(...lecturas.map(l => l.consumo_m3)) : 0

    return {
      tipo: 'consumo_agua',
      titulo: 'Reporte de Consumo de Agua',
      periodo: `${formatFechaSolo(fechaDesde)} - ${formatFechaSolo(fechaHasta)}`,
      resumen: {
        totalConsumo,
        promedioConsumo,
        consumoMaximo,
        consumoMinimo,
        cantidadLecturas: lecturas.length
      },
      datos: lecturas
    }
  }

  const generarReporteCajaDiaria = async () => {
    const { data: transacciones, error } = await supabase
      .from('transacciones_caja')
      .select(`
        *,
        categoria:categorias_transaccion (nombre, tipo)
      `)
      .gte('created_at', fechaDesde)
      .lte('created_at', fechaHasta + 'T23:59:59')
      .order('created_at', { ascending: false })

    if (error) throw error

    const totalIngresos = transacciones
      .filter(t => t.tipo === 'ingreso')
      .reduce((sum, t) => sum + parseFloat(t.monto || 0), 0)

    const totalGastos = transacciones
      .filter(t => t.tipo === 'gasto')
      .reduce((sum, t) => sum + parseFloat(t.monto || 0), 0)

    const balance = totalIngresos - totalGastos

    return {
      tipo: 'caja_diaria',
      titulo: 'Reporte de Movimientos de Caja',
      periodo: `${formatFechaSolo(fechaDesde)} - ${formatFechaSolo(fechaHasta)}`,
      resumen: {
        totalIngresos,
        totalGastos,
        balance,
        cantidadTransacciones: transacciones.length
      },
      datos: transacciones
    }
  }

  const generarReporteLecturasPeriodo = async () => {
    const { data: lecturas, error } = await supabase
      .from('lecturas')
      .select(`
        *,
        usuarios (nombre_completo, numero_medidor, direccion)
      `)
      .gte('fecha_lectura', fechaDesde)
      .lte('fecha_lectura', fechaHasta)
      .order('fecha_lectura', { ascending: false })

    if (error) throw error

    return {
      tipo: 'lecturas_periodo',
      titulo: 'Reporte de Lecturas del Período',
      periodo: `${formatFechaSolo(fechaDesde)} - ${formatFechaSolo(fechaHasta)}`,
      resumen: {
        totalLecturas: lecturas.length
      },
      datos: lecturas
    }
  }

  // ================================================================
  // GENERACIÓN DE PDF - FORMATO EJECUTIVO PROFESIONAL
  // ================================================================

  // Constantes de diseño
  const PDF_CONFIG = {
    margin: { left: 20, right: 20, top: 15, bottom: 15 },
    colors: {
      primary: [99, 102, 241],      // Azul principal
      success: [34, 197, 94],       // Verde
      danger: [239, 68, 68],        // Rojo
      warning: [245, 158, 11],      // Amarillo
      gray: [156, 163, 175],        // Gris
      lightGray: [243, 244, 246],   // Gris claro
      darkGray: [55, 65, 81]        // Gris oscuro
    },
    fontSize: {
      title: 22,
      subtitle: 14,
      sectionTitle: 13,
      normal: 10,
      small: 8,
      tiny: 7
    }
  }

  // ============================================================
  // FUNCIONES AUXILIARES PARA ELEMENTOS VISUALES
  // ============================================================

  /**
   * Dibuja un rectángulo con bordes y relleno opcional
   */
  const drawBox = (doc, x, y, width, height, options = {}) => {
    const { fillColor, borderColor, borderWidth = 0.5 } = options

    if (fillColor) {
      doc.setFillColor(...fillColor)
      doc.rect(x, y, width, height, 'F')
    }

    if (borderColor || !fillColor) {
      doc.setDrawColor(...(borderColor || PDF_CONFIG.colors.gray))
      doc.setLineWidth(borderWidth)
      doc.rect(x, y, width, height, 'S')
    }
  }

  /**
   * Dibuja encabezado de página profesional
   */
  const drawPageHeader = (doc, pageWidth, isFirstPage = false) => {
    if (isFirstPage) {
      // Encabezado principal con fondo
      doc.setFillColor(...PDF_CONFIG.colors.primary)
      doc.rect(0, 0, pageWidth, 45, 'F')

      // Título del sistema
      doc.setTextColor(255, 255, 255)
      doc.setFontSize(PDF_CONFIG.fontSize.title)
      doc.setFont(undefined, 'bold')
      doc.text('SISTEMA DE GESTIÓN JAHEKAY', pageWidth / 2, 20, { align: 'center' })

      // Subtítulo
      doc.setFontSize(PDF_CONFIG.fontSize.subtitle)
      doc.setFont(undefined, 'normal')
      doc.text('Reporte Ejecutivo de Análisis', pageWidth / 2, 32, { align: 'center' })

      doc.setTextColor(0, 0, 0)
      return 50
    } else {
      // Encabezado reducido para páginas siguientes
      doc.setFillColor(...PDF_CONFIG.colors.lightGray)
      doc.rect(0, 0, pageWidth, 20, 'F')

      doc.setTextColor(...PDF_CONFIG.colors.primary)
      doc.setFontSize(PDF_CONFIG.fontSize.normal)
      doc.setFont(undefined, 'bold')
      doc.text('SISTEMA JAHEKAY', PDF_CONFIG.margin.left, 12)

      doc.setTextColor(0, 0, 0)
      return 25
    }
  }

  /**
   * Dibuja pie de página con metadata
   */
  const drawPageFooter = (doc, pageNum, totalPages, pageWidth, pageHeight) => {
    const y = pageHeight - 10

    // Línea superior del footer
    doc.setDrawColor(...PDF_CONFIG.colors.gray)
    doc.setLineWidth(0.5)
    doc.line(PDF_CONFIG.margin.left, y - 5, pageWidth - PDF_CONFIG.margin.right, y - 5)

    // Información del footer
    doc.setFontSize(PDF_CONFIG.fontSize.tiny)
    doc.setTextColor(...PDF_CONFIG.colors.gray)

    // Fecha de generación (izquierda)
    const fechaGen = new Date().toLocaleString('es-PY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    doc.text(`Generado: ${fechaGen}`, PDF_CONFIG.margin.left, y)

    // Número de página (centro)
    doc.text(`Página ${pageNum} de ${totalPages}`, pageWidth / 2, y, { align: 'center' })

    // Sistema (derecha)
    doc.text('JahekaY v1.0', pageWidth - PDF_CONFIG.margin.right, y, { align: 'right' })

    doc.setTextColor(0, 0, 0)
  }

  /**
   * Dibuja título de sección con fondo
   */
  const drawSectionTitle = (doc, text, y, pageWidth) => {
    const height = 10

    // Fondo de la sección
    doc.setFillColor(...PDF_CONFIG.colors.lightGray)
    doc.rect(PDF_CONFIG.margin.left, y, pageWidth - PDF_CONFIG.margin.left - PDF_CONFIG.margin.right, height, 'F')

    // Borde izquierdo de color
    doc.setFillColor(...PDF_CONFIG.colors.primary)
    doc.rect(PDF_CONFIG.margin.left, y, 3, height, 'F')

    // Texto del título
    doc.setFontSize(PDF_CONFIG.fontSize.sectionTitle)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(...PDF_CONFIG.colors.darkGray)
    doc.text(text.toUpperCase(), PDF_CONFIG.margin.left + 8, y + 7)

    doc.setTextColor(0, 0, 0)
    doc.setFont(undefined, 'normal')

    return y + height + 2
  }

  /**
   * Dibuja caja de métrica destacada
   */
  const drawMetricBox = (doc, x, y, width, height, label, value, color) => {
    // Caja con borde
    drawBox(doc, x, y, width, height, {
      fillColor: [255, 255, 255],
      borderColor: color,
      borderWidth: 1.5
    })

    // Etiqueta
    doc.setFontSize(PDF_CONFIG.fontSize.small)
    doc.setTextColor(...PDF_CONFIG.colors.gray)
    doc.text(label.toUpperCase(), x + width / 2, y + height * 0.35, { align: 'center' })

    // Valor
    doc.setFontSize(PDF_CONFIG.fontSize.subtitle)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(...color)
    doc.text(value, x + width / 2, y + height * 0.7, { align: 'center' })

    doc.setFont(undefined, 'normal')
    doc.setTextColor(0, 0, 0)
  }

  /**
   * Dibuja una tabla profesional con bordes
   */
  const drawTable = (doc, headers, rows, startY, pageWidth, pageHeight, onNewPage) => {
    const tableWidth = pageWidth - PDF_CONFIG.margin.left - PDF_CONFIG.margin.right
    const colWidth = tableWidth / headers.length
    const rowHeight = 8
    const headerHeight = 10
    let currentY = startY

    // Función para verificar si necesita nueva página
    const checkNewPage = (neededHeight) => {
      if (currentY + neededHeight > pageHeight - 30) {
        onNewPage()
        currentY = 25
        drawTableHeader()
      }
    }

    // Dibuja encabezado de tabla
    const drawTableHeader = () => {
      // Fondo del encabezado
      doc.setFillColor(...PDF_CONFIG.colors.primary)
      doc.rect(PDF_CONFIG.margin.left, currentY, tableWidth, headerHeight, 'F')

      // Bordes del encabezado
      doc.setDrawColor(255, 255, 255)
      doc.setLineWidth(0.5)

      headers.forEach((header, i) => {
        const x = PDF_CONFIG.margin.left + (i * colWidth)

        // Borde vertical
        if (i > 0) {
          doc.line(x, currentY, x, currentY + headerHeight)
        }

        // Texto del encabezado
        doc.setTextColor(255, 255, 255)
        doc.setFontSize(PDF_CONFIG.fontSize.small)
        doc.setFont(undefined, 'bold')
        doc.text(
          header.toUpperCase(),
          x + colWidth / 2,
          currentY + headerHeight / 2 + 1,
          { align: 'center', baseline: 'middle' }
        )
      })

      currentY += headerHeight
      doc.setTextColor(0, 0, 0)
      doc.setFont(undefined, 'normal')
    }

    // Dibuja encabezado inicial
    drawTableHeader()

    // Dibuja filas
    rows.forEach((row, rowIndex) => {
      checkNewPage(rowHeight)

      // Fondo alternado
      if (rowIndex % 2 === 0) {
        doc.setFillColor(...PDF_CONFIG.colors.lightGray)
        doc.rect(PDF_CONFIG.margin.left, currentY, tableWidth, rowHeight, 'F')
      }

      // Bordes de la fila
      doc.setDrawColor(...PDF_CONFIG.colors.gray)
      doc.setLineWidth(0.3)

      row.forEach((cell, colIndex) => {
        const x = PDF_CONFIG.margin.left + (colIndex * colWidth)

        // Borde vertical
        if (colIndex > 0) {
          doc.line(x, currentY, x, currentY + rowHeight)
        }

        // Texto de la celda
        doc.setFontSize(PDF_CONFIG.fontSize.small)
        doc.setTextColor(...PDF_CONFIG.colors.darkGray)

        // Alinear números a la derecha, texto a la izquierda
        const align = typeof cell === 'string' && cell.match(/^[₲\d,.\s]+$/) ? 'right' : 'left'
        const textX = align === 'right' ? x + colWidth - 3 : x + 3

        doc.text(
          String(cell),
          textX,
          currentY + rowHeight / 2 + 1,
          { align, baseline: 'middle', maxWidth: colWidth - 6 }
        )
      })

      // Borde inferior de la fila
      doc.line(
        PDF_CONFIG.margin.left,
        currentY + rowHeight,
        pageWidth - PDF_CONFIG.margin.right,
        currentY + rowHeight
      )

      currentY += rowHeight
    })

    doc.setTextColor(0, 0, 0)
    return currentY + 5
  }

  // ============================================================
  // FUNCIÓN PRINCIPAL DE GENERACIÓN DE PDF
  // ============================================================

  const descargarPDF = () => {
    if (!datosReporte) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    const pageHeight = doc.internal.pageSize.height
    let currentPage = 1

    // Función para agregar nueva página con encabezado
    const addNewPage = () => {
      doc.addPage()
      currentPage++
      return drawPageHeader(doc, pageWidth, false)
    }

    // ======= PÁGINA 1: PORTADA Y RESUMEN EJECUTIVO =======
    let y = drawPageHeader(doc, pageWidth, true)

    // Información del reporte
    y += 5
    doc.setFontSize(PDF_CONFIG.fontSize.subtitle)
    doc.setFont(undefined, 'bold')
    doc.setTextColor(...PDF_CONFIG.colors.primary)
    doc.text(datosReporte.titulo.toUpperCase(), pageWidth / 2, y, { align: 'center' })

    y += 10
    doc.setFontSize(PDF_CONFIG.fontSize.normal)
    doc.setFont(undefined, 'normal')
    doc.setTextColor(...PDF_CONFIG.colors.gray)
    doc.text(`Período: ${datosReporte.periodo}`, pageWidth / 2, y, { align: 'center' })

    y += 15

    // ======= RESUMEN EJECUTIVO =======
    y = drawSectionTitle(doc, 'Resumen Ejecutivo', y, pageWidth)
    y += 8

    // Dibujar métricas según tipo de reporte
    const metricBoxWidth = 52
    const metricBoxHeight = 22
    const metricGap = 8

    switch (datosReporte.tipo) {
      case 'ingresos_mensuales':
        drawMetricBox(
          doc,
          PDF_CONFIG.margin.left,
          y,
          metricBoxWidth,
          metricBoxHeight,
          'Total Ingresos',
          formatMonto(datosReporte.resumen.totalIngresos),
          PDF_CONFIG.colors.success
        )
        drawMetricBox(
          doc,
          PDF_CONFIG.margin.left + metricBoxWidth + metricGap,
          y,
          metricBoxWidth,
          metricBoxHeight,
          'Facturas Pagadas',
          String(datosReporte.resumen.cantidadFacturas),
          PDF_CONFIG.colors.primary
        )
        drawMetricBox(
          doc,
          PDF_CONFIG.margin.left + (metricBoxWidth + metricGap) * 2,
          y,
          metricBoxWidth,
          metricBoxHeight,
          'Promedio Factura',
          formatMonto(datosReporte.resumen.promedioFactura),
          PDF_CONFIG.colors.primary
        )
        y += metricBoxHeight + 10
        break

      case 'ingresos_anuales':
        drawMetricBox(
          doc,
          PDF_CONFIG.margin.left,
          y,
          metricBoxWidth,
          metricBoxHeight,
          'Total Anual',
          formatMonto(datosReporte.resumen.totalAnual),
          PDF_CONFIG.colors.success
        )
        drawMetricBox(
          doc,
          PDF_CONFIG.margin.left + metricBoxWidth + metricGap,
          y,
          metricBoxWidth,
          metricBoxHeight,
          'Promedio Mensual',
          formatMonto(datosReporte.resumen.promedioMensual),
          PDF_CONFIG.colors.primary
        )
        drawMetricBox(
          doc,
          PDF_CONFIG.margin.left + (metricBoxWidth + metricGap) * 2,
          y,
          metricBoxWidth,
          metricBoxHeight,
          'Total Facturas',
          String(datosReporte.resumen.cantidadTotal),
          PDF_CONFIG.colors.primary
        )
        y += metricBoxHeight + 10
        break

      case 'facturas_estado':
        drawMetricBox(
          doc,
          PDF_CONFIG.margin.left,
          y,
          metricBoxWidth,
          metricBoxHeight,
          'Pagadas',
          `${datosReporte.resumen.cantidadPagada}\n${formatMonto(datosReporte.resumen.totalPagado)}`,
          PDF_CONFIG.colors.success
        )
        drawMetricBox(
          doc,
          PDF_CONFIG.margin.left + metricBoxWidth + metricGap,
          y,
          metricBoxWidth,
          metricBoxHeight,
          'Pendientes',
          `${datosReporte.resumen.cantidadPendiente}\n${formatMonto(datosReporte.resumen.totalPendiente)}`,
          PDF_CONFIG.colors.warning
        )
        drawMetricBox(
          doc,
          PDF_CONFIG.margin.left + (metricBoxWidth + metricGap) * 2,
          y,
          metricBoxWidth,
          metricBoxHeight,
          'Vencidas',
          `${datosReporte.resumen.cantidadVencida}\n${formatMonto(datosReporte.resumen.totalVencido)}`,
          PDF_CONFIG.colors.danger
        )
        y += metricBoxHeight + 10
        break

      case 'clientes_morosos':
        drawMetricBox(
          doc,
          PDF_CONFIG.margin.left,
          y,
          metricBoxWidth,
          metricBoxHeight,
          'Clientes Morosos',
          String(datosReporte.resumen.cantidadClientes),
          PDF_CONFIG.colors.danger
        )
        drawMetricBox(
          doc,
          PDF_CONFIG.margin.left + metricBoxWidth + metricGap,
          y,
          metricBoxWidth,
          metricBoxHeight,
          'Total Adeudado',
          formatMonto(datosReporte.resumen.totalAdeudado),
          PDF_CONFIG.colors.danger
        )
        drawMetricBox(
          doc,
          PDF_CONFIG.margin.left + (metricBoxWidth + metricGap) * 2,
          y,
          metricBoxWidth,
          metricBoxHeight,
          'Facturas Vencidas',
          String(datosReporte.resumen.totalFacturas),
          PDF_CONFIG.colors.warning
        )
        y += metricBoxHeight + 10
        break

      case 'consumo_agua':
        drawMetricBox(
          doc,
          PDF_CONFIG.margin.left,
          y,
          38,
          metricBoxHeight,
          'Consumo Total',
          `${datosReporte.resumen.totalConsumo.toFixed(2)} m³`,
          PDF_CONFIG.colors.primary
        )
        drawMetricBox(
          doc,
          PDF_CONFIG.margin.left + 38 + metricGap,
          y,
          38,
          metricBoxHeight,
          'Promedio',
          `${datosReporte.resumen.promedioConsumo.toFixed(2)} m³`,
          PDF_CONFIG.colors.primary
        )
        drawMetricBox(
          doc,
          PDF_CONFIG.margin.left + (38 + metricGap) * 2,
          y,
          38,
          metricBoxHeight,
          'Máximo',
          `${datosReporte.resumen.consumoMaximo} m³`,
          PDF_CONFIG.colors.warning
        )
        drawMetricBox(
          doc,
          PDF_CONFIG.margin.left + (38 + metricGap) * 3,
          y,
          38,
          metricBoxHeight,
          'Mínimo',
          `${datosReporte.resumen.consumoMinimo} m³`,
          PDF_CONFIG.colors.success
        )
        y += metricBoxHeight + 10
        break

      case 'caja_diaria':
        drawMetricBox(
          doc,
          PDF_CONFIG.margin.left,
          y,
          metricBoxWidth,
          metricBoxHeight,
          'Total Ingresos',
          formatMonto(datosReporte.resumen.totalIngresos),
          PDF_CONFIG.colors.success
        )
        drawMetricBox(
          doc,
          PDF_CONFIG.margin.left + metricBoxWidth + metricGap,
          y,
          metricBoxWidth,
          metricBoxHeight,
          'Total Gastos',
          formatMonto(datosReporte.resumen.totalGastos),
          PDF_CONFIG.colors.danger
        )
        drawMetricBox(
          doc,
          PDF_CONFIG.margin.left + (metricBoxWidth + metricGap) * 2,
          y,
          metricBoxWidth,
          metricBoxHeight,
          'Balance',
          formatMonto(datosReporte.resumen.balance),
          datosReporte.resumen.balance >= 0 ? PDF_CONFIG.colors.success : PDF_CONFIG.colors.danger
        )
        y += metricBoxHeight + 10
        break

      case 'lecturas_periodo':
        drawMetricBox(
          doc,
          PDF_CONFIG.margin.left,
          y,
          metricBoxWidth,
          metricBoxHeight,
          'Total Lecturas',
          String(datosReporte.resumen.totalLecturas),
          PDF_CONFIG.colors.primary
        )
        y += metricBoxHeight + 10
        break
    }

    // ======= SECCIÓN DE DATOS DETALLADOS =======
    y += 5
    y = drawSectionTitle(doc, 'Análisis Detallado', y, pageWidth)
    y += 8

    // Generar tablas según tipo de reporte
    switch (datosReporte.tipo) {
      case 'ingresos_mensuales':
        if (datosReporte.datos && datosReporte.datos.length > 0) {
          y = drawTable(
            doc,
            ['Cliente', 'N° Medidor', 'Monto', 'Fecha Pago'],
            datosReporte.datos.map(f => [
              f.usuarios?.nombre_completo || 'N/A',
              f.usuarios?.numero_medidor || 'N/A',
              formatMonto(f.total),
              formatFechaSolo(f.fecha_pago)
            ]),
            y,
            pageWidth,
            pageHeight,
            addNewPage
          )
        }
        break

      case 'ingresos_anuales':
        if (datosReporte.datos && datosReporte.datos.length > 0) {
          y = drawTable(
            doc,
            ['Mes', 'Cantidad Facturas', 'Total Ingresos'],
            datosReporte.datos.map(m => [
              m.nombre,
              String(m.cantidad),
              formatMonto(m.ingresos)
            ]),
            y,
            pageWidth,
            pageHeight,
            addNewPage
          )
        }
        break

      case 'facturas_estado':
        // Tabla de facturas pagadas
        if (datosReporte.datos.pagada && datosReporte.datos.pagada.length > 0) {
          doc.setFontSize(PDF_CONFIG.fontSize.normal)
          doc.setFont(undefined, 'bold')
          doc.setTextColor(...PDF_CONFIG.colors.success)
          doc.text('FACTURAS PAGADAS', PDF_CONFIG.margin.left, y)
          doc.setTextColor(0, 0, 0)
          doc.setFont(undefined, 'normal')
          y += 8

          y = drawTable(
            doc,
            ['Cliente', 'Monto', 'Fecha Emisión', 'Fecha Pago'],
            datosReporte.datos.pagada.slice(0, 15).map(f => [
              f.usuarios?.nombre_completo || 'N/A',
              formatMonto(f.total),
              formatFechaSolo(f.fecha_emision),
              formatFechaSolo(f.fecha_pago)
            ]),
            y,
            pageWidth,
            pageHeight,
            addNewPage
          )
          y += 5
        }

        // Tabla de facturas pendientes
        if (datosReporte.datos.pendiente && datosReporte.datos.pendiente.length > 0) {
          if (y > pageHeight - 80) {
            y = addNewPage()
          }

          doc.setFontSize(PDF_CONFIG.fontSize.normal)
          doc.setFont(undefined, 'bold')
          doc.setTextColor(...PDF_CONFIG.colors.warning)
          doc.text('FACTURAS PENDIENTES', PDF_CONFIG.margin.left, y)
          doc.setTextColor(0, 0, 0)
          doc.setFont(undefined, 'normal')
          y += 8

          y = drawTable(
            doc,
            ['Cliente', 'Monto', 'Fecha Emisión', 'Vencimiento'],
            datosReporte.datos.pendiente.slice(0, 15).map(f => [
              f.usuarios?.nombre_completo || 'N/A',
              formatMonto(f.total),
              formatFechaSolo(f.fecha_emision),
              formatFechaSolo(f.fecha_vencimiento)
            ]),
            y,
            pageWidth,
            pageHeight,
            addNewPage
          )
          y += 5
        }

        // Tabla de facturas vencidas
        if (datosReporte.datos.vencida && datosReporte.datos.vencida.length > 0) {
          if (y > pageHeight - 80) {
            y = addNewPage()
          }

          doc.setFontSize(PDF_CONFIG.fontSize.normal)
          doc.setFont(undefined, 'bold')
          doc.setTextColor(...PDF_CONFIG.colors.danger)
          doc.text('FACTURAS VENCIDAS', PDF_CONFIG.margin.left, y)
          doc.setTextColor(0, 0, 0)
          doc.setFont(undefined, 'normal')
          y += 8

          y = drawTable(
            doc,
            ['Cliente', 'Monto', 'Fecha Vencimiento', 'Días Vencidos'],
            datosReporte.datos.vencida.slice(0, 15).map(f => {
              const diasVencidos = Math.floor(
                (new Date() - new Date(f.fecha_vencimiento)) / (1000 * 60 * 60 * 24)
              )
              return [
                f.usuarios?.nombre_completo || 'N/A',
                formatMonto(f.total),
                formatFechaSolo(f.fecha_vencimiento),
                `${diasVencidos} días`
              ]
            }),
            y,
            pageWidth,
            pageHeight,
            addNewPage
          )
        }
        break

      case 'clientes_morosos':
        if (datosReporte.datos && datosReporte.datos.length > 0) {
          y = drawTable(
            doc,
            ['Cliente', 'Teléfono', 'Facturas Vencidas', 'Total Adeudado'],
            datosReporte.datos.map(c => [
              c.nombre_completo || 'N/A',
              c.telefono || 'N/A',
              String(c.facturas.length),
              formatMonto(c.totalAdeudado)
            ]),
            y,
            pageWidth,
            pageHeight,
            addNewPage
          )
        }
        break

      case 'consumo_agua':
        if (datosReporte.datos && datosReporte.datos.length > 0) {
          y = drawTable(
            doc,
            ['Cliente', 'N° Medidor', 'Consumo (m³)', 'Fecha Lectura'],
            datosReporte.datos.map(l => [
              l.usuarios?.nombre_completo || 'N/A',
              l.usuarios?.numero_medidor || 'N/A',
              String(l.consumo_m3),
              formatFechaSolo(l.fecha_lectura)
            ]),
            y,
            pageWidth,
            pageHeight,
            addNewPage
          )
        }
        break

      case 'caja_diaria':
        if (datosReporte.datos && datosReporte.datos.length > 0) {
          y = drawTable(
            doc,
            ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto'],
            datosReporte.datos.map(t => [
              formatFechaSolo(t.created_at),
              t.tipo === 'ingreso' ? 'Ingreso' : 'Gasto',
              t.categoria?.nombre || 'N/A',
              t.descripcion || 'N/A',
              formatMonto(t.monto)
            ]),
            y,
            pageWidth,
            pageHeight,
            addNewPage
          )
        }
        break

      case 'lecturas_periodo':
        if (datosReporte.datos && datosReporte.datos.length > 0) {
          y = drawTable(
            doc,
            ['Cliente', 'N° Medidor', 'Lectura Anterior', 'Lectura Actual', 'Consumo (m³)', 'Fecha'],
            datosReporte.datos.map(l => [
              l.usuarios?.nombre_completo || 'N/A',
              l.usuarios?.numero_medidor || 'N/A',
              String(l.lectura_anterior),
              String(l.lectura_actual),
              String(l.consumo_m3),
              formatFechaSolo(l.fecha_lectura)
            ]),
            y,
            pageWidth,
            pageHeight,
            addNewPage
          )
        }
        break
    }

    // ======= AGREGAR FOOTERS A TODAS LAS PÁGINAS =======
    const totalPages = doc.internal.getNumberOfPages()
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i)
      drawPageFooter(doc, i, totalPages, pageWidth, pageHeight)
    }

    // ======= DESCARGAR PDF =======
    const nombreArchivo = `reporte_${datosReporte.tipo}_${new Date().getTime()}.pdf`
    doc.save(nombreArchivo)
  }

  // ================================================================
  // UTILIDADES
  // ================================================================

  const mostrarMensaje = (texto, tipo) => {
    setMensaje({ texto, tipo })
    setTimeout(() => setMensaje(null), 5000)
  }

  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0
    }).format(monto || 0)
  }

  const formatFechaSolo = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-PY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const reporteSeleccionado = tiposReportes.find(r => r.id === tipoReporte)

  return (
    <div className="page-container animate-fade-in">
      <div className="page-header">
        <div>
          <h2>Reportes del Sistema</h2>
          <p className="page-subtitle">Genera informes detallados y exporta a PDF</p>
        </div>
      </div>

      {mensaje && (
        <div className={`alert alert-${mensaje.tipo}`}>
          {mensaje.tipo === 'success' && (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
          )}
          {mensaje.tipo === 'error' && (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
          )}
          <span>{mensaje.texto}</span>
        </div>
      )}

      {/* Selector de Tipo de Reporte */}
      <div className="reportes-selector">
        <h3>Selecciona el Tipo de Reporte</h3>
        <div className="reportes-grid">
          {tiposReportes.map(tipo => (
            <button
              key={tipo.id}
              className={`reporte-card ${tipoReporte === tipo.id ? 'reporte-card-active' : ''}`}
              onClick={() => setTipoReporte(tipo.id)}
            >
              <span className="reporte-icono">{tipo.icono}</span>
              <strong className="reporte-nombre">{tipo.nombre}</strong>
              <p className="reporte-descripcion">{tipo.descripcion}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Filtros de Fecha */}
      <div className="reportes-filtros">
        <h3>Filtros</h3>
        <div className="filtros-row">
          <div className="filtro-group">
            <label>Fecha Desde</label>
            <input
              type="date"
              value={fechaDesde}
              onChange={(e) => setFechaDesde(e.target.value)}
              className="filtro-input"
            />
          </div>
          <div className="filtro-group">
            <label>Fecha Hasta</label>
            <input
              type="date"
              value={fechaHasta}
              onChange={(e) => setFechaHasta(e.target.value)}
              className="filtro-input"
            />
          </div>
        </div>

        <button
          className="btn-primary btn-large"
          onClick={generarReporte}
          disabled={loading || generando}
        >
          {generando ? (
            <>
              <span className="spinner"></span>
              Generando Reporte...
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="17 10 12 15 7 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Generar Reporte
            </>
          )}
        </button>
      </div>

      {/* Vista Previa del Reporte */}
      {datosReporte && (
        <div className="reportes-preview">
          <div className="preview-header">
            <h3>{datosReporte.titulo}</h3>
            <button className="btn-secondary" onClick={descargarPDF}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                <polyline points="7 10 12 15 17 10"></polyline>
                <line x1="12" y1="15" x2="12" y2="3"></line>
              </svg>
              Descargar PDF
            </button>
          </div>

          <div className="preview-periodo">
            <strong>Período:</strong> {datosReporte.periodo}
          </div>

          {/* Resumen Visual */}
          <div className="preview-resumen">
            {datosReporte.tipo === 'ingresos_mensuales' && (
              <>
                <div className="resumen-stat">
                  <span className="stat-label">Total Ingresos</span>
                  <span className="stat-value stat-value-success">
                    {formatMonto(datosReporte.resumen.totalIngresos)}
                  </span>
                </div>
                <div className="resumen-stat">
                  <span className="stat-label">Facturas Pagadas</span>
                  <span className="stat-value">{datosReporte.resumen.cantidadFacturas}</span>
                </div>
                <div className="resumen-stat">
                  <span className="stat-label">Promedio</span>
                  <span className="stat-value">{formatMonto(datosReporte.resumen.promedioFactura)}</span>
                </div>
              </>
            )}

            {datosReporte.tipo === 'ingresos_anuales' && (
              <>
                <div className="resumen-stat">
                  <span className="stat-label">Total Anual</span>
                  <span className="stat-value stat-value-success">
                    {formatMonto(datosReporte.resumen.totalAnual)}
                  </span>
                </div>
                <div className="resumen-stat">
                  <span className="stat-label">Promedio Mensual</span>
                  <span className="stat-value">{formatMonto(datosReporte.resumen.promedioMensual)}</span>
                </div>
                <div className="resumen-stat">
                  <span className="stat-label">Total Facturas</span>
                  <span className="stat-value">{datosReporte.resumen.cantidadTotal}</span>
                </div>
              </>
            )}

            {datosReporte.tipo === 'facturas_estado' && (
              <>
                <div className="resumen-stat">
                  <span className="stat-label">Pagadas</span>
                  <span className="stat-value stat-value-success">
                    {datosReporte.resumen.cantidadPagada} - {formatMonto(datosReporte.resumen.totalPagado)}
                  </span>
                </div>
                <div className="resumen-stat">
                  <span className="stat-label">Pendientes</span>
                  <span className="stat-value stat-value-warning">
                    {datosReporte.resumen.cantidadPendiente} - {formatMonto(datosReporte.resumen.totalPendiente)}
                  </span>
                </div>
                <div className="resumen-stat">
                  <span className="stat-label">Vencidas</span>
                  <span className="stat-value stat-value-danger">
                    {datosReporte.resumen.cantidadVencida} - {formatMonto(datosReporte.resumen.totalVencido)}
                  </span>
                </div>
              </>
            )}

            {datosReporte.tipo === 'clientes_morosos' && (
              <>
                <div className="resumen-stat">
                  <span className="stat-label">Clientes con Deuda</span>
                  <span className="stat-value stat-value-danger">
                    {datosReporte.resumen.cantidadClientes}
                  </span>
                </div>
                <div className="resumen-stat">
                  <span className="stat-label">Total Adeudado</span>
                  <span className="stat-value stat-value-danger">
                    {formatMonto(datosReporte.resumen.totalAdeudado)}
                  </span>
                </div>
                <div className="resumen-stat">
                  <span className="stat-label">Facturas Vencidas</span>
                  <span className="stat-value">{datosReporte.resumen.totalFacturas}</span>
                </div>
              </>
            )}

            {datosReporte.tipo === 'consumo_agua' && (
              <>
                <div className="resumen-stat">
                  <span className="stat-label">Consumo Total</span>
                  <span className="stat-value stat-value-primary">
                    {datosReporte.resumen.totalConsumo.toFixed(2)} m³
                  </span>
                </div>
                <div className="resumen-stat">
                  <span className="stat-label">Promedio</span>
                  <span className="stat-value">{datosReporte.resumen.promedioConsumo.toFixed(2)} m³</span>
                </div>
                <div className="resumen-stat">
                  <span className="stat-label">Máximo</span>
                  <span className="stat-value">{datosReporte.resumen.consumoMaximo} m³</span>
                </div>
                <div className="resumen-stat">
                  <span className="stat-label">Mínimo</span>
                  <span className="stat-value">{datosReporte.resumen.consumoMinimo} m³</span>
                </div>
              </>
            )}

            {datosReporte.tipo === 'caja_diaria' && (
              <>
                <div className="resumen-stat">
                  <span className="stat-label">Ingresos</span>
                  <span className="stat-value stat-value-success">
                    {formatMonto(datosReporte.resumen.totalIngresos)}
                  </span>
                </div>
                <div className="resumen-stat">
                  <span className="stat-label">Gastos</span>
                  <span className="stat-value stat-value-danger">
                    {formatMonto(datosReporte.resumen.totalGastos)}
                  </span>
                </div>
                <div className="resumen-stat">
                  <span className="stat-label">Balance</span>
                  <span className={`stat-value ${datosReporte.resumen.balance >= 0 ? 'stat-value-success' : 'stat-value-danger'}`}>
                    {formatMonto(datosReporte.resumen.balance)}
                  </span>
                </div>
              </>
            )}

            {datosReporte.tipo === 'lecturas_periodo' && (
              <div className="resumen-stat">
                <span className="stat-label">Total Lecturas</span>
                <span className="stat-value stat-value-primary">
                  {datosReporte.resumen.totalLecturas}
                </span>
              </div>
            )}
          </div>

          {/* Tabla de Datos */}
          <div className="preview-datos">
            <p className="preview-nota">
              Los datos detallados se incluirán en el PDF descargable
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reportes
