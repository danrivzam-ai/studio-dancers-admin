import { useState, useEffect } from 'react'
import { Plus, Edit2, Trash2, X, Check } from 'lucide-react'
import { getDiarioList, createDiarioEntry, updateDiarioEntry, deleteDiarioEntry } from '../../../lib/adultas'

const ANIMOS = [
  { id: 'feliz',     emoji: '😊', label: 'Feliz'     },
  { id: 'motivada',  emoji: '💪', label: 'Motivada'  },
  { id: 'cansada',   emoji: '😴', label: 'Cansada'   },
  { id: 'frustrada', emoji: '😤', label: 'Frustrada' },
  { id: 'neutral',   emoji: '😐', label: 'Neutral'   },
]

function todayEC() {
  const now = new Date()
  const utcMs = now.getTime() + now.getTimezoneOffset() * 60000
  const ec = new Date(utcMs - 5 * 3600000)
  return ec.toISOString().slice(0, 10)
}

function formatFecha(dateStr) {
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-EC', {
    weekday: 'long', day: 'numeric', month: 'long'
  })
}

export default function TabDiario({ auth, student }) {
  const [entradas, setEntradas] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState(null)       // entrada objeto o null
  const [form, setForm] = useState({ fecha: todayEC(), contenido: '', estado_animo: null })
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(null)

  async function loadEntradas() {
    const { data } = await getDiarioList(auth.cedula, auth.phone4, student.id, 50)
    setEntradas(data)
    setLoading(false)
  }

  useEffect(() => { loadEntradas() }, [auth, student])

  function openNew() {
    setEditing(null)
    setForm({ fecha: todayEC(), contenido: '', estado_animo: null })
    setShowForm(true)
  }

  function openEdit(entrada) {
    setEditing(entrada)
    setForm({ fecha: entrada.fecha, contenido: entrada.contenido, estado_animo: entrada.estado_animo })
    setShowForm(true)
  }

  async function handleSave() {
    if (!form.contenido.trim()) return
    setSaving(true)
    if (editing) {
      await updateDiarioEntry(auth.cedula, auth.phone4, student.id, editing.entrada_id, form.contenido, form.estado_animo)
    } else {
      await createDiarioEntry(auth.cedula, auth.phone4, student.id, form.fecha, form.contenido, form.estado_animo)
    }
    setSaving(false)
    setShowForm(false)
    loadEntradas()
  }

  async function handleDelete(entradaId) {
    if (!window.confirm('¿Eliminar esta entrada?')) return
    setDeleting(entradaId)
    await deleteDiarioEntry(auth.cedula, auth.phone4, student.id, entradaId)
    setDeleting(null)
    setEntradas(prev => prev.filter(e => e.entrada_id !== entradaId))
  }

  return (
    <div className="px-4 pt-5 pb-20 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Mi diario</h2>
          <p className="text-xs text-gray-500 mt-0.5">Solo tú puedes ver esto</p>
        </div>
        <button
          onClick={openNew}
          className="flex items-center gap-1.5 bg-purple-600 text-white text-sm font-medium px-3 py-2 rounded-xl hover:bg-purple-700 transition-colors"
        >
          <Plus size={15} />
          Nueva entrada
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-2xl shadow-sm border border-purple-100 p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-700">
              {editing ? 'Editar entrada' : 'Nueva entrada'}
            </p>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
              <X size={16} />
            </button>
          </div>

          {/* Fecha */}
          {!editing && (
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-500 mb-1">Fecha</label>
              <input
                type="date"
                value={form.fecha}
                onChange={e => setForm(f => ({ ...f, fecha: e.target.value }))}
                max={todayEC()}
                className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          )}

          {/* Estado de ánimo */}
          <div className="mb-3">
            <label className="block text-xs font-medium text-gray-500 mb-2">¿Cómo te sentiste? (opcional)</label>
            <div className="flex gap-2 flex-wrap">
              {ANIMOS.map(a => (
                <button
                  key={a.id}
                  onClick={() => setForm(f => ({ ...f, estado_animo: f.estado_animo === a.id ? null : a.id }))}
                  className={`flex items-center gap-1 px-2.5 py-1.5 rounded-full text-xs border transition-all ${
                    form.estado_animo === a.id
                      ? 'border-purple-400 bg-purple-50 text-purple-700 font-semibold'
                      : 'border-gray-200 text-gray-600'
                  }`}
                >
                  {a.emoji} {a.label}
                </button>
              ))}
            </div>
          </div>

          {/* Texto */}
          <textarea
            value={form.contenido}
            onChange={e => setForm(f => ({ ...f, contenido: e.target.value }))}
            rows={5}
            placeholder="¿Cómo estuvo tu clase? ¿Qué sentiste? ¿Qué te gustó? ¿Qué te costó?"
            className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-400 resize-none"
          />

          <button
            onClick={handleSave}
            disabled={saving || !form.contenido.trim()}
            className="w-full mt-3 py-2.5 bg-purple-600 text-white font-semibold text-sm rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
            ) : (
              <><Check size={15} /> Guardar</>
            )}
          </button>
        </div>
      )}

      {/* Lista de entradas */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
        </div>
      ) : entradas.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <span className="text-4xl mb-3 block">📓</span>
          <p className="text-sm font-medium text-gray-600">Tu diario está vacío</p>
          <p className="text-xs mt-1">Escribe cómo fue tu primera clase</p>
        </div>
      ) : (
        <div className="space-y-3">
          {entradas.map(e => (
            <div key={e.entrada_id} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <p className="text-xs font-semibold text-gray-500 capitalize">{formatFecha(e.fecha)}</p>
                  {e.estado_animo && (
                    <span className="text-base">{ANIMOS.find(a => a.id === e.estado_animo)?.emoji}</span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => openEdit(e)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-purple-600 transition-colors"
                  >
                    <Edit2 size={13} />
                  </button>
                  <button
                    onClick={() => handleDelete(e.entrada_id)}
                    disabled={deleting === e.entrada_id}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    {deleting === e.entrada_id
                      ? <div className="w-3 h-3 border border-red-300 border-t-red-500 rounded-full animate-spin" />
                      : <Trash2 size={13} />
                    }
                  </button>
                </div>
              </div>
              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{e.contenido}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
