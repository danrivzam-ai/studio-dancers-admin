import { useState } from 'react'
import { X, AlertTriangle, Trash2, Lock } from 'lucide-react'

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

  if (!isOpen) return null

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-xl w-72">
        {/* Header pequeño */}
        <div className="px-4 py-3 border-b bg-red-50 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="text-red-500" size={18} />
            <span className="font-medium text-red-700 text-sm">Eliminar</span>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-red-100 rounded">
            <X size={16} className="text-red-500" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="text-center mb-3">
            <p className="text-xs text-gray-500">
              {itemType === 'alumno' ? '¿Eliminar alumno?' : '¿Eliminar?'}
            </p>
            <p className="font-semibold text-gray-800">{itemName}</p>
          </div>

          {/* PIN */}
          {requiredPin && (
            <div className="mb-3">
              <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                <Lock size={10} /> PIN
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
                className={`w-full px-3 py-2 border rounded-lg text-center text-lg tracking-widest ${
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
              className="flex-1 px-3 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm font-semibold border border-gray-300"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || (requiredPin && pin.length < 4)}
              className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1 shadow-sm transition-all ${
                loading || (requiredPin && pin.length < 4)
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              }`}
            >
              <Trash2 size={14} />
              {loading ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
