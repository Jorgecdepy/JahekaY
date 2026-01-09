import { useState, useEffect } from 'react'
import { useCliente } from '../../contexts/ClienteAuthContext'
import { supabase } from '../../config/supabaseClient'
import jsPDF from 'jspdf'
import './HistorialPagos.css'

export default function HistorialPagos() {
  const { cliente } = useCliente()
  const [pagos, setPagos] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos')
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [descargando, setDescargando] = useState(false)

  const [resumen, setResumen] = useState({
    total_pagos: 0,
    monto_total: 0,
    promedio_mensual: 0,
    ultimo_pago: null
  })

  useEffect(() => {
    cargarPagos()
  }, [cliente.id, filtroPeriodo, fechaInicio, fechaFin])

  const cargarPagos = async () => {
    setLoading(true)

    let query = supabase
      .from('facturas')
      .select('*')
      .eq('cliente_id', cliente.id)
      .eq('estado', 'pagada')
      .not('fecha_pago', 'is', null)
      .order('fecha_pago', { ascending: false })

    // Aplicar filtro de período
    let fechaInicioCalc, fechaFinCalc

    if (filtroPeriodo !== 'todos' && filtroPeriodo !== 'personalizado') {
      const hoy = new Date()

      switch (filtroPeriodo) {
        case 'mes_actual':
          fechaInicioCalc = new Date(hoy.getFullYear(), hoy.getMonth(), 1)
          fechaFinCalc = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0)
          break
        case 'ultimos_3_meses':
          fechaInicioCalc = new Date(hoy.getFullYear(), hoy.getMonth() - 3, 1)
          fechaFinCalc = hoy
          break
        case 'ultimos_6_meses':
          fechaInicioCalc = new Date(hoy.getFullYear(), hoy.getMonth() - 6, 1)
          fechaFinCalc = hoy
          break
        case 'este_año':
          fechaInicioCalc = new Date(hoy.getFullYear(), 0, 1)
          fechaFinCalc = hoy
          break
        case 'año_pasado':
          fechaInicioCalc = new Date(hoy.getFullYear() - 1, 0, 1)
          fechaFinCalc = new Date(hoy.getFullYear() - 1, 11, 31)
          break
      }
    } else if (filtroPeriodo === 'personalizado' && fechaInicio && fechaFin) {
      fechaInicioCalc = new Date(fechaInicio)
      fechaFinCalc = new Date(fechaFin)
    }

    if (fechaInicioCalc && fechaFinCalc) {
      query = query
        .gte('fecha_pago', fechaInicioCalc.toISOString())
        .lte('fecha_pago', fechaFinCalc.toISOString())
    }

    const { data, error } = await query

    if (!error && data) {
      setPagos(data)
      calcularResumen(data)
    }

    setLoading(false)
  }

  const calcularResumen = (pagos) => {
    if (pagos.length === 0) {
      setResumen({
        total_pagos: 0,
        monto_total: 0,
        promedio_mensual: 0,
        ultimo_pago: null
      })
      return
    }

    const montoTotal = pagos.reduce((sum, pago) => sum + pago.total, 0)
    const ultimoPago = pagos[0] // Ya está ordenado desc por fecha_pago

    // Calcular promedio mensual basado en el período
    let mesesEnPeriodo = 1
    if (pagos.length > 1) {
      const fechaInicioPeriodo = new Date(pagos[pagos.length - 1].fecha_pago)
      const fechaFinPeriodo = new Date(pagos[0].fecha_pago)
      const diffMeses = (fechaFinPeriodo.getFullYear() - fechaInicioPeriodo.getFullYear()) * 12 +
                        (fechaFinPeriodo.getMonth() - fechaInicioPeriodo.getMonth()) + 1
      mesesEnPeriodo = diffMeses || 1
    }

    setResumen({
      total_pagos: pagos.length,
      monto_total: montoTotal,
      promedio_mensual: montoTotal / mesesEnPeriodo,
      ultimo_pago: ultimoPago
    })
  }

  const formatearFecha = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    })
  }

  const formatearFechaCompleta = (fecha) => {
    return new Date(fecha).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatearMoneda = (valor) => {
    return new Intl.NumberFormat('es-DO', {
      style: 'currency',
      currency: 'DOP'
    }).format(valor)
  }

  const agruparPagosPorMes = () => {
    const grupos = {}

    pagos.forEach(pago => {
      const fecha = new Date(pago.fecha_pago)
      const mes = fecha.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })

      if (!grupos[mes]) {
        grupos[mes] = {
          pagos: [],
          total: 0
        }
      }

      grupos[mes].pagos.push(pago)
      grupos[mes].total += pago.total
    })

    return grupos
  }

  const exportarHistorialPDF = async () => {
    if (pagos.length === 0) {
      alert('No hay pagos para exportar')
      return
    }

    setDescargando(true)

    try {
      const doc = new jsPDF()

      // Configurar colores
      const colorPrimario = [102, 126, 234]
      const colorTexto = [51, 51, 51]
      const colorGris = [136, 136, 136]

      // Header
      doc.setFillColor(colorPrimario[0], colorPrimario[1], colorPrimario[2])
      doc.rect(0, 0, 210, 35, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(22)
      doc.setFont('helvetica', 'bold')
      doc.text('Historial de Pagos', 20, 18)

      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text('JahekaY - Sistema de Gestión de Agua Potable', 20, 26)

      // Información del Cliente
      let yPos = 50

      doc.setTextColor(colorTexto[0], colorTexto[1], colorTexto[2])
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('INFORMACIÓN DEL CLIENTE', 20, yPos)

      yPos += 7
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Cliente: ${cliente.nombre_completo}`, 20, yPos)
      yPos += 6
      doc.text(`Medidor: ${cliente.numero_medidor}`, 20, yPos)
      yPos += 6
      doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES')}`, 20, yPos)

      // Resumen
      yPos += 12
      doc.setFillColor(245, 247, 250)
      doc.rect(20, yPos - 6, 170, 35, 'F')

      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('RESUMEN DEL PERÍODO', 25, yPos)

      yPos += 8
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(`Total de Pagos: ${resumen.total_pagos}`, 25, yPos)
      yPos += 6
      doc.text(`Monto Total Pagado: ${formatearMoneda(resumen.monto_total)}`, 25, yPos)
      yPos += 6
      doc.text(`Promedio Mensual: ${formatearMoneda(resumen.promedio_mensual)}`, 25, yPos)
      yPos += 6
      if (resumen.ultimo_pago) {
        doc.text(`Último Pago: ${formatearFecha(resumen.ultimo_pago.fecha_pago)}`, 25, yPos)
      }

      // Tabla de Pagos
      yPos += 15
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('DETALLE DE PAGOS', 20, yPos)

      yPos += 8

      // Headers de la tabla
      doc.setFillColor(colorPrimario[0], colorPrimario[1], colorPrimario[2])
      doc.rect(20, yPos - 6, 170, 8, 'F')

      doc.setTextColor(255, 255, 255)
      doc.setFontSize(9)
      doc.setFont('helvetica', 'bold')
      doc.text('Fecha Pago', 25, yPos)
      doc.text('Período', 65, yPos)
      doc.text('Concepto', 100, yPos)
      doc.text('Monto', 165, yPos, { align: 'right' })

      yPos += 8

      // Filas de la tabla
      doc.setTextColor(colorTexto[0], colorTexto[1], colorTexto[2])
      doc.setFont('helvetica', 'normal')

      pagos.forEach((pago, index) => {
        // Verificar si necesitamos nueva página
        if (yPos > 270) {
          doc.addPage()
          yPos = 20
        }

        // Fondo alternado
        if (index % 2 === 0) {
          doc.setFillColor(250, 250, 250)
          doc.rect(20, yPos - 6, 170, 7, 'F')
        }

        doc.text(formatearFecha(pago.fecha_pago), 25, yPos)
        doc.text(`${pago.periodo_mes}/${pago.periodo_año}`, 65, yPos)
        doc.text('Factura de Agua', 100, yPos)
        doc.text(formatearMoneda(pago.total), 185, yPos, { align: 'right' })

        yPos += 7
      })

      // Total al final
      yPos += 5
      doc.setDrawColor(colorGris[0], colorGris[1], colorGris[2])
      doc.line(20, yPos, 190, yPos)

      yPos += 8
      doc.setFontSize(11)
      doc.setFont('helvetica', 'bold')
      doc.text('TOTAL PAGADO:', 25, yPos)
      doc.setTextColor(colorPrimario[0], colorPrimario[1], colorPrimario[2])
      doc.text(formatearMoneda(resumen.monto_total), 185, yPos, { align: 'right' })

      // Footer
      const totalPages = doc.internal.pages.length - 1
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i)
        doc.setTextColor(colorGris[0], colorGris[1], colorGris[2])
        doc.setFontSize(8)
        doc.setFont('helvetica', 'normal')
        doc.text(`Página ${i} de ${totalPages}`, 105, 285, { align: 'center' })
        doc.text('JahekaY - Gracias por su pago puntual', 105, 290, { align: 'center' })
      }

      // Guardar PDF
      const nombreArchivo = `Historial_Pagos_${cliente.numero_medidor}_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(nombreArchivo)

    } catch (error) {
      console.error('Error al generar PDF:', error)
      alert('Error al generar el PDF. Por favor intenta nuevamente.')
    }

    setDescargando(false)
  }

  const pagosPorMes = agruparPagosPorMes()

  return (
    <div className="historial-pagos-container">
      {/* Header */}
      <div className="historial-header">
        <div className="header-content">
          <h1>Historial de Pagos</h1>
          <p>Consulta todos tus pagos realizados</p>
        </div>
        <button
          className="btn-exportar"
          onClick={exportarHistorialPDF}
          disabled={descargando || pagos.length === 0}
        >
          <span className="btn-icon">📥</span>
          {descargando ? 'Generando...' : 'Exportar PDF'}
        </button>
      </div>

      {/* Resumen */}
      <div className="resumen-container">
        <div className="resumen-cards">
          <div className="resumen-card">
            <div className="resumen-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              💳
            </div>
            <div className="resumen-info">
              <p className="resumen-label">Total de Pagos</p>
              <p className="resumen-valor">{resumen.total_pagos}</p>
            </div>
          </div>

          <div className="resumen-card">
            <div className="resumen-icon" style={{ background: 'linear-gradient(135deg, #4caf50 0%, #8bc34a 100%)' }}>
              💰
            </div>
            <div className="resumen-info">
              <p className="resumen-label">Monto Total</p>
              <p className="resumen-valor">{formatearMoneda(resumen.monto_total)}</p>
            </div>
          </div>

          <div className="resumen-card">
            <div className="resumen-icon" style={{ background: 'linear-gradient(135deg, #2196f3 0%, #03a9f4 100%)' }}>
              📊
            </div>
            <div className="resumen-info">
              <p className="resumen-label">Promedio Mensual</p>
              <p className="resumen-valor">{formatearMoneda(resumen.promedio_mensual)}</p>
            </div>
          </div>

          <div className="resumen-card">
            <div className="resumen-icon" style={{ background: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)' }}>
              📅
            </div>
            <div className="resumen-info">
              <p className="resumen-label">Último Pago</p>
              <p className="resumen-valor">
                {resumen.ultimo_pago ? formatearFecha(resumen.ultimo_pago.fecha_pago) : 'N/A'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="filtros-container">
        <div className="filtros-row">
          <div className="filtro-group">
            <label>Período:</label>
            <select value={filtroPeriodo} onChange={(e) => setFiltroPeriodo(e.target.value)}>
              <option value="todos">Todos los pagos</option>
              <option value="mes_actual">Mes Actual</option>
              <option value="ultimos_3_meses">Últimos 3 Meses</option>
              <option value="ultimos_6_meses">Últimos 6 Meses</option>
              <option value="este_año">Este Año</option>
              <option value="año_pasado">Año Pasado</option>
              <option value="personalizado">Personalizado</option>
            </select>
          </div>

          {filtroPeriodo === 'personalizado' && (
            <>
              <div className="filtro-group">
                <label>Desde:</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                />
              </div>

              <div className="filtro-group">
                <label>Hasta:</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* Contenido */}
      <div className="pagos-content">
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Cargando historial...</p>
          </div>
        ) : pagos.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">💳</div>
            <h3>No hay pagos registrados</h3>
            <p>No se encontraron pagos en el período seleccionado</p>
          </div>
        ) : (
          <div className="pagos-agrupados">
            {Object.entries(pagosPorMes).map(([mes, grupo]) => (
              <div key={mes} className="grupo-mes">
                <div className="grupo-header">
                  <h3>{mes}</h3>
                  <span className="grupo-total">
                    {grupo.pagos.length} {grupo.pagos.length === 1 ? 'pago' : 'pagos'} · {formatearMoneda(grupo.total)}
                  </span>
                </div>

                <div className="pagos-lista">
                  {grupo.pagos.map((pago) => (
                    <div key={pago.id} className="pago-card">
                      <div className="pago-fecha-badge">
                        <span className="dia">
                          {new Date(pago.fecha_pago).toLocaleDateString('es-ES', { day: '2-digit' })}
                        </span>
                        <span className="mes-corto">
                          {new Date(pago.fecha_pago).toLocaleDateString('es-ES', { month: 'short' })}
                        </span>
                      </div>

                      <div className="pago-info">
                        <h4>Factura de Agua</h4>
                        <p className="pago-detalle">
                          Período: {pago.periodo_mes}/{pago.periodo_año}
                        </p>
                        <p className="pago-fecha-completa">
                          {formatearFechaCompleta(pago.fecha_pago)}
                        </p>
                      </div>

                      <div className="pago-monto">
                        <span className="monto-valor">{formatearMoneda(pago.total)}</span>
                        <span className="estado-pagado">✓ Pagado</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
