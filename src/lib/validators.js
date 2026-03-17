// Ecuador cedula validation (10 digits, valid check digit)
export function isValidCedula(cedula) {
  if (!cedula) return true // optional field
  const clean = cedula.replace(/\D/g, '')
  if (clean.length !== 10) return false
  const province = parseInt(clean.substring(0, 2))
  if (province < 1 || province > 24) return false
  // Luhn-like check digit validation for Ecuador
  const digits = clean.split('').map(Number)
  const checkDigit = digits[9]
  let sum = 0
  for (let i = 0; i < 9; i++) {
    let val = digits[i]
    if (i % 2 === 0) {
      val *= 2
      if (val > 9) val -= 9
    }
    sum += val
  }
  const computed = (10 - (sum % 10)) % 10
  return computed === checkDigit
}

export function isValidEmail(email) {
  if (!email) return true // optional field
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

export function isValidPhone(phone) {
  if (!phone) return true // optional field
  const clean = phone.replace(/\D/g, '')
  return clean.length >= 7 && clean.length <= 15
}

export function validateStudentForm(formData) {
  const errors = []

  if (!formData.name?.trim()) {
    errors.push('El nombre es obligatorio')
  }

  if (formData.cedula && !isValidCedula(formData.cedula)) {
    errors.push('La cédula del alumno no es válida')
  }

  if (formData.email && !isValidEmail(formData.email)) {
    errors.push('El email del alumno no es válido')
  }

  if (formData.phone && !isValidPhone(formData.phone)) {
    errors.push('El teléfono del alumno no es válido')
  }

  if (formData.isMinor) {
    if (formData.parentCedula && !isValidCedula(formData.parentCedula)) {
      errors.push('La cédula del representante no es válida')
    }
    if (formData.parentEmail && !isValidEmail(formData.parentEmail)) {
      errors.push('El email del representante no es válido')
    }
    if (formData.parentPhone && !isValidPhone(formData.parentPhone)) {
      errors.push('El teléfono del representante no es válido')
    }
  }

  if (formData.hasDifferentPayer) {
    if (formData.payerCedula && !isValidCedula(formData.payerCedula)) {
      errors.push('La cédula del pagador no es válida')
    }
    if (formData.payerPhone && !isValidPhone(formData.payerPhone)) {
      errors.push('El teléfono del pagador no es válido')
    }
  }

  return errors
}
