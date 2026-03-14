/**
 * useFinancialKPIs.js
 * KPIs financieros del mes actual vs mes anterior.
 * Consulta ligera — 5 tablas en paralelo × 2 meses.
 */
import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const sum = (arr, field = 'amount') =>
  (arr || []).reduce((t, r) => t + parseFloat(r[field] || 0), 0)

/** Rango de un mes: { start: 'YYYY-MM-01', end: 'YYYY-MM-DD' } */
function monthRange(year, month) {
  const start = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay = new Date(year, month, 0).getDate()
  const end   = `${year}-${String(month).padStart(2, '0')}-${lastDay}`
  return { start, end }
}

/** Suma de ingresos para un rango de fechas (5 fuentes) */
async function fetchIncome(start, end) {
  const [
    { data: p },
    { data: qp },
    { data: s },
    { data: pp },
  ] = await Promise.all([
    supabase.from('payments').select('amount')
      .gte('payment_date', start).lte('payment_date', end).eq('voided', false),
    supabase.from('quick_payments').select('amount')
      .gte('payment_date', start).lte('payment_date', end).eq('voided', false),
    supabase.from('sales').select('total')
      .gte('sale_date', start).lte('sale_date', end).is('deleted_at', null),
    supabase.from('sale_plan_payments').select('amount')
      .gte('payment_date', start).lte('payment_date', end),
  ])
  return sum(p) + sum(qp) + sum(s, 'total') + sum(pp)
}

/** Suma de egresos para un rango de fechas */
async function fetchExpenses(start, end) {
  const { data } = await supabase.from('expenses').select('amount')
    .is('deleted_at', null).eq('voided', false)
    .gte('expense_date', `${start}T00:00:00`)
    .lte('expense_date', `${end}T23:59:59`)
  return sum(data)
}

export function useFinancialKPIs() {
  const [kpis, setKpis]       = useState(null)
  const [loading, setLoading] = useState(false)

  const fetchKPIs = useCallback(async (students = []) => {
    setLoading(true)
    try {
      const now   = new Date()
      const cy    = now.getFullYear()
      const cm    = now.getMonth() + 1          // mes actual (1-12)
      const py    = cm === 1 ? cy - 1 : cy
      const pm    = cm === 1 ? 12 : cm - 1      // mes anterior

      const curr = monthRange(cy, cm)
      const prev = monthRange(py, pm)

      // Ingresos y egresos en paralelo (4 queries actuales + 4 anteriores + 1 egresos c + 1 egresos p)
      const [incomeC, incomeP, expensesC] = await Promise.all([
        fetchIncome(curr.start, curr.end),
        fetchIncome(prev.start, prev.end),
        fetchExpenses(curr.start, curr.end),
      ])

      // Tasa de cobro: alumnas con curso 'mes' que pagaron este mes
      // = next_payment_date > hoy (ya pagaron el ciclo actual)
      const todayStr = now.toISOString().slice(0, 10)
      const monthlyStudents = students.filter(s => {
        // solo las que tienen curso mensual (tienen next_payment_date)
        return s.next_payment_date != null
      })
      const paid = monthlyStudents.filter(s => s.next_payment_date > todayStr).length
      const collectionRate = monthlyStudents.length > 0
        ? Math.round((paid / monthlyStudents.length) * 100)
        : null

      // Tendencia vs mes anterior
      const trend = incomeP > 0
        ? Math.round(((incomeC - incomeP) / incomeP) * 100)
        : null

      setKpis({
        incomeC,
        incomeP,
        expensesC,
        netC: incomeC - expensesC,
        trend,             // % vs mes anterior (puede ser negativo)
        collectionRate,    // % de alumnas que ya pagaron este ciclo
      })
    } catch (err) {
      console.error('useFinancialKPIs:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  return { kpis, loading, fetchKPIs }
}
