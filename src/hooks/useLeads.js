import { useState } from 'react'
import { supabase } from '../lib/supabase'

export const LEAD_ESTADOS = [
  { value: 'nuevo',       label: 'Nuevo',       color: 'bg-blue-100 text-blue-700' },
  { value: 'contactado',  label: 'Contactado',  color: 'bg-yellow-100 text-yellow-700' },
  { value: 'interesado',  label: 'Interesado',  color: 'bg-green-100 text-green-700' },
  { value: 'perdido',     label: 'Perdido',     color: 'bg-red-100 text-red-700' },
  { value: 'convertido',  label: 'Convertido',  color: 'bg-purple-100 text-purple-700' },
]

export const LEAD_FUENTES = [
  { value: 'whatsapp',   label: 'WhatsApp' },
  { value: 'instagram',  label: 'Instagram' },
  { value: 'referido',   label: 'Referido' },
  { value: 'web',        label: 'Sitio web' },
  { value: 'otro',       label: 'Otro' },
]

export function useLeads() {
  const [leads, setLeads] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchLeads = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .order('creado_en', { ascending: false })
      if (error) throw error
      setLeads(data || [])
    } catch (err) {
      console.error('Error fetching leads:', err)
    } finally {
      setLoading(false)
    }
  }

  const createLead = async (lead) => {
    const { data, error } = await supabase
      .from('leads')
      .insert(lead)
      .select()
      .single()
    if (error) throw error
    setLeads(prev => [data, ...prev])
    return data
  }

  const updateLead = async (id, changes) => {
    const { data, error } = await supabase
      .from('leads')
      .update(changes)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    setLeads(prev => prev.map(l => l.id === id ? data : l))
    return data
  }

  const deleteLead = async (id) => {
    const { error } = await supabase.from('leads').delete().eq('id', id)
    if (error) throw error
    setLeads(prev => prev.filter(l => l.id !== id))
  }

  const convertLead = async (id, studentId) => {
    return updateLead(id, {
      estado: 'convertido',
      student_id: studentId,
      convertido_en: new Date().toISOString(),
    })
  }

  return { leads, loading, fetchLeads, createLead, updateLead, deleteLead, convertLead }
}
