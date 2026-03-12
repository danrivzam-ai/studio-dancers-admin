// =====================================================
// SRI Ecuador - Utilidades para Facturación Electrónica
// =====================================================

/**
 * Detecta el tipo de identificación del comprador
 * @param {string} idNumber - Cédula, RUC o pasaporte
 * @returns {{ idType: string, idNumber: string }} 04=RUC, 05=Cédula, 06=Pasaporte, 07=Cons.Final
 */
export function detectBuyerIdType(idNumber) {
  if (!idNumber || idNumber.trim() === '') {
    return { idType: '07', idNumber: '9999999999999' } // Consumidor Final
  }

  const cleaned = idNumber.replace(/[^0-9a-zA-Z]/g, '').trim()

  if (/^\d{13}$/.test(cleaned) && cleaned.endsWith('001')) {
    return { idType: '04', idNumber: cleaned } // RUC
  }

  if (/^\d{10}$/.test(cleaned)) {
    return { idType: '05', idNumber: cleaned } // Cédula
  }

  if (cleaned.length > 0) {
    return { idType: '06', idNumber: cleaned } // Pasaporte
  }

  return { idType: '07', idNumber: '9999999999999' } // Consumidor Final
}

/**
 * Mapea el método de pago del sistema al código SRI
 * @param {string} method - 'efectivo', 'transferencia', 'tarjeta'
 * @returns {string} Código SRI
 */
export function mapPaymentMethodSRI(method) {
  const map = {
    'efectivo': '01',       // SIN UTILIZACION DEL SISTEMA FINANCIERO
    'Efectivo': '01',
    'transferencia': '20',  // OTROS CON UTILIZACION DEL SISTEMA FINANCIERO
    'Transferencia': '20',
    'tarjeta': '19',        // TARJETA DE CREDITO
    'Tarjeta': '19',
  }
  return map[method] || '01'
}

/**
 * Descripción legible del método de pago SRI
 * @param {string} code - Código SRI ('01', '19', '20', etc.)
 * @returns {string}
 */
export function getPaymentMethodLabel(code) {
  const labels = {
    '01': 'SIN UTILIZACION DEL SISTEMA FINANCIERO',
    '15': 'COMPENSACION DE DEUDAS',
    '16': 'TARJETA DE DEBITO',
    '17': 'DINERO ELECTRONICO',
    '19': 'TARJETA DE CREDITO',
    '20': 'OTROS CON UTILIZACION DEL SISTEMA FINANCIERO',
  }
  return labels[code] || 'SIN UTILIZACION DEL SISTEMA FINANCIERO'
}

/**
 * Descripción legible del tipo de identificación
 */
export function getBuyerIdTypeLabel(code) {
  const labels = {
    '04': 'RUC',
    '05': 'CEDULA',
    '06': 'PASAPORTE',
    '07': 'CONSUMIDOR FINAL',
  }
  return labels[code] || 'CONSUMIDOR FINAL'
}

/**
 * Formatea el número de factura: 001-001-000000001
 * @param {string} establishment - Ej: '001'
 * @param {string} emissionPoint - Ej: '001'
 * @param {number} sequential - Número secuencial
 * @returns {string}
 */
export function formatInvoiceNumber(establishment, emissionPoint, sequential) {
  const est = (establishment || '001').padStart(3, '0')
  const pto = (emissionPoint || '001').padStart(3, '0')
  const seq = String(sequential).padStart(9, '0')
  return `${est}-${pto}-${seq}`
}

/**
 * Genera la clave de acceso de 49 dígitos para el SRI
 * @param {object} params
 * @param {Date} params.date - Fecha de emisión
 * @param {string} params.docType - Tipo de comprobante ('01' = factura)
 * @param {string} params.ruc - RUC del emisor
 * @param {string} params.environment - '1' pruebas, '2' producción
 * @param {string} params.series - Establecimiento + punto emisión (ej: '001001')
 * @param {number} params.sequential - Número secuencial
 * @param {string} params.numericCode - Código numérico de 8 dígitos
 * @param {string} params.emissionType - '1' = normal
 * @returns {string} Clave de acceso de 49 dígitos
 */
export function generateAccessKey({
  date,
  docType = '01',
  ruc,
  environment = '1',
  series,
  sequential,
  numericCode,
  emissionType = '1'
}) {
  // Fecha: ddmmyyyy
  const dd = String(date.getDate()).padStart(2, '0')
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const yyyy = String(date.getFullYear())
  const dateStr = `${dd}${mm}${yyyy}`

  // Construir 48 dígitos (sin dígito verificador)
  const base = [
    dateStr,                                    // 8 dígitos
    docType.padStart(2, '0'),                   // 2 dígitos
    ruc.padStart(13, '0'),                      // 13 dígitos
    environment,                                // 1 dígito
    series.padStart(6, '0'),                    // 6 dígitos (est+pto)
    String(sequential).padStart(9, '0'),        // 9 dígitos
    (numericCode || generateNumericCode()).padStart(8, '0'), // 8 dígitos
    emissionType,                               // 1 dígito
  ].join('')

  // Dígito verificador (módulo 11)
  const checkDigit = calculateMod11(base)

  return base + checkDigit
}

/**
 * Genera código numérico aleatorio de 8 dígitos
 */
export function generateNumericCode() {
  return String(Math.floor(Math.random() * 99999999) + 1).padStart(8, '0')
}

/**
 * Calcula el dígito verificador usando módulo 11
 * @param {string} digits - Cadena de dígitos
 * @returns {string} Dígito verificador (0-9)
 */
export function calculateMod11(digits) {
  const weights = [2, 3, 4, 5, 6, 7]
  let sum = 0

  // Recorrer de derecha a izquierda
  const chars = digits.split('').reverse()
  for (let i = 0; i < chars.length; i++) {
    const digit = parseInt(chars[i], 10)
    const weight = weights[i % weights.length]
    sum += digit * weight
  }

  const remainder = sum % 11
  let checkDigit = 11 - remainder

  if (checkDigit === 11) checkDigit = 0
  if (checkDigit === 10) checkDigit = 1

  return String(checkDigit)
}

/**
 * Resuelve los datos del comprador basado en si es menor o adulta
 * @param {object} student - Datos de la alumna
 * @returns {object} Datos del comprador para la factura
 */
export function resolveBuyerData(student) {
  if (!student) return { name: '', idNumber: '', email: '', phone: '', address: '' }

  if (student.is_minor) {
    // Menor: usar datos del pagador o representante
    if (student.payer_name && student.payer_cedula) {
      return {
        name: student.payer_name,
        idNumber: student.payer_cedula,
        email: student.parent_email || student.email || '',
        phone: student.payer_phone || student.parent_phone || '',
        address: student.payer_address || student.parent_address || student.address || '',
      }
    }
    return {
      name: student.parent_name || '',
      idNumber: student.parent_cedula || '',
      email: student.parent_email || student.email || '',
      phone: student.parent_phone || '',
      address: student.parent_address || student.address || '',
    }
  }

  // Adulta: usar datos propios
  return {
    name: student.name || '',
    idNumber: student.cedula || '',
    email: student.email || '',
    phone: student.phone || '',
    address: student.address || '',
  }
}

/**
 * Genera la descripción del ítem de factura
 * @param {object} payment - Datos del pago
 * @param {object} student - Datos de la alumna
 * @param {string} courseName - Nombre del curso
 * @returns {string}
 */
export function generateItemDescription(payment, student, courseName) {
  const month = payment?.payment_date
    ? new Date(payment.payment_date).toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })
    : ''

  const studentName = student?.name || ''

  if (courseName && month) {
    return `Servicio de enseñanza de danza - ${courseName} - ${studentName} - ${month}`
  }
  if (courseName) {
    return `Servicio de enseñanza de danza - ${courseName} - ${studentName}`
  }
  return `Servicio de enseñanza de danza - ${studentName}`
}

/**
 * Valida un número de cédula ecuatoriana (algoritmo módulo 10)
 */
export function validateCedula(cedula) {
  if (!cedula || cedula.length !== 10) return false
  const digits = cedula.split('').map(Number)
  const province = parseInt(cedula.substring(0, 2), 10)
  if (province < 1 || province > 24) return false

  const coefficients = [2, 1, 2, 1, 2, 1, 2, 1, 2]
  let sum = 0
  for (let i = 0; i < 9; i++) {
    let val = digits[i] * coefficients[i]
    if (val >= 10) val -= 9
    sum += val
  }
  const checkDigit = (10 - (sum % 10)) % 10
  return checkDigit === digits[9]
}

/**
 * Valida un RUC ecuatoriano (13 dígitos, termina en 001)
 */
export function validateRUC(ruc) {
  if (!ruc || ruc.length !== 13) return false
  if (!ruc.endsWith('001')) return false
  return validateCedula(ruc.substring(0, 10))
}
