import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { logAudit } from '../lib/auditLog'

export function useSchoolSettings() {
  const [settings, setSettings] = useState({
    name: 'Studio Dancers',
    address: 'Alborada - Guayaquil',
    phone: '',
    email: '',
    logo_url: '/logo.png',
    ruc: '',
    auto_inactive_days: 10,
    mailerlite_api_key: '',
    mailerlite_group_id: '',
    bank_name: '',
    bank_account_number: '',
    bank_account_holder: '',
    bank_account_type: 'Ahorros'
  })
  const [loading, setLoading] = useState(true)

  // Cargar configuración
  const fetchSettings = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('school_settings')
        .select('*')
        .eq('id', 1)
        .single()

      if (error && error.code !== 'PGRST116') throw error
      if (data) setSettings(data)
    } catch (err) {
      console.error('Error fetching settings:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettings()
  }, [])

  // Actualizar configuración
  const updateSettings = async (newSettings) => {
    try {
      const { data, error } = await supabase
        .from('school_settings')
        .upsert({ id: 1, ...newSettings })
        .select()
        .single()

      if (error) throw error
      setSettings(data)
      logAudit({ action: 'settings_updated', tableName: 'school_settings', recordId: '1', newData: data })
      return { success: true, data }
    } catch (err) {
      console.error('Error updating settings:', err)
      return { success: false, error: err.message }
    }
  }

  return {
    settings,
    loading,
    fetchSettings,
    updateSettings
  }
}
