import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useSalePlans() {
  const [plans, setPlans]     = useState([])
  const [loading, setLoading] = useState(true)
  const [dbError, setDbError] = useState(null)   // null = ok, string = error message

  const fetchPlans = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('sale_plans')
        .select(`
          *,
          sale_plan_payments ( id, amount, payment_method, payment_date, installment_number, notes, created_at )
        `)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })

      if (error) throw error
      setPlans(data || [])
      setDbError(null)
    } catch (err) {
      console.error('useSalePlans fetchPlans:', err)
      setDbError(err?.message || 'Error al conectar con la base de datos')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPlans() }, [fetchPlans])

  // ── Crear nuevo plan ─────────────────────────────────────────────────────
  const createPlan = async ({ customerName, customerCedula, customerEmail, items, totalAmount, notes }) => {
    try {
      const { data, error } = await supabase
        .from('sale_plans')
        .insert({
          customer_name:       customerName.trim(),
          customer_cedula_ruc: customerCedula?.trim() || null,
          customer_email:      customerEmail?.trim() || null,
          items,
          total_amount:        totalAmount,
          amount_paid:         0,
          status:              'pending',
          notes:               notes?.trim() || null
        })
        .select()
        .single()

      if (error) throw error
      await fetchPlans()
      return { success: true, data }
    } catch (err) {
      console.error('useSalePlans createPlan:', err)
      return { success: false, error: err?.message || 'Error al crear el plan' }
    }
  }

  // ── Registrar abono ──────────────────────────────────────────────────────
  const registerPayment = async (planId, { amount, paymentMethod, notes }) => {
    try {
      // 1. Obtener plan actual
      const { data: plan, error: planErr } = await supabase
        .from('sale_plans')
        .select('*, sale_plan_payments(id)')
        .eq('id', planId)
        .single()

      if (planErr) throw planErr

      const newAmountPaid = parseFloat(plan.amount_paid) + parseFloat(amount)
      const balance       = parseFloat(plan.total_amount) - newAmountPaid
      const newStatus     = balance <= 0.001 ? 'paid' : 'partial'
      const installmentNo = (plan.sale_plan_payments?.length || 0) + 1

      // 2. Insertar pago
      const { data: payment, error: payErr } = await supabase
        .from('sale_plan_payments')
        .insert({
          plan_id:            planId,
          amount:             parseFloat(amount),
          payment_method:     paymentMethod,
          payment_date:       new Date().toISOString().split('T')[0],
          installment_number: installmentNo,
          notes:              notes?.trim() || null
        })
        .select()
        .single()

      if (payErr) throw payErr

      // 3. Actualizar plan
      const { error: updErr } = await supabase
        .from('sale_plans')
        .update({
          amount_paid: newAmountPaid,
          status:      newStatus,
          updated_at:  new Date().toISOString()
        })
        .eq('id', planId)

      if (updErr) throw updErr

      await fetchPlans()
      return {
        success:           true,
        payment,
        plan:              { ...plan, amount_paid: newAmountPaid, status: newStatus },
        installmentNumber: installmentNo,
        balance:           Math.max(0, balance)
      }
    } catch (err) {
      console.error('useSalePlans registerPayment:', err)
      return { success: false, error: err?.message || 'Error al registrar el abono' }
    }
  }

  // ── Cancelar plan ────────────────────────────────────────────────────────
  const cancelPlan = async (planId) => {
    try {
      const { error } = await supabase
        .from('sale_plans')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', planId)

      if (error) throw error
      await fetchPlans()
      return { success: true }
    } catch (err) {
      return { success: false, error: err?.message }
    }
  }

  // ── Marcar entregado ─────────────────────────────────────────────────────
  const markDelivered = async (planId, delivered = true) => {
    try {
      const { error } = await supabase
        .from('sale_plans')
        .update({ delivered, updated_at: new Date().toISOString() })
        .eq('id', planId)

      if (error) throw error
      await fetchPlans()
      return { success: true }
    } catch (err) {
      return { success: false, error: err?.message }
    }
  }

  const activePlans = plans.filter(p => p.status !== 'paid')
  const paidPlans   = plans.filter(p => p.status === 'paid')
  const totalDebt   = activePlans.reduce((s, p) =>
    s + (parseFloat(p.total_amount) - parseFloat(p.amount_paid)), 0)

  return {
    plans, activePlans, paidPlans, totalDebt,
    loading, dbError, refresh: fetchPlans,
    createPlan, registerPayment, cancelPlan, markDelivered
  }
}
