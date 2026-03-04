import { useState, useEffect } from 'react'
import {
  Plus, X, Edit2, Check, AlertCircle, Eye, EyeOff,
  UserCheck, UserX, BookOpen, ChevronDown, ChevronUp,
  RotateCcw, GraduationCap, Calendar
} from 'lucide-react'
import bcrypt from 'bcryptjs'
import { supabase } from '../lib/supabase'

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

const emptyForm = { name: '', cedula: '', password: '', active: true }

export default function InstructorManager({ allCourses = [] }) {
  const [instructors, setInstructors] = useState([])
  const [assignments, setAssignments] = useState({}) // { instructorId: [courseId, ...] }
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
      const [{ data: instData, error: e1 }, { data: assignData, error: e2 }] = await Promise.all([
        supabase.from('instructors').select('*').order('name'),
        supabase.from('instructor_courses').select('instructor_id, course_id')
      ])
      if (e1) throw e1
      if (e2 && e2.code !== '42P01') throw e2
      setInstructors(instData || [])
      // Agrupar por instructor
      const map = {}
      for (const row of (assignData || [])) {
        if (!map[row.instructor_id]) map[row.instructor_id] = []
        map[row.instructor_id].push(row.course_id)
      }
      setAssignments(map)
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
    setForm({ name: inst.name, cedula: inst.cedula, password: '', active: inst.active })
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
        const { error } = await supabase.from('instructors').insert({
          name: form.name.trim(),
          cedula: form.cedula.trim(),
          password: hashedPassword,
          active: form.active,
          must_change_password: true,
        })
        if (error) throw error
        setSuccess('Instructora creada correctamente')
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

  // ── Abrir panel de cursos ──────────────────────────────────────────
  const openCoursePanel = (instId) => {
    setCoursePanel(instId)
    setSelectedCourses(assignments[instId] ? [...assignments[instId]] : [])
  }

  const closeCoursePanel = () => {
    setCoursePanel(null)
    setSelectedCourses([])
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
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-medium transition-colors text-sm"
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
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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

                {/* Acciones */}
                <div className="flex gap-2 pt-1 border-t border-gray-100">
                  <button
                    onClick={() => isCoursePanelOpen ? closeCoursePanel() : openCoursePanel(inst.id)}
                    className="flex-1 flex items-center justify-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 transition-colors"
                  >
                    <BookOpen size={13} />
                    Cursos
                    {isCoursePanelOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                  </button>
                  <button
                    onClick={() => openEdit(inst)}
                    className="flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 text-gray-600 transition-colors"
                  >
                    <Edit2 size={13} />
                    Editar
                  </button>
                  <button
                    onClick={() => toggleActive(inst)}
                    className={`flex items-center gap-1 text-xs font-medium px-2 py-1.5 rounded-lg transition-colors ${
                      inst.active
                        ? 'bg-red-50 hover:bg-red-100 text-red-600'
                        : 'bg-green-50 hover:bg-green-100 text-green-600'
                    }`}
                  >
                    {inst.active ? <UserX size={13} /> : <UserCheck size={13} />}
                    {inst.active ? 'Desactivar' : 'Activar'}
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
                              className={`flex items-start gap-2 p-2 rounded-lg cursor-pointer transition-colors ${checked ? 'bg-purple-50 border border-purple-200' : 'hover:bg-gray-50 border border-transparent'}`}
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
                        className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-xs font-medium py-1.5 rounded-lg transition-colors"
                      >
                        {savingCourses ? 'Guardando…' : 'Guardar cursos'}
                      </button>
                      <button
                        onClick={closeCoursePanel}
                        className="px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* ── Modal crear/editar ──────────────────────────────────────── */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[90vh] flex flex-col">
            {/* Header modal */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <GraduationCap size={18} className="text-purple-600" />
                {editing ? 'Editar Instructora' : 'Nueva Instructora'}
              </h3>
              <button onClick={closeForm} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} autoComplete="off" className="px-6 py-5 pb-7 space-y-4 overflow-y-auto">
              {/* Nombre */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre completo *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Ej: María García"
                  autoComplete="off"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:outline-none"
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
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:outline-none"
                />
                <p className="text-xs text-gray-400 mt-1">La instructora usa su cédula para iniciar sesión</p>
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
                      className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:outline-none"
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
                          className="w-full px-3 py-2 pr-10 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-400 focus:outline-none"
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
              <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-700">Estado</p>
                  <p className="text-xs text-gray-400">Las inactivas no pueden iniciar sesión</p>
                </div>
                <button
                  type="button"
                  onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                  className={`relative w-11 h-6 rounded-full transition-colors ${form.active ? 'bg-purple-600' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${form.active ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
                <span className={`text-xs font-medium w-12 text-left ${form.active ? 'text-purple-600' : 'text-gray-400'}`}>
                  {form.active ? 'Activa' : 'Inactiva'}
                </span>
              </div>

              {/* Error form */}
              {formError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2 text-xs text-red-700">
                  <AlertCircle size={14} />
                  {formError}
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeForm}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 rounded-xl transition-colors"
                >
                  {saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Crear instructora'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
