import { useState, useEffect } from 'react'
import { X, Check, Building2, Lock, Eye, EyeOff, Shield, Mail, Landmark, MessageCircle, Database } from 'lucide-react'
import BackupExport from './BackupExport'
import { supabase } from '../lib/supabase'

const TABS = [
  { id: 'general',      label: 'General',      icon: Building2   },
  { id: 'seguridad',    label: 'Seguridad',    icon: Shield      },
  { id: 'integraciones',label: 'Integraciones',icon: MessageCircle },
  { id: 'portal',       label: 'Portal',       icon: Landmark    },
]

export default function SettingsModal({ settings, onClose, onSave }) {
  const [activeTab, setActiveTab] = useState('general')
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    logo_url: '',
    ruc: '',
    security_pin: '',
    auto_inactive_days: 10,
    mailerlite_api_key: '',
    mailerlite_group_id: '',
    mailerlite_instructors_group_id: '',
    bank_name: '',
    bank_account_number: '',
    bank_account_holder: '',
    bank_account_type: 'Ahorros',
    whatsapp_phone_id:  '',
    whatsapp_token:     '',
    telegram_bot_token: '',
    telegram_chat_id:   '',
    whatsapp_enabled:   false,
  })
  const [loading, setLoading] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [showApiKey, setShowApiKey] = useState(false)
  const [showWaToken, setShowWaToken] = useState(false)
  const [showTgToken, setShowTgToken] = useState(false)
  const [changingPin, setChangingPin] = useState(false)
  const [currentPinInput, setCurrentPinInput] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')

  useEffect(() => {
    if (settings) {
      setFormData({
        name:                            settings.name                            || '',
        address:                         settings.address                         || '',
        phone:                           settings.phone                           || '',
        email:                           settings.email                           || '',
        logo_url:                        settings.logo_url                        || '',
        ruc:                             settings.ruc                             || '',
        security_pin:                    settings.security_pin                    || '',
        auto_inactive_days:              settings.auto_inactive_days              ?? 10,
        mailerlite_api_key:              settings.mailerlite_api_key              || '',
        mailerlite_group_id:             settings.mailerlite_group_id             || '',
        mailerlite_instructors_group_id: settings.mailerlite_instructors_group_id || '',
        bank_name:                       settings.bank_name                       || '',
        bank_account_number:             settings.bank_account_number             || '',
        bank_account_holder:             settings.bank_account_holder             || '',
        bank_account_type:               settings.bank_account_type               || 'Ahorros',
        whatsapp_phone_id:               settings.whatsapp_phone_id               || '',
        whatsapp_token:                  settings.whatsapp_token                  || '',
        telegram_bot_token:              settings.telegram_bot_token              || '',
        telegram_chat_id:                settings.telegram_chat_id                || '',
        whatsapp_enabled:                settings.whatsapp_enabled                ?? false,
      })
    }
  }, [settings])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setSaveError('')
    try {
      await onSave(formData)
      onClose()
    } catch (err) {
      console.error('Error saving settings:', err)
      setSaveError('Error al guardar. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handlePinChange = () => {
    setPinError('')
    if (formData.security_pin && currentPinInput !== formData.security_pin) {
      setPinError('PIN actual incorrecto'); return
    }
    if (newPin.length < 4) { setPinError('El PIN debe tener al menos 4 dígitos'); return }
    if (newPin !== confirmPin) { setPinError('Los PINs no coinciden'); return }
    setFormData({ ...formData, security_pin: newPin })
    setChangingPin(false); setCurrentPinInput(''); setNewPin(''); setConfirmPin(''); setPinError('')
  }

  const handleRemovePin = () => {
    if (currentPinInput !== formData.security_pin) { setPinError('PIN actual incorrecto'); return }
    setFormData({ ...formData, security_pin: '' })
    setChangingPin(false); setCurrentPinInput(''); setPinError('')
  }

  const fd = formData
  const set = (key, val) => setFormData(f => ({ ...f, [key]: val }))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="p-5 bg-gradient-to-r from-purple-600 to-purple-800 text-white flex items-center justify-between rounded-t-2xl shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl"><Building2 size={22} /></div>
            <h2 className="text-lg font-semibold">Configuración</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50 shrink-0">
          {TABS.map(tab => {
            const Icon = tab.icon
            const active = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex flex-col items-center gap-1 py-2.5 text-xs font-medium transition-all border-b-2 ${
                  active
                    ? 'border-purple-600 text-purple-700 bg-white'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon size={15} />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab content — scrollable */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-5 space-y-4">

            {/* ── TAB: GENERAL ─────────────────────────────────────────────── */}
            {activeTab === 'general' && <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Escuela *</label>
                <input
                  type="text" required value={fd.name}
                  onChange={e => set('name', e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                  placeholder="Escuela de Danza"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <input
                  type="text" value={fd.address}
                  onChange={e => set('address', e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                  placeholder="Alborada - Guayaquil"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                  <input
                    type="tel" value={fd.phone}
                    onChange={e => set('phone', e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                    placeholder="0999..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">RUC</label>
                  <input
                    type="text" value={fd.ruc}
                    onChange={e => set('ruc', e.target.value)}
                    className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                    placeholder="0912345678001"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email" value={fd.email}
                  onChange={e => set('email', e.target.value)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                  placeholder="escuela@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Días para inactivar alumna</label>
                <input
                  type="number" min={1} max={90} value={fd.auto_inactive_days}
                  onChange={e => set('auto_inactive_days', parseInt(e.target.value) || 10)}
                  className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                />
                <p className="text-xs text-gray-400 mt-1">Días sin pagar antes de marcarla como "Inactiva" automáticamente.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Logo</label>
                <div className="flex gap-2 mb-2">
                  <button type="button" onClick={() => set('logo_url', '/logo.png')}
                    className={`flex-1 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${fd.logo_url === '/logo.png' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-gray-300'}`}>
                    Usar logo local
                  </button>
                  <button type="button" onClick={() => set('logo_url', '')}
                    className={`flex-1 px-3 py-2 rounded-xl border-2 text-sm font-medium transition-all ${!fd.logo_url ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-gray-300'}`}>
                    Sin logo
                  </button>
                </div>
                {fd.logo_url && (
                  <div className="p-3 bg-gray-50 rounded-xl border text-center">
                    <p className="text-xs text-gray-500 mb-2">Vista previa:</p>
                    <img src={fd.logo_url} alt="Preview" className="h-10 max-w-[100px] mx-auto object-contain"
                      onError={e => { e.target.onerror = null; e.target.src = '' }} />
                  </div>
                )}
              </div>
            </>}

            {/* ── TAB: SEGURIDAD ───────────────────────────────────────────── */}
            {activeTab === 'seguridad' && <>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Shield size={16} className="text-red-500" /> PIN de Seguridad
                </span>
                {fd.security_pin
                  ? <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">✓ Configurado</span>
                  : <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Sin protección</span>
                }
              </div>
              <p className="text-xs text-gray-500">
                {fd.security_pin
                  ? 'El PIN protege la eliminación de registros y el acceso a configuración.'
                  : 'Configura un PIN para proteger la eliminación de registros y esta sección.'}
              </p>
              {!changingPin ? (
                <button type="button" onClick={() => setChangingPin(true)}
                  className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 text-sm font-medium flex items-center justify-center gap-2 active:scale-95 transition-all">
                  <Lock size={16} />
                  {fd.security_pin ? 'Cambiar PIN' : 'Configurar PIN'}
                </button>
              ) : (
                <div className="space-y-3 bg-gray-50 p-4 rounded-xl">
                  {fd.security_pin && (
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">PIN actual</label>
                      <input type="password" inputMode="numeric" maxLength={6} value={currentPinInput}
                        onChange={e => { setCurrentPinInput(e.target.value.replace(/\D/g, '')); setPinError('') }}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-center tracking-widest outline-none transition-all"
                        placeholder="••••" />
                    </div>
                  )}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">{fd.security_pin ? 'Nuevo PIN' : 'PIN'} (4-6 dígitos)</label>
                    <input type="password" inputMode="numeric" maxLength={6} value={newPin}
                      onChange={e => { setNewPin(e.target.value.replace(/\D/g, '')); setPinError('') }}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-center tracking-widest outline-none transition-all"
                      placeholder="••••" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Confirmar PIN</label>
                    <input type="password" inputMode="numeric" maxLength={6} value={confirmPin}
                      onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, '')); setPinError('') }}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-center tracking-widest outline-none transition-all"
                      placeholder="••••" />
                  </div>
                  {pinError && <p className="text-red-500 text-xs text-center">{pinError}</p>}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setChangingPin(false); setCurrentPinInput(''); setNewPin(''); setConfirmPin(''); setPinError('') }}
                      className="flex-1 px-3 py-2 border text-gray-600 rounded-xl text-sm active:scale-95 transition-all">
                      Cancelar
                    </button>
                    {fd.security_pin && (
                      <button type="button" onClick={handleRemovePin}
                        className="px-3 py-2 bg-red-100 text-red-700 rounded-xl text-sm active:scale-95 transition-all">
                        Quitar PIN
                      </button>
                    )}
                    <button type="button" onClick={handlePinChange}
                      className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-xl text-sm active:scale-95 transition-all">
                      Guardar PIN
                    </button>
                  </div>
                </div>
              )}
            </>}

            {/* ── TAB: INTEGRACIONES ───────────────────────────────────────── */}
            {activeTab === 'integraciones' && <>
              {/* MailerLite */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Mail size={15} className="text-green-600" />
                  <span className="text-sm font-medium text-gray-700">MailerLite</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">Sincroniza emails de nuevos alumnos al registrarlos.</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">API Key</label>
                    <div className="relative">
                      <input type={showApiKey ? 'text' : 'password'} value={fd.mailerlite_api_key}
                        onChange={e => set('mailerlite_api_key', e.target.value)}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 pr-10 text-sm outline-none transition-all font-mono"
                        placeholder="eyJ0eXAiOiJKV1Qi..." />
                      <button type="button" onClick={() => setShowApiKey(!showApiKey)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Group ID — Alumnos</label>
                    <input type="text" value={fd.mailerlite_group_id}
                      onChange={e => set('mailerlite_group_id', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm outline-none transition-all"
                      placeholder="123456789" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Group ID — Instructoras</label>
                    <input type="text" value={fd.mailerlite_instructors_group_id}
                      onChange={e => set('mailerlite_instructors_group_id', e.target.value)}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm outline-none transition-all"
                      placeholder="987654321" />
                  </div>
                </div>
              </div>

              {/* WhatsApp API */}
              <div className="border-t pt-4 mt-2">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <MessageCircle size={15} className="text-green-500" />
                    <span className="text-sm font-medium text-gray-700">WhatsApp API</span>
                  </div>
                  <button type="button"
                    onClick={() => setFormData(f => ({ ...f, whatsapp_enabled: !f.whatsapp_enabled }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${fd.whatsapp_enabled ? 'bg-green-500' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${fd.whatsapp_enabled ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
                <p className={`text-xs mb-3 ${fd.whatsapp_enabled ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                  {fd.whatsapp_enabled
                    ? '✅ Activo — comprobantes y recordatorios automáticos.'
                    : '⏸️ En pausa — activa cuando estés listo para producción.'}
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Phone Number ID</label>
                    <input type="text" value={fd.whatsapp_phone_id}
                      onChange={e => set('whatsapp_phone_id', e.target.value.trim())}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 text-sm outline-none transition-all font-mono"
                      placeholder="123456789012345" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Access Token (Meta)</label>
                    <div className="relative">
                      <input type={showWaToken ? 'text' : 'password'} value={fd.whatsapp_token}
                        onChange={e => set('whatsapp_token', e.target.value.trim())}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 pr-10 text-sm outline-none transition-all font-mono"
                        placeholder="EAAxxxxx..." />
                      <button type="button" onClick={() => setShowWaToken(!showWaToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showWaToken ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Telegram Bot Token</label>
                    <div className="relative">
                      <input type={showTgToken ? 'text' : 'password'} value={fd.telegram_bot_token}
                        onChange={e => set('telegram_bot_token', e.target.value.trim())}
                        className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 pr-10 text-sm outline-none transition-all font-mono"
                        placeholder="123456:ABCxxx..." />
                      <button type="button" onClick={() => setShowTgToken(!showTgToken)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                        {showTgToken ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Telegram Chat ID</label>
                    <input type="text" value={fd.telegram_chat_id}
                      onChange={e => set('telegram_chat_id', e.target.value.trim())}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 text-sm outline-none transition-all font-mono"
                      placeholder="-100123456789" />
                  </div>
                </div>
              </div>
            </>}

            {/* ── TAB: PORTAL ──────────────────────────────────────────────── */}
            {activeTab === 'portal' && <>
              {/* Datos Bancarios */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Landmark size={15} className="text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">Datos Bancarios</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">Se muestran a los clientes en el portal de pagos para transferencias.</p>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Banco</label>
                      <select value={fd.bank_name} onChange={e => set('bank_name', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm outline-none transition-all">
                        <option value="">Seleccionar...</option>
                        <option>Banco Pichincha</option>
                        <option>Banco del Pacífico</option>
                        <option>Banco de Guayaquil</option>
                        <option>Banco Bolivariano</option>
                        <option>Banco del Austro</option>
                        <option>Banco Internacional</option>
                        <option>Banco Solidario</option>
                        <option>Banco ProCredit</option>
                        <option>BanEcuador</option>
                        <option>Produbanco</option>
                        <option>Cooperativa JEP</option>
                        <option>Cooperativa Jardín Azuayo</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de cuenta</label>
                      <select value={fd.bank_account_type} onChange={e => set('bank_account_type', e.target.value)}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm outline-none transition-all">
                        <option>Ahorros</option>
                        <option>Corriente</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Número de cuenta</label>
                    <input type="text" value={fd.bank_account_number}
                      onChange={e => set('bank_account_number', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm outline-none transition-all"
                      placeholder="2200123456" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Titular de la cuenta</label>
                    <input type="text" value={fd.bank_account_holder}
                      onChange={e => set('bank_account_holder', e.target.value)}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 text-sm outline-none transition-all"
                      placeholder="Nombre del titular" />
                  </div>
                </div>
              </div>

              {/* Backup */}
              <div className="border-t pt-4 mt-2">
                <div className="flex items-center gap-2 mb-1">
                  <Database size={15} className="text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">Respaldo de Datos</span>
                </div>
                <BackupExport settings={settings} />
              </div>
            </>}

          </div>

          {/* Footer — fijo al fondo */}
          <div className="p-4 border-t bg-gray-50 rounded-b-2xl shrink-0">
            {saveError && (
              <p className="text-red-600 text-xs mb-2 text-center">{saveError}</p>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={onClose}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 active:scale-95 transition-all text-sm font-medium">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="flex-1 px-4 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-all text-sm font-medium">
                <Check size={18} />
                {loading ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </form>

      </div>
    </div>
  )
}
