import { supabase } from './supabase'

// IDs de cursos de adultas — excluir del gestor de clases niñas
const ADULTAS_COURSE_IDS = ['ballet-adultos-semana', 'ballet-adultos-sabados']

// ── Cursos (solo niñas — excluye Ballet Adultos) ──────────────────
export async function getCursos() {
  const { data, error } = await supabase
    .from('courses')
    .select('id, code, name, class_days, classes_per_cycle, plantilla_progresion_id')
    .eq('active', true)
    .not('code', 'in', `(${ADULTAS_COURSE_IDS.join(',')})`)
    .order('name')
  return { data: data || [], error }
}

// ── Ciclos ────────────────────────────────────────────────────────
// Ciclo activo de TODOS los cursos — para vista resumen en admin
export async function getAllActiveCiclos() {
  const { data, error } = await supabase
    .from('cycles')
    .select('id, course_id, numero_ciclo, total_clases, fecha_inicio, fecha_fin, objetivo_ciclo, estado')
    .eq('estado', 'activo')
    .order('course_id')
  return { data: data || [], error }
}

// Usa la tabla 'cycles' (app Instructoras) para que la instructora
// vea el mismo ciclo que el admin activó.
export async function getCiclos(cursoCode) {
  const { data, error } = await supabase
    .from('cycles')
    .select('*')
    .eq('course_id', cursoCode)
    .order('numero_ciclo', { ascending: false })
  return { data: data || [], error }
}

export async function createCiclo({ cursoCode, numeroCiclo, totalClases, fechaInicio, fechaFin, objetivoCiclo }) {
  const { data, error } = await supabase
    .from('cycles')
    .insert({
      course_id:      cursoCode,
      numero_ciclo:   numeroCiclo,
      total_clases:   totalClases,
      fecha_inicio:   fechaInicio,
      fecha_fin:      fechaFin || null,
      objetivo_ciclo: objetivoCiclo || null,
      estado:         'activo'
    })
    .select()
    .single()
  return { data, error }
}

export async function updateCiclo(cicloId, { objetivoCiclo, totalClases }) {
  const updates = {}
  if (objetivoCiclo !== undefined) updates.objetivo_ciclo = objetivoCiclo || null
  if (totalClases   !== undefined) updates.total_clases   = totalClases
  const { data, error } = await supabase
    .from('cycles')
    .update(updates)
    .eq('id', cicloId)
    .select()
    .single()
  return { data, error }
}

export async function closeCiclo(cicloId) {
  const today = new Date().toISOString().split('T')[0]
  const { data, error } = await supabase
    .from('cycles')
    .update({ estado: 'cerrado', fecha_fin: today })
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
// Usa la tabla 'attendance' (app Instructoras).
// No tiene cycle_id → filtramos por course_id + class_date >= fecha_inicio del ciclo.
export async function getAsistencias(courseId, fechaInicio) {
  const { data, error } = await supabase
    .from('attendance')
    .select('*')
    .eq('course_id', courseId)
    .gte('class_date', fechaInicio)
  return { data: data || [], error }
}

export async function upsertAsistencia(courseId, studentId, fechaClase, status) {
  const { error } = await supabase
    .from('attendance')
    .upsert(
      { course_id: courseId, student_id: studentId, class_date: fechaClase, status },
      { onConflict: 'student_id,course_id,class_date' }
    )
  return { error }
}

// ── Bitácora ──────────────────────────────────────────────────────
// Usa la tabla 'class_log' (app Instructoras).
// No tiene cycle_id → filtramos por course_id + class_date >= fecha_inicio.
export async function getBitacora(courseId, fechaInicio) {
  const { data, error } = await supabase
    .from('class_log')
    .select('*')
    .eq('course_id', courseId)
    .gte('class_date', fechaInicio)
    .order('class_date', { ascending: false })
  return { data: data || [], error }
}

export async function createBitacoraEntry({ courseId, fechaClase, titulo, contenido }) {
  const { data, error } = await supabase
    .from('class_log')
    .insert({
      course_id:  courseId,
      class_date: fechaClase,
      title:      titulo || null,
      body:       contenido
    })
    .select()
    .single()
  return { data, error }
}

export async function deleteBitacoraEntry(id) {
  const { error } = await supabase.from('class_log').delete().eq('id', id)
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
        estado:    estadosMap[item.id]?.estado || 'pendiente',
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
