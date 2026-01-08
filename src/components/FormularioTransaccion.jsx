import { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import './FormularioTransaccion.css'

function FormularioTransaccion({ tipo, cajaId, categorias, onSuccess, onCancel }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [clientes, setClientes] = useState([])
  const [facturasPendientes, setFacturasPendientes] = useState([])
  const [formData, setFormData] = useState({
    tipo: tipo,
    monto: '',
    descripcion: '',
    categoria_id: '',
    metodo_pago: 'efectivo',
    referencia: '',
    usuario_relacionado: '',
    factura_relacionada: ''
  })

  useEffect(() => {
    if (tipo === 'ingreso') {
      cargarClientesYFacturas()
    }
  }, [tipo])

  const cargarClientesYFacturas = async () => {
    // Cargar clientes activos
    const { data: clientesData } = await supabase
      .from('usuarios')
      .select('id, nombre_completo, cedula')
      .eq('estado', 'activo')
      .order('nombre_completo')

    setClientes(clientesData || [])

    // Cargar facturas pendientes
    const { data: facturasData } = await supabase
      .from('facturas')
      .select(`
        id,
        periodo,
        total,
        usuarios (
          nombre_completo
        )
      `)
      .eq('estado', 'pendiente')
      .order('fecha_emision', { ascending: false })

    setFacturasPendientes(facturasData || [])
  }

  const handleChange = (e) => {
    const { name, value } = e.target

    // Si se selecciona una factura, autocompletar datos
    if (name === 'factura_relacionada' && value) {
      const factura = facturasPendientes.find(f => f.id === value)
      if (factura) {
        setFormData({
          ...formData,
          factura_relacionada: value,
          monto: factura.total,
          descripcion: `Pago de factura ${factura.periodo}`,
          categoria_id: categorias.find(c => c.nombre === 'Pago de Factura')?.id || ''
        })
        return
      }
    }

    setFormData({
      ...formData,
      [name]: value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validaciones
    if (!formData.monto || parseFloat(formData.monto) <= 0) {
      setError('El monto debe ser mayor a 0')
      setLoading(false)
      return
    }

    if (!formData.descripcion.trim()) {
      setError('La descripción es requerida')
      setLoading(false)
      return
    }

    // Preparar datos para insertar
    const transaccionData = {
      caja_diaria_id: cajaId,
      tipo: tipo,
      monto: parseFloat(formData.monto),
      descripcion: formData.descripcion.trim(),
      categoria_id: formData.categoria_id || null,
      metodo_pago: formData.metodo_pago,
      referencia: formData.referencia || null,
      usuario_relacionado: formData.usuario_relacionado || null,
      factura_relacionada: formData.factura_relacionada || null
    }

    // Insertar transacción
    const { error: transaccionError } = await supabase
      .from('transacciones_caja')
      .insert([transaccionData])

    if (transaccionError) {
      setError(transaccionError.message)
      setLoading(false)
      return
    }

    // Si es pago de factura, marcarla como pagada
    if (formData.factura_relacionada) {
      const { error: facturaError } = await supabase
        .from('facturas')
        .update({
          estado: 'pagada',
          fecha_pago: new Date().toISOString().split('T')[0]
        })
        .eq('id', formData.factura_relacionada)

      if (facturaError) {
        console.error('Error al actualizar factura:', facturaError)
      }
    }

    setLoading(false)
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit} className="form-container">
      {/* Selector de factura pendiente (solo para ingresos) */}
      {tipo === 'ingreso' && facturasPendientes.length > 0 && (
        <div className="form-group">
          <label>Pago de Factura (opcional)</label>
          <select
            name="factura_relacionada"
            value={formData.factura_relacionada}
            onChange={handleChange}
          >
            <option value="">-- Seleccionar factura --</option>
            {facturasPendientes.map(factura => (
              <option key={factura.id} value={factura.id}>
                {factura.usuarios?.nombre_completo} - {factura.periodo} - {formatMonto(factura.total)}
              </option>
            ))}
          </select>
          <small className="form-hint">Si es pago de factura, selecciónala para autocompletar datos</small>
        </div>
      )}

      {/* Categoría */}
      <div className="form-group">
        <label>Categoría *</label>
        <select
          name="categoria_id"
          value={formData.categoria_id}
          onChange={handleChange}
          required
        >
          <option value="">-- Seleccionar categoría --</option>
          {categorias.map(categoria => (
            <option key={categoria.id} value={categoria.id}>
              {categoria.nombre}
            </option>
          ))}
        </select>
      </div>

      {/* Monto */}
      <div className="form-group">
        <label>Monto *</label>
        <input
          type="number"
          name="monto"
          value={formData.monto}
          onChange={handleChange}
          placeholder="0"
          step="1"
          min="1"
          required
          className="input-monto"
        />
        <small className="form-hint">Ingresa el monto en Guaraníes</small>
      </div>

      {/* Descripción */}
      <div className="form-group">
        <label>Descripción *</label>
        <textarea
          name="descripcion"
          value={formData.descripcion}
          onChange={handleChange}
          rows="3"
          placeholder="Describe el concepto de esta transacción..."
          required
        />
      </div>

      {/* Método de pago */}
      <div className="form-row">
        <div className="form-group">
          <label>Método de Pago *</label>
          <select
            name="metodo_pago"
            value={formData.metodo_pago}
            onChange={handleChange}
            required
          >
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="tarjeta">Tarjeta</option>
            <option value="cheque">Cheque</option>
          </select>
        </div>

        <div className="form-group">
          <label>Referencia</label>
          <input
            type="text"
            name="referencia"
            value={formData.referencia}
            onChange={handleChange}
            placeholder="N° de comprobante"
          />
        </div>
      </div>

      {/* Cliente relacionado (opcional para ingresos) */}
      {tipo === 'ingreso' && clientes.length > 0 && !formData.factura_relacionada && (
        <div className="form-group">
          <label>Cliente (opcional)</label>
          <select
            name="usuario_relacionado"
            value={formData.usuario_relacionado}
            onChange={handleChange}
          >
            <option value="">-- Ninguno --</option>
            {clientes.map(cliente => (
              <option key={cliente.id} value={cliente.id}>
                {cliente.nombre_completo} - {cliente.cedula}
              </option>
            ))}
          </select>
        </div>
      )}

      {error && (
        <div className="form-error">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
        <button
          type="submit"
          disabled={loading}
          className={tipo === 'ingreso' ? 'btn-success' : 'btn-danger'}
        >
          {loading ? (
            <>
              <span className="spinner"></span>
              Guardando...
            </>
          ) : (
            `Registrar ${tipo === 'ingreso' ? 'Ingreso' : 'Gasto'}`
          )}
        </button>
      </div>
    </form>
  )
}

// Función auxiliar para formatear montos
function formatMonto(monto) {
  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    minimumFractionDigits: 0
  }).format(monto || 0)
}

export default FormularioTransaccion
