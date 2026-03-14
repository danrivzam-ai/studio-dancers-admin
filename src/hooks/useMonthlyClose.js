/**
 * useMonthlyClose.js
 * Gestión del cierre mensual contable.
 * Consulta las mismas fuentes que useDailyReport pero por rango de mes.
 */
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const sum = (arr, field = 'amount') =>
  arr.reduce((t, r) => t + parseFloat(r[field] || 0), 0)

export function useMonthlyClose() {
  const [closes,         setCloses]         = useState([])
  const [loading,        setLoading]        = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summary,        setSummary]        = useState(null)

  // ── Cargar historial de cierres ─────────────────────────────────────────────
  const fetchCloses = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('monthly_closes')
        .select('*')
        .order('periodo', { ascending: false })
      if (error) throw error
      setCloses(data || [])
    } catch (err) {
      console.error('useMonthlyClose.fetchCloses:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Verificar si un mes ya está cerrado ─────────────────────────────────────
  const isMonthClosed = useCallback(async (year, month) => {
    const periodo = `${year}-${String(month).padStart(2, '0')}-01`
    const { data } = await supabase
      .from('monthly_closes')
      .select('id')
      .eq('periodo', periodo)
      .maybeSingle()
    return !!data
  }, [])

  // ── Calcular resumen del mes ────────────────────────────────────────────────
  const getMonthSummary = useCallback(async (year, month) => {
    setSummaryLoading(true)
    setSummary(null)
    try {
      const start = `${year}-${String(month).padStart(2, '0')}-01`
      // Último día del mes
      const lastDay = new Date(year, month, 0).getDate()
      const end = `${year}-${String(month).padStart(2, '0')}-${lastDay}`

      const [
        { data: payments },
        { data: quickPayments },
        { data: salesData },
        { data: expensesData },
        { data: planPaymentsData }
      ] = await Promise.all([
        supabase
          .from('payments')
          .select('amount')
          .gte('payment_date', start)
          .lte('payment_date', end)
          .eq('voided', false),
        supabase
          .from('quick_payments')
          .select('amount')
          .gte('payment_date', start)
          .lte('payment_date', end)
          .eq('voided', false),
        supabase
          .from('sales')
          .select('total')
          .gte('sale_date', start)
          .lte('sale_date', end)
          .is('deleted_at', null),
        supabase
          .from('expenses')
          .select('amount')
          .is('deleted_at', null)
          .eq('voided', false)
          .gte('expense_date', `${start}T00:00:00`)
          .lte('expense_date', `${end}T23:59:59`),
        supabase
          .from('sale_plan_payments')
          .select('amount')
          .gte('payment_date', start)
          .lte('payment_date', end),
      ])

      const ingresosAlumnos  = sum(payments      || [])
      const ingresosRapidos  = sum(quickPayments  || [])
      const ingresosVentas   = sum(salesData      || [], 'total')
      const ingresosPlanes   = sum(planPaymentsData || [])
      const totalIngresos    = ingresosAlumnos + ingresosRapidos + ingresosVentas + ingresosPlanes
      const totalEgresos     = sum(expensesData  || [])
      const saldoNeto        = totalIngresos - totalEgresos

      setSummary({
        ingresosAlumnos,
        ingresosRapidos,
        ingresosVentas,
        ingresosPlanes,
        totalIngresos,
        totalEgresos,
        saldoNeto,
        paymentsCount:    (payments      || []).length,
        quickCount:       (quickPayments  || []).length,
        salesCount:       (salesData      || []).length,
        planCount:        (planPaymentsData || []).length,
        expensesCount:    (expensesData   || []).length,
      })

      return { success: true, data: {
        ingresosAlumnos,
        ingresosRapidos,
        ingresosVentas,
        ingresosPlanes,
        totalIngresos,
        totalEgresos,
        saldoNeto,
      }}
    } catch (err) {
      console.error('useMonthlyClose.getMonthSummary:', err)
      return { success: false, error: err.message }
    } finally {
      setSummaryLoading(false)
    }
  }, [])

  // ── Cerrar mes ─────────────────────────────────────────────────────────────
  const closeMonth = useCallback(async ({
    year, month, summaryData, alumnas_activas, alumnas_mora, alumnas_inactivas,
    notas, userId, userName
  }) => {
    try {
      const periodo = `${year}-${String(month).padStart(2, '0')}-01`
      const { data, error } = await supabase
        .from('monthly_closes')
        .insert({
          periodo,
          ingresos_alumnos:   summaryData.ingresosAlumnos,
          ingresos_rapidos:   summaryData.ingresosRapidos,
          ingresos_ventas:    summaryData.ingresosVentas,
          ingresos_planes:    summaryData.ingresosPlanes,
          total_ingresos:     summaryData.totalIngresos,
          total_egresos:      summaryData.totalEgresos,
          saldo_neto:         summaryData.saldoNeto,
          alumnas_activas:    alumnas_activas   ?? 0,
          alumnas_mora:       alumnas_mora      ?? 0,
          alumnas_inactivas:  alumnas_inactivas ?? 0,
          notas:              notas || null,
          cerrado_por:        userId  || null,
          cerrado_por_nombre: userName || null,
        })
        .select()
        .single()

      if (error) throw error
      await fetchCloses()
      return { success: true, data }
    } catch (err) {
      console.error('useMonthlyClose.closeMonth:', err)
      // Mensaje legible si el mes ya está cerrado
      const msg = err.code === '23505'
        ? 'Este mes ya fue cerrado anteriormente.'
        : err.message
      return { success: false, error: msg }
    }
  }, [fetchCloses])

  return {
    closes,
    loading,
    summaryLoading,
    summary,
    setSummary,
    fetchCloses,
    isMonthClosed,
    getMonthSummary,
    closeMonth,
  }
}
