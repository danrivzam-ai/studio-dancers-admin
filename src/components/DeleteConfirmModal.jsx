import { useState } from 'react'
import { X, AlertTriangle, Trash2, Ban, Lock } from 'lucide-react'
import Modal from './ui/Modal'

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  itemName,
  itemType = 'registro',
  requiredPin
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isVoid = itemType === 'venta'
  const actionLabel = isVoid ? 'Anular' : 'Eliminar'
  const ActionIcon = isVoid ? Ban : Trash2

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (requiredPin && pin !== requiredPin) {
      setError('PIN incorrecto')
      setPin('')
      return
    }

    setLoading(true)
    try {
      await onConfirm()
      setPin('')
      onClose()
    } catch (err) {
      setError('Error: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setPin('')
    setError('')
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} ariaLabel={`Confirmar ${actionLabel.toLowerCase()}`}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        {/* Header */}
        <div className={`px-4 py-3 border-b rounded-t-2xl flex items-center justify-between ${
          isVoid ? 'bg-amber-50' : 'bg-red-50'
        }`}>
          <div className="flex items-center gap-2">
            <AlertTriangle className={isVoid ? 'text-amber-500' : 'text-red-500'} size={18} />
            <span className={`font-medium text-sm ${isVoid ? 'text-amber-700' : 'text-red-700'}`}>{actionLabel}</span>
          </div>
          <button onClick={handleClose} aria-label="Cerrar" className={`p-1 rounded-xl active:scale-95 transition-all ${
            isVoid ? 'hover:bg-amber-100' : 'hover:bg-red-100'
          }`}>
            <X size={16} className={isVoid ? 'text-amber-500' : 'text-red-500'} />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="text-center mb-3">
            <p className="text-xs text-gray-500">
              {isVoid
                ? '¿Anular esta venta? El stock se restaurará automáticamente.'
                : itemType === 'alumno' ? '¿Eliminar alumno?' : '¿Eliminar?'}
            </p>
            <p className="font-semibold text-gray-800 mt-1">{itemName}</p>
          </div>

          {/* PIN */}
          {requiredPin && (
            <div className="mb-3">
              <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Lock size={10} /> PIN de seguridad
              </label>
              <input
                type="password"
                inputMode="numeric"
                maxLength={6}
                value={pin}
                onChange={(e) => {
                  setPin(e.target.value.replace(/\D/g, ''))
                  setError('')
                }}
                className={`w-full px-3 py-2 border-2 rounded-xl text-center text-lg tracking-widest transition-all ${
                  error ? 'border-red-300' : 'border-gray-200'
                }`}
                placeholder="••••"
                autoFocus
              />
              {error && <p className="text-red-500 text-xs mt-1 text-center">{error}</p>}
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-3 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 active:scale-95 transition-all text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || (requiredPin && pin.length < 4)}
              className={`flex-1 px-3 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-1 shadow-sm transition-all active:scale-95 ${
                loading || (requiredPin && pin.length < 4)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : isVoid
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              <ActionIcon size={14} />
              {loading ? (isVoid ? 'Anulando...' : 'Eliminando...') : actionLabel}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
