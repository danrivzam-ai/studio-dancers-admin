import { useState, useEffect } from 'react'
import { X, Calendar, CreditCard, Clock, Eye, AlertCircle, CheckCircle, Ban } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDate, getCycleInfo, getPaymentStatus, getDaysUntilDue } from '../lib/dateUtils'
import { getCourseById } from '../lib/courses'

export default function StudentDetail({ student, course: courseProp, onClose, onPayment }) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)

  const course = courseProp || getCourseById(student?.course_id)
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

                {/* Barra de progreso */}
                <div className="relative">
                  <div className="flex items-center justify-between text-[10px] text-purple-500 mb-1">
                    <span>Inicio</span>
                    <span className="font-bold text-purple-700">
                      {cycleInfo.classesPassed} de {cycleInfo.totalClasses} clases
                    </span>
                    <span>Fin</span>
                  </div>
                  <div className="w-full h-3 bg-purple-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-400 to-purple-600 rounded-full transition-all"
                      style={{ width: `${Math.min((cycleInfo.classesPassed / cycleInfo.totalClasses) * 100, 100)}%` }}
                    />
                  </div>
                </div>
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
        <div className="p-4 border-t bg-gray-50 flex gap-3">
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
  )
}
