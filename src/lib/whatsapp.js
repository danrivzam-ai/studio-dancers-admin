import { formatDate } from './dateUtils'

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
const getPayerName = (student) => getContactInfo(student).contactName

/**
 * Construye línea de banco para mensajes de pago.
 */
const buildBankLine = (settings) => {
  if (!settings?.bank_name && !settings?.bank_account_number) return ''
  const parts = [settings.bank_name, settings.bank_account_number, settings.bank_account_holder].filter(Boolean)
  return parts.join(' — ')
}

/**
 * Mensaje A — Recordatorio previo (3 días antes del vencimiento).
 */
export const buildMessageA = (student, courseName, settings) => {
  const amount = parseFloat(student.monthly_fee || 0).toFixed(2)
  const dueDate = student.next_payment_date ? formatDate(student.next_payment_date) : 'N/A'
  const payerName = getPayerName(student)
  const schoolName = settings?.name || settings || 'Studio Dancers'
  const bankLine = buildBankLine(settings)

  return `Hola ${payerName} 👋
Te recordamos que la mensualidad de *${student.name}* en *${courseName}* vence el *${dueDate}*.

💰 Monto: *$${amount}*${bankLine ? `\n🏦 Transferencia: ${bankLine}` : ''}

Envíanos tu comprobante por aquí y ¡listo! 🙌
🩰 ${schoolName}`
}

/**
 * Mensaje B — Pago vencido (días 1 al mora_days — puede asistir).
 */
export const buildMessageB = (student, courseName, daysOverdue, settings) => {
  const amount = parseFloat(student.monthly_fee || 0).toFixed(2)
  const payerName = getPayerName(student)
  const schoolName = settings?.name || settings || 'Studio Dancers'
  const bankLine = buildBankLine(settings)

  const daysText = daysOverdue === 1 ? '1 día' : `${daysOverdue} días`

  return `Hola ${payerName},
La mensualidad de *${student.name}* en *${courseName}* está vencida hace *${daysText}*.

💰 Monto pendiente: *$${amount}*${bankLine ? `\n🏦 Transferencia: ${bankLine}` : ''}

Por favor envíanos tu comprobante para continuar en clases.
Cualquier consulta estamos aquí 🙌
🩰 ${schoolName}`
}

/**
 * Mensaje C — Mora / Suspensión (días mora_days+1 en adelante — NO puede asistir).
 */
export const buildMessageC = (student, courseName, daysOverdue, settings) => {
  const amount = parseFloat(student.monthly_fee || 0).toFixed(2)
  const payerName = getPayerName(student)
  const schoolName = settings?.name || settings || 'Studio Dancers'

  const daysText = daysOverdue === 1 ? '1 día' : `${daysOverdue} días`

  return `Hola ${payerName},
Te escribimos de *${schoolName}* porque el pago de *${student.name}* en *${courseName}* lleva *${daysText} de retraso* y su asistencia ha sido suspendida.

💰 Monto pendiente: *$${amount}*

Por favor contáctanos para coordinar tu pago y retomar las clases.
🩰 ${schoolName}`
}

/**
 * Construye mensaje de recordatorio de cobro para WhatsApp.
 * Selecciona automáticamente el mensaje correcto según los días de retraso.
 *
 * @param {object} student
 * @param {string} courseName
 * @param {number} daysUntilDue  - negativo = vencido, positivo = faltan días
 * @param {object|string} settings - objeto de configuración o string con nombre del estudio
 * @param {number} graceDays     - días de gracia (default 5)
 * @param {number} moraDays      - días hasta suspensión (default 20)
 */
export const buildReminderMessage = (student, courseName, daysUntilDue, settings, graceDays = 5, moraDays = 20, isAdultCourse = false) => {
  const absDays = Math.abs(daysUntilDue)

  // Días anteriores al vencimiento (recordatorio) o día exacto
  if (daysUntilDue >= 0) {
    return buildMessageA(student, courseName, settings)
  }

  // Adultas: nunca mensaje de suspensión — siempre Mensaje B (ciclo vencido, debe renovar)
  if (isAdultCourse) {
    return buildMessageB(student, courseName, absDays, settings)
  }

  // Dentro del período de gracia → recordatorio amable (Mensaje A)
  if (absDays <= graceDays) {
    return buildMessageA(student, courseName, settings)
  }

  // Vencido pero sin llegar a mora → Mensaje B
  if (absDays <= moraDays) {
    return buildMessageB(student, courseName, absDays, settings)
  }

  // Mora (suspendida) — solo cursos infantiles/juveniles → Mensaje C
  return buildMessageC(student, courseName, absDays, settings)
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

🩰 ${settings?.name || 'Academia'}`
}
