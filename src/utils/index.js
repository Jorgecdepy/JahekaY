/**
 * UTILIDADES COMUNES - JAHEKAY
 * Funciones de formateo, validación y helpers reutilizables
 */

// ============================================
// FORMATEO DE MONEDA
// ============================================

/**
 * Formatea un número como moneda guaraníes (Gs.)
 * @param {number} monto - El monto a formatear
 * @param {boolean} conSimbolo - Si incluir el símbolo Gs.
 * @returns {string} - Monto formateado
 */
export const formatMoney = (monto, conSimbolo = true) => {
  if (monto === null || monto === undefined) return conSimbolo ? 'Gs. 0' : '0'

  const formatted = new Intl.NumberFormat('es-PY', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(monto)

  return conSimbolo ? `Gs. ${formatted}` : formatted
}

/**
 * Formatea un número como moneda con símbolo de guaraníes
 * @param {number} monto - El monto a formatear
 * @returns {string} - Monto formateado con símbolo
 */
export const formatCurrency = (monto) => {
  if (monto === null || monto === undefined) return 'Gs. 0'

  return new Intl.NumberFormat('es-PY', {
    style: 'currency',
    currency: 'PYG',
    minimumFractionDigits: 0
  }).format(monto)
}

// ============================================
// FORMATEO DE FECHAS
// ============================================

/**
 * Formatea una fecha en formato corto (dd/mm/yyyy)
 * @param {string|Date} fecha - Fecha a formatear
 * @returns {string} - Fecha formateada
 */
export const formatDate = (fecha) => {
  if (!fecha) return '-'

  return new Date(fecha).toLocaleDateString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  })
}

/**
 * Formatea una fecha en formato largo (dd de mes de yyyy)
 * @param {string|Date} fecha - Fecha a formatear
 * @returns {string} - Fecha formateada
 */
export const formatDateLong = (fecha) => {
  if (!fecha) return '-'

  return new Date(fecha).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  })
}

/**
 * Formatea una fecha con hora
 * @param {string|Date} fecha - Fecha a formatear
 * @returns {string} - Fecha y hora formateadas
 */
export const formatDateTime = (fecha) => {
  if (!fecha) return '-'

  return new Date(fecha).toLocaleString('es-PY', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

/**
 * Formatea una fecha en formato relativo (hace X minutos, ayer, etc.)
 * @param {string|Date} fecha - Fecha a formatear
 * @returns {string} - Fecha en formato relativo
 */
export const formatDateRelative = (fecha) => {
  if (!fecha) return '-'

  const now = new Date()
  const date = new Date(fecha)
  const diffMs = now - date
  const diffSecs = Math.floor(diffMs / 1000)
  const diffMins = Math.floor(diffSecs / 60)
  const diffHours = Math.floor(diffMins / 60)
  const diffDays = Math.floor(diffHours / 24)

  if (diffSecs < 60) return 'Hace un momento'
  if (diffMins < 60) return `Hace ${diffMins} ${diffMins === 1 ? 'minuto' : 'minutos'}`
  if (diffHours < 24) return `Hace ${diffHours} ${diffHours === 1 ? 'hora' : 'horas'}`
  if (diffDays === 1) return 'Ayer'
  if (diffDays < 7) return `Hace ${diffDays} días`
  if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} semanas`

  return formatDate(fecha)
}

/**
 * Obtiene el nombre del mes
 * @param {number} mes - Número del mes (0-11)
 * @returns {string} - Nombre del mes
 */
export const getMonthName = (mes) => {
  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ]
  return meses[mes] || ''
}

/**
 * Obtiene el período actual en formato "Mes YYYY"
 * @returns {string} - Período actual
 */
export const getCurrentPeriod = () => {
  const now = new Date()
  return `${getMonthName(now.getMonth())} ${now.getFullYear()}`
}

// ============================================
// FORMATEO DE NÚMEROS
// ============================================

/**
 * Formatea un número con separador de miles
 * @param {number} numero - Número a formatear
 * @param {number} decimales - Cantidad de decimales
 * @returns {string} - Número formateado
 */
export const formatNumber = (numero, decimales = 0) => {
  if (numero === null || numero === undefined) return '0'

  return new Intl.NumberFormat('es-PY', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales
  }).format(numero)
}

/**
 * Formatea metros cúbicos
 * @param {number} m3 - Metros cúbicos
 * @returns {string} - Metros cúbicos formateados
 */
export const formatM3 = (m3) => {
  if (m3 === null || m3 === undefined) return '0 m³'
  return `${formatNumber(m3)} m³`
}

// ============================================
// VALIDACIONES
// ============================================

/**
 * Valida si un email tiene formato correcto
 * @param {string} email - Email a validar
 * @returns {boolean} - True si es válido
 */
export const isValidEmail = (email) => {
  if (!email) return false
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return regex.test(email)
}

/**
 * Valida si un número de medidor tiene formato válido
 * @param {string} medidor - Número de medidor
 * @returns {boolean} - True si es válido
 */
export const isValidMedidor = (medidor) => {
  if (!medidor) return false
  // Acepta números y letras, mínimo 4 caracteres
  return /^[A-Za-z0-9]{4,}$/.test(medidor)
}

/**
 * Valida si un PIN tiene formato válido (4-6 dígitos)
 * @param {string} pin - PIN a validar
 * @returns {boolean} - True si es válido
 */
export const isValidPIN = (pin) => {
  if (!pin) return false
  return /^\d{4,6}$/.test(pin)
}

/**
 * Valida si una cédula paraguaya tiene formato válido
 * @param {string} cedula - Cédula a validar
 * @returns {boolean} - True si es válido
 */
export const isValidCedula = (cedula) => {
  if (!cedula) return false
  // Acepta formato con o sin puntos
  const clean = cedula.replace(/\./g, '')
  return /^\d{6,8}$/.test(clean)
}

/**
 * Valida si un teléfono paraguayo tiene formato válido
 * @param {string} telefono - Teléfono a validar
 * @returns {boolean} - True si es válido
 */
export const isValidPhone = (telefono) => {
  if (!telefono) return false
  // Acepta formatos: 0981123456, 0981 123 456, 981123456
  const clean = telefono.replace(/[\s-]/g, '')
  return /^0?9[6-9]\d{7}$/.test(clean)
}

// ============================================
// HELPERS DE TEXTO
// ============================================

/**
 * Capitaliza la primera letra de un texto
 * @param {string} texto - Texto a capitalizar
 * @returns {string} - Texto capitalizado
 */
export const capitalize = (texto) => {
  if (!texto) return ''
  return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase()
}

/**
 * Capitaliza cada palabra de un texto
 * @param {string} texto - Texto a capitalizar
 * @returns {string} - Texto con cada palabra capitalizada
 */
export const capitalizeWords = (texto) => {
  if (!texto) return ''
  return texto.split(' ').map(word => capitalize(word)).join(' ')
}

/**
 * Trunca un texto a un máximo de caracteres
 * @param {string} texto - Texto a truncar
 * @param {number} maxLength - Longitud máxima
 * @returns {string} - Texto truncado
 */
export const truncate = (texto, maxLength = 50) => {
  if (!texto) return ''
  if (texto.length <= maxLength) return texto
  return texto.substring(0, maxLength) + '...'
}

/**
 * Genera iniciales de un nombre
 * @param {string} nombre - Nombre completo
 * @returns {string} - Iniciales (máximo 2 caracteres)
 */
export const getInitials = (nombre) => {
  if (!nombre) return '??'
  const words = nombre.trim().split(' ').filter(w => w)
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase()
  return (words[0][0] + words[words.length - 1][0]).toUpperCase()
}

// ============================================
// HELPERS DE ESTADO/BADGES
// ============================================

/**
 * Obtiene el color para un estado de factura
 * @param {string} estado - Estado de la factura
 * @returns {string} - Color en formato hex
 */
export const getEstadoFacturaColor = (estado) => {
  const colores = {
    pendiente: '#ff9800',
    pagada: '#4caf50',
    vencida: '#f44336',
    cancelada: '#9e9e9e',
    parcial: '#2196f3'
  }
  return colores[estado] || '#9e9e9e'
}

/**
 * Obtiene el color para un estado de reclamo
 * @param {string} estado - Estado del reclamo
 * @returns {string} - Color en formato hex
 */
export const getEstadoReclamoColor = (estado) => {
  const colores = {
    pendiente: '#ff9800',
    asignado: '#2196f3',
    en_proceso: '#9c27b0',
    resuelto: '#4caf50',
    cerrado: '#9e9e9e'
  }
  return colores[estado] || '#9e9e9e'
}

/**
 * Obtiene el color para una prioridad
 * @param {string} prioridad - Prioridad
 * @returns {string} - Color en formato hex
 */
export const getPrioridadColor = (prioridad) => {
  const colores = {
    urgente: '#f44336',
    alta: '#ff9800',
    media: '#2196f3',
    baja: '#9e9e9e'
  }
  return colores[prioridad] || '#9e9e9e'
}

// ============================================
// HELPERS DE ARRAYS/OBJETOS
// ============================================

/**
 * Agrupa un array por una propiedad
 * @param {Array} array - Array a agrupar
 * @param {string} key - Propiedad por la que agrupar
 * @returns {Object} - Objeto con grupos
 */
export const groupBy = (array, key) => {
  return array.reduce((result, item) => {
    const groupKey = item[key]
    if (!result[groupKey]) result[groupKey] = []
    result[groupKey].push(item)
    return result
  }, {})
}

/**
 * Ordena un array por una propiedad
 * @param {Array} array - Array a ordenar
 * @param {string} key - Propiedad por la que ordenar
 * @param {string} direction - 'asc' o 'desc'
 * @returns {Array} - Array ordenado
 */
export const sortBy = (array, key, direction = 'asc') => {
  return [...array].sort((a, b) => {
    if (a[key] < b[key]) return direction === 'asc' ? -1 : 1
    if (a[key] > b[key]) return direction === 'asc' ? 1 : -1
    return 0
  })
}

/**
 * Suma una propiedad de un array de objetos
 * @param {Array} array - Array de objetos
 * @param {string} key - Propiedad a sumar
 * @returns {number} - Suma total
 */
export const sumBy = (array, key) => {
  return array.reduce((sum, item) => sum + (Number(item[key]) || 0), 0)
}

// ============================================
// HELPERS DE STORAGE
// ============================================

/**
 * Guarda un valor en localStorage
 * @param {string} key - Clave
 * @param {any} value - Valor a guardar
 */
export const setStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch (e) {
    console.error('Error guardando en localStorage:', e)
  }
}

/**
 * Obtiene un valor de localStorage
 * @param {string} key - Clave
 * @param {any} defaultValue - Valor por defecto
 * @returns {any} - Valor almacenado o default
 */
export const getStorage = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key)
    return item ? JSON.parse(item) : defaultValue
  } catch (e) {
    console.error('Error leyendo de localStorage:', e)
    return defaultValue
  }
}

/**
 * Elimina un valor de localStorage
 * @param {string} key - Clave a eliminar
 */
export const removeStorage = (key) => {
  try {
    localStorage.removeItem(key)
  } catch (e) {
    console.error('Error eliminando de localStorage:', e)
  }
}

// ============================================
// HELPERS DE DESCARGA/EXPORT
// ============================================

/**
 * Descarga datos como archivo CSV
 * @param {Array} data - Datos a exportar
 * @param {string} filename - Nombre del archivo
 * @param {Array} headers - Headers personalizados
 */
export const downloadCSV = (data, filename = 'export.csv', headers = null) => {
  if (!data || !data.length) return

  const keys = headers || Object.keys(data[0])
  const csvContent = [
    keys.join(','),
    ...data.map(row => keys.map(key => {
      let value = row[key]
      if (value === null || value === undefined) value = ''
      if (typeof value === 'string' && value.includes(',')) {
        value = `"${value}"`
      }
      return value
    }).join(','))
  ].join('\n')

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
}

/**
 * Copia texto al portapapeles
 * @param {string} text - Texto a copiar
 * @returns {Promise<boolean>} - True si se copió correctamente
 */
export const copyToClipboard = async (text) => {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch (e) {
    console.error('Error copiando al portapapeles:', e)
    return false
  }
}

// ============================================
// CONSTANTES ÚTILES
// ============================================

export const ESTADOS_FACTURA = [
  { value: 'pendiente', label: 'Pendiente', color: '#ff9800' },
  { value: 'pagada', label: 'Pagada', color: '#4caf50' },
  { value: 'vencida', label: 'Vencida', color: '#f44336' },
  { value: 'cancelada', label: 'Cancelada', color: '#9e9e9e' }
]

export const ESTADOS_RECLAMO = [
  { value: 'pendiente', label: 'Pendiente', color: '#ff9800' },
  { value: 'asignado', label: 'Asignado', color: '#2196f3' },
  { value: 'en_proceso', label: 'En Proceso', color: '#9c27b0' },
  { value: 'resuelto', label: 'Resuelto', color: '#4caf50' },
  { value: 'cerrado', label: 'Cerrado', color: '#9e9e9e' }
]

export const PRIORIDADES = [
  { value: 'baja', label: 'Baja', color: '#9e9e9e' },
  { value: 'media', label: 'Media', color: '#2196f3' },
  { value: 'alta', label: 'Alta', color: '#ff9800' },
  { value: 'urgente', label: 'Urgente', color: '#f44336' }
]

export const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo', icon: '💵' },
  { value: 'transferencia', label: 'Transferencia', icon: '🏦' },
  { value: 'tarjeta', label: 'Tarjeta', icon: '💳' },
  { value: 'cheque', label: 'Cheque', icon: '📄' }
]
