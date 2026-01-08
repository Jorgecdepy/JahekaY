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

    const { error } = await supabase
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
    <form onSubmit={handleSubmit} className="form-container">
      <div className="form-row">
        <div className="form-group">
          <label>Nombre Completo *</label>
          <input
            type="text"
            name="nombre_completo"
            value={formData.nombre_completo}
            onChange={handleChange}
            placeholder="Ej: Juan Perez"
            required
          />
        </div>

        <div className="form-group">
          <label>Cedula *</label>
          <input
            type="text"
            name="cedula"
            value={formData.cedula}
            onChange={handleChange}
            placeholder="Ej: 1234567"
            required
          />
        </div>
      </div>

      <div className="form-group">
        <label>Direccion *</label>
        <input
          type="text"
          name="direccion"
          value={formData.direccion}
          onChange={handleChange}
          placeholder="Ej: Calle Principal 123"
          required
        />
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Telefono</label>
          <input
            type="text"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            placeholder="Ej: 0981123456"
          />
        </div>

        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Ej: juan@email.com"
          />
        </div>
      </div>

      <div className="form-row">
        <div className="form-group">
          <label>Numero de Medidor *</label>
          <input
            type="text"
            name="numero_medidor"
            value={formData.numero_medidor}
            onChange={handleChange}
            placeholder="Ej: MED-001"
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
          placeholder="Notas adicionales sobre el cliente..."
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
            'Guardar Cliente'
          )}
        </button>
      </div>
    </form>
  )
}

export default FormularioCliente
