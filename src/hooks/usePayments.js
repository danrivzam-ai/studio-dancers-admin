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

  // Generar número de recibo
  const generateReceiptNumber = async () => {
    try {
      const { count, error } = await supabase
        .from('payments')
        .select('*', { count: 'exact', head: true })

      if (error) throw error

      const nextNumber = (count || 0) + 1
      return `REC-${String(nextNumber).padStart(6, '0')}`
    } catch (err) {
      console.error('Error generating receipt number:', err)
      return `REC-${Date.now()}`
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
