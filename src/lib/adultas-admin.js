import { supabase } from './supabase'
import { COURSES } from './courses'

// Códigos de cursos adultas (fuente de verdad: courses.js)
const ADULTAS_CODES = new Set(COURSES.map(c => c.code))

// ── Cursos ────────────────────────────────────────────────────────
export async function getCursos() {
  const { data, error } = await supabase
    .from('courses')
    .select('id, code, name, class_days, classes_per_cycle, plantilla_progresion_id')
    .eq('active', true)
    .order('name')
  // Solo cursos de adultas — excluye niñas, Dance Camp y otros
  const filtered = (data || []).filter(c => ADULTAS_CODES.has(c.code))
  return { data: filtered, error }
}

// ── Ciclos ────────────────────────────────────────────────────────
export async function getCiclos(cursoCode) {
  const { data, error } = await supabase
    .from('ciclos')
    .select('*')
    .eq('curso_id', cursoCode)
    .order('numero_ciclo', { ascending: false })
  return { data: data || [], error }
}

export async function createCiclo({ cursoCode, numeroCiclo, totalClases, fechaInicio, fechaFin, objetivoCiclo }) {
  const { data, error } = await supabase
    .from('ciclos')
    .insert({
      curso_id: cursoCode,
      numero_ciclo: numeroCiclo,
      total_clases: totalClases,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin || null,
      objetivo_ciclo: objetivoCiclo || null,
      estado: 'activo'
    })
    .select()
    .single()
  return { data, error }
}

export async function closeCiclo(cicloId) {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('ciclos')
    .update({ estado: 'cerrado', fecha_fin_estimada: today })
    .eq('id', cicloId)
    .select()
    .single()
  return { data, error }
}

// ── Alumnos del curso ─────────────────────────────────────────────
export async function getStudentsForCourse(cursoCode) {
  const { data, error } = await supabase
    .from('students')
    .select('id, name, cedula')
    .eq('course_id', cursoCode)
    .eq('active', true)
    .order('name')
  return { data: data || [], error }
}

// ── Asistencias ───────────────────────────────────────────────────
export async function getAsistencias(cicloId) {
  const { data, error } = await supabase
    .from('asistencias')
    .select('*')
    .eq('ciclo_id', cicloId)
  return { data: data || [], error }
}

export async function upsertAsistencia(cicloId, alumnaId, fechaClase, estado) {
  const { error } = await supabase
    .from('asistencias')
    .upsert(
      { ciclo_id: cicloId, alumna_id: alumnaId, fecha_clase: fechaClase, estado },
      { onConflict: 'ciclo_id,alumna_id,fecha_clase' }
    )
  return { error }
}

// ── Bitácora ──────────────────────────────────────────────────────
export async function getBitacora(cicloId) {
  const { data, error } = await supabase
    .from('bitacora_clases')
    .select('*')
    .eq('ciclo_id', cicloId)
    .order('fecha_clase', { ascending: false })
  return { data: data || [], error }
}

export async function createBitacoraEntry({ cicloId, cursoCode, fechaClase, titulo, contenido }) {
  const { data, error } = await supabase
    .from('bitacora_clases')
    .insert({
      ciclo_id: cicloId,
      curso_id: cursoCode,
      fecha_clase: fechaClase,
      titulo: titulo || null,
      contenido
    })
    .select()
    .single()
  return { data, error }
}

export async function deleteBitacoraEntry(id) {
  const { error } = await supabase.from('bitacora_clases').delete().eq('id', id)
  return { error }
}

// ── Progresión ────────────────────────────────────────────────────
export async function getProgresionAdmin(cursoCode, plantillaId) {
  if (!plantillaId) return { data: null, error: null }

  const [bloquesRes, estadosRes] = await Promise.all([
    supabase
      .from('progresion_bloques')
      .select('id, nombre, descripcion, orden, progresion_items(id, nombre, descripcion, orden)')
      .eq('plantilla_id', plantillaId)
      .order('orden'),
    supabase
      .from('progresion_estado')
      .select('*')
      .eq('curso_id', cursoCode)
  ])

  if (bloquesRes.error) return { data: null, error: bloquesRes.error }

  const estadosMap = {}
  for (const e of (estadosRes.data || [])) {
    estadosMap[e.item_id] = e
  }

  const bloques = (bloquesRes.data || []).map(b => ({
    ...b,
    items: (b.progresion_items || [])
      .sort((a, c) => a.orden - c.orden)
      .map(item => ({
        ...item,
        estado: estadosMap[item.id]?.estado || 'pendiente',
        estado_id: estadosMap[item.id]?.id || null
      }))
  }))

  return { data: bloques, error: null }
}

export async function updateProgresionEstado(cursoCode, itemId, estado, cicloId = null) {
  const { error } = await supabase
    .from('progresion_estado')
    .upsert(
      { curso_id: cursoCode, item_id: itemId, estado, ciclo_id: cicloId, updated_at: new Date().toISOString() },
      { onConflict: 'curso_id,item_id' }
    )
  return { error }
}

// ── Tips ──────────────────────────────────────────────────────────
export async function getTips(cursoCode) {
  const { data, error } = await supabase
    .from('tips_curso')
    .select('*')
    .eq('curso_id', cursoCode)
    .order('created_at', { ascending: false })
  return { data: data || [], error }
}

export async function createTip({ cursoCode, titulo, contenido }) {
  const { data, error } = await supabase
    .from('tips_curso')
    .insert({ curso_id: cursoCode, titulo, contenido, publicado: true })
    .select()
    .single()
  return { data, error }
}

export async function deleteTip(id) {
  const { error } = await supabase.from('tips_curso').delete().eq('id', id)
  return { error }
}
