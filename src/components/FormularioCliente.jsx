import { useState } from 'react'
import { supabase } from '../services/supabase'
import './FormularioCliente.css'

function FormularioCliente({ onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    nombre_completo: '',
    cedula: '',
    direccion: '',
    telefono: '',
    email: '',
    numero_medidor: '',
    estado: 'activo',
    observaciones: ''
  })

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const { data, error } = await supabase
      .from('usuarios')
      .insert([formData])
      .select()

    if (error) {
      setError(error.message)
      setLoading(false)
    } else {
      setLoading(false)
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="formulario-cliente">
      <div className="form-row">
        <div className="form-group">
          <label>Nombre Completo *</label>
          <input
            type="text"
            name="nombre_completo"
            value={formData.nombre_completo}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Cédula *</label>
          <input
            type="text"
            name="cedula"
            value={formData.cedula}
            onChange={handleChange}
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label>Dirección *</label>
        <input
          type="text"
          name="direccion"
          value={formData.direccion}
          onChange={handleChange}
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Teléfono</label>
          <input
            type="text"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Número de Medidor *</label>
          <input
            type="text"
            name="numero_medidor"
            value={formData.numero_medidor}
            onChange={handleChange}
            required
          />
        </div>

        <div className="form-group">
          <label>Estado *</label>
          <select
            name="estado"
            value={formData.estado}
            onChange={handleChange}
            required
          >
            <option value="activo">Activo</option>
            <option value="inactivo">Inactivo</option>
            <option value="suspendido">Suspendido</option>
          </select>
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
          {loading ? 'Guardando...' : 'Guardar Cliente'}
        </button>
      </div>
    </form>
  )
}

export default FormularioCliente