import { useState, useEffect } from 'react'
import { X, Check, CreditCard, Banknote, Smartphone, Building2, AlertCircle, Percent, Tag } from 'lucide-react'
import { getCourseById, BANKS } from '../lib/courses'
import { usePayments } from '../hooks/usePayments'
import { getTodayEC } from '../lib/dateUtils'

const PAYMENT_METHODS = [
  { id: 'efectivo', name: 'Efectivo', icon: Banknote },
  { id: 'transferencia', name: 'Transferencia', icon: Smartphone },
  { id: 'tarjeta', name: 'Tarjeta', icon: CreditCard },
]

export default function PaymentModal({
  student,
  onClose,
  onPaymentComplete
}) {
  const { generateReceiptNumber } = usePayments()
  const [receiptNumber, setReceiptNumber] = useState('')
  const [loading, setLoading] = useState(false)

  const course = getCourseById(student?.course_id)
  const coursePrice = course?.price || 0
  const allowsInstallments = course?.allowsInstallments || false
  const installmentCount = course?.installmentCount || 2
  const isRecurring = course?.priceType === 'mes' || course?.priceType === 'paquete'

  // Calcular saldo pendiente del estudiante (funciona para programas, mensuales y paquetes)
  const amountPaid = parseFloat(student?.amount_paid || 0)
  const totalPrice = isRecurring ? coursePrice : parseFloat(student?.total_program_price || coursePrice)
  const balance = totalPrice - amountPaid
  const hasBalance = amountPaid > 0 && balance > 0

  // Estado de descuento
  const [discountEnabled, setDiscountEnabled] = useState(false)
  const [discountType, setDiscountType] = useState('fixed') // 'fixed' o 'percent'
  const [discountValue, setDiscountValue] = useState('')
  const [customFinalPrice, setCustomFinalPrice] = useState('')

  const [formData, setFormData] = useState({
    amount: '',
    paymentMethod: 'efectivo',
    paymentType: 'full', // full, installment, balance
    paymentDate: getTodayEC(),
    bankId: '',
    transferReceipt: '',
    notes: ''
  })

  useEffect(() => {
    if (student && course) {
      let initialAmount = coursePrice
      let initialPaymentType = 'full'

      if (hasBalance) {
        initialAmount = balance
        initialPaymentType = 'balance'
      } else if (course.priceType === 'mes' || course.priceType === 'paquete') {
        initialAmount = coursePrice
        initialPaymentType = 'full'
      }

      setFormData(prev => ({
        ...prev,
        amount: initialAmount.toString(),
        paymentType: initialPaymentType
      }))

      generateReceiptNumber().then(num => setReceiptNumber(num))
    }
  }, [student, course])

  // Calcular monto final con descuento
  const getBaseAmount = () => {
    if (formData.paymentType === 'balance') return balance
    if (formData.paymentType === 'installment') return coursePrice / installmentCount
    return hasBalance ? balance : coursePrice
  }

  const calculateDiscountedAmount = () => {
    const base = getBaseAmount()
    if (!discountEnabled) return base

    if (customFinalPrice !== '') {
      const custom = parseFloat(customFinalPrice)
      return isNaN(custom) ? base : custom
    }

    if (discountValue === '' || isNaN(parseFloat(discountValue))) return base

    const val = parseFloat(discountValue)
    if (discountType === 'percent') {
      return Math.max(0, base - (base * val / 100))
    }
    return Math.max(0, base - val)
  }

  const getDiscountAmount = () => {
    const base = getBaseAmount()
    const final = calculateDiscountedAmount()
    return base - final
  }

  // Actualizar el monto cuando cambia el descuento
  useEffect(() => {
    if (discountEnabled) {
      const discounted = calculateDiscountedAmount()
      setFormData(prev => ({ ...prev, amount: discounted.toFixed(2), paymentType: prev.paymentType === 'custom' ? prev.paymentType : prev.paymentType }))
    }
  }, [discountEnabled, discountType, discountValue, customFinalPrice])

  const handlePaymentTypeChange = (type) => {
    let newAmount = coursePrice

    if (type === 'full') {
      newAmount = hasBalance ? balance : coursePrice
    } else if (type === 'installment') {
      newAmount = coursePrice / installmentCount
    } else if (type === 'balance') {
      newAmount = balance
    }

    // Si hay descuento activo, recalcular
    if (discountEnabled && type !== 'custom') {
      // Resetear descuento al cambiar tipo
    }

    setFormData({
      ...formData,
      paymentType: type,
      amount: newAmount.toFixed(2)
    })

    // Resetear descuento al cambiar tipo de pago
    if (discountEnabled) {
      setDiscountEnabled(false)
      setDiscountValue('')
      setCustomFinalPrice('')
    }
  }

  const handleToggleDiscount = () => {
    if (discountEnabled) {
      // Desactivar: restaurar precio original
      setDiscountEnabled(false)
      setDiscountValue('')
      setCustomFinalPrice('')
      const base = getBaseAmount()
      setFormData(prev => ({ ...prev, amount: base.toFixed(2) }))
    } else {
      setDiscountEnabled(true)
    }
  }

  const handleDiscountValueChange = (val) => {
    setDiscountValue(val)
    setCustomFinalPrice('') // Limpiar precio personalizado
    const base = getBaseAmount()
    const numVal = parseFloat(val)
    if (!isNaN(numVal) && numVal > 0) {
      let discounted
      if (discountType === 'percent') {
        discounted = Math.max(0, base - (base * numVal / 100))
      } else {
        discounted = Math.max(0, base - numVal)
      }
      setFormData(prev => ({ ...prev, amount: discounted.toFixed(2) }))
    } else {
      setFormData(prev => ({ ...prev, amount: base.toFixed(2) }))
    }
  }

  const handleCustomFinalPriceChange = (val) => {
    setCustomFinalPrice(val)
    setDiscountValue('') // Limpiar descuento
    const numVal = parseFloat(val)
    if (!isNaN(numVal) && numVal >= 0) {
      setFormData(prev => ({ ...prev, amount: numVal.toFixed(2) }))
    }
  }

  const handleDiscountTypeChange = (type) => {
    setDiscountType(type)
    // Recalcular con el nuevo tipo
    if (discountValue) {
      const base = getBaseAmount()
      const numVal = parseFloat(discountValue)
      if (!isNaN(numVal) && numVal > 0) {
        let discounted
        if (type === 'percent') {
          discounted = Math.max(0, base - (base * numVal / 100))
        } else {
          discounted = Math.max(0, base - numVal)
        }
        setFormData(prev => ({ ...prev, amount: discounted.toFixed(2) }))
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const selectedBank = BANKS.find(b => b.id === formData.bankId)

      // Convertir 'custom' a 'full' para la base de datos
      let dbPaymentType = formData.paymentType
      if (dbPaymentType === 'custom') {
        dbPaymentType = 'full'
      }

      const discountInfo = discountEnabled ? {
        hasDiscount: true,
        originalPrice: getBaseAmount(),
        discountType: customFinalPrice !== '' ? 'custom' : discountType,
        discountValue: customFinalPrice !== '' ? (getBaseAmount() - parseFloat(formData.amount)).toFixed(2) : discountValue,
        discountAmount: getDiscountAmount().toFixed(2)
      } : null

      const paymentData = {
        amount: parseFloat(formData.amount),
        receiptNumber,
        paymentMethod: PAYMENT_METHODS.find(m => m.id === formData.paymentMethod)?.name || 'Efectivo',
        paymentType: dbPaymentType,
        paymentDate: formData.paymentDate,
        bankName: selectedBank?.name || null,
        transferReceipt: formData.transferReceipt || null,
        notes: formData.notes,
        coursePrice: coursePrice,
        courseName: course?.name || 'Sin curso',
        // Datos de descuento
        discount: discountInfo
      }

      await onPaymentComplete(student.id, paymentData)
    } catch (err) {
      console.error('Error processing payment:', err)
      alert('Error al procesar el pago')
    } finally {
      setLoading(false)
    }
  }

  if (!student) return null

  const baseAmount = getBaseAmount()
  const finalAmount = parseFloat(formData.amount || 0)
  const showDiscountSummary = discountEnabled && finalAmount < baseAmount

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">Registrar Pago</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Comprobante N° {receiptNumber}
          </p>
        </div>

        {/* Student Info */}
        <div className="px-6 py-4 bg-purple-50 border-b">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 text-purple-700 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg">
              {student.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-800">{student.name}</p>
              <p className="text-sm text-gray-600">{course?.name || 'Sin curso'}</p>
            </div>
          </div>
        </div>

        {/* Course Price Info */}
        <div className="px-6 py-4 bg-gray-50 border-b">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">Precio del curso:</span>
            <span className={`text-xl font-bold ${discountEnabled ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
              ${coursePrice.toFixed(2)}
            </span>
          </div>

          {/* Precio con descuento */}
          {showDiscountSummary && (
            <div className="flex justify-between items-center mt-1">
              <span className="text-green-700 font-medium flex items-center gap-1">
                <Tag size={14} />
                Con descuento:
              </span>
              <span className="text-xl font-bold text-green-700">${finalAmount.toFixed(2)}</span>
            </div>
          )}

          {hasBalance && (
            <div className="mt-2 p-3 bg-orange-100 border border-orange-200 rounded-lg">
              <div className="flex items-center gap-2 text-orange-700">
                <AlertCircle size={18} />
                <span className="font-medium">Tiene saldo pendiente</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-gray-500">Pagado:</p>
                  <p className="font-semibold text-green-600">${amountPaid.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Saldo:</p>
                  <p className="font-semibold text-orange-600">${balance.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total:</p>
                  <p className="font-semibold text-gray-700">${totalPrice.toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}

          {allowsInstallments && !hasBalance && (
            <p className="text-xs text-purple-600 mt-2">
              Este programa permite pagar en {installmentCount} cuotas de ${(coursePrice / installmentCount).toFixed(2)}
            </p>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Payment Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de pago
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Pago Completo */}
              <button
                type="button"
                onClick={() => handlePaymentTypeChange('full')}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  formData.paymentType === 'full'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <p className="font-semibold">{hasBalance ? 'Saldar' : 'Completo'}</p>
                  <p className="text-xs mt-1">${hasBalance ? balance.toFixed(2) : coursePrice.toFixed(2)}</p>
                </div>
              </button>

              {/* Abono (solo si el curso lo permite y no tiene saldo) */}
              {allowsInstallments && !hasBalance && (
                <button
                  type="button"
                  onClick={() => handlePaymentTypeChange('installment')}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    formData.paymentType === 'installment'
                      ? 'border-orange-500 bg-orange-50 text-orange-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <p className="font-semibold">Abono</p>
                    <p className="text-xs mt-1">${(coursePrice / installmentCount).toFixed(2)}</p>
                  </div>
                </button>
              )}

              {/* Saldo (si tiene abono previo) */}
              {hasBalance && (
                <button
                  type="button"
                  onClick={() => handlePaymentTypeChange('balance')}
                  className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                    formData.paymentType === 'balance'
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-center">
                    <p className="font-semibold">Saldo</p>
                    <p className="text-xs mt-1">${balance.toFixed(2)}</p>
                  </div>
                </button>
              )}

              {/* Otro monto */}
              <button
                type="button"
                onClick={() => setFormData({...formData, paymentType: 'custom', amount: ''})}
                className={`p-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  formData.paymentType === 'custom'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <p className="font-semibold">Otro</p>
                  <p className="text-xs mt-1">Monto libre</p>
                </div>
              </button>
            </div>
          </div>

          {/* Discount Section */}
          <div className={`border-2 rounded-xl transition-all ${discountEnabled ? 'border-green-400 bg-green-50' : 'border-dashed border-gray-300'}`}>
            {/* Toggle de descuento */}
            <button
              type="button"
              onClick={handleToggleDiscount}
              className={`w-full p-3 flex items-center justify-between rounded-t-xl transition-colors ${
                discountEnabled ? 'bg-green-100 text-green-800' : 'hover:bg-gray-50 text-gray-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <Tag size={18} className={discountEnabled ? 'text-green-600' : 'text-gray-400'} />
                <span className="font-medium text-sm">Aplicar Descuento</span>
              </div>
              <div className={`w-10 h-6 rounded-full transition-colors flex items-center ${
                discountEnabled ? 'bg-green-500 justify-end' : 'bg-gray-300 justify-start'
              }`}>
                <div className="w-5 h-5 bg-white rounded-full shadow mx-0.5" />
              </div>
            </button>

            {/* Controles de descuento */}
            {discountEnabled && (
              <div className="p-3 space-y-3">
                {/* Precio original bloqueado */}
                <div className="flex items-center justify-between bg-white rounded-lg p-2 border border-gray-200">
                  <span className="text-sm text-gray-500">Precio regular:</span>
                  <span className="text-lg font-bold text-gray-400 line-through">${baseAmount.toFixed(2)}</span>
                </div>

                {/* Tipo de descuento */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDiscountTypeChange('fixed')}
                    className={`p-2 rounded-lg border text-sm font-medium transition-all text-center ${
                      discountType === 'fixed' && customFinalPrice === ''
                        ? 'border-green-500 bg-green-100 text-green-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <DollarIcon size={16} className="inline mr-1" />
                    Monto fijo
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDiscountTypeChange('percent')}
                    className={`p-2 rounded-lg border text-sm font-medium transition-all text-center ${
                      discountType === 'percent' && customFinalPrice === ''
                        ? 'border-green-500 bg-green-100 text-green-700'
                        : 'border-gray-200 hover:border-gray-300 text-gray-600'
                    }`}
                  >
                    <Percent size={16} className="inline mr-1" />
                    Porcentaje
                  </button>
                </div>

                {/* Input de descuento */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    {discountType === 'percent' ? 'Porcentaje de descuento' : 'Monto del descuento'}
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                      {discountType === 'percent' ? '%' : '$'}
                    </span>
                    <input
                      type="number"
                      min="0"
                      max={discountType === 'percent' ? '100' : baseAmount}
                      step="0.01"
                      value={discountValue}
                      onChange={(e) => handleDiscountValueChange(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                      placeholder={discountType === 'percent' ? 'Ej: 10' : 'Ej: 5.00'}
                    />
                  </div>
                </div>

                {/* Separador */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 border-t border-gray-300" />
                  <span className="text-xs text-gray-400">o</span>
                  <div className="flex-1 border-t border-gray-300" />
                </div>

                {/* Precio final personalizado */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">
                    Asignar precio final directamente
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={customFinalPrice}
                      onChange={(e) => handleCustomFinalPriceChange(e.target.value)}
                      className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                      placeholder="Ej: 30.00"
                    />
                  </div>
                </div>

                {/* Resumen del descuento */}
                {showDiscountSummary && (
                  <div className="bg-white rounded-lg p-2 border border-green-200 text-center">
                    <span className="text-xs text-gray-500">Ahorro: </span>
                    <span className="text-sm font-bold text-green-600">
                      -${(baseAmount - finalAmount).toFixed(2)}
                      {discountType === 'percent' && discountValue && customFinalPrice === '' && (
                        <span className="text-xs font-normal text-gray-500 ml-1">({discountValue}%)</span>
                      )}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Amount and Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto a pagar *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => {
                    setFormData({...formData, amount: e.target.value, paymentType: 'custom'})
                    if (discountEnabled) {
                      setDiscountEnabled(false)
                      setDiscountValue('')
                      setCustomFinalPrice('')
                    }
                  }}
                  className={`w-full pl-8 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg font-semibold ${
                    discountEnabled ? 'bg-green-50 border-green-300 text-green-700' : ''
                  }`}
                  readOnly={discountEnabled}
                />
              </div>
              {discountEnabled && (
                <p className="text-xs text-green-600 mt-1">Precio con descuento aplicado</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha del pago
              </label>
              <input
                type="date"
                value={formData.paymentDate}
                onChange={(e) => setFormData({...formData, paymentDate: e.target.value})}
                className="w-full px-3 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          {/* Payment Method */}
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
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
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

          {/* Bank Selection (solo para transferencia) */}
          {formData.paymentMethod === 'transferencia' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Building2 size={16} className="inline mr-1" />
                  Banco de origen *
                </label>
                <select
                  required
                  value={formData.bankId}
                  onChange={(e) => setFormData({...formData, bankId: e.target.value})}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Seleccionar banco</option>
                  {BANKS.map(bank => (
                    <option key={bank.id} value={bank.id}>{bank.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  N° de Comprobante *
                </label>
                <input
                  type="text"
                  required
                  value={formData.transferReceipt}
                  onChange={(e) => setFormData({...formData, transferReceipt: e.target.value})}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Ingrese número de comprobante"
                />
              </div>
            </>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notas (opcional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              rows={2}
              placeholder="Observaciones del pago..."
            />
          </div>

          {/* Summary */}
          <div className={`rounded-xl p-4 ${showDiscountSummary ? 'bg-green-50 border border-green-200' : 'bg-green-50 border border-green-200'}`}>
            {showDiscountSummary && (
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-green-200">
                <span className="text-sm text-gray-500">Precio regular:</span>
                <span className="text-sm text-gray-400 line-through">${baseAmount.toFixed(2)}</span>
              </div>
            )}
            {showDiscountSummary && (
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-green-200">
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <Tag size={14} />
                  Descuento:
                </span>
                <span className="text-sm font-medium text-green-600">-${(baseAmount - finalAmount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <div>
                <span className="text-green-700 font-medium">Total a cobrar:</span>
                {formData.paymentType === 'installment' && (
                  <p className="text-xs text-green-600">Abono (cuota {amountPaid > 0 ? '2' : '1'} de {installmentCount})</p>
                )}
                {formData.paymentType === 'balance' && (
                  <p className="text-xs text-green-600">Pago de saldo pendiente</p>
                )}
              </div>
              <span className="text-2xl font-bold text-green-700">
                ${finalAmount.toFixed(2)}
              </span>
            </div>
            {formData.paymentMethod === 'transferencia' && formData.bankId && (
              <p className="text-xs text-green-600 mt-2">
                Transferencia desde: {BANKS.find(b => b.id === formData.bankId)?.name}
              </p>
            )}
          </div>

          {/* Actions */}
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
              disabled={loading || !formData.amount || parseFloat(formData.amount) <= 0 || (formData.paymentMethod === 'transferencia' && (!formData.bankId || !formData.transferReceipt))}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Check size={20} />
              {loading ? 'Procesando...' : 'Confirmar Pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Small dollar sign icon component
function DollarIcon({ size = 16, className = '' }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  )
}
