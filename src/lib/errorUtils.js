const ERROR_MAP = {
  'Invalid login credentials': 'Credenciales incorrectas',
  'Email not confirmed': 'Email no confirmado',
  'User already registered': 'Este usuario ya está registrado',
  'duplicate key value': 'Este registro ya existe',
  'violates foreign key constraint': 'No se puede eliminar porque tiene registros asociados',
  'violates not-null constraint': 'Faltan campos obligatorios',
  'JWT expired': 'Tu sesión ha expirado. Inicia sesión nuevamente',
  'Failed to fetch': 'Error de conexión. Verifica tu internet',
  'NetworkError': 'Error de conexión. Verifica tu internet',
}

export function sanitizeError(error, fallback = 'Ocurrió un error. Intenta de nuevo.') {
  const msg = typeof error === 'string' ? error : error?.message || ''

  for (const [key, friendly] of Object.entries(ERROR_MAP)) {
    if (msg.includes(key)) return friendly
  }

  // Don't expose raw DB/Supabase error details
  if (msg.includes('relation') || msg.includes('column') || msg.includes('syntax') ||
      msg.includes('permission denied') || msg.includes('pg_') || msg.includes('supabase')) {
    console.error('[sanitizeError] Suppressed technical error:', msg)
    return fallback
  }

  return fallback
}
