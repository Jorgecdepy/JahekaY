import { useState } from 'react'
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

    const { error } = await supabase
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
    <form onSubmit={handleSubmit} className="form-container">
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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="12" y1="16" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12.01" y2="8"></line>
          </svg>
          <div>
            <span className="info-label">Ultima lectura registrada</span>
            <span className="info-value">{ultimaLectura} m3</span>
          </div>
        </div>
      )}

      <div className="form-row">
        <div className="form-group">
          <label>Lectura Actual (m3) *</label>
          <input
            type="number"
            name="lectura_actual"
            value={formData.lectura_actual}
            onChange={handleChange}
            min={ultimaLectura || 0}
            placeholder="Ingrese la lectura"
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
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
          </svg>
          <div>
            <span className="consumo-label">Consumo estimado</span>
            <span className="consumo-value">{consumoEstimado} m3</span>
          </div>
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
          <label>Ano *</label>
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
          placeholder="Notas adicionales..."
        />
      </div>

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
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancelar
        </button>
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? (
            <>
              <span className="spinner"></span>
              Guardando...
            </>
          ) : (
            'Guardar Lectura'
          )}
        </button>
      </div>
    </form>
  )
}

export default FormularioLectura
