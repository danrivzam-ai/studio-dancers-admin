import { useState, useEffect } from 'react'
import { X, CreditCard, RefreshCw, CheckCircle, Ban, Phone, Mail, User, CalendarDays, MessageCircle, FileText, Award, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDate, getCycleInfo, getPaymentStatus, getDaysUntilDue, getTodayEC, getNextClassDay, calculateNextPaymentDate, calculatePackageEndDate, calculateNextPackagePaymentDate, formatDateForInput, getLoyaltyTier } from '../lib/dateUtils'
import { getCourseById, ALL_COURSES } from '../lib/courses'
import { openWhatsApp, buildReminderMessage } from '../lib/whatsapp'

const METHOD_STYLE = {
  'Efectivo':      { bg: 'bg-green-100',  text: 'text-green-700'  },
  'Transferencia': { bg: 'bg-blue-100',   text: 'text-blue-700'   },
  'Tarjeta':       { bg: 'bg-purple-100', text: 'text-purple-700' },
  'PayPhone (Tarjeta)': { bg: 'bg-indigo-100', text: 'text-indigo-700' },
}
const methodStyle = (m) => METHOD_STYLE[m] || { bg: 'bg-gray-100', text: 'text-gray-600' }

export default function StudentDetail({ student, course: courseProp, onClose, onPayment, onReactivate, schoolName }) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [showReactivateDialog, setShowReactivateDialog] = useState(false)
  const [reactivating, setReactivating] = useState(false)
  const [reactivateError, setReactivateError] = useState(null)
  const [reactivateSuccess, setReactivateSuccess] = useState(false)
  const [photoError, setPhotoError] = useState(false)

  // Supabase Storage avatar URL (bucket: avatars, path: {studentId}.jpg)
  const avatarUrl = supabase.storage.from('avatars').getPublicUrl(`${student?.id}.jpg`).data?.publicUrl

  // Enriquecer curso
  const rawCourse = courseProp || getCourseById(student?.course_id)
  const course = (() => {
    if (!rawCourse) return null
    if (rawCourse.classDays && rawCourse.classDays.length > 0) return rawCourse
    const hardcoded = ALL_COURSES.find(c => c.id === rawCourse.code || c.id === rawCourse.id)
    if (hardcoded) return { ...rawCourse, classDays: hardcoded.classDays, classesPerCycle: hardcoded.classesPerCycle, classesPerPackage: hardcoded.classesPerPackage }
    const key = (rawCourse.code || rawCourse.id || '').toLowerCase()
    const name = (rawCourse.name || '').toLowerCase()
    if (key.includes('sabados') || key.includes('sabado') || name.includes('sábado') || name.includes('sabado'))
      return { ...rawCourse, classDays: [6], classesPerPackage: rawCourse.classesPerPackage || 4 }
    return rawCourse
  })()

  const paymentStatus = getPaymentStatus(student, course)
  const isRecurring = course?.priceType === 'mes' || course?.priceType === 'paquete'
  const isProgram = course?.priceType === 'programa'

  useEffect(() => {
    const fetchPayments = async () => {
      if (!student?.id) return
      try {
        setLoading(true)
        const { data, error } = await supabase
          .from('payments').select('*').eq('student_id', student.id)
          .order('payment_date', { ascending: false }).limit(20)
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

  const cycleClasses = course?.classesPerCycle || course?.classesPerPackage || null
  const baseDate = student.last_payment_date || student.enrollment_date
  const cycleInfo = isRecurring && baseDate
    ? getCycleInfo(baseDate, student.next_payment_date, course?.classDays, cycleClasses)
    : null

  const coursePrice = course?.price || 0
  const amountPaid = parseFloat(student.amount_paid || 0)
  const balance = parseFloat(student.balance || 0)
  const hasBalance = amountPaid > 0 && balance > 0

  const validPayments = payments.filter(p => !p.voided)
  const totalHistoricPaid = validPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)

  const todayStr = getTodayEC()
  const todayDate = new Date(todayStr + 'T12:00:00')
  const isTodayClassDay = !!(course?.classDays && course.classDays.includes(todayDate.getDay()))

  const previewNextPayment = (() => {
    if (!course || !isRecurring) return null
    try {
      const classDays = course.classDays || null
      if (course.priceType === 'paquete') {
        const cycleStart = classDays ? getNextClassDay(todayDate, classDays) : todayDate
        const packageEnd = calculatePackageEndDate(cycleStart, classDays, course.classesPerPackage || 4)
        return formatDateForInput(new Date(calculateNextPackagePaymentDate(packageEnd, classDays)))
      } else {
        const cycleStart = classDays ? getNextClassDay(todayDate, classDays) : todayDate
        return formatDateForInput(new Date(calculateNextPaymentDate(cycleStart, classDays, course.classesPerCycle)))
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
      setTimeout(() => { setShowReactivateDialog(false); setReactivateSuccess(false); onClose() }, 1500)
    } else {
      setReactivateError(result.error || 'Error al reactivar el ciclo')
    }
  }

  const handleWhatsApp = () => {
    const phone = student.payer_phone || student.parent_phone || student.phone
    if (!phone) { alert('Este alumno no tiene teléfono registrado'); return }
    const days = getDaysUntilDue(student.next_payment_date)
    openWhatsApp(phone, buildReminderMessage(student, course?.name || 'N/A', days ?? 0, schoolName || 'Studio Dancers'))
  }

  const loyalty = getLoyaltyTier(student.consecutive_months)
  const daysUntilDue = student.next_payment_date ? getDaysUntilDue(student.next_payment_date) : null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[92vh] overflow-hidden flex flex-col">

        {/* ── Header ── */}
        <div className="bg-gradient-to-br from-purple-700 to-purple-900 text-white px-5 pt-5 pb-4">
          <div className="flex items-start justify-between mb-4">
            {/* Avatar + name */}
            <div className="flex items-center gap-3.5">
              <div className="relative shrink-0">
                {!photoError && (
                  <img
                    src={avatarUrl}
                    alt={student.name}
                    onError={() => setPhotoError(true)}
                    onLoad={() => setPhotoError(false)}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white/30"
                  />
                )}
                {photoError && (
                  <div className="w-16 h-16 rounded-full bg-white/20 border-2 border-white/30 flex items-center justify-center font-bold text-2xl text-white">
                    {student.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-lg font-bold leading-tight">{student.name}</h2>
                <p className="text-sm text-purple-200">{course?.name || 'Sin curso'}</p>
                {student.cedula && <p className="text-xs text-purple-300 mt-0.5">CI: {student.cedula}</p>}
              </div>
            </div>

            {/* Actions: WhatsApp + Close */}
            <div className="flex items-center gap-2 shrink-0">
              {(student.phone || student.parent_phone || student.payer_phone) && (
                <button
                  onClick={handleWhatsApp}
                  className="p-2 bg-green-500 hover:bg-green-400 rounded-xl transition-colors"
                  title="Enviar recordatorio WhatsApp"
                >
                  <MessageCircle size={18} />
                </button>
              )}
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Status + Loyalty badges */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${paymentStatus.color}`}>
              {paymentStatus.label}
            </span>
            {student.is_paused && (
              <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold">
                Pausado
              </span>
            )}
            {loyalty.tier && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
                style={{
                  background: loyalty.tier === 'oro' ? '#fef3c7' : loyalty.tier === 'plata' ? '#f1f5f9' : '#ffedd5',
                  color: loyalty.tier === 'oro' ? '#92400e' : loyalty.tier === 'plata' ? '#334155' : '#9a3412'
                }}>
                <Award size={11} />
                {loyalty.label} · {loyalty.discount}% off
              </span>
            )}
          </div>
        </div>

        {/* ── Scrollable content ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Payment cards grid */}
          <div className="p-4 grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1">Tarifa</p>
              <p className="text-xl font-bold text-gray-800">${coursePrice.toFixed(2)}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {course?.priceType === 'mes' ? (course?.classesPerCycle ? `${course.classesPerCycle} clases` : 'mensual')
                  : course?.priceType === 'paquete' ? `${course?.classesPerPackage || 4} clases`
                  : course?.priceType === 'programa' ? 'programa completo'
                  : 'por clase'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1">Último pago</p>
              <p className="text-sm font-bold text-gray-800">
                {student.last_payment_date ? formatDate(student.last_payment_date) : '—'}
              </p>
              {validPayments.length > 0 && (
                <p className="text-xs text-green-600 mt-0.5 font-medium">${parseFloat(validPayments[0].amount).toFixed(2)}</p>
              )}
            </div>

            {isRecurring && (
              <div className={`rounded-xl p-3 text-center border ${
                daysUntilDue !== null && daysUntilDue < 0 ? 'bg-red-50 border-red-200'
                : daysUntilDue !== null && daysUntilDue <= 5 ? 'bg-amber-50 border-amber-200'
                : 'bg-gray-50 border-transparent'
              }`}>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1">Próximo cobro</p>
                <p className="text-sm font-bold text-gray-800">
                  {student.next_payment_date ? formatDate(student.next_payment_date) : '—'}
                </p>
                {daysUntilDue !== null && (
                  <p className={`text-xs mt-0.5 font-medium ${
                    daysUntilDue < 0 ? 'text-red-600' : daysUntilDue === 0 ? 'text-amber-600' : 'text-gray-400'
                  }`}>
                    {daysUntilDue < 0 ? `${Math.abs(daysUntilDue)}d vencido`
                      : daysUntilDue === 0 ? 'Hoy'
                      : `en ${daysUntilDue} días`}
                  </p>
                )}
              </div>
            )}

            {(isRecurring || isProgram) && (
              <div className={`rounded-xl p-3 text-center border ${hasBalance ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-transparent'}`}>
                <p className="text-[10px] text-gray-400 uppercase tracking-wider font-medium mb-1">
                  {hasBalance ? 'Saldo pendiente' : 'Pagado ciclo'}
                </p>
                <p className={`text-xl font-bold ${hasBalance ? 'text-orange-600' : 'text-green-600'}`}>
                  {hasBalance ? `$${balance.toFixed(2)}` : amountPaid > 0 ? `$${amountPaid.toFixed(2)}` : '—'}
                </p>
                {hasBalance && <p className="text-xs text-orange-400 mt-0.5">de ${coursePrice.toFixed(2)}</p>}
              </div>
            )}
          </div>

          {/* Fidelidad */}
          {isRecurring && loyalty.months > 0 && (
            <div className="px-4 pb-3">
              <div className="rounded-xl p-3" style={{
                background: loyalty.tier === 'oro' ? '#fffbeb' : loyalty.tier === 'plata' ? '#f8fafc' : loyalty.tier === 'bronce' ? '#fff7ed' : '#f9fafb',
                border: `1px solid ${loyalty.tier === 'oro' ? '#fcd34d' : loyalty.tier === 'plata' ? '#cbd5e1' : loyalty.tier === 'bronce' ? '#fdba74' : '#e5e7eb'}`
              }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Award size={16} style={{ color: loyalty.tier === 'oro' ? '#b45309' : loyalty.tier === 'plata' ? '#475569' : '#c2410c' }} />
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
                    {loyalty.nextMonths} {loyalty.nextMonths === 1 ? 'mes' : 'meses'} más para nivel {loyalty.next}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Ciclo actual */}
          {cycleInfo && (
            <div className="px-4 pb-3">
              <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                <p className="text-[10px] font-bold text-purple-500 uppercase tracking-widest mb-3 text-center">Ciclo actual</p>
                <div className="grid grid-cols-2 gap-4 mb-2">
                  <div className="text-center">
                    <p className="text-[10px] text-purple-400 uppercase">Primera clase</p>
                    <p className="text-sm font-bold text-purple-700">{cycleInfo.cycleStart}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-purple-400 uppercase">Última clase</p>
                    <p className="text-sm font-bold text-purple-700">{cycleInfo.cycleEnd}</p>
                  </div>
                </div>
                <p className="text-xs text-center text-purple-500 mb-1">
                  Clases: <span className="font-semibold">{cycleInfo.daysLabel}</span>
                </p>
                <p className="text-center text-lg font-bold text-purple-700">
                  Clase {cycleInfo.classesPassed}/{cycleInfo.totalClasses}
                </p>
              </div>
            </div>
          )}

          {/* Contacto */}
          <div className="px-4 pb-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Contacto</p>
            <div className="bg-gray-50 rounded-xl p-3 space-y-2.5">
              {student.phone && (
                <a href={`tel:${student.phone}`} className="flex items-center gap-2.5 group">
                  <Phone size={14} className="text-purple-400 shrink-0" />
                  <span className="text-sm text-gray-700 group-hover:text-purple-600 transition-colors">{student.phone}</span>
                </a>
              )}
              {student.email && (
                <a href={`mailto:${student.email}`} className="flex items-center gap-2.5 group">
                  <Mail size={14} className="text-purple-400 shrink-0" />
                  <span className="text-sm text-gray-700 group-hover:text-purple-600 transition-colors truncate">{student.email}</span>
                </a>
              )}
              {student.parent_name && (
                <div className="flex items-center gap-2.5">
                  <User size={14} className="text-purple-400 shrink-0" />
                  <span className="text-sm text-gray-700">{student.parent_name}</span>
                  {student.parent_phone && student.parent_phone !== student.phone && (
                    <a href={`tel:${student.parent_phone}`} className="text-xs text-purple-500 hover:text-purple-700 ml-auto shrink-0">
                      {student.parent_phone}
                    </a>
                  )}
                </div>
              )}
              {student.payer_name && student.payer_name !== student.parent_name && student.payer_name !== student.name && (
                <div className="flex items-center gap-2.5">
                  <Wallet size={14} className="text-purple-400 shrink-0" />
                  <span className="text-sm text-gray-700">Pagador: {student.payer_name}</span>
                </div>
              )}
              {student.enrollment_date && (
                <div className="flex items-center gap-2.5">
                  <CalendarDays size={14} className="text-gray-300 shrink-0" />
                  <span className="text-xs text-gray-400">Inscripción: {formatDate(student.enrollment_date)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Notas */}
          {student.notes && (
            <div className="px-4 pb-3">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Notas</p>
              <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex gap-2">
                <FileText size={14} className="text-amber-400 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 leading-relaxed">{student.notes}</p>
              </div>
            </div>
          )}

          {/* Historial de pagos */}
          <div className="px-4 pb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Historial de pagos</p>
              <p className="text-xs text-gray-400">
                {validPayments.length} pago{validPayments.length !== 1 ? 's' : ''} · ${totalHistoricPaid.toFixed(2)}
              </p>
            </div>

            {loading ? (
              <div className="text-center py-6 text-gray-300 text-sm">Cargando...</div>
            ) : payments.length === 0 ? (
              <div className="text-center py-6 text-gray-300">
                <CreditCard size={28} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Sin pagos registrados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {payments.map(payment => {
                  const ms = methodStyle(payment.payment_method)
                  return (
                    <div
                      key={payment.id}
                      className={`rounded-xl p-3 flex items-center gap-3 border ${
                        payment.voided ? 'bg-red-50 border-red-200 opacity-60' : 'bg-white border-gray-100'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${payment.voided ? 'bg-red-100' : 'bg-green-100'}`}>
                        {payment.voided
                          ? <Ban size={13} className="text-red-500" />
                          : <CheckCircle size={13} className="text-green-600" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-sm font-bold ${payment.voided ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                            ${parseFloat(payment.amount).toFixed(2)}
                          </p>
                          {payment.discount_amount && !payment.voided && (
                            <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full font-medium">
                              -{payment.discount_amount}
                            </span>
                          )}
                          {payment.payment_type === 'installment' && !payment.voided && (
                            <span className="text-[10px] bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium">Abono</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-400">{formatDate(payment.payment_date)}</p>
                      </div>
                      <div className="shrink-0 text-right space-y-1">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${ms.bg} ${ms.text}`}>
                          {payment.payment_method}
                        </span>
                        {payment.receipt_number && (
                          <p className="text-[10px] text-gray-300">{payment.receipt_number}</p>
                        )}
                        {payment.days_late > 0 && !payment.voided && (
                          <p className="text-[10px] text-red-400">{payment.days_late}d tarde</p>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="p-4 border-t bg-gray-50 space-y-2">
          {isRecurring && onReactivate && (
            <button
              onClick={() => { setShowReactivateDialog(true); setReactivateError(null); setReactivateSuccess(false) }}
              className="w-full py-2.5 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
            >
              <RefreshCw size={15} /> Reactivar ciclo (gracia)
            </button>
          )}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors font-medium text-sm"
            >
              Cerrar
            </button>
            <button
              onClick={() => { onClose(); if (onPayment) onPayment(student) }}
              className="flex-1 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-medium flex items-center justify-center gap-2 text-sm"
            >
              <CreditCard size={16} /> Registrar Pago
            </button>
          </div>
        </div>
      </div>

      {/* Diálogo: Reactivar ciclo */}
      {showReactivateDialog && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5">
            <h3 className="text-lg font-bold text-gray-800 mb-1 text-center flex items-center justify-center gap-2">
              <RefreshCw size={20} className="text-purple-600" /> Reactivar ciclo
            </h3>
            <p className="text-xs text-gray-500 text-center mb-4">{student.name}</p>

            {reactivateSuccess ? (
              <div className="text-center py-4">
                <CheckCircle size={40} className="text-green-500 mx-auto mb-2" />
                <p className="text-green-700 font-semibold">¡Ciclo reactivado!</p>
                <p className="text-xs text-gray-500 mt-1">Próximo cobro: {previewNextPayment ? formatDate(previewNextPayment) : '—'}</p>
              </div>
            ) : (
              <>
                <div className={`rounded-xl p-3 mb-3 text-center ${isTodayClassDay ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
                  <p className={`text-sm font-medium ${isTodayClassDay ? 'text-green-700' : 'text-orange-700'}`}>
                    {isTodayClassDay ? '✅ Hoy es día de clase' : '⚠️ Hoy no es día de clase'}
                  </p>
                  {!isTodayClassDay && (
                    <p className="text-xs text-orange-600 mt-1">El ciclo arrancará desde la próxima clase disponible</p>
                  )}
                </div>
                <div className="bg-gray-50 rounded-xl p-3 mb-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Inicio ciclo:</span>
                    <span className="font-semibold text-gray-800">{formatDate(todayStr)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Próximo cobro:</span>
                    <span className="font-semibold text-purple-700">{previewNextPayment ? formatDate(previewNextPayment) : '—'}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Clases usadas:</span>
                    <span className="font-semibold text-gray-800">Se reinicia a 0</span>
                  </div>
                </div>
                {reactivateError && (
                  <p className="text-sm text-red-600 text-center mb-3 bg-red-50 rounded-lg px-3 py-2">{reactivateError}</p>
                )}
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowReactivateDialog(false)}
                    disabled={reactivating}
                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleReactivate}
                    disabled={reactivating}
                    className="flex-1 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors font-medium disabled:opacity-70 flex items-center justify-center gap-2"
                  >
                    {reactivating ? <><RefreshCw size={15} className="animate-spin" /> Activando...</> : 'Reactivar'}
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
