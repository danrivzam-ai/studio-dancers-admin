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
 * Construye mensaje de recordatorio de cobro para WhatsApp.
 */
export const buildReminderMessage = (student, courseName, daysUntilDue, schoolName) => {
  const amount = parseFloat(student.monthly_fee || 0).toFixed(2)
  const dueDate = student.next_payment_date ? formatDate(student.next_payment_date) : 'N/A'
  const isRepresentante = student.is_minor !== false  // true para menores (o si no hay dato)

  let intro = ''
  let dateLabel = ''
  let closing = ''

  if (daysUntilDue < 0) {
    dateLabel = 'Venci\u00f3'
    closing = 'Si ya realiz\u00f3 el pago, puede ignorar este mensaje.\nSi necesita coordinar el pago, con gusto le ayudamos \uD83E\uDE70'
    intro = isRepresentante
      ? `El pago de *${student.name}* se encuentra vencido:`
      : 'Su pago se encuentra vencido:'
  } else if (daysUntilDue === 0) {
    dateLabel = 'Vence hoy'
    closing = 'Si ya realiz\u00f3 el pago, puede ignorar este mensaje.\nSi tiene alguna duda, aqu\u00ed estamos para ayudarle \uD83E\uDE70'
    intro = isRepresentante
      ? `El pago de *${student.name}* vence hoy:`
      : 'Su pago vence hoy:'
  } else {
    dateLabel = 'Vencimiento'
    closing = 'Si ya realiz\u00f3 el pago, puede ignorar este mensaje.\nSi tiene alguna duda, aqu\u00ed estamos para ayudarle \uD83E\uDE70'
    intro = isRepresentante
      ? `El pago de *${student.name}* est\u00e1 pr\u00f3ximo a vencer:`
      : 'Su pago est\u00e1 pr\u00f3ximo a vencer:'
  }

  return `Hola \uD83D\uDE0A
Le escribimos de ${schoolName}.

${intro}

\uD83D\uDCDA Curso: ${courseName}
\uD83D\uDCB0 Monto: $${amount}
\uD83D\uDCC5 ${dateLabel}: ${dueDate}

${closing}

${schoolName}`
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
