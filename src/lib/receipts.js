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
