import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useCategoryManagement() {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchCategories = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('expense_categories')
        .select('*, expense_subcategories(*)')
        .order('sort_order', { ascending: true })

      if (error) throw error
      setCategories(data || [])
    } catch (err) {
      console.error('Error fetching categories:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  const saveCategory = async (categoryData, isEdit = false) => {
    try {
      const dbData = {
        name: categoryData.name.trim(),
        color: categoryData.color || '#6B7280',
        monthly_budget: categoryData.monthly_budget ? parseFloat(categoryData.monthly_budget) : null,
        sort_order: categoryData.sort_order ? parseInt(categoryData.sort_order) : 0,
        type: categoryData.type || 'expense',
        updated_at: new Date().toISOString()
      }

      let result
      if (isEdit && categoryData.id) {
        result = await supabase
          .from('expense_categories')
          .update(dbData)
          .eq('id', categoryData.id)
          .select('*, expense_subcategories(*)')
          .single()
      } else {
        result = await supabase
          .from('expense_categories')
          .insert([dbData])
          .select('*, expense_subcategories(*)')
          .single()
      }

      if (result.error) throw result.error

      await fetchCategories()
      return { success: true, data: result.data }
    } catch (err) {
      console.error('Error saving category:', err)
      return { success: false, error: err.message }
    }
  }

  const deleteCategory = async (id) => {
    try {
      const { error } = await supabase
        .from('expense_categories')
        .update({ active: false, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      setCategories(prev => prev.map(c => c.id === id ? { ...c, active: false } : c))
      return { success: true }
    } catch (err) {
      console.error('Error deactivating category:', err)
      return { success: false, error: err.message }
    }
  }

  const reactivateCategory = async (id) => {
    try {
      const { error } = await supabase
        .from('expense_categories')
        .update({ active: true, updated_at: new Date().toISOString() })
        .eq('id', id)

      if (error) throw error

      setCategories(prev => prev.map(c => c.id === id ? { ...c, active: true } : c))
      return { success: true }
    } catch (err) {
      console.error('Error reactivating category:', err)
      return { success: false, error: err.message }
    }
  }

  const saveSubcategory = async (subData, isEdit = false) => {
    try {
      const dbData = {
        name: subData.name.trim(),
        category_id: subData.category_id
      }

      let result
      if (isEdit && subData.id) {
        result = await supabase
          .from('expense_subcategories')
          .update({ name: dbData.name })
          .eq('id', subData.id)
          .select()
          .single()
      } else {
        result = await supabase
          .from('expense_subcategories')
          .insert([dbData])
          .select()
          .single()
      }

      if (result.error) throw result.error

      await fetchCategories()
      return { success: true, data: result.data }
    } catch (err) {
      console.error('Error saving subcategory:', err)
      return { success: false, error: err.message }
    }
  }

  const deleteSubcategory = async (id) => {
    try {
      const { error } = await supabase
        .from('expense_subcategories')
        .update({ active: false })
        .eq('id', id)

      if (error) throw error

      await fetchCategories()
      return { success: true }
    } catch (err) {
      console.error('Error deactivating subcategory:', err)
      return { success: false, error: err.message }
    }
  }

  const reactivateSubcategory = async (id) => {
    try {
      const { error } = await supabase
        .from('expense_subcategories')
        .update({ active: true })
        .eq('id', id)

      if (error) throw error

      await fetchCategories()
      return { success: true }
    } catch (err) {
      console.error('Error reactivating subcategory:', err)
      return { success: false, error: err.message }
    }
  }

  return {
    categories,
    loading,
    saveCategory,
    deleteCategory,
    reactivateCategory,
    saveSubcategory,
    deleteSubcategory,
    reactivateSubcategory,
    refresh: fetchCategories
  }
}
