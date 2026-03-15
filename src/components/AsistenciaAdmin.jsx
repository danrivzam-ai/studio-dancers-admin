import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, Users, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'

// ── Fecha en zona horaria LOCAL ──────────────────────────────────────────────
function toLocalDate(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function formatDateLabel(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date  = new Date(y, m - 1, d)
  const today    = toLocalDate(new Date())
  const yesterday = toLocalDate(new Date(Date.now() - 86400000))
  const tomorrow  = toLocalDate(new Date(Date.now() + 86400000))
  if (dateStr === today)     return 'Hoy'
  if (dateStr === yesterday) return 'Ayer'
  if (dateStr === tomorrow)  return 'Mañana'
  return date.toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' })
}

const STATUS_CONFIG = {
  presente: { label: 'Presente', color: '#2A9D8F', bg: '#E6F7F5', Icon: CheckCircle },
  tardanza: { label: 'Tardanza', color: '#E9C46A', bg: '#FDF8E7', Icon: Clock       },
  ausente:  { label: 'Ausente',  color: '#E76F51', bg: '#FDEEE9', Icon: XCircle     },
}

export default function AsistenciaAdmin({ allCourses = [], students = [] }) {
  const today = toLocalDate(new Date())

  const [dateStr,  setDateStr]  = useState(today)
  const [courseId, setCourseId] = useState('')
  const [records,  setRecords]  = useState({})   // { studentId: status }
  const [loading,  setLoading]  = useState(false)

  // Auto-seleccionar primer curso cuando cargan
  useEffect(() => {
    if (!courseId && allCourses.length > 0) setCourseId(allCourses[0].id)
  }, [allCourses])

  // Cargar asistencia al cambiar curso o fecha
  useEffect(() => {
    if (!courseId) return
    let cancelled = false
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('course_id', courseId)
        .eq('class_date', dateStr)
      if (!cancelled) {
        const map = {}
        if (data) data.forEach(r => { map[r.student_id] = r.status })
        setRecords(map)
        setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [courseId, dateStr])

  function changeDate(delta) {
    const [y, m, d] = dateStr.split('-').map(Number)
    const next = new Date(y, m - 1, d + delta)
    setDateStr(toLocalDate(next))
    // Sin límite — el admin puede navegar a fechas futuras para recuperar
    // registros guardados con fecha UTC (diferencia de zona horaria Ecuador UTC-5)
  }

  const courseStudents = students.filter(s => s.course_id === courseId)
  const activeStudents = courseStudents.filter(s => !s.is_paused)
  const pausedStudents = courseStudents.filter(s => s.is_paused)

  const presentes = activeStudents.filter(s => records[s.id] === 'presente').length
  const tardanzas = activeStudents.filter(s => records[s.id] === 'tardanza').length
  const ausentes  = activeStudents.filter(s => records[s.id] === 'ausente').length
  const sinMarcar = activeStudents.length - presentes - tardanzas - ausentes

  const isFuture = dateStr > today

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-24 space-y-4">
        <h1 className="text-xl font-bold text-gray-800">Asistencia</h1>
        <p className="text-sm text-gray-500 -mt-2">Vista de solo lectura — la instructora registra la asistencia desde su portal.</p>

        {/* Selector de curso */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Curso</label>
          <select
            value={courseId}
            onChange={e => { setCourseId(e.target.value); setRecords({}) }}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-4 focus:ring-purple-100"
          >
            <option value="">— Selecciona un curso —</option>
            {allCourses.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        {courseId ? (
          <>
            {/* Selector de fecha (sin límite futuro) */}
            <div className="flex items-center justify-between bg-white rounded-2xl shadow-sm border border-gray-100 px-4 py-3">
              <button
                onClick={() => changeDate(-1)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <div className="text-center">
                <p className="text-sm font-bold text-gray-800 capitalize">{formatDateLabel(dateStr)}</p>
                <p className="text-xs text-gray-400">{dateStr}</p>
              </div>
              <button
                onClick={() => changeDate(1)}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>

            {/* Banner de fecha futura (ayuda a encontrar registros con bug UTC) */}
            {isFuture && (
              <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5 text-xs text-amber-700">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <span>
                  Fecha futura. Si la instructora tomó asistencia después de las 7 PM y los registros
                  no aparecen en "Hoy", podrían estar aquí (diferencia UTC−5 Ecuador).
                </span>
              </div>
            )}

            {/* Resumen */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: 'Presentes', value: presentes + tardanzas, color: '#2A9D8F', bg: '#E6F7F5' },
                { label: 'Tardanzas', value: tardanzas,             color: '#E9C46A', bg: '#FDF8E7' },
                { label: 'Ausentes',  value: ausentes,              color: '#E76F51', bg: '#FDEEE9' },
                { label: 'Sin marcar',value: sinMarcar,             color: '#9CA3AF', bg: '#F3F4F6' },
              ].map(s => (
                <div key={s.label} className="rounded-xl p-3 text-center" style={{ background: s.bg }}>
                  <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                  <p className="text-[10px] font-medium text-gray-500 mt-0.5 leading-tight">{s.label}</p>
                </div>
              ))}
            </div>

            {/* Lista de alumnas */}
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-600 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  {activeStudents.length === 0 ? (
                    <div className="flex items-center gap-2 px-4 py-4 text-gray-400">
                      <Users size={16} />
                      <span className="text-sm">No hay alumnas activas en este curso.</span>
                    </div>
                  ) : activeStudents.map((student, i) => {
                    const status = records[student.id]
                    const cfg = STATUS_CONFIG[status]
                    const Icon = cfg?.Icon
                    return (
                      <div
                        key={student.id}
                        className="flex items-center justify-between px-4 py-3"
                        style={{
                          background: i % 2 === 0 ? '#fff' : '#F9F9F9',
                          borderTop: i > 0 ? '1px solid #f3f4f6' : 'none',
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                            style={{ background: 'linear-gradient(135deg, #7B2D8E, #4c1d95)' }}
                          >
                            {student.name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                          </div>
                          <p className="text-sm font-medium text-gray-800">{student.name}</p>
                        </div>

                        {cfg ? (
                          <span
                            className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full shrink-0"
                            style={{ background: cfg.bg, color: cfg.color }}
                          >
                            {Icon && <Icon size={12} />}
                            {cfg.label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full shrink-0">
                            Sin marcar
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Alumnas en pausa */}
                {pausedStudents.length > 0 && (
                  <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden opacity-50">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider px-4 py-2 border-b border-gray-100">
                      En pausa ({pausedStudents.length})
                    </p>
                    {pausedStudents.map((student, i) => (
                      <div
                        key={student.id}
                        className="flex items-center gap-3 px-4 py-3"
                        style={{ borderTop: i > 0 ? '1px solid #f3f4f6' : 'none' }}
                      >
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-gray-400 shrink-0">
                          {student.name?.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()}
                        </div>
                        <p className="text-sm text-gray-500">{student.name}</p>
                        <span className="ml-auto text-[10px] bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full font-medium">En pausa</span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Users size={40} className="text-gray-200 mb-3" />
            <p className="text-sm text-gray-400">Selecciona un curso para ver la asistencia</p>
          </div>
        )}
      </div>
    </div>
  )
}
