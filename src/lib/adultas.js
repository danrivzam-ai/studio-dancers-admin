import { supabase } from './supabase'

// ── Auth del portal cliente ─────────────────────────────────────
// Key usada en sessionStorage para guardar credenciales del portal
const PORTAL_AUTH_KEY = 'mi_studio_auth'

export function getPortalAuth() {
  try {
    const raw = sessionStorage.getItem(PORTAL_AUTH_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function savePortalAuth(data) {
  sessionStorage.setItem(PORTAL_AUTH_KEY, JSON.stringify(data))
}

export function clearPortalAuth() {
  sessionStorage.removeItem(PORTAL_AUTH_KEY)
}

// ── Login del cliente (cédula + últimos 4 del teléfono) ──────────
export async function clientLogin(cedula, phoneLast4) {
  const { data, error } = await supabase.rpc('rpc_client_login', {
    p_cedula: cedula.trim(),
    p_phone_last4: phoneLast4.trim()
  })
  return { data: data || [], error }
}

// ── Dashboard: ciclo actual + asistencias (Bloque 1) ─────────────
export async function getAdultasCicloActual(cedula, phoneLast4, studentId) {
  const { data, error } = await supabase.rpc('rpc_client_adultas_ciclo', {
    p_cedula: cedula,
    p_phone_last4: phoneLast4,
    p_student_id: studentId
  })
  return { data, error }
}

// ── Dashboard: bitácora (Bloque 4) ───────────────────────────────
export async function getAdultasBitacora(cedula, phoneLast4, studentId) {
  const { data, error } = await supabase.rpc('rpc_client_adultas_bitacora', {
    p_cedula: cedula,
    p_phone_last4: phoneLast4,
    p_student_id: studentId
  })
  return { data, error }
}

// ── Dashboard: mapa de progresión (Bloque 3) ─────────────────────
export async function getAdultasProgresion(cedula, phoneLast4, studentId) {
  const { data, error } = await supabase.rpc('rpc_client_adultas_progresion', {
    p_cedula: cedula,
    p_phone_last4: phoneLast4,
    p_student_id: studentId
  })
  return { data, error }
}

// ── Dashboard: constancia y racha (Bloque 2) ─────────────────────
export async function getAdultasConstancia(cedula, phoneLast4, studentId) {
  const { data, error } = await supabase.rpc('rpc_client_adultas_constancia', {
    p_cedula: cedula,
    p_phone_last4: phoneLast4,
    p_student_id: studentId
  })
  return { data, error }
}

// ── Dashboard: tips (Bloque 5) ───────────────────────────────────
export async function getAdultasTips(cedula, phoneLast4, studentId) {
  const { data, error } = await supabase.rpc('rpc_client_adultas_tips', {
    p_cedula: cedula,
    p_phone_last4: phoneLast4,
    p_student_id: studentId
  })
  return { data, error }
}

// ── Helpers para calcular fechas de clase ────────────────────────

/**
 * Dado un ciclo (fecha_inicio, total_clases) y los días de clase del curso,
 * genera el array de fechas de clase esperadas (strings 'YYYY-MM-DD')
 */
export function getExpectedClassDates(fechaInicio, totalClases, classDays) {
  if (!fechaInicio || !totalClases || !classDays || classDays.length === 0) return []

  const days = Array.isArray(classDays)
    ? classDays.map(d => typeof d === 'string' ? parseInt(d, 10) : d)
    : []

  if (days.length === 0) return []

  const dates = []
  // Parse start date as noon local to avoid timezone shift
  const start = new Date(fechaInicio + 'T12:00:00')
  let current = new Date(start)
  let safety = 0

  while (dates.length < totalClases && safety < 200) {
    const dow = current.getDay()
    if (days.includes(dow)) {
      const y = current.getFullYear()
      const m = String(current.getMonth() + 1).padStart(2, '0')
      const d = String(current.getDate()).padStart(2, '0')
      dates.push(`${y}-${m}-${d}`)
    }
    current.setDate(current.getDate() + 1)
    safety++
  }

  return dates
}

/**
 * Formatea fecha 'YYYY-MM-DD' como 'Mar 4', 'Jue 6', etc.
 * para mostrar debajo de los círculos de asistencia
 */
export function formatClassDateShort(dateStr) {
  if (!dateStr) return ''
  const [, m, d] = dateStr.split('-')
  const month = parseInt(m, 10)
  const day = parseInt(d, 10)
  // Obtener día de la semana
  const date = new Date(dateStr + 'T12:00:00')
  const dow = date.getDay()
  const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
  return `${dayNames[dow]} ${day}`
}

/**
 * Retorna el estado de una fecha de clase dada las asistencias registradas
 * y la fecha actual
 */
export function getClassDateStatus(dateStr, asistencias, today) {
  const att = asistencias?.find(a => a.fecha_clase === dateStr)
  if (att) return att.estado // 'presente' | 'ausente' | 'tardia'
  // No hay registro: ¿futuro o pasado?
  if (dateStr > today) return 'futura'
  return 'ausente' // Pasada y sin registro = ausente
}

/**
 * Obtiene la fecha de hoy en Ecuador (UTC-5) como string 'YYYY-MM-DD'
 */
export function getTodayEC() {
  const now = new Date()
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
  const ec = new Date(utcMs - 5 * 3600000)
  const y = ec.getFullYear()
  const m = String(ec.getMonth() + 1).padStart(2, '0')
  const d = String(ec.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Formatea fecha larga para la bitácora
 * 'YYYY-MM-DD' → 'martes 4 de marzo, 2025'
 */
export function formatDateLong(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('es-EC', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
}

/**
 * Formatea fecha como 'mar 4'
 */
export function formatDateMed(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' })
}

/**
 * Formatea fecha de primera asistencia como 'enero 2025'
 */
export function formatFirstDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr + 'T12:00:00')
  return date.toLocaleDateString('es-EC', { month: 'long', year: 'numeric' })
}
