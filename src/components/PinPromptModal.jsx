import { useState } from 'react'
import { X, Lock, Shield } from 'lucide-react'

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

  if (!isOpen) return null

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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs">
        {/* Header */}
        <div className="px-4 py-3 border-b bg-purple-50 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-purple-100 p-1.5 rounded-full">
                <Shield className="text-purple-600" size={18} />
              </div>
              <h2 className="text-sm font-semibold text-purple-800">{title}</h2>
            </div>
            <button
              onClick={handleClose}
              className="p-1.5 hover:bg-purple-100 rounded-lg transition-colors"
            >
              <X size={16} className="text-purple-600" />
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
              className="w-full px-4 py-3 border-2 rounded-xl text-center text-2xl tracking-[0.5em] focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
              className="flex-1 px-3 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={pin.length < 4 || attempts >= 3}
              className="flex-1 px-3 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Verificar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
