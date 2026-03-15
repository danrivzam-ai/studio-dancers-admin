import { useState, useEffect, useCallback } from 'react'
import { Calendar, Plus, Pencil, Check, X } from 'lucide-react'
import {
  getCursos, getCiclos, createCiclo, closeCiclo, updateCiclo, getAllActiveCiclos
} from '../lib/adultas-admin'
import { getTodayEC } from '../lib/adultas'
import { useToast } from './Toast'

const PURPLE = '#7B2D8E'

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

// ── Vista resumen: tarjetas de todos los cursos ────────────────────
function CursoOverview({ courses, activeCicloMap, selectedCode, onSelect }) {
  if (!courses.length) return null
  return (
    <div className="mb-5">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2.5 px-1">
        Estado de ciclos — todos los cursos
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {courses.map(c => {
          const ciclo = activeCicloMap[c.code]
          const isSelected = selectedCode === c.code
          return (
            <button
              key={c.code}
              onClick={() => onSelect(c.code)}
              className={`text-left rounded-2xl p-4 border transition-all active:scale-[0.97] ${
                isSelected
                  ? 'border-purple-300 bg-purple-50 shadow-sm ring-2 ring-purple-200'
                  : ciclo
                  ? 'border-gray-200 bg-white hover:border-purple-200 hover:shadow-sm'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <p className="text-sm font-semibold text-gray-800 leading-snug mb-2 line-clamp-2">{c.name}</p>
              {ciclo ? (
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-white px-3 py-1 rounded-full tracking-wide" style={{ background: PURPLE }}>
                      Ciclo {ciclo.numero_ciclo}
                    </span>
                    <span className="inline-flex items-center gap-1 text-[11px] text-green-600 font-medium">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                      Activo
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    {ciclo.total_clases} clases · desde {formatDateShort(ciclo.fecha_inicio)}
                  </p>
                </div>
              ) : (
                <span className="text-xs text-gray-400">Sin ciclo activo</span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Sección de detalle de un ciclo ────────────────────────────────
function CicloSection({ course, ciclos, onCicloCreated, onCicloClosed, onCicloUpdated }) {
  const activeCiclo = ciclos.find(c => c.estado === 'activo')
  const closedCiclos = ciclos.filter(c => c.estado !== 'activo')
  const toast = useToast()
  const [showForm, setShowForm]         = useState(false)
  const [saving, setSaving]             = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const [editObjetivo, setEditObjetivo] = useState(false)
  const [objetivoEdit, setObjetivoEdit] = useState('')

  const classDays     = normalizeClassDays(course.class_days)
  const defaultClases = classDays.includes(6) && !classDays.includes(2) && !classDays.includes(4) ? 4 : 8
  const nextNum       = ciclos.length > 0 ? Math.max(...ciclos.map(c => c.numero_ciclo)) + 1 : 1

  const [form, setForm] = useState({
    fechaInicio:   getTodayEC(),
    fechaFin:      '',
    totalClases:   defaultClases,
    objetivoCiclo: ''
  })

  const handleCreate = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await createCiclo({
      cursoCode:     course.code,
      numeroCiclo:   nextNum,
      totalClases:   parseInt(form.totalClases, 10),
      fechaInicio:   form.fechaInicio,
      fechaFin:      form.fechaFin || null,
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

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
      <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Calendar size={16} style={{ color: PURPLE }} />
        {course.name} — Ciclo actual
      </h3>

      {activeCiclo ? (
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="flex-1 bg-purple-50 rounded-xl p-3 space-y-2">

            {/* Encabezado */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-white px-3 py-1 rounded-full tracking-wide" style={{ background: PURPLE }}>
                Ciclo {activeCiclo.numero_ciclo}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] text-green-600 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Activo
              </span>
              <span className="text-xs text-purple-600 font-medium ml-auto">
                {activeCiclo.total_clases} clases
              </span>
            </div>

            {/* Fechas */}
            <p className="text-sm text-gray-600">
              Inicio: <strong>{formatDateShort(activeCiclo.fecha_inicio)}</strong>
              {activeCiclo.fecha_fin && (
                <> · Fin est.: <strong>{formatDateShort(activeCiclo.fecha_fin)}</strong></>
              )}
            </p>

            {/* Objetivo editable */}
            {editObjetivo ? (
              <div className="flex gap-1 items-center">
                <input autoFocus value={objetivoEdit} onChange={e => setObjetivoEdit(e.target.value)}
                  placeholder="Objetivo del ciclo"
                  className="flex-1 border border-purple-300 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-4 focus:ring-purple-100" />
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
              <div className="flex gap-2 items-center flex-wrap">
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">Fecha de inicio *</label>
              <input type="date" required value={form.fechaInicio}
                onChange={e => setForm({ ...form, fechaInicio: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-2 py-1.5 text-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all" />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Fecha fin est.</label>
              <input type="date" value={form.fechaFin}
                onChange={e => setForm({ ...form, fechaFin: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-2 py-1.5 text-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all" />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Total clases *</label>
              <input type="number" required min={1} max={999} value={form.totalClases}
                onChange={e => setForm({ ...form, totalClases: e.target.value })}
                className="w-full border-2 border-gray-200 rounded-xl px-2 py-1.5 text-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Objetivo del ciclo (opcional)</label>
            <input type="text" value={form.objetivoCiclo}
              onChange={e => setForm({ ...form, objetivoCiclo: e.target.value })}
              placeholder="ej. Perfeccionar port de bras"
              className="w-full border-2 border-gray-200 rounded-xl px-2 py-1.5 text-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all" />
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

      {/* Historial */}
      {closedCiclos.length > 0 && (
        <div className="mt-4 border-t pt-3">
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-2">
            Historial — {closedCiclos.length} ciclo(s) cerrado(s)
          </p>
          <div className="space-y-2">
            {closedCiclos.map(c => (
              <div key={c.id} className="flex items-center gap-2.5 text-sm text-gray-500 bg-gray-50 rounded-xl px-3 py-2.5">
                <span className="text-[11px] font-bold text-gray-500 bg-gray-200 px-2.5 py-0.5 rounded-full shrink-0">
                  Ciclo {c.numero_ciclo}
                </span>
                <span className="text-xs">
                  {formatDateShort(c.fecha_inicio)}
                  {c.fecha_fin ? ` – ${formatDateShort(c.fecha_fin)}` : ''}
                  {' '}· {c.total_clases} clases
                </span>
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

// ── Componente principal ───────────────────────────────────────────
export default function ClasesAdultasManager() {
  const [courses, setCourses]               = useState([])
  const [activeCicloMap, setActiveCicloMap] = useState({})
  const [loading, setLoading]               = useState(true)
  const [selectedCourseCode, setSelectedCourseCode] = useState('')
  const [ciclos, setCiclos]                 = useState([])

  const loadAll = useCallback(async () => {
    const [cursosRes, ciclosRes] = await Promise.all([getCursos(), getAllActiveCiclos()])
    setCourses(cursosRes.data || [])
    const map = {}
    for (const c of (ciclosRes.data || [])) map[c.course_id] = c
    setActiveCicloMap(map)
    setLoading(false)
  }, [])

  useEffect(() => { loadAll() }, [loadAll])

  const selectedCourse = courses.find(c => c.code === selectedCourseCode) || null

  const fetchCiclos = useCallback(async (code) => {
    const { data } = await getCiclos(code)
    setCiclos(data || [])
    loadAll()
  }, [loadAll])

  useEffect(() => {
    if (!selectedCourseCode) { setCiclos([]); return }
    fetchCiclos(selectedCourseCode)
  }, [selectedCourseCode, fetchCiclos])

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-5">
        <h2 className="text-xl font-bold text-gray-800">Gestión de Ciclos</h2>
        <p className="text-sm text-gray-500">Ciclos académicos por curso — sin relación con pagos</p>
      </div>

      {/* Vista resumen de todos los cursos */}
      {!loading && (
        <CursoOverview
          courses={courses}
          activeCicloMap={activeCicloMap}
          selectedCode={selectedCourseCode}
          onSelect={setSelectedCourseCode}
        />
      )}

      {loading && (
        <div className="text-sm text-gray-400 py-4 text-center">Cargando cursos...</div>
      )}

      {/* Selector de respaldo (dropdown) */}
      {!loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 mb-4">
          <label className="text-sm font-medium text-gray-600 block mb-2">
            Selecciona un curso para gestionar su ciclo
          </label>
          <select value={selectedCourseCode} onChange={e => setSelectedCourseCode(e.target.value)}
            className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all">
            <option value="">— Elige un curso —</option>
            {courses.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Detalle del ciclo del curso seleccionado */}
      {selectedCourse && (
        <CicloSection
          key={selectedCourseCode}
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
