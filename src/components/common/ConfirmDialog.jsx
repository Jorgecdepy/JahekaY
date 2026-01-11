import { useEffect, useRef } from 'react'
import './ConfirmDialog.css'

/**
 * Componente de diálogo de confirmación
 * Reemplaza window.confirm con una UI más amigable
 */
export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title = '¿Estás seguro?',
  message = 'Esta acción no se puede deshacer.',
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  type = 'warning', // 'warning', 'danger', 'info', 'success'
  loading = false
}) {
  const dialogRef = useRef(null)
  const confirmButtonRef = useRef(null)

  // Cerrar con Escape
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      // Focus en el botón de confirmar
      setTimeout(() => confirmButtonRef.current?.focus(), 100)
      // Prevenir scroll del body
      document.body.style.overflow = 'hidden'
    }

    return () => {
      document.removeEventListener('keydown', handleEscape)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose, loading])

  // Click fuera para cerrar
  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget && !loading) {
      onClose()
    }
  }

  if (!isOpen) return null

  const getIcon = () => {
    switch (type) {
      case 'danger':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        )
      case 'success':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="9 12 12 15 16 10" />
          </svg>
        )
      case 'info':
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        )
      default: // warning
        return (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
        )
    }
  }

  return (
    <div className="confirm-overlay" onClick={handleOverlayClick}>
      <div className={`confirm-dialog confirm-${type}`} ref={dialogRef} role="dialog" aria-modal="true">
        <div className={`confirm-icon icon-${type}`}>
          {getIcon()}
        </div>

        <h3 className="confirm-title">{title}</h3>
        <p className="confirm-message">{message}</p>

        <div className="confirm-actions">
          <button
            className="btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            {cancelText}
          </button>
          <button
            ref={confirmButtonRef}
            className={`btn-confirm btn-${type}`}
            onClick={onConfirm}
            disabled={loading}
          >
            {loading ? (
              <>
                <span className="spinner-small"></span>
                Procesando...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
