import { useState } from 'react'
import { supabase } from '../lib/supabase'

export const DAY_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

export function formatTime12(t) {
  if (!t) return ''
  const [h, m] = t.substring(0, 5).split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}

export function calcHorasClase(timeStart, timeEnd) {
  const [h1, m1] = (timeStart || '').substring(0, 5).split(':').map(Number)
  const [h2, m2] = (timeEnd || '').substring(0, 5).split(':').map(Number)
  if (isNaN(h1) || isNaN(h2)) return 0
  return ((h2 * 60 + m2) - (h1 * 60 + m1)) / 60
}

function countDayOccurrences(startStr, endStr, isoDayOfWeek) {
  const [sy, sm, sd] = startStr.split('-').map(Number)
  const [ey, em, ed] = endStr.split('-').map(Number)
  let count = 0
  const current = new Date(sy, sm - 1, sd)
  const end = new Date(ey, em - 1, ed)
  while (current <= end) {
    const jsDay = current.getDay()
    const isoDay = jsDay === 0 ? 7 : jsDay
    if (isoDay === isoDayOfWeek) count++
    current.setDate(current.getDate() + 1)
  }
  return count
}

export function buildDetails(slots, fechaInicio, fechaFin, tarifaHora) {
  return slots.map(slot => {
    const horas_clase = calcHorasClase(slot.time_start, slot.time_end)
    const clases_programadas = countDayOccurrences(fechaInicio, fechaFin, slot.day_of_week)
    const clases_efectivas = clases_programadas
    const horas_trabajadas = +(clases_efectivas * horas_clase).toFixed(2)
    const monto = +(horas_trabajadas * tarifaHora).toFixed(2)
    return {
      schedule_id: slot.id,
      dia_semana: slot.day_of_week,
      dia_nombre: DAY_NAMES[slot.day_of_week] || '',
      horario: `${formatTime12(slot.time_start)} – ${formatTime12(slot.time_end)}`,
      group_name: slot.group_name || '',
      horas_clase,
      clases_programadas,
      canceladas: 0,
      recuperaciones: 0,
      clases_efectivas,
      horas_trabajadas,
      monto,
    }
  })
}

export function recalcDetail(d, tarifaHora) {
  const canceladas = Math.min(d.canceladas, d.clases_programadas)
  const clases_efectivas = Math.max(0, d.clases_programadas - canceladas + d.recuperaciones)
  const horas_trabajadas = +(clases_efectivas * d.horas_clase).toFixed(2)
  const monto = +(horas_trabajadas * tarifaHora).toFixed(2)
  return { ...d, canceladas, clases_efectivas, horas_trabajadas, monto }
}

export function useHonorarios() {
  const [periodos, setPeriodos] = useState([])
  const [loading, setLoading] = useState(false)

  const fetchPeriodosByInstructor = async (instructorId) => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('payment_periods')
        .select('*, payment_details(*)')
        .eq('instructor_id', instructorId)
        .order('creado_en', { ascending: false })
      if (error) throw error
      setPeriodos(data || [])
      return data || []
    } catch (err) {
      console.error('Error fetching periodos:', err)
      return []
    } finally {
      setLoading(false)
    }
  }

  const getNextComprobante = async () => {
    const year = new Date().getFullYear()
    const { data } = await supabase
      .from('payment_periods')
      .select('numero_comprobante')
      .like('numero_comprobante', `%-${year}`)
      .order('creado_en', { ascending: false })
      .limit(1)
    if (!data || data.length === 0) return `001-${year}`
    const last = data[0].numero_comprobante
    const num = parseInt(last.split('-')[0]) + 1
    return `${String(num).padStart(3, '0')}-${year}`
  }

  const createPeriodo = async ({ instructor, fechaInicio, fechaFin, observaciones, details }) => {
    const numero = await getNextComprobante()
    const total_horas = +details.reduce((s, d) => s + d.horas_trabajadas, 0).toFixed(2)
    const total_pagar = +details.reduce((s, d) => s + d.monto, 0).toFixed(2)

    const { data: period, error: pErr } = await supabase
      .from('payment_periods')
      .insert({
        instructor_id: instructor.id,
        fecha_inicio: fechaInicio,
        fecha_fin: fechaFin,
        observaciones: observaciones || null,
        numero_comprobante: numero,
        tarifa_hora_snapshot: instructor.tarifa_hora || 0,
        total_horas,
        total_pagar,
      })
      .select()
      .single()

    if (pErr) throw pErr

    const detailRows = details.map(d => ({
      periodo_id: period.id,
      schedule_id: d.schedule_id,
      dia_semana: d.dia_semana,
      horario: d.horario,
      group_name: d.group_name,
      horas_clase: d.horas_clase,
      clases_programadas: d.clases_programadas,
      canceladas: d.canceladas,
      recuperaciones: d.recuperaciones,
      clases_efectivas: d.clases_efectivas,
      horas_trabajadas: d.horas_trabajadas,
      monto: d.monto,
    }))

    const { error: dErr } = await supabase.from('payment_details').insert(detailRows)
    if (dErr) throw dErr

    return { ...period, payment_details: detailRows }
  }

  const deletePeriodo = async (id) => {
    const { error } = await supabase.from('payment_periods').delete().eq('id', id)
    if (error) throw error
    setPeriodos(prev => prev.filter(p => p.id !== id))
  }

  return {
    periodos,
    loading,
    fetchPeriodosByInstructor,
    createPeriodo,
    deletePeriodo,
  }
}
