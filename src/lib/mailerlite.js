/**
 * Sincroniza un suscriptor con MailerLite.
 * Fire-and-forget: errores se loguean pero nunca lanzan excepciones.
 *
 * @param {Object} params
 * @param {string} params.email - Email del suscriptor
 * @param {string} params.name - Nombre completo del suscriptor
 * @param {string} params.apiKey - MailerLite API key (Bearer token)
 * @param {string} [params.groupId] - MailerLite group ID (opcional)
 * @param {Object} [params.fields] - Campos personalizados extra (tipo_alumno, edad_alumno, etc.)
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export async function syncToMailerLite({ email, name, apiKey, groupId, fields: extraFields }) {
  if (!email || !apiKey) {
    return { success: false, error: 'Missing email or API key' }
  }

  try {
    // Separar nombre en first/last para MailerLite
    const nameParts = (name || '').trim().split(/\s+/)
    const firstName = nameParts[0] || ''
    const lastName = nameParts.slice(1).join(' ') || ''

    const body = {
      email: email.trim().toLowerCase(),
      fields: {
        name: firstName,
        last_name: lastName,
        ...extraFields
      }
    }

    // Solo agregar grupo si está configurado
    if (groupId) {
      body.groups = [groupId]
    }

    const response = await fetch('https://connect.mailerlite.com/api/subscribers', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.warn('MailerLite sync failed:', response.status, errorData)
      return { success: false, error: `HTTP ${response.status}` }
    }

    return { success: true }
  } catch (err) {
    console.warn('MailerLite sync error:', err.message)
    return { success: false, error: err.message }
  }
}
