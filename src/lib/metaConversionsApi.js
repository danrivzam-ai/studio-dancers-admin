/**
 * metaConversionsApi.js
 * Envía eventos de conversión a Meta via Conversions API (server-side events).
 * Patrón fire-and-forget: nunca lanza excepciones, no bloquea el flujo principal.
 *
 * Fase 1: Evento "Lead" al registrar alumna nueva.
 *
 * Docs: https://developers.facebook.com/docs/marketing-api/conversions-api
 */

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID
const ACCESS_TOKEN = import.meta.env.VITE_META_CAPI_TOKEN
const API_VERSION = 'v21.0'
const ENDPOINT = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`

/**
 * Hashea un valor con SHA-256 (requerido por Meta CAPI).
 * @param {string} value
 * @returns {Promise<string>} hex-encoded hash
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
 * Meta requiere: código país + número, sin espacios ni símbolos
 * Ejemplo: 0991234567 → 593991234567
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
 * Meta espera fn (first name) y ln (last name) por separado.
 */
function splitName(fullName) {
  if (!fullName) return { fn: null, ln: null }
  const parts = fullName.trim().split(/\s+/)
  if (parts.length === 1) return { fn: parts[0], ln: null }
  return { fn: parts[0], ln: parts.slice(1).join(' ') }
}

/**
 * Construye los user_data hasheados para Meta CAPI.
 * Escoge datos del representante si es menor, o de la alumna si es adulta.
 */
async function buildUserData(studentData) {
  const isMinor = studentData.is_minor || studentData.isMinor

  // Si es menor → datos del representante (quien vio el anuncio)
  // Si es adulta → datos de la alumna
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
 * Envía un evento Lead a Meta Conversions API.
 * Se llama al registrar una alumna nueva.
 * Fire-and-forget: no lanza excepciones.
 *
 * @param {Object} studentData - Datos de la alumna (del formulario o de la BD)
 * @param {string} [eventId] - ID único del evento (para deduplicación). Usar el student.id
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function sendLeadEvent(studentData, eventId) {
  try {
    if (!PIXEL_ID || !ACCESS_TOKEN) {
      console.warn('[Meta CAPI] Missing PIXEL_ID or ACCESS_TOKEN — skipping event')
      return { success: false, error: 'Missing config' }
    }

    const userData = await buildUserData(studentData)

    // Verificar que hay al menos un dato de contacto para matching
    if (!userData.ph && !userData.em) {
      console.warn('[Meta CAPI] No phone or email available — skipping event')
      return { success: false, error: 'No contact data for matching' }
    }

    const payload = {
      data: [
        {
          event_name: 'Lead',
          event_time: Math.floor(Date.now() / 1000),
          action_source: 'physical_store',
          event_id: eventId || `lead_${Date.now()}`,
          user_data: userData,
          custom_data: {
            content_name: 'Registro de alumna',
            content_category: studentData.is_minor || studentData.isMinor
              ? 'menor_con_representante'
              : 'adulta',
          },
        },
      ],
    }

    const res = await fetch(`${ENDPOINT}?access_token=${ACCESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    const result = await res.json()

    if (!res.ok) {
      console.error('[Meta CAPI] Error:', result)
      return { success: false, error: result.error?.message || 'API error' }
    }

    console.log('[Meta CAPI] Lead event sent:', result)
    return { success: true }
  } catch (err) {
    console.error('[Meta CAPI] Failed to send event:', err)
    return { success: false, error: err.message }
  }
}

/**
 * Envía eventos Lead en lote para alumnas existentes en la BD.
 * Usa event_time basado en enrollment_date o created_at de cada alumna.
 * Envía en lotes de 10 con pausas para no sobrecargar la API.
 *
 * @param {Object[]} students - Array de alumnas desde la BD
 * @param {function} [onProgress] - Callback (sent, total, current) para mostrar progreso
 * @returns {Promise<{sent: number, skipped: number, failed: number, errors: string[]}>}
 */
export async function sendBulkLeadEvents(students, onProgress) {
  if (!PIXEL_ID || !ACCESS_TOKEN) {
    return { sent: 0, skipped: 0, failed: 0, errors: ['Missing PIXEL_ID or ACCESS_TOKEN'] }
  }

  const BATCH_SIZE = 5
  const DELAY_MS = 5000 // 5 segundos entre lotes
  let sent = 0
  let skipped = 0
  let failed = 0
  const errors = []

  for (let i = 0; i < students.length; i += BATCH_SIZE) {
    const batch = students.slice(i, i + BATCH_SIZE)
    const events = []

    for (const student of batch) {
      const userData = await buildUserData(student)

      // Sin teléfono ni email → no hay forma de hacer match
      if (!userData.ph && !userData.em) {
        skipped++
        continue
      }

      // Meta rechaza eventos con más de 7 días de antigüedad
      // Usar fecha de inscripción solo si es reciente, sino usar fecha actual
      const now = Math.floor(Date.now() / 1000)
      const sevenDaysAgo = now - (7 * 24 * 60 * 60)
      const rawTime = student.enrollment_date || student.created_at
        ? Math.floor(new Date(student.enrollment_date || student.created_at).getTime() / 1000)
        : now
      const eventTime = rawTime < sevenDaysAgo ? now : rawTime

      events.push({
        event_name: 'Lead',
        event_time: eventTime,
        action_source: 'physical_store',
        event_id: `lead_${student.id}`,
        user_data: userData,
        custom_data: {
          content_name: 'Registro de alumna',
          content_category: student.is_minor ? 'menor_con_representante' : 'adulta',
        },
      })
    }

    if (events.length === 0) continue

    try {
      const res = await fetch(`${ENDPOINT}?access_token=${ACCESS_TOKEN}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: events }),
      })

      const result = await res.json()

      if (res.ok) {
        sent += events.length
        console.log(`[Meta CAPI] Batch sent: ${events.length} events`, result)
      } else {
        failed += events.length
        const errMsg = result.error?.message || result.error?.error_user_msg || JSON.stringify(result.error || result)
        errors.push(`Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${errMsg}`)
        console.error('[Meta CAPI] Batch error:', JSON.stringify(result, null, 2))
      }
    } catch (err) {
      failed += events.length
      errors.push(`Lote ${Math.floor(i / BATCH_SIZE) + 1}: ${err.message}`)
    }

    if (onProgress) onProgress(sent + skipped + failed, students.length, batch[batch.length - 1]?.name)

    // Pausa entre lotes (excepto el último)
    if (i + BATCH_SIZE < students.length) {
      await new Promise(r => setTimeout(r, DELAY_MS))
    }
  }

  console.log(`[Meta CAPI] Bulk complete: ${sent} sent, ${skipped} skipped, ${failed} failed`)
  return { sent, skipped, failed, errors }
}
