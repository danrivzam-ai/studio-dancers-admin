import { useState } from 'react'
import { X, Plus, Edit2, Trash2, ChevronDown, ChevronUp, RotateCcw, Check, Palette, AlertTriangle } from 'lucide-react'
import { useCategoryManagement } from '../hooks/useCategoryManagement'
import Modal from './ui/Modal'

const PRESET_COLORS = [
  '#EF4444', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899',
  '#6366F1', '#10B981', '#6B7280', '#F97316', '#14B8A6',
  '#0EA5E9', '#D946EF'
]

const MAX_NAME_LENGTH = 40

const EMPTY_CATEGORY = { name: '', color: '#6B7280', monthly_budget: '', sort_order: '' }
const EMPTY_SUBCATEGORY = { name: '', category_id: '' }

export default function ManageCategories({ onClose }) {
  const {
    categories, loading,
    saveCategory, deleteCategory, reactivateCategory,
    saveSubcategory, deleteSubcategory, reactivateSubcategory
  } = useCategoryManagement()

  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState(null)
  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY)
  const [expandedCategory, setExpandedCategory] = useState(null)
  const [showSubForm, setShowSubForm] = useState(null)
  const [editingSubcategory, setEditingSubcategory] = useState(null)
  const [subForm, setSubForm] = useState(EMPTY_SUBCATEGORY)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [showInactive, setShowInactive] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null) // { type: 'category'|'subcategory', id, name }

  const showMessage = (type, msg) => {
    if (type === 'error') { setError(msg); setTimeout(() => setError(null), 5000) }
    else { setSuccess(msg); setTimeout(() => setSuccess(null), 3000) }
  }

  // Category form handlers
  const openCategoryForm = (category = null) => {
    if (category) {
      setEditingCategory(category.id)
      setCategoryForm({
        name: category.name,
        color: category.color || '#6B7280',
        monthly_budget: category.monthly_budget || '',
        sort_order: category.sort_order || ''
      })
    } else {
      setEditingCategory(null)
      setCategoryForm(EMPTY_CATEGORY)
    }
    setShowCategoryForm(true)
  }

  const closeCategoryForm = () => {
    setShowCategoryForm(false)
    setEditingCategory(null)
    setCategoryForm(EMPTY_CATEGORY)
  }

  const handleSaveCategory = async () => {
    if (!categoryForm.name.trim()) {
      showMessage('error', 'El nombre es requerido')
      return
    }
    setSaving(true)
    const data = editingCategory ? { ...categoryForm, id: editingCategory } : categoryForm
    const result = await saveCategory(data, !!editingCategory)
    setSaving(false)
    if (result.success) {
      showMessage('success', editingCategory ? 'Categoría actualizada' : 'Categoría creada')
      closeCategoryForm()
    } else {
      showMessage('error', result.error || 'Error al guardar')
    }
  }

  const handleDeleteCategory = async (id, name) => {
    setConfirmDelete({ type: 'category', id, name })
  }

  const handleDeleteSubcategoryConfirm = (id, name) => {
    setConfirmDelete({ type: 'subcategory', id, name })
  }

  const executeDelete = async () => {
    if (!confirmDelete) return
    const { type, id } = confirmDelete
    setConfirmDelete(null)
    if (type === 'category') {
      const result = await deleteCategory(id)
      if (result.success) showMessage('success', 'Categoría desactivada')
      else showMessage('error', result.error || 'Error al desactivar')
    } else {
      const result = await deleteSubcategory(id)
      if (result.success) showMessage('success', 'Subcategoría desactivada')
      else showMessage('error', result.error || 'Error al desactivar')
    }
  }

  const handleReactivateCategory = async (id) => {
    const result = await reactivateCategory(id)
    if (result.success) showMessage('success', 'Categoría reactivada')
    else showMessage('error', result.error || 'Error al reactivar')
  }

  // Subcategory form handlers
  const openSubForm = (categoryId, sub = null) => {
    if (sub) {
      setEditingSubcategory(sub.id)
      setSubForm({ name: sub.name, category_id: categoryId })
    } else {
      setEditingSubcategory(null)
      setSubForm({ name: '', category_id: categoryId })
    }
    setShowSubForm(categoryId)
  }

  const closeSubForm = () => {
    setShowSubForm(null)
    setEditingSubcategory(null)
    setSubForm(EMPTY_SUBCATEGORY)
  }

  const handleSaveSubcategory = async () => {
    if (!subForm.name.trim()) {
      showMessage('error', 'El nombre es requerido')
      return
    }
    setSaving(true)
    const data = editingSubcategory ? { ...subForm, id: editingSubcategory } : subForm
    const result = await saveSubcategory(data, !!editingSubcategory)
    setSaving(false)
    if (result.success) {
      showMessage('success', editingSubcategory ? 'Subcategoría actualizada' : 'Subcategoría creada')
      closeSubForm()
    } else {
      showMessage('error', result.error || 'Error al guardar')
    }
  }

  const handleReactivateSubcategory = async (id) => {
    const result = await reactivateSubcategory(id)
    if (result.success) showMessage('success', 'Subcategoría reactivada')
    else showMessage('error', result.error || 'Error al reactivar')
  }

  // Sort by sort_order first, then by name
  const sortedCategories = [...categories].sort((a, b) => {
    const orderA = a.sort_order ?? 999
    const orderB = b.sort_order ?? 999
    if (orderA !== orderB) return orderA - orderB
    return (a.name || '').localeCompare(b.name || '')
  })

  const filteredCategories = showInactive
    ? sortedCategories
    : sortedCategories.filter(c => c.active !== false)

  const activeCount = categories.filter(c => c.active !== false).length
  const inactiveCount = categories.filter(c => c.active === false).length

  return (
    <Modal isOpen={true} onClose={onClose} ariaLabel="Gestionar categorías">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-xl">
        {/* Header */}
        <div className="bg-purple-700 text-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Palette size={24} />
              <div>
                <h2 className="text-xl font-bold">Gestionar Categorías</h2>
                <p className="text-white/80 text-sm">{activeCount} activas{inactiveCount > 0 ? ` · ${inactiveCount} inactivas` : ''}</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Cerrar" className="p-2 hover:bg-white/20 rounded-xl active:scale-95 transition-all">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mx-4 mt-3 p-3 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm">
            {success}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {/* Toggle inactive */}
          {inactiveCount > 0 && (
            <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
                className="rounded"
              />
              Mostrar inactivas ({inactiveCount})
            </label>
          )}

          {/* Add category button */}
          {!showCategoryForm && (
            <button
              onClick={() => openCategoryForm()}
              className="w-full py-3 border border-dashed border-gray-300 rounded-xl text-gray-400 hover:text-purple-600 hover:bg-purple-50 hover:border-purple-300 transition-colors flex items-center justify-center gap-2 text-sm"
            >
              <Plus size={16} />
              Nueva categoría
            </button>
          )}

          {/* Category form */}
          {showCategoryForm && (
            <div className="bg-purple-50/60 p-4 rounded-xl border border-purple-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-purple-800 text-sm">
                  {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                </h3>
                <button onClick={closeCategoryForm} className="p-2 hover:bg-purple-100 rounded-lg active:scale-95 transition-all">
                  <X size={16} className="text-purple-400" />
                </button>
              </div>

              <div className="space-y-3">
                {/* Name */}
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value.slice(0, MAX_NAME_LENGTH) })}
                  className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-base bg-white"
                  placeholder="Nombre de la categoría *"
                  maxLength={MAX_NAME_LENGTH}
                  autoFocus
                />

                {/* Color picker inline */}
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1.5 block">Color</label>
                  <div className="flex gap-2 items-center flex-wrap">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCategoryForm({ ...categoryForm, color })}
                        className={`w-7 h-7 rounded-full transition-all ${
                          categoryForm.color === color
                            ? 'ring-2 ring-offset-2 ring-purple-500 scale-110'
                            : 'hover:scale-110'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <div className="relative">
                      <button
                        type="button"
                        className="w-7 h-7 rounded-full border-2 border-dashed border-gray-300 hover:border-purple-400 transition-all flex items-center justify-center text-gray-400 text-xs"
                        onClick={() => document.getElementById('cat-color-picker').click()}
                        title="Color personalizado"
                      >
                        +
                      </button>
                      <input
                        id="cat-color-picker"
                        type="color"
                        value={categoryForm.color}
                        onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Budget + Order */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Presupuesto mensual</label>
                    <div className="relative">
                      <input
                        type="number"
                        value={categoryForm.monthly_budget}
                        onChange={(e) => setCategoryForm({ ...categoryForm, monthly_budget: e.target.value })}
                        className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-base bg-white"
                        placeholder="$ Opcional"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 mb-1 block">Orden</label>
                    <input
                      type="number"
                      value={categoryForm.sort_order}
                      onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: e.target.value })}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all text-base bg-white"
                      placeholder="0, 1, 2..."
                      min="0"
                    />
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={closeCategoryForm}
                    className="px-4 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-white transition-colors text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveCategory}
                    disabled={saving || !categoryForm.name.trim()}
                    className="flex-1 flex items-center justify-center gap-2 bg-purple-700 hover:bg-purple-800 text-white px-4 py-2.5 rounded-xl font-medium disabled:opacity-50 active:scale-95 transition-all text-sm"
                  >
                    {saving ? (
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check size={16} />
                    )}
                    {saving ? 'Guardando...' : editingCategory ? 'Actualizar' : 'Crear categoría'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="text-center py-8 text-gray-500">Cargando categorías...</div>
          )}

          {/* Category list */}
          {!loading && filteredCategories.map(cat => {
            const isExpanded = expandedCategory === cat.id
            const subs = cat.expense_subcategories || []
            const activeSubs = subs.filter(s => s.active !== false)
            const inactiveSubs = subs.filter(s => s.active === false)
            const isActive = cat.active !== false

            return (
              <div key={cat.id} className={`rounded-xl border transition-all ${
                isActive ? 'border-gray-200 hover:border-gray-300' : 'border-gray-100 bg-gray-50 opacity-60'
              }`}>
                {/* Category header */}
                <button
                  type="button"
                  className="w-full p-3.5 flex items-center gap-3 text-left"
                  onClick={() => isActive && setExpandedCategory(isExpanded ? null : cat.id)}
                >
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: cat.color || '#6B7280' }}
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className={`font-semibold text-sm truncate ${isActive ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                      {cat.name}
                    </h4>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {activeSubs.length} subcategoría{activeSubs.length !== 1 ? 's' : ''}
                      {cat.monthly_budget ? ` · $${parseFloat(cat.monthly_budget).toLocaleString()}/mes` : ''}
                    </p>
                  </div>
                  {isActive ? (
                    <div className="flex items-center gap-0.5">
                      <span
                        role="button"
                        onClick={(e) => { e.stopPropagation(); openCategoryForm(cat) }}
                        className="p-2 text-gray-300 hover:text-purple-600 hover:bg-purple-50 rounded-lg active:scale-95 transition-all"
                        title="Editar"
                      >
                        <Edit2 size={15} />
                      </span>
                      <span
                        role="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteCategory(cat.id, cat.name) }}
                        className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg active:scale-95 transition-all"
                        title="Desactivar"
                      >
                        <Trash2 size={15} />
                      </span>
                      <ChevronDown size={16} className={`text-gray-300 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  ) : (
                    <span
                      role="button"
                      onClick={() => handleReactivateCategory(cat.id)}
                      className="flex items-center gap-1 px-3 py-1.5 text-xs text-green-700 bg-green-50 hover:bg-green-100 rounded-lg active:scale-95 transition-all"
                    >
                      <RotateCcw size={12} />
                      Reactivar
                    </span>
                  )}
                </button>

                {/* Subcategories (expanded) */}
                {isExpanded && isActive && (
                  <div className="border-t border-gray-100 px-3.5 pb-3 pt-2 space-y-1.5">
                    {/* Active subcategories */}
                    {activeSubs.map(sub => (
                      <div key={sub.id} className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 group transition-colors">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
                        <span className="flex-1 text-sm text-gray-600">{sub.name}</span>
                        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openSubForm(cat.id, sub)}
                            className="p-1.5 text-gray-300 hover:text-purple-600 hover:bg-purple-50 rounded-lg active:scale-95 transition-all"
                            title="Editar"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => handleDeleteSubcategoryConfirm(sub.id, sub.name)}
                            className="p-1.5 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-lg active:scale-95 transition-all"
                            title="Desactivar"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {/* Inactive subcategories */}
                    {showInactive && inactiveSubs.length > 0 && inactiveSubs.map(sub => (
                      <div key={sub.id} className="flex items-center gap-2 px-3 py-2 rounded-lg opacity-50">
                        <span className="w-1.5 h-1.5 rounded-full bg-gray-200 flex-shrink-0" />
                        <span className="flex-1 text-sm text-gray-400 line-through">{sub.name}</span>
                        <button
                          onClick={() => handleReactivateSubcategory(sub.id)}
                          className="text-xs text-green-600 hover:text-green-700 px-2 py-1 hover:bg-green-50 rounded-lg transition-all"
                        >
                          Reactivar
                        </button>
                      </div>
                    ))}

                    {activeSubs.length === 0 && showSubForm !== cat.id && (
                      <p className="text-center text-xs text-gray-400 py-3">Sin subcategorías</p>
                    )}

                    {/* Subcategory form */}
                    {showSubForm === cat.id ? (
                      <div className="flex gap-2 items-center pt-1">
                        <input
                          type="text"
                          value={subForm.name}
                          onChange={(e) => setSubForm({ ...subForm, name: e.target.value.slice(0, MAX_NAME_LENGTH) })}
                          className="flex-1 px-3 py-2.5 border border-gray-200 rounded-lg text-base focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
                          placeholder="Nueva subcategoría"
                          maxLength={MAX_NAME_LENGTH}
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSubcategory(); if (e.key === 'Escape') closeSubForm() }}
                        />
                        <button
                          onClick={handleSaveSubcategory}
                          disabled={saving || !subForm.name.trim()}
                          className="p-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg active:scale-95 transition-all disabled:opacity-50"
                        >
                          <Check size={15} />
                        </button>
                        <button onClick={closeSubForm} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg active:scale-95 transition-all">
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => openSubForm(cat.id)}
                        className="w-full px-3 py-2 text-sm text-purple-500 hover:text-purple-700 hover:bg-purple-50 rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus size={14} />
                        Agregar subcategoría
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}

          {!loading && filteredCategories.length === 0 && (
            <div className="text-center py-12">
              <Palette className="mx-auto text-gray-300 mb-3" size={48} />
              <p className="text-gray-500">No hay categorías</p>
              <p className="text-gray-400 text-sm">Agrega una categoría para empezar</p>
            </div>
          )}
        </div>
      </div>

      {/* Confirmation dialog */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle size={20} className="text-red-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Desactivar {confirmDelete.type === 'category' ? 'categoría' : 'subcategoría'}</h3>
                <p className="text-sm text-gray-500">Esta acción se puede revertir</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-5">
              ¿Desactivar <strong>"{confirmDelete.name}"</strong>? No se eliminará, solo dejará de estar disponible.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 active:scale-95 transition-all font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={executeDelete}
                className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 active:scale-95 transition-all font-medium"
              >
                Sí, desactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </Modal>
  )
}
