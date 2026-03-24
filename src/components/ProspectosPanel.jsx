import { useState, useEffect } from 'react'
import {
  Plus, X, Edit2, Trash2, UserCheck, Search,
  Phone, MessageCircle, ChevronDown, ChevronUp,
  Instagram, Globe, Users, Loader2
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useLeads, LEAD_ESTADOS, LEAD_FUENTES } from '../hooks/useLeads'

const DAY_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function formatSlotLabel(slot) {
  const dia  = DAY_NAMES[slot.day_of_week] || ''
  const h1   = slot.time_start?.substring(0, 5) || ''
  const h2   = slot.time_end?.substring(0, 5) || ''
  const grupo = slot.group_name ? ` · ${slot.group_name}` : ''
  return `${dia} ${h1}–${h2}${grupo}`
}

const emptyForm = {
  nombre: '', telefono: '', email: '', programa: '', horario_pref: '',
  edad: '', is_minor: false, nombre_rep: '', fuente: 'whatsapp',
  estado: 'nuevo', notas: '',
}

function estadoInfo(val) {
  return LEAD_ESTADOS.find(e => e.value === val) || LEAD_ESTADOS[0]
}

function fuenteIcon(fuente) {
  if (fuente === 'instagram') return <Instagram size={12} />
  if (fuente === 'web')       return <Globe size={12} />
  return <MessageCircle size={12} />
}

/* ── Formulario crear / editar ─────────────────────────────────── */
function LeadForm({ lead, onSave, onClose, allCourses = [] }) {
  const [form, setForm]       = useState(lead ? { ...emptyForm, ...lead } : { ...emptyForm })
  const [saving, setSaving]   = useState(false)
  const [err, setErr]         = useState('')
  const [slots, setSlots]     = useState([])
  const [loadingSlots, setLoadingSlots] = useState(false)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  // Carga los horarios reales del curso seleccionado
  useEffect(() => {
    if (!form.programa) { setSlots([]); return }
    const course = allCourses.find(c => c.name === form.programa)
    const courseUUID = course?.supabase_id || course?.id
    if (!courseUUID || courseUUID === course?.code) { setSlots([]); return }
    setLoadingSlots(true)
    supabase
      .from('instructor_schedule')
      .select('id, day_of_week, time_start, time_end, group_name')
      .eq('course_id', courseUUID)
      .order('day_of_week')
      .order('time_start')
      .then(({ data }) => {
        setSlots(data || [])
        setLoadingSlots(false)
      })
  }, [form.programa])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.nombre.trim()) { setErr('El nombre es requerido'); return }
    setSaving(true)
    setErr('')
    try {
      await onSave({
        ...form,
        nombre: form.nombre.trim(),
        telefono: form.telefono.trim() || null,
        email: form.email.trim() || null,
        edad: form.edad !== '' ? parseInt(form.edad) : null,
        nombre_rep: form.is_minor ? form.nombre_rep.trim() || null : null,
      })
      onClose()
    } catch (e) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-white rounded-t-3xl px-5 pt-5 pb-3 border-b border-gray-100 flex items-center justify-between z-10">
          <h2 className="text-lg font-bold text-gray-800">
            {lead ? 'Editar prospecto' : 'Nuevo prospecto'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
            <input
              type="text"
              value={form.nombre}
              onChange={e => set('nombre', e.target.value)}
              placeholder="Nombre completo"
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#7e2d55] focus:ring-4 focus:ring-[#f9e8f0] outline-none transition-all"
            />
          </div>

          {/* Teléfono + Email */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
              <input
                type="tel"
                value={form.telefono}
                onChange={e => set('telefono', e.target.value)}
                placeholder="09XX XXX XXX"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#7e2d55] focus:ring-4 focus:ring-[#f9e8f0] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={form.email}
                onChange={e => set('email', e.target.value)}
                placeholder="correo@..."
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#7e2d55] focus:ring-4 focus:ring-[#f9e8f0] outline-none transition-all"
              />
            </div>
          </div>

          {/* Programa */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Programa de interés</label>
            <select
              value={form.programa}
              onChange={e => { set('programa', e.target.value); set('horario_pref', '') }}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#7e2d55] outline-none bg-white"
            >
              <option value="">— Seleccionar —</option>
              {allCourses.map(c => (
                <option key={c.id || c.code} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>

          {/* Horario — carga los slots reales del curso */}
          {form.programa && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Horario disponible
                {loadingSlots && <Loader2 size={12} className="inline ml-2 animate-spin text-gray-400" />}
              </label>
              {!loadingSlots && slots.length === 0 ? (
                <input
                  type="text"
                  value={form.horario_pref}
                  onChange={e => set('horario_pref', e.target.value)}
                  placeholder="ej: Martes y Jueves tarde"
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#7e2d55] focus:ring-4 focus:ring-[#f9e8f0] outline-none transition-all"
                />
              ) : (
                <select
                  value={form.horario_pref}
                  onChange={e => set('horario_pref', e.target.value)}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#7e2d55] outline-none bg-white"
                  disabled={loadingSlots}
                >
                  <option value="">— Seleccionar horario —</option>
                  {slots.map(s => (
                    <option key={s.id} value={formatSlotLabel(s)}>{formatSlotLabel(s)}</option>
                  ))}
                  <option value="Flexible">Flexible / cualquier horario</option>
                </select>
              )}
            </div>
          )}

          {/* Edad + Menor */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Edad</label>
              <input
                type="number"
                min="2"
                max="80"
                value={form.edad}
                onChange={e => {
                  const v = e.target.value
                  set('edad', v)
                  if (v && parseInt(v) < 18) set('is_minor', true)
                  else set('is_minor', false)
                }}
                placeholder="—"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#7e2d55] focus:ring-4 focus:ring-[#f9e8f0] outline-none transition-all"
              />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <div
                  onClick={() => set('is_minor', !form.is_minor)}
                  className={`w-10 h-6 rounded-full transition-colors ${form.is_minor ? 'bg-[#7e2d55]' : 'bg-gray-300'} relative`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${form.is_minor ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm font-medium text-gray-700">Es menor de edad</span>
              </label>
            </div>
          </div>

          {/* Representante (si menor) */}
          {form.is_minor && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del representante</label>
              <input
                type="text"
                value={form.nombre_rep}
                onChange={e => set('nombre_rep', e.target.value)}
                placeholder="Papá / Mamá / Tutor"
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#7e2d55] focus:ring-4 focus:ring-[#f9e8f0] outline-none transition-all"
              />
            </div>
          )}

          {/* Fuente + Estado */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fuente</label>
              <select
                value={form.fuente}
                onChange={e => set('fuente', e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#7e2d55] outline-none bg-white"
              >
                {LEAD_FUENTES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
              <select
                value={form.estado}
                onChange={e => set('estado', e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#7e2d55] outline-none bg-white"
              >
                {LEAD_ESTADOS.filter(e => e.value !== 'convertido').map(e => (
                  <option key={e.value} value={e.value}>{e.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notas</label>
            <textarea
              rows={3}
              value={form.notas}
              onChange={e => set('notas', e.target.value)}
              placeholder="Observaciones, consultas específicas, etc."
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#7e2d55] focus:ring-4 focus:ring-[#f9e8f0] outline-none transition-all resize-none"
            />
          </div>

          {err && <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-xl">{err}</p>}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={saving}
              className="flex-1 bg-[#7e2d55] hover:bg-[#551735] disabled:opacity-50 text-white font-semibold py-3 rounded-xl active:scale-95 transition-all"
            >
              {saving ? 'Guardando…' : lead ? 'Actualizar' : 'Guardar prospecto'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 text-gray-500 hover:bg-gray-100 rounded-xl transition-all"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

/* ── Tarjeta de prospecto ──────────────────────────────────────── */
function LeadCard({ lead, onEdit, onDelete, onMatricular, onEstadoChange }) {
  const [expanded, setExpanded] = useState(false)
  const est = estadoInfo(lead.estado)

  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const creadoLocal = new Date(lead.creado_en); creadoLocal.setHours(0,0,0,0)
  const diasDesde = Math.max(0, Math.round((hoy - creadoLocal) / 86400000))

  return (
    <div className={`bg-white rounded-2xl border-2 transition-all ${
      lead.estado === 'convertido' ? 'border-purple-200 opacity-70' :
      lead.estado === 'perdido'    ? 'border-red-100 opacity-60' :
                                     'border-gray-100 hover:border-[#e8b4cc]'
    }`}>
      {/* Cabecera */}
      <div
        className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800 text-sm truncate">{lead.nombre}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${est.color}`}>
              {est.label}
            </span>
            {lead.is_minor && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-pink-100 text-pink-700">Menor</span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
            {lead.programa && <span className="text-xs text-[#7e2d55] font-medium">{lead.programa}</span>}
            {lead.horario_pref && <span className="text-xs text-gray-400">{lead.horario_pref}</span>}
            {lead.telefono && (
              <span className="flex items-center gap-1 text-xs text-gray-500">
                <Phone size={10} />{lead.telefono}
              </span>
            )}
            <span className="flex items-center gap-1 text-xs text-gray-400">
              {fuenteIcon(lead.fuente)}
              {LEAD_FUENTES.find(f => f.value === lead.fuente)?.label || lead.fuente}
            </span>
            <span className="text-[10px] text-gray-400">
              {diasDesde === 0 ? 'Hoy' : diasDesde === 1 ? 'Ayer' : `Hace ${diasDesde}d`}
            </span>
          </div>
        </div>
        <div className="shrink-0">
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {/* Detalle expandido */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          {/* Info */}
          <div className="grid grid-cols-2 gap-2 text-sm">
            {lead.edad && (
              <div><span className="text-gray-400 text-xs">Edad</span><p className="font-medium">{lead.edad} años</p></div>
            )}
            {lead.horario_pref && (
              <div><span className="text-gray-400 text-xs">Horario</span><p className="font-medium">{lead.horario_pref}</p></div>
            )}
            {lead.email && (
              <div className="col-span-2"><span className="text-gray-400 text-xs">Email</span><p className="font-medium text-xs">{lead.email}</p></div>
            )}
            {lead.nombre_rep && (
              <div className="col-span-2"><span className="text-gray-400 text-xs">Representante</span><p className="font-medium">{lead.nombre_rep}</p></div>
            )}
          </div>

          {lead.notas && (
            <div className="bg-gray-50 rounded-xl px-3 py-2 text-sm text-gray-600 italic">
              {lead.notas}
            </div>
          )}

          {/* Cambiar estado rápido */}
          {lead.estado !== 'convertido' && (
            <div>
              <p className="text-xs text-gray-400 mb-1.5">Cambiar estado</p>
              <div className="flex gap-1.5 flex-wrap">
                {LEAD_ESTADOS.filter(e => e.value !== 'convertido' && e.value !== lead.estado).map(e => (
                  <button
                    key={e.value}
                    onClick={() => onEstadoChange(lead.id, e.value)}
                    className={`text-xs px-2.5 py-1 rounded-full font-medium ${e.color} active:scale-95 transition-all`}
                  >
                    {e.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Acciones */}
          <div className="flex gap-2 pt-1">
            {lead.estado !== 'convertido' && (
              <button
                onClick={() => onMatricular(lead)}
                className="flex items-center gap-1.5 bg-[#7e2d55] hover:bg-[#551735] text-white text-sm font-medium px-3 py-2 rounded-xl active:scale-95 transition-all"
              >
                <UserCheck size={14} />
                Matricular
              </button>
            )}
            {lead.telefono && (
              <a
                href={`https://wa.me/593${lead.telefono.replace(/^0/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 text-white text-sm font-medium px-3 py-2 rounded-xl active:scale-95 transition-all"
              >
                <MessageCircle size={14} />
                WhatsApp
              </a>
            )}
            <button
              onClick={() => onEdit(lead)}
              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
              title="Editar"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={() => onDelete(lead.id)}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
              title="Eliminar"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

/* ── Panel principal ───────────────────────────────────────────── */
export default function ProspectosPanel({ allCourses = [], onMatricularLead }) {
  const { leads, loading, fetchLeads, createLead, updateLead, deleteLead } = useLeads()
  const [showForm, setShowForm]   = useState(false)
  const [editing, setEditing]     = useState(null)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [search, setSearch]       = useState('')

  useEffect(() => { fetchLeads() }, [])

  const handleSave = async (data) => {
    if (editing) {
      await updateLead(editing.id, data)
    } else {
      await createLead(data)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('¿Eliminar este prospecto?')) return
    await deleteLead(id)
  }

  const handleEstadoChange = async (id, estado) => {
    await updateLead(id, { estado })
  }

  // Filtros
  const filtered = leads.filter(l => {
    const matchEstado = filtroEstado === 'todos' || l.estado === filtroEstado
    const q = search.toLowerCase()
    const matchSearch = !q || l.nombre.toLowerCase().includes(q) ||
      (l.telefono || '').includes(q) || (l.programa || '').toLowerCase().includes(q)
    return matchEstado && matchSearch
  })

  // Conteos por estado
  const counts = LEAD_ESTADOS.reduce((acc, e) => {
    acc[e.value] = leads.filter(l => l.estado === e.value).length
    return acc
  }, {})
  const total = leads.filter(l => l.estado !== 'convertido' && l.estado !== 'perdido').length

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Prospectos</h2>
          <p className="text-sm text-gray-500">{total} activos · {counts.convertido || 0} convertidos</p>
        </div>
        <button
          onClick={() => { setEditing(null); setShowForm(true) }}
          className="flex items-center gap-2 bg-[#7e2d55] hover:bg-[#551735] text-white px-4 py-2.5 rounded-xl font-medium active:scale-95 transition-all text-sm"
        >
          <Plus size={16} />
          Nuevo prospecto
        </button>
      </div>

      {/* Filtros de estado */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setFiltroEstado('todos')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
            filtroEstado === 'todos' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Todos ({leads.length})
        </button>
        {LEAD_ESTADOS.map(e => (
          <button
            key={e.value}
            onClick={() => setFiltroEstado(e.value)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
              filtroEstado === e.value ? e.color + ' ring-2 ring-offset-1 ring-current' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {e.label} {counts[e.value] > 0 ? `(${counts[e.value]})` : ''}
          </button>
        ))}
      </div>

      {/* Búsqueda */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        <input
          type="text"
          placeholder="Buscar por nombre, teléfono o programa…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-[#7e2d55] focus:ring-4 focus:ring-[#f9e8f0] outline-none transition-all text-sm"
        />
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando prospectos…</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <Users size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400 font-medium">
            {search || filtroEstado !== 'todos' ? 'Sin resultados para ese filtro' : 'Aún no hay prospectos'}
          </p>
          {!search && filtroEstado === 'todos' && (
            <p className="text-sm text-gray-400 mt-1">Registra tu primer prospecto con el botón de arriba</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              onEdit={l => { setEditing(l); setShowForm(true) }}
              onDelete={handleDelete}
              onMatricular={onMatricularLead}
              onEstadoChange={handleEstadoChange}
            />
          ))}
        </div>
      )}

      {/* Modal formulario */}
      {showForm && (
        <LeadForm
          lead={editing}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditing(null) }}
          allCourses={allCourses}
        />
      )}
    </div>
  )
}
