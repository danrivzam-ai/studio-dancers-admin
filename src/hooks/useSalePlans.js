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
  const createPlan = async ({ customerName, customerCedula, customerEmail, customerPhone, items, totalAmount, notes, studentId, studentName, studentCourse }) => {
    try {
      const { data, error } = await supabase
        .from('sale_plans')
        .insert({
          customer_name:       customerName.trim(),
          customer_cedula_ruc: customerCedula?.trim() || null,
          customer_email:      customerEmail?.trim() || null,
          customer_phone:      customerPhone?.trim() || null,
          student_id:          studentId || null,
          student_name:        studentName?.trim() || null,
          student_course:      studentCourse?.trim() || null,
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

  // ── Editar total del plan ─────────────────────────────────────────────────
  const updatePlanTotal = async (planId, newTotal) => {
    try {
      const plan = plans.find(p => p.id === planId)
      if (!plan) throw new Error('Plan no encontrado')
      const paid = parseFloat(plan.amount_paid)
      const total = parseFloat(newTotal)
      if (total <= 0) throw new Error('El total debe ser mayor a $0')
      if (total < paid) throw new Error(`El total no puede ser menor al monto ya pagado ($${paid.toFixed(2)})`)
      const status = paid >= total ? 'paid' : paid > 0 ? 'partial' : 'pending'
      const { error } = await supabase
        .from('sale_plans')
        .update({ total_amount: total, status, updated_at: new Date().toISOString() })
        .eq('id', planId)
      if (error) throw error
      await fetchPlans()
      return { success: true }
    } catch (err) {
      return { success: false, error: err?.message }
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

  // ── Eliminar plan (solo si amount_paid === 0) ────────────────────────────
  const deletePlan = async (planId) => {
    try {
      const { error } = await supabase
        .from('sale_plans')
        .delete()
        .eq('id', planId)
        .eq('amount_paid', 0)

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
    createPlan, registerPayment, cancelPlan, deletePlan, updatePlanTotal, markDelivered
  }
}
