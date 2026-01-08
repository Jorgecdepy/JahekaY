import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import './FormularioLectura.css'

function FormularioLectura({ onSuccess, onCancel, clientes }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [ultimaLectura, setUltimaLectura] = useState(null)
  const [formData, setFormData] = useState({
    usuario_id: '',
    lectura_actual: '',
    fecha_lectura: new Date().toISOString().split('T')[0],
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
    observaciones: ''
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData({
      ...formData,
      [name]: value
    })

    // Si cambia el cliente, buscar su última lectura
    if (name === 'usuario_id' && value) {
      buscarUltimaLectura(value)
    }
  }

  const buscarUltimaLectura = async (usuarioId) => {
    const { data, error } = await supabase
      .from('lecturas')
      .select('lectura_actual')
      .eq('usuario_id', usuarioId)
      .order('fecha_lectura', { ascending: false })
      .limit(1)

    if (error) {
      console.error('Error:', error)
      setUltimaLectura(null)
    } else {
      setUltimaLectura(data && data.length > 0 ? data[0].lectura_actual : 0)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const lecturaData = {
      usuario_id: formData.usuario_id,
      lectura_anterior: ultimaLectura || 0,
      lectura_actual: parseInt(formData.lectura_actual),
      fecha_lectura: formData.fecha_lectura,
      mes: formData.mes,
      anio: formData.anio,
      observaciones: formData.observaciones
    }

    const { data, error } = await supabase
      .from('lecturas')
      .insert([lecturaData])
      .select()

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setLoading(false)
      onSuccess()
    }
  }

  const consumoEstimado = ultimaLectura !== null && formData.lectura_actual
    ? parseInt(formData.lectura_actual) - ultimaLectura
    : 0

  return (
    <form onSubmit={handleSubmit} className="formulario-lectura">
      <div className="form-group">
        <label>Cliente *</label>
        <select
          name="usuario_id"
          value={formData.usuario_id}
          onChange={handleChange}
          required
        >
          <option value="">Seleccione un cliente</option>
          {clientes.map((cliente) => (
            <option key={cliente.id} value={cliente.id}>
              {cliente.nombre_completo} - {cliente.numero_medidor}
            </option>
          ))}
        </select>
      </div>

      {ultimaLectura !== null && (
        <div className="info-box">
          <p><strong>Última lectura:</strong> {ultimaLectura} m³</p>
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label>Lectura Actual (m³) *</label>
          <input
            type="number"
            name="lectura_actual"
            value={formData.lectura_actual}
            onChange={handleChange}
            min={ultimaLectura || 0}
            required
          />
        </div>

        <div className="form-group">
          <label>Fecha de Lectura *</label>
          <input
            type="date"
            name="fecha_lectura"
            value={formData.fecha_lectura}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      {consumoEstimado > 0 && (
        <div className="consumo-box">
          <p><strong>Consumo estimado:</strong> <span className="consumo-value">{consumoEstimado} m³</span></p>
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label>Mes *</label>
          <select
            name="mes"
            value={formData.mes}
            onChange={handleChange}
            required
          >
            <option value="1">Enero</option>
            <option value="2">Febrero</option>
            <option value="3">Marzo</option>
            <option value="4">Abril</option>
            <option value="5">Mayo</option>
            <option value="6">Junio</option>
            <option value="7">Julio</option>
            <option value="8">Agosto</option>
            <option value="9">Septiembre</option>
            <option value="10">Octubre</option>
            <option value="11">Noviembre</option>
            <option value="12">Diciembre</option>
          </select>
        </div>

        <div className="form-group">
          <label>Año *</label>
          <input
            type="number"
            name="anio"
            value={formData.anio}
            onChange={handleChange}
            min="2020"
            max="2030"
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label>Observaciones</label>
        <textarea
          name="observaciones"
          value={formData.observaciones}
          onChange={handleChange}
          rows="3"
        />
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="btn-cancel">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="btn-submit">
          {loading ? 'Guardando...' : 'Guardar Lectura'}
        </button>
      </div>
    </form>
  )
}

export default FormularioLectura