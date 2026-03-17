/**
 * metaConversionsApi.js
 * Envía eventos de conversión a Meta via Edge Function (server-side).
 * El access token NUNCA se expone al frontend.
 * Patrón fire-and-forget: nunca lanza excepciones, no bloquea el flujo principal.
 */

import { supabase } from './supabase'

/**
 * Hashea un valor con SHA-256 (requerido por Meta CAPI).
 */
async function sha256(value) {
  if (!value) return null
  const normalized = value.trim().toLowerCase()
  const encoded = new TextEncoder().encode(normalized)
  const buffer = await crypto.subtle.digest('SHA-256', encoded)
  return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/**
 * Formatea teléfono ecuatoriano a formato E.164 sin el +
 */
function normalizePhone(phone) {
  if (!phone) return null
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('593')) return cleaned
  if (cleaned.startsWith('0')) return `593${cleaned.slice(1)}`
  return cleaned
}

/**
 * Separa un nombre completo en nombre y apellido.
 */
function splitName(fullName) {
  if (!fullName) return { fn: null, ln: null }
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return { fn: parts[0], ln: null }
  return { fn: parts[0], ln: parts.slice(1).join(' ') }
}

/**
 * Construye los user_data hasheados para Meta CAPI.
 */
async function buildUserData(studentData) {
  const isMinor = studentData.is_minor || studentData.isMinor

  const phone = isMinor
    ? (studentData.parent_phone || studentData.parentPhone)
    : studentData.phone
  const email = isMinor
    ? (studentData.parent_email || studentData.parentEmail)
    : studentData.email
  const name = isMinor
    ? (studentData.parent_name || studentData.parentName)
    : studentData.name
  const cedula = isMinor
    ? (studentData.parent_cedula || studentData.parentCedula)
    : studentData.cedula

  const { fn, ln } = splitName(name)
  const normalizedPhone = normalizePhone(phone)

  const [hashedPhone, hashedEmail, hashedFn, hashedLn, hashedExternalId] = await Promise.all([
    sha256(normalizedPhone),
    sha256(email),
    sha256(fn),
    sha256(ln),
    sha256(cedula),
  ])

  const userData = {
    country: [await sha256('ec')],
  }

  if (hashedPhone) userData.ph = [hashedPhone]
  if (hashedEmail) userData.em = [hashedEmail]
  if (hashedFn) userData.fn = [hashedFn]
  if (hashedLn) userData.ln = [hashedLn]
  if (hashedExternalId) userData.external_id = [hashedExternalId]

  return userData
}

/**
 * Envía un evento a Meta via la Edge Function meta-capi.
 */
async function sendEvent(eventName, userData, customData, eventId) {
  try {
    const { data, error } = await supabase.functions.invoke('meta-capi', {
      body: {
        event_name: eventName,
        event_id: eventId,
        user_data: userData,
        custom_data: customData,
      },
    })

    if (error) {
      console.error(`[Meta CAPI] Edge function error:`, error)
      return { success: false, error: 'Edge function error' }
    }

    console.log(`[Meta CAPI] ${eventName} event sent:`, data)
    return { success: data?.success || false }
  } catch (err) {
    console.error(`[Meta CAPI] Failed to send ${eventName} event:`, err)
    return { success: false, error: err.message }
  }
}

/**
 * Envía un evento Lead a Meta Conversions API.
 * Se llama al registrar una alumna nueva.
 */
export async function sendLeadEvent(studentData, eventId) {
  const userData = await buildUserData(studentData)

  if (!userData.ph && !userData.em) {
    console.warn('[Meta CAPI] No phone or email available — skipping event')
    return { success: false, error: 'No contact data for matching' }
  }

  return sendEvent('Lead', userData, {
    content_name: 'Registro de alumna',
    content_category: studentData.is_minor || studentData.isMinor
      ? 'menor_con_representante'
      : 'adulta',
  }, eventId || `lead_${Date.now()}`)
}

/**
 * Envía un evento Purchase a Meta Conversions API.
 * Se llama al registrar un pago de alumna.
 */
export async function sendPurchaseEvent(studentData, paymentData) {
  const userData = await buildUserData(studentData)

  if (!userData.ph && !userData.em) {
    console.warn('[Meta CAPI] No phone or email available — skipping event')
    return { success: false, error: 'No contact data for matching' }
  }

  return sendEvent('Purchase', userData, {
    currency: 'USD',
    value: parseFloat(paymentData.amount) || 0,
    content_name: paymentData.courseName || 'Pago de mensualidad',
    content_category: studentData.is_minor || studentData.isMinor
      ? 'menor_con_representante'
      : 'adulta',
  }, `purchase_${paymentData.paymentId || Date.now()}`)
}
