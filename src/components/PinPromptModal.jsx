import { useState } from 'react'
import { X, Lock, Shield } from 'lucide-react'
import Modal from './ui/Modal'

export default function PinPromptModal({
  isOpen,
  onClose,
  onSuccess,
  requiredPin,
  title = 'Acceso protegido',
  description = 'Ingresa el PIN de seguridad para continuar'
}) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (pin === requiredPin) {
      setPin('')
      setAttempts(0)
      onSuccess()
    } else {
      const newAttempts = attempts + 1
      setAttempts(newAttempts)
      setPin('')

      if (newAttempts >= 3) {
        setError('Demasiados intentos. Intenta más tarde.')
        setTimeout(() => {
          handleClose()
        }, 2000)
      } else {
        setError(`PIN incorrecto. ${3 - newAttempts} intentos restantes.`)
      }
    }
  }

  const handleClose = () => {
    setPin('')
    setError('')
    setAttempts(0)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} ariaLabel={title}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xs">
        {/* Header */}
        <div className="px-4 py-3 bg-purple-700 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-xl">
                <Shield size={18} />
              </div>
              <h2 className="text-sm font-semibold">{title}</h2>
            </div>
            <button
              onClick={handleClose}
              aria-label="Cerrar"
              className="p-1.5 hover:bg-white/20 rounded-xl transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4">
          <div className="text-center mb-3">
            <Lock className="mx-auto text-gray-400 mb-1.5" size={24} />
            <p className="text-gray-500 text-xs">{description}</p>
          </div>

          <div className="mb-3">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ''))
                setError('')
              }}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-center text-2xl tracking-[0.5em] focus:ring-4 focus:ring-purple-100 focus:border-purple-500 transition-all"
              placeholder="••••"
              autoFocus
              disabled={attempts >= 3}
            />
            {error && (
              <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-3 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pin.length < 4 || attempts >= 3}
              className="flex-1 px-3 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all"
            >
              Verificar
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
