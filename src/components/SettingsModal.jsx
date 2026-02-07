import { useState, useEffect } from 'react'
import { X, Check, Building2, Lock, Eye, EyeOff, Shield } from 'lucide-react'

export default function SettingsModal({
  settings,
  onClose,
  onSave
}) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    logo_url: '',
    ruc: '',
    security_pin: ''
  })
  const [loading, setLoading] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [changingPin, setChangingPin] = useState(false)
  const [currentPinInput, setCurrentPinInput] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')

  useEffect(() => {
    if (settings) {
      setFormData({
        name: settings.name || '',
        address: settings.address || '',
        phone: settings.phone || '',
        email: settings.email || '',
        logo_url: settings.logo_url || '',
        ruc: settings.ruc || '',
        security_pin: settings.security_pin || ''
      })
    }
  }, [settings])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await onSave(formData)
      onClose()
    } catch (err) {
      console.error('Error saving settings:', err)
      alert('Error al guardar la configuración')
    } finally {
      setLoading(false)
    }
  }

  const handlePinChange = () => {
    setPinError('')

    // Si ya hay PIN configurado, verificar el actual
    if (formData.security_pin && currentPinInput !== formData.security_pin) {
      setPinError('PIN actual incorrecto')
      return
    }

    // Validar nuevo PIN
    if (newPin.length < 4) {
      setPinError('El PIN debe tener al menos 4 dígitos')
      return
    }

    if (newPin !== confirmPin) {
      setPinError('Los PINs no coinciden')
      return
    }

    // Actualizar PIN
    setFormData({ ...formData, security_pin: newPin })
    setChangingPin(false)
    setCurrentPinInput('')
    setNewPin('')
    setConfirmPin('')
    setPinError('')
  }

  const handleRemovePin = () => {
    if (currentPinInput !== formData.security_pin) {
      setPinError('PIN actual incorrecto')
      return
    }

    setFormData({ ...formData, security_pin: '' })
    setChangingPin(false)
    setCurrentPinInput('')
    setPinError('')
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-lg">
              <Building2 className="text-purple-600" size={24} />
            </div>
            <h2 className="text-xl font-semibold text-gray-800">Configuración</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre de la Escuela *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Escuela de Danza"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Dirección
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({...formData, address: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="Alborada - Guayaquil"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="0999..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                RUC
              </label>
              <input
                type="text"
                value={formData.ruc}
                onChange={(e) => setFormData({...formData, ruc: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="0912345678001"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              placeholder="escuela@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logo
            </label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setFormData({...formData, logo_url: '/logo.png'})}
                className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                  formData.logo_url === '/logo.png'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Usar logo local
              </button>
              <button
                type="button"
                onClick={() => setFormData({...formData, logo_url: ''})}
                className={`flex-1 px-3 py-2 rounded-lg border-2 text-sm font-medium transition-colors ${
                  !formData.logo_url || formData.logo_url === ''
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Sin logo
              </button>
            </div>
            {formData.logo_url && (
              <div className="mt-2 p-3 bg-gray-50 rounded-lg border">
                <p className="text-xs text-gray-500 text-center mb-2">Vista previa:</p>
                <img
                  src={formData.logo_url}
                  alt="Preview"
                  className="h-12 max-w-[120px] mx-auto object-contain"
                  onError={(e) => {
                    e.target.onerror = null
                    e.target.src = ''
                    e.target.alt = 'Error al cargar'
                  }}
                />
              </div>
            )}
          </div>

          {/* Security PIN Section */}
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Shield size={16} className="text-red-500" />
                PIN de Seguridad
              </label>
              {formData.security_pin ? (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                  ✓ Configurado
                </span>
              ) : (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">
                  Sin protección
                </span>
              )}
            </div>

            {!changingPin ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-500">
                  {formData.security_pin
                    ? 'El PIN protege la eliminación de registros y el acceso a configuración.'
                    : 'Configura un PIN para proteger la eliminación de registros.'}
                </p>
                <button
                  type="button"
                  onClick={() => setChangingPin(true)}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  <Lock size={16} />
                  {formData.security_pin ? 'Cambiar PIN' : 'Configurar PIN'}
                </button>
              </div>
            ) : (
              <div className="space-y-3 bg-gray-50 p-4 rounded-lg">
                {/* PIN actual (solo si ya existe) */}
                {formData.security_pin && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      PIN actual
                    </label>
                    <input
                      type="password"
                      inputMode="numeric"
                      maxLength={6}
                      value={currentPinInput}
                      onChange={(e) => {
                        setCurrentPinInput(e.target.value.replace(/\D/g, ''))
                        setPinError('')
                      }}
                      className="w-full px-3 py-2 border rounded-lg text-center tracking-widest"
                      placeholder="••••"
                    />
                  </div>
                )}

                {/* Nuevo PIN */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {formData.security_pin ? 'Nuevo PIN' : 'PIN'} (4-6 dígitos)
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={newPin}
                    onChange={(e) => {
                      setNewPin(e.target.value.replace(/\D/g, ''))
                      setPinError('')
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-center tracking-widest"
                    placeholder="••••"
                  />
                </div>

                {/* Confirmar PIN */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Confirmar PIN
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={6}
                    value={confirmPin}
                    onChange={(e) => {
                      setConfirmPin(e.target.value.replace(/\D/g, ''))
                      setPinError('')
                    }}
                    className="w-full px-3 py-2 border rounded-lg text-center tracking-widest"
                    placeholder="••••"
                  />
                </div>

                {pinError && (
                  <p className="text-red-500 text-xs text-center">{pinError}</p>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setChangingPin(false)
                      setCurrentPinInput('')
                      setNewPin('')
                      setConfirmPin('')
                      setPinError('')
                    }}
                    className="flex-1 px-3 py-2 border text-gray-600 rounded-lg text-sm"
                  >
                    Cancelar
                  </button>
                  {formData.security_pin && (
                    <button
                      type="button"
                      onClick={handleRemovePin}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-sm"
                    >
                      Quitar PIN
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handlePinChange}
                    className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg text-sm"
                  >
                    Guardar PIN
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check size={20} />
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
