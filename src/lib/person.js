/**
 * Una alumna puede tener varias inscripciones (un registro de students por
 * curso). personKey identifica a la PERSONA detrás de cada inscripción:
 * - con cédula propia (adultas): la cédula
 * - sin cédula (niñas): nombre normalizado + representante (cédula o teléfono)
 */
const norm = (s) => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()

export const personKey = (s) => {
  if (!s) return ''
  const cedula = String(s.cedula || '').replace(/\D/g, '')
  if (cedula) return `c:${cedula}`
  const rep = String(s.parent_cedula || '').replace(/\D/g, '') || String(s.parent_phone || s.phone || '').replace(/\D/g, '')
  return `n:${norm(s.name)}|${rep}`
}

/** Cantidad de personas distintas en una lista de inscripciones. */
export const countPeople = (students) => new Set((students || []).map(personKey)).size

/** Otras inscripciones activas de la misma persona. */
export const otherEnrollments = (student, students) => {
  if (!student) return []
  const key = personKey(student)
  return (students || []).filter(s => s.id !== student.id && personKey(s) === key)
}
