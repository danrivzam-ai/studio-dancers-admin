import { formatDate, getCycleInfo, getTodayEC } from './dateUtils'

/**
 * Limpia y formatea un número de teléfono para WhatsApp (Ecuador).
 * Quita caracteres no numéricos, convierte 0X→593X.
 */
export const formatPhoneForWhatsApp = (phone) => {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  return cleaned.startsWith('0') ? `593${cleaned.slice(1)}` : cleaned
}

/**
 * Abre WhatsApp con un mensaje pre-escrito.
 * @param {string} phone - Número de teléfono (se formatea automáticamente)
 * @param {string} message - Mensaje a enviar
 * @returns {boolean} true si se abrió, false si no hay teléfono
 */
export const openWhatsApp = (phone, message) => {
  const formatted = formatPhoneForWhatsApp(phone)
  if (!formatted) return false
  const url = `https://wa.me/${formatted}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank')
  return true
}

/**
 * Abre WhatsApp sin destinatario (el usuario elige).
 */
export const openWhatsAppNoRecipient = (message) => {
  const url = `https://wa.me/?text=${encodeURIComponent(message)}`
  window.open(url, '_blank')
}

/**
 * Resuelve los datos de contacto correctos para cobro.
 * Regla: menores → SIEMPRE el representante. Adultos → pagador o la misma alumna.
 *
 * @returns {{ contactName, contactPhone, contactRelation }}
 */
export const getContactInfo = (student) => {
  const isMinor = student.is_minor !== false
  if (isMinor) {
    return {
      contactName:     student.parent_name  || student.name,
      contactPhone:    student.parent_phone || student.payer_phone || student.phone || '',
      contactRelation: 'Representante'
    }
  }
  // Adulta con pagador diferente explícito
  if (student.payer_name && (student.payer_phone || student.phone)) {
    return {
      contactName:     student.payer_name,
      contactPhone:    student.payer_phone || student.phone || '',
      contactRelation: 'Pagador'
    }
  }
  return {
    contactName:     student.name,
    contactPhone:    student.payer_phone || student.phone || '',
    contactRelation: 'Alumna'
  }
}

// Alias interno para uso en los mensajes
const getPayerName = (student) => clean(getContactInfo(student).contactName)

/**
 * Construye línea de banco para mensajes de pago.
 */
const buildBankLine = (settings) => {
  if (!settings?.bank_name && !settings?.bank_account_number) return ''
  const parts = [settings.bank_name, settings.bank_account_number, settings.bank_account_holder].filter(Boolean)
  return parts.join(' — ')
}

/**
 * Texto limpio para usar entre *asteriscos*: WhatsApp no aplica negrita si hay
 * espacios pegados al asterisco (ej. "*Valentina López *").
 */
const clean = (text) => String(text ?? '').replace(/\s+/g, ' ').trim()

const schoolNameOf = (settings) => clean(settings?.name || (typeof settings === 'string' ? settings : '') || 'Studio Dancers')
const amountOf = (student) => parseFloat(student.monthly_fee || 0).toFixed(2)
const dateOnly = (d) => (d ? String(d).substring(0, 10) : null)
const daysLabel = (n) => (n === 1 ? '1 día' : `${n} días`)
const paymentBlock = (amount, settings, label = 'Monto') => {
  const bankLine = buildBankLine(settings)
  return `💰 ${label}: *$${amount}*${bankLine ? `\n🏦 Transferencia: ${bankLine}` : ''}`
}

/**
 * Mensaje A — Recordatorio (antes del vencimiento y durante los días de gracia).
 * Ajusta el verbo a la fecha: "vence el", "vence hoy" o "venció el".
 */
export const buildMessageA = (student, courseName, settings) => {
  const due = dateOnly(student.next_payment_date)
  const today = getTodayEC()
  const dueText = !due ? 'está por vencer'
    : due > today ? `vence el *${formatDate(due)}*`
    : due === today ? 'vence *hoy*'
    : `venció el *${formatDate(due)}*`

  return `Hola ${getPayerName(student)} 👋
Te recordamos que la mensualidad de *${clean(student.name)}* en *${clean(courseName)}* ${dueText}.

${paymentBlock(amountOf(student), settings)}

Envíanos tu comprobante por aquí y ¡listo! 🙌
${schoolNameOf(settings)}`
}

/**
 * Mensaje B — Pago vencido (después de la gracia y hasta mora_days — puede asistir).
 */
export const buildMessageB = (student, courseName, daysOverdue, settings) => {
  return `Hola ${getPayerName(student)},
La mensualidad de *${clean(student.name)}* en *${clean(courseName)}* está vencida hace *${daysLabel(daysOverdue)}*.

${paymentBlock(amountOf(student), settings, 'Monto pendiente')}

Por favor envíanos tu comprobante para continuar en clases.
Cualquier consulta estamos aquí 🙌
${schoolNameOf(settings)}`
}

/**
 * Mensaje C — Mora / Suspensión (mora_days+1 hasta auto_inactive_days — NO puede asistir).
 */
export const buildMessageC = (student, courseName, daysOverdue, settings) => {
  const schoolName = schoolNameOf(settings)
  return `Hola ${getPayerName(student)},
Te escribimos de *${schoolName}* porque el pago de *${clean(student.name)}* en *${clean(courseName)}* lleva *${daysLabel(daysOverdue)} de retraso* y su asistencia ha sido suspendida.

${paymentBlock(amountOf(student), settings, 'Monto pendiente')}

Por favor contáctanos para coordinar tu pago y retomar las clases.
${schoolName}`
}

/**
 * Mensaje D — Inactiva (más de auto_inactive_days sin pagar). Ya no es un cobro:
 * es una invitación a volver, sin fechas viejas ni "días de retraso".
 */
export const buildMessageInactive = (student, courseName, settings, isAdult = false) => {
  const schoolName = schoolNameOf(settings)
  if (isAdult) {
    return `Hola ${clean(student.name)} 👋
Hace un tiempo que no te vemos en *${clean(courseName)}* y queríamos saber de ti.

Si quieres retomar, tu lugar sigue aquí. La renovación es de *$${amountOf(student)}*; escríbenos y coordinamos tu regreso.
${schoolName}`
  }
  return `Hola ${getPayerName(student)} 👋
Hace un tiempo que no vemos a *${clean(student.name)}* en *${clean(courseName)}* y queríamos saber cómo están.

Si desean retomar las clases, escríbanos y coordinamos su regreso. La mensualidad es de *$${amountOf(student)}*.
${schoolName}`
}

/**
 * Calcula las fechas reales del ciclo (primera y última clase) usando getCycleInfo.
 * Si no hay datos de curso, cae a last_payment_date / next_payment_date como antes.
 */
const resolveCycleDates = (student, course) => {
  if (course && student.last_payment_date && student.next_payment_date &&
      (course.classDays || course.class_days) &&
      (course.classesPerCycle || course.classesPerPackage)) {
    // Clamp al ciclo escolar para que el mensaje muestre la fecha real de
    // inicio del ciclo (no la fecha del pago si pagó antes).
    let base = student.last_payment_date
    let end = student.next_payment_date
    const cicloIni = course.cicloInicio || course.ciclo_inicio
    const cicloFin = course.cicloFin || course.ciclo_fin
    if (cicloIni && base < cicloIni) base = cicloIni
    if (cicloFin && end > cicloFin) end = cicloFin
    const info = getCycleInfo(
      base,
      end,
      course.classDays || course.class_days,
      course.classesPerCycle || course.classesPerPackage
    )
    if (info) {
      return { start: formatDate(info.cycleStartISO), end: formatDate(info.cycleEndISO), endISO: info.cycleEndISO }
    }
  }
  // Fallback: fechas de pago (menos precisas)
  return {
    start: student.last_payment_date ? formatDate(student.last_payment_date) : null,
    end: student.next_payment_date ? formatDate(student.next_payment_date) : 'N/A',
    endISO: null,
  }
}

/**
 * Mensaje Adult-A — Recordatorio para adultas mientras el cobro no vence.
 * Usa las fechas reales del ciclo (primera y última clase) y distingue:
 * "está por finalizar", "termina hoy" o "ya finalizó" (entre la última clase
 * del ciclo y la primera del siguiente, cuando el cobro aún no vence).
 */
export const buildMessageAdultReminder = (student, courseName, settings, course = null) => {
  const { start, end, endISO } = resolveCycleDates(student, course)
  const today = getTodayEC()
  const nextStart = dateOnly(student.next_payment_date)
  const ended = !!endISO && endISO < today

  const cycleLine = start ? `del *${start}* al *${end}*` : `que ${ended ? 'terminó' : 'finaliza'} el *${end}*`
  const nextLine = ended && nextStart && nextStart >= today
    ? `\nTu próximo ciclo empieza el *${formatDate(nextStart, 'EEEE dd/MM')}*.`
    : ''
  const intro = ended
    ? `Tu ciclo de clases de *${clean(courseName)}* ${cycleLine} ya finalizó.${nextLine}`
    : `Te recordamos que tu ciclo de clases de *${clean(courseName)}* ${cycleLine} ${endISO === today ? 'termina hoy' : 'está por finalizar'}.`

  return `Hola ${clean(student.name)} 👋
${intro}

${ended ? 'Para continuar sin interrupción' : 'Para que tus clases continúen sin interrupción'}, renueva tu próximo ciclo:
${paymentBlock(amountOf(student), settings, 'Renovación')}

Envíanos tu comprobante por aquí y listo.
${schoolNameOf(settings)}`
}

/**
 * Mensaje Adult-B — Ciclo vencido para adultas (ya finalizó, debe renovar para retomar).
 * Sin "mora" ni "suspensión" — lenguaje de renovación con fechas reales del ciclo.
 */
export const buildMessageAdultExpired = (student, courseName, daysOverdue, settings, course = null) => {
  const { start, end } = resolveCycleDates(student, course)
  const cycleLine = start ? `del *${start}* al *${end}*` : `que finalizó el *${end}*`

  return `Hola ${clean(student.name)},
Tu ciclo de clases de *${clean(courseName)}* ${cycleLine} ha finalizado.

Para retomar tus clases, renueva tu inscripción al nuevo ciclo:
${paymentBlock(amountOf(student), settings, 'Renovación')}

Escríbenos cuando quieras coordinar tu regreso.
${schoolNameOf(settings)}`
}

/**
 * Construye mensaje de recordatorio de cobro para WhatsApp.
 * Selecciona automáticamente el mensaje correcto según los días de retraso.
 *
 * @param {object} student
 * @param {string} courseName
 * @param {number} daysUntilDue  - negativo = vencido, positivo = faltan días (getDaysUntilDue)
 * @param {object|string} settings - objeto de configuración o string con nombre del estudio
 * @param {number} graceDays     - días de gracia (default 5)
 * @param {number} moraDays      - días hasta suspensión (default 20)
 * @param {boolean} isAdultCourse
 * @param {object} course
 * @param {number} autoInactiveDays - días sin pagar para considerarla inactiva (default 60)
 */
export const buildReminderMessage = (student, courseName, daysUntilDue, settings, graceDays = 5, moraDays = 20, isAdultCourse = false, course = null, autoInactiveDays = 60) => {
  const absDays = Math.abs(daysUntilDue)
  // getDaysUntilDue cuenta hasta el día ANTERIOR al vencimiento (último día cubierto),
  // así que los días reales de atraso desde la fecha de vencimiento son uno menos.
  const daysLate = Math.max(1, absDays - 1)

  // Inactiva (mismo umbral que la lista "Inactivas"): invitación a volver
  if (daysUntilDue < 0 && absDays > autoInactiveDays) {
    return buildMessageInactive(student, courseName, settings, isAdultCourse)
  }

  // ── Cursos de adultas (ageMin >= 18) ──────────────────────────────────────
  // Sin "mensualidad", sin mora, sin suspensión — renovación voluntaria de ciclo.
  if (isAdultCourse) {
    if (daysUntilDue >= 0) {
      return buildMessageAdultReminder(student, courseName, settings, course)
    }
    return buildMessageAdultExpired(student, courseName, absDays, settings, course)
  }

  // ── Cursos infantiles/juveniles ───────────────────────────────────────────
  // Antes del vencimiento y durante la gracia → recordatorio (Mensaje A)
  if (daysUntilDue >= 0 || absDays <= graceDays) {
    return buildMessageA(student, courseName, settings)
  }

  // Vencida pero sin llegar a mora → aviso de cobro (Mensaje B)
  if (absDays <= moraDays) {
    return buildMessageB(student, courseName, daysLate, settings)
  }

  // Mora / suspendida → aviso de suspensión (Mensaje C)
  return buildMessageC(student, courseName, daysLate, settings)
}

/**
 * Construye mensaje de texto del reporte de cierre de caja.
 */
export const buildCloseReportMessage = (cashRegister, todayData, settings) => {
  const date = formatDate(cashRegister.register_date)
  const opening = parseFloat(cashRegister.opening_amount || 0).toFixed(2)
  const closing = parseFloat(cashRegister.closing_amount || 0).toFixed(2)
  const expected = parseFloat(cashRegister.expected_amount || 0).toFixed(2)
  const diff = parseFloat(cashRegister.difference || 0)

  let diffLine = ''
  if (diff === 0) diffLine = '✅ Cuadre perfecto'
  else if (diff > 0) diffLine = `📈 Sobrante: $${diff.toFixed(2)}`
  else diffLine = `📉 Faltante: $${Math.abs(diff).toFixed(2)}`

  const expenses = todayData.expensesTotal > 0
    ? `\n📤 *EGRESOS:* -$${todayData.expensesTotal.toFixed(2)}\n  • En efectivo: -$${todayData.expensesCash.toFixed(2)}`
    : ''

  const movements = (todayData.depositsTotal > 0 || todayData.cashInTotal > 0 || todayData.cashOutTotal > 0)
    ? `\n🔄 *MOVIMIENTOS:*${todayData.depositsTotal > 0 ? `\n  • Depósitos: -$${todayData.depositsTotal.toFixed(2)}` : ''}${todayData.cashInTotal > 0 ? `\n  • Retiros/Préstamos: +$${todayData.cashInTotal.toFixed(2)}` : ''}${todayData.cashOutTotal > 0 ? `\n  • Reembolsos: -$${todayData.cashOutTotal.toFixed(2)}` : ''}`
    : ''

  return `📊 *REPORTE DE CIERRE - ${settings?.name || 'Academia'}*
📅 Fecha: ${date}

💵 *Apertura:* $${opening}

📥 *INGRESOS:* $${todayData.totalIncome.toFixed(2)}
  • Pagos alumnos: $${todayData.studentPayments.toFixed(2)}
  • Pagos rápidos: $${todayData.quickPayments.toFixed(2)}
  • Ventas: $${todayData.sales.toFixed(2)}
  • En efectivo: $${todayData.incomeCash.toFixed(2)}
${expenses}
${movements}

💰 *Esperado:* $${expected}
💰 *Cierre real:* $${closing}
${diffLine}

${settings?.name || 'Academia'}`
}
