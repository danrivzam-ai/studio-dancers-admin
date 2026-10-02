import { BANKS } from './courses'

// Formas de pago únicas para todos los formularios de cobro (pago de alumna,
// pago rápido, abonos y ventas). La UI siempre usa estos ids; cada tabla guarda
// su formato histórico para no romper caja, reportes ni historial:
//   payments / quick_payments / sale_plan_payments → nombre ('Efectivo', ...)
//   sales                                         → código ('cash', ...)
export const PAYMENT_METHOD_OPTIONS = [
  { id: 'efectivo', name: 'Efectivo', salesCode: 'cash' },
  { id: 'transferencia', name: 'Transferencia', salesCode: 'transfer' },
  { id: 'tarjeta', name: 'Tarjeta', salesCode: 'card' },
]

export const paymentMethodName = (id) =>
  PAYMENT_METHOD_OPTIONS.find(m => m.id === id)?.name || 'Efectivo'

export const paymentMethodSalesCode = (id) =>
  PAYMENT_METHOD_OPTIONS.find(m => m.id === id)?.salesCode || 'cash'

export const bankNameById = (bankId) =>
  BANKS.find(b => b.id === bankId)?.name || null
