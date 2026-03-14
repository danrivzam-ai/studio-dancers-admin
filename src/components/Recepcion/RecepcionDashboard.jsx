import { useState, useEffect, useCallback } from 'react'
import { Search, X, Plus, LogOut, User, Phone, CreditCard, ChevronRight, AlertCircle, CheckCircle2, Clock, Users } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { getCourseById, ALL_COURSES } from '../../lib/courses'
import { getDaysUntilDue, getTodayEC } from '../../lib/dateUtils'
import PaymentModal from '../PaymentModal'
import Modal from '../ui/Modal'

const PURPLE = '#7B2D8E'
const GREEN  = '#2A9D8F'

// ── Helpers ───────────────────────────────────────────────────────
function getPaymentStatus(student) {
  const course = getCourseById(student.course_id)
  if (!student.active) return { label: 'Inactiva', color: '#9e9e9e', bg: '#f5f5f5', priority: 3 }
  if (!course) return { label: 'Activa', color: GREEN, bg: '#E8F5E9', priority: 2 }
  if (course.priceType === 'mes' || course.priceType === 'paquete') {
    const days = getDaysUntilDue(student.next_payment_date)
    if (days <= 0)  return { label: `Atrasada ${Math.abs(days)}d`, color: '#e53935', bg: '#ffebee', priority: 0 }
    if (days <= 5)  return { label: `Vence en ${days}d`,           color: '#F4A261', bg: '#fff3e0', priority: 1 }
    return { label: 'Al día', color: GREEN, bg: '#E8F5E9', priority: 2 }
  }
  // programa
  const paid   = parseFloat(student.amount_paid || 0)
  const total  = parseFloat(student.total_program_price || course.price || 0)
  const balance = total - paid
  if (balance > 0) return { label: `Saldo $${balance.toFixed(0)}`, color: '#F4A261', bg: '#fff3e0', priority: 1 }
  return { label: 'Pagado', color: GREEN, bg: '#E8F5E9', priority: 2 }
}

// ── Modal Nueva Alumna (simplificado para recepción) ──────────────
function NuevaAlumnaModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: '', cedula: '', phone: '', age: '',
    is_minor: false,
    parent_name: '', parent_phone: '',
    course_id: '', notes: ''
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.course_id) return
    setSaving(true)
    setError('')
    const { error: err } = await supabase.from('students').insert({
      name:           form.name.trim(),
      cedula:         form.cedula.trim() || null,
      phone:          form.phone.trim() || null,
      age:            form.age ? parseInt(form.age) : null,
      is_minor:       form.is_minor,
      parent_name:    form.is_minor ? form.parent_name.trim() || null : null,
      parent_phone:   form.is_minor ? form.parent_phone.trim() || null : null,
      course_id:      form.course_id,
      notes:          form.notes.trim() || null,
      active:         true,
      created_at:     new Date().toISOString(),
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    onCreated()
    onClose()
  }

  const ACTIVE_COURSES = ALL_COURSES.filter(c => c.id)

  return (
    <Modal isOpen={true} onClose={onClose} ariaLabel="Nueva alumna">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-1.5 rounded-xl"><Plus size={16} /></div>
            <h3 className="font-semibold text-base">Nueva alumna</h3>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 hover:bg-white/20 rounded-xl active:scale-95 transition-all">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3 overflow-y-auto max-h-[70vh]">
          {/* Nombre */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Nombre completo *</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)}
              placeholder="Nombre de la alumna"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-500 focus:outline-none transition-all" />
          </div>

          {/* Cédula + Edad */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Cédula</label>
              <input value={form.cedula} onChange={e => set('cedula', e.target.value)}
                placeholder="0000000000"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-500 focus:outline-none transition-all" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">Edad</label>
              <input type="number" min={1} max={99} value={form.age} onChange={e => set('age', e.target.value)}
                placeholder="Años"
                className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-500 focus:outline-none transition-all" />
            </div>
          </div>

          {/* Teléfono */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Teléfono</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)}
              placeholder="09xxxxxxxx"
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-500 focus:outline-none transition-all" />
          </div>

          {/* Es menor */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input type="checkbox" checked={form.is_minor} onChange={e => set('is_minor', e.target.checked)}
              className="w-4 h-4 rounded accent-purple-600" />
            <span className="text-sm text-gray-700">Es menor de edad (tiene representante)</span>
          </label>

          {form.is_minor && (
            <div className="bg-purple-50 rounded-xl p-3 space-y-3 border border-purple-100">
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Nombre del representante *</label>
                <input value={form.parent_name} onChange={e => set('parent_name', e.target.value)}
                  placeholder="Nombre completo"
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-500 focus:outline-none transition-all" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 block mb-1">Teléfono del representante</label>
                <input value={form.parent_phone} onChange={e => set('parent_phone', e.target.value)}
                  placeholder="09xxxxxxxx"
                  className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-500 focus:outline-none transition-all" />
              </div>
            </div>
          )}

          {/* Curso */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Curso *</label>
            <select required value={form.course_id} onChange={e => set('course_id', e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-500 focus:outline-none transition-all">
              <option value="">— Selecciona un curso —</option>
              {ACTIVE_COURSES.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Notas */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">Notas (opcional)</label>
            <textarea rows={2} value={form.notes} onChange={e => set('notes', e.target.value)}
              placeholder="Observaciones adicionales..."
              className="w-full border-2 border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-500 focus:outline-none resize-none transition-all" />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 rounded-xl px-3 py-2 text-sm">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving || !form.name.trim() || !form.course_id}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 active:scale-95 transition-all"
              style={{ background: PURPLE }}>
              {saving ? 'Registrando...' : 'Registrar alumna'}
            </button>
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-sm font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 active:scale-95 transition-all">
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}

// ── Fila de alumna ────────────────────────────────────────────────
function StudentRow({ student, onPago, onDetail }) {
  const course  = getCourseById(student.course_id)
  const status  = getPaymentStatus(student)
  const initials = student.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()

  return (
    <div className="bg-white rounded-2xl border border-gray-100 px-4 py-3 flex items-center gap-3 hover:border-purple-200 transition-colors">
      {/* Avatar */}
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
        style={{ background: PURPLE }}>
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0" onClick={onDetail} role="button" tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && onDetail()}
        className="flex-1 min-w-0 cursor-pointer">
        <p className="font-semibold text-gray-800 text-sm truncate">{student.name}</p>
        <p className="text-xs text-gray-400 truncate">
          {course?.name || student.course_id}
          {student.is_minor && student.parent_name ? ` · Rep: ${student.parent_name}` : ''}
        </p>
      </div>

      {/* Estado */}
      <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0"
        style={{ color: status.color, background: status.bg }}>
        {status.label}
      </span>

      {/* Botón pago */}
      <button onClick={onPago} title="Registrar pago"
        className="shrink-0 flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl text-white active:scale-95 transition-all hover:opacity-90"
        style={{ background: PURPLE }}>
        <CreditCard size={13} /> Pago
      </button>
    </div>
  )
}

// ── Modal detalle alumna ─────────────────────────────────────────
function StudentDetailModal({ student, onClose, onPago }) {
  const course  = getCourseById(student.course_id)
  const status  = getPaymentStatus(student)

  return (
    <Modal isOpen={true} onClose={onClose} ariaLabel="Detalle alumna">
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <div className="bg-white/20 p-1.5 rounded-xl"><User size={16} /></div>
            <h3 className="font-semibold text-base">Detalle alumna</h3>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-1.5 hover:bg-white/20 rounded-xl active:scale-95 transition-all">
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Nombre + estado */}
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ background: PURPLE }}>
              {student.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="font-bold text-gray-800">{student.name}</p>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={{ color: status.color, background: status.bg }}>
                {status.label}
              </span>
            </div>
          </div>

          {/* Info */}
          <div className="space-y-2 text-sm">
            {student.cedula && (
              <div className="flex items-center gap-2 text-gray-600">
                <User size={14} className="text-gray-400" /> Cédula: <span className="font-medium">{student.cedula}</span>
              </div>
            )}
            {student.phone && (
              <div className="flex items-center gap-2 text-gray-600">
                <Phone size={14} className="text-gray-400" />
                <a href={`tel:${student.phone}`} className="font-medium text-purple-700">{student.phone}</a>
              </div>
            )}
            {student.is_minor && student.parent_name && (
              <div className="flex items-center gap-2 text-gray-600">
                <Users size={14} className="text-gray-400" /> Rep: <span className="font-medium">{student.parent_name}</span>
                {student.parent_phone && (
                  <a href={`tel:${student.parent_phone}`} className="text-purple-700 font-medium">{student.parent_phone}</a>
                )}
              </div>
            )}
            {course && (
              <div className="bg-purple-50 rounded-xl px-3 py-2 mt-2">
                <p className="font-semibold text-purple-800 text-xs">{course.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">{course.schedule} · ${course.price}/{course.priceType === 'mes' ? 'mes' : 'programa'}</p>
              </div>
            )}
            {student.notes && (
              <p className="text-xs text-gray-500 italic bg-gray-50 rounded-xl px-3 py-2">{student.notes}</p>
            )}
          </div>

          <button onClick={() => { onClose(); onPago() }}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: PURPLE }}>
            <span className="flex items-center justify-center gap-2">
              <CreditCard size={15} /> Registrar pago
            </span>
          </button>
        </div>
      </div>
    </Modal>
  )
}

// ── Dashboard principal ───────────────────────────────────────────
export default function RecepcionDashboard({ onLogout, userName }) {
  const [students, setStudents]       = useState([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [payStudent, setPayStudent]   = useState(null)   // alumna en PaymentModal
  const [detailStudent, setDetailStudent] = useState(null) // alumna en detalle
  const [showNueva, setShowNueva]     = useState(false)
  const [toast, setToast]             = useState('')

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const fetchStudents = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('students')
      .select('id, name, cedula, phone, age, is_minor, parent_name, parent_phone, course_id, next_payment_date, amount_paid, total_program_price, active, notes')
      .order('name')
    setStudents(data || [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchStudents() }, [fetchStudents])

  // Filtro de búsqueda
  const filtered = students.filter(s => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    return (
      s.name?.toLowerCase().includes(q) ||
      s.cedula?.includes(q) ||
      s.parent_name?.toLowerCase().includes(q) ||
      s.phone?.includes(q)
    )
  })

  // Ordenar: atrasadas primero
  const sorted = [...filtered].sort((a, b) => getPaymentStatus(a).priority - getPaymentStatus(b).priority)

  // Conteos para header
  const atrasadas = students.filter(s => getPaymentStatus(s).priority === 0).length
  const proximas  = students.filter(s => getPaymentStatus(s).priority === 1).length

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-30">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: PURPLE }}>
              <User size={16} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-800 text-sm leading-tight">Studio Dancers</p>
              <p className="text-xs text-gray-400 leading-tight">{userName || 'Recepción'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {atrasadas > 0 && (
              <span className="text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                {atrasadas} atrasada{atrasadas !== 1 ? 's' : ''}
              </span>
            )}
            <button onClick={onLogout} title="Cerrar sesión"
              className="p-2 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-600 active:scale-95 transition-all">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </header>

      {/* Contenido */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-3">

        {/* Búsqueda + nueva */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-purple-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nombre, cédula o representante..."
              className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-500 focus:outline-none bg-white transition-all"
            />
            {search && (
              <button onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <X size={14} />
              </button>
            )}
          </div>
          <button onClick={() => setShowNueva(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shrink-0"
            style={{ background: PURPLE }}>
            <Plus size={15} /> Nueva
          </button>
        </div>

        {/* Resumen rápido */}
        {!search && (
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Total',     value: students.length, icon: Users,        color: PURPLE,    bg: '#F3E5F5' },
              { label: 'Atrasadas', value: atrasadas,       icon: AlertCircle,  color: '#e53935', bg: '#ffebee' },
              { label: 'Por vencer',value: proximas,        icon: Clock,        color: '#F4A261', bg: '#fff3e0' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} className="bg-white rounded-2xl border border-gray-100 px-2 py-2 text-center">
                <Icon size={14} className="mx-auto mb-0.5" style={{ color }} />
                <p className="text-base font-bold leading-tight" style={{ color }}>{value}</p>
                <p className="text-[9px] text-gray-400 leading-tight">{label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-700 rounded-full animate-spin" />
          </div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Search size={32} className="mx-auto mb-2 text-gray-300" />
            <p className="font-medium text-gray-600 text-sm">
              {search ? 'No se encontraron alumnas' : 'Sin alumnas registradas'}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {search && (
              <p className="text-xs text-gray-400 px-1">{sorted.length} resultado{sorted.length !== 1 ? 's' : ''}</p>
            )}
            {sorted.map(s => (
              <StudentRow
                key={s.id}
                student={s}
                onPago={() => setPayStudent(s)}
                onDetail={() => setDetailStudent(s)}
              />
            ))}
          </div>
        )}
      </div>

      {/* PaymentModal */}
      {payStudent && (
        <PaymentModal
          student={payStudent}
          onClose={() => setPayStudent(null)}
          onPaymentComplete={() => {
            setPayStudent(null)
            fetchStudents()
            showToast('✓ Pago registrado')
          }}
        />
      )}

      {/* Detalle alumna */}
      {detailStudent && (
        <StudentDetailModal
          student={detailStudent}
          onClose={() => setDetailStudent(null)}
          onPago={() => setPayStudent(detailStudent)}
        />
      )}

      {/* Modal nueva alumna */}
      {showNueva && (
        <NuevaAlumnaModal
          onClose={() => setShowNueva(false)}
          onCreated={() => {
            fetchStudents()
            showToast('✓ Alumna registrada')
          }}
        />
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white shadow-lg z-50"
          style={{ background: GREEN }}>
          <CheckCircle2 size={16} /> {toast}
        </div>
      )}
    </div>
  )
}
