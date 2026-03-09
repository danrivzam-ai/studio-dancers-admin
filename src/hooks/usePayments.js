import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export function usePayments() {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Cargar historial de pagos
  const fetchPayments = async (studentId = null) => {
    try {
      setLoading(true)
      let query = supabase
        .from('payments')
        .select('*, students(name)')
        .order('payment_date', { ascending: false })

      if (studentId) {
        query = query.eq('student_id', studentId)
      }

      const { data, error } = await query

      if (error) throw error
      setPayments(data || [])
    } catch (err) {
      setError(err.message)
      console.error('Error fetching payments:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPayments()
  }, [])

  // Generar número de recibo — usa el último receipt_number para evitar
  // duplicados cuando dos pagos se registran simultáneamente o hay pagos eliminados.
  const generateReceiptNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('receipt_number')
        .not('receipt_number', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error

      const lastNum = data?.receipt_number
        ? parseInt(String(data.receipt_number).replace(/\D/g, ''), 10)
        : 0
      const nextNumber = (isNaN(lastNum) ? 0 : lastNum) + 1
      return nextNumber
    } catch (err) {
      console.error('Error generating receipt number:', err)
      return Date.now() % 100000
    }
  }

  // Obtener pagos de un estudiante específico
  const getStudentPayments = async (studentId) => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', studentId)
        .order('payment_date', { ascending: false })

      if (error) throw error
      return data || []
    } catch (err) {
      console.error('Error fetching student payments:', err)
      return []
    }
  }

  return {
    payments,
    loading,
    error,
    fetchPayments,
    generateReceiptNumber,
    getStudentPayments
  }
}
