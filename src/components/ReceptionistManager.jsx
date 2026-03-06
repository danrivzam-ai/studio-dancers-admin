import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Plus, Edit2, Trash2, Eye, EyeOff, X, Shield, Check } from 'lucide-react'

const EMPTY_FORM = { name: '', username: '', password: '', active: true }

export default function ReceptionistManager() {
  const [receptionists, setReceptionists] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [showPw, setShowPw] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const fetchReceptionists = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('receptionists')
      .select('*')
      .order('created_at', { ascending: true })
    if (data) setReceptionists(data)
    setLoading(false)
  }

  useEffect(() => { fetchReceptionists() }, [])

  const openCreate = () => {
    setForm(EMPTY_FORM)
    setEditingId(null)
    setShowPw(false)
    setError('')
    setShowForm(true)
  }

  const openEdit = (r) => {
    setForm({ name: r.name, username: r.username, password: r.password, active: r.active })
    setEditingId(r.id)
    setShowPw(false)
    setError('')
    setShowForm(true)
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim() || !form.username.trim() || !form.password.trim()) {
      setError('Todos los campos son requeridos')
      return
    }
    setSaving(true)
    setError('')
    try {
      const payload = {
        name: form.name.trim(),
        username: form.username.trim().toLowerCase(),
        password: form.password.trim(),
        active: form.active
      }
      if (editingId) {
        const { error: err } = await supabase.from('receptionists').update(payload).eq('id', editingId)
        if (err) throw err
      } else {
        const { error: err } = await supabase.from('receptionists').insert(payload)
        if (err) throw err
      }
      await fetchReceptionists()
      setShowForm(false)
    } catch (err) {
      setError(err.message.includes('unique') ? 'Ese nombre de usuario ya existe' : err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleActive = async (r) => {
    await supabase.from('receptionists').update({ active: !r.active }).eq('id', r.id)
    setReceptionists(prev => prev.map(x => x.id === r.id ? { ...x, active: !x.active } : x))
  }

  const handleDelete = async (id) => {
    await supabase.from('receptionists').delete().eq('id', id)
    setReceptionists(prev => prev.filter(x => x.id !== id))
    setDeleteConfirm(null)
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Gestión de Recepcionistas</h2>
          <p className="text-sm text-gray-500">
            {receptionists.length} cuenta{receptionists.length !== 1 ? 's' : ''} registrada{receptionists.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
        >
          <Plus size={18} />
          Nueva
        </button>
      </div>

      {/* List */}
      {loading ? (
        <div className="text-center py-12 text-gray-400">Cargando...</div>
      ) : receptionists.length === 0 ? (
        <div className="text-center py-12 text-gray-400 bg-white rounded-2xl border-2 border-dashed border-gray-200">
          <Shield size={40} className="mx-auto mb-3 opacity-30" />
          <p className="font-medium">No hay recepcionistas registradas</p>
          <button onClick={openCreate} className="mt-3 text-purple-600 hover:underline text-sm font-medium">
            Crear la primera
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {receptionists.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                <span className="text-purple-700 font-bold">{r.name.charAt(0).toUpperCase()}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-800 truncate">{r.name}</p>
                <p className="text-xs text-gray-400">@{r.username}</p>
              </div>

              {/* Badge */}
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${
                r.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {r.active ? 'Activa' : 'Inactiva'}
              </span>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(r)}
                  className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  title="Editar / cambiar contraseña"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => toggleActive(r)}
                  className={`p-2 rounded-lg transition-colors ${
                    r.active
                      ? 'text-gray-400 hover:text-orange-500 hover:bg-orange-50'
                      : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                  }`}
                  title={r.active ? 'Desactivar cuenta' : 'Activar cuenta'}
                >
                  {r.active ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={() => setDeleteConfirm(r.id)}
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Eliminar"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-6 pt-5 pb-4 border-b flex items-center justify-between">
              <h3 className="font-bold text-gray-800">
                {editingId ? 'Editar recepcionista' : 'Nueva recepcionista'}
              </h3>
              <button onClick={() => setShowForm(false)} className="p-1.5 hover:bg-gray-100 rounded-lg">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nombre completo</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-sm"
                  placeholder="Ej: Gabriela Suárez"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Usuario (para login)</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                  className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-sm"
                  placeholder="ej: gabriela.suarez"
                  autoCapitalize="none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  {editingId ? 'Contraseña (editar para cambiar)' : 'Contraseña'}
                </label>
                <div className="relative">
                  <input
                    type={showPw ? 'text' : 'password'}
                    value={form.password}
                    onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full px-4 pr-12 py-2.5 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all text-sm"
                    placeholder="Contraseña de acceso"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPw(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <label className="flex items-center gap-2.5 cursor-pointer">
                <div
                  onClick={() => setForm(f => ({ ...f, active: !f.active }))}
                  className={`w-10 h-6 rounded-full transition-colors flex items-center px-0.5 ${form.active ? 'bg-purple-600' : 'bg-gray-300'}`}
                >
                  <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${form.active ? 'translate-x-4' : 'translate-x-0'}`} />
                </div>
                <span className="text-sm text-gray-700">Cuenta activa</span>
              </label>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 text-white rounded-xl text-sm font-semibold disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 100%)' }}
                >
                  {saving ? 'Guardando...' : editingId ? 'Guardar cambios' : 'Crear cuenta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Trash2 className="text-red-600" size={24} />
            </div>
            <h3 className="font-bold text-gray-800 mb-1">¿Eliminar recepcionista?</h3>
            <p className="text-sm text-gray-500 mb-5">Esta acción no se puede deshacer.</p>
            <div className="flex gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
