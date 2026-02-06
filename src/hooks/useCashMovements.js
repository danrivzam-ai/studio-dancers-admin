import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useCashMovements(cashRegisterId) {
  const [movements, setMovements] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchMovements = useCallback(async () => {
    if (!cashRegisterId) {
      setMovements([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('cash_movements')
        .select('*')
        .eq('cash_register_id', cashRegisterId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      setMovements(data || [])
    } catch (err) {
      console.error('Error fetching cash movements:', err)
    } finally {
      setLoading(false)
    }
  }, [cashRegisterId])

  const createMovement = async (movementData) => {
    try {
      const newMovement = {
        cash_register_id: cashRegisterId,
        type: movementData.type,
        amount: parseFloat(movementData.amount),
        bank: movementData.bank || null,
        receipt_number: movementData.receiptNumber || null,
        responsible: movementData.responsible || null,
        notes: movementData.notes || null,
        movement_date: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('cash_movements')
        .insert([newMovement])
        .select()
        .single()

      if (error) throw error

      setMovements(prev => [data, ...prev])
      return { success: true, data }
    } catch (err) {
      console.error('Error creating cash movement:', err)
      return { success: false, error: err.message }
    }
  }

  const deleteMovement = async (id) => {
    try {
      const { error } = await supabase
        .from('cash_movements')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      setMovements(prev => prev.filter(m => m.id !== id))
      return { success: true }
    } catch (err) {
      console.error('Error deleting cash movement:', err)
      return { success: false, error: err.message }
    }
  }

  useEffect(() => {
    fetchMovements()
  }, [fetchMovements])

  // Totales por tipo
  const depositsTotal = movements.filter(m => m.type === 'deposit').reduce((sum, m) => sum + parseFloat(m.amount || 0), 0)
  const cashInTotal = movements.filter(m => m.type === 'withdrawal' || m.type === 'owner_loan').reduce((sum, m) => sum + parseFloat(m.amount || 0), 0)
  const cashOutTotal = movements.filter(m => m.type === 'owner_reimbursement').reduce((sum, m) => sum + parseFloat(m.amount || 0), 0)
  const netTotal = cashInTotal - depositsTotal - cashOutTotal

  return {
    movements,
    loading,
    depositsTotal,
    cashInTotal,
    cashOutTotal,
    netTotal,
    createMovement,
    deleteMovement,
    refreshMovements: fetchMovements
  }
}
