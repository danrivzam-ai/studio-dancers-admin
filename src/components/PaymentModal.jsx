import { useState, useEffect } from 'react'
import { X, Check, CreditCard, AlertCircle, Percent, Tag } from 'lucide-react'
import { getCourseById, BANKS } from '../lib/courses'
import { getTodayEC, formatDate, getDaysUntilDue, getLoyaltyTier, getNextClassDay, formatDateForInput, calcularProrrateo, calculateNextPaymentDate } from '../lib/dateUtils'
import { useToast } from './Toast'
import Modal from './ui/Modal'
import PaymentMethodPicker from './ui/PaymentMethodPicker'
import { paymentMethodName } from '../lib/paymentMethods'

export default function PaymentModal({
  student,
  paymentStatus, // calculado en App con getPaymentStatus (no usar student.payment_status crudo)
  onClose,
  onPaymentComplete,
  onFetchCoursePlans,
}) {
  const toast = useToast()
  const [loading, setLoading] = useState(false)
  const [confirmStep, setConfirmStep] = useState(false)
  const [pendingPayment, setPendingPayment] = useState(null)
  // Planes del curso (trimestral, semestral, etc.) cargados de la BD
  const [coursePlans, setCoursePlans] = useState([])
  const [selectedPlan, setSelectedPlan] = useState(null) // null = mensual base

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

  // Sugerencia de prorrateo: si es el PRIMER pago de la alumna en un curso
  // mensual, y el mes ya empezó, sugerir el monto proporcional a las clases
  // que efectivamente va a recibir este mes.
  const isFirstPayment = !student?.next_payment_date && !student?.last_payment_date
  const prorrateo = (isFirstPayment && course?.priceType === 'mes')
    ? calcularProrrateo({ ...course, price: studentFee }, getTodayEC())
    : null

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

  // Fecha real del próximo cobro para una alumna nueva — MISMA lógica que
  // useStudents al registrar el pago (getNextClassDay → calculateNextPaymentDate).
  // Antes el texto tenía el mes "junio" hardcodeado: mostraba siempre junio sin
  // importar la fecha real de inicio. Se recalcula al cambiar cycleStartDate.
  const _nextCobroDate = (() => {
    if (!isNewEnrollment) return null
    const cd = course?.classDays
    const start = (cd && cd.length > 0) ? getNextClassDay(cycleStartDate, cd) : cycleStartDate
    return calculateNextPaymentDate(start, cd, course?.classesPerCycle)
  })()

  // Estado de descuento
  const [discountEnabled, setDiscountEnabled] = useState(false)
  // Prorrateo del primer mes aplicado: pasa a ser la base sobre la que se calcula
  // cualquier descuento adicional (antes un % extra se calculaba sobre el mes completo)
  const [prorrateoApplied, setProrrateoApplied] = useState(false)
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
    notes: '',
    monthsAhead: 1, // cuántos meses paga (1 = mes corriente, >1 = adelanta)
  })

  // IMPORTANTE: depender de student?.id y course?.id (estables), NO de los
  // objetos completos. getCourseById normaliza el curso y devuelve un objeto
  // NUEVO en cada render → si usamos [student, course], el useEffect dispara
  // en cada render y resetea formData.amount, borrando el descuento aplicado.
  // (Bug raíz del caso Valentina/Alina: descuento no quedaba en el monto.)
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

      // Cargar planes promocionales del curso (si tiene)
      if (onFetchCoursePlans && course.id) {
        onFetchCoursePlans(course.id).then(r => {
          if (r.success && r.data?.length) setCoursePlans(r.data)
          else setCoursePlans([])
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [student?.id, course?.id])

  // Calcular monto final con descuento
  const getBaseAmount = () => {
    if (formData.paymentType === 'balance') return balance
    if (formData.paymentType === 'installment') return coursePrice / installmentCount
    if (hasBalance) return balance
    if (prorrateoApplied && prorrateo) return prorrateo.sugerido
    // Plan de varios meses (trimestral, semestral...): el descuento se aplica sobre su total
    if (selectedPlan) return parseFloat(selectedPlan.price)
    // Adelanto de meses sin plan: el descuento se aplica sobre mensualidad × meses
    if (formData.paymentType === 'full' && formData.monthsAhead > 1) return studentFee * formData.monthsAhead
    return studentFee
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
  // eslint-disable-next-line react-hooks/exhaustive-deps -- incluir calculateDiscountedAmount (nueva en cada render) reiniciaría el monto en cada render (ver 5cd06aa)
  }, [discountEnabled, discountType, discountValue, customFinalPrice])

  const handlePaymentTypeChange = (type) => {
    let newAmount = studentFee

    if (type === 'full') {
      newAmount = hasBalance ? balance : selectedPlan ? parseFloat(selectedPlan.price) : studentFee
    } else if (type === 'installment') {
      newAmount = coursePrice / installmentCount
    } else if (type === 'balance') {
      newAmount = balance
    }

    // Si hay descuento activo, recalcular
    if (discountEnabled && type !== 'custom') {
      // Resetear descuento al cambiar tipo
    }

    // Los planes de varios meses solo aplican al pago completo
    if (type !== 'full' && selectedPlan) setSelectedPlan(null)

    setFormData({
      ...formData,
      paymentType: type,
      amount: newAmount.toFixed(2),
      ...(type !== 'full' && selectedPlan ? { monthsAhead: 1 } : {})
    })

    // Resetear descuento (y prorrateo) al cambiar tipo de pago
    setProrrateoApplied(false)
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
      // Sin descuento el prorrateo no puede quedar (se guardaría como abono parcial)
      setProrrateoApplied(false)
      const base = prorrateoApplied ? studentFee : getBaseAmount()
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

    // Construir discountInfo SOLO si la matemática cuadra. Antes había un bug
    // donde el modal grababa amount=$45 + discount_amount=$5 + original=$45
    // (inconsistente: $45 ≠ $45 - $5). Ahora forzamos:
    //   amount === originalPrice - discountAmount  (margen $0.01 por float)
    // Si no cuadra, ignoramos el descuento y avisamos al usuario.
    let discountInfo = null
    if (discountEnabled) {
      const originalPrice = getBaseAmount()
      const discountAmount = getDiscountAmount()
      const finalAmount = parseFloat(formData.amount)
      const isMathConsistent = Math.abs((originalPrice - discountAmount) - finalAmount) < 0.01
      if (!isMathConsistent) {
        toast.error(`El monto no coincide con el descuento (precio $${originalPrice.toFixed(2)} − descuento $${discountAmount.toFixed(2)} = $${(originalPrice - discountAmount).toFixed(2)} ≠ monto $${finalAmount.toFixed(2)}). Revisá los valores.`)
        return
      }
      // Con prorrateo el registro se guarda contra la mensualidad completa: el
      // historial muestra todo lo rebajado (prorrateo + descuento extra)
      const recordOriginal = prorrateoApplied ? studentFee : originalPrice
      const isCustom = customFinalPrice !== '' || prorrateoApplied
      discountInfo = {
        hasDiscount: true,
        originalPrice: recordOriginal,
        discountType: isCustom ? 'custom' : discountType,
        discountValue: isCustom ? (recordOriginal - finalAmount).toFixed(2) : discountValue,
        discountAmount: (recordOriginal - finalAmount).toFixed(2),
      }
    }
    // Pasar cycleStartDate al hook cuando:
    // a) Alumna atrasada con ciclo previo → la recepcionista elige desde cuándo correr el nuevo ciclo
    // b) Alumna nueva en curso mensual → se elige explícitamente cuándo empieza (puede ser mes futuro)
    const resolvedCycleStartDate = (
      (isOverdue && !hasBalance && student?.next_payment_date) || isNewEnrollment
    ) ? cycleStartDate : null
    setPendingPayment({
      amount: parseFloat(formData.amount),
      paymentMethod: paymentMethodName(formData.paymentMethod),
      paymentType: dbPaymentType,
      paymentDate: formData.paymentDate,
      bankName: selectedBank?.name || null,
      transferReceipt: formData.transferReceipt || null,
      notes: formData.notes,
      coursePrice: studentFee,
      courseName: course?.name || 'Sin curso',
      discount: discountInfo,
      cycleStartDate: resolvedCycleStartDate,
      monthsAhead: formData.monthsAhead || 1,
      // Plan promocional snapshot (si la admin seleccionó uno)
      planId: selectedPlan?.id || null,
      planMonths: selectedPlan?.months || null,
      planName: selectedPlan?.name || null,
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
          <p className="text-sm text-white/70 mt-2 ml-1 px-6 pb-4">
            El N° de comprobante se asigna al confirmar
          </p>
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
              // Mismo estado (etiqueta y color) que muestra la lista de alumnas
              return paymentStatus?.label && (
                <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${paymentStatus.color}`}>
                  {paymentStatus.label}
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
              {(!discountEnabled || (prorrateoApplied && !discountValue && customFinalPrice === '')) && (
                <button
                  type="button"
                  onClick={applyLoyaltyDiscount}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl active:scale-95 transition-all ${lc.btn}`}
                >
                  Aplicar
                </button>
              )}
              {discountEnabled && (!prorrateoApplied || discountValue || customFinalPrice !== '') && (
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

          {/* Precio prorrateado (primer mes) */}
          {prorrateoApplied && prorrateo && (
            <div className="flex justify-between items-center mt-1">
              <span className="text-sky-700 font-medium flex items-center gap-1">
                <Percent size={14} />
                Prorrateado ({prorrateo.motivo}):
              </span>
              <span className={`text-xl font-bold ${showDiscountSummary ? 'text-gray-400 line-through' : 'text-sky-700'}`}>${prorrateo.sugerido.toFixed(2)}</span>
            </div>
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
          {/* Sugerencia de prorrateo (primer pago, mes ya empezado) */}
          {prorrateo && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 p-3">
              <div className="flex items-start gap-2.5">
                <div className="w-7 h-7 rounded-full bg-sky-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Percent size={14} className="text-sky-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-sky-900">Sugerencia: pagar prorrateado</p>
                  <p className="text-xs text-sky-700 mt-0.5 leading-snug">
                    Asistirá a {prorrateo.motivo}. Valor sugerido: <strong>${prorrateo.sugerido.toFixed(2)}</strong> (en lugar de ${studentFee.toFixed(2)} completo).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    // Aplicar como descuento (customFinalPrice) — así el backend lo
                    // procesa como pago completo del mes (con descuento), no como
                    // abono parcial que dejaría saldo pendiente.
                    setProrrateoApplied(true)
                    setDiscountEnabled(true)
                    setDiscountValue('')
                    setCustomFinalPrice('')
                    setFormData(prev => ({ ...prev, amount: prorrateo.sugerido.toFixed(2), paymentType: 'full' }))
                  }}
                  className="shrink-0 px-3 py-1.5 rounded-lg bg-sky-600 text-white text-xs font-semibold hover:bg-sky-700 active:scale-95 transition"
                >
                  Usar
                </button>
              </div>
            </div>
          )}

          {/* Planes de pago (trimestral / semestral / anual...) */}
          {coursePlans.length > 0 && !hasBalance && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Plan de pago
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {/* Mensual base */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlan(null)
                    setFormData(prev => ({ ...prev, amount: studentFee.toFixed(2), paymentType: 'full', monthsAhead: 1 }))
                    setProrrateoApplied(false)
                    if (discountEnabled) {
                      setDiscountEnabled(false); setDiscountValue(''); setCustomFinalPrice('')
                    }
                  }}
                  className={`p-3 rounded-xl border-2 text-sm transition-all ${
                    !selectedPlan
                      ? 'border-[#7e2d55] bg-[#fdf2f7] text-[#551735]'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <p className="font-semibold">Mensual</p>
                  <p className="text-xs mt-1">${studentFee.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">1 mes</p>
                </button>

                {/* Planes promocionales */}
                {coursePlans.map(plan => {
                  const lineal = studentFee * plan.months
                  const ahorro = lineal - parseFloat(plan.price)
                  return (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => {
                        setSelectedPlan(plan)
                        setFormData(prev => ({ ...prev, amount: parseFloat(plan.price).toFixed(2), paymentType: 'full', monthsAhead: plan.months }))
                        setProrrateoApplied(false)
                        if (discountEnabled) {
                          setDiscountEnabled(false); setDiscountValue(''); setCustomFinalPrice('')
                        }
                      }}
                      className={`p-3 rounded-xl border-2 text-sm transition-all relative ${
                        selectedPlan?.id === plan.id
                          ? 'border-[#7e2d55] bg-[#fdf2f7] text-[#551735]'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      {ahorro > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 bg-emerald-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                          -${ahorro.toFixed(0)}
                        </span>
                      )}
                      <p className="font-semibold">{plan.name}</p>
                      <p className="text-xs mt-1">${parseFloat(plan.price).toFixed(2)}</p>
                      <p className="text-[10px] text-gray-400 mt-0.5">{plan.months} {plan.months === 1 ? 'mes' : 'meses'}</p>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

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
                    ? 'border-brand bg-brand-soft text-brand-ink'
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

          {/* Adelantar meses — solo cursos mensuales, sin saldo previo */}
          {course?.priceType === 'mes' && !hasBalance && !prorrateo && !selectedPlan && formData.paymentType === 'full' && (
            <div className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-700">¿Adelanta meses?</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {formData.monthsAhead === 1
                      ? 'Paga el mes corriente'
                      : `Cubre ${formData.monthsAhead} meses — vencimiento avanza ${formData.monthsAhead} meses`}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.max(1, formData.monthsAhead - 1)
                      setFormData(prev => ({ ...prev, monthsAhead: next, amount: (studentFee * next).toFixed(2) }))
                      if (discountEnabled) {
                        setDiscountEnabled(false); setDiscountValue(''); setCustomFinalPrice('')
                      }
                    }}
                    className="w-9 h-9 rounded-xl bg-white border border-gray-200 text-gray-600 text-lg flex items-center justify-center active:scale-90 transition shadow-sm"
                    disabled={formData.monthsAhead <= 1}
                  >−</button>
                  <div className="min-w-[44px] text-center">
                    <p className="text-2xl font-bold text-[#7e2d55] leading-none tabular-nums">{formData.monthsAhead}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">{formData.monthsAhead === 1 ? 'mes' : 'meses'}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const next = Math.min(12, formData.monthsAhead + 1)
                      setFormData(prev => ({ ...prev, monthsAhead: next, amount: (studentFee * next).toFixed(2) }))
                      if (discountEnabled) {
                        setDiscountEnabled(false); setDiscountValue(''); setCustomFinalPrice('')
                      }
                    }}
                    className="w-9 h-9 rounded-xl bg-white border border-gray-200 text-gray-600 text-lg flex items-center justify-center active:scale-90 transition shadow-sm"
                    disabled={formData.monthsAhead >= 12}
                  >+</button>
                </div>
              </div>
              {formData.monthsAhead > 1 && (
                <div className="mt-2.5 pt-2.5 border-t border-gray-200 flex justify-between text-xs">
                  <span className="text-gray-500">{formData.monthsAhead} × ${studentFee.toFixed(2)}</span>
                  <span className="font-bold text-[#7e2d55]">= ${(studentFee * formData.monthsAhead).toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

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
            <div className="bg-surface-alt border border-line rounded-xl p-3 space-y-2">
              <p className="text-sm font-semibold text-ink">
                Primer día de clase
              </p>
              <p className="text-xs text-ink-muted leading-relaxed">
                Cambia la fecha si la alumna empieza en un día diferente al calculado.
              </p>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={cycleStartDate}
                  onChange={(e) => setCycleStartDate(e.target.value)}
                  className="flex-1 px-3 py-2 text-sm border border-line-strong rounded-xl focus:ring-4 focus:ring-brand-soft focus:border-brand outline-none bg-white font-medium text-gray-800"
                />
                {cycleStartDate !== _defaultCycleStart && (
                  <button
                    type="button"
                    onClick={() => setCycleStartDate(_defaultCycleStart)}
                    className="text-xs text-brand-ink underline whitespace-nowrap shrink-0"
                  >
                    Restablecer
                  </button>
                )}
              </div>
              <p className="text-[11px] text-ink-muted leading-relaxed">
                {cycleStartDate <= getTodayEC()
                  ? '✓ Empieza este mes'
                  : '📅 Empieza el mes siguiente'}
                {_nextCobroDate && ` — próximo cobro: ${formatDate(_nextCobroDate, "EEEE d 'de' MMMM")}`}
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

          <PaymentMethodPicker
            paymentMethod={formData.paymentMethod}
            bankId={formData.bankId}
            transferReceipt={formData.transferReceipt}
            onChange={patch => setFormData(prev => ({ ...prev, ...patch }))}
          />

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
          <div className="rounded-2xl p-4 bg-surface-alt border border-line">
            {showDiscountSummary && (
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-line">
                <span className="text-sm text-gray-500">Precio regular:</span>
                <span className="text-sm text-gray-400 line-through">${baseAmount.toFixed(2)}</span>
              </div>
            )}
            {showDiscountSummary && (
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-line">
                <span className="text-sm text-green-600 flex items-center gap-1">
                  <Tag size={14} />
                  Descuento:
                </span>
                <span className="text-sm font-medium text-green-600">-${(baseAmount - finalAmount).toFixed(2)}</span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <div>
                <span className="text-ink font-semibold">Total a cobrar</span>
                {formData.paymentType === 'installment' && (
                  <p className="text-xs text-ink-muted">Abono (cuota {amountPaid > 0 ? '2' : '1'} de {installmentCount})</p>
                )}
                {formData.paymentType === 'balance' && (
                  <p className="text-xs text-ink-muted">Pago de saldo pendiente</p>
                )}
              </div>
              <span className="text-3xl font-extrabold text-brand-ink tabular-nums">
                ${finalAmount.toFixed(2)}
              </span>
            </div>
            {formData.paymentMethod === 'transferencia' && formData.bankId && (
              <p className="text-xs text-ink-muted mt-2">
                Transferencia desde: {BANKS.find(b => b.id === formData.bankId)?.name}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="sd-btn sd-btn-secondary sd-btn-lg flex-1"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading || !formData.amount || parseFloat(formData.amount) <= 0 || (formData.paymentMethod === 'transferencia' && (!formData.bankId || !formData.transferReceipt))}
              className="sd-btn sd-btn-primary sd-btn-lg flex-1 min-w-0"
            >
              <Check size={20} />
              {loading ? 'Procesando…' : 'Confirmar pago'}
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
              <div className="flex justify-between items-center px-4 py-3 bg-brand-soft">
                <span className="text-sm text-ink-soft font-medium">Monto</span>
                <span className="text-2xl font-extrabold text-brand-ink tabular-nums">${pendingPayment.amount.toFixed(2)}</span>
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
                className="sd-btn sd-btn-secondary sd-btn-lg flex-1">
                ← Editar
              </button>
              <button type="button" onClick={handleConfirm} disabled={loading}
                className="sd-btn sd-btn-primary sd-btn-lg flex-1 min-w-0">
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
