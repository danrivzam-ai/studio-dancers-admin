import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { formatDateForInput } from '../lib/dateUtils'

export function useCashRegister() {
  const [todayRegister, setTodayRegister] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchTodayRegister = useCallback(async () => {
    try {
      const today = formatDateForInput(new Date())

      const { data, error } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('register_date', today)
        .single()

      if (error && error.code !== 'PGRST116') {
        throw error
      }

      setTodayRegister(data || null)
    } catch (err) {
      console.error('Error fetching cash register:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTodayRegister()
  }, [fetchTodayRegister])

  const isOpen = todayRegister?.status === 'open'
  const isClosed = todayRegister?.status === 'closed'
  const notOpened = !todayRegister

  return {
    todayRegister,
    isOpen,
    isClosed,
    notOpened,
    loading,
    refresh: fetchTodayRegister
  }
}
