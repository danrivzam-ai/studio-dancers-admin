import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { formatDateForInput } from '../lib/dateUtils'

export function useDailyIncome() {
  const [todayIncome, setTodayIncome] = useState(0)
  const [todayPaymentsCount, setTodayPaymentsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchTodayIncome = useCallback(async () => {
    try {
      setLoading(true)
      const today = formatDateForInput(new Date())

      // Pagos de estudiantes de hoy
      const { data: studentPayments, error: studentError } = await supabase
        .from('payments')
        .select('amount')
        .eq('payment_date', today)

      if (studentError) throw studentError

      // Pagos rápidos de hoy
      const { data: quickPayments, error: quickError } = await supabase
        .from('quick_payments')
        .select('amount')
        .eq('payment_date', today)

      if (quickError) throw quickError

      // Ventas de hoy
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('total')
        .eq('sale_date', today)

      if (salesError) throw salesError

      // Calcular totales
      const studentTotal = studentPayments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0
      const quickTotal = quickPayments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0
      const salesTotal = salesData?.reduce((sum, s) => sum + parseFloat(s.total || 0), 0) || 0

      const totalIncome = studentTotal + quickTotal + salesTotal
      const totalCount = (studentPayments?.length || 0) + (quickPayments?.length || 0) + (salesData?.length || 0)

      setTodayIncome(totalIncome)
      setTodayPaymentsCount(totalCount)
    } catch (err) {
      console.error('Error fetching today income:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTodayIncome()
  }, [fetchTodayIncome])

  return {
    todayIncome,
    todayPaymentsCount,
    loading,
    refreshIncome: fetchTodayIncome
  }
}
