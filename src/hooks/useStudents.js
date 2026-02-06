import { useState, useEffect } from 'react'
import { addDays } from 'date-fns'
import { supabase } from '../lib/supabase'
import { logAudit } from '../lib/auditLog'
import { calculateNextPaymentDate, getNextClassDay, calculatePackageEndDate, calculateNextPackagePaymentDate, formatDateForInput } from '../lib/dateUtils'
import { getCourseById } from '../lib/courses'

export function useStudents() {
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Cargar estudiantes
  const fetchStudents = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setStudents(data || [])
    } catch (err) {
      setError(err.message)
      console.error('Error fetching students:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStudents()
  }, [])

  // Crear estudiante
  const createStudent = async (studentData) => {
    try {
      // Usar fecha de registro del formulario o fecha actual
      const enrollmentDate = studentData.enrollmentDate
        ? new Date(studentData.enrollmentDate + 'T12:00:00')
        : new Date()

      // Obtener información del curso
      const course = getCourseById(studentData.courseId)
      const coursePrice = course?.price || 0
      const isMonthly = course?.priceType === 'mes'

      // NO calcular próximo pago al registrar - se calculará cuando haga el primer pago
      const nextPayment = null

      const newStudent = {
        name: studentData.name,
        cedula: studentData.cedula || null,
        age: studentData.age ? parseInt(studentData.age) : null,
        phone: studentData.phone || null,
        email: studentData.email || null,
        is_minor: studentData.isMinor !== false,
        // Datos del representante
        parent_name: studentData.parentName || null,
        parent_cedula: studentData.parentCedula || null,
        parent_phone: studentData.parentPhone || null,
        parent_email: studentData.parentEmail || null,
        parent_address: studentData.parentAddress || null,
        // Datos del pagador (si es diferente)
        payer_name: studentData.hasDifferentPayer
          ? studentData.payerName
          : (studentData.parentName || studentData.name || null),
        payer_cedula: studentData.hasDifferentPayer
          ? studentData.payerCedula
          : (studentData.parentCedula || studentData.cedula || null),
        payer_phone: studentData.hasDifferentPayer
          ? studentData.payerPhone
          : (studentData.parentPhone || studentData.phone || null),
        payer_address: studentData.hasDifferentPayer
          ? studentData.payerAddress
          : null,
        // Curso
        course_id: studentData.courseId,
        enrollment_date: formatDateForInput(enrollmentDate),
        last_payment_date: null,
        next_payment_date: nextPayment ? formatDateForInput(nextPayment) : null,
        monthly_fee: coursePrice,
        total_program_price: course?.priceType === 'programa' ? coursePrice : null,
        amount_paid: 0,
        balance: course?.priceType === 'programa' ? coursePrice : 0,
        classes_used: course?.priceType === 'paquete' ? 0 : null,
        payment_status: 'pending',
        notes: studentData.notes || null,
        active: true
      }

      const { data, error } = await supabase
        .from('students')
        .insert([newStudent])
        .select()
        .single()

      if (error) throw error

      setStudents(prev => [data, ...prev])
      logAudit({ action: 'student_created', tableName: 'students', recordId: data.id, newData: { name: data.name, course_id: data.course_id } })
      return { success: true, data }
    } catch (err) {
      console.error('Error creating student:', err)
      return { success: false, error: err.message }
    }
  }

  // Actualizar estudiante
  const updateStudent = async (id, studentData) => {
    try {
      // Obtener información del curso
      const course = getCourseById(studentData.courseId)
      const coursePrice = course?.price || 0

      const updateData = {
        name: studentData.name,
        cedula: studentData.cedula || null,
        age: parseInt(studentData.age),
        phone: studentData.phone || null,
        email: studentData.email || null,
        is_minor: studentData.isMinor !== false,
        parent_name: studentData.parentName || null,
        parent_cedula: studentData.parentCedula || null,
        parent_phone: studentData.parentPhone || null,
        parent_email: studentData.parentEmail || null,
        parent_address: studentData.parentAddress || null,
        payer_name: studentData.hasDifferentPayer
          ? studentData.payerName
          : (studentData.parentName || studentData.name || null),
        payer_cedula: studentData.hasDifferentPayer
          ? studentData.payerCedula
          : (studentData.parentCedula || studentData.cedula || null),
        payer_phone: studentData.hasDifferentPayer
          ? studentData.payerPhone
          : (studentData.parentPhone || studentData.phone || null),
        payer_address: studentData.hasDifferentPayer
          ? studentData.payerAddress
          : null,
        course_id: studentData.courseId,
        monthly_fee: coursePrice,
        notes: studentData.notes || null
      }

      const { data, error } = await supabase
        .from('students')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error

      setStudents(prev => prev.map(s => s.id === id ? data : s))
      logAudit({ action: 'student_updated', tableName: 'students', recordId: id, newData: { name: data.name } })
      return { success: true, data }
    } catch (err) {
      console.error('Error updating student:', err)
      return { success: false, error: err.message }
    }
  }

  // Eliminar estudiante (soft delete)
  const deleteStudent = async (id) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({ active: false })
        .eq('id', id)

      if (error) throw error

      setStudents(prev => prev.filter(s => s.id !== id))
      logAudit({ action: 'student_deleted', tableName: 'students', recordId: id })
      return { success: true }
    } catch (err) {
      console.error('Error deleting student:', err)
      return { success: false, error: err.message }
    }
  }

  // Registrar pago y actualizar fechas
  const registerPayment = async (studentId, paymentData) => {
    try {
      // Usar fecha de pago del formulario o fecha actual
      const paymentDate = paymentData.paymentDate
        ? new Date(paymentData.paymentDate + 'T12:00:00')
        : new Date()

      const student = students.find(s => s.id === studentId)
      const course = getCourseById(student?.course_id)

      const isMonthly = course?.priceType === 'mes'
      const isProgram = course?.priceType === 'programa'
      const isPackage = course?.priceType === 'paquete'
      const coursePrice = course?.price || 0

      // Obtener los días de clase del curso (si tiene)
      const classDays = course?.classDays || null

      // Verificar si es pago con descuento (NO es abono parcial)
      const hasDiscount = paymentData.discount?.hasDiscount || false
      // Si tiene descuento, el precio efectivo del ciclo es lo que pagó (pago completo con descuento)
      // Si NO tiene descuento, usar precio normal del curso
      const effectiveCyclePrice = hasDiscount ? paymentData.amount : coursePrice

      // --- Lógica de abonos/saldo para TODOS los tipos recurrentes (mes, paquete, programa) ---
      // amount_paid acumula lo pagado en el ciclo actual
      // balance = effectiveCyclePrice - amount_paid (lo que falta)
      let prevAmountPaid = parseFloat(student?.amount_paid || 0)
      let newAmountPaid = prevAmountPaid + paymentData.amount
      let newBalance = effectiveCyclePrice - newAmountPaid
      let newPaymentStatus = 'pending'
      let classesUsed = student?.classes_used || 0
      let nextPayment = student?.next_payment_date
      let isPartialPayment = false

      if (isProgram) {
        // Programa: acumula hasta completar precio total
        const totalPrice = parseFloat(student?.total_program_price || coursePrice)
        newBalance = totalPrice - newAmountPaid
        if (newBalance <= 0) {
          newPaymentStatus = 'paid'
          newBalance = 0
        } else {
          newPaymentStatus = 'partial'
          isPartialPayment = true
        }
      } else if (isMonthly || isPackage) {
        // Mensual o Paquete: soportar abonos parciales
        // Si tiene descuento, es pago COMPLETO (el ciclo se pagó con descuento)
        // Si NO tiene descuento y el monto es menor al precio → es abono parcial
        if (!hasDiscount && newAmountPaid < coursePrice) {
          newPaymentStatus = 'partial'
          isPartialPayment = true
          newBalance = coursePrice - newAmountPaid
          // NO recalcular next_payment_date en abono parcial
          // Mantener el ciclo actual
        } else {
          // Pago completo (o se completó con este abono)
          newPaymentStatus = 'paid'
          newBalance = 0
          // Resetear amount_paid para el próximo ciclo
          newAmountPaid = 0

          // Recalcular next_payment_date
          if (isPackage) {
            const classesPerPackage = course?.classesPerPackage || 4
            const currentNextPaymentDate = student?.next_payment_date ? new Date(student.next_payment_date + 'T12:00:00') : null

            let cycleStartDate
            if (currentNextPaymentDate && currentNextPaymentDate > paymentDate) {
              cycleStartDate = currentNextPaymentDate
            } else {
              cycleStartDate = getNextClassDay(paymentDate, classDays)
            }

            const packageEnd = calculatePackageEndDate(cycleStartDate, classDays, classesPerPackage)
            nextPayment = calculateNextPackagePaymentDate(packageEnd, classDays)
            classesUsed = 0
          } else if (isMonthly) {
            const currentNextPaymentDate = student?.next_payment_date ? new Date(student.next_payment_date + 'T12:00:00') : null
            const classesPerCycle = course?.classesPerCycle || null

            if (!currentNextPaymentDate) {
              const startDate = classDays ? getNextClassDay(paymentDate, classDays) : paymentDate
              nextPayment = calculateNextPaymentDate(startDate, classDays, classesPerCycle)
            } else if (currentNextPaymentDate > paymentDate) {
              nextPayment = calculateNextPaymentDate(currentNextPaymentDate, classDays, classesPerCycle)
            } else {
              const startDate = classDays ? getNextClassDay(paymentDate, classDays) : paymentDate
              nextPayment = calculateNextPaymentDate(startDate, classDays, classesPerCycle)
            }
          }
        }
      }

      // Actualizar estudiante
      const updateFields = {
        last_payment_date: formatDateForInput(paymentDate),
        next_payment_date: nextPayment ? formatDateForInput(new Date(nextPayment)) : null,
        amount_paid: newAmountPaid,
        balance: Math.max(0, newBalance),
        payment_status: newPaymentStatus,
        classes_used: isPackage ? classesUsed : undefined,
        is_paused: false,
        pause_date: null
      }

      // Para programas mantener total_program_price
      if (isProgram) {
        updateFields.total_program_price = parseFloat(student?.total_program_price || coursePrice)
      }

      const { error: studentError } = await supabase
        .from('students')
        .update(updateFields)
        .eq('id', studentId)

      if (studentError) throw studentError

      // Crear registro de pago
      const paymentInsert = {
        student_id: studentId,
        amount: paymentData.amount,
        payment_date: formatDateForInput(paymentDate),
        receipt_number: paymentData.receiptNumber,
        payment_method: paymentData.paymentMethod || 'Efectivo',
        payment_type: paymentData.paymentType || 'full',
        bank_name: paymentData.bankName || null,
        transfer_receipt: paymentData.transferReceipt || null,
        payer_name: student?.payer_name || student?.parent_name || student?.name || null,
        payer_cedula: student?.payer_cedula || student?.parent_cedula || student?.cedula || null,
        notes: paymentData.notes || null
      }

      // Agregar datos de descuento si aplica
      if (paymentData.discount?.hasDiscount) {
        paymentInsert.discount_original_price = parseFloat(paymentData.discount.originalPrice)
        paymentInsert.discount_amount = parseFloat(paymentData.discount.discountAmount)
        paymentInsert.discount_type = paymentData.discount.discountType
        paymentInsert.discount_value = paymentData.discount.discountValue?.toString() || null
      }

      const { data: paymentRecord, error: paymentError } = await supabase
        .from('payments')
        .insert([paymentInsert])
        .select()
        .single()

      if (paymentError) throw paymentError

      // Actualizar estado local
      setStudents(prev => prev.map(s => {
        if (s.id === studentId) {
          return {
            ...s,
            last_payment_date: formatDateForInput(paymentDate),
            next_payment_date: updateFields.next_payment_date,
            amount_paid: updateFields.amount_paid,
            balance: updateFields.balance,
            payment_status: updateFields.payment_status,
            classes_used: isPackage ? classesUsed : s.classes_used
          }
        }
        return s
      }))

      logAudit({ action: 'payment_registered', tableName: 'payments', recordId: paymentRecord.id, newData: { amount: paymentData.amount, student_id: studentId, payment_method: paymentData.paymentMethod } })

      return {
        success: true,
        data: {
          ...paymentRecord,
          next_payment_date: updateFields.next_payment_date,
          newBalance: Math.max(0, newBalance),
          newAmountPaid: newAmountPaid,
          paymentStatus: newPaymentStatus,
          coursePrice: coursePrice,
          isPartialPayment,
          discount: paymentData.discount || null
        }
      }
    } catch (err) {
      console.error('Error registering payment:', err)
      return { success: false, error: err.message }
    }
  }

  // Pausar/Congelar 1 día de clase
  // Extiende el next_payment_date por los días hasta el siguiente día de clase
  const pauseStudent = async (studentId) => {
    try {
      const student = students.find(s => s.id === studentId)
      if (!student) throw new Error('Alumno no encontrado')

      const course = getCourseById(student.course_id)
      if (!course || (course.priceType !== 'mes' && course.priceType !== 'paquete')) {
        throw new Error('Solo se pueden pausar alumnos con clases mensuales o por paquete')
      }

      if (student.is_paused) {
        throw new Error('El alumno ya tiene una pausa activa')
      }

      if (!student.next_payment_date) {
        throw new Error('El alumno no tiene un ciclo de pago activo')
      }

      const classDays = course.classDays || null
      const today = new Date()
      today.setHours(12, 0, 0, 0)

      // Pausar = mover el próximo pago al siguiente día de clase después del actual
      // Es decir, agregar exactamente 1 día de clase (no días calendario)
      const currentNextPayment = new Date(student.next_payment_date + 'T12:00:00')

      // Obtener el siguiente día de clase después de la fecha actual de próximo pago
      const newNextPayment = getNextClassDay(addDays(currentNextPayment, 1), classDays)

      // Calcular cuántos días calendario se agregaron (para mostrar al usuario)
      const daysToAdd = Math.round((newNextPayment - currentNextPayment) / (1000 * 60 * 60 * 24))

      const { error } = await supabase
        .from('students')
        .update({
          next_payment_date: formatDateForInput(newNextPayment),
          is_paused: true,
          pause_date: formatDateForInput(today)
        })
        .eq('id', studentId)

      if (error) throw error

      setStudents(prev => prev.map(s => {
        if (s.id === studentId) {
          return {
            ...s,
            next_payment_date: formatDateForInput(newNextPayment),
            is_paused: true,
            pause_date: formatDateForInput(today)
          }
        }
        return s
      }))

      return { success: true, daysAdded: daysToAdd }
    } catch (err) {
      console.error('Error pausing student:', err)
      return { success: false, error: err.message }
    }
  }

  // Reactivar pausa (quitar flag de pausa)
  const unpauseStudent = async (studentId) => {
    try {
      const { error } = await supabase
        .from('students')
        .update({
          is_paused: false,
          pause_date: null
        })
        .eq('id', studentId)

      if (error) throw error

      setStudents(prev => prev.map(s => {
        if (s.id === studentId) {
          return { ...s, is_paused: false, pause_date: null }
        }
        return s
      }))

      return { success: true }
    } catch (err) {
      console.error('Error unpausing student:', err)
      return { success: false, error: err.message }
    }
  }

  // Recalcular fechas de pago de todos los alumnos activos
  // Verifica pagos válidos en Supabase y recalcula next_payment_date
  const recalculatePaymentDates = async () => {
    const results = []
    for (const student of students) {
      const course = getCourseById(student.course_id)
      if (!course) continue

      const isMonthly = course.priceType === 'mes'
      const isPackage = course.priceType === 'paquete'
      if (!isMonthly && !isPackage) continue

      const classDays = course.classDays || null

      // Obtener pagos válidos del alumno desde Supabase
      const { data: validPayments } = await supabase
        .from('payments')
        .select('payment_date')
        .eq('student_id', student.id)
        .eq('voided', false)
        .order('payment_date', { ascending: false })
        .limit(1)

      const lastValidPayment = validPayments?.[0] || null

      if (!lastValidPayment) {
        // Sin pagos válidos: limpiar a estado "sin cobro"
        if (student.next_payment_date || student.last_payment_date || student.payment_status !== 'pending') {
          const { error } = await supabase
            .from('students')
            .update({
              last_payment_date: null,
              next_payment_date: null,
              payment_status: 'pending',
              amount_paid: 0,
              balance: 0,
              classes_used: isPackage ? 0 : null
            })
            .eq('id', student.id)

          results.push({
            name: student.name,
            course: course.name,
            oldDate: student.next_payment_date || 'null',
            newDate: 'Sin cobro (limpiado)',
            error: error?.message || null
          })
        }
        continue
      }

      // Tiene pagos válidos: recalcular fecha
      if (!classDays || classDays.length === 0) continue

      const lastPayDate = new Date(lastValidPayment.payment_date + 'T12:00:00')
      let newNextPayment = null

      if (isPackage) {
        const classesPerPackage = course.classesPerPackage || 4
        const cycleStart = getNextClassDay(lastPayDate, classDays)
        const packageEnd = calculatePackageEndDate(cycleStart, classDays, classesPerPackage)
        newNextPayment = calculateNextPackagePaymentDate(packageEnd, classDays)
      } else if (isMonthly) {
        const classesPerCycle = course.classesPerCycle || null
        const startDate = getNextClassDay(lastPayDate, classDays)
        newNextPayment = calculateNextPaymentDate(startDate, classDays, classesPerCycle)
      }

      if (!newNextPayment) continue

      const newDateStr = formatDateForInput(new Date(newNextPayment))
      const newLastPayStr = formatDateForInput(lastPayDate)
      const oldDateStr = student.next_payment_date || 'null'

      // Actualizar si cambió la fecha de próximo pago o last_payment_date
      if (newDateStr !== oldDateStr || student.last_payment_date !== newLastPayStr) {
        const { error } = await supabase
          .from('students')
          .update({
            next_payment_date: newDateStr,
            last_payment_date: newLastPayStr,
            payment_status: 'paid'
          })
          .eq('id', student.id)

        results.push({
          name: student.name,
          course: course.name,
          oldDate: oldDateStr,
          newDate: newDateStr,
          error: error?.message || null
        })
      }
    }

    // Recargar datos
    if (results.length > 0) {
      await fetchStudents()
    }

    return results
  }

  return {
    students,
    loading,
    error,
    fetchStudents,
    createStudent,
    updateStudent,
    deleteStudent,
    registerPayment,
    pauseStudent,
    unpauseStudent,
    recalculatePaymentDates
  }
}
