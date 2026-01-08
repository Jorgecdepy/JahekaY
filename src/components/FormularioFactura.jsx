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

    if (lecturasData) {
      const { data: facturasData } = await supabase
        .from('facturas')
        .select('lectura_id')

      const lecturasConFactura = facturasData?.map(f => f.lectura_id) || []
      const lecturasFiltradas = lecturasData.filter(l => !lecturasConFactura.includes(l.id))
      setLecturasSinFactura(lecturasFiltradas)
    }

    const { data: tarifasData, error: tarifasError } = await supabase
      .from('tarifas')
      .select('*')
      .eq('activo', true)
      .order('rango_desde', { ascending: true })

    if (lecturasError) console.error('Error:', lecturasError)
    if (tarifasError) console.error('Error:', tarifasError)
    else setTarifas(tarifasData || [])

    setLoadingData(false)
  }

  const calcularMontoConsumo = (consumo) => {
    let montoTotal = 0
    let consumoRestante = consumo

    for (const tarifa of tarifas) {
      if (consumoRestante <= 0) break
      const rangoMax = tarifa.rango_hasta || Infinity
      const consumoEnRango = Math.min(consumoRestante, rangoMax - tarifa.rango_desde + 1)
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
      setCalculo({ consumo_m3: 0, monto_consumo: 0, cargo_fijo: 0, descuento: 0, mora: 0, total: 0 })
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

    const { error } = await supabase
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
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return meses[mes - 1]
  }

  const formatMonto = (monto) => {
    return new Intl.NumberFormat('es-PY', {
      style: 'currency', currency: 'PYG', minimumFractionDigits: 0
    }).format(monto)
  }

  if (loadingData) {
    return (
      <div className="form-loading">
        <div className="spinner spinner-lg"></div>
        <p>Cargando datos...</p>
      </div>
    )
  }

  if (lecturasSinFactura.length === 0) {
    return (
      <div className="form-empty">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
        </svg>
        <p>No hay lecturas sin facturar</p>
        <span>Primero debe registrar lecturas de medidores</span>
        <button onClick={onCancel} className="btn-secondary">Cerrar</button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="form-container">
      <div className="form-group">
        <label>Lectura a Facturar *</label>
        <select name="lectura_id" value={formData.lectura_id} onChange={handleLecturaChange} required>
          <option value="">Seleccione una lectura</option>
          {lecturasSinFactura.map((lectura) => (
            <option key={lectura.id} value={lectura.id}>
              {lectura.usuarios?.nombre_completo} - {lectura.usuarios?.numero_medidor} -
              {getMesNombre(lectura.mes)} {lectura.anio} ({lectura.consumo_m3} m3)
            </option>
          ))}
        </select>
      </div>

      {lecturaSeleccionada && (
        <>
          <div className="factura-info-box">
            <h4>Informacion de la Lectura</h4>
            <div className="factura-info-grid">
              <div className="factura-info-item">
                <span className="factura-info-label">Cliente</span>
                <span className="factura-info-value">{lecturaSeleccionada.usuarios?.nombre_completo}</span>
              </div>
              <div className="factura-info-item">
                <span className="factura-info-label">Medidor</span>
                <span className="factura-info-value">{lecturaSeleccionada.usuarios?.numero_medidor}</span>
              </div>
              <div className="factura-info-item">
                <span className="factura-info-label">Periodo</span>
                <span className="factura-info-value">{getMesNombre(lecturaSeleccionada.mes)} {lecturaSeleccionada.anio}</span>
              </div>
              <div className="factura-info-item">
                <span className="factura-info-label">Consumo</span>
                <span className="factura-info-value factura-consumo-highlight">{lecturaSeleccionada.consumo_m3} m3</span>
              </div>
            </div>
          </div>

          <div className="factura-desglose">
            <h4>Desglose de Factura</h4>
            <div className="desglose-item">
              <span>Consumo ({calculo.consumo_m3} m3)</span>
              <span>{formatMonto(calculo.monto_consumo)}</span>
            </div>
            <div className="desglose-item">
              <span>Cargo Fijo</span>
              <span>{formatMonto(calculo.cargo_fijo)}</span>
            </div>
            {calculo.descuento > 0 && (
              <div className="desglose-item desglose-descuento">
                <span>Descuento</span>
                <span>- {formatMonto(calculo.descuento)}</span>
              </div>
            )}
            {calculo.mora > 0 && (
              <div className="desglose-item desglose-mora">
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
              <input type="number" name="descuento" value={formData.descuento} onChange={handleAjustesChange} min="0" />
            </div>
            <div className="form-group">
              <label>Mora (Gs.)</label>
              <input type="number" name="mora" value={formData.mora} onChange={handleAjustesChange} min="0" />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Fecha de Emision *</label>
              <input type="date" name="fecha_emision" value={formData.fecha_emision}
                onChange={(e) => setFormData({...formData, fecha_emision: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Fecha de Vencimiento *</label>
              <input type="date" name="fecha_vencimiento" value={formData.fecha_vencimiento}
                onChange={(e) => setFormData({...formData, fecha_vencimiento: e.target.value})} required />
            </div>
          </div>
        </>
      )}

      {error && (
        <div className="form-error">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="8" x2="12" y2="12"></line>
            <line x1="12" y1="16" x2="12.01" y2="16"></line>
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-secondary">Cancelar</button>
        <button type="submit" disabled={loading || !lecturaSeleccionada} className="btn-primary">
          {loading ? (<><span className="spinner"></span>Generando...</>) : 'Generar Factura'}
        </button>
      </div>
    </form>
  )
}

export default FormularioFactura
