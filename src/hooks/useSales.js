import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { formatDateForInput } from '../lib/dateUtils'
import { logAudit } from '../lib/auditLog'

export function useSales() {
  const [sales, setSales] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Cargar ventas (solo las no eliminadas)
  const fetchSales = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('sales')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      setSales(data || [])
    } catch (err) {
      setError(err.message)
      console.error('Error fetching sales:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSales()
  }, [])

  // Crear venta
  const createSale = async (saleData) => {
    try {
      const newSale = {
        customer_name: saleData.customerName,
        product_id: saleData.productId,
        product_name: saleData.productName,
        quantity: parseInt(saleData.quantity),
        unit_price: parseFloat(saleData.unitPrice),
        total: parseFloat(saleData.total),
        sale_date: saleData.date || formatDateForInput(new Date()),
        notes: saleData.notes || null
      }

      const { data, error } = await supabase
        .from('sales')
        .insert([newSale])
        .select()
        .single()

      if (error) throw error

      setSales(prev => [data, ...prev])
      logAudit({ action: 'sale_created', tableName: 'sales', recordId: data.id, newData: data })
      return { success: true, data }
    } catch (err) {
      console.error('Error creating sale:', err)
      return { success: false, error: err.message }
    }
  }

  // Eliminar venta (soft delete)
  const deleteSale = async (id) => {
    try {
      const { error } = await supabase
        .from('sales')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      setSales(prev => prev.filter(s => s.id !== id))
      logAudit({ action: 'sale_deleted', tableName: 'sales', recordId: id })
      return { success: true }
    } catch (err) {
      console.error('Error deleting sale:', err)
      return { success: false, error: err.message }
    }
  }

  // Calcular total de ventas
  const totalSalesIncome = sales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0)

  return {
    sales,
    loading,
    error,
    fetchSales,
    createSale,
    deleteSale,
    totalSalesIncome
  }
}
