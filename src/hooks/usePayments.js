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

  // Generar número de recibo — usa el MÁXIMO receipt_number existente para evitar
  // retrocesos cuando un pago reciente tiene un número bajo.
  const generateReceiptNumber = async () => {
    try {
      // Traer los últimos 200 comprobantes y calcular el máximo en cliente
      // (PostgREST no soporta MAX() directo en columnas de texto)
      const { data, error } = await supabase
        .from('payments')
        .select('receipt_number')
        .not('receipt_number', 'is', null)
        .order('created_at', { ascending: false })
        .limit(200)

      if (error) throw error

      const maxNum = (data || []).reduce((max, row) => {
        const n = parseInt(String(row.receipt_number).replace(/\D/g, ''), 10)
        return isNaN(n) ? max : Math.max(max, n)
      }, 0)

      return maxNum + 1
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
