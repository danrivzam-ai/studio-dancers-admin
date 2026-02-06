import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useDailyReport() {
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(false)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const fetchReport = useCallback(async (targetDate) => {
    try {
      setLoading(true)
      const d = targetDate || date

      // Query all 6 sources in parallel
      const [
        { data: payments },
        { data: quickPayments },
        { data: salesData },
        { data: expensesData },
        { data: movementsData },
        { data: registerData }
      ] = await Promise.all([
        supabase
          .from('payments')
          .select('amount, payment_method')
          .eq('payment_date', d),
        supabase
          .from('quick_payments')
          .select('amount, payment_method')
          .eq('payment_date', d),
        supabase
          .from('sales')
          .select('total, payment_method')
          .eq('sale_date', d)
          .is('deleted_at', null),
        supabase
          .from('expenses')
          .select('amount, payment_method, expense_categories(name, color)')
          .is('deleted_at', null)
          .eq('voided', false)
          .gte('expense_date', `${d}T00:00:00`)
          .lte('expense_date', `${d}T23:59:59`),
        supabase
          .from('cash_movements')
          .select('amount, type, bank')
          .is('deleted_at', null)
          .gte('movement_date', `${d}T00:00:00`)
          .lte('movement_date', `${d}T23:59:59`),
        supabase
          .from('cash_registers')
          .select('*')
          .eq('register_date', d)
          .maybeSingle()
      ])

      const p = payments || []
      const qp = quickPayments || []
      const s = salesData || []
      const e = expensesData || []
      const m = movementsData || []

      // Helper: sum amounts from array
      const sum = (arr, field = 'amount') => arr.reduce((t, r) => t + parseFloat(r[field] || 0), 0)

      // --- INCOME BY SOURCE ---
      const studentTotal = sum(p)
      const quickTotal = sum(qp)
      const salesTotal = sum(s, 'total')

      // --- INCOME BY METHOD ---
      // payments/quick_payments use Spanish: 'Efectivo', 'Transferencia'
      // sales uses English: 'cash', 'transfer', 'card'
      const incomeCash = sum(p.filter(r => r.payment_method === 'Efectivo'))
        + sum(qp.filter(r => r.payment_method === 'Efectivo'))
        + sum(s.filter(r => r.payment_method === 'cash'), 'total')

      const incomeTransfer = sum(p.filter(r => r.payment_method === 'Transferencia'))
        + sum(qp.filter(r => r.payment_method === 'Transferencia'))
        + sum(s.filter(r => r.payment_method === 'transfer'), 'total')

      const incomeCard = sum(s.filter(r => r.payment_method === 'card'), 'total')

      const totalIncome = studentTotal + quickTotal + salesTotal

      // --- INCOME BY SOURCE WITH METHOD BREAKDOWN ---
      const incomeBySource = {
        studentPayments: {
          total: studentTotal,
          cash: sum(p.filter(r => r.payment_method === 'Efectivo')),
          transfer: sum(p.filter(r => r.payment_method === 'Transferencia')),
          count: p.length
        },
        quickPayments: {
          total: quickTotal,
          cash: sum(qp.filter(r => r.payment_method === 'Efectivo')),
          transfer: sum(qp.filter(r => r.payment_method === 'Transferencia')),
          count: qp.length
        },
        sales: {
          total: salesTotal,
          cash: sum(s.filter(r => r.payment_method === 'cash'), 'total'),
          transfer: sum(s.filter(r => r.payment_method === 'transfer'), 'total'),
          card: sum(s.filter(r => r.payment_method === 'card'), 'total'),
          count: s.length
        }
      }

      // --- EXPENSES ---
      const expensesTotal = sum(e)
      const expensesCash = sum(e.filter(r => r.payment_method === 'cash'))
      const expensesTransfer = sum(e.filter(r => r.payment_method === 'transfer'))
      const expensesCard = sum(e.filter(r => r.payment_method === 'card'))

      // Expenses by category
      const categoryMap = {}
      e.forEach(exp => {
        const catName = exp.expense_categories?.name || 'Sin categoría'
        const catColor = exp.expense_categories?.color || '#6B7280'
        if (!categoryMap[catName]) {
          categoryMap[catName] = { name: catName, color: catColor, total: 0, count: 0 }
        }
        categoryMap[catName].total += parseFloat(exp.amount || 0)
        categoryMap[catName].count++
      })
      const expensesByCategory = Object.values(categoryMap).sort((a, b) => b.total - a.total)

      // --- MOVEMENTS ---
      const depositsTotal = sum(m.filter(r => r.type === 'deposit'))
      const cashInTotal = sum(m.filter(r => r.type === 'withdrawal' || r.type === 'owner_loan'))
      const cashOutTotal = sum(m.filter(r => r.type === 'owner_reimbursement'))

      // --- TOTALS ---
      const openingAmount = registerData ? parseFloat(registerData.opening_amount || 0) : 0

      // Efectivo en caja = apertura + ingresos(efectivo) - egresos(efectivo) - depósitos + retiros/préstamos - reembolsos
      const cashInHand = openingAmount + incomeCash - expensesCash - depositsTotal + cashInTotal - cashOutTotal

      // En banco = transferencias recibidas + depósitos
      const inBank = incomeTransfer + depositsTotal

      const netBalance = totalIncome - expensesTotal

      setReport({
        date: d,
        cashRegister: registerData,
        incomeByMethod: { cash: incomeCash, transfer: incomeTransfer, card: incomeCard },
        incomeBySource,
        totalIncome,
        incomeCount: p.length + qp.length + s.length,
        expensesByMethod: { cash: expensesCash, transfer: expensesTransfer, card: expensesCard },
        expensesByCategory,
        expensesTotal,
        expensesCount: e.length,
        movements: {
          deposits: depositsTotal,
          cashIn: cashInTotal,
          cashOut: cashOutTotal,
          net: cashInTotal - depositsTotal - cashOutTotal,
          count: m.length
        },
        totals: {
          totalIncome,
          totalExpenses: expensesTotal,
          netBalance,
          cashInHand,
          inBank,
          openingAmount
        }
      })
    } catch (err) {
      console.error('Error fetching daily report:', err)
    } finally {
      setLoading(false)
    }
  }, [date])

  return { report, loading, date, setDate, fetchReport, refresh: fetchReport }
}
