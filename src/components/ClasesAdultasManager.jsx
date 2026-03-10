import { useState, useEffect, useCallback } from 'react'
import { Calendar, Plus, Pencil, Check, X } from 'lucide-react'
import {
  getCursos, getCiclos, createCiclo, closeCiclo, updateCiclo, getAsistencias
} from '../lib/adultas-admin'
import { getTodayEC } from '../lib/adultas'
import { useToast } from './Toast'

const PURPLE = '#7B2D8E'

// Normaliza class_days de Supabase (puede venir como [{1},{6}] o [1,6] o "{1,6}" etc.)
function normalizeClassDays(raw) {
  if (!raw) return []
  if (Array.isArray(raw)) return raw.map(d => typeof d === 'string' ? parseInt(d, 10) : d).filter(d => !isNaN(d))
  if (typeof raw === 'string') {
    const clean = raw.replace(/[{}[\]]/g, '')
    return clean.split(',').map(s => parseInt(s.trim(), 10)).filter(d => !isNaN(d))
  }
  return []
}

function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Sección de ciclo ──────────────────────────────────────────────
function CicloSection({ course, ciclos, onCicloCreated, onCicloClosed, onCicloUpdated }) {
  const activeCiclo = ciclos.find(c => c.estado === 'activo')
  const closedCiclos = ciclos.filter(c => c.estado !== 'activo')
  const toast = useToast()
  const [showForm, setShowForm]       = useState(false)
  const [saving, setSaving]           = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [editObjetivo, setEditObjetivo] = useState(false)
  const [objetivoEdit, setObjetivoEdit] = useState('')
  const [clasesCount, setClasesCount]   = useState(null)

  const classDays  = normalizeClassDays(course.class_days)
  const defaultClases = classDays.includes(6) && !classDays.includes(2) && !classDays.includes(4) ? 4 : 8
  const nextNum = ciclos.length > 0 ? Math.max(...ciclos.map(c => c.numero_ciclo)) + 1 : 1

  const [form, setForm] = useState({
    fechaInicio: getTodayEC(),
    totalClases: defaultClases,
    objetivoCiclo: ''
  })

  // Contar clases impartidas en el ciclo activo
  useEffect(() => {
    if (!activeCiclo) { setClasesCount(null); return }
    getAsistencias(course.code, activeCiclo.fecha_inicio).then(({ data }) => {
      if (!data) return
      const fechasUnicas = new Set(data.map(a => a.class_date))
      setClasesCount(fechasUnicas.size)
    })
  }, [activeCiclo, course.code])

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await createCiclo({
      cursoCode: course.code,
      numeroCiclo: nextNum,
      totalClases: parseInt(form.totalClases, 10),
      fechaInicio: form.fechaInicio,
      objetivoCiclo: form.objetivoCiclo
    })
    setSaving(false)
    if (!error) { setShowForm(false); onCicloCreated() }
    else toast.error('Error al crear ciclo: ' + error.message)
  }

  const handleClose = async () => {
    setSaving(true)
    const { error } = await closeCiclo(activeCiclo.id)
    setSaving(false)
    setConfirmClose(false)
    if (!error) onCicloClosed()
    else toast.error('Error al cerrar ciclo: ' + error.message)
  }

  const handleSaveObjetivo = async () => {
    setSaving(true)
    const { error } = await updateCiclo(activeCiclo.id, { objetivoCiclo: objetivoEdit })
    setSaving(false)
    if (!error) { setEditObjetivo(false); onCicloUpdated() }
    else toast.error('Error al guardar: ' + error.message)
  }

  const pct = (activeCiclo && clasesCount !== null && activeCiclo.total_clases > 0)
    ? Math.min(100, Math.round((clasesCount / activeCiclo.total_clases) * 100))
    : null

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
      <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Calendar size={16} style={{ color: PURPLE }} /> Ciclo actual
      </h3>

      {activeCiclo ? (
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="flex-1 bg-purple-50 rounded-xl p-3 space-y-2">
            {/* Encabezado */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{ background: PURPLE }}>
                Ciclo {activeCiclo.numero_ciclo}
              </span>
              <span className="text-xs text-green-600 font-medium">● Activo</span>
              {clasesCount !== null && (
                <span className="text-xs text-purple-700 font-medium ml-auto">
                  {clasesCount} / {activeCiclo.total_clases} clases impartidas
                </span>
              )}
            </div>

            {/* Barra de progreso */}
            {pct !== null && (
              <div className="w-full bg-purple-200 rounded-full h-1.5">
                <div className="h-1.5 rounded-full transition-all" style={{ width: `${pct}%`, background: PURPLE }} />
              </div>
            )}

            {/* Fechas */}
            <p className="text-sm text-gray-600">
              Inicio: <strong>{formatDateShort(activeCiclo.fecha_inicio)}</strong>
              {activeCiclo.fecha_fin && <> · Fin: <strong>{formatDateShort(activeCiclo.fecha_fin)}</strong></>}
              · {activeCiclo.total_clases} clases totales
            </p>

            {/* Objetivo editable */}
            {editObjetivo ? (
              <div className="flex gap-1 items-center">
                <input autoFocus value={objetivoEdit} onChange={e => setObjetivoEdit(e.target.value)}
                  placeholder="Objetivo del ciclo"
                  className="flex-1 border border-purple-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-purple-400" />
                <button onClick={handleSaveObjetivo} disabled={saving}
                  className="p-1.5 rounded-lg bg-green-500 text-white hover:bg-green-600 disabled:opacity-50 transition-colors">
                  <Check size={14} />
                </button>
                <button onClick={() => setEditObjetivo(false)}
                  className="p-1.5 rounded-lg bg-gray-200 text-gray-600 hover:bg-gray-300 transition-colors">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                {activeCiclo.objetivo_ciclo
                  ? <p className="text-sm text-gray-500 italic flex-1">"{activeCiclo.objetivo_ciclo}"</p>
                  : <p className="text-sm text-gray-400 italic flex-1">Sin objetivo definido</p>
                }
                <button onClick={() => { setObjetivoEdit(activeCiclo.objetivo_ciclo || ''); setEditObjetivo(true) }}
                  className="p-1 rounded-lg text-purple-400 hover:text-purple-700 hover:bg-purple-100 transition-colors shrink-0"
                  title="Editar objetivo">
                  <Pencil size={13} />
                </button>
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="flex flex-col gap-2 shrink-0">
            {confirmClose ? (
              <div className="flex gap-2 items-center">
                <span className="text-sm text-gray-600">¿Cerrar ciclo {activeCiclo.numero_ciclo}?</span>
                <button onClick={handleClose} disabled={saving}
                  className="px-3 py-1.5 rounded-xl text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 active:scale-95 transition-all">
                  {saving ? '...' : 'Confirmar'}
                </button>
                <button onClick={() => setConfirmClose(false)}
                  className="px-3 py-1.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all">
                  Cancelar
                </button>
              </div>
            ) : (
              <button onClick={() => setConfirmClose(true)}
                className="px-3 py-1.5 rounded-xl text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 whitespace-nowrap active:scale-95 transition-all">
                Cerrar ciclo
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="text-sm text-gray-500 bg-gray-50 rounded-xl p-3 mb-3">
          Sin ciclo activo.{' '}
          {ciclos.length > 0 ? `${ciclos.length} ciclo(s) cerrado(s).` : 'Crea el primer ciclo para comenzar.'}
        </div>
      )}

      {!activeCiclo && !showForm && (
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-xl text-white mt-2 active:scale-95 transition-all"
          style={{ background: PURPLE }}>
          <Plus size={14} /> Nuevo ciclo
        </button>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="mt-3 border border-purple-100 rounded-xl p-3 bg-purple-50 space-y-3">
          <p className="text-sm font-medium" style={{ color: PURPLE }}>Ciclo {nextNum} — {course.name}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">Fecha de inicio *</label>
              <input type="date" required value={form.fechaInicio}
                onChange={e => setForm({ ...form, fechaInicio: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-2 py-1.5 text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none transition-all" />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Total clases *</label>
              <input type="number" required min={1} max={999} value={form.totalClases}
                onChange={e => setForm({ ...form, totalClases: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-2 py-1.5 text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none transition-all" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Objetivo del ciclo (opcional)</label>
            <input type="text" value={form.objetivoCiclo}
              onChange={e => setForm({ ...form, objetivoCiclo: e.target.value })}
              placeholder="ej. Perfeccionar port de bras"
              className="w-full border-2 border-gray-200 rounded-xl px-2 py-1.5 text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none transition-all" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="px-4 py-1.5 rounded-xl text-sm font-medium text-white disabled:opacity-50 active:scale-95 transition-all"
              style={{ background: PURPLE }}>
              {saving ? 'Creando...' : 'Crear ciclo'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-1.5 rounded-xl text-sm font-medium text-gray-600 bg-white border active:scale-95 transition-all">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {/* Historial de ciclos cerrados */}
      {closedCiclos.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            Historial — {closedCiclos.length} ciclo(s) cerrado(s)
          </p>
          <div className="space-y-1.5">
            {closedCiclos.map(c => (
              <div key={c.id} className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 rounded-xl px-3 py-2">
                <span className="font-medium text-gray-700">Ciclo {c.numero_ciclo}</span>
                <span className="text-gray-400">·</span>
                <span>{formatDateShort(c.fecha_inicio)}{c.fecha_fin ? ` – ${formatDateShort(c.fecha_fin)}` : ''} · {c.total_clases} clases</span>
                {c.objetivo_ciclo && (
                  <span className="text-gray-400 text-xs italic ml-auto truncate max-w-[160px]">"{c.objetivo_ciclo}"</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────
export default function ClasesAdultasManager() {
  const [courses, setCourses] = useState([])
  const [loadingCourses, setLoadingCourses] = useState(true)
  const [selectedCourseCode, setSelectedCourseCode] = useState('')
  const [ciclos, setCiclos] = useState([])

  useEffect(() => {
    getCursos().then(({ data }) => {
      setCourses(data || [])
      setLoadingCourses(false)
    })
  }, [])

  const selectedCourse = courses.find(c => c.code === selectedCourseCode) || null

  const fetchCiclos = useCallback(async (code) => {
    const { data } = await getCiclos(code)
    setCiclos(data || [])
  }, [])

  useEffect(() => {
    if (!selectedCourseCode) { setCiclos([]); return }
    fetchCiclos(selectedCourseCode)
  }, [selectedCourseCode, fetchCiclos])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <h2 className="text-xl font-bold text-gray-800">Gestión de Clases Niñas</h2>
        <p className="text-sm text-gray-500">Crea y administra los ciclos por curso</p>
      </div>

      {/* Course selector */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <label className="text-sm font-medium text-gray-600 block mb-2">Selecciona un curso</label>
        {loadingCourses ? (
          <div className="text-sm text-gray-400">Cargando cursos...</div>
        ) : (
          <select value={selectedCourseCode} onChange={e => setSelectedCourseCode(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400 outline-none transition-all">
            <option value="">— Elige un curso —</option>
            {courses.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {selectedCourse && (
        <CicloSection
          course={selectedCourse}
          ciclos={ciclos}
          onCicloCreated={() => fetchCiclos(selectedCourseCode)}
          onCicloClosed={() => fetchCiclos(selectedCourseCode)}
          onCicloUpdated={() => fetchCiclos(selectedCourseCode)}
        />
      )}
    </div>
  )
}
