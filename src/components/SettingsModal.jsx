import { useState, useEffect } from 'react'
import { X, Check, Building2, Lock, Eye, EyeOff, Shield, Mail, Landmark } from 'lucide-react'
import BackupExport from './BackupExport'
import MetaOfflineExport from './MetaOfflineExport'
import Modal from './ui/Modal'
import { useToast } from './Toast'

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
    security_pin: '',
    grace_days: 5,
    mora_days: 20,
    auto_inactive_days: 60,
    mailerlite_api_key: '',
    mailerlite_group_id: '',
    mailerlite_instructors_group_id: '',
    bank_name: '',
    bank_account_number: '',
    bank_account_holder: '',
    bank_account_type: 'Ahorros'
  })
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [showPin, setShowPin] = useState(false)
  const [showApiKey, setShowApiKey] = useState(false)
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
        security_pin: settings.security_pin || '',
        grace_days: settings.grace_days ?? 5,
        mora_days: settings.mora_days ?? 20,
        auto_inactive_days: settings.auto_inactive_days ?? 60,
        mailerlite_api_key: settings.mailerlite_api_key || '',
        mailerlite_group_id: settings.mailerlite_group_id || '',
        mailerlite_instructors_group_id: settings.mailerlite_instructors_group_id || '',
        bank_name: settings.bank_name || '',
        bank_account_number: settings.bank_account_number || '',
        bank_account_holder: settings.bank_account_holder || '',
        bank_account_type: settings.bank_account_type || 'Ahorros'
      })
    }
  }, [settings])

  const handleSubmit = async (e) => {
    e.preventDefault()

    // Validar coherencia de días de cobro
    const grace = parseInt(formData.grace_days) || 0
    const mora  = parseInt(formData.mora_days)  || 0
    const inact = parseInt(formData.auto_inactive_days) || 0

    if (grace < 0) {
      toast.warning('Los días de gracia no pueden ser negativos.')
      return
    }
    if (mora <= grace) {
      toast.warning(`Los días hasta suspender (${mora}) deben ser mayores que los días de gracia (${grace}).`)
      return
    }
    if (inact <= mora) {
      toast.warning(`Los días hasta inactivar (${inact}) deben ser mayores que los días hasta suspender (${mora}).`)
      return
    }

    setLoading(true)
    try {
      await onSave(formData)
      onClose()
    } catch (err) {
      console.error('Error saving settings:', err)
      toast.error('Error al guardar la configuración')
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
    <Modal isOpen={true} onClose={onClose} ariaLabel="Configuración">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 bg-purple-700 text-white flex items-center justify-between sticky top-0 z-10 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <Building2 size={24} />
            </div>
            <h2 className="text-xl font-semibold">Configuración</h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 hover:bg-white/20 rounded-xl transition-colors"
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
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all"
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
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all"
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
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all"
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
                className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all"
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
              className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all"
              placeholder="escuela@email.com"
            />
          </div>

          {/* Sistema de mora y suspensión */}
          <div className="border-t pt-4 mt-2 space-y-4">
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">⏱ Control de cobros — Mensualidades</p>
              {/* Línea de tiempo visual */}
              <div className="flex items-center gap-1 text-[10px] font-semibold mb-3 overflow-x-auto pb-1">
                <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-lg whitespace-nowrap">Al día</span>
                <span className="text-gray-300">→</span>
                <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg whitespace-nowrap">Gracia</span>
                <span className="text-gray-300">→</span>
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded-lg whitespace-nowrap">Vencida</span>
                <span className="text-gray-300">→</span>
                <span className="px-2 py-1 bg-rose-100 text-rose-700 rounded-lg whitespace-nowrap">Suspendida</span>
                <span className="text-gray-300">→</span>
                <span className="px-2 py-1 bg-slate-100 text-slate-500 rounded-lg whitespace-nowrap">Inactiva</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-amber-700 mb-1">
                  Días de gracia
                </label>
                <input
                  type="number"
                  min={0}
                  max={15}
                  value={formData.grace_days}
                  onChange={(e) => setFormData({...formData, grace_days: parseInt(e.target.value) || 0})}
                  className="w-full px-3 py-2 border-2 border-amber-200 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 outline-none transition-all text-center font-bold"
                />
                <p className="text-[10px] text-gray-400 mt-1 text-center">Puede asistir</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-red-600 mb-1">
                  Días hasta suspender
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={formData.mora_days}
                  onChange={(e) => setFormData({...formData, mora_days: parseInt(e.target.value) || 20})}
                  className="w-full px-3 py-2 border-2 border-red-200 rounded-xl focus:ring-2 focus:ring-red-400 focus:border-red-400 outline-none transition-all text-center font-bold"
                />
                <p className="text-[10px] text-gray-400 mt-1 text-center">Se suspende</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  ⚫ Días hasta inactivar
                </label>
                <input
                  type="number"
                  min={21}
                  max={180}
                  value={formData.auto_inactive_days}
                  onChange={(e) => setFormData({...formData, auto_inactive_days: parseInt(e.target.value) || 60})}
                  className="w-full px-3 py-2 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-slate-400 focus:border-slate-400 outline-none transition-all text-center font-bold"
                />
                <p className="text-[10px] text-gray-400 mt-1 text-center">Inactiva total</p>
              </div>
            </div>
            <p className="text-[10px] text-gray-400">
              Ejemplo con valores actuales: gracia días 1–{formData.grace_days} → vencida días {formData.grace_days + 1}–{formData.mora_days} → suspendida días {formData.mora_days + 1}–{formData.auto_inactive_days} → inactiva día {formData.auto_inactive_days + 1}+
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Logo
            </label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setFormData({...formData, logo_url: '/logo.png'})}
                className={`flex-1 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
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
                className={`flex-1 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${
                  !formData.logo_url || formData.logo_url === ''
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Sin logo
              </button>
            </div>
            {formData.logo_url && (
              <div className="mt-2 p-3 bg-gray-50 rounded-xl border">
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
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  <Lock size={16} />
                  {formData.security_pin ? 'Cambiar PIN' : 'Configurar PIN'}
                </button>
              </div>
            ) : (
              <div className="space-y-3 bg-gray-50 p-4 rounded-xl">
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
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-center tracking-widest outline-none transition-all"
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
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-center tracking-widest outline-none transition-all"
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
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-center tracking-widest outline-none transition-all"
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
                    className="flex-1 px-3 py-2 border text-gray-600 rounded-xl text-sm active:scale-95 transition-all"
                  >
                    Cancelar
                  </button>
                  {formData.security_pin && (
                    <button
                      type="button"
                      onClick={handleRemovePin}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-xl text-sm active:scale-95 transition-all"
                    >
                      Quitar PIN
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handlePinChange}
                    className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-xl text-sm active:scale-95 transition-all"
                  >
                    Guardar PIN
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* MailerLite Email Marketing */}
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Mail size={16} className="text-green-600" />
              <label className="text-sm font-medium text-gray-700">MailerLite (Email Marketing)</label>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Sincroniza emails de nuevos alumnos con MailerLite al registrarlos.
            </p>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">API Key</label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={formData.mailerlite_api_key}
                    onChange={(e) => setFormData({...formData, mailerlite_api_key: e.target.value})}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 pr-10 text-sm outline-none transition-all"
                    placeholder="eyJ0eXAiOiJKV1QiLCJhbGciOi..."
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    aria-label={showApiKey ? 'Ocultar API key' : 'Mostrar API key'}
                  >
                    {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Group ID — Alumnos (opcional)</label>
                <input
                  type="text"
                  value={formData.mailerlite_group_id}
                  onChange={(e) => setFormData({...formData, mailerlite_group_id: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 text-sm outline-none transition-all"
                  placeholder="123456789"
                />
                <p className="text-xs text-gray-400 mt-1">Grupo MailerLite donde se agregan padres y alumnas.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Group ID — Instructoras (opcional)</label>
                <input
                  type="text"
                  value={formData.mailerlite_instructors_group_id}
                  onChange={(e) => setFormData({...formData, mailerlite_instructors_group_id: e.target.value})}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 text-sm outline-none transition-all"
                  placeholder="987654321"
                />
                <p className="text-xs text-gray-400 mt-1">Grupo MailerLite para la automatización de Bienvenida Instructoras.</p>
              </div>
            </div>
          </div>

          {/* Datos Bancarios (Portal del Cliente) */}
          <div className="border-t pt-4 mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Landmark size={16} className="text-blue-600" />
              <label className="text-sm font-medium text-gray-700">Datos Bancarios</label>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Se muestran a los clientes en el portal de pagos para que hagan transferencias.
            </p>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Banco</label>
                  <select
                    value={formData.bank_name}
                    onChange={(e) => setFormData({...formData, bank_name: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 text-sm outline-none transition-all"
                  >
                    <option value="">Seleccionar...</option>
                    <option value="Banco Pichincha">Banco Pichincha</option>
                    <option value="Banco del Pacífico">Banco del Pacífico</option>
                    <option value="Banco de Guayaquil">Banco de Guayaquil</option>
                    <option value="Banco Bolivariano">Banco Bolivariano</option>
                    <option value="Banco del Austro">Banco del Austro</option>
                    <option value="Banco Internacional">Banco Internacional</option>
                    <option value="Banco Solidario">Banco Solidario</option>
                    <option value="Banco ProCredit">Banco ProCredit</option>
                    <option value="BanEcuador">BanEcuador</option>
                    <option value="Produbanco">Produbanco</option>
                    <option value="Cooperativa JEP">Cooperativa JEP</option>
                    <option value="Cooperativa Jardín Azuayo">Cooperativa Jardín Azuayo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de cuenta</label>
                  <select
                    value={formData.bank_account_type}
                    onChange={(e) => setFormData({...formData, bank_account_type: e.target.value})}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 text-sm outline-none transition-all"
                  >
                    <option value="Ahorros">Ahorros</option>
                    <option value="Corriente">Corriente</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Número de cuenta</label>
                <input
                  type="text"
                  value={formData.bank_account_number}
                  onChange={(e) => setFormData({...formData, bank_account_number: e.target.value})}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 text-sm outline-none transition-all"
                  placeholder="2200123456"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Titular de la cuenta</label>
                <input
                  type="text"
                  value={formData.bank_account_holder}
                  onChange={(e) => setFormData({...formData, bank_account_holder: e.target.value})}
                  className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 text-sm outline-none transition-all"
                  placeholder="Nombre del titular"
                />
              </div>
            </div>
          </div>

          {/* Backup Export */}
          <BackupExport settings={settings} />

          {/* Meta Offline Conversions */}
          <div className="border-t pt-4 mt-2">
            <MetaOfflineExport />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 text-white rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-all btn-primary-gradient"
            >
              <Check size={20} />
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
