import { addMonths, addDays, subDays, differenceInDays, format, parseISO, getDay } from 'date-fns'
import { es } from 'date-fns/locale'

/**
 * Obtener la fecha actual en zona horaria de Ecuador (UTC-5)
 * Evita que new Date() devuelva el día siguiente cuando el servidor está en UTC
 */
export const getNowEC = () => {
  const now = new Date()
  // Obtener offset de Ecuador: UTC-5 = -300 minutos
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
  return new Date(utcMs - 5 * 3600000)
}

/**
 * Obtener la fecha de hoy como string yyyy-MM-dd en zona horaria de Ecuador
 */
export const getTodayEC = () => {
  const ec = getNowEC()
  const y = ec.getFullYear()
  const m = String(ec.getMonth() + 1).padStart(2, '0')
  const d = String(ec.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Obtener el próximo día de clase a partir de una fecha
 * @param {Date} fromDate - Fecha desde la cual buscar
 * @param {number[]} classDays - Días de clase (0=Dom, 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb)
 * @returns {Date} - Próximo día de clase (puede ser el mismo día si coincide)
 */
export const getNextClassDay = (fromDate, classDays) => {
  if (!classDays || classDays.length === 0) {
    return fromDate // Si no hay días específicos, usar la misma fecha
  }

  const date = typeof fromDate === 'string' ? parseISO(fromDate) : new Date(fromDate)
  const currentDayOfWeek = getDay(date) // 0-6

  // Si hoy es día de clase, retornar hoy
  if (classDays?.includes(currentDayOfWeek)) {
    return date
  }

  // Buscar el próximo día de clase
  for (let i = 1; i <= 7; i++) {
    const nextDay = addDays(date, i)
    const dayOfWeek = getDay(nextDay)
    if (classDays?.includes(dayOfWeek)) {
      return nextDay
    }
  }

  return date // Fallback (no debería llegar aquí)
}

/**
 * Calcular próxima fecha de pago basado en ciclo de clases
 * Para cursos con classDays y classesPerCycle: cuenta N días de clase desde el inicio
 * y el pago vence en el siguiente día de clase después del último del ciclo.
 * Ejemplo MTJ (8 clases, Mar/Jue): primera clase Mar 13/01 → 8va clase Jue 05/02 → vence Mar 10/02
 * @param {Date} startDate - Fecha de inicio del ciclo (primer día de clase)
 * @param {number[]} classDays - Días de clase (opcional)
 * @param {number} classesPerCycle - Número de clases por ciclo (ej: 8 para MTJ, 4 para Sábados)
 * @returns {Date} - Fecha del próximo pago
 */
export const calculateNextPaymentDate = (startDate, classDays = null, classesPerCycle = null) => {
  const date = typeof startDate === 'string' ? parseISO(startDate) : new Date(startDate)

  // Si no hay días específicos, simplemente agregar 1 mes
  if (!classDays || classDays.length === 0) {
    return addMonths(date, 1)
  }

  // Si tiene classesPerCycle, contar N días de clase
  if (classesPerCycle) {
    // Calcular la fecha del último día de clase del ciclo
    const cycleEndDate = calculatePackageEndDate(date, classDays, classesPerCycle)
    // El próximo pago es el siguiente día de clase después de completar el ciclo
    return calculateNextPackagePaymentDate(cycleEndDate, classDays)
  }

  // Fallback: agregar 1 mes y buscar el próximo día de clase
  const oneMonthLater = addMonths(date, 1)
  return getNextClassDay(oneMonthLater, classDays)
}

/**
 * Calcular la fecha de vencimiento de un paquete de clases
 * Ejemplo: paquete de 4 sábados → fecha del 4to sábado desde la fecha de inicio
 * @param {Date} startDate - Fecha de inicio (primer día de clase)
 * @param {number[]} classDays - Días de clase (ej: [6] para sábados)
 * @param {number} classesPerPackage - Número de clases en el paquete (ej: 4)
 * @returns {Date} - Fecha en que se completa el paquete (último día de clase del paquete)
 */
export const calculatePackageEndDate = (startDate, classDays, classesPerPackage = 4) => {
  const date = typeof startDate === 'string' ? parseISO(startDate) : new Date(startDate)

  // Guard: si no hay días de clase, estimar por semanas
  if (!classDays || classDays.length === 0) {
    return addDays(date, (classesPerPackage - 1) * 7)
  }

  // El primer día de clase cuenta como clase 1
  let classCount = 1
  let current = date

  // Avanzar hasta completar las clases del paquete (máx 365 días para evitar loop infinito)
  let safety = 0
  while (classCount < classesPerPackage && safety < 365) {
    current = addDays(current, 1)
    if (classDays?.includes(getDay(current))) {
      classCount++
    }
    safety++
  }

  return current
}

/**
 * Calcular la fecha del próximo pago para paquete
 * Es el día después de completar el paquete actual (el siguiente día de clase)
 * @param {Date} packageEndDate - Fecha en que termina el paquete actual
 * @param {number[]} classDays - Días de clase
 * @returns {Date} - Fecha del próximo pago (siguiente día de clase después del fin del paquete)
 */
export const calculateNextPackagePaymentDate = (packageEndDate, classDays) => {
  const date = typeof packageEndDate === 'string' ? parseISO(packageEndDate) : new Date(packageEndDate)
  // Guard: si no hay días de clase, agregar 1 día
  if (!classDays || classDays.length === 0) {
    return addDays(date, 1)
  }
  // El siguiente día de clase después de completar el paquete
  return getNextClassDay(addDays(date, 1), classDays)
}

// Calcular fecha de vencimiento (1 día antes del próximo pago)
export const calculateDueDate = (nextPaymentDate) => {
  const date = typeof nextPaymentDate === 'string' ? parseISO(nextPaymentDate) : nextPaymentDate
  return subDays(date, 1)
}

// Obtener días hasta el vencimiento
export const getDaysUntilDue = (nextPaymentDate) => {
  if (!nextPaymentDate) return 999
  const date = typeof nextPaymentDate === 'string' ? parseISO(nextPaymentDate) : nextPaymentDate
  const dueDate = subDays(date, 1)
  return differenceInDays(dueDate, new Date())
}

/**
 * Obtener información visual del ciclo actual de un alumno
 * @param {string} lastPaymentDate - Fecha del último pago
 * @param {string} nextPaymentDate - Fecha del próximo pago
 * @param {number[]} classDays - Días de clase
 * @param {number} classesPerCycle - Clases por ciclo (8 para MTJ, 4 para Sábados)
 * @returns {{ cycleStart: string, cycleEnd: string, totalClasses: number, label: string } | null}
 */
export const getCycleInfo = (lastPaymentDate, nextPaymentDate, classDays, classesPerCycle) => {
  if (!lastPaymentDate || !nextPaymentDate) return null

  const lastPay = typeof lastPaymentDate === 'string' ? parseISO(lastPaymentDate) : lastPaymentDate
  const nextPay = typeof nextPaymentDate === 'string' ? parseISO(nextPaymentDate) : nextPaymentDate

  let cycleStart, cycleEnd, totalClasses

  if (classDays && classDays.length > 0 && classesPerCycle) {
    // Cálculo preciso con días de clase
    cycleStart = getNextClassDay(lastPay, classDays)
    cycleEnd = calculatePackageEndDate(cycleStart, classDays, classesPerCycle)
    totalClasses = classesPerCycle
  } else {
    // Fallback: usar las fechas directamente
    // Ciclo va desde la fecha de pago/inicio hasta un día antes del próximo cobro
    cycleStart = lastPay
    cycleEnd = subDays(nextPay, 1)
    // Estimar clases si tenemos classDays
    if (classDays && classDays.length > 0) {
      let count = 0
      let d = new Date(cycleStart)
      while (d <= cycleEnd) {
        if (classDays.includes(getDay(d))) count++
        d = addDays(d, 1)
      }
      totalClasses = count
    } else {
      totalClasses = classesPerCycle || null
    }
  }

  // Calcular cuántas clases han pasado desde el inicio del ciclo
  const today = new Date()
  today.setHours(12, 0, 0, 0)
  let classesPassed = 0
  if (classDays && classDays.length > 0) {
    let checkDate = new Date(cycleStart)
    while (checkDate <= today && checkDate <= cycleEnd) {
      if (classDays.includes(getDay(checkDate))) {
        classesPassed++
      }
      checkDate = addDays(checkDate, 1)
    }
  } else if (totalClasses) {
    // Fallback: estimar proporcionalmente por tiempo transcurrido
    const totalDays = differenceInDays(cycleEnd, cycleStart) + 1
    const elapsedDays = differenceInDays(today, cycleStart) + 1
    if (totalDays > 0) {
      classesPassed = Math.max(0, Math.min(
        Math.round((elapsedDays / totalDays) * totalClasses),
        totalClasses
      ))
    }
  }

  const dayNames = { 0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb' }
  const daysLabel = classDays?.map(d => dayNames[d]).join('/') || ''

  return {
    cycleStart: format(cycleStart, 'dd/MM', { locale: es }),
    cycleEnd: format(cycleEnd, 'dd/MM', { locale: es }),
    totalClasses: totalClasses,
    classesPassed: totalClasses ? Math.min(classesPassed, totalClasses) : classesPassed,
    daysLabel
  }
}

// Formatear fecha para mostrar
export const formatDate = (date, formatStr = 'dd/MM/yyyy') => {
  if (!date) return ''
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, formatStr, { locale: es })
}

// Formatear fecha para input
export const formatDateForInput = (date) => {
  if (!date) return ''
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'yyyy-MM-dd')
}

// Alias: fecha de hoy para inputs (zona horaria Ecuador)
export const todayForInput = () => getTodayEC()

// Obtener nombre del mes
export const getMonthName = (date) => {
  if (!date) return ''
  const dateObj = typeof date === 'string' ? parseISO(date) : date
  return format(dateObj, 'MMMM yyyy', { locale: es })
}

// Estado del pago basado en fecha de vencimiento
// autoInactiveDays: días de gracia antes de marcar como inactiva (default 10)
export const getPaymentStatus = (student, course, autoInactiveDays = 10) => {
  // Si es pago por clase
  if (course?.priceType === 'clase' || course?.price_type === 'clase') {
    return {
      status: 'single',
      label: 'Por clase',
      color: 'bg-blue-100 text-blue-800',
      colorCode: 'blue',
      priority: 5
    }
  }

  // Si es programa (pago único o con abonos)
  if (course?.priceType === 'programa' || course?.price_type === 'programa') {
    // Usar total_program_price del alumno (puede incluir descuento) o precio del curso
    const totalPrice = student?.total_program_price || course?.price || student?.monthly_fee || 0
    const amountPaid = student?.amount_paid || 0
    const balance = student?.balance ?? (totalPrice - amountPaid)

    if (balance <= 0 || amountPaid >= totalPrice) {
      return {
        status: 'paid',
        label: 'Pagado',
        color: 'bg-green-100 text-green-800',
        colorCode: 'green',
        priority: 5
      }
    }

    if (amountPaid > 0) {
      return {
        status: 'partial',
        label: `Abono: $${amountPaid} / Debe: $${balance.toFixed(2)}`,
        color: 'bg-orange-100 text-orange-800',
        colorCode: 'orange',
        priority: 2
      }
    }

    return {
      status: 'pending',
      label: 'Pendiente',
      color: 'bg-gray-100 text-gray-800',
      colorCode: 'gray',
      priority: 4
    }
  }

  // Para paquetes de clases (ej: Sábados Intensivos)
  if (course?.priceType === 'paquete' || course?.price_type === 'paquete') {
    if (!student.next_payment_date) {
      return {
        status: 'pending',
        label: 'Sin pago',
        color: 'bg-gray-100 text-gray-800',
        colorCode: 'gray',
        priority: 4
      }
    }

    const classesTotal = course?.classesPerPackage || course?.classesPerCycle || course?.classes_per_package || 4
    // Calcular clases tomadas automáticamente por fechas (más preciso que classes_used manual)
    const baseDate = student.last_payment_date || student.enrollment_date
    let classesTaken = student.classes_used || 0
    if (baseDate && student.next_payment_date && course?.classDays) {
      const cycleInfo = getCycleInfo(baseDate, student.next_payment_date, course.classDays, classesTotal)
      if (cycleInfo && cycleInfo.classesPassed > 0) {
        classesTaken = cycleInfo.classesPassed
      }
    }
    const remaining = classesTotal - classesTaken

    const days = getDaysUntilDue(student.next_payment_date)

    if (days < 0 && Math.abs(days) > autoInactiveDays) {
      return {
        status: 'inactive',
        label: 'Inactiva',
        color: 'bg-gray-400 text-white',
        colorCode: 'gray',
        priority: 6
      }
    }

    if (days < 0) {
      return {
        status: 'overdue',
        label: `Renovar paquete`,
        color: 'bg-red-600 text-white',
        colorCode: 'red',
        priority: 1
      }
    }

    return {
      status: 'active_package',
      label: `${remaining} clase${remaining !== 1 ? 's' : ''} restante${remaining !== 1 ? 's' : ''}`,
      color: remaining <= 1 ? 'bg-orange-500 text-white' : 'bg-blue-100 text-blue-800',
      colorCode: remaining <= 1 ? 'orange' : 'blue',
      priority: remaining <= 1 ? 2 : 4
    }
  }

  // Para pagos mensuales - verificar abono parcial
  if (student.payment_status === 'partial') {
    const paid = parseFloat(student.amount_paid || 0)
    const bal = parseFloat(student.balance || 0)
    return {
      status: 'partial',
      label: `Abono: $${paid.toFixed(0)} / Debe: $${bal.toFixed(2)}`,
      color: 'bg-orange-100 text-orange-800',
      colorCode: 'orange',
      priority: 2
    }
  }

  if (!student.next_payment_date) {
    return {
      status: 'pending',
      label: 'Sin cobro',
      color: 'bg-gray-200 text-gray-600',
      colorCode: 'gray',
      priority: 4
    }
  }

  const days = getDaysUntilDue(student.next_payment_date)

  // Inactiva: vencida más allá del periodo de gracia
  if (days < 0 && Math.abs(days) > autoInactiveDays) {
    return {
      status: 'inactive',
      label: 'Inactiva',
      color: 'bg-gray-400 text-white',
      colorCode: 'gray',
      priority: 6
    }
  }

  if (days < 0) {
    const absDays = Math.abs(days)
    return {
      status: 'overdue',
      label: absDays === 1 ? 'Renovar (1 día atrás)' : `Renovar (${absDays} días atrás)`,
      color: 'bg-red-600 text-white',
      colorCode: 'red',
      priority: 1
    }
  }
  if (days === 0) {
    return {
      status: 'due_today',
      label: 'Renovar hoy',
      color: 'bg-red-500 text-white',
      colorCode: 'red',
      priority: 1
    }
  }
  if (days <= 3) {
    return {
      status: 'urgent',
      label: days === 1 ? 'Renovar mañana' : `Renovar en ${days} días`,
      color: 'bg-orange-500 text-white',
      colorCode: 'orange',
      priority: 2
    }
  }
  if (days <= 7) {
    return {
      status: 'upcoming',
      label: `Renovar en ${days} días`,
      color: 'bg-yellow-500 text-white',
      colorCode: 'yellow',
      priority: 3
    }
  }
  return {
    status: 'ok',
    label: `Renovación en ${days} días`,
    color: 'bg-green-100 text-green-800',
    colorCode: 'green',
    priority: 5
  }
}

// Obtener color CSS basado en estado
export const getStatusColorClass = (colorCode) => {
  const colors = {
    red: 'bg-red-600 text-white border-red-700',
    orange: 'bg-orange-500 text-white border-orange-600',
    yellow: 'bg-yellow-500 text-white border-yellow-600',
    green: 'bg-green-100 text-green-800 border-green-200',
    blue: 'bg-blue-100 text-blue-800 border-blue-200',
    gray: 'bg-gray-100 text-gray-800 border-gray-200',
    purple: 'bg-purple-100 text-purple-800 border-purple-200'
  }
  return colors[colorCode] || colors.gray
}

// Obtener color de indicador (punto/círculo)
export const getStatusDotColor = (colorCode) => {
  const colors = {
    red: 'bg-red-500',
    orange: 'bg-orange-500',
    yellow: 'bg-yellow-500',
    green: 'bg-green-500',
    blue: 'bg-blue-500',
    gray: 'bg-gray-400',
    purple: 'bg-purple-500'
  }
  return colors[colorCode] || colors.gray
}
