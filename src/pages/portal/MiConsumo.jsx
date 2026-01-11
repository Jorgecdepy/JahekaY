import { useState, useEffect, useCallback } from 'react'
import { useCliente } from '../../contexts/ClienteAuthContext'
import { supabase } from '../../services/supabase'
import './MiConsumo.css'

export default function MiConsumo() {
  const { cliente } = useCliente()
  const [lecturas, setLecturas] = useState([])
  const [loading, setLoading] = useState(true)
  const [periodo, setPeriodo] = useState('6')
  const [vistaActual, setVistaActual] = useState('grafico') // 'grafico' o 'tabla'

  const [estadisticas, setEstadisticas] = useState({
    consumo_promedio: 0,
    consumo_actual: 0,
    tendencia: 0, // porcentaje de cambio
    consumo_mayor: 0,
    consumo_menor: 0,
    mes_mayor_consumo: '',
    mes_menor_consumo: ''
  })

  const calcularEstadisticas = useCallback((lecturas) => {
    if (lecturas.length === 0) {
      setEstadisticas({
        consumo_promedio: 0,
        consumo_actual: 0,
        tendencia: 0,
        consumo_mayor: 0,
        consumo_menor: 0,
        mes_mayor_consumo: '',
        mes_menor_consumo: ''
      })
      return
    }

    const consumos = lecturas.map(l => l.consumo)
    const consumoPromedio = consumos.reduce((a, b) => a + b, 0) / consumos.length
    const consumoActual = consumos[consumos.length - 1] || 0
    const consumoAnterior = consumos.length > 1 ? consumos[consumos.length - 2] : consumoActual
    const tendencia = consumoAnterior > 0 ? ((consumoActual - consumoAnterior) / consumoAnterior) * 100 : 0

    const maxConsumo = Math.max(...consumos)
    const minConsumo = Math.min(...consumos)
    const lecturaMax = lecturas.find(l => l.consumo === maxConsumo)
    const lecturaMin = lecturas.find(l => l.consumo === minConsumo)

    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                   'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

    setEstadisticas({
      consumo_promedio: consumoPromedio,
      consumo_actual: consumoActual,
      tendencia: tendencia,
      consumo_mayor: maxConsumo,
      consumo_menor: minConsumo,
      mes_mayor_consumo: lecturaMax ? meses[lecturaMax.fecha.getMonth()] : '',
      mes_menor_consumo: lecturaMin ? meses[lecturaMin.fecha.getMonth()] : ''
    })
  }, [])

  const cargarLecturas = useCallback(async () => {
    setLoading(true)

    const mesesAtras = parseInt(periodo)
    const fechaLimite = new Date()
    fechaLimite.setMonth(fechaLimite.getMonth() - mesesAtras)

    // Usar RPC para obtener lecturas (funciona sin sesión de Supabase Auth)
    const { data, error } = await supabase.rpc('obtener_lecturas_cliente', {
      p_cliente_id: cliente.id,
      p_limite: 100
    })

    if (!error && data && data.length > 0) {
      // Filtrar por fecha y ordenar ascendente
      const lecturasFiltradas = data
        .filter(l => new Date(l.fecha_lectura) >= fechaLimite)
        .sort((a, b) => new Date(a.fecha_lectura) - new Date(b.fecha_lectura))

      if (lecturasFiltradas.length > 0) {
        // Calcular consumo para cada lectura
        const lecturasConConsumo = []

        for (let i = 1; i < lecturasFiltradas.length; i++) {
          const lecturaAnterior = lecturasFiltradas[i - 1]
          const lecturaActual = lecturasFiltradas[i]
          // Usar lectura_actual y lectura_anterior si existen, o calcular diferencia
          const consumo = lecturaActual.consumo_m3 ||
            ((lecturaActual.lectura_actual || 0) - (lecturaAnterior.lectura_actual || 0))

          lecturasConConsumo.push({
            ...lecturaActual,
            lectura_anterior: lecturaAnterior.lectura_actual || 0,
            lectura: lecturaActual.lectura_actual || 0,
            consumo: consumo >= 0 ? consumo : 0,
            fecha: new Date(lecturaActual.fecha_lectura)
          })
        }

        setLecturas(lecturasConConsumo)
        calcularEstadisticas(lecturasConConsumo)
      } else {
        setLecturas([])
        setEstadisticas({
          consumo_promedio: 0,
          consumo_actual: 0,
          tendencia: 0,
          consumo_mayor: 0,
          consumo_menor: 0,
          mes_mayor_consumo: '',
          mes_menor_consumo: ''
        })
      }
    } else {
      setLecturas([])
      setEstadisticas({
        consumo_promedio: 0,
        consumo_actual: 0,
        tendencia: 0,
        consumo_mayor: 0,
        consumo_menor: 0,
        mes_mayor_consumo: '',
        mes_menor_consumo: ''
      })
    }

    setLoading(false)
  }, [cliente?.id, periodo, calcularEstadisticas])

  useEffect(() => {
    if (!cliente?.id) return
    cargarLecturas()
  }, [cliente?.id, periodo, cargarLecturas])

  const formatearFecha = (fecha) => {
    return fecha.toLocaleDateString('es-ES', {
      month: 'short',
      year: 'numeric'
    })
  }

  const formatearFechaCompleta = (fecha) => {
    return fecha.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    })
  }

  const getTendenciaIcono = () => {
    if (estadisticas.tendencia > 5) return '📈'
    if (estadisticas.tendencia < -5) return '📉'
    return '➡️'
  }

  const getTendenciaColor = () => {
    if (estadisticas.tendencia > 5) return '#f44336'
    if (estadisticas.tendencia < -5) return '#4caf50'
    return '#2196f3'
  }

  const getTendenciaTexto = () => {
    if (estadisticas.tendencia > 5) return 'Aumentó'
    if (estadisticas.tendencia < -5) return 'Disminuyó'
    return 'Se mantuvo'
  }

  // Datos para el gráfico
  const maxConsumo = lecturas.length > 0 ? Math.max(...lecturas.map(l => l.consumo), 1) : 1

  return (
    <div className="mi-consumo-container">
      {/* Header */}
      <div className="consumo-header">
        <div className="header-content">
          <h1>Mi Consumo</h1>
          <p>Visualiza tu historial de consumo de agua</p>
        </div>

        <div className="header-controls">
          <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="periodo-select">
            <option value="3">Últimos 3 meses</option>
            <option value="6">Últimos 6 meses</option>
            <option value="12">Último año</option>
            <option value="24">Últimos 2 años</option>
          </select>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="estadisticas-container">
        <div className="estadisticas-cards">
          <div className="estadistica-card">
            <div className="estadistica-icon" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
              💧
            </div>
            <div className="estadistica-info">
              <p className="estadistica-label">Consumo Promedio</p>
              <p className="estadistica-valor">{estadisticas.consumo_promedio.toFixed(1)} m³</p>
              <p className="estadistica-sublabel">por mes</p>
            </div>
          </div>

          <div className="estadistica-card">
            <div className="estadistica-icon" style={{ background: 'linear-gradient(135deg, #2196f3 0%, #03a9f4 100%)' }}>
              📊
            </div>
            <div className="estadistica-info">
              <p className="estadistica-label">Consumo Actual</p>
              <p className="estadistica-valor">{estadisticas.consumo_actual.toFixed(1)} m³</p>
              <p className="estadistica-sublabel">último mes</p>
            </div>
          </div>

          <div className="estadistica-card">
            <div className="estadistica-icon" style={{ background: getTendenciaColor() }}>
              {getTendenciaIcono()}
            </div>
            <div className="estadistica-info">
              <p className="estadistica-label">Tendencia</p>
              <p className="estadistica-valor" style={{ color: getTendenciaColor() }}>
                {Math.abs(estadisticas.tendencia).toFixed(1)}%
              </p>
              <p className="estadistica-sublabel">{getTendenciaTexto()}</p>
            </div>
          </div>

          <div className="estadistica-card">
            <div className="estadistica-icon" style={{ background: 'linear-gradient(135deg, #ff9800 0%, #ff5722 100%)' }}>
              ⚡
            </div>
            <div className="estadistica-info">
              <p className="estadistica-label">Mayor Consumo</p>
              <p className="estadistica-valor">{estadisticas.consumo_mayor.toFixed(1)} m³</p>
              <p className="estadistica-sublabel">{estadisticas.mes_mayor_consumo}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Controles de vista */}
      <div className="vista-controls">
        <button
          className={`vista-btn ${vistaActual === 'grafico' ? 'active' : ''}`}
          onClick={() => setVistaActual('grafico')}
        >
          📊 Gráfico
        </button>
        <button
          className={`vista-btn ${vistaActual === 'tabla' ? 'active' : ''}`}
          onClick={() => setVistaActual('tabla')}
        >
          📋 Tabla
        </button>
      </div>

      {/* Contenido */}
      <div className="consumo-content">
        {loading ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Cargando datos...</p>
          </div>
        ) : lecturas.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📊</div>
            <h3>No hay datos de consumo</h3>
            <p>Aún no tienes suficientes lecturas para mostrar estadísticas</p>
          </div>
        ) : (
          <>
            {vistaActual === 'grafico' ? (
              <div className="grafico-container">
                <div className="grafico-wrapper">
                  <div className="grafico-barras">
                    {lecturas.map((lectura, index) => {
                      const altura = (lectura.consumo / maxConsumo) * 100
                      const esActual = index === lecturas.length - 1
                      const esPromedio = lectura.consumo <= estadisticas.consumo_promedio

                      return (
                        <div key={lectura.id} className="barra-wrapper">
                          <div
                            className={`barra ${esActual ? 'barra-actual' : ''} ${esPromedio ? 'barra-bajo-promedio' : 'barra-sobre-promedio'}`}
                            style={{ height: `${altura}%` }}
                            title={`${lectura.consumo} m³`}
                          >
                            <span className="barra-valor">{lectura.consumo.toFixed(0)}</span>
                          </div>
                          <div className="barra-label">
                            {formatearFecha(lectura.fecha)}
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Línea de promedio */}
                  <div
                    className="linea-promedio"
                    style={{ bottom: `${(estadisticas.consumo_promedio / maxConsumo) * 100}%` }}
                  >
                    <span className="linea-promedio-label">
                      Promedio: {estadisticas.consumo_promedio.toFixed(1)} m³
                    </span>
                  </div>
                </div>

                {/* Leyenda */}
                <div className="grafico-leyenda">
                  <div className="leyenda-item">
                    <span className="leyenda-color" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}></span>
                    <span>Mes actual</span>
                  </div>
                  <div className="leyenda-item">
                    <span className="leyenda-color" style={{ background: '#4caf50' }}></span>
                    <span>Bajo el promedio</span>
                  </div>
                  <div className="leyenda-item">
                    <span className="leyenda-color" style={{ background: '#ff9800' }}></span>
                    <span>Sobre el promedio</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="tabla-container">
                <table className="consumo-tabla">
                  <thead>
                    <tr>
                      <th>Período</th>
                      <th>Fecha Lectura</th>
                      <th>Lectura Anterior</th>
                      <th>Lectura Actual</th>
                      <th>Consumo</th>
                      <th>vs. Promedio</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lecturas.map((lectura) => {
                      const diferencia = lectura.consumo - estadisticas.consumo_promedio
                      const porcentajeDif = (diferencia / estadisticas.consumo_promedio) * 100

                      return (
                        <tr key={lectura.id}>
                          <td data-label="Período">
                            <strong>{formatearFecha(lectura.fecha)}</strong>
                          </td>
                          <td data-label="Fecha Lectura">
                            {formatearFechaCompleta(lectura.fecha)}
                          </td>
                          <td data-label="Lectura Anterior">
                            {lectura.lectura_anterior} m³
                          </td>
                          <td data-label="Lectura Actual">
                            {lectura.lectura} m³
                          </td>
                          <td data-label="Consumo">
                            <strong className="consumo-valor">{lectura.consumo.toFixed(1)} m³</strong>
                          </td>
                          <td data-label="vs. Promedio">
                            <span className={`diferencia-badge ${diferencia >= 0 ? 'diferencia-alta' : 'diferencia-baja'}`}>
                              {diferencia >= 0 ? '+' : ''}{porcentajeDif.toFixed(1)}%
                            </span>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>

      {/* Tips de ahorro */}
      {!loading && lecturas.length > 0 && (
        <div className="tips-container">
          <h2>💡 Tips para Ahorrar Agua</h2>
          <div className="tips-grid">
            <div className="tip-card">
              <div className="tip-icon">🚿</div>
              <h3>Duchas Cortas</h3>
              <p>Reduce tu tiempo en la ducha a 5 minutos. Ahorrarás hasta 30 litros por ducha.</p>
            </div>

            <div className="tip-card">
              <div className="tip-icon">🚰</div>
              <h3>Repara Fugas</h3>
              <p>Un grifo que gotea puede desperdiciar hasta 20 litros diarios. Repáralo pronto.</p>
            </div>

            <div className="tip-card">
              <div className="tip-icon">🌱</div>
              <h3>Riega con Inteligencia</h3>
              <p>Riega tus plantas en la mañana o tarde. Evita las horas de mayor calor.</p>
            </div>

            <div className="tip-card">
              <div className="tip-icon">🍽️</div>
              <h3>Lavavajillas Lleno</h3>
              <p>Usa el lavavajillas solo cuando esté completamente lleno para maximizar eficiencia.</p>
            </div>

            <div className="tip-card">
              <div className="tip-icon">👕</div>
              <h3>Lavadora Eficiente</h3>
              <p>Lava la ropa con carga completa y usa programas de ahorro de agua.</p>
            </div>

            <div className="tip-card">
              <div className="tip-icon">🚽</div>
              <h3>Inodoro Eficiente</h3>
              <p>Considera instalar un sistema de doble descarga en tu inodoro.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
