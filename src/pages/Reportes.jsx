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
  // GENERACIÓN DE PDF
  // ================================================================

  const descargarPDF = () => {
    if (!datosReporte) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.width
    let y = 20

    // Encabezado
    doc.setFontSize(18)
    doc.text('Sistema JahekaY', pageWidth / 2, y, { align: 'center' })
    y += 10
    doc.setFontSize(14)
    doc.text(datosReporte.titulo, pageWidth / 2, y, { align: 'center' })
    y += 8
    doc.setFontSize(11)
    doc.text(datosReporte.periodo, pageWidth / 2, y, { align: 'center' })
    y += 10
    doc.line(20, y, pageWidth - 20, y)
    y += 10

    // Resumen según tipo de reporte
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text('Resumen', 20, y)
    doc.setFont(undefined, 'normal')
    y += 8

    switch (datosReporte.tipo) {
      case 'ingresos_mensuales':
        doc.setFontSize(10)
        doc.text(`Total Ingresos: ${formatMonto(datosReporte.resumen.totalIngresos)}`, 20, y)
        y += 6
        doc.text(`Cantidad de Facturas: ${datosReporte.resumen.cantidadFacturas}`, 20, y)
        y += 6
        doc.text(`Promedio por Factura: ${formatMonto(datosReporte.resumen.promedioFactura)}`, 20, y)
        y += 10
        break

      case 'ingresos_anuales':
        doc.setFontSize(10)
        doc.text(`Total Anual: ${formatMonto(datosReporte.resumen.totalAnual)}`, 20, y)
        y += 6
        doc.text(`Promedio Mensual: ${formatMonto(datosReporte.resumen.promedioMensual)}`, 20, y)
        y += 6
        doc.text(`Total Facturas: ${datosReporte.resumen.cantidadTotal}`, 20, y)
        y += 10
        break

      case 'facturas_estado':
        doc.setFontSize(10)
        doc.text(`Pagadas: ${datosReporte.resumen.cantidadPagada} (${formatMonto(datosReporte.resumen.totalPagado)})`, 20, y)
        y += 6
        doc.text(`Pendientes: ${datosReporte.resumen.cantidadPendiente} (${formatMonto(datosReporte.resumen.totalPendiente)})`, 20, y)
        y += 6
        doc.text(`Vencidas: ${datosReporte.resumen.cantidadVencida} (${formatMonto(datosReporte.resumen.totalVencido)})`, 20, y)
        y += 10
        break

      case 'clientes_morosos':
        doc.setFontSize(10)
        doc.text(`Clientes con Deuda: ${datosReporte.resumen.cantidadClientes}`, 20, y)
        y += 6
        doc.text(`Total Adeudado: ${formatMonto(datosReporte.resumen.totalAdeudado)}`, 20, y)
        y += 6
        doc.text(`Facturas Vencidas: ${datosReporte.resumen.totalFacturas}`, 20, y)
        y += 10
        break

      case 'consumo_agua':
        doc.setFontSize(10)
        doc.text(`Consumo Total: ${datosReporte.resumen.totalConsumo.toFixed(2)} m³`, 20, y)
        y += 6
        doc.text(`Promedio: ${datosReporte.resumen.promedioConsumo.toFixed(2)} m³`, 20, y)
        y += 6
        doc.text(`Máximo: ${datosReporte.resumen.consumoMaximo} m³`, 20, y)
        y += 6
        doc.text(`Mínimo: ${datosReporte.resumen.consumoMinimo} m³`, 20, y)
        y += 10
        break

      case 'caja_diaria':
        doc.setFontSize(10)
        doc.text(`Total Ingresos: ${formatMonto(datosReporte.resumen.totalIngresos)}`, 20, y)
        y += 6
        doc.text(`Total Gastos: ${formatMonto(datosReporte.resumen.totalGastos)}`, 20, y)
        y += 6
        doc.setFont(undefined, 'bold')
        doc.text(`Balance: ${formatMonto(datosReporte.resumen.balance)}`, 20, y)
        doc.setFont(undefined, 'normal')
        y += 10
        break

      case 'lecturas_periodo':
        doc.setFontSize(10)
        doc.text(`Total Lecturas: ${datosReporte.resumen.totalLecturas}`, 20, y)
        y += 10
        break
    }

    // Datos detallados (primeras líneas)
    doc.setFontSize(12)
    doc.setFont(undefined, 'bold')
    doc.text('Detalle', 20, y)
    doc.setFont(undefined, 'normal')
    y += 8

    doc.setFontSize(9)
    const maxLineas = 20
    let contador = 0

    if (Array.isArray(datosReporte.datos)) {
      datosReporte.datos.slice(0, maxLineas).forEach(item => {
        if (y > 270) {
          doc.addPage()
          y = 20
        }

        let linea = ''
        switch (datosReporte.tipo) {
          case 'ingresos_mensuales':
            linea = `${item.usuarios?.nombre_completo} - ${formatMonto(item.total)} (${formatFechaSolo(item.fecha_pago)})`
            break
          case 'ingresos_anuales':
            linea = `${item.nombre}: ${formatMonto(item.ingresos)} (${item.cantidad} facturas)`
            break
          case 'consumo_agua':
            linea = `${item.usuarios?.nombre_completo} - ${item.consumo_m3} m³`
            break
          case 'caja_diaria':
            linea = `${item.tipo === 'ingreso' ? '+' : '-'} ${formatMonto(item.monto)} - ${item.descripcion}`
            break
          case 'lecturas_periodo':
            linea = `${item.usuarios?.nombre_completo} - ${item.consumo_m3} m³ (${formatFechaSolo(item.fecha_lectura)})`
            break
        }

        if (linea) {
          doc.text(`• ${linea}`, 25, y)
          y += 5
          contador++
        }
      })
    }

    if (datosReporte.tipo === 'clientes_morosos' && datosReporte.datos) {
      datosReporte.datos.slice(0, maxLineas).forEach(cliente => {
        if (y > 270) {
          doc.addPage()
          y = 20
        }
        doc.text(`• ${cliente.nombre_completo} - ${formatMonto(cliente.totalAdeudado)} (${cliente.facturas.length} facturas)`, 25, y)
        y += 5
      })
    }

    if (datosReporte.tipo === 'facturas_estado') {
      ['pagada', 'pendiente', 'vencida'].forEach(estado => {
        if (y > 250) {
          doc.addPage()
          y = 20
        }
        doc.setFont(undefined, 'bold')
        doc.text(`${estado.toUpperCase()}:`, 20, y)
        doc.setFont(undefined, 'normal')
        y += 6

        datosReporte.datos[estado]?.slice(0, 5).forEach(f => {
          if (y > 270) {
            doc.addPage()
            y = 20
          }
          doc.text(`  • ${f.usuarios?.nombre_completo} - ${formatMonto(f.total)}`, 25, y)
          y += 5
        })
        y += 3
      })
    }

    // Footer
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.text(
        `Generado: ${new Date().toLocaleString('es-PY')} | Página ${i} de ${pageCount}`,
        pageWidth / 2,
        290,
        { align: 'center' }
      )
    }

    // Descargar
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
