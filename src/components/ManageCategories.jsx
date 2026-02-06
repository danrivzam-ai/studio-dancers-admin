import { useState } from 'react'
import { X, Plus, Edit2, Trash2, ChevronDown, ChevronUp, RotateCcw, Check, Palette } from 'lucide-react'
import { useCategoryManagement } from '../hooks/useCategoryManagement'

const PRESET_COLORS = [
  '#EF4444', '#F59E0B', '#8B5CF6', '#06B6D4', '#EC4899',
  '#6366F1', '#10B981', '#6B7280', '#F97316', '#14B8A6'
]

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

  const handleDeleteCategory = async (id) => {
    const result = await deleteCategory(id)
    if (result.success) showMessage('success', 'Categoría desactivada')
    else showMessage('error', result.error || 'Error al desactivar')
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

  const handleDeleteSubcategory = async (id) => {
    const result = await deleteSubcategory(id)
    if (result.success) showMessage('success', 'Subcategoría desactivada')
    else showMessage('error', result.error || 'Error al desactivar')
  }

  const handleReactivateSubcategory = async (id) => {
    const result = await reactivateSubcategory(id)
    if (result.success) showMessage('success', 'Subcategoría reactivada')
    else showMessage('error', result.error || 'Error al reactivar')
  }

  const filteredCategories = showInactive
    ? categories
    : categories.filter(c => c.active !== false)

  const activeCount = categories.filter(c => c.active !== false).length
  const inactiveCount = categories.filter(c => c.active === false).length

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-600 text-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Palette size={24} />
              <div>
                <h2 className="text-xl font-bold">Gestionar Categorías</h2>
                <p className="text-red-100 text-sm">{activeCount} activas{inactiveCount > 0 ? ` · ${inactiveCount} inactivas` : ''}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Messages */}
        {error && (
          <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}
        {success && (
          <div className="mx-4 mt-3 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
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
              className="w-full p-4 border-2 border-dashed border-red-300 rounded-xl text-red-600 hover:bg-red-50 hover:border-red-400 transition-colors flex items-center justify-center gap-2 font-medium"
            >
              <Plus size={20} />
              Agregar Categoría
            </button>
          )}

          {/* Category form */}
          {showCategoryForm && (
            <div className="bg-gradient-to-br from-red-50 to-orange-50 p-4 rounded-xl border border-red-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-800">
                  {editingCategory ? 'Editar Categoría' : 'Nueva Categoría'}
                </h3>
                <button onClick={closeCategoryForm} className="p-1 hover:bg-white/60 rounded">
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    placeholder="Ej: Pagos a Personal"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_COLORS.map(color => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCategoryForm({ ...categoryForm, color })}
                        className={`w-8 h-8 rounded-full border-2 transition-all ${
                          categoryForm.color === color
                            ? 'border-gray-800 scale-110 shadow-md'
                            : 'border-transparent hover:border-gray-300'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={categoryForm.color}
                        onChange={(e) => setCategoryForm({ ...categoryForm, color: e.target.value })}
                        className="w-8 h-8 rounded cursor-pointer border-0 p-0"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Presupuesto mensual</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-gray-400">$</span>
                      <input
                        type="number"
                        value={categoryForm.monthly_budget}
                        onChange={(e) => setCategoryForm({ ...categoryForm, monthly_budget: e.target.value })}
                        className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                        placeholder="Opcional"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Orden</label>
                    <input
                      type="number"
                      value={categoryForm.sort_order}
                      onChange={(e) => setCategoryForm({ ...categoryForm, sort_order: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                      placeholder="0"
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleSaveCategory}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    <Check size={18} />
                    {saving ? 'Guardando...' : 'Guardar'}
                  </button>
                  <button
                    onClick={closeCategoryForm}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition-colors"
                  >
                    Cancelar
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
              <div key={cat.id} className={`rounded-xl border-2 transition-all ${
                isActive ? 'border-gray-200 hover:shadow-md' : 'border-gray-100 bg-gray-50 opacity-70'
              }`}>
                {/* Category header */}
                <div className="p-4">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-5 h-5 rounded-full flex-shrink-0 border border-black/10"
                      style={{ backgroundColor: cat.color || '#6B7280' }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className={`font-semibold truncate ${isActive ? 'text-gray-800' : 'text-gray-400 line-through'}`}>
                          {cat.name}
                        </h4>
                        {!isActive && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-gray-200 text-gray-500">Inactiva</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {activeSubs.length} subcategoría{activeSubs.length !== 1 ? 's' : ''}
                        {cat.monthly_budget ? ` · Presupuesto: $${parseFloat(cat.monthly_budget).toLocaleString()}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {isActive ? (
                        <>
                          <button
                            onClick={() => openCategoryForm(cat)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Editar"
                          >
                            <Edit2 size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteCategory(cat.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Desactivar"
                          >
                            <Trash2 size={16} />
                          </button>
                          <button
                            onClick={() => setExpandedCategory(isExpanded ? null : cat.id)}
                            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Subcategorías"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => handleReactivateCategory(cat.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-sm text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
                          title="Reactivar"
                        >
                          <RotateCcw size={14} />
                          Reactivar
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Subcategories (expanded) */}
                {isExpanded && isActive && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-3 space-y-2">
                    {/* Add subcategory button */}
                    {showSubForm !== cat.id && (
                      <button
                        onClick={() => openSubForm(cat.id)}
                        className="w-full p-2 border border-dashed border-gray-300 rounded-lg text-gray-500 hover:bg-white hover:border-gray-400 transition-colors flex items-center justify-center gap-1 text-sm"
                      >
                        <Plus size={16} />
                        Agregar Subcategoría
                      </button>
                    )}

                    {/* Subcategory form */}
                    {showSubForm === cat.id && (
                      <div className="flex gap-2 items-center bg-white p-2 rounded-lg border border-gray-200">
                        <input
                          type="text"
                          value={subForm.name}
                          onChange={(e) => setSubForm({ ...subForm, name: e.target.value })}
                          className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500"
                          placeholder="Nombre de subcategoría"
                          autoFocus
                          onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSubcategory(); if (e.key === 'Escape') closeSubForm() }}
                        />
                        <button
                          onClick={handleSaveSubcategory}
                          disabled={saving}
                          className="p-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
                        >
                          <Check size={16} />
                        </button>
                        <button onClick={closeSubForm} className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors">
                          <X size={16} />
                        </button>
                      </div>
                    )}

                    {/* Active subcategories */}
                    {activeSubs.map(sub => (
                      <div key={sub.id} className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-gray-150">
                        <span className="flex-1 text-sm text-gray-700">{sub.name}</span>
                        <button
                          onClick={() => openSubForm(cat.id, sub)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button
                          onClick={() => handleDeleteSubcategory(sub.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Desactivar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    ))}

                    {/* Inactive subcategories */}
                    {showInactive && inactiveSubs.length > 0 && (
                      <>
                        <p className="text-xs text-gray-400 pt-1">Inactivas:</p>
                        {inactiveSubs.map(sub => (
                          <div key={sub.id} className="flex items-center gap-2 bg-gray-100 p-2.5 rounded-lg border border-gray-200 opacity-60">
                            <span className="flex-1 text-sm text-gray-400 line-through">{sub.name}</span>
                            <button
                              onClick={() => handleReactivateSubcategory(sub.id)}
                              className="flex items-center gap-1 px-2 py-1 text-xs text-green-700 bg-green-50 hover:bg-green-100 rounded transition-colors"
                            >
                              <RotateCcw size={12} />
                              Reactivar
                            </button>
                          </div>
                        ))}
                      </>
                    )}

                    {activeSubs.length === 0 && showSubForm !== cat.id && (
                      <p className="text-center text-sm text-gray-400 py-2">Sin subcategorías activas</p>
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
    </div>
  )
}
