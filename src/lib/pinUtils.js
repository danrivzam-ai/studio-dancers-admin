import bcrypt from 'bcryptjs'
import { supabase } from './supabase'

export async function hashPin(pin) {
  return bcrypt.hash(pin, 10)
}

function isBcryptHash(value) {
  return typeof value === 'string' && value.startsWith('$2')
}

export async function verifyPin(pin, storedPin) {
  if (!storedPin) return false

  // If already bcrypt-hashed, compare normally
  if (isBcryptHash(storedPin)) {
    return bcrypt.compare(pin, storedPin)
  }

  // Legacy plaintext PIN — compare directly
  if (pin !== storedPin) return false

  // Auto-migrate: hash and save to DB so it works with bcrypt next time
  try {
    const hashed = await hashPin(pin)
    await supabase.from('school_settings').update({ security_pin: hashed }).eq('id', 1)
  } catch (e) {
    console.error('[pinUtils] Auto-migrate PIN failed:', e)
  }
  return true
}
