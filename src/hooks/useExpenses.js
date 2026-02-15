import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { formatDateForInput, getTodayEC } from '../lib/dateUtils'
import { logAudit } from '../lib/auditLog'

export function useExpenses() {
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Obtener categorías activas con subcategorías
  const fetchCategories = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*, expense_subcategories(*)')
        .eq('active', true)
        .order('sort_order', { ascending: true })

      if (error) throw error
      setCategories(data || [])
    } catch (err) {
      console.error('Error fetching expense categories:', err)
    }
  }, [])

  // Obtener egresos (por defecto del día actual)
  const fetchExpenses = useCallback(async (date) => {
    try {
      setLoading(true)
      const targetDate = date || getTodayEC()

      const { data, error } = await supabase
        .from('expenses')
        .select('*, expense_categories(name, color), expense_subcategories(name)')
        .is('deleted_at', null)
        .eq('voided', false)
        .gte('expense_date', `${targetDate}T00:00:00`)
        .lte('expense_date', `${targetDate}T23:59:59`)
        .order('created_at', { ascending: false })

      if (error) throw error
      setExpenses(data || [])
    } catch (err) {
      setError(err.message)
      console.error('Error fetching expenses:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Crear egreso
  const createExpense = async (expenseData) => {
    try {
      const newExpense = {
        cash_register_id: expenseData.cashRegisterId || null,
        category_id: expenseData.categoryId,
        subcategory_id: expenseData.subcategoryId || null,
        description: expenseData.description,
        amount: parseFloat(expenseData.amount),
        payment_method: expenseData.paymentMethod || 'cash',
        receipt_number: expenseData.receiptNumber || null,
        provider: expenseData.provider || null,
        notes: expenseData.notes || null,
        expense_date: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('expenses')
        .insert([newExpense])
        .select('*, expense_categories(name, color), expense_subcategories(name)')
        .single()

      if (error) throw error

      setExpenses(prev => [data, ...prev])
      logAudit({ action: 'expense_created', tableName: 'expenses', recordId: data.id, newData: data })
      return { success: true, data }
    } catch (err) {
      console.error('Error creating expense:', err)
      return { success: false, error: err.message }
    }
  }

  // Eliminar egreso (soft delete)
  const deleteExpense = async (id) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      setExpenses(prev => prev.filter(e => e.id !== id))
      logAudit({ action: 'expense_deleted', tableName: 'expenses', recordId: id })
      return { success: true }
    } catch (err) {
      console.error('Error deleting expense:', err)
      return { success: false, error: err.message }
    }
  }

  useEffect(() => {
    fetchCategories()
    fetchExpenses()
  }, [fetchCategories, fetchExpenses])

  // Total de egresos del día
  const todayExpensesTotal = expenses.reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0)

  return {
    expenses,
    categories,
    loading,
    error,
    todayExpensesTotal,
    fetchExpenses,
    fetchCategories,
    createExpense,
    deleteExpense,
    refreshExpenses: fetchExpenses
  }
}
