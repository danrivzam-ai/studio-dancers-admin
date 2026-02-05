import { useState, useRef, useEffect } from 'react'
import { X, Plus, Edit2, Trash2, Save, Package, BookOpen, Calendar, ShoppingBag } from 'lucide-react'

// Tipos de items
const ITEM_TYPES = [
  { id: 'course', name: 'Curso Regular', icon: BookOpen, color: 'purple' },
  { id: 'program', name: 'Programa', icon: Calendar, color: 'orange' },
  { id: 'product', name: 'Producto', icon: ShoppingBag, color: 'green' },
]

const PRICE_TYPES = [
  { id: 'mes', name: 'Mensual' },
  { id: 'clase', name: 'Por clase' },
  { id: 'programa', name: 'Pago único' },
]

const AGE_GROUPS = [
  { id: 'baby', name: 'Baby (3-5 años)', ageMin: 3, ageMax: 5 },
  { id: 'kids', name: 'Kids (6-9 años)', ageMin: 6, ageMax: 9 },
  { id: 'teens', name: 'Teens (10-16 años)', ageMin: 10, ageMax: 16 },
  { id: 'adultos', name: 'Adultos (18+)', ageMin: 18, ageMax: 99 },
  { id: 'todos', name: 'Todas las edades', ageMin: 3, ageMax: 99 },
]

export default function ManageItems({
  courses,
  products,
  onSaveCourse,
  onDeleteCourse,
  onSaveProduct,
  onDeleteProduct,
  onClose
}) {
  const [activeTab, setActiveTab] = useState('courses')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const formRef = useRef(null)
  const contentRef = useRef(null)

  // Scroll al formulario cuando se abre
  useEffect(() => {
    if (showForm && formRef.current && contentRef.current) {
      // Pequeño delay para asegurar que el formulario esté renderizado
      setTimeout(() => {
        contentRef.current.scrollTo({
          top: 0,
          behavior: 'smooth'
        })
      }, 100)
    }
  }, [showForm])

  const [formData, setFormData] = useState({
    type: 'course',
    name: '',
    ageGroup: 'todos',
    ageMin: 3,
    ageMax: 99,
    schedule: '',
    price: '',
    priceType: 'mes',
    allowsInstallments: false,
    installmentCount: 2,
    stock: ''
  })

  const resetForm = () => {
    setFormData({
      type: 'course',
      name: '',
      ageGroup: 'todos',
      ageMin: 3,
      ageMax: 99,
      schedule: '',
      price: '',
      priceType: 'mes',
      allowsInstallments: false,
      installmentCount: 2,
      stock: ''
    })
    setShowForm(false)
    setEditingItem(null)
  }

  const handleAgeGroupChange = (groupId) => {
    const group = AGE_GROUPS.find(g => g.id === groupId)
    if (group) {
      setFormData({
        ...formData,
        ageGroup: groupId,
        ageMin: group.ageMin,
        ageMax: group.ageMax
      })
    }
  }

  const handleTypeChange = (type) => {
    setFormData({
      ...formData,
      type,
      priceType: type === 'course' ? 'mes' : type === 'program' ? 'programa' : 'programa'
    })
  }

  const handleEdit = (item, isProduct = false) => {
    if (isProduct) {
      setFormData({
        type: 'product',
        name: item.name,
        ageGroup: 'todos',
        ageMin: 3,
        ageMax: 99,
        schedule: '',
        price: item.price.toString(),
        priceType: 'programa',
        allowsInstallments: false,
        installmentCount: 2,
        stock: item.stock?.toString() || ''
      })
    } else {
      const ageGroup = AGE_GROUPS.find(g => g.ageMin === item.ageMin && g.ageMax === item.ageMax)?.id || 'todos'
      setFormData({
        type: item.priceType === 'programa' ? 'program' : 'course',
        name: item.name,
        ageGroup,
        ageMin: item.ageMin,
        ageMax: item.ageMax,
        schedule: item.schedule || '',
        price: item.price.toString(),
        priceType: item.priceType,
        allowsInstallments: item.allowsInstallments || false,
        installmentCount: item.installmentCount || 2,
        stock: ''
      })
    }
    setEditingItem(item)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (formData.type === 'product') {
      const productData = {
        id: editingItem?.id || `prod-${Date.now()}`,
        code: editingItem?.code || editingItem?.id || `prod-${Date.now()}`,
        supabase_id: editingItem?.supabase_id || null,
        name: formData.name,
        price: parseFloat(formData.price),
        stock: formData.stock ? parseInt(formData.stock) : null
      }
      const result = await onSaveProduct(productData, !!editingItem)
      if (!result.success) {
        alert('Error al guardar: ' + (result.error || 'Error desconocido'))
        return
      }
    } else {
      const courseData = {
        id: editingItem?.id || `${formData.type}-${Date.now()}`,
        code: editingItem?.code || editingItem?.id || `${formData.type}-${Date.now()}`,
        supabase_id: editingItem?.supabase_id || null,
        name: formData.name,
        ageMin: formData.ageMin,
        ageMax: formData.ageMax,
        schedule: formData.schedule,
        price: parseFloat(formData.price),
        priceType: formData.priceType,
        allowsInstallments: formData.allowsInstallments,
        installmentCount: formData.allowsInstallments ? formData.installmentCount : 1
      }
      const result = await onSaveCourse(courseData, !!editingItem)
      if (!result.success) {
        alert('Error al guardar: ' + (result.error || 'Error desconocido'))
        return
      }
    }

    resetForm()
  }

  const handleDelete = async (item, isProduct = false) => {
    if (confirm(`¿Eliminar "${item.name}"?`)) {
      if (isProduct) {
        await onDeleteProduct(item.id)
      } else {
        await onDeleteCourse(item.id)
      }
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="text-purple-600" size={24} />
            <h2 className="text-xl font-semibold text-gray-800">Gestionar Cursos y Productos</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('courses')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'courses'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <BookOpen size={16} className="inline mr-2" />
            Cursos y Programas ({courses.length})
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'products'
                ? 'text-green-600 border-b-2 border-green-600 bg-green-50'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <ShoppingBag size={16} className="inline mr-2" />
            Productos ({products.length})
          </button>
        </div>

        {/* Content */}
        <div ref={contentRef} className="flex-1 overflow-y-auto p-4">
          {/* Add Button */}
          {!showForm && (
            <button
              onClick={() => {
                setFormData(prev => ({
                  ...prev,
                  type: activeTab === 'products' ? 'product' : 'course'
                }))
                setShowForm(true)
              }}
              className="w-full mb-4 p-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors flex items-center justify-center gap-2"
            >
              <Plus size={20} />
              Agregar {activeTab === 'products' ? 'Producto' : 'Curso/Programa'}
            </button>
          )}

          {/* Form */}
          {showForm && (
            <form ref={formRef} onSubmit={handleSubmit} className="bg-gray-50 rounded-xl p-4 mb-4 space-y-4 border-2 border-purple-200">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-gray-800">
                  {editingItem ? 'Editar' : 'Nuevo'} {formData.type === 'product' ? 'Producto' : formData.type === 'program' ? 'Programa' : 'Curso'}
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Tipo (solo para cursos/programas) */}
              {activeTab === 'courses' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleTypeChange('course')}
                      className={`flex-1 p-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        formData.type === 'course'
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <BookOpen size={16} className="inline mr-1" />
                      Curso Regular
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange('program')}
                      className={`flex-1 p-2 rounded-lg border-2 text-sm font-medium transition-all ${
                        formData.type === 'program'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Calendar size={16} className="inline mr-1" />
                      Programa
                    </button>
                  </div>
                </div>
              )}

              {/* Nombre */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder={formData.type === 'product' ? 'Ej: Zapatillas Ballet' : 'Ej: Ballet Kids'}
                />
              </div>

              {/* Campos específicos para cursos/programas */}
              {formData.type !== 'product' && (
                <>
                  {/* Grupo de edad */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Grupo de edad</label>
                    <select
                      value={formData.ageGroup}
                      onChange={(e) => handleAgeGroupChange(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      {AGE_GROUPS.map(group => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                    </select>
                  </div>

                  {/* Horario */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Horario</label>
                    <input
                      type="text"
                      value={formData.schedule}
                      onChange={(e) => setFormData({...formData, schedule: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Ej: Lunes y Miércoles 17:00 - 18:00"
                    />
                  </div>
                </>
              )}

              {/* Precio */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precio ($) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                {formData.type !== 'product' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de precio</label>
                    <select
                      value={formData.priceType}
                      onChange={(e) => setFormData({...formData, priceType: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                    >
                      {PRICE_TYPES.map(pt => (
                        <option key={pt.id} value={pt.id}>{pt.name}</option>
                      ))}
                    </select>
                  </div>
                )}
                {formData.type === 'product' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.stock}
                      onChange={(e) => setFormData({...formData, stock: e.target.value})}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                      placeholder="Opcional"
                    />
                  </div>
                )}
              </div>

              {/* Abonos (solo para programas) */}
              {formData.type === 'program' && (
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.allowsInstallments}
                      onChange={(e) => setFormData({...formData, allowsInstallments: e.target.checked})}
                      className="w-4 h-4 text-purple-600 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700">Permite abonos</span>
                  </label>
                  {formData.allowsInstallments && (
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">en</span>
                      <input
                        type="number"
                        min="2"
                        max="12"
                        value={formData.installmentCount}
                        onChange={(e) => setFormData({...formData, installmentCount: parseInt(e.target.value)})}
                        className="w-16 px-2 py-1 border rounded text-center"
                      />
                      <span className="text-sm text-gray-500">cuotas</span>
                    </div>
                  )}
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center justify-center gap-2"
                >
                  <Save size={18} />
                  Guardar
                </button>
              </div>
            </form>
          )}

          {/* Lista de Cursos */}
          {activeTab === 'courses' && (
            <div className="space-y-2">
              {courses.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No hay cursos registrados</p>
              ) : (
                courses.map(course => (
                  <div
                    key={course.id}
                    className={`p-4 rounded-lg border-2 ${
                      course.priceType === 'programa'
                        ? 'border-orange-200 bg-orange-50'
                        : 'border-purple-200 bg-purple-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {course.priceType === 'programa' ? (
                            <Calendar size={16} className="text-orange-600" />
                          ) : (
                            <BookOpen size={16} className="text-purple-600" />
                          )}
                          <h4 className="font-medium text-gray-800">{course.name}</h4>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">
                          Edades: {course.ageMin} - {course.ageMax} años
                          {course.schedule && ` • ${course.schedule}`}
                        </p>
                        <p className="text-sm font-semibold text-green-600 mt-1">
                          ${course.price}/{course.priceType}
                          {course.allowsInstallments && (
                            <span className="text-orange-600 ml-2">
                              (permite {course.installmentCount} abonos)
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(course)}
                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-100 rounded-lg"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(course)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Lista de Productos */}
          {activeTab === 'products' && (
            <div className="space-y-2">
              {products.length === 0 ? (
                <p className="text-center text-gray-500 py-8">No hay productos registrados</p>
              ) : (
                products.map(product => (
                  <div
                    key={product.id}
                    className="p-4 rounded-lg border-2 border-green-200 bg-green-50"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <ShoppingBag size={16} className="text-green-600" />
                          <h4 className="font-medium text-gray-800">{product.name}</h4>
                        </div>
                        <p className="text-sm font-semibold text-green-600 mt-1">
                          ${product.price}
                          {product.stock !== null && product.stock !== undefined && (
                            <span className="text-gray-500 ml-2">
                              (Stock: {product.stock})
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEdit(product, true)}
                          className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-100 rounded-lg"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(product, true)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded-lg"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
