import { supabase } from './supabase'

/**
 * Registra una acción en el log de auditoría.
 * Fire-and-forget: no bloquea la operación principal.
 *
 * @param {Object} params
 * @param {string} params.action - Tipo de acción (e.g. 'expense_created')
 * @param {string} params.tableName - Tabla afectada (e.g. 'expenses')
 * @param {string} [params.recordId] - UUID del registro afectado
 * @param {Object} [params.oldData] - Estado anterior (para updates/deletes)
 * @param {Object} [params.newData] - Estado nuevo (para inserts/updates)
 * @param {string} [params.userId] - UUID del usuario (auto-detecta si no se provee)
 */
export async function logAudit({ action, tableName, recordId, oldData, newData, userId }) {
  try {
    let uid = userId
    if (!uid) {
      const { data } = await supabase.auth.getUser()
      uid = data.user?.id
    }

    await supabase.from('audit_log').insert([{
      user_id: uid || null,
      action,
      table_name: tableName,
      record_id: recordId || null,
      old_data: oldData || null,
      new_data: newData || null,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null
    }])
  } catch (err) {
    // Silencioso: fallo de auditoría no debe afectar la operación
    console.warn('Audit log error:', err.message)
  }
}
