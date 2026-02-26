import { useState, useRef, useEffect } from 'react'
import { X, Plus, Edit2, Trash2, Save, Package, BookOpen, Calendar, ShoppingBag, AlertTriangle, Users, PackagePlus, ImageIcon, Upload } from 'lucide-react'
import { supabase } from '../lib/supabase'

// Tipos de items
const ITEM_TYPES = [
  { id: 'course', name: 'Curso Regular', icon: BookOpen, color: 'purple' },
  { id: 'program', name: 'Programa', icon: Calendar, color: 'orange' },
  { id: 'product', name: 'Producto', icon: ShoppingBag, color: 'green' },
]

const PRICE_TYPES = [
  { id: 'mes', name: 'Mensual' },
  { id: 'paquete', name: 'Paquete de clases' },
  { id: 'clase', name: 'Por clase' },
  { id: 'programa', name: 'Pago único' },
]

const DAYS_OF_WEEK = [
  { id: 1, short: 'Lun', name: 'Lunes' },
  { id: 2, short: 'Mar', name: 'Martes' },
  { id: 3, short: 'Mié', name: 'Miércoles' },
  { id: 4, short: 'Jue', name: 'Jueves' },
  { id: 5, short: 'Vie', name: 'Viernes' },
  { id: 6, short: 'Sáb', name: 'Sábado' },
  { id: 0, short: 'Dom', name: 'Domingo' },
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
  onAdjustStock,
  onClose,
  onRequestPin
}) {
  const [activeTab, setActiveTab] = useState('courses')
  const [showForm, setShowForm] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [errorMessage, setErrorMessage] = useState(null)
  const [restockModal, setRestockModal] = useState(null) // { product, quantity }
  const [restockQty, setRestockQty] = useState('')
  const [restockLoading, setRestockLoading] = useState(false)
  const formRef = useRef(null)
  const contentRef = useRef(null)

  // Scroll al formulario cuando se abre
  useEffect(() => {
    if (showForm && formRef.current && contentRef.current) {
      setTimeout(() => {
        contentRef.current.scrollTo({
          top: 0,
          behavior: 'smooth'
        })
      }, 100)
    }
  }, [showForm])

  // Limpiar mensaje de error después de 5 segundos
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage])

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
    stock: '',
    classDays: [],
    classesPerCycle: '',
    imageUrl: '',
    benefits: '',
    requirements: ''
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
      stock: '',
      classDays: [],
      classesPerCycle: '',
      imageUrl: '',
      benefits: '',
      requirements: ''
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
      const ageGroup = AGE_GROUPS.find(g => g.ageMin === (item.ageMin || item.age_min) && g.ageMax === (item.ageMax || item.age_max))?.id || 'todos'
      setFormData({
        type: item.priceType === 'programa' ? 'program' : item.priceType === 'paquete' ? 'course' : 'course',
        name: item.name,
        ageGroup,
        ageMin: item.ageMin || item.age_min || 3,
        ageMax: item.ageMax || item.age_max || 99,
        schedule: item.schedule || '',
        price: item.price.toString(),
        priceType: item.priceType,
        allowsInstallments: item.allowsInstallments || false,
        installmentCount: item.installmentCount || 2,
        stock: '',
        classDays: item.classDays || [],
        classesPerCycle: item.classesPerCycle || item.classesPerPackage || '',
        imageUrl: item.imageUrl || '',
        benefits: item.benefits || '',
        requirements: item.requirements || ''
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
        setErrorMessage(result.error || 'Error al guardar')
        return
      }
    } else {
      const courseData = {
        id: editingItem?.id || `${formData.type}-${Date.now()}`,
        code: editingItem?.code || editingItem?.id || `${formData.type}-${Date.now()}`,
        supabase_id: editingItem?.supabase_id || null,
        is_default: editingItem?.is_default || false,
        name: formData.name,
        ageMin: formData.ageMin,
        ageMax: formData.ageMax,
        schedule: formData.schedule,
        price: parseFloat(formData.price),
        priceType: formData.priceType,
        allowsInstallments: formData.allowsInstallments,
        installmentCount: formData.allowsInstallments ? formData.installmentCount : 1,
        classDays: formData.classDays.length > 0 ? formData.classDays : null,
        classesPerCycle: formData.classesPerCycle ? parseInt(formData.classesPerCycle) : null,
        imageUrl: formData.imageUrl || null,
        benefits: formData.benefits || null,
        requirements: formData.requirements || null
      }
      const result = await onSaveCourse(courseData, !!editingItem)
      if (!result.success) {
        setErrorMessage(result.error || 'Error al guardar')
        return
      }
    }

    resetForm()
  }

  const handleDeleteRequest = (item, isProduct = false) => {
    // Permitir eliminar cualquier item (incluso predeterminados)
    setDeleteConfirm({ item, isProduct })
  }

  const handleDeleteConfirm = async (pin) => {
    if (!deleteConfirm) return

    // Solicitar PIN primero
    if (onRequestPin) {
      const pinValid = await onRequestPin(pin)
      if (!pinValid) {
        setErrorMessage('PIN incorrecto')
        return
      }
    }

    const { item, isProduct } = deleteConfirm

    let result
    if (isProduct) {
      result = await onDeleteProduct(item.id || item.code)
    } else {
      result = await onDeleteCourse(item.id || item.code)
    }

    if (result && !result.success) {
      setErrorMessage(result.error || 'Error al eliminar')
    }

    setDeleteConfirm(null)
  }

  // Restock de producto
  const handleRestock = async () => {
    if (!restockModal || !restockQty || parseInt(restockQty) <= 0) return
    setRestockLoading(true)
    try {
      const qty = parseInt(restockQty)
      const result = await onAdjustStock(
        restockModal.code || restockModal.id,
        qty,
        'restock',
        null,
        `Restock: +${qty} unidades`
      )
      if (result.success) {
        setRestockModal(null)
        setRestockQty('')
      } else {
        setErrorMessage(result.error || 'Error al actualizar stock')
      }
    } catch (err) {
      setErrorMessage(err.message)
    } finally {
      setRestockLoading(false)
    }
  }

  // Separar cursos regulares de programas
  const regularCourses = courses.filter(c => c.priceType !== 'programa')
  const programs = courses.filter(c => c.priceType === 'programa')

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 md:p-6 border-b bg-gradient-to-r from-purple-600 to-pink-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-lg">
                <Package className="text-white" size={24} />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-semibold text-white">Gestión de Cursos y Productos</h2>
                <p className="text-white/70 text-sm hidden md:block">Administra tus servicios y artículos</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Error Message */}
        {errorMessage && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertTriangle size={18} />
            <span className="text-sm">{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="ml-auto">
              <X size={16} />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setActiveTab('courses')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'courses'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <BookOpen size={18} />
            <span>Cursos</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'courses' ? 'bg-purple-100 text-purple-700' : 'bg-gray-200'}`}>
              {regularCourses.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('programs')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'programs'
                ? 'text-orange-600 border-b-2 border-orange-600 bg-white'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <Calendar size={18} />
            <span>Programas</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'programs' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200'}`}>
              {programs.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('products')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === 'products'
                ? 'text-green-600 border-b-2 border-green-600 bg-white'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
            }`}
          >
            <ShoppingBag size={18} />
            <span>Productos</span>
            <span className={`px-2 py-0.5 rounded-full text-xs ${activeTab === 'products' ? 'bg-green-100 text-green-700' : 'bg-gray-200'}`}>
              {products.length}
            </span>
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
                  type: activeTab === 'products' ? 'product' : activeTab === 'programs' ? 'program' : 'course'
                }))
                setShowForm(true)
              }}
              className={`w-full mb-4 p-4 border-2 border-dashed rounded-xl transition-all flex items-center justify-center gap-2 ${
                activeTab === 'products'
                  ? 'border-green-300 text-green-600 hover:border-green-400 hover:bg-green-50'
                  : activeTab === 'programs'
                    ? 'border-orange-300 text-orange-600 hover:border-orange-400 hover:bg-orange-50'
                    : 'border-purple-300 text-purple-600 hover:border-purple-400 hover:bg-purple-50'
              }`}
            >
              <Plus size={20} />
              <span className="font-medium">
                Agregar {activeTab === 'products' ? 'Producto' : activeTab === 'programs' ? 'Programa' : 'Curso'}
              </span>
            </button>
          )}

          {/* Form */}
          {showForm && (
            <form ref={formRef} onSubmit={handleSubmit} className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 mb-4 space-y-4 border shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                  {formData.type === 'product' ? (
                    <ShoppingBag size={18} className="text-green-600" />
                  ) : formData.type === 'program' ? (
                    <Calendar size={18} className="text-orange-600" />
                  ) : (
                    <BookOpen size={18} className="text-purple-600" />
                  )}
                  {editingItem ? 'Editar' : 'Nuevo'} {formData.type === 'product' ? 'Producto' : formData.type === 'program' ? 'Programa' : 'Curso'}
                </h3>
                <button
                  type="button"
                  onClick={resetForm}
                  className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Tipo (solo para cursos/programas) */}
              {activeTab !== 'products' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tipo</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleTypeChange('course')}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        formData.type === 'course'
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <BookOpen size={18} />
                      Curso Regular
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTypeChange('program')}
                      className={`p-3 rounded-lg border-2 text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                        formData.type === 'program'
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <Calendar size={18} />
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
                  className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                  placeholder={formData.type === 'product' ? 'Ej: Zapatillas Ballet' : 'Ej: Ballet Kids'}
                />
              </div>

              {/* Campos específicos para cursos/programas */}
              {formData.type !== 'product' && (
                <>
                  {/* Grupo de edad */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Users size={14} className="inline mr-1" />
                      Grupo de edad
                    </label>
                    <select
                      value={formData.ageGroup}
                      onChange={(e) => handleAgeGroupChange(e.target.value)}
                      className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
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
                      className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                      placeholder="Ej: Lunes y Miércoles 17:00 - 18:00"
                    />
                  </div>

                  {/* Días de clase (para mes y paquete) */}
                  {(formData.priceType === 'mes' || formData.priceType === 'paquete') && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Calendar size={14} className="inline mr-1" />
                        Días de clase
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {DAYS_OF_WEEK.map(day => {
                          const isSelected = formData.classDays.includes(day.id)
                          return (
                            <button
                              key={day.id}
                              type="button"
                              onClick={() => {
                                const newDays = isSelected
                                  ? formData.classDays.filter(d => d !== day.id)
                                  : [...formData.classDays, day.id].sort((a, b) => a - b)
                                setFormData({ ...formData, classDays: newDays })
                              }}
                              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border-2 ${
                                isSelected
                                  ? 'border-purple-500 bg-purple-100 text-purple-700'
                                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                              }`}
                            >
                              {day.short}
                            </button>
                          )
                        })}
                      </div>
                      <p className="text-xs text-gray-400 mt-1">
                        Selecciona los días en que se imparte la clase. El sistema calculará automáticamente cuándo toca el próximo pago.
                      </p>
                    </div>
                  )}

                  {/* Clases por ciclo */}
                  {(formData.priceType === 'mes' || formData.priceType === 'paquete') && formData.classDays.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Clases por ciclo
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={formData.classesPerCycle}
                        onChange={(e) => setFormData({...formData, classesPerCycle: e.target.value})}
                        className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                        placeholder={`Ej: ${formData.classDays.length * 4}`}
                      />
                      <p className="text-xs text-gray-400 mt-1">
                        Cuántas clases completa un ciclo de pago. Ej: MTJ = 8 clases, Sáb = 4 clases.
                      </p>
                    </div>
                  )}
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
                    className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                  />
                </div>
                {formData.type !== 'product' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de precio</label>
                    <select
                      value={formData.priceType}
                      onChange={(e) => setFormData({...formData, priceType: e.target.value})}
                      className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
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
                      className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
                      placeholder="Opcional"
                    />
                  </div>
                )}
              </div>

              {/* Abonos (solo para programas) */}
              {formData.type === 'program' && (
                <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.allowsInstallments}
                      onChange={(e) => setFormData({...formData, allowsInstallments: e.target.checked})}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded"
                    />
                    <span className="text-sm font-medium text-orange-800">Permite pago en cuotas</span>
                  </label>
                  {formData.allowsInstallments && (
                    <div className="flex items-center gap-2 mt-2 ml-6">
                      <span className="text-sm text-orange-700">Número de cuotas:</span>
                      <input
                        type="number"
                        min="2"
                        max="12"
                        value={formData.installmentCount}
                        onChange={(e) => setFormData({...formData, installmentCount: parseInt(e.target.value)})}
                        className="w-16 px-2 py-1 border border-orange-300 rounded text-center bg-white"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Imagen, Beneficios, Requisitos (solo cursos/programas) */}
              {formData.type !== 'product' && (
                <>
                  {/* Imagen del curso */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <ImageIcon size={14} className="inline mr-1" />
                      Imagen del curso
                    </label>
                    {formData.imageUrl && (
                      <div className="mb-2 relative">
                        <img src={formData.imageUrl} alt="Curso" className="w-full h-32 object-cover rounded-lg" />
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, imageUrl: ''})}
                          className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    )}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]
                        if (!file) return
                        try {
                          // Comprimir imagen
                          const canvas = document.createElement('canvas')
                          const img = new Image()
                          img.src = URL.createObjectURL(file)
                          await new Promise(r => img.onload = r)
                          const maxW = 800
                          const scale = Math.min(1, maxW / img.width)
                          canvas.width = img.width * scale
                          canvas.height = img.height * scale
                          canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
                          const blob = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.8))
                          URL.revokeObjectURL(img.src)
                          // Subir a Supabase Storage
                          const fileName = `course_${Date.now()}.jpg`
                          const { error: uploadErr } = await supabase.storage.from('course-images').upload(fileName, blob, { contentType: 'image/jpeg' })
                          if (uploadErr) throw uploadErr
                          const { data: urlData } = supabase.storage.from('course-images').getPublicUrl(fileName)
                          setFormData(prev => ({...prev, imageUrl: urlData.publicUrl}))
                        } catch (err) {
                          console.error('Error uploading image:', err)
                          alert('Error al subir imagen')
                        }
                        e.target.value = ''
                      }}
                      className="w-full text-sm text-gray-500 file:mr-3 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100"
                    />
                  </div>

                  {/* Beneficios */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Beneficios</label>
                    <textarea
                      value={formData.benefits}
                      onChange={(e) => setFormData({...formData, benefits: e.target.value})}
                      className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-sm"
                      placeholder="Un beneficio por línea&#10;Ej: Mejora la postura&#10;Aumenta la flexibilidad"
                      rows={3}
                    />
                  </div>

                  {/* Requisitos */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Requisitos</label>
                    <textarea
                      value={formData.requirements}
                      onChange={(e) => setFormData({...formData, requirements: e.target.value})}
                      className="w-full px-4 py-2.5 border rounded-lg focus:ring-2 focus:ring-purple-500 bg-white text-sm"
                      placeholder="Un requisito por línea&#10;Ej: Zapatillas de media punta&#10;Ropa ajustada"
                      rows={3}
                    />
                  </div>
                </>
              )}

              {/* Botones */}
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-1 px-4 py-2.5 text-white rounded-xl flex items-center justify-center gap-2 font-medium ${
                    formData.type === 'product'
                      ? 'bg-green-600 hover:bg-green-700'
                      : formData.type === 'program'
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : 'bg-purple-600 hover:bg-purple-700'
                  }`}
                >
                  <Save size={18} />
                  Guardar
                </button>
              </div>
            </form>
          )}

          {/* Lista de Cursos Regulares */}
          {activeTab === 'courses' && (
            <div className="space-y-3">
              {regularCourses.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <BookOpen size={48} className="mx-auto mb-3 opacity-30" />
                  <p>No hay cursos regulares registrados</p>
                </div>
              ) : (
                regularCourses.map(course => (
                  <ItemCard
                    key={course.id}
                    item={course}
                    type="course"
                    onEdit={() => handleEdit(course)}
                    onDelete={() => handleDeleteRequest(course)}
                  />
                ))
              )}
            </div>
          )}

          {/* Lista de Programas */}
          {activeTab === 'programs' && (
            <div className="space-y-3">
              {programs.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <Calendar size={48} className="mx-auto mb-3 opacity-30" />
                  <p>No hay programas registrados</p>
                </div>
              ) : (
                programs.map(program => (
                  <ItemCard
                    key={program.id}
                    item={program}
                    type="program"
                    onEdit={() => handleEdit(program)}
                    onDelete={() => handleDeleteRequest(program)}
                  />
                ))
              )}
            </div>
          )}

          {/* Lista de Productos */}
          {activeTab === 'products' && (
            <div className="space-y-3">
              {products.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <ShoppingBag size={48} className="mx-auto mb-3 opacity-30" />
                  <p>No hay productos registrados</p>
                </div>
              ) : (
                products.map(product => (
                  <ItemCard
                    key={product.id}
                    item={product}
                    type="product"
                    onEdit={() => handleEdit(product, true)}
                    onDelete={() => handleDeleteRequest(product, true)}
                    onRestock={onAdjustStock ? () => { setRestockModal(product); setRestockQty('') } : null}
                  />
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>

        {/* Delete Confirmation Modal with PIN */}
        {deleteConfirm && (
          <DeleteConfirmModal
            itemName={deleteConfirm.item.name}
            itemType={deleteConfirm.isProduct ? 'producto' : 'curso/programa'}
            onConfirm={handleDeleteConfirm}
            onCancel={() => setDeleteConfirm(null)}
          />
        )}

        {/* Restock Modal */}
        {restockModal && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
              <div className="text-center mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <PackagePlus size={32} className="text-blue-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Reabastecer Stock</h3>
                <p className="text-gray-500 mt-1">{restockModal.name}</p>
                <p className="text-sm text-blue-600 font-medium mt-1">
                  Stock actual: {restockModal.stock ?? 0} unidades
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cantidad a agregar
                </label>
                <input
                  type="number"
                  min="1"
                  value={restockQty}
                  onChange={(e) => setRestockQty(e.target.value)}
                  className="w-full text-center text-2xl px-4 py-3 border-2 border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="0"
                  autoFocus
                />
                {restockQty && parseInt(restockQty) > 0 && (
                  <p className="text-sm text-green-600 font-medium text-center mt-2">
                    Nuevo stock: {(restockModal.stock ?? 0) + parseInt(restockQty)} unidades
                  </p>
                )}
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setRestockModal(null)}
                  className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleRestock}
                  disabled={!restockQty || parseInt(restockQty) <= 0 || restockLoading}
                  className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <PackagePlus size={18} />
                  {restockLoading ? 'Guardando...' : 'Agregar'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Componente de tarjeta de item
function ItemCard({ item, type, onEdit, onDelete, onRestock }) {
  const isProduct = type === 'product'
  const isProgram = type === 'program' || item.priceType === 'programa'

  const colors = isProduct
    ? { border: 'border-green-200', bg: 'bg-green-50', icon: 'text-green-600', badge: 'bg-green-100 text-green-700' }
    : isProgram
      ? { border: 'border-orange-200', bg: 'bg-orange-50', icon: 'text-orange-600', badge: 'bg-orange-100 text-orange-700' }
      : { border: 'border-purple-200', bg: 'bg-purple-50', icon: 'text-purple-600', badge: 'bg-purple-100 text-purple-700' }

  const Icon = isProduct ? ShoppingBag : isProgram ? Calendar : BookOpen

  return (
    <div className={`p-4 rounded-xl border-2 ${colors.border} ${colors.bg} hover:shadow-md transition-all`}>
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div className={`p-2 rounded-lg ${colors.badge}`}>
          <Icon size={20} className={colors.icon} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h4 className="font-semibold text-gray-800 truncate">{item.name}</h4>
          </div>

          {!isProduct && (
            <div className="text-sm text-gray-500 mt-1">
              <p>
                <Users size={12} className="inline mr-1" />
                {item.ageMin || item.age_min} - {item.ageMax || item.age_max} años
                {item.schedule && <span className="ml-2">• {item.schedule}</span>}
              </p>
              {item.classDays && item.classDays.length > 0 && (
                <p className="text-xs text-purple-600 mt-0.5">
                  <Calendar size={10} className="inline mr-1" />
                  {item.classDays.map(d => ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][d]).join('/')}
                  {item.classesPerCycle && ` • ${item.classesPerCycle} clases/ciclo`}
                </p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3 mt-2">
            <span className="text-lg font-bold text-green-600">
              ${item.price}
              {!isProduct && <span className="text-sm font-normal text-gray-500">/{item.priceType}</span>}
            </span>

            {item.allowsInstallments && (
              <span className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full">
                {item.installmentCount} cuotas
              </span>
            )}

            {isProduct && item.stock !== null && item.stock !== undefined && (
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                Stock: {item.stock}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1">
          {isProduct && onRestock && (
            <button
              onClick={onRestock}
              className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
              title="Reabastecer stock"
            >
              <PackagePlus size={18} />
            </button>
          )}
          <button
            onClick={onEdit}
            className={`p-2 rounded-lg transition-colors ${
              isProduct
                ? 'text-green-600 hover:bg-green-100'
                : isProgram
                  ? 'text-orange-600 hover:bg-orange-100'
                  : 'text-purple-600 hover:bg-purple-100'
            }`}
            title="Editar"
          >
            <Edit2 size={18} />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-100 rounded-lg transition-colors"
            title="Eliminar"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

// Modal de confirmación de eliminación con PIN
function DeleteConfirmModal({ itemName, itemType, onConfirm, onCancel }) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState(false)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (pin.length !== 4) {
      setError(true)
      return
    }
    onConfirm(pin)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-[60]">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="text-center mb-4">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Trash2 size={32} className="text-red-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-800">¿Eliminar {itemType}?</h3>
          <p className="text-gray-500 mt-2">
            Estás por eliminar: <strong>{itemName}</strong>
          </p>
          <p className="text-sm text-gray-400 mt-1">Esta acción no se puede deshacer.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2 text-center">
              Ingresa tu PIN para confirmar
            </label>
            <input
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ''))
                setError(false)
              }}
              className={`w-full text-center text-2xl tracking-widest px-4 py-3 border-2 rounded-xl ${
                error ? 'border-red-500 bg-red-50' : 'border-gray-300'
              } focus:ring-2 focus:ring-red-500 focus:border-red-500`}
              placeholder="••••"
              autoFocus
            />
            {error && (
              <p className="text-red-500 text-sm mt-1 text-center">PIN inválido</p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium"
            >
              Eliminar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
