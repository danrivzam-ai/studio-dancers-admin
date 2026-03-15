import { useState, useEffect } from 'react'
import {
  Plus, X, Edit2, Check, AlertCircle, Eye, EyeOff,
  UserCheck, UserX, BookOpen, ChevronDown, ChevronUp,
  RotateCcw, GraduationCap, Calendar, Trash2, Clock
} from 'lucide-react'
// SECURITY WARNING: bcryptjs runs client-side. Password hashing should be server-side.
// TODO: Migrate to Supabase Edge Function for instructor password management.
import bcrypt from 'bcryptjs'
import { supabase } from '../lib/supabase'
import { syncToMailerLite } from '../lib/mailerlite'
import DeleteConfirmModal from './DeleteConfirmModal'

const COURSE_COLORS = [
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-green-100 text-green-700 border-green-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-teal-100 text-teal-700 border-teal-200',
  'bg-yellow-100 text-yellow-700 border-yellow-200',
  'bg-red-100 text-red-700 border-red-200',
]

const AVAILABLE_RHYTHMS = ['Ballet', 'Jazz', 'Urban Pop', 'Contemporáneo', 'Lyrical', 'Ritmos Tropicales']

const DAY_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']
const emptySlotForm = { day_of_week: '1', time_start: '08:00', time_end: '09:30', group_name: '', course_id: '', notes: '' }

const emptyForm = { name: '', cedula: '', email: '', password: '', active: true, rhythms: [] }

export default function InstructorManager({ allCourses = [], securityPin, settings = {} }) {
  const [instructors, setInstructors] = useState([])
  const [assignments, setAssignments] = useState({}) // { instructorId: [courseId, ...] }
  const [instructorRhythms, setInstructorRhythms] = useState({}) // { instructorId: [ritmo, ...] }
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Modal crear/editar
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null) // null = crear, objeto = editar
  const [form, setForm] = useState(emptyForm)
  const [showPass, setShowPass] = useState(false)
  const [showNewPass, setShowNewPass] = useState(false)
  const [resetPass, setResetPass] = useState(false)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)

  // Panel de cursos
  const [coursePanel, setCoursePanel] = useState(null) // instructorId
  const [selectedCourses, setSelectedCourses] = useState([])
  const [savingCourses, setSavingCourses] = useState(false)

  // Eliminar con PIN
  const [deleteTarget, setDeleteTarget] = useState(null) // instructor a eliminar

  // Panel de horario
  const [schedulePanel, setSchedulePanel] = useState(null) // instructorId
  const [scheduleSlots, setScheduleSlots] = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)
  const [showSlotForm, setShowSlotForm] = useState(false)
  const [slotForm, setSlotForm] = useState(emptySlotForm)
  const [savingSlot, setSavingSlot] = useState(false)
  const [editingSlotId, setEditingSlotId] = useState(null) // null = modo agregar; uuid = modo editar

  // Filtros
  const [filterActive, setFilterActive] = useState('all') // 'all' | 'active' | 'inactive'

  useEffect(() => {
    fetchAll()
  }, [])

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(''), 3000)
      return () => clearTimeout(t)
    }
  }, [success])

  const fetchAll = async () => {
    setLoading(true)
    try {
      const [{ data: instData, error: e1 }, { data: assignData, error: e2 }, { data: rhythmData, error: e3 }] = await Promise.all([
        supabase.from('instructors').select('*').order('name'),
        supabase.from('instructor_courses').select('instructor_id, course_id'),
        supabase.from('instructor_rhythms').select('instructor_id, ritmo'),
      ])
      if (e1) throw e1
      if (e2 && e2.code !== '42P01') throw e2
      setInstructors(instData || [])
      // Agrupar asignaciones por instructor
      const map = {}
      for (const row of (assignData || [])) {
        if (!map[row.instructor_id]) map[row.instructor_id] = []
        map[row.instructor_id].push(row.course_id)
      }
      setAssignments(map)
      // Agrupar ritmos por instructor
      const rmap = {}
      for (const row of (rhythmData || [])) {
        if (!rmap[row.instructor_id]) rmap[row.instructor_id] = []
        rmap[row.instructor_id].push(row.ritmo)
      }
      setInstructorRhythms(rmap)
    } catch (err) {
      setError('Error al cargar instructoras: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  // ── Abrir modal crear ──────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
    setResetPass(false)
    setShowPass(false)
    setShowForm(true)
  }

  // ── Abrir modal editar ─────────────────────────────────────────────
  const openEdit = (inst) => {
    setEditing(inst)
    setForm({ name: inst.name, cedula: inst.cedula, email: inst.email || '', password: '', active: inst.active, rhythms: instructorRhythms[inst.id] || [] })
    setFormError('')
    setResetPass(false)
    setShowPass(false)
    setShowNewPass(false)
    setShowForm(true)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditing(null)
    setForm(emptyForm)
    setFormError('')
  }

  // ── Guardar instructora ────────────────────────────────────────────
  const handleSave = async (e) => {
    e.preventDefault()
    setFormError('')
    if (!form.name.trim()) { setFormError('El nombre es requerido'); return }
    if (!form.cedula.trim()) { setFormError('La cédula es requerida'); return }
    if (!editing && !form.password.trim()) { setFormError('La contraseña inicial es requerida'); return }
    if (!editing && form.password.length < 6) { setFormError('La contraseña debe tener al menos 6 caracteres'); return }
    if (resetPass && form.password && form.password.length < 6) { setFormError('La nueva contraseña debe tener al menos 6 caracteres'); return }

    setSaving(true)
    try {
      let instructorId = editing?.id

      if (editing) {
        // Verificar cédula duplicada (distinta instructora)
        const { data: dup } = await supabase
          .from('instructors')
          .select('id')
          .eq('cedula', form.cedula.trim())
          .neq('id', editing.id)
          .maybeSingle()
        if (dup) { setFormError('Ya existe otra instructora con esa cédula'); return }

        const updates = {
          name: form.name.trim(),
          cedula: form.cedula.trim(),
          email: form.email.trim() || null,
          active: form.active,
        }
        if (resetPass && form.password) {
          updates.password = await bcrypt.hash(form.password, 10)
          updates.must_change_password = true
        }
        const { error } = await supabase.from('instructors').update(updates).eq('id', editing.id)
        if (error) throw error
        setSuccess('Instructora actualizada correctamente')
      } else {
        // Verificar cédula duplicada
        const { data: dup } = await supabase
          .from('instructors')
          .select('id')
          .eq('cedula', form.cedula.trim())
          .maybeSingle()
        if (dup) { setFormError('Ya existe una instructora con esa cédula'); return }

        const hashedPassword = await bcrypt.hash(form.password, 10)
        const { data: newInst, error } = await supabase.from('instructors').insert({
          name: form.name.trim(),
          cedula: form.cedula.trim(),
          email: form.email.trim() || null,
          password: hashedPassword,
          active: form.active,
          must_change_password: true,
        }).select('id').single()
        if (error) throw error
        instructorId = newInst.id
        setSuccess('Instructora creada correctamente')

        // Sincronizar con MailerLite — dispara automatización de bienvenida
        if (form.email.trim() && settings.mailerlite_api_key && settings.mailerlite_instructors_group_id) {
          syncToMailerLite({
            email: form.email.trim(),
            name: form.name.trim(),
            apiKey: settings.mailerlite_api_key,
            groupId: settings.mailerlite_instructors_group_id,
            fields: {
              tipo: 'instructora',
              ritmos: form.rhythms.join(', '),
              estado: form.active ? 'activa' : 'inactiva',
              fecha_alta: new Date().toISOString().split('T')[0], // YYYY-MM-DD
            },
          })
        }
      }

      // Guardar ritmos: eliminar todos los anteriores y reemplazar
      await supabase.from('instructor_rhythms').delete().eq('instructor_id', instructorId)
      if (form.rhythms.length > 0) {
        const rows = form.rhythms.map(r => ({ instructor_id: instructorId, ritmo: r }))
        const { error: re } = await supabase.from('instructor_rhythms').insert(rows)
        if (re) throw re
      }

      await fetchAll()
      closeForm()
    } catch (err) {
      setFormError('Error: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  // ── Toggle activo/inactivo ─────────────────────────────────────────
  const toggleActive = async (inst) => {
    try {
      const { error } = await supabase
        .from('instructors')
        .update({ active: !inst.active })
        .eq('id', inst.id)
      if (error) throw error
      setInstructors(prev => prev.map(i => i.id === inst.id ? { ...i, active: !i.active } : i))
      setSuccess(`${inst.name} ${!inst.active ? 'activada' : 'desactivada'}`)
    } catch (err) {
      setError('Error: ' + err.message)
    }
  }

  // ── Eliminar instructora ───────────────────────────────────────────
  const openDelete = (inst) => {
    setDeleteTarget(inst)
  }

  const confirmDelete = async () => {
    const id = deleteTarget.id
    // Nullificar referencias en attendance (marked_by FK)
    await supabase.from('attendance').update({ marked_by: null }).eq('marked_by', id)
    // Eliminar asignaciones y horario
    await supabase.from('instructor_courses').delete().eq('instructor_id', id)
    await supabase.from('instructor_rhythms').delete().eq('instructor_id', id)
    await supabase.from('instructor_schedule').delete().eq('instructor_id', id)
    const { error } = await supabase.from('instructors').delete().eq('id', id)
    if (error) throw error
    const name = deleteTarget.name
    setDeleteTarget(null)
    setSuccess(`${name} eliminada correctamente`)
    await fetchAll()
  }

  // ── Abrir panel de cursos ──────────────────────────────────────────
  const openCoursePanel = (instId) => {
    // Cierra horario si estaba abierto para la misma instructora
    if (schedulePanel === instId) closeSchedulePanel()
    setCoursePanel(instId)
    setSelectedCourses(assignments[instId] ? [...assignments[instId]] : [])
  }

  const closeCoursePanel = () => {
    setCoursePanel(null)
    setSelectedCourses([])
  }

  // ── Panel de horario ───────────────────────────────────────────────
  const openSchedulePanel = async (instId) => {
    // Cierra cursos si estaba abierto
    if (coursePanel) closeCoursePanel()
    setSchedulePanel(instId)
    setShowSlotForm(false)
    setSlotForm(emptySlotForm)
    setLoadingSlots(true)
    try {
      const { data, error } = await supabase
        .from('instructor_schedule')
        .select('*')
        .eq('instructor_id', instId)
        .order('day_of_week')
        .order('time_start')
      if (error && error.code !== '42P01') throw error
      setScheduleSlots(data || [])
    } catch (err) {
      setError('Error al cargar horario: ' + err.message)
    } finally {
      setLoadingSlots(false)
    }
  }

  const closeSchedulePanel = () => {
    setSchedulePanel(null)
    setScheduleSlots([])
    setShowSlotForm(false)
    setSlotForm(emptySlotForm)
    setEditingSlotId(null)
  }

  /** Abre el form pre-cargado con los datos de un slot existente para editarlo. */
  const startEditSlot = (slot) => {
    setSlotForm({
      day_of_week: String(slot.day_of_week),
      time_start: slot.time_start.substring(0, 5),
      time_end: slot.time_end.substring(0, 5),
      group_name: slot.group_name,
      course_id: slot.course_id || '',
      notes: slot.notes || '',
    })
    setEditingSlotId(slot.id)
    setShowSlotForm(true)
  }

  /** Guarda el slot: INSERT si modo agregar, UPDATE si modo editar. */
  const saveSlot = async () => {
    if (!slotForm.group_name.trim()) { setError('El nombre del grupo/nivel es requerido'); return }
    setSavingSlot(true)
    try {
      const payload = {
        day_of_week: parseInt(slotForm.day_of_week),
        time_start: slotForm.time_start,
        time_end: slotForm.time_end,
        group_name: slotForm.group_name.trim(),
        course_id: slotForm.course_id || null,
        notes: slotForm.notes.trim() || null,
      }

      if (editingSlotId) {
        // ── UPDATE ──────────────────────────────────────────────────────────
        const { data, error } = await supabase
          .from('instructor_schedule')
          .update(payload)
          .eq('id', editingSlotId)
          .select('*')
          .single()
        if (error) throw error
        setScheduleSlots(prev =>
          prev.map(s => s.id === editingSlotId ? data : s)
            .sort((a, b) => a.day_of_week - b.day_of_week || a.time_start.localeCompare(b.time_start))
        )
        setSuccess('Clase actualizada')
      } else {
        // ── INSERT ──────────────────────────────────────────────────────────
        const { data, error } = await supabase
          .from('instructor_schedule')
          .insert({ instructor_id: schedulePanel, ...payload })
          .select('*')
          .single()
        if (error) throw error
        setScheduleSlots(prev =>
          [...prev, data].sort((a, b) =>
            a.day_of_week - b.day_of_week || a.time_start.localeCompare(b.time_start)
          )
        )
        setSuccess('Clase agregada al horario')
      }

      setShowSlotForm(false)
      setSlotForm(emptySlotForm)
      setEditingSlotId(null)
    } catch (err) {
      setError('Error: ' + err.message)
    } finally {
      setSavingSlot(false)
    }
  }

  const deleteSlot = async (slotId) => {
    // Si se estaba editando este slot, cerrar el form
    if (editingSlotId === slotId) { setShowSlotForm(false); setSlotForm(emptySlotForm); setEditingSlotId(null) }
    const { error } = await supabase.from('instructor_schedule').delete().eq('id', slotId)
    if (error) { setError('Error al eliminar: ' + error.message); return }
    setScheduleSlots(prev => prev.filter(s => s.id !== slotId))
  }

  const toggleCourse = (courseId) => {
    setSelectedCourses(prev =>
      prev.includes(courseId) ? prev.filter(id => id !== courseId) : [...prev, courseId]
    )
  }

  const saveCourses = async () => {
    setSavingCourses(true)
    try {
      // Eliminar asignaciones anteriores
      await supabase.from('instructor_courses').delete().eq('instructor_id', coursePanel)
      // Insertar nuevas
      if (selectedCourses.length > 0) {
        const rows = selectedCourses.map(cid => ({ instructor_id: coursePanel, course_id: cid }))
        const { error } = await supabase.from('instructor_courses').insert(rows)
        if (error) throw error
      }
      setAssignments(prev => ({ ...prev, [coursePanel]: [...selectedCourses] }))
      setSuccess('Cursos actualizados')
      closeCoursePanel()
    } catch (err) {
      setError('Error al guardar cursos: ' + err.message)
    } finally {
      setSavingCourses(false)
    }
  }

  // ── Datos filtrados ────────────────────────────────────────────────
  const filtered = instructors.filter(i => {
    if (filterActive === 'active') return i.active
    if (filterActive === 'inactive') return !i.active
    return true
  })

  const getCourseInfo = (courseId) => {
    return allCourses.find(c => (c.id === courseId || c.code === courseId))
  }

  // ── Render ─────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <GraduationCap size={22} className="text-purple-600" />
            Instructoras
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {instructors.filter(i => i.active).length} activas · {instructors.length} total
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-medium active:scale-95 transition-all text-sm"
        >
          <Plus size={16} />
          Nueva Instructora
        </button>
      </div>

      {/* Mensajes */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} />
          {error}
          <button onClick={() => setError('')} className="ml-auto"><X size={14} /></button>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
          <Check size={16} />
          {success}
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2">
        {[['all', 'Todas'], ['active', 'Activas'], ['inactive', 'Inactivas']].map(([val, label]) => (
          <button
            key={val}
            onClick={() => setFilterActive(val)}
            className={`px-3 py-1.5 rounded-xl text-xs font-medium active:scale-95 transition-all ${
              filterActive === val
                ? 'bg-purple-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-purple-50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-12 text-center">
          <GraduationCap size={48} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 font-medium">No hay instructoras</p>
          <p className="text-gray-400 text-sm mt-1">Crea la primera instructora con el botón de arriba</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((inst, idx) => {
            const courseIds = assignments[inst.id] || []
            const courseObjs = courseIds.map(getCourseInfo).filter(Boolean)
            const isCoursePanelOpen = coursePanel === inst.id
            const isSchedulePanelOpen = schedulePanel === inst.id

            return (
              <div
                key={inst.id}
                className={`bg-white rounded-xl shadow border-l-4 ${inst.active ? 'border-purple-500' : 'border-gray-300'} p-4 flex flex-col gap-3`}
              >
                {/* Cabecera */}
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${inst.active ? 'bg-purple-500' : 'bg-gray-400'}`}>
                        {inst.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm leading-tight">{inst.name}</p>
                        <p className="text-xs text-gray-400">CI: {inst.cedula}</p>
                      </div>
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${inst.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {inst.active ? 'Activa' : 'Inactiva'}
                  </span>
                </div>

                {/* Ritmos */}
                {(instructorRhythms[inst.id] || []).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {instructorRhythms[inst.id].map(r => (
                      <span key={r} className="text-xs px-2 py-0.5 rounded-full bg-fuchsia-50 border border-fuchsia-200 text-fuchsia-700 font-medium">
                        {r}
                      </span>
                    ))}
                  </div>
                )}

                {/* Cursos asignados */}
                <div>
                  {courseObjs.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {courseObjs.map((c, i) => (
                        <span key={c.id || c.code} className={`text-xs px-2 py-0.5 rounded-full border font-medium ${COURSE_COLORS[i % COURSE_COLORS.length]}`}>
                          {c.name}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 italic">Sin cursos asignados</p>
                  )}
                </div>

                {/* Acciones — fila 1: paneles */}
                <div className="flex gap-2 pt-1 border-t border-gray-100">
                  <button
                    onClick={() => isCoursePanelOpen ? closeCoursePanel() : openCoursePanel(inst.id)}
                    className={`flex-1 flex items-center justify-center gap-1 text-xs font-medium px-2 py-1.5 rounded-xl active:scale-95 transition-all ${
                      isCoursePanelOpen ? 'bg-purple-600 text-white' : 'bg-purple-50 hover:bg-purple-100 text-purple-700'
                    }`}
                  >
                    <BookOpen size={13} />
                    Cursos
                    {isCoursePanelOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  <button
                    onClick={() => isSchedulePanelOpen ? closeSchedulePanel() : openSchedulePanel(inst.id)}
                    className={`flex-1 flex items-center justify-center gap-1 text-xs font-medium px-2 py-1.5 rounded-xl active:scale-95 transition-all ${
                      isSchedulePanelOpen ? 'bg-blue-600 text-white' : 'bg-blue-50 hover:bg-blue-100 text-blue-700'
                    }`}
                  >
                    <Clock size={13} />
                    Horario
                    {isSchedulePanelOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                </div>

                {/* Acciones — fila 2: gestión */}
                <div className="flex gap-2">
                  <button
                    onClick={() => openEdit(inst)}
                    className="flex-1 flex items-center justify-center gap-1 text-xs font-medium px-2 py-1.5 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-600 active:scale-95 transition-all"
                  >
                    <Edit2 size={13} />
                    Editar
                  </button>
                  <button
                    onClick={() => toggleActive(inst)}
                    className={`flex-1 flex items-center justify-center gap-1 text-xs font-medium px-2 py-1.5 rounded-xl active:scale-95 transition-all ${
                      inst.active
                        ? 'bg-amber-50 hover:bg-amber-100 text-amber-600'
                        : 'bg-green-50 hover:bg-green-100 text-green-600'
                    }`}
                  >
                    {inst.active ? <UserX size={13} /> : <UserCheck size={13} />}
                    {inst.active ? 'Pausar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => openDelete(inst)}
                    className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 active:scale-95 transition-all"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>

                {/* Panel de cursos inline */}
                {isCoursePanelOpen && (
                  <div className="border-t border-purple-100 pt-3">
                    <p className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1">
                      <Calendar size={12} />
                      Asignar cursos a {inst.name.split(' ')[0]}
                    </p>
                    <div className="space-y-1 max-h-52 overflow-y-auto">
                      {allCourses.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No hay cursos disponibles</p>
                      ) : (
                        allCourses.map(course => {
                          const cid = course.id || course.code
                          const checked = selectedCourses.includes(cid)
                          return (
                            <label
                              key={cid}
                              className={`flex items-start gap-2 p-2 rounded-xl cursor-pointer transition-all ${checked ? 'bg-purple-50 border border-purple-200' : 'hover:bg-gray-50 border border-transparent'}`}
                            >
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleCourse(cid)}
                                className="mt-0.5 accent-purple-600"
                              />
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-800 leading-tight">{course.name}</p>
                                {(course.schedule || course.classDays) && (
                                  <p className="text-xs text-gray-400 mt-0.5">{course.schedule || ''}</p>
                                )}
                              </div>
                            </label>
                          )
                        })
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={saveCourses}
                        disabled={savingCourses}
                        className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-medium py-1.5 rounded-xl active:scale-95 transition-all"
                      >
                        {savingCourses ? 'Guardando…' : 'Guardar cursos'}
                      </button>
                      <button
                        onClick={closeCoursePanel}
                        className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-xl active:scale-95 transition-all"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Panel de horario inline */}
                {isSchedulePanelOpen && (
                  <div className="border-t border-blue-100 pt-3">
                    <p className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                      <Clock size={12} />
                      Horario de {inst.name.split(' ')[0]}
                    </p>

                    {loadingSlots ? (
                      <div className="flex justify-center py-3">
                        <div className="w-5 h-5 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
                      </div>
                    ) : (
                      <>
                        {/* Slots existentes */}
                        {scheduleSlots.length === 0 ? (
                          <p className="text-xs text-gray-400 italic text-center py-2">Sin horario configurado aún</p>
                        ) : (
                          <div className="space-y-1.5 mb-2">
                            {scheduleSlots.map(slot => {
                              const isEditing = editingSlotId === slot.id
                              return (
                              <div key={slot.id} className={`flex items-start justify-between gap-2 rounded-xl px-3 py-2 border transition-all ${
                                isEditing
                                  ? 'bg-blue-100 border-blue-400 ring-1 ring-blue-300'
                                  : 'bg-blue-50 border-blue-100'
                              }`}>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-xs font-bold text-blue-700">{DAY_NAMES[slot.day_of_week]}</span>
                                    <span className="text-xs text-gray-500 font-mono">
                                      {slot.time_start.substring(0, 5)} – {slot.time_end.substring(0, 5)}
                                    </span>
                                    {isEditing && (
                                      <span className="text-xs text-blue-600 font-medium bg-blue-200 px-1.5 py-0.5 rounded">editando</span>
                                    )}
                                  </div>
                                  <p className="text-xs font-semibold text-gray-800 mt-0.5">{slot.group_name}</p>
                                  {slot.course_id && getCourseInfo(slot.course_id) && (
                                    <p className="text-xs text-gray-400">{getCourseInfo(slot.course_id).name}</p>
                                  )}
                                  {slot.notes && (
                                    <p className="text-xs text-gray-400 italic">{slot.notes}</p>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => isEditing
                                      ? (setShowSlotForm(false), setSlotForm(emptySlotForm), setEditingSlotId(null))
                                      : startEditSlot(slot)
                                    }
                                    className={`p-1 rounded-lg transition-all ${
                                      isEditing
                                        ? 'text-blue-600 bg-blue-200 hover:bg-blue-300'
                                        : 'text-gray-400 hover:text-blue-600 hover:bg-blue-100'
                                    }`}
                                    title={isEditing ? 'Cancelar edición' : 'Editar'}
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={() => deleteSlot(slot.id)}
                                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                    title="Eliminar"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </div>
                              </div>
                            )})}
                          </div>
                        )}

                        {/* Formulario agregar / editar slot */}
                        {!showSlotForm ? (
                          <button
                            onClick={() => { setEditingSlotId(null); setSlotForm(emptySlotForm); setShowSlotForm(true) }}
                            className="w-full flex items-center justify-center gap-1 text-xs font-medium py-1.5 rounded-xl border border-dashed border-blue-300 text-blue-600 hover:bg-blue-50 transition-all"
                          >
                            <Plus size={12} />
                            Agregar clase
                          </button>
                        ) : (
                          <div className="space-y-2 border border-blue-200 rounded-xl p-3 bg-blue-50/60">
                            <p className="text-xs font-semibold text-blue-700">
                              {editingSlotId ? 'Editar clase' : 'Nueva clase'}
                            </p>

                            {/* Curso primero — auto-rellena el nombre del grupo */}
                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Curso</label>
                              <select
                                value={slotForm.course_id}
                                onChange={e => {
                                  const courseId = e.target.value
                                  const courseName = allCourses.find(c => (c.id || c.code) === courseId)?.name || ''
                                  setSlotForm(f => ({
                                    ...f,
                                    course_id: courseId,
                                    // Auto-rellena nombre solo si está vacío
                                    group_name: f.group_name ? f.group_name : courseName,
                                  }))
                                }}
                                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:ring-1 focus:ring-blue-400 outline-none"
                              >
                                <option value="">— Sin vincular —</option>
                                {allCourses.map(c => (
                                  <option key={c.id || c.code} value={c.id || c.code}>{c.name}</option>
                                ))}
                              </select>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Día</label>
                                <select
                                  value={slotForm.day_of_week}
                                  onChange={e => setSlotForm(f => ({ ...f, day_of_week: e.target.value }))}
                                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:ring-1 focus:ring-blue-400 outline-none"
                                >
                                  {[1,2,3,4,5,6,7].map(d => (
                                    <option key={d} value={d}>{DAY_NAMES[d]}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Grupo/Nivel *</label>
                                <input
                                  type="text"
                                  value={slotForm.group_name}
                                  onChange={e => setSlotForm(f => ({ ...f, group_name: e.target.value }))}
                                  placeholder="ej: Dance Kids"
                                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:ring-1 focus:ring-blue-400 outline-none"
                                />
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Inicio</label>
                                <input
                                  type="time"
                                  value={slotForm.time_start}
                                  onChange={e => setSlotForm(f => ({ ...f, time_start: e.target.value }))}
                                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:ring-1 focus:ring-blue-400 outline-none"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">Fin</label>
                                <input
                                  type="time"
                                  value={slotForm.time_end}
                                  onChange={e => setSlotForm(f => ({ ...f, time_end: e.target.value }))}
                                  className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:ring-1 focus:ring-blue-400 outline-none"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-xs font-medium text-gray-600 mb-1">Notas (opcional)</label>
                              <input
                                type="text"
                                value={slotForm.notes}
                                onChange={e => setSlotForm(f => ({ ...f, notes: e.target.value }))}
                                placeholder="ej: Sala principal"
                                className="w-full text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white focus:ring-1 focus:ring-blue-400 outline-none"
                              />
                            </div>

                            <div className="flex gap-2">
                              <button
                                onClick={saveSlot}
                                disabled={savingSlot}
                                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-medium py-1.5 rounded-lg active:scale-95 transition-all"
                              >
                                {savingSlot ? 'Guardando…' : editingSlotId ? 'Actualizar' : 'Guardar clase'}
                              </button>
                              <button
                                onClick={() => { setShowSlotForm(false); setSlotForm(emptySlotForm); setEditingSlotId(null) }}
                                className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg active:scale-95 transition-all"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        )}

                        <button
                          onClick={closeSchedulePanel}
                          className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 py-1 transition-all"
                        >
                          Cerrar
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal crear/editar ──────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[95vh] sm:max-h-[90vh] flex flex-col">
            {/* Header modal */}
            <div className="flex items-center justify-between px-6 py-4 bg-purple-700 text-white rounded-t-2xl">
              <h3 className="font-bold flex items-center gap-2">
                <div className="bg-white/20 p-1.5 rounded-xl"><GraduationCap size={18} /></div>
                {editing ? 'Editar Instructora' : 'Nueva Instructora'}
              </h3>
              <button onClick={closeForm} className="p-1.5 hover:bg-white/20 rounded-xl active:scale-95 transition-all">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} autoComplete="off" className="flex flex-col flex-1 min-h-0">
              <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre completo *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: María García"
                  autoComplete="off"
                  className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all"
                />
              </div>

              {/* Cédula */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Cédula *</label>
                <input
                  type="text"
                  value={form.cedula}
                  onChange={e => setForm({ ...form, cedula: e.target.value })}
                  placeholder="Ej: 0912345678"
                  autoComplete="off"
                  className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all"
                />
                <p className="text-xs text-gray-400 mt-1">La instructora usa su cédula para iniciar sesión</p>
              </div>

              {/* Email — para MailerLite */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Email
                  <span className="ml-1.5 text-green-600 font-normal">(para MailerLite)</span>
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm({ ...form, email: e.target.value })}
                  placeholder="instructora@email.com"
                  autoComplete="off"
                  className="w-full px-3 py-2 text-sm border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all"
                />
                <p className="text-xs text-gray-400 mt-1">Opcional — se agrega al segmento de bienvenida automáticamente</p>
              </div>

              {/* Contraseña (crear) o reset (editar) */}
              {!editing ? (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Contraseña inicial *</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={form.password}
                      onChange={e => setForm({ ...form, password: e.target.value })}
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                      className="w-full px-3 py-2 pr-10 text-sm border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all"
                    />
                    <button type="button" onClick={() => setShowPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Se le pedirá cambiarla en el primer ingreso</p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="resetPass"
                      checked={resetPass}
                      onChange={e => setResetPass(e.target.checked)}
                      className="accent-purple-600"
                    />
                    <label htmlFor="resetPass" className="text-xs font-semibold text-gray-600 flex items-center gap-1 cursor-pointer">
                      <RotateCcw size={13} />
                      Restablecer contraseña
                    </label>
                  </div>
                  {resetPass && (
                    <div className="mt-2">
                      <div className="relative">
                        <input
                          type={showNewPass ? 'text' : 'password'}
                          value={form.password}
                          onChange={e => setForm({ ...form, password: e.target.value })}
                          placeholder="Nueva contraseña"
                          className="w-full px-3 py-2 pr-10 text-sm border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all"
                        />
                        <button type="button" onClick={() => setShowNewPass(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                          {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-400 mt-1">Se le pedirá cambiarla en el próximo ingreso</p>
                    </div>
                  )}
                </div>
              )}

              {/* Estado activo */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Estado</p>
                  <p className="text-xs text-gray-400">Las inactivas no pueden iniciar sesión</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`text-xs font-medium ${form.active ? 'text-purple-600' : 'text-gray-400'}`}>
                    {form.active ? 'Activa' : 'Inactiva'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                    className={`relative w-11 h-6 rounded-full transition-colors ${form.active ? 'bg-purple-600' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                </div>
              </div>

              {/* Ritmos que enseña */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-2">Ritmos que enseña</label>
                <div className="grid grid-cols-2 gap-1.5">
                  {AVAILABLE_RHYTHMS.map(r => {
                    const checked = form.rhythms.includes(r)
                    return (
                      <label
                        key={r}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl cursor-pointer transition-colors text-xs font-medium border ${
                          checked
                            ? 'bg-fuchsia-50 border-fuchsia-300 text-fuchsia-700'
                            : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() =>
                            setForm(f => ({
                              ...f,
                              rhythms: checked
                                ? f.rhythms.filter(x => x !== r)
                                : [...f.rhythms, r],
                            }))
                          }
                          className="accent-fuchsia-600"
                        />
                        {r}
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* Error form */}
              {formError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">
                  <AlertCircle size={14} />
                  {formError}
                </div>
              )}
              </div>{/* fin scroll area */}

              {/* Botones — fijos fuera del scroll */}
              <div className="px-6 py-4 border-t border-gray-100 flex gap-3">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl active:scale-95 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl active:scale-95 transition-all"
                >
                  {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear instructora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal eliminar con PIN del sistema ─────────────────────── */}
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        itemName={deleteTarget?.name}
        itemType="instructora"
        requiredPin={securityPin}
      />
    </div>
  )
}
