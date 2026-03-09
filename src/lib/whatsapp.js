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
 * - Menores (is_minor !== false): lenguaje dirigido al representante.
 * - Adultas (is_minor === false): lenguaje de ciclo, sin usar "vencido".
 */
export const buildReminderMessage = (student, courseName, daysUntilDue, schoolName) => {
  const amount = parseFloat(student.monthly_fee || 0).toFixed(2)
  const dueDate = student.next_payment_date ? formatDate(student.next_payment_date) : 'N/A'
  const isRepresentante = student.is_minor !== false  // true para menores (o si no hay dato)
  const isAdulta = student.is_minor === false

  let intro = ''
  let dateLabel = ''  // string = mostrar l\u00ednea de fecha; '' = omitir
  let closing = ''

  if (isAdulta) {
    // ── Adultas: l\u00f3gica de ciclos ────────────────────────────────────────
    // IMPORTANTE: next_payment_date es la fecha de COBRO del pr\u00f3ximo ciclo,
    // no la \u00faltima clase. La \u00faltima clase ocurre t\u00edpicamente 5-7 d\u00edas ANTES.
    // Por eso, cuando daysUntilDue <= 0, el ciclo ya termin\u00f3 hace varios d\u00edas
    // y mostrar next_payment_date como "fin de ciclo" es incorrecto y confuso.
    if (daysUntilDue <= 0) {
      // Ciclo ya finaliz\u00f3 — no mostramos fecha espec\u00edfica para evitar confusi\u00f3n
      intro   = 'Su ciclo de clases ha finalizado y est\u00e1 lista para renovar.'
      closing = 'Para seguir asistiendo a sus clases, puede realizar la renovaci\u00f3n cuando guste.\n\nSi ya realiz\u00f3 el pago, puede ignorar este mensaje.'
    } else {
      // Ciclo pr\u00f3ximo a finalizar — la fecha de cobro s\u00ed es relevante aqu\u00ed
      dateLabel = 'Pr\u00f3xima renovaci\u00f3n'
      intro     = 'Su ciclo de clases est\u00e1 pr\u00f3ximo a finalizar.'
      closing   = 'Puede renovar cuando guste para continuar con sus clases.\n\nSi ya realiz\u00f3 el pago, puede ignorar este mensaje.'
    }
  } else {
    // ── Menores / representante: l\u00f3gica de mensualidades ──────────────────
    if (daysUntilDue < 0) {
      dateLabel = 'Venci\u00f3'
      closing   = 'Si ya realiz\u00f3 el pago, puede ignorar este mensaje.\nSi necesita coordinar el pago, con gusto le ayudamos \uD83E\uDE70'
      intro     = isRepresentante
        ? `El pago de *${student.name}* se encuentra vencido:`
        : 'Su pago se encuentra vencido:'
    } else if (daysUntilDue === 0) {
      dateLabel = 'Vence hoy'
      closing   = 'Si ya realiz\u00f3 el pago, puede ignorar este mensaje.\nSi tiene alguna duda, aqu\u00ed estamos para ayudarle \uD83E\uDE70'
      intro     = isRepresentante
        ? `El pago de *${student.name}* vence hoy:`
        : 'Su pago vence hoy:'
    } else {
      dateLabel = 'Vencimiento'
      closing   = 'Si ya realiz\u00f3 el pago, puede ignorar este mensaje.\nSi tiene alguna duda, aqu\u00ed estamos para ayudarle \uD83E\uDE70'
      intro     = isRepresentante
        ? `El pago de *${student.name}* est\u00e1 pr\u00f3ximo a vencer:`
        : 'Su pago est\u00e1 pr\u00f3ximo a vencer:'
    }
  }

  // Bloque de datos del curso (con fecha solo si aplica)
  const courseLines = [
    `\uD83D\uDCDA Curso: ${courseName}`,
    `\uD83D\uDCB0 Monto: $${amount}`,
    ...(dateLabel ? [`\uD83D\uDCC5 ${dateLabel}: ${dueDate}`] : []),
  ].join('\n')

  return `Hola \uD83D\uDE0A
Le escribimos de ${schoolName}.

${intro}

${courseLines}

${closing}

${schoolName}`
}

/**
 * Construye mensaje de recordatorio para saldo pendiente (abono parcial).
 * Aplica a cualquier tipo de curso — no depende de priceType ni ciclos.
 */
export const buildBalanceReminderMessage = (student, courseName, balance, schoolName) => {
  const isRepresentante = student.is_minor !== false
  const intro = isRepresentante
    ? `*${student.name}* tiene un saldo pendiente con nosotros:`
    : 'Tiene un saldo pendiente con nosotros:'
  const balanceFmt = parseFloat(balance || 0).toFixed(2)

  return `Hola 😊
Le escribimos de ${schoolName}.

${intro}

📚 Curso: ${courseName}
💳 Saldo pendiente: $${balanceFmt}

Si ya realizó el pago completo, puede ignorar este mensaje.
Si necesita coordinar el pago, con gusto le ayudamos 🪷

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
