import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { formatDateForInput, getTodayEC } from '../lib/dateUtils'

export function useDailyIncome() {
  const [todayIncome, setTodayIncome] = useState(0)
  const [todayPaymentsCount, setTodayPaymentsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchTodayIncome = useCallback(async () => {
    try {
      setLoading(true)
      const today = getTodayEC()

      // Pagos de estudiantes de hoy (excluir anulados)
      const { data: studentPayments, error: studentError } = await supabase
        .from('payments')
        .select('amount')
        .eq('payment_date', today)
        .eq('voided', false)

      if (studentError) throw studentError

      // Pagos rápidos de hoy (excluir anulados)
      const { data: quickPayments, error: quickError } = await supabase
        .from('quick_payments')
        .select('amount')
        .eq('payment_date', today)
        .eq('voided', false)

      if (quickError) throw quickError

      // Ventas de hoy
      const { data: salesData, error: salesError } = await supabase
        .from('sales')
        .select('total')
        .eq('sale_date', today)

      if (salesError) throw salesError

      // Abonos de planes de venta de hoy
      const { data: planPayments, error: planError } = await supabase
        .from('sale_plan_payments')
        .select('amount')
        .eq('payment_date', today)

      if (planError) console.error('useDailyIncome plan payments error:', planError)

      // Calcular totales
      const studentTotal = studentPayments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0
      const quickTotal = quickPayments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0
      const salesTotal = salesData?.reduce((sum, s) => sum + parseFloat(s.total || 0), 0) || 0
      const planTotal = planPayments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0

      const totalIncome = studentTotal + quickTotal + salesTotal + planTotal
      const totalCount = (studentPayments?.length || 0) + (quickPayments?.length || 0) + (salesData?.length || 0) + (planPayments?.length || 0)

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
