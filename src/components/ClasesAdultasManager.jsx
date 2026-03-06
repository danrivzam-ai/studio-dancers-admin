import { useState, useEffect, useCallback } from 'react'
import { BookOpen, Calendar, CheckCircle, ChevronDown, ChevronRight, Clock, Lightbulb, Lock, Plus, Trash2, X } from 'lucide-react'
import {
  getCursos, getCiclos, createCiclo, closeCiclo,
  getStudentsForCourse, getAsistencias, upsertAsistencia,
  getBitacora, createBitacoraEntry, deleteBitacoraEntry,
  getProgresionAdmin, updateProgresionEstado,
  getTips, createTip, deleteTip
} from '../lib/adultas-admin'
import { getExpectedClassDates, formatClassDateShort, getTodayEC, formatDateLong } from '../lib/adultas'

const PURPLE = '#7B2D8E'
const GREEN = '#2A9D8F'
const GOLD = '#E9C46A'

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

// Formatos de fecha
function formatDateDisplay(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

function formatDateShort(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ── Subcomponente: sección de ciclo ───────────────────────────────
function CicloSection({ course, ciclos, onCicloCreated, onCicloClosed }) {
  const activeCiclo = ciclos.find(c => c.estado === 'activo')
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmClose, setConfirmClose] = useState(false)
  const classDays = normalizeClassDays(course.class_days)
  const defaultClases = classDays.includes(6) && !classDays.includes(2) && !classDays.includes(4) ? 4 : 8
  const nextNum = ciclos.length > 0 ? Math.max(...ciclos.map(c => c.numero_ciclo)) + 1 : 1

  const [form, setForm] = useState({
    fechaInicio: getTodayEC(),
    totalClases: defaultClases,
    objetivoCiclo: ''
  })

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
    if (!error) {
      setShowForm(false)
      onCicloCreated()
    } else {
      alert('Error al crear ciclo: ' + error.message)
    }
  }

  const handleClose = async () => {
    setSaving(true)
    const { error } = await closeCiclo(activeCiclo.id)
    setSaving(false)
    setConfirmClose(false)
    if (!error) onCicloClosed()
    else alert('Error al cerrar ciclo: ' + error.message)
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
      <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
        <Calendar size={16} style={{ color: PURPLE }} /> Ciclo
      </h3>

      {activeCiclo ? (
        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="flex-1 bg-purple-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-white px-2 py-0.5 rounded-full" style={{ background: PURPLE }}>
                Ciclo {activeCiclo.numero_ciclo}
              </span>
              <span className="text-xs text-green-600 font-medium">● Activo</span>
            </div>
            <p className="text-sm text-gray-600">
              Inicio: {formatDateShort(activeCiclo.fecha_inicio)} · {activeCiclo.total_clases} clases
            </p>
            {activeCiclo.objetivo_ciclo && (
              <p className="text-sm text-gray-500 mt-1 italic">"{activeCiclo.objetivo_ciclo}"</p>
            )}
          </div>
          {confirmClose ? (
            <div className="flex gap-2 items-center">
              <span className="text-sm text-gray-600">¿Cerrar ciclo {activeCiclo.numero_ciclo}?</span>
              <button onClick={handleClose} disabled={saving}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50">
                {saving ? '...' : 'Confirmar'}
              </button>
              <button onClick={() => setConfirmClose(false)}
                className="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200">
                Cancelar
              </button>
            </div>
          ) : (
            <button onClick={() => setConfirmClose(true)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 whitespace-nowrap">
              Cerrar ciclo
            </button>
          )}
        </div>
      ) : (
        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-3 mb-3">
          Sin ciclo activo. {ciclos.length > 0 ? `${ciclos.length} ciclo(s) cerrado(s).` : 'Crea el primer ciclo para comenzar.'}
        </div>
      )}

      {!activeCiclo && !showForm && (
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg text-white mt-2"
          style={{ background: PURPLE }}>
          <Plus size={14} /> Nuevo ciclo
        </button>
      )}

      {showForm && (
        <form onSubmit={handleCreate} className="mt-3 border border-purple-100 rounded-lg p-3 bg-purple-50 space-y-3">
          <p className="text-sm font-medium" style={{ color: PURPLE }}>Ciclo {nextNum} — {course.name}</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">Fecha de inicio *</label>
              <input type="date" required value={form.fechaInicio}
                onChange={e => setForm({ ...form, fechaInicio: e.target.value })}
                className="w-full border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400" />
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Total clases *</label>
              <input type="number" required min={1} max={20} value={form.totalClases}
                onChange={e => setForm({ ...form, totalClases: e.target.value })}
                className="w-full border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Objetivo del ciclo (opcional)</label>
            <input type="text" value={form.objetivoCiclo}
              onChange={e => setForm({ ...form, objetivoCiclo: e.target.value })}
              placeholder="ej. Perfeccionar port de bras"
              className="w-full border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="px-4 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ background: PURPLE }}>
              {saving ? 'Creando...' : 'Crear ciclo'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium text-gray-600 bg-white border">
              Cancelar
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

// ── Subcomponente: asistencia ─────────────────────────────────────
function AsistenciaTab({ ciclo, course }) {
  const classDays = normalizeClassDays(course.class_days)
  const classDates = ciclo ? getExpectedClassDates(ciclo.fecha_inicio, ciclo.total_clases, classDays) : []
  const today = getTodayEC()
  const pastDates = classDates.filter(d => d <= today)
  const [selectedDate, setSelectedDate] = useState(pastDates[pastDates.length - 1] || classDates[0] || today)
  const [students, setStudents] = useState([])
  const [asistencias, setAsistencias] = useState({}) // alumna_id → estado
  const [loadingStudents, setLoadingStudents] = useState(true)
  const [saving, setSaving] = useState({})

  useEffect(() => {
    getStudentsForCourse(course.code).then(({ data }) => {
      setStudents(data || [])
      setLoadingStudents(false)
    })
  }, [course.code])

  useEffect(() => {
    if (!ciclo) return
    getAsistencias(course.code, ciclo.fecha_inicio).then(({ data }) => {
      const map = {}
      for (const a of (data || [])) {
        const key = `${a.student_id}_${a.class_date}`
        map[key] = a.status
      }
      setAsistencias(map)
    })
  }, [ciclo, course.code])

  const getEstado = (alumnaId) => asistencias[`${alumnaId}_${selectedDate}`] || null

  const handleToggle = async (alumnaId, estado) => {
    const key = `${alumnaId}_${selectedDate}`
    // Optimistic update
    setAsistencias(prev => ({ ...prev, [key]: estado }))
    setSaving(prev => ({ ...prev, [alumnaId]: true }))
    const { error } = await upsertAsistencia(course.code, alumnaId, selectedDate, estado)
    setSaving(prev => ({ ...prev, [alumnaId]: false }))
    if (error) {
      setAsistencias(prev => ({ ...prev, [key]: null }))
      alert('Error al guardar: ' + error.message)
    }
  }

  if (!ciclo) return (
    <div className="text-center py-8 text-gray-400 text-sm">Sin ciclo activo. Crea un ciclo primero.</div>
  )

  return (
    <div>
      {/* Date selector */}
      <div className="flex items-center gap-3 mb-4">
        <label className="text-sm font-medium text-gray-600">Fecha de clase:</label>
        <select value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
          className="border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-300">
          {classDates.map(d => (
            <option key={d} value={d}>
              {formatClassDateShort(d)} ({d > today ? 'futura' : d === today ? 'hoy' : 'pasada'})
            </option>
          ))}
        </select>
      </div>

      {loadingStudents ? (
        <div className="text-sm text-gray-400">Cargando alumnas...</div>
      ) : students.length === 0 ? (
        <div className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center">
          No hay alumnas activas en este curso.
        </div>
      ) : (
        <div className="space-y-2">
          {students.map(s => {
            const estado = getEstado(s.id)
            const isSaving = saving[s.id]
            return (
              <div key={s.id} className="flex items-center justify-between bg-white rounded-xl border px-4 py-2.5">
                <span className="text-sm font-medium text-gray-800">{s.name}</span>
                <div className="flex gap-1.5">
                  {[
                    { key: 'presente', label: '✓', bg: '#2A9D8F', title: 'Presente' },
                    { key: 'tardanza', label: '⏱', bg: '#F4A261', title: 'Tardía' },
                    { key: 'ausente', label: '✕', bg: '#e57373', title: 'Ausente' }
                  ].map(({ key, label, bg, title }) => (
                    <button key={key} title={title} disabled={isSaving}
                      onClick={() => handleToggle(s.id, key)}
                      className="w-8 h-8 rounded-full text-sm font-bold transition-all"
                      style={{
                        background: estado === key ? bg : '#f0f0f0',
                        color: estado === key ? 'white' : '#999',
                        opacity: isSaving ? 0.5 : 1,
                        transform: estado === key ? 'scale(1.1)' : 'scale(1)'
                      }}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Subcomponente: bitácora ───────────────────────────────────────
function BitacoraTab({ ciclo, course }) {
  const classDays = normalizeClassDays(course.class_days)
  const classDates = ciclo ? getExpectedClassDates(ciclo.fecha_inicio, ciclo.total_clases, classDays) : []
  const today = getTodayEC()
  const pastDates = classDates.filter(d => d <= today)

  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState({
    fechaClase: pastDates[pastDates.length - 1] || today,
    titulo: '',
    contenido: ''
  })

  const fetchEntries = useCallback(async () => {
    if (!ciclo) return
    setLoading(true)
    const { data } = await getBitacora(course.code, ciclo.fecha_inicio)
    setEntries(data || [])
    setLoading(false)
  }, [ciclo, course.code])

  useEffect(() => { fetchEntries() }, [fetchEntries])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.contenido.trim()) return
    setSaving(true)
    const { error } = await createBitacoraEntry({
      courseId:   course.code,
      fechaClase: form.fechaClase,
      titulo:     form.titulo,
      contenido:  form.contenido
    })
    setSaving(false)
    if (!error) {
      setForm({ fechaClase: pastDates[pastDates.length - 1] || today, titulo: '', contenido: '' })
      setShowForm(false)
      fetchEntries()
    } else {
      alert('Error: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar esta entrada?')) return
    setDeleting(id)
    await deleteBitacoraEntry(id)
    setDeleting(null)
    fetchEntries()
  }

  if (!ciclo) return (
    <div className="text-center py-8 text-gray-400 text-sm">Sin ciclo activo. Crea un ciclo primero.</div>
  )

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-gray-500">{entries.length} entrada(s)</span>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg text-white"
          style={{ background: PURPLE }}>
          <Plus size={14} /> Nueva entrada
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-purple-50 border border-purple-100 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-600 block mb-1">Fecha de clase *</label>
              <select value={form.fechaClase} onChange={e => setForm({ ...form, fechaClase: e.target.value })}
                className="w-full border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-purple-300">
                {classDates.map(d => (
                  <option key={d} value={d}>{formatClassDateShort(d)} ({d > today ? 'futura' : 'pasada'})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-600 block mb-1">Título (opcional)</label>
              <input type="text" value={form.titulo}
                onChange={e => setForm({ ...form, titulo: e.target.value })}
                placeholder="ej. Repaso port de bras"
                className="w-full border rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-purple-300" />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Contenido *</label>
            <textarea required rows={4} value={form.contenido}
              onChange={e => setForm({ ...form, contenido: e.target.value })}
              placeholder="¿Qué se trabajó en la clase?"
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-300 resize-none" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="px-4 py-1.5 rounded-lg text-sm font-medium text-white disabled:opacity-50"
              style={{ background: PURPLE }}>
              {saving ? 'Guardando...' : 'Guardar'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium text-gray-600 bg-white border">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-sm text-gray-400">Cargando...</div>
      ) : entries.length === 0 ? (
        <div className="text-sm text-gray-500 text-center py-6 bg-gray-50 rounded-xl">
          Sin entradas en este ciclo.
        </div>
      ) : (
        <div className="space-y-3">
          {entries.map(e => (
            <div key={e.id} className="bg-white rounded-xl border px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">{formatDateLong(e.class_date)}</p>
                  {e.title && <p className="font-semibold text-gray-800 text-sm mb-1">{e.title}</p>}
                  <p className="text-sm text-gray-600 whitespace-pre-wrap">{e.body}</p>
                </div>
                <button onClick={() => handleDelete(e.id)} disabled={deleting === e.id}
                  className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg hover:bg-red-50 shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Subcomponente: progresión ─────────────────────────────────────
function ProgresionTab({ course, activeCiclo }) {
  const [bloques, setBloques] = useState(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})
  const [saving, setSaving] = useState({})

  useEffect(() => {
    const plantillaId = course.plantilla_progresion_id || null
    getProgresionAdmin(course.code, plantillaId).then(({ data }) => {
      setBloques(data)
      setLoading(false)
      // Auto-expand first non-cubierto bloque
      if (data) {
        const firstActive = data.find(b => b.items.some(i => i.estado !== 'cubierto'))
        if (firstActive) setExpanded({ [firstActive.id]: true })
      }
    })
  }, [course.code, course.plantilla_progresion_id])

  const handleEstadoChange = async (bloque, item, newEstado) => {
    const key = item.id
    setSaving(prev => ({ ...prev, [key]: true }))
    // Optimistic update
    setBloques(prev => prev.map(b =>
      b.id === bloque.id ? {
        ...b,
        items: b.items.map(i => i.id === item.id ? { ...i, estado: newEstado } : i)
      } : b
    ))
    const { error } = await updateProgresionEstado(course.code, item.id, newEstado, activeCiclo?.id || null)
    setSaving(prev => ({ ...prev, [key]: false }))
    if (error) alert('Error al guardar: ' + error.message)
  }

  if (loading) return <div className="text-sm text-gray-400 py-6">Cargando...</div>

  if (!bloques) return (
    <div className="text-center py-8 bg-gray-50 rounded-xl text-sm text-gray-500">
      <BookOpen size={28} className="mx-auto mb-2 text-gray-300" />
      <p className="font-medium mb-1">Sin plantilla de progresión</p>
      <p className="text-xs text-gray-400">Vincula una plantilla al curso en la configuración para habilitar el mapa de progresión.</p>
    </div>
  )

  const estadoColors = {
    pendiente: { bg: '#f5f5f5', text: '#999', label: 'Pendiente' },
    en_curso: { bg: '#E8F5E9', text: '#2A9D8F', label: 'En curso' },
    cubierto: { bg: '#F3E5F5', text: '#7B2D8E', label: 'Cubierto' }
  }

  return (
    <div className="space-y-2">
      {bloques.map(bloque => {
        const covered = bloque.items.filter(i => i.estado === 'cubierto').length
        const isOpen = expanded[bloque.id]
        return (
          <div key={bloque.id} className="bg-white rounded-xl border overflow-hidden">
            <button className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              onClick={() => setExpanded(prev => ({ ...prev, [bloque.id]: !prev[bloque.id] }))}>
              <span className="font-semibold text-sm text-gray-800">{bloque.nombre}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{covered}/{bloque.items.length}</span>
                {isOpen ? <ChevronDown size={16} className="text-gray-400" /> : <ChevronRight size={16} className="text-gray-400" />}
              </div>
            </button>
            {isOpen && (
              <div className="px-4 pb-3 space-y-2 border-t border-gray-50 pt-2">
                {bloque.items.map(item => {
                  const { bg, text, label } = estadoColors[item.estado] || estadoColors.pendiente
                  return (
                    <div key={item.id} className="flex items-center justify-between gap-3">
                      <span className="text-sm text-gray-700">{item.nombre}</span>
                      <select value={item.estado}
                        disabled={saving[item.id]}
                        onChange={e => handleEstadoChange(bloque, item, e.target.value)}
                        className="text-xs border rounded-lg px-2 py-1 focus:ring-2 focus:ring-purple-300"
                        style={{ background: bg, color: text }}>
                        <option value="pendiente">Pendiente</option>
                        <option value="en_curso">En curso</option>
                        <option value="cubierto">Cubierto</option>
                      </select>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Subcomponente: tips ───────────────────────────────────────────
function TipsTab({ course }) {
  const [tips, setTips] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)
  const [form, setForm] = useState({ titulo: '', contenido: '' })

  const fetchTipsData = useCallback(async () => {
    setLoading(true)
    const { data } = await getTips(course.code)
    setTips(data || [])
    setLoading(false)
  }, [course.code])

  useEffect(() => { fetchTipsData() }, [fetchTipsData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    const { error } = await createTip({ cursoCode: course.code, titulo: form.titulo, contenido: form.contenido })
    setSaving(false)
    if (!error) {
      setForm({ titulo: '', contenido: '' })
      setShowForm(false)
      fetchTipsData()
    } else {
      alert('Error: ' + error.message)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este tip?')) return
    setDeleting(id)
    await deleteTip(id)
    setDeleting(null)
    fetchTipsData()
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-sm text-gray-500">{tips.length} tip(s)</span>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg text-white"
          style={{ background: GOLD, color: '#333' }}>
          <Plus size={14} /> Nuevo tip
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 space-y-3">
          <div>
            <label className="text-xs text-gray-600 block mb-1">Título *</label>
            <input type="text" required value={form.titulo}
              onChange={e => setForm({ ...form, titulo: e.target.value })}
              placeholder="ej. Tip de la semana"
              className="w-full border rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-yellow-300" />
          </div>
          <div>
            <label className="text-xs text-gray-600 block mb-1">Contenido *</label>
            <textarea required rows={3} value={form.contenido}
              onChange={e => setForm({ ...form, contenido: e.target.value })}
              placeholder="Escribe el tip aquí..."
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-yellow-300 resize-none" />
          </div>
          <div className="flex gap-2">
            <button type="submit" disabled={saving}
              className="px-4 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
              style={{ background: GOLD }}>
              {saving ? 'Guardando...' : 'Publicar tip'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium text-gray-600 bg-white border">
              Cancelar
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div className="text-sm text-gray-400">Cargando...</div>
      ) : tips.length === 0 ? (
        <div className="text-center py-6 bg-gray-50 rounded-xl text-sm text-gray-500">
          Sin tips publicados aún.
        </div>
      ) : (
        <div className="space-y-3">
          {tips.map(t => (
            <div key={t.id} className="bg-white rounded-xl border px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Lightbulb size={14} style={{ color: GOLD }} />
                    <span className="font-semibold text-sm text-gray-800">{t.titulo}</span>
                    {!t.publicado && (
                      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">oculto</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{t.contenido}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    {new Date(t.created_at).toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <button onClick={() => handleDelete(t.id)} disabled={deleting === t.id}
                  className="p-1.5 text-gray-300 hover:text-red-400 rounded-lg hover:bg-red-50 shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
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
  const [subTab, setSubTab] = useState('asistencia')

  useEffect(() => {
    getCursos().then(({ data }) => {
      setCourses(data || [])
      setLoadingCourses(false)
    })
  }, [])

  const selectedCourse = courses.find(c => c.code === selectedCourseCode) || null
  const activeCiclo = ciclos.find(c => c.estado === 'activo') || null

  const fetchCiclos = useCallback(async (code) => {
    const { data } = await getCiclos(code)
    setCiclos(data || [])
  }, [])

  useEffect(() => {
    if (!selectedCourseCode) { setCiclos([]); return }
    fetchCiclos(selectedCourseCode)
  }, [selectedCourseCode, fetchCiclos])

  const subTabs = [
    { id: 'asistencia', label: 'Asistencia', icon: CheckCircle },
    { id: 'bitacora', label: 'Bitácora', icon: BookOpen },
    { id: 'progresion', label: 'Progresión', icon: ChevronRight },
    { id: 'tips', label: 'Tips', icon: Lightbulb },
  ]

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Gestión de Clases Niñas</h2>
          <p className="text-sm text-gray-500">Ciclos · Asistencia · Bitácora · Progresión</p>
        </div>
      </div>

      {/* Course selector */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
        <label className="text-sm font-medium text-gray-600 block mb-2">Selecciona un curso</label>
        {loadingCourses ? (
          <div className="text-sm text-gray-400">Cargando cursos...</div>
        ) : (
          <select value={selectedCourseCode} onChange={e => setSelectedCourseCode(e.target.value)}
            className="w-full border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-purple-300 focus:border-purple-400">
            <option value="">— Elige un curso —</option>
            {courses.map(c => (
              <option key={c.code} value={c.code}>{c.name}</option>
            ))}
          </select>
        )}
      </div>

      {selectedCourse && (
        <>
          {/* Cycle management */}
          <CicloSection
            course={selectedCourse}
            ciclos={ciclos}
            onCicloCreated={() => fetchCiclos(selectedCourseCode)}
            onCicloClosed={() => fetchCiclos(selectedCourseCode)}
          />

          {/* Sub-tabs */}
          <div className="flex gap-1 mb-4 overflow-x-auto">
            {subTabs.map(tab => {
              const Icon = tab.icon
              return (
                <button key={tab.id} onClick={() => setSubTab(tab.id)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-medium transition-colors whitespace-nowrap text-sm ${
                    subTab === tab.id
                      ? 'text-white shadow-sm'
                      : 'bg-white text-gray-600 hover:bg-purple-50 border border-gray-200'
                  }`}
                  style={subTab === tab.id ? { background: PURPLE } : {}}>
                  <Icon size={14} />
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Sub-tab content */}
          <div className="bg-white rounded-xl shadow-sm p-4">
            {subTab === 'asistencia' && (
              <AsistenciaTab ciclo={activeCiclo} course={selectedCourse} />
            )}
            {subTab === 'bitacora' && (
              <BitacoraTab ciclo={activeCiclo} course={selectedCourse} />
            )}
            {subTab === 'progresion' && (
              <ProgresionTab course={selectedCourse} activeCiclo={activeCiclo} />
            )}
            {subTab === 'tips' && (
              <TipsTab course={selectedCourse} />
            )}
          </div>
        </>
      )}
    </div>
  )
}
