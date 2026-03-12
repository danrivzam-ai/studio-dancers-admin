import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  detectBuyerIdType,
  mapPaymentMethodSRI,
  formatInvoiceNumber,
  generateAccessKey,
  generateNumericCode,
  resolveBuyerData,
  generateItemDescription,
} from '../lib/sriUtils'

export function useInvoices() {
  const [invoices, setInvoices] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /**
   * Obtiene todas las facturas, opcionalmente filtradas
   */
  const fetchInvoices = useCallback(async (filters = {}) => {
    setLoading(true)
    try {
      let query = supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .order('created_at', { ascending: false })

      if (filters.status) query = query.eq('status', filters.status)
      if (filters.studentId) query = query.eq('student_id', filters.studentId)
      if (filters.paymentId) query = query.eq('payment_id', filters.paymentId)

      const { data, error: fetchError } = await query
      if (fetchError) throw fetchError
      setInvoices(data || [])
      return { success: true, data }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Obtiene una factura por ID
   */
  const getInvoice = useCallback(async (id) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .eq('id', id)
        .single()
      if (fetchError) throw fetchError
      return { success: true, data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [])

  /**
   * Obtiene la factura asociada a un pago (si existe)
   */
  const getInvoiceByPayment = useCallback(async (paymentId) => {
    try {
      const { data, error: fetchError } = await supabase
        .from('invoices')
        .select('*, invoice_items(*)')
        .eq('payment_id', paymentId)
        .neq('status', 'voided')
        .maybeSingle()
      if (fetchError) throw fetchError
      return { success: true, data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [])

  /**
   * Obtiene y incrementa el siguiente número secuencial
   */
  const getNextSequential = useCallback(async (settings) => {
    const establishment = settings?.sri_establishment || '001'
    const emissionPoint = settings?.sri_emission_point || '001'
    const environment = settings?.sri_environment || '1'

    try {
      // Buscar secuencial actual
      const { data: seqData, error: seqError } = await supabase
        .from('invoice_sequences')
        .select('*')
        .eq('establishment', establishment)
        .eq('emission_point', emissionPoint)
        .eq('environment', environment)
        .single()

      if (seqError) throw seqError

      const nextNumber = (seqData?.last_number || 0) + 1

      // Actualizar secuencial
      const { error: updateError } = await supabase
        .from('invoice_sequences')
        .update({ last_number: nextNumber, updated_at: new Date().toISOString() })
        .eq('id', seqData.id)

      if (updateError) throw updateError

      return {
        success: true,
        data: {
          sequential: nextNumber,
          invoiceNumber: formatInvoiceNumber(establishment, emissionPoint, nextNumber),
        }
      }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [])

  /**
   * Crea una factura borrador a partir de un pago
   */
  const createDraftInvoice = useCallback(async ({
    payment,
    student,
    courseName,
    settings,
    buyerOverride = null,
  }) => {
    setLoading(true)
    try {
      // 1. Obtener siguiente secuencial
      const seqResult = await getNextSequential(settings)
      if (!seqResult.success) throw new Error(seqResult.error)

      const { sequential, invoiceNumber } = seqResult.data
      const establishment = settings?.sri_establishment || '001'
      const emissionPoint = settings?.sri_emission_point || '001'
      const environment = settings?.sri_environment || '1'

      // 2. Resolver datos del comprador
      const buyerRaw = buyerOverride || resolveBuyerData(student)
      const { idType, idNumber } = detectBuyerIdType(buyerRaw.idNumber)

      // 3. Generar clave de acceso
      const accessKey = generateAccessKey({
        date: new Date(payment.payment_date || new Date()),
        docType: '01',
        ruc: settings?.ruc || '0993406931001',
        environment,
        series: `${establishment}${emissionPoint}`,
        sequential,
        numericCode: generateNumericCode(),
        emissionType: '1',
      })

      // 4. Calcular montos (IVA 0% para enseñanza de danza)
      const amount = parseFloat(payment.amount) || 0

      // 5. Mapear método de pago
      const paymentMethodSRI = mapPaymentMethodSRI(payment.payment_method)

      // 6. Insertar factura
      const { data: invoice, error: insertError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: invoiceNumber,
          access_key: accessKey,
          status: 'draft',
          environment,
          // Emisor
          issuer_ruc: settings?.ruc || '0993406931001',
          issuer_name: 'ADLAB STUDIO S.A.S.',
          issuer_trade_name: settings?.name || 'Studio Dancers',
          issuer_address: settings?.address || '',
          // Comprador
          buyer_id_type: idType,
          buyer_id_number: idNumber,
          buyer_name: buyerRaw.name.toUpperCase(),
          buyer_email: buyerRaw.email,
          buyer_phone: buyerRaw.phone,
          buyer_address: buyerRaw.address,
          // Montos
          subtotal_0: amount,
          subtotal_12: 0,
          iva_amount: 0,
          total: amount,
          // Pago
          payment_method_sri: paymentMethodSRI,
          // Referencias
          payment_id: payment.id,
          student_id: student?.id || null,
        })
        .select()
        .single()

      if (insertError) throw insertError

      // 7. Insertar ítem de factura
      const description = generateItemDescription(payment, student, courseName)

      const { error: itemError } = await supabase
        .from('invoice_items')
        .insert({
          invoice_id: invoice.id,
          description,
          quantity: 1,
          unit_price: amount,
          subtotal: amount,
          iva_rate: 0,
          iva_code: '0',
        })

      if (itemError) throw itemError

      // 8. Refetch con items
      const result = await getInvoice(invoice.id)
      return result
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [getNextSequential, getInvoice])

  /**
   * Anula una factura
   */
  const voidInvoice = useCallback(async (invoiceId, reason) => {
    try {
      const { data, error: voidError } = await supabase
        .from('invoices')
        .update({
          status: 'voided',
          voided_at: new Date().toISOString(),
          voided_reason: reason,
        })
        .eq('id', invoiceId)
        .select()
        .single()

      if (voidError) throw voidError
      return { success: true, data }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [])

  return {
    invoices,
    loading,
    error,
    fetchInvoices,
    getInvoice,
    getInvoiceByPayment,
    getNextSequential,
    createDraftInvoice,
    voidInvoice,
  }
}
