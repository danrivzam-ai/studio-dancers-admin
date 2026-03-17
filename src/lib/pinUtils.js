import bcrypt from 'bcryptjs'

export async function hashPin(pin) {
  return bcrypt.hash(pin, 10)
}

export async function verifyPin(pin, hashedPin) {
  if (!hashedPin) return false
  return bcrypt.compare(pin, hashedPin)
}
