import { supabase } from './supabase'

// Número de comprobante único para pagos de alumnas y pagos rápidos.
// Lo entrega la secuencia de Postgres (database-update-v41-receipt-sequence.sql),
// así dos cobros simultáneos nunca reciben el mismo número. Se pide justo antes
// de guardar el pago para no dejar huecos por modales cancelados.
export async function getNextReceiptNumber() {
  const { data, error } = await supabase.rpc('next_receipt_number')
  if (error || !data) {
    throw new Error('No se pudo generar el número de comprobante. Revisa tu conexión e intenta de nuevo.')
  }
  return data
}

// Número de comprobante de venta: VTA-YYYYMMDD-NNNNN, sufijo de una secuencia
// en BD (database-update-v44-sale-receipt-sequence.sql). Antes era aleatorio.
export async function getNextSaleReceiptNumber(saleDate) {
  const { data, error } = await supabase.rpc('next_sale_receipt_number', { p_sale_date: saleDate })
  if (error || !data) {
    throw new Error('No se pudo generar el número de comprobante de la venta. Revisa tu conexión e intenta de nuevo.')
  }
  return data
}
