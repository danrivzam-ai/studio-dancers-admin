/**
 * useWhatsappApi.js
 * Hook principal para envío automatizado de mensajes WhatsApp via Meta API.
 *
 * Responsabilidades:
 * - sendComprobante(): envía template de comprobante al registrar un pago
 * - sendDailyReminders(): envía recordatorios del día (ejecutar una vez por día al abrir el portal)
 * - getTodayLog(): lista mensajes enviados hoy (para el dashboard)
 *
 * Patrón: fire-and-forget — nunca bloquea el flujo principal, errores van al log.
 */

import { useCallback } from 'react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { supabase } from '../lib/supabase'
import { getTodayEC } from '../lib/dateUtils'
import { getCourseById } from '../lib/courses'
import { sendTemplate, notifyTelegram } from '../lib/whatsappMetaApi'

// ── Helpers ────────────────────────────────────────────────────────────────

/** Formatea número de comprobante con ceros a la izquierda (ej: 452 → "00452"). */
function padReceipt(num) {
  return String(num || 0).padStart(5, '0')
}

/** Nombre del mes en español con primera letra en mayúscula (ej: "Marzo"). */
function monthName() {
  const m = format(new Date(), 'MMMM', { locale: es })
  return m.charAt(0).toUpperCase() + m.slice(1)
}

/** Formatea fecha en formato largo (ej: "3 de marzo de 2026"). */
function formatDateLong(dateStr) {
  if (!dateStr) return ''
  try {
    // Parsear como mediod\u00eda local para evitar desfase de zona horaria
    const d = new Date(dateStr.substring(0, 10) + 'T12:00:00')
    return format(d, "d 'de' MMMM 'de' yyyy", { locale: es })
  } catch {
    return dateStr
  }
}

/** Guarda un registro en whatsapp_messages_log. Fire-and-forget. */
async function logMessage({ studentId, phone, templateName, variables, status, messageId, errorMessage }) {
  try {
    await supabase.from('whatsapp_messages_log').insert({
      student_id:    studentId || null,
      phone,
      template_name: templateName,
      variables:     variables || null,
      status,
      wa_message_id: messageId || null,
      error_message: errorMessage || null,
      sent_date:     getTodayEC(),
    })
  } catch (err) {
    console.warn('[WA Log] Error al guardar log:', err.message)
  }
}

/** Verifica si ya se envió un template a este alumno hoy. */
async function alreadySentToday(studentId, templateName) {
  if (!studentId) return false
  try {
    const { data } = await supabase
      .from('whatsapp_messages_log')
      .select('id')
      .eq('student_id', studentId)
      .eq('template_name', templateName)
      .eq('sent_date', getTodayEC())
      .maybeSingle()
    return !!data
  } catch {
    return false
  }
}

/** Verifica si ya se envió el template en los últimos N días (para recordatorios que no deben ser diarios). */
async function alreadySentWithinDays(studentId, templateName, days = 7) {
  if (!studentId) return false
  try {
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() - days)
    const cutoffStr = cutoff.toISOString().substring(0, 10)
    const { data } = await supabase
      .from('whatsapp_messages_log')
      .select('id')
      .eq('student_id', studentId)
      .eq('template_name', templateName)
      .eq('status', 'sent')
      .gte('sent_date', cutoffStr)
      .maybeSingle()
    return !!data
  } catch {
    return false
  }
}

// ── Hook ──────────────────────────────────────────────────────────────────

export function useWhatsappApi(settings) {
  const creds = {
    phoneId: settings?.whatsapp_phone_id,
    token:   settings?.whatsapp_token,
  }
  const telegram = {
    botToken: settings?.telegram_bot_token,
    chatId:   settings?.telegram_chat_id,
  }

  // hasCredentials: true solo cuando el interruptor maestro está ON y hay credenciales configuradas.
  // Con whatsapp_enabled = false (default) el sistema funciona en modo pausa — cero envíos.
  const isEnabled      = !!(settings?.whatsapp_enabled)
  const hasCredentials = isEnabled && !!(creds.phoneId && creds.token)

  // ── Comprobante de pago ──────────────────────────────────────────────────
  /**
   * Envía el template de comprobante de pago al registrar un pago.
   * @param {Object} payment    - Registro de pago (amount, payment_date, receipt_number)
   * @param {Object} student    - Alumna (name, phone, is_minor, course_id)
   * @param {Object|null} course - Curso (name) — puede ser null para pagos r\u00e1pidos
   * @param {string|number} receiptNumber - N\u00famero de comprobante
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  const sendComprobante = useCallback(async (payment, student, course, receiptNumber) => {
    if (!hasCredentials) return { success: false, error: 'Credenciales no configuradas' }
    if (!student?.phone)  return { success: false, error: 'Alumna sin tel\u00e9fono registrado' }

    const isRepresentante = student.is_minor !== false
    const templateName = isRepresentante
      ? 'comprobante_pago_representante'
      : 'comprobante_pago_adulto'

    const courseName = course?.name || student.course_name || 'N/A'
    const monto      = parseFloat(payment.amount || 0).toFixed(2)
    const fecha      = formatDateLong(payment.payment_date || payment.date)
    const nro        = padReceipt(receiptNumber || payment.receipt_number || payment.receiptNumber)

    // Variables seg\u00fan template:
    // Representante: {{1}} nombre, {{2}} N\u00b0, {{3}} monto, {{4}} fecha, {{5}} programa
    // Adulto:        {{1}} N\u00b0, {{2}} monto, {{3}} fecha, {{4}} programa
    const variables = isRepresentante
      ? [student.name, nro, monto, fecha, courseName]
      : [nro, monto, fecha, courseName]

    const result = await sendTemplate({ ...creds, to: student.phone, templateName, variables })

    await logMessage({
      studentId:    student.id,
      phone:        student.phone,
      templateName,
      variables,
      status:       result.success ? 'sent' : 'failed',
      messageId:    result.messageId,
      errorMessage: result.error,
    })

    return result
  }, [hasCredentials, creds.phoneId, creds.token]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Recordatorios diarios ────────────────────────────────────────────────
  /**
   * Envía recordatorios de cobro a todas las alumnas que corresponda seg\u00fan el d\u00eda del mes.
   * - D\u00eda 1-4: recordatorio_descuento_representante (mensualidad disponible con descuento)
   * - D\u00eda 6+:  mensualidad_pendiente_representante (pago pendiente)
   * - D\u00eda 5:   no se env\u00eda (es el d\u00eda l\u00edmite del descuento)
   *
   * Solo env\u00eda a alumnas menores (is_minor !== false) con tel\u00e9fono y next_payment_date del mes actual.
   *
   * @param {Array} students - Array completo de alumnas activas
   * @returns {Promise<{sent: number, skipped: number, failed: number}>}
   */
  const sendDailyReminders = useCallback(async (students) => {
    const result = { sent: 0, skipped: 0, failed: 0 }
    if (!hasCredentials || !students?.length) return result

    const todayEC    = getTodayEC()             // 'yyyy-MM-dd'
    const dayOfMonth = parseInt(todayEC.split('-')[2], 10)
    const currentMonth = todayEC.substring(0, 7) // 'yyyy-MM'
    const mes = monthName()

    // D\u00eda 5: no se env\u00eda ning\u00fan recordatorio
    if (dayOfMonth === 5) return result

    // Determinar qu\u00e9 template usar
    let templateName
    if (dayOfMonth >= 1 && dayOfMonth <= 4) {
      templateName = 'recordatorio_descuento_representante'
    } else {
      // d\u00eda >= 6
      templateName = 'mensualidad_pendiente_representante'
    }

    // Filtrar: solo menores con tel\u00e9fono cuyo next_payment_date est\u00e9 en el mes actual o pasado
    const targets = students.filter(s => {
      if (s.is_minor === false) return false           // adultas: siguiente fase
      if (!s.phone)             return false
      if (!s.next_payment_date) return false
      // Pago vence este mes o ya venci\u00f3
      const payMonth = s.next_payment_date.substring(0, 7)
      return payMonth <= currentMonth
    })

    for (const student of targets) {
      // Verificar deduplicaci\u00f3n
      const alreadySent = await alreadySentToday(student.id, templateName)
      if (alreadySent) { result.skipped++; continue }

      const course     = getCourseById(student.course_id)
      const courseName = course?.name || 'Ballet'
      const monto      = parseFloat(student.monthly_fee || 0).toFixed(2)

      // Variables seg\u00fan template:
      // recordatorio_descuento:  {{1}} nombre, {{2}} mes, {{3}} programa
      // mensualidad_pendiente:   {{1}} nombre, {{2}} mes, {{3}} programa, {{4}} monto
      const variables = templateName === 'recordatorio_descuento_representante'
        ? [student.name, mes, courseName]
        : [student.name, mes, courseName, monto]

      const res = await sendTemplate({ ...creds, to: student.phone, templateName, variables })

      await logMessage({
        studentId:    student.id,
        phone:        student.phone,
        templateName,
        variables,
        status:       res.success ? 'sent' : 'failed',
        messageId:    res.messageId,
        errorMessage: res.error,
      })

      if (res.success) result.sent++
      else result.failed++

      // Peque\u00f1a pausa entre mensajes para no sobrepasar rate limit de Meta API (250 msg/s)
      await new Promise(r => setTimeout(r, 100))
    }

    // Notificar a Telegram si hay credenciales
    if (telegram.botToken && telegram.chatId && (result.sent > 0 || result.failed > 0)) {
      const label = templateName === 'recordatorio_descuento_representante'
        ? 'Descuento (d\u00eda 1-4)'
        : 'Pendiente (d\u00eda 6+)'
      await notifyTelegram({
        botToken: telegram.botToken,
        chatId:   telegram.chatId,
        text: `\uD83D\uDCCB *Recordatorios WhatsApp enviados*\n` +
              `\uD83D\uDCC5 ${new Date().toLocaleDateString('es-EC')} \u2014 ${label}\n` +
              `\u2705 Enviados: ${result.sent}\n` +
              `\u23ED Omitidos (ya enviados hoy): ${result.skipped}\n` +
              (result.failed > 0 ? `\u274C Fallidos: ${result.failed}` : ''),
      })
    }

    return result
  }, [hasCredentials, creds.phoneId, creds.token, telegram.botToken, telegram.chatId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Recordatorios de saldo pendiente (abonos) ───────────────────────────
  /**
   * Envía recordatorios a alumnas con saldo pendiente (abono parcial) de +15 días.
   * Aplica a CUALQUIER tipo de curso — mensual, ciclo, programa, campamento, etc.
   * Dedup: 7 días (no enviar más de una vez por semana por alumna).
   *
   * Template Meta requerido: saldo_pendiente_representante
   *   {{1}} nombre alumna  {{2}} saldo ($X.XX)  {{3}} nombre curso
   */
  const sendBalanceReminders = useCallback(async (students) => {
    const result = { sent: 0, skipped: 0, failed: 0 }
    if (!hasCredentials || !students?.length) return result

    const templateName = 'saldo_pendiente_representante'

    // Corte: saldo con más de 15 días de antigüedad (last_payment_date o enrollment_date)
    const cutoff15 = new Date()
    cutoff15.setDate(cutoff15.getDate() - 15)
    const cutoff15Str = cutoff15.toISOString().substring(0, 10)

    const targets = students.filter(s => {
      if (s.payment_status !== 'partial') return false
      if (parseFloat(s.balance || 0) <= 0)  return false
      if (!s.phone)                          return false
      const refDate = s.last_payment_date || s.enrollment_date
      return !refDate || refDate <= cutoff15Str
    })

    for (const student of targets) {
      // Dedup 7 días: no enviar más de una vez por semana por alumna
      const alreadySent = await alreadySentWithinDays(student.id, templateName, 7)
      if (alreadySent) { result.skipped++; continue }

      const course     = getCourseById(student.course_id)
      const courseName = course?.name || 'N/A'
      const balance    = parseFloat(student.balance || 0).toFixed(2)
      const variables  = [student.name, balance, courseName]

      const res = await sendTemplate({ ...creds, to: student.phone, templateName, variables })

      await logMessage({
        studentId:    student.id,
        phone:        student.phone,
        templateName,
        variables,
        status:       res.success ? 'sent' : 'failed',
        messageId:    res.messageId,
        errorMessage: res.error,
      })

      if (res.success) result.sent++
      else result.failed++

      await new Promise(r => setTimeout(r, 100))
    }

    if (telegram.botToken && telegram.chatId && (result.sent > 0 || result.failed > 0)) {
      await notifyTelegram({
        botToken: telegram.botToken,
        chatId:   telegram.chatId,
        text: `💳 *Recordatorios saldo pendiente enviados*\n` +
              `📅 ${new Date().toLocaleDateString('es-EC')}\n` +
              `✅ Enviados: ${result.sent}\n` +
              `⏭ Omitidos (últimos 7d): ${result.skipped}\n` +
              (result.failed > 0 ? `❌ Fallidos: ${result.failed}` : ''),
      })
    }

    return result
  }, [hasCredentials, creds.phoneId, creds.token, telegram.botToken, telegram.chatId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Log del d\u00eda ──────────────────────────────────────────────────────────
  /**
   * Obtiene los mensajes enviados hoy para mostrar en el dashboard.
   * @returns {Promise<Array>}
   */
  const getTodayLog = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('whatsapp_messages_log')
        .select('*, students(name)')
        .eq('sent_date', getTodayEC())
        .order('sent_at', { ascending: false })
        .limit(100)
      if (error) throw error
      return data || []
    } catch (err) {
      console.warn('[WA Log] Error al leer log:', err.message)
      return []
    }
  }, [])

  return {
    isEnabled,
    hasCredentials,
    sendComprobante,
    sendDailyReminders,
    sendBalanceReminders,
    getTodayLog,
  }
}
