import { useState, useEffect } from 'react'
import { X, Calendar, CreditCard, Clock, Eye, AlertCircle, CheckCircle, Ban, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDate, getCycleInfo, getPaymentStatus, getDaysUntilDue, getTodayEC, getNextClassDay, calculateNextPaymentDate, calculatePackageEndDate, calculateNextPackagePaymentDate, formatDateForInput, getLoyaltyTier } from '../lib/dateUtils'
import { getCourseById, ALL_COURSES } from '../lib/courses'

export default function StudentDetail({ student, course: courseProp, onClose, onPayment, onReactivate }) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showReactivateDialog, setShowReactivateDialog] = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const [reactivateError, setReactivateError] = useState(null)
  const [reactivateSuccess, setReactivateSuccess] = useState(false)

  // Obtener curso base (de prop o lookup)
  const rawCourse = courseProp || getCourseById(student?.course_id)

  // Enriquecer curso con datos hardcodeados si faltan classDays/classesPerCycle
  // Esto resuelve el caso donde class_days es NULL en Supabase (migración no ejecutada o datos viejos)
  const course = (() => {
    if (!rawCourse) return null
    if (rawCourse.classDays && rawCourse.classDays.length > 0) return rawCourse
    // 1. Match exacto por id/code en cursos hardcodeados
    const hardcoded = ALL_COURSES.find(c => c.id === rawCourse.code || c.id === rawCourse.id)
    if (hardcoded) {
      return { ...rawCourse, classDays: hardcoded.classDays, classesPerCycle: hardcoded.classesPerCycle, classesPerPackage: hardcoded.classesPerPackage }
    }
    // 2. Match por patrón: cursos custom de sábados (ej: sabados-intensivos-adultos)
    const key = (rawCourse.code || rawCourse.id || '').toLowerCase()
    const name = (rawCourse.name || '').toLowerCase()
    if (key.includes('sabados') || key.includes('sabado') || name.includes('sábado') || name.includes('sabado')) {
      return { ...rawCourse, classDays: [6], classesPerPackage: rawCourse.classesPerPackage || 4 }
    }
    return rawCourse
  })()

  const paymentStatus = getPaymentStatus(student, course)
  const isRecurring = course?.priceType === 'mes' || course?.priceType === 'paquete'
  const isProgram = course?.priceType === 'programa'

  // Cargar historial de pagos del alumno
  useEffect(() => {
    const fetchPayments = async () => {
      if (!student?.id) return
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('payments')
          .select('*')
          .eq('student_id', student.id)
          .order('payment_date', { ascending: false })
          .limit(20)

        if (error) throw error
        setPayments(data || [])
      } catch (err) {
        console.error('Error fetching student payments:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPayments()
  }, [student?.id])

  if (!student) return null

  // Ciclo info
  const cycleClasses = course?.classesPerCycle || course?.classesPerPackage || null
  const baseDate = student.last_payment_date || student.enrollment_date
  const cycleInfo = isRecurring && baseDate
    ? getCycleInfo(baseDate, student.next_payment_date, course?.classDays, cycleClasses)
    : null

  // Saldo
  const coursePrice = course?.price || 0
  const amountPaid = parseFloat(student.amount_paid || 0)
  const balance = parseFloat(student.balance || 0)
  const hasBalance = amountPaid > 0 && balance > 0

  // Pagos válidos y anulados
  const validPayments = payments.filter(p => !p.voided)
  const voidedPayments = payments.filter(p => p.voided)

  // Total pagado históricamente
  const totalHistoricPaid = validPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

  // --- Reactivar ciclo: cálculos para el diálogo ---
  const todayStr = getTodayEC()
  const todayDate = new Date(todayStr + 'T12:00:00')
  // Admin usa 0=Dom...6=Sáb (igual que JS getDay)
  const isTodayClassDay = !!(course?.classDays && course.classDays.includes(todayDate.getDay()))
  // Preview de próximo pago si se reactiva hoy
  const previewNextPayment = (() => {
    if (!course || !isRecurring) return null
    try {
      const classDays = course.classDays || null
      if (course.priceType === 'paquete') {
        const cycleStart = classDays ? getNextClassDay(todayDate, classDays) : todayDate
        const packageEnd = calculatePackageEndDate(cycleStart, classDays, course.classesPerPackage || 4)
        const next = calculateNextPackagePaymentDate(packageEnd, classDays)
        return formatDateForInput(new Date(next))
      } else {
        const cycleStart = classDays ? getNextClassDay(todayDate, classDays) : todayDate
        const next = calculateNextPaymentDate(cycleStart, classDays, course.classesPerCycle)
        return formatDateForInput(new Date(next))
      }
    } catch { return null }
  })()

  const handleReactivate = async () => {
    if (!onReactivate) return
    setReactivating(true)
    setReactivateError(null)
    const result = await onReactivate(student.id)
    setReactivating(false)
    if (result.success) {
      setReactivateSuccess(true)
      setTimeout(() => {
        setShowReactivateDialog(false)
        setReactivateSuccess(false)
        onClose()
      }, 1500)
    } else {
      setReactivateError(result.error || 'Error al reactivar el ciclo')
    }
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b bg-gradient-to-r from-purple-600 to-purple-800 text-white">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg">
                {student.name.charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-lg font-bold">{student.name}</h2>
                <p className="text-sm text-white/80">{course?.name || 'Sin curso'}</p>
                {student.cedula && <p className="text-xs text-purple-300">CI: {student.cedula}</p>}
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1.5 rounded-full text-sm font-medium ${paymentStatus.color}`}>
              {paymentStatus.label}
            </span>
            {student.is_paused && (
              <span className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">
                ⏸ Pausado
              </span>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Info Cards */}
          <div className="p-4 grid grid-cols-2 gap-3">
            {/* Precio / Tarifa */}
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Tarifa</p>
              <p className="text-lg font-bold text-gray-800">
                ${coursePrice.toFixed(2)}
              </p>
              <p className="text-xs text-gray-400">
                {course?.priceType === 'mes'
                  ? (course?.classesPerCycle ? `por ${course.classesPerCycle} clases` : 'mensual')
                  : course?.priceType === 'paquete'
                    ? `por ${course?.classesPerPackage || 4} clases`
                    : course?.priceType === 'programa'
                      ? 'programa'
                      : 'por clase'
                }
              </p>
            </div>

            {/* Último pago */}
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">Último pago</p>
              <p className="text-lg font-bold text-gray-800">
                {student.last_payment_date ? formatDate(student.last_payment_date) : '-'}
              </p>
              {validPayments.length > 0 && (
                <p className="text-xs text-green-600">${parseFloat(validPayments[0].amount).toFixed(2)}</p>
              )}
            </div>

            {/* Próximo cobro */}
            {isRecurring && (
              <div className={`rounded-xl p-3 text-center ${
                student.next_payment_date && getDaysUntilDue(student.next_payment_date) < 0
                  ? 'bg-red-50 border border-red-200'
                  : student.next_payment_date && getDaysUntilDue(student.next_payment_date) <= 5
                    ? 'bg-yellow-50 border border-yellow-200'
                    : 'bg-gray-50'
              }`}>
                <p className="text-xs text-gray-500 mb-1">Próximo cobro</p>
                <p className="text-lg font-bold text-gray-800">
                  {student.next_payment_date ? formatDate(student.next_payment_date) : '-'}
                </p>
                {student.next_payment_date && (
                  <p className={`text-xs ${getDaysUntilDue(student.next_payment_date) < 0 ? 'text-red-600 font-medium' : 'text-gray-400'}`}>
                    {getDaysUntilDue(student.next_payment_date) < 0
                      ? `${Math.abs(getDaysUntilDue(student.next_payment_date))} días atrás`
                      : getDaysUntilDue(student.next_payment_date) === 0
                        ? 'Hoy'
                        : `en ${getDaysUntilDue(student.next_payment_date)} días`
                    }
                  </p>
                )}
              </div>
            )}

            {/* Saldo del ciclo */}
            {(isRecurring || isProgram) && (
              <div className={`rounded-xl p-3 text-center ${hasBalance ? 'bg-orange-50 border border-orange-200' : 'bg-gray-50'}`}>
                <p className="text-xs text-gray-500 mb-1">
                  {hasBalance ? 'Saldo pendiente' : 'Pagado del ciclo'}
                </p>
                <p className={`text-lg font-bold ${hasBalance ? 'text-orange-600' : 'text-green-600'}`}>
                  {hasBalance
                    ? `$${balance.toFixed(2)}`
                    : amountPaid > 0
                      ? `$${amountPaid.toFixed(2)}`
                      : '-'
                  }
                </p>
                {hasBalance && (
                  <p className="text-xs text-orange-500">de ${coursePrice.toFixed(2)}</p>
                )}
              </div>
            )}
          </div>

          {/* Fidelidad — solo cursos recurrentes */}
          {isRecurring && (() => {
            const loyalty = getLoyaltyTier(student.consecutive_months)
            if (loyalty.months === 0) return null
            return (
              <div className="col-span-2 rounded-xl p-3"
                style={{ background: loyalty.tier === 'oro' ? '#fffbeb' : loyalty.tier === 'plata' ? '#f8fafc' : loyalty.tier === 'bronce' ? '#fff7ed' : '#f9fafb',
                         border: `1px solid ${loyalty.tier === 'oro' ? '#fcd34d' : loyalty.tier === 'plata' ? '#cbd5e1' : loyalty.tier === 'bronce' ? '#fdba74' : '#e5e7eb'}` }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{loyalty.emoji || '⭐'}</span>
                    <div>
                      <p className="text-sm font-bold"
                        style={{ color: loyalty.tier === 'oro' ? '#92400e' : loyalty.tier === 'plata' ? '#334155' : loyalty.tier === 'bronce' ? '#9a3412' : '#374151' }}>
                        {loyalty.tier ? `Nivel ${loyalty.label}` : 'Acumulando fidelidad'}
                      </p>
                      <p className="text-xs text-gray-500">{loyalty.months} {loyalty.months === 1 ? 'mes' : 'meses'} consecutivo{loyalty.months !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  {loyalty.tier && (
                    <span className="text-lg font-bold"
                      style={{ color: loyalty.tier === 'oro' ? '#b45309' : loyalty.tier === 'plata' ? '#475569' : '#c2410c' }}>
                      {loyalty.discount}% off
                    </span>
                  )}
                </div>
                {loyalty.next && (
                  <p className="text-[11px] text-gray-400 mt-1.5 text-center">
                    {loyalty.nextMonths} {loyalty.nextMonths === 1 ? 'mes' : 'meses'} más para alcanzar nivel {loyalty.next}
                  </p>
                )}
              </div>
            )
          })()}

          {/* Cycle Progress Bar */}
          {cycleInfo && (
            <div className="px-4 pb-3">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <p className="text-xs font-bold text-purple-700 mb-3 text-center">CICLO ACTUAL</p>

                {/* Fechas del ciclo */}
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div className="text-center">
                    <p className="text-[10px] text-purple-500 uppercase">Primera clase</p>
                    <p className="text-sm font-bold text-purple-700">{cycleInfo.cycleStart}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-purple-500 uppercase">Última clase</p>
                    <p className="text-sm font-bold text-purple-700">{cycleInfo.cycleEnd}</p>
                  </div>
                </div>

                {/* Días de clase */}
                <p className="text-xs text-center text-purple-600 mb-2">
                  Clases: <span className="font-semibold">{cycleInfo.daysLabel}</span>
                </p>

                {/* Conteo de clases */}
                <p className="text-center text-lg font-bold text-purple-700">
                  Clase {cycleInfo.classesPassed}/{cycleInfo.totalClasses}
                </p>
              </div>
            </div>
          )}

          {/* Contact Info */}
          <div className="px-4 pb-3">
            <div className="bg-gray-50 rounded-xl p-3 space-y-1.5">
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Información de contacto</p>
              {student.phone && (
                <p className="text-sm text-gray-700">📱 {student.phone}</p>
              )}
              {student.email && (
                <p className="text-sm text-gray-700">✉️ {student.email}</p>
              )}
              {student.parent_name && (
                <p className="text-sm text-gray-700">👤 Representante: {student.parent_name}</p>
              )}
              {student.parent_phone && student.parent_phone !== student.phone && (
                <p className="text-sm text-gray-700">📱 Tel. representante: {student.parent_phone}</p>
              )}
              {student.payer_name && student.payer_name !== student.parent_name && student.payer_name !== student.name && (
                <p className="text-sm text-gray-700">💳 Pagador: {student.payer_name}</p>
              )}
              {student.enrollment_date && (
                <p className="text-sm text-gray-400">📅 Inscripción: {formatDate(student.enrollment_date)}</p>
              )}
            </div>
          </div>

          {/* Payment History */}
          <div className="px-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs font-semibold text-gray-500 uppercase">Historial de Pagos</p>
              <p className="text-xs text-gray-400">
                {validPayments.length} pago{validPayments.length !== 1 ? 's' : ''} • Total: ${totalHistoricPaid.toFixed(2)}
              </p>
            </div>

            {loading ? (
              <div className="text-center py-4 text-gray-400 text-sm">Cargando...</div>
            ) : payments.length === 0 ? (
              <div className="text-center py-4 text-gray-400 text-sm">
                <CreditCard size={24} className="mx-auto mb-2 opacity-50" />
                Sin pagos registrados
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map(payment => (
                  <div
                    key={payment.id}
                    className={`rounded-lg p-3 flex items-center justify-between ${
                      payment.voided
                        ? 'bg-red-50 border border-red-200 opacity-60'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        payment.voided
                          ? 'bg-red-100 text-red-500'
                          : 'bg-green-100 text-green-600'
                      }`}>
                        {payment.voided ? <Ban size={14} /> : <CheckCircle size={14} />}
                      </div>
                      <div>
                        <p className={`text-sm font-medium ${payment.voided ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                          ${parseFloat(payment.amount).toFixed(2)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {formatDate(payment.payment_date)} • {payment.payment_method}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-500">{payment.receipt_number}</p>
                      {payment.voided && (
                        <span className="text-[10px] text-red-500 font-medium">ANULADO</span>
                      )}
                      {payment.discount_amount && !payment.voided && (
                        <span className="text-[10px] text-green-600">Desc: -${parseFloat(payment.discount_amount).toFixed(2)}</span>
                      )}
                      {payment.payment_type === 'installment' && !payment.voided && (
                        <span className="text-[10px] text-orange-600">Abono</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-gray-50 space-y-2">
          {/* Reactivar ciclo — solo para cursos mensuales/paquete */}
          {isRecurring && onReactivate && (
            <button
              onClick={() => { setShowReactivateDialog(true); setReactivateError(null); setReactivateSuccess(false) }}
              className="w-full px-4 py-2.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
            >
              <RefreshCw size={16} />
              Reactivar ciclo (gracia)
            </button>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Cerrar
            </button>
            <button
              onClick={() => {
                onClose()
                if (onPayment) onPayment(student)
              }}
              className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2"
            >
              <CreditCard size={18} />
              Registrar Pago
            </button>
          </div>
        </div>
      </div>

      {/* Diálogo de confirmación: Reactivar ciclo */}
      {showReactivateDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
            <h3 className="text-lg font-bold text-gray-800 mb-1 text-center flex items-center justify-center gap-2">
              <RefreshCw size={20} className="text-purple-600" />
              Reactivar ciclo
            </h3>
            <p className="text-xs text-gray-500 text-center mb-4">{student.name}</p>

            {reactivateSuccess ? (
              <div className="text-center py-4">
                <CheckCircle size={40} className="text-green-500 mx-auto mb-2" />
                <p className="text-green-700 font-semibold">¡Ciclo reactivado!</p>
                <p className="text-xs text-gray-500 mt-1">Próximo cobro: {previewNextPayment ? formatDate(previewNextPayment) : '-'}</p>
              </div>
            ) : (
              <>
                {/* Indicador: ¿hoy es día de clase? */}
                <div className={`rounded-xl p-3 mb-3 text-center ${isTodayClassDay ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                  <p className={`text-sm font-medium ${isTodayClassDay ? 'text-green-700' : 'text-orange-700'}`}>
                    {isTodayClassDay ? '✅ Hoy es día de clase' : '⚠️ Hoy no es día de clase'}
                  </p>
                  {!isTodayClassDay && (
                    <p className="text-xs text-orange-600 mt-1">
                      El ciclo arrancará desde la próxima clase disponible
                    </p>
                  )}
                </div>

                {/* Preview de fechas */}
                <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Inicio ciclo:</span>
                    <span className="font-semibold text-gray-800">{formatDate(todayStr)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Próximo cobro:</span>
                    <span className="font-semibold text-purple-700">{previewNextPayment ? formatDate(previewNextPayment) : '-'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Clases usadas:</span>
                    <span className="font-semibold text-gray-800">Se reinicia a 0</span>
                  </div>
                </div>

                {reactivateError && (
                  <p className="text-sm text-red-600 text-center mb-3 bg-red-50 rounded-lg px-3 py-2">
                    {reactivateError}
                  </p>
                )}

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowReactivateDialog(false)}
                    disabled={reactivating}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleReactivate}
                    disabled={reactivating}
                    className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {reactivating ? (
                      <>
                        <RefreshCw size={16} className="animate-spin" />
                        Activando...
                      </>
                    ) : (
                      'Reactivar'
                    )}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
