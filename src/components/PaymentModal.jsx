import { useState, useEffect } from 'react'
import { X, Check, CreditCard, Banknote, Smartphone, Building2, AlertCircle, Percent, Tag } from 'lucide-react'
import { getCourseById, BANKS } from '../lib/courses'
import { usePayments } from '../hooks/usePayments'
import { getTodayEC, formatDate, getDaysUntilDue, getLoyaltyTier, getNextClassDay, formatDateForInput } from '../lib/dateUtils'
import { useToast } from './Toast'
import Modal from './ui/Modal'

const PAYMENT_METHODS = [
  { id: 'efectivo', name: 'Efectivo', icon: Banknote },
  { id: 'transferencia', name: 'Transferencia', icon: Smartphone },
  { id: 'tarjeta', name: 'Tarjeta', icon: CreditCard },
]

export default function PaymentModal({
  student,
  autoInactiveDays = 10,
  onClose,
  onPaymentComplete
}) {
  const { generateReceiptNumber } = usePayments()
  const toast = useToast()
  const [receiptNumber, setReceiptNumber] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmStep, setConfirmStep] = useState(false)
  const [pendingPayment, setPendingPayment] = useState(null)

  const course = getCourseById(student?.course_id)
  const coursePrice = course?.price || 0
  const allowsInstallments = course?.allowsInstallments || false
  const installmentCount = course?.installmentCount || 2
  const isRecurring = course?.priceType === 'mes' || course?.priceType === 'paquete'
  // Tarifa personal de la alumna (respeta precio congelado para cursos recurrentes)
  const studentFee = isRecurring
    ? (parseFloat(student?.monthly_fee) || coursePrice)
    : coursePrice
  const hasGrandfatheredRate = isRecurring && studentFee < coursePrice
  // Cursos de ciclo libre (adultas): sin lenguaje de "vencido/atrasado"
  const isAdultCycleCourse = isRecurring && (course?.ageMin ?? 0) >= 18

  // Calcular saldo pendiente del estudiante (funciona para programas, mensuales y paquetes)
  const amountPaid = parseFloat(student?.amount_paid || 0)
  const totalPrice = isRecurring ? studentFee : parseFloat(student?.total_program_price || coursePrice)
  const balance = totalPrice - amountPaid
  const hasBalance = amountPaid > 0 && balance > 0

  // Detectar si el alumno está atrasado (consistente con getDaysUntilDue que usa la lista)
  const daysUntilDue = isRecurring && student?.next_payment_date
    ? getDaysUntilDue(student.next_payment_date)
    : 999
  const isOverdue = daysUntilDue <= 0
  const daysOverdue = isOverdue ? Math.abs(daysUntilDue) : 0

  // Alumna nueva en curso recurrente (mes o paquete): nunca ha pagado.
  // El picker de inicio de ciclo permite elegir el primer día de clase real.
  const isNewEnrollment = isRecurring && !student?.next_payment_date && !hasBalance

  // Para alumna nueva: el picker muestra el primer día de clase calculado desde hoy
  // (ej. hoy = lun 5/mayo, sábados → muestra 9/mayo) para que la recepcionista
  // cambie directamente a la fecha real de inicio (ej. sábado 16/mayo).
  // Para alumna con historial: usa next_payment_date como base (comportamiento anterior).
  const _defaultCycleStart = (() => {
    if (isNewEnrollment && course?.classDays?.length > 0) {
      return formatDateForInput(getNextClassDay(getTodayEC(), course.classDays))
    }
    return student?.next_payment_date || getTodayEC()
  })()

  const [cycleStartDate, setCycleStartDate] = useState(_defaultCycleStart)

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
      let initialAmount = studentFee
      let initialPaymentType = 'full'

      if (hasBalance) {
        initialAmount = balance
        initialPaymentType = 'balance'
      } else if (course.priceType === 'mes' || course.priceType === 'paquete') {
        initialAmount = studentFee
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
    return hasBalance ? balance : studentFee
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
    let newAmount = studentFee

    if (type === 'full') {
      newAmount = hasBalance ? balance : studentFee
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

  const handleSubmit = (e) => {
    e.preventDefault()
    const selectedBank = BANKS.find(b => b.id === formData.bankId)
    let dbPaymentType = formData.paymentType === 'custom' ? 'full' : formData.paymentType
    const discountInfo = discountEnabled ? {
      hasDiscount: true,
      originalPrice: getBaseAmount(),
      discountType: customFinalPrice !== '' ? 'custom' : discountType,
      discountValue: customFinalPrice !== '' ? (getBaseAmount() - parseFloat(formData.amount)).toFixed(2) : discountValue,
      discountAmount: getDiscountAmount().toFixed(2)
    } : null
    // Pasar cycleStartDate al hook cuando:
    // a) Alumna atrasada con ciclo previo → la recepcionista elige desde cuándo correr el nuevo ciclo
    // b) Alumna nueva en curso mensual → se elige explícitamente cuándo empieza (puede ser mes futuro)
    const resolvedCycleStartDate = (
      (isOverdue && !hasBalance && student?.next_payment_date) || isNewEnrollment
    ) ? cycleStartDate : null
    setPendingPayment({
      amount: parseFloat(formData.amount),
      receiptNumber,
      paymentMethod: PAYMENT_METHODS.find(m => m.id === formData.paymentMethod)?.name || 'Efectivo',
      paymentType: dbPaymentType,
      paymentDate: formData.paymentDate,
      bankName: selectedBank?.name || null,
      transferReceipt: formData.transferReceipt || null,
      notes: formData.notes,
      coursePrice: studentFee,
      courseName: course?.name || 'Sin curso',
      discount: discountInfo,
      cycleStartDate: resolvedCycleStartDate
    })
    setConfirmStep(true)
  }

  const handleConfirm = async () => {
    setLoading(true)
    try {
      await onPaymentComplete(student.id, pendingPayment)
    } catch (err) {
      console.error('Error processing payment:', err)
      toast.error('Error al procesar el pago')
    } finally {
      setLoading(false)
    }
  }

  if (!student) return null

  const baseAmount = getBaseAmount()
  const finalAmount = parseFloat(formData.amount || 0)
  const showDiscountSummary = discountEnabled && finalAmount < baseAmount

  // Fidelidad
  const loyaltyTier = getLoyaltyTier(student?.consecutive_months)
  const hasLoyaltyDiscount = isRecurring && loyaltyTier.tier !== null

  const applyLoyaltyDiscount = () => {
    setDiscountEnabled(true)
    setDiscountType('percent')
    setDiscountValue(loyaltyTier.discount.toString())
    setCustomFinalPrice('')
    const base = getBaseAmount()
    const discounted = Math.max(0, base - (base * loyaltyTier.discount / 100))
    setFormData(prev => ({ ...prev, amount: discounted.toFixed(2) }))
  }

  return (
    <Modal isOpen={true} onClose={onClose} ariaLabel="Registrar pago" className="!items-end sm:!items-center !p-0 sm:!p-4">
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md max-h-[92svh] sm:max-h-[90vh] overflow-y-auto" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {/* Header */}
        <div className="flex flex-col bg-[#551735] text-white rounded-t-2xl">
          {/* Pill handle — mobile only */}
          <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-white/30" />
          </div>
          <div className="px-6 pb-6 pt-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-white/20 p-1.5 rounded-xl">
                <CreditCard size={20} />
              </div>
              <h2 className="text-xl font-semibold">Registrar Pago</h2>
            </div>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="p-2 hover:bg-white/20 rounded-xl active:scale-95 transition-all"
            >
              <X size={20} />
            </button>
          </div>
          <p className="text-sm text-white/70 mt-2 ml-1">
            Comprobante N° {receiptNumber}
          </p>
          </div>
        </div>

        {/* Student Info */}
        <div className="px-4 sm:px-6 py-4 bg-[#fdf5f9] border-b">
          <div className="flex items-center gap-3">
            <div className="bg-[#f9e8f0] text-[#551735] w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg shrink-0">
              {(student.name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 truncate">{student.name}</p>
              <p className="text-sm text-gray-500 truncate">{course?.name || 'Sin curso'}</p>
            </div>
            {(() => {
              const ps = student.payment_status
              const chip = ps === 'overdue' || ps === 'due_today'
                ? { label: 'Vencido', cls: 'bg-red-100 text-red-700' }
                : ps === 'urgent' || ps === 'upcoming'
                ? { label: 'Por renovar', cls: 'bg-amber-100 text-amber-700' }
                : ps === 'ok' || ps === 'paid' || ps === 'active_package'
                ? { label: 'Al día', cls: 'bg-emerald-100 text-emerald-700' }
                : null
              return chip && (
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${chip.cls}`}>
                  {chip.label}
                </span>
              )
            })()}
          </div>
        </div>

        {/* Banner: Alumna pausada */}
        {student?.is_paused && (
          <div className="px-4 sm:px-6 py-3 bg-blue-50 border-b border-blue-200 flex items-center gap-2">
            <span className="text-blue-500 text-lg">⏸</span>
            <div>
              <p className="text-sm font-semibold text-blue-800">Tiene 1 clase pausada</p>
              <p className="text-xs text-blue-600">Se sumará automáticamente al nuevo ciclo al registrar el pago</p>
            </div>
          </div>
        )}

        {/* Loyalty Banner — solo si tiene tier activo en curso recurrente */}
        {hasLoyaltyDiscount && (() => {
          const lc = loyaltyTier.tier === 'oro'
            ? { banner: 'bg-amber-50 border-amber-200', title: 'text-amber-900', sub: 'text-amber-700', btn: 'bg-amber-200 text-amber-900 hover:bg-amber-300' }
            : loyaltyTier.tier === 'plata'
            ? { banner: 'bg-slate-50 border-slate-200', title: 'text-slate-800', sub: 'text-slate-600', btn: 'bg-slate-200 text-slate-800 hover:bg-slate-300' }
            : { banner: 'bg-orange-50 border-orange-200', title: 'text-orange-900', sub: 'text-orange-700', btn: 'bg-orange-200 text-orange-900 hover:bg-orange-300' }
          return (
            <div className={`px-4 sm:px-6 py-3 border-b flex items-center justify-between ${lc.banner}`}>
              <div className="flex items-center gap-2">
                <span className="text-2xl">{loyaltyTier.emoji}</span>
                <div>
                  <p className={`text-sm font-bold ${lc.title}`}>
                    Fidelidad {loyaltyTier.label} · {loyaltyTier.months} {loyaltyTier.months === 1 ? 'mes' : 'meses'} consecutivos
                  </p>
                  <p className={`text-xs ${lc.sub}`}>
                    Descuento disponible: {loyaltyTier.discount}% off
                  </p>
                </div>
              </div>
              {!discountEnabled && (
                <button
                  type="button"
                  onClick={applyLoyaltyDiscount}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl active:scale-95 transition-all ${lc.btn}`}
                >
                  Aplicar
                </button>
              )}
              {discountEnabled && (
                <span className="text-xs font-semibold text-emerald-600 flex items-center gap-1">✓ Aplicado</span>
              )}
            </div>
          )
        })()}

        {/* Course Price Info */}
        <div className="px-4 sm:px-6 py-4 bg-gray-50 border-b">
          <div className="flex justify-between items-center">
            <span className="text-gray-600">
              {hasGrandfatheredRate ? 'Tarifa de la alumna:' : 'Precio del curso:'}
            </span>
            <span className={`text-xl font-bold ${discountEnabled ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
              ${studentFee.toFixed(2)}
            </span>
          </div>
          {hasGrandfatheredRate && (
            <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
              ★ Tarifa histórica — precio actual del curso: ${coursePrice.toFixed(2)}
            </p>
          )}

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
            <div className="mt-2 p-3 bg-orange-100 border border-orange-200 rounded-xl">
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
            <p className="text-xs text-[#6b2145] mt-2">
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
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  formData.paymentType === 'full'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="text-center">
                  <p className="font-semibold">{hasBalance ? 'Saldar' : 'Completo'}</p>
                  <p className="text-xs mt-1">${hasBalance ? balance.toFixed(2) : studentFee.toFixed(2)}</p>
                </div>
              </button>

              {/* Abono (solo si el curso lo permite y no tiene saldo) */}
              {allowsInstallments && !hasBalance && (
                <button
                  type="button"
                  onClick={() => handlePaymentTypeChange('installment')}
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
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
                  className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
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
                className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                  formData.paymentType === 'custom'
                    ? 'border-[#7e2d55] bg-[#fdf5f9] text-[#551735]'
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
                <div className="flex items-center justify-between bg-white rounded-xl p-2 border border-gray-200">
                  <span className="text-sm text-gray-500">Precio regular:</span>
                  <span className="text-lg font-bold text-gray-400 line-through">${baseAmount.toFixed(2)}</span>
                </div>

                {/* Tipo de descuento */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleDiscountTypeChange('fixed')}
                    className={`p-2 rounded-xl border text-sm font-medium active:scale-95 transition-all text-center ${
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
                    className={`p-2 rounded-xl border text-sm font-medium active:scale-95 transition-all text-center ${
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
                    {discountType === 'percent' ? 'Porcentaje de descuento (%)' : 'Monto del descuento ($)'}
                  </label>
                  <input
                      type="number"
                      min="0"
                      max={discountType === 'percent' ? '100' : baseAmount}
                      step="0.01"
                      value={discountValue}
                      onChange={(e) => handleDiscountValueChange(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7e2d55] focus:border-[#7e2d55] outline-none transition-all text-base"
                      placeholder={discountType === 'percent' ? 'Ej: 10' : 'Ej: 5.00'}
                    />
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
                    Asignar precio final directamente ($)
                  </label>
                  <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={customFinalPrice}
                      onChange={(e) => handleCustomFinalPriceChange(e.target.value)}
                      className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#7e2d55] focus:border-[#7e2d55] outline-none transition-all text-base"
                      placeholder="Ej: 30.00"
                    />
                </div>

                {/* Resumen del descuento */}
                {showDiscountSummary && (
                  <div className="bg-white rounded-xl p-2 border border-green-200 text-center">
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
                Monto a pagar ($) *
              </label>
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
                  className={`w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-[#f9e8f0] focus:border-[#7e2d55] outline-none transition-all text-lg font-semibold ${
                    discountEnabled ? 'bg-green-50 border-green-300 text-green-700' : ''
                  }`}
                  readOnly={discountEnabled}
                />
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
                className="w-full px-3 py-3 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-[#f9e8f0] focus:border-[#7e2d55] outline-none transition-all text-base"
              />
            </div>
          </div>

          {/* Cycle Start Date — inscripción nueva */}
          {isNewEnrollment && (
            <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 space-y-2">
              <p className="text-sm font-semibold text-violet-800">
                Primer día de clase
              </p>
              <p className="text-xs text-violet-600 leading-relaxed">
                Cambia la fecha si la alumna empieza en un día diferente al calculado.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={cycleStartDate}
                  onChange={(e) => setCycleStartDate(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border-2 border-violet-300 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-500 outline-none bg-white font-medium text-gray-800"
                />
                {cycleStartDate !== _defaultCycleStart && (
                  <button
                    type="button"
                    onClick={() => setCycleStartDate(_defaultCycleStart)}
                    className="text-xs text-violet-700 underline whitespace-nowrap shrink-0"
                  >
                    Restablecer
                  </button>
                )}
              </div>
              <p className="text-[11px] text-violet-600 leading-relaxed">
                {cycleStartDate <= getTodayEC()
                  ? '✓ Empieza este mes — próximo cobro: 1er día de clase de junio'
                  : '📅 Empieza el mes siguiente — próximo cobro: 1er día de clase del mes posterior'}
              </p>
            </div>
          )}

          {/* Cycle Start Date - ciclo terminado, renovando */}
          {isOverdue && !hasBalance && student?.next_payment_date && (
            <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 space-y-2">
              <p className="text-sm font-semibold text-sky-800 flex items-center gap-1.5">
                <AlertCircle size={15} />
                {isAdultCycleCourse
                  ? `Ciclo terminado · ${daysOverdue}d sin renovar`
                  : `Pago pendiente · ${daysOverdue} ${daysOverdue === 1 ? 'día' : 'días'}`}
              </p>
              <p className="text-xs text-sky-700 leading-relaxed">
                ¿Cuándo asistió por primera vez al nuevo ciclo?
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={cycleStartDate}
                  max={getTodayEC()}
                  onChange={(e) => setCycleStartDate(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border-2 border-sky-300 rounded-xl focus:ring-2 focus:ring-sky-200 focus:border-sky-500 outline-none bg-white font-medium text-gray-800"
                />
                {cycleStartDate !== student.next_payment_date && (
                  <button
                    type="button"
                    onClick={() => setCycleStartDate(student.next_payment_date)}
                    className="text-xs text-sky-700 underline whitespace-nowrap shrink-0"
                  >
                    Restablecer
                  </button>
                )}
              </div>
              <p className="text-[11px] text-sky-600 leading-relaxed">
                {cycleStartDate === student.next_payment_date
                  ? '✓ Fecha original — correcto si asistió ese día o después'
                  : cycleStartDate > student.next_payment_date
                  ? '⚠ Fecha posterior — el nuevo ciclo empezará desde aquí'
                  : '⚠ Fecha anterior — verifica que sea la correcta'}
              </p>
            </div>
          )}

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
                        ? 'border-[#7e2d55] bg-[#fdf5f9] text-[#551735]'
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
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-[#f9e8f0] focus:border-[#7e2d55] outline-none transition-all text-base"
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
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-[#f9e8f0] focus:border-[#7e2d55] outline-none transition-all text-base"
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
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-[#f9e8f0] focus:border-[#7e2d55] outline-none transition-all text-base"
              rows={2}
              placeholder="Observaciones del pago..."
            />
          </div>

          {/* Summary */}
          <div className="rounded-2xl p-4 bg-green-50 border border-green-200">
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
              <span className="text-3xl font-extrabold text-green-700">
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
              className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 active:scale-95 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !formData.amount || parseFloat(formData.amount) <= 0 || (formData.paymentMethod === 'transferencia' && (!formData.bankId || !formData.transferReceipt))}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Check size={20} />
              {loading ? 'Procesando...' : 'Confirmar Pago'}
            </button>
          </div>
        </form>

        {/* ── Paso de confirmación ──────────────────────────────────── */}
        {confirmStep && pendingPayment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl flex flex-col p-6 gap-4 w-full max-w-md max-h-[90vh] overflow-y-auto shadow-xl">
            <div className="text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check size={28} className="text-green-600" />
              </div>
              <h3 className="text-lg font-bold text-gray-800">¿Confirmar este pago?</h3>
              <p className="text-sm text-gray-500 mt-1">Revisa los datos antes de registrar</p>
            </div>
            <div className="rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
              <div className="flex justify-between items-center px-4 py-2.5">
                <span className="text-sm text-gray-500">Alumna</span>
                <span className="text-sm font-semibold text-gray-800 text-right max-w-[55%] truncate">{student.name}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-2.5">
                <span className="text-sm text-gray-500">Curso</span>
                <span className="text-sm font-semibold text-gray-800 text-right max-w-[55%] truncate">{pendingPayment.courseName}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-green-50">
                <span className="text-sm text-gray-600 font-medium">Monto</span>
                <span className="text-2xl font-extrabold text-green-700">${pendingPayment.amount.toFixed(2)}</span>
              </div>
              {pendingPayment.discount?.hasDiscount && (
                <div className="flex justify-between items-center px-4 py-2.5 bg-green-50/50">
                  <span className="text-sm text-gray-500">Descuento</span>
                  <span className="text-sm font-semibold text-green-700">-${pendingPayment.discount.discountAmount}</span>
                </div>
              )}
              <div className="flex justify-between items-center px-4 py-2.5">
                <span className="text-sm text-gray-500">Método</span>
                <span className="text-sm font-semibold text-gray-800">{pendingPayment.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-2.5">
                <span className="text-sm text-gray-500">Fecha</span>
                <span className="text-sm font-semibold text-gray-800">{pendingPayment.paymentDate}</span>
              </div>
              {pendingPayment.bankName && (
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-sm text-gray-500">Banco</span>
                  <span className="text-sm font-semibold text-gray-800">{pendingPayment.bankName}</span>
                </div>
              )}
              {pendingPayment.notes && (
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-sm text-gray-500">Notas</span>
                  <span className="text-sm font-semibold text-gray-800 text-right max-w-[55%]">{pendingPayment.notes}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-auto pt-2">
              <button type="button" onClick={() => setConfirmStep(false)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 active:scale-95 transition-all">
                ← Editar
              </button>
              <button type="button" onClick={handleConfirm} disabled={loading}
                className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 font-semibold">
                <Check size={20} />
                {loading ? 'Procesando...' : 'Sí, registrar'}
              </button>
            </div>
          </div>
          </div>
        )}
      </div>
    </Modal>
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
