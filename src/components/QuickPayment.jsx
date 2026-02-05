import { useState } from 'react'
import { X, Check, CreditCard, Banknote, Smartphone, Building2, Zap } from 'lucide-react'
import { BANKS } from '../lib/courses'
import { usePayments } from '../hooks/usePayments'

const PAYMENT_METHODS = [
  { id: 'efectivo', name: 'Efectivo', icon: Banknote },
  { id: 'transferencia', name: 'Transferencia', icon: Smartphone },
  { id: 'tarjeta', name: 'Tarjeta', icon: CreditCard },
]

// Clases diarias disponibles
const DAILY_CLASSES = [
  { id: 'clase-diaria-adultos', name: 'Clase Diaria - Adultos', price: 12 },
  { id: 'clase-diaria-ninos', name: 'Clase Diaria - Niños', price: 10 },
]

export default function QuickPayment({
  onClose,
  onPaymentComplete,
  settings
}) {
  const { generateReceiptNumber } = usePayments()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    customerName: '',
    customerCedula: '',
    customerPhone: '',
    classType: 'clase-diaria-adultos',
    amount: '12',
    paymentDate: new Date().toISOString().split('T')[0], // Fecha del pago (por defecto hoy)
    paymentMethod: 'efectivo',
    bankId: '',
    transferReceipt: '',
    notes: ''
  })

  const selectedClass = DAILY_CLASSES.find(c => c.id === formData.classType)

  const handleClassChange = (classId) => {
    const classInfo = DAILY_CLASSES.find(c => c.id === classId)
    setFormData({
      ...formData,
      classType: classId,
      amount: classInfo?.price?.toString() || '12'
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const receiptNumber = await generateReceiptNumber()
      const selectedBank = BANKS.find(b => b.id === formData.bankId)

      const paymentData = {
        type: 'quick', // Pago rápido
        customerName: formData.customerName,
        customerCedula: formData.customerCedula,
        customerPhone: formData.customerPhone,
        classType: formData.classType,
        className: selectedClass?.name || 'Clase Diaria',
        amount: parseFloat(formData.amount),
        receiptNumber,
        paymentMethod: PAYMENT_METHODS.find(m => m.id === formData.paymentMethod)?.name || 'Efectivo',
        bankName: selectedBank?.name || null,
        transferReceipt: formData.transferReceipt || null,
        notes: formData.notes,
        date: formData.paymentDate // Usar la fecha seleccionada
      }

      await onPaymentComplete(paymentData)
    } catch (err) {
      console.error('Error processing quick payment:', err)
      alert('Error al procesar el pago')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-yellow-50 to-orange-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="text-yellow-600" size={24} />
              <h2 className="text-xl font-semibold text-gray-800">Pago Rápido</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-sm text-gray-600 mt-1">
            Para clases diarias sin registrar alumno
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Datos del cliente */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre del cliente *
            </label>
            <input
              type="text"
              required
              value={formData.customerName}
              onChange={(e) => setFormData({...formData, customerName: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              placeholder="Nombre completo"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cédula
              </label>
              <input
                type="text"
                value={formData.customerCedula}
                onChange={(e) => setFormData({...formData, customerCedula: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="0912345678"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={formData.customerPhone}
                onChange={(e) => setFormData({...formData, customerPhone: e.target.value})}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                placeholder="0999..."
              />
            </div>
          </div>

          {/* Tipo de clase */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de clase
            </label>
            <div className="grid grid-cols-2 gap-2">
              {DAILY_CLASSES.map(cls => (
                <button
                  key={cls.id}
                  type="button"
                  onClick={() => handleClassChange(cls.id)}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    formData.classType === cls.id
                      ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <p className="font-semibold">{cls.name.replace('Clase Diaria - ', '')}</p>
                    <p className="text-lg font-bold">${cls.price}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Monto y Fecha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  required
                  min="1"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({...formData, amount: e.target.value})}
                  className="w-full pl-8 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 text-lg font-semibold"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                📅 Fecha
              </label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({...formData, paymentDate: e.target.value})}
                className="w-full px-3 py-3 border rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
              />
            </div>
          </div>

          {/* Método de pago */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Forma de pago
            </label>
            <div className="grid grid-cols-3 gap-2">
              {PAYMENT_METHODS.map(method => {
                const Icon = method.icon
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setFormData({...formData, paymentMethod: method.id, bankId: '', transferReceipt: ''})}
                    className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                      formData.paymentMethod === method.id
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <Icon size={24} />
                    <span className="text-xs font-medium">{method.name}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Banco (si es transferencia) */}
          {formData.paymentMethod === 'transferencia' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Building2 size={16} className="inline mr-1" />
                  Banco *
                </label>
                <select
                  required
                  value={formData.bankId}
                  onChange={(e) => setFormData({...formData, bankId: e.target.value})}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-yellow-500"
                >
                  <option value="">Seleccionar banco</option>
                  {BANKS.map(bank => (
                    <option key={bank.id} value={bank.id}>{bank.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  N° Comprobante *
                </label>
                <input
                  type="text"
                  required
                  value={formData.transferReceipt}
                  onChange={(e) => setFormData({...formData, transferReceipt: e.target.value})}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-yellow-500"
                  placeholder="Número de comprobante"
                />
              </div>
            </>
          )}

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas (opcional)
            </label>
            <input
              type="text"
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500"
              placeholder="Observaciones..."
            />
          </div>

          {/* Total */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-green-700 font-medium">Total a cobrar:</span>
              <span className="text-2xl font-bold text-green-700">
                ${parseFloat(formData.amount || 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !formData.customerName || !formData.amount}
              className="flex-1 px-4 py-3 bg-yellow-500 text-white rounded-xl hover:bg-yellow-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Check size={20} />
              {loading ? 'Procesando...' : 'Cobrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
