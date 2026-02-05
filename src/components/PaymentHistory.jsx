import { useState, useEffect } from 'react'
import { X, Calendar, Search, FileText, Printer, DollarSign, Filter, ChevronDown, ChevronUp, Ban, Lock, AlertTriangle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDate, formatDateForInput, calculateNextPaymentDate, getNextClassDay, calculatePackageEndDate, calculateNextPackagePaymentDate } from '../lib/dateUtils'
import { getCourseById } from '../lib/courses'

export default function PaymentHistory({
  onClose,
  onShowReceipt,
  onPaymentVoided,
  settings
}) {
  const [payments, setPayments] = useState([])
  const [quickPayments, setQuickPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [dateFrom, setDateFrom] = useState(() => {
    // Por defecto, últimos 30 días
    const date = new Date()
    date.setDate(date.getDate() - 30)
    return formatDateForInput(date)
  })
  const [dateTo, setDateTo] = useState(formatDateForInput(new Date()))
  const [searchTerm, setSearchTerm] = useState('')
  const [showFilters, setShowFilters] = useState(true)
  const [viewType, setViewType] = useState('all') // 'all', 'students', 'quick'

  // Estado para anulación
  const [voidModal, setVoidModal] = useState({ show: false, type: null, payment: null })
  const [voidPin, setVoidPin] = useState('')
  const [voidReason, setVoidReason] = useState('')
  const [voidError, setVoidError] = useState('')
  const [voidLoading, setVoidLoading] = useState(false)

  // Cargar pagos
  const fetchPayments = async () => {
    try {
      setLoading(true)

      // Pagos de estudiantes
      const { data: studentPayments, error: studentError } = await supabase
        .from('payments')
        .select('*, students(name, parent_name, cedula, parent_cedula, payer_name, payer_cedula, course_id, next_payment_date, phone)')
        .gte('payment_date', dateFrom)
        .lte('payment_date', dateTo)
        .order('payment_date', { ascending: false })

      if (studentError) throw studentError

      // Pagos rápidos
      const { data: quickData, error: quickError } = await supabase
        .from('quick_payments')
        .select('*')
        .gte('payment_date', dateFrom)
        .lte('payment_date', dateTo)
        .order('payment_date', { ascending: false })

      if (quickError) throw quickError

      setPayments(studentPayments || [])
      setQuickPayments(quickData || [])
    } catch (err) {
      console.error('Error fetching payments:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [dateFrom, dateTo])

  // Filtrar por búsqueda (excluir anulados del total pero mostrarlos)
  const filteredPayments = payments.filter(p => {
    const searchLower = searchTerm.toLowerCase()
    return p.students?.name?.toLowerCase().includes(searchLower) ||
           p.payer_name?.toLowerCase().includes(searchLower) ||
           p.receipt_number?.toLowerCase().includes(searchLower) ||
           p.payer_cedula?.includes(searchTerm)
  })

  const filteredQuickPayments = quickPayments.filter(p => {
    const searchLower = searchTerm.toLowerCase()
    return p.customer_name?.toLowerCase().includes(searchLower) ||
           p.receipt_number?.toLowerCase().includes(searchLower) ||
           p.customer_cedula?.includes(searchTerm)
  })

  // Calcular totales (solo no anulados)
  const totalStudentPayments = filteredPayments
    .filter(p => !p.voided)
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
  const totalQuickPayments = filteredQuickPayments
    .filter(p => !p.voided)
    .reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
  const grandTotal = totalStudentPayments + totalQuickPayments

  // Anular comprobante
  const handleVoid = async () => {
    if (!settings.security_pin) {
      setVoidError('No hay PIN configurado')
      return
    }
    if (voidPin !== settings.security_pin) {
      setVoidError('PIN incorrecto')
      setVoidPin('')
      return
    }

    setVoidLoading(true)
    try {
      const { type, payment } = voidModal
      const table = type === 'student' ? 'payments' : 'quick_payments'

      const { error } = await supabase
        .from(table)
        .update({
          voided: true,
          voided_at: new Date().toISOString(),
          voided_reason: voidReason || 'Anulado por administrador'
        })
        .eq('id', payment.id)

      if (error) throw error

      // Si es pago de alumno, recalcular next_payment_date desde el pago anterior
      if (type === 'student' && payment.student_id) {
        await recalculateStudentAfterVoid(payment.student_id, payment.id)
      }

      // Actualizar estado local
      if (type === 'student') {
        setPayments(prev => prev.map(p =>
          p.id === payment.id ? { ...p, voided: true, voided_at: new Date().toISOString(), voided_reason: voidReason } : p
        ))
      } else {
        setQuickPayments(prev => prev.map(p =>
          p.id === payment.id ? { ...p, voided: true, voided_at: new Date().toISOString(), voided_reason: voidReason } : p
        ))
      }

      closeVoidModal()
    } catch (err) {
      setVoidError('Error: ' + err.message)
    } finally {
      setVoidLoading(false)
    }
  }

  // Recalcular fechas del alumno después de anular un pago
  const recalculateStudentAfterVoid = async (studentId, voidedPaymentId) => {
    try {
      // Obtener TODOS los pagos del alumno y filtrar manualmente
      // (evita problemas de timing con el UPDATE anterior)
      const { data: allStudentPayments, error: fetchError } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false })

      if (fetchError) throw fetchError

      // Filtrar: excluir el que acabamos de anular + los que ya estaban anulados
      const validPayments = (allStudentPayments || []).filter(p =>
        p.id !== voidedPaymentId && !p.voided
      )

      // Obtener datos del alumno
      const { data: student, error: studentFetchError } = await supabase
        .from('students')
        .select('*')
        .eq('id', studentId)
        .single()

      if (studentFetchError) throw studentFetchError

      const course = getCourseById(student.course_id)
      if (!course) return

      const classDays = course.classDays || null
      const isMonthly = course.priceType === 'mes'
      const isPackage = course.priceType === 'paquete'

      if (validPayments.length > 0) {
        // Hay pagos anteriores válidos: recalcular desde el último
        const lastValidPayment = validPayments[0]
        const lastPayDate = new Date(lastValidPayment.payment_date + 'T12:00:00')
        let newNextPayment = null

        if (isPackage && classDays) {
          const classesPerPackage = course.classesPerPackage || 4
          const cycleStart = getNextClassDay(lastPayDate, classDays)
          const packageEnd = calculatePackageEndDate(cycleStart, classDays, classesPerPackage)
          newNextPayment = calculateNextPackagePaymentDate(packageEnd, classDays)
        } else if (isMonthly && classDays) {
          const classesPerCycle = course.classesPerCycle || null
          const startDate = getNextClassDay(lastPayDate, classDays)
          newNextPayment = calculateNextPaymentDate(startDate, classDays, classesPerCycle)
        }

        const updateData = {
          last_payment_date: lastValidPayment.payment_date,
          next_payment_date: newNextPayment ? formatDateForInput(new Date(newNextPayment)) : null,
          payment_status: 'paid'
        }

        const { error: updateError } = await supabase.from('students').update(updateData).eq('id', studentId)
        if (updateError) console.error('Error updating student after void:', updateError)
      } else {
        // No hay pagos válidos: limpiar todo — alumno vuelve a estado "sin cobro"
        const { error: updateError } = await supabase.from('students').update({
          last_payment_date: null,
          next_payment_date: null,
          payment_status: 'pending',
          amount_paid: 0,
          balance: 0,
          classes_used: isPackage ? 0 : null
        }).eq('id', studentId)
        if (updateError) console.error('Error clearing student after void:', updateError)
      }

      // Notificar al componente padre para que recargue los alumnos
      if (onPaymentVoided) onPaymentVoided()
    } catch (err) {
      console.error('Error recalculating student after void:', err)
    }
  }

  const openVoidModal = (type, payment) => {
    setVoidModal({ show: true, type, payment })
    setVoidPin('')
    setVoidReason('')
    setVoidError('')
  }

  const closeVoidModal = () => {
    setVoidModal({ show: false, type: null, payment: null })
    setVoidPin('')
    setVoidReason('')
    setVoidError('')
  }

  // Función para reimprimir comprobante de estudiante
  const handleReprintStudent = (payment) => {
    const student = payment.students
    onShowReceipt({
      payment: {
        ...payment,
        receiptNumber: payment.receipt_number
      },
      student: {
        ...student,
        name: student?.name,
        course_id: student?.course_id,
        phone: student?.phone,
        payer_name: payment.payer_name || student?.payer_name,
        payer_cedula: payment.payer_cedula || student?.payer_cedula,
        total_program_price: payment.total_program_price,
        amount_paid: payment.amount_paid_after || payment.amount,
        balance: payment.balance_after,
        next_payment_date: student?.next_payment_date
      },
      isReprint: true
    })
  }

  // Función para reimprimir pago rápido
  const handleReprintQuick = (payment) => {
    onShowReceipt({
      payment: {
        id: payment.id,
        amount: payment.amount,
        payment_date: payment.payment_date,
        payment_method: payment.payment_method,
        bank_name: payment.bank_name,
        transfer_receipt: payment.transfer_receipt,
        receipt_number: payment.receipt_number,
        receiptNumber: payment.receipt_number,
        notes: payment.notes
      },
      student: {
        name: payment.customer_name,
        cedula: payment.customer_cedula,
        phone: payment.customer_phone,
        course_id: payment.class_type,
        payer_name: payment.customer_name,
        payer_cedula: payment.customer_cedula
      },
      isQuickPayment: true,
      className: payment.class_name,
      isReprint: true
    })
  }

  // Presets de fecha
  const setDatePreset = (preset) => {
    const today = new Date()
    let from = new Date()

    switch (preset) {
      case 'today':
        from = today
        break
      case 'week':
        from.setDate(today.getDate() - 7)
        break
      case 'month':
        from.setMonth(today.getMonth() - 1)
        break
      case 'year':
        from.setFullYear(today.getFullYear() - 1)
        break
    }

    setDateFrom(formatDateForInput(from))
    setDateTo(formatDateForInput(today))
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Calendar className="text-blue-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Historial de Pagos</h2>
                <p className="text-sm text-gray-500">Consulta, reimprime y anula comprobantes</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b bg-gray-50">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 text-gray-700 font-medium mb-3"
          >
            <Filter size={18} />
            Filtros
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>

          {showFilters && (
            <div className="space-y-4">
              {/* Presets */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setDatePreset('today')}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                >
                  Hoy
                </button>
                <button
                  onClick={() => setDatePreset('week')}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                >
                  Última semana
                </button>
                <button
                  onClick={() => setDatePreset('month')}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                >
                  Último mes
                </button>
                <button
                  onClick={() => setDatePreset('year')}
                  className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm hover:bg-blue-200 transition-colors"
                >
                  Último año
                </button>
              </div>

              {/* Date range */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Desde</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hasta</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                  <select
                    value={viewType}
                    onChange={(e) => setViewType(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">Todos los pagos</option>
                    <option value="students">Solo alumnos</option>
                    <option value="quick">Solo pagos rápidos</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Buscar</label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                    <input
                      type="text"
                      placeholder="Nombre, cédula o N° recibo..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-3 text-center border">
              <p className="text-xs text-gray-500">Pagos Alumnos</p>
              <p className="text-lg font-bold text-purple-600">${totalStudentPayments.toFixed(2)}</p>
              <p className="text-xs text-gray-400">{filteredPayments.filter(p => !p.voided).length} pagos</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-center border">
              <p className="text-xs text-gray-500">Pagos Rápidos</p>
              <p className="text-lg font-bold text-yellow-600">${totalQuickPayments.toFixed(2)}</p>
              <p className="text-xs text-gray-400">{filteredQuickPayments.filter(p => !p.voided).length} pagos</p>
            </div>
            <div className="bg-green-50 rounded-lg p-3 text-center border border-green-200">
              <p className="text-xs text-green-600 font-medium">TOTAL</p>
              <p className="text-xl font-bold text-green-700">${grandTotal.toFixed(2)}</p>
              <p className="text-xs text-green-500">{filteredPayments.filter(p => !p.voided).length + filteredQuickPayments.filter(p => !p.voided).length} pagos</p>
            </div>
          </div>
        </div>

        {/* Payment List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-12 text-center text-gray-500">
              <div className="animate-spin text-4xl mb-4">⏳</div>
              <p>Cargando pagos...</p>
            </div>
          ) : (
            <div className="divide-y">
              {/* Student Payments */}
              {(viewType === 'all' || viewType === 'students') && filteredPayments.map(payment => (
                <div
                  key={`student-${payment.id}`}
                  className={`p-4 transition-colors ${payment.voided ? 'bg-red-50/50 opacity-60' : 'hover:bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        payment.voided ? 'bg-red-100 text-red-700' : 'bg-purple-100 text-purple-700'
                      }`}>
                        {payment.voided ? <Ban size={18} /> : (payment.students?.name?.charAt(0) || '?')}
                      </div>
                      <div>
                        <p className={`font-medium ${payment.voided ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                          {payment.students?.name || 'Desconocido'}
                        </p>
                        <p className="text-sm text-gray-500">
                          {payment.receipt_number} • {formatDate(payment.payment_date)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {payment.payment_method}
                          {payment.bank_name && ` - ${payment.bank_name}`}
                        </p>
                        {payment.voided && (
                          <p className="text-xs text-red-500 font-medium mt-0.5">
                            ANULADO {payment.voided_reason ? `- ${payment.voided_reason}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className={`font-bold ${payment.voided ? 'text-red-400 line-through' : 'text-green-600'}`}>
                          ${parseFloat(payment.amount).toFixed(2)}
                        </p>
                        {payment.voided ? (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                            Anulado
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full">
                            Alumno
                          </span>
                        )}
                      </div>
                      {!payment.voided && (
                        <>
                          <button
                            onClick={() => handleReprintStudent(payment)}
                            className="p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
                            title="Reimprimir comprobante"
                          >
                            <Printer size={18} />
                          </button>
                          <button
                            onClick={() => openVoidModal('student', payment)}
                            className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                            title="Anular comprobante"
                          >
                            <Ban size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Quick Payments */}
              {(viewType === 'all' || viewType === 'quick') && filteredQuickPayments.map(payment => (
                <div
                  key={`quick-${payment.id}`}
                  className={`p-4 transition-colors ${payment.voided ? 'bg-red-50/50 opacity-60' : 'hover:bg-yellow-50/50'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                        payment.voided ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {payment.voided ? <Ban size={18} /> : '⚡'}
                      </div>
                      <div>
                        <p className={`font-medium ${payment.voided ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                          {payment.customer_name}
                        </p>
                        <p className="text-sm text-gray-500">
                          {payment.receipt_number} • {formatDate(payment.payment_date)}
                        </p>
                        <p className="text-xs text-gray-400">
                          {payment.class_name} • {payment.payment_method}
                          {payment.bank_name && ` - ${payment.bank_name}`}
                        </p>
                        {payment.voided && (
                          <p className="text-xs text-red-500 font-medium mt-0.5">
                            ANULADO {payment.voided_reason ? `- ${payment.voided_reason}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right">
                        <p className={`font-bold ${payment.voided ? 'text-red-400 line-through' : 'text-green-600'}`}>
                          ${parseFloat(payment.amount).toFixed(2)}
                        </p>
                        {payment.voided ? (
                          <span className="text-xs px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                            Anulado
                          </span>
                        ) : (
                          <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full">
                            Clase Diaria
                          </span>
                        )}
                      </div>
                      {!payment.voided && (
                        <>
                          <button
                            onClick={() => handleReprintQuick(payment)}
                            className="p-2 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg transition-colors"
                            title="Reimprimir comprobante"
                          >
                            <Printer size={18} />
                          </button>
                          <button
                            onClick={() => openVoidModal('quick', payment)}
                            className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                            title="Anular comprobante"
                          >
                            <Ban size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Empty state */}
              {filteredPayments.length === 0 && filteredQuickPayments.length === 0 && (
                <div className="p-12 text-center text-gray-500">
                  <FileText size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No hay pagos en el rango seleccionado</p>
                  <p className="text-sm mt-2">Ajusta las fechas o los filtros de búsqueda</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>

      {/* Modal de Anulación */}
      {voidModal.show && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-xl shadow-xl w-80">
            <div className="px-4 py-3 border-b bg-red-50 rounded-t-xl flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="text-red-500" size={18} />
                <span className="font-medium text-red-700 text-sm">Anular Comprobante</span>
              </div>
              <button onClick={closeVoidModal} className="p-1 hover:bg-red-100 rounded">
                <X size={16} className="text-red-500" />
              </button>
            </div>

            <form onSubmit={(e) => { e.preventDefault(); handleVoid() }} className="p-4">
              <div className="text-center mb-3">
                <p className="text-xs text-gray-500">¿Anular este comprobante?</p>
                <p className="font-semibold text-gray-800">
                  {voidModal.payment?.receipt_number}
                </p>
                <p className="text-sm text-gray-500">
                  ${parseFloat(voidModal.payment?.amount || 0).toFixed(2)}
                </p>
              </div>

              {/* Razón */}
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1">Razón (opcional)</label>
                <input
                  type="text"
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-sm"
                  placeholder="Motivo de anulación..."
                />
              </div>

              {/* PIN */}
              <div className="mb-3">
                <label className="block text-xs text-gray-500 mb-1 flex items-center gap-1">
                  <Lock size={10} /> PIN de seguridad
                </label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={voidPin}
                  onChange={(e) => {
                    setVoidPin(e.target.value.replace(/\D/g, ''))
                    setVoidError('')
                  }}
                  className={`w-full px-3 py-2 border rounded-lg text-center text-lg tracking-widest ${
                    voidError ? 'border-red-300' : 'border-gray-200'
                  }`}
                  placeholder="••••"
                  autoFocus
                />
                {voidError && <p className="text-red-500 text-xs mt-1 text-center">{voidError}</p>}
              </div>

              {/* Botones */}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={closeVoidModal}
                  className="flex-1 px-3 py-2.5 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg text-sm font-semibold border border-gray-300"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={voidLoading || voidPin.length < 4}
                  className={`flex-1 px-3 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1 shadow-sm transition-all ${
                    voidLoading || voidPin.length < 4
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-red-600 hover:bg-red-700 text-white'
                  }`}
                >
                  <Ban size={14} />
                  {voidLoading ? 'Anulando...' : 'Anular'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
