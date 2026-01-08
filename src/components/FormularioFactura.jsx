import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import './FormularioFactura.css'

function FormularioFactura({ onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [error, setError] = useState(null)
  const [lecturasSinFactura, setLecturasSinFactura] = useState([])
  const [tarifas, setTarifas] = useState([])
  const [lecturaSeleccionada, setLecturaSeleccionada] = useState(null)
  const [formData, setFormData] = useState({
    lectura_id: '',
    descuento: 0,
    mora: 0,
    fecha_emision: new Date().toISOString().split('T')[0],
    fecha_vencimiento: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  })
  const [calculo, setCalculo] = useState({
    consumo_m3: 0,
    monto_consumo: 0,
    cargo_fijo: 0,
    descuento: 0,
    mora: 0,
    total: 0
  })

  useEffect(() => {
    cargarDatos()
  }, [])

  const cargarDatos = async () => {
    setLoadingData(true)
    
    // Cargar lecturas sin factura
    const { data: lecturasData, error: lecturasError } = await supabase
      .from('lecturas')
      .select(`
        *,
        usuarios (
          id,
          nombre_completo,
          numero_medidor,
          cedula
        )
      `)
      .order('fecha_lectura', { ascending: false })

    // Filtrar lecturas que no tienen factura
    if (lecturasData) {
      const { data: facturasData } = await supabase
        .from('facturas')
        .select('lectura_id')
      
      const lecturasConFactura = facturasData?.map(f => f.lectura_id) || []
      const lecturasFiltradas = lecturasData.filter(l => !lecturasConFactura.includes(l.id))
      setLecturasSinFactura(lecturasFiltradas)
    }

    // Cargar tarifas activas
    const { data: tarifasData, error: tarifasError } = await supabase
      .from('tarifas')
      .select('*')
      .eq('activo', true)
      .order('rango_desde', { ascending: true })

    if (lecturasError) {
      console.error('Error:', lecturasError)
    }

    if (tarifasError) {
      console.error('Error:', tarifasError)
    } else {
      setTarifas(tarifasData || [])
    }

    setLoadingData(false)
  }

  const calcularMontoConsumo = (consumo) => {
    let montoTotal = 0
    let consumoRestante = consumo

    for (const tarifa of tarifas) {
      if (consumoRestante <= 0) break

      const rangoMax = tarifa.rango_hasta || Infinity
      const consumoEnRango = Math.min(
        consumoRestante,
        rangoMax - tarifa.rango_desde + 1
      )

      montoTotal += consumoEnRango * parseFloat(tarifa.precio_por_m3)
      consumoRestante -= consumoEnRango
    }

    return montoTotal
  }

  const handleLecturaChange = (e) => {
    const lecturaId = e.target.value
    setFormData({ ...formData, lectura_id: lecturaId })

    if (lecturaId) {
      const lectura = lecturasSinFactura.find(l => l.id === lecturaId)
      setLecturaSeleccionada(lectura)

      if (lectura && tarifas.length > 0) {
        const consumo = lectura.consumo_m3
        const montoConsumo = calcularMontoConsumo(consumo)
        const cargoFijo = tarifas[0]?.cargo_fijo_mensual || 0
        
        const nuevoCalculo = {
          consumo_m3: consumo,
          monto_consumo: montoConsumo,
          cargo_fijo: parseFloat(cargoFijo),
          descuento: parseFloat(formData.descuento),
          mora: parseFloat(formData.mora),
          total: montoConsumo + parseFloat(cargoFijo) - parseFloat(formData.descuento) + parseFloat(formData.mora)
        }
        
        setCalculo(nuevoCalculo)
      }
    } else {
      setLecturaSeleccionada(null)
      setCalculo({
        consumo_m3: 0,
        monto_consumo: 0,
        cargo_fijo: 0,
        descuento: 0,
        mora: 0,
        total: 0
      })
    }
  }

  const handleAjustesChange = (e) => {
    const { name, value } = e.target
    const nuevoFormData = { ...formData, [name]: value }
    setFormData(nuevoFormData)

    if (lecturaSeleccionada) {
      const nuevoCalculo = {
        ...calculo,
        descuento: parseFloat(nuevoFormData.descuento),
        mora: parseFloat(nuevoFormData.mora),
      }
      nuevoCalculo.total = calculo.monto_consumo + calculo.cargo_fijo - nuevoCalculo.descuento + nuevoCalculo.mora
      setCalculo(nuevoCalculo)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const facturaData = {
      usuario_id: lecturaSeleccionada.usuario_id,
      lectura_id: formData.lectura_id,
      periodo: `${getMesNombre(lecturaSeleccionada.mes)} ${lecturaSeleccionada.anio}`,
      consumo_m3: calculo.consumo_m3,
      monto_consumo: calculo.monto_consumo,
      cargo_fijo: calculo.cargo_fijo,
      descuento: calculo.descuento,
      mora: calculo.mora,
      total: calculo.total,
      estado: 'pendiente',
      fecha_emision: formData.fecha_emision,
      fecha_vencimiento: formData.fecha_vencimiento
    }

    const { data, error } = await supabase
      .from('facturas')
      .insert([facturaData])
      .select()

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setLoading(false)
      onSuccess()
    }
  }

  const getMesNombre = (mes) => {
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ]
    return meses[mes - 1]
  }

  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency',
      currency: 'PYG',
      minimumFractionDigits: 0
    }).format(monto)
  }

  if (loadingData) {
    return <div className="loading-form">Cargando datos...</div>
  }

  if (lecturasSinFactura.length === 0) {
    return (
      <div className="no-lecturas">
        <p>No hay lecturas sin facturar disponibles.</p>
        <p>Primero debe registrar lecturas de medidores.</p>
        <button onClick={onCancel} className="btn-cancel">Cerrar</button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="formulario-factura">
      <div className="form-group">
        <label>Lectura a Facturar *</label>
        <select
          name="lectura_id"
          value={formData.lectura_id}
          onChange={handleLecturaChange}
          required
        >
          <option value="">Seleccione una lectura</option>
          {lecturasSinFactura.map((lectura) => (
            <option key={lectura.id} value={lectura.id}>
              {lectura.usuarios?.nombre_completo} - {lectura.usuarios?.numero_medidor} - 
              {getMesNombre(lectura.mes)} {lectura.anio} ({lectura.consumo_m3} m³)
            </option>
          ))}
        </select>
      </div>

      {lecturaSeleccionada && (
        <>
          <div className="info-lectura">
            <h4>Información de la Lectura</h4>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Cliente:</span>
                <span className="info-value">{lecturaSeleccionada.usuarios?.nombre_completo}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Medidor:</span>
                <span className="info-value">{lecturaSeleccionada.usuarios?.numero_medidor}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Periodo:</span>
                <span className="info-value">{getMesNombre(lecturaSeleccionada.mes)} {lecturaSeleccionada.anio}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Consumo:</span>
                <span className="info-value consumo-highlight">{lecturaSeleccionada.consumo_m3} m³</span>
              </div>
            </div>
          </div>

          <div className="calculo-desglose">
            <h4>Desglose de Factura</h4>
            <div className="desglose-item">
              <span>Consumo ({calculo.consumo_m3} m³)</span>
              <span>{formatMonto(calculo.monto_consumo)}</span>
            </div>
            <div className="desglose-item">
              <span>Cargo Fijo</span>
              <span>{formatMonto(calculo.cargo_fijo)}</span>
            </div>
            {calculo.descuento > 0 && (
              <div className="desglose-item descuento">
                <span>Descuento</span>
                <span>- {formatMonto(calculo.descuento)}</span>
              </div>
            )}
            {calculo.mora > 0 && (
              <div className="desglose-item mora">
                <span>Mora</span>
                <span>+ {formatMonto(calculo.mora)}</span>
              </div>
            )}
            <div className="desglose-total">
              <span>TOTAL</span>
              <span>{formatMonto(calculo.total)}</span>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Descuento (Gs.)</label>
              <input
                type="number"
                name="descuento"
                value={formData.descuento}
                onChange={handleAjustesChange}
                min="0"
              />
            </div>

            <div className="form-group">
              <label>Mora (Gs.)</label>
              <input
                type="number"
                name="mora"
                value={formData.mora}
                onChange={handleAjustesChange}
                min="0"
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Fecha de Emisión *</label>
              <input
                type="date"
                name="fecha_emision"
                value={formData.fecha_emision}
                onChange={(e) => setFormData({...formData, fecha_emision: e.target.value})}
                required
              />
            </div>

            <div className="form-group">
              <label>Fecha de Vencimiento *</label>
              <input
                type="date"
                name="fecha_vencimiento"
                value={formData.fecha_vencimiento}
                onChange={(e) => setFormData({...formData, fecha_vencimiento: e.target.value})}
                required
              />
            </div>
          </div>
        </>
      )}

      {error && <div className="error-message">{error}</div>}

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-cancel">
          Cancelar
        </button>
        <button type="submit" disabled={loading || !lecturaSeleccionada} className="btn-submit">
          {loading ? 'Generando...' : 'Generar Factura'}
        </button>
      </div>
    </form>
  )
}

export default FormularioFactura