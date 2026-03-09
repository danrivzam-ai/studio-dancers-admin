/**
 * whatsappMetaApi.js
 * Capa de acceso a Meta Cloud API para envío de templates de WhatsApp.
 * Mismo patrón que mailerlite.js: fire-and-forget, nunca lanza excepciones.
 *
 * Documentación Meta: https://developers.facebook.com/docs/whatsapp/cloud-api/messages/template-messages
 */

/** Convierte número ecuatoriano al formato E.164 requerido por Meta (593XXXXXXXXX). */
function formatPhoneForMeta(phone) {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.startsWith('593')) return cleaned
  if (cleaned.startsWith('0'))   return `593${cleaned.slice(1)}`
  return cleaned
}

/**
 * Envía un template aprobado de WhatsApp via Meta Cloud API v21.
 *
 * @param {Object} params
 * @param {string} params.phoneId   - WHATSAPP_PHONE_NUMBER_ID de Meta
 * @param {string} params.token     - Access token permanente de Meta
 * @param {string} params.to        - Teléfono destino (se formatea automáticamente)
 * @param {string} params.templateName - Nombre exacto del template aprobado en Meta
 * @param {string[]} [params.variables] - Variables del cuerpo en orden: ['val1', 'val2', ...]
 * @param {string} [params.languageCode] - Código de idioma Meta (default: 'es')
 * @returns {Promise<{success: boolean, messageId?: string, error?: string}>}
 */
export async function sendTemplate({
  phoneId,
  token,
  to,
  templateName,
  variables = [],
  languageCode = 'es',
}) {
  if (!phoneId || !token) {
    return { success: false, error: 'Credenciales de WhatsApp no configuradas' }
  }
  const phone = formatPhoneForMeta(to)
  if (!phone) {
    return { success: false, error: 'N\u00famero de tel\u00e9fono inv\u00e1lido' }
  }

  // Construir componentes del template
  const components = []
  if (variables.length > 0) {
    components.push({
      type: 'body',
      parameters: variables.map(v => ({ type: 'text', text: String(v) })),
    })
  }

  const body = {
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: templateName,
      language: { code: languageCode },
      components,
    },
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v21.0/${phoneId}/messages`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      const errMsg = data?.error?.message || `HTTP ${response.status}`
      console.warn('[WhatsApp API] Error al enviar template:', errMsg, data?.error)
      return { success: false, error: errMsg }
    }

    const messageId = data?.messages?.[0]?.id || null
    return { success: true, messageId }
  } catch (err) {
    console.warn('[WhatsApp API] Error de red:', err.message)
    return { success: false, error: err.message }
  }
}

/**
 * Envía una notificación de texto a un chat de Telegram.
 * Fire-and-forget: nunca lanza excepción ni bloquea el flujo principal.
 *
 * @param {Object} params
 * @param {string} params.botToken - Token del bot de Telegram
 * @param {string} params.chatId   - Chat ID de Telegram (puede ser negativo para grupos)
 * @param {string} params.text     - Mensaje a enviar (soporta Markdown básico)
 */
export async function notifyTelegram({ botToken, chatId, text }) {
  if (!botToken || !chatId || !text) return
  try {
    await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    })
  } catch (err) {
    console.warn('[Telegram] Error al notificar:', err.message)
  }
}
