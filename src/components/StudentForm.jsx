import { useState, useEffect } from 'react'
import { X, Check, User, Users, CreditCard } from 'lucide-react'
import { COURSES, SABADOS_INTENSIVOS, DANCE_CAMP, getSuggestedCourses } from '../lib/courses'

export default function StudentForm({
  student = null,
  onSubmit,
  onClose
}) {
  const isEditing = !!student

  const [formData, setFormData] = useState({
    name: '', cedula: '', age: '', phone: '', email: '',
    isMinor: true,
    parentName: '', parentCedula: '', parentPhone: '', parentEmail: '', parentAddress: '',
    hasDifferentPayer: false,
    payerName: '', payerCedula: '', payerPhone: '', payerAddress: '',
    courseId: '', notes: '',
    enrollmentDate: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    if (student) {
      const hasPayer = student.payer_name &&
        student.payer_name !== student.name &&
        student.payer_name !== student.parent_name

      setFormData({
        name: student.name || '',
        cedula: student.cedula || '',
        age: student.age?.toString() || '',
        phone: student.phone || '',
        email: student.email || '',
        isMinor: student.is_minor !== false,
        parentName: student.parent_name || '',
        parentCedula: student.parent_cedula || '',
        parentPhone: student.parent_phone || '',
        parentEmail: student.parent_email || '',
        parentAddress: student.parent_address || '',
        hasDifferentPayer: hasPayer,
        payerName: student.payer_name || '',
        payerCedula: student.payer_cedula || '',
        payerPhone: student.payer_phone || '',
        payerAddress: student.payer_address || '',
        courseId: student.course_id || '',
        notes: student.notes || '',
        enrollmentDate: student.enrollment_date || new Date().toISOString().split('T')[0]
      })
    }
  }, [student])

  useEffect(() => {
    const age = parseInt(formData.age)
    if (age && age >= 18) {
      setFormData(prev => ({ ...prev, isMinor: false }))
    } else if (age && age < 18) {
      setFormData(prev => ({ ...prev, isMinor: true }))
    }
  }, [formData.age])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(formData)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="font-semibold text-gray-800">
            {isEditing ? 'Editar Alumno' : 'Nuevo Alumno'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* ALUMNO */}
          <div className="bg-purple-50 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-purple-800 mb-3 flex items-center gap-1.5">
              <User size={14} /> Alumno
            </h3>
            <div className="space-y-2">
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
                placeholder="Nombre completo *"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={formData.cedula}
                  onChange={(e) => setFormData({...formData, cedula: e.target.value})}
                  className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Cédula"
                />
                <input
                  type="number"
                  min="3"
                  max="99"
                  value={formData.age}
                  onChange={(e) => setFormData({...formData, age: e.target.value})}
                  className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Edad"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Teléfono"
                />
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Email"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 mt-2 text-xs text-gray-600">
              <input
                type="checkbox"
                checked={formData.isMinor}
                onChange={(e) => setFormData({...formData, isMinor: e.target.checked})}
                className="w-3.5 h-3.5 text-purple-600 rounded"
              />
              Menor de edad
            </label>
          </div>

          {/* REPRESENTANTE */}
          {formData.isMinor && (
            <div className="bg-blue-50 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-1.5">
                <Users size={14} /> Representante
              </h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required={formData.isMinor}
                    value={formData.parentName}
                    onChange={(e) => setFormData({...formData, parentName: e.target.value})}
                    className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Nombre *"
                  />
                  <input
                    type="text"
                    value={formData.parentCedula}
                    onChange={(e) => setFormData({...formData, parentCedula: e.target.value})}
                    className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Cédula/RUC"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    required={formData.isMinor}
                    value={formData.parentPhone}
                    onChange={(e) => setFormData({...formData, parentPhone: e.target.value})}
                    className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Teléfono *"
                  />
                  <input
                    type="email"
                    value={formData.parentEmail}
                    onChange={(e) => setFormData({...formData, parentEmail: e.target.value})}
                    className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder="Email"
                  />
                </div>
                <input
                  type="text"
                  value={formData.parentAddress}
                  onChange={(e) => setFormData({...formData, parentAddress: e.target.value})}
                  className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="Dirección"
                />
              </div>
            </div>
          )}

          {/* PAGADOR DIFERENTE */}
          <div className="border rounded-lg p-3">
            <label className="flex items-center gap-2 text-xs font-medium text-gray-700">
              <input
                type="checkbox"
                checked={formData.hasDifferentPayer}
                onChange={(e) => setFormData({...formData, hasDifferentPayer: e.target.checked})}
                className="w-3.5 h-3.5 text-green-600 rounded"
              />
              <CreditCard size={12} />
              Comprobante a otra persona
            </label>

            {formData.hasDifferentPayer && (
              <div className="mt-3 space-y-2 bg-green-50 rounded-lg p-2">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    required={formData.hasDifferentPayer}
                    value={formData.payerName}
                    onChange={(e) => setFormData({...formData, payerName: e.target.value})}
                    className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Nombre *"
                  />
                  <input
                    type="text"
                    required={formData.hasDifferentPayer}
                    value={formData.payerCedula}
                    onChange={(e) => setFormData({...formData, payerCedula: e.target.value})}
                    className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Cédula/RUC *"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    value={formData.payerPhone}
                    onChange={(e) => setFormData({...formData, payerPhone: e.target.value})}
                    className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Teléfono"
                  />
                  <input
                    type="text"
                    value={formData.payerAddress || ''}
                    onChange={(e) => setFormData({...formData, payerAddress: e.target.value})}
                    className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500"
                    placeholder="Dirección"
                  />
                </div>
              </div>
            )}
          </div>

          {/* FECHA DE REGISTRO */}
          <div className="bg-gray-50 rounded-lg p-3">
            <label className="block text-sm font-semibold text-gray-800 mb-2">
              📅 Fecha de Registro
            </label>
            <input
              type="date"
              value={formData.enrollmentDate}
              onChange={(e) => setFormData({...formData, enrollmentDate: e.target.value})}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* CURSO */}
          <div className="bg-gray-50 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-gray-800 mb-2">Curso</h3>
            <select
              required
              value={formData.courseId}
              onChange={(e) => setFormData({...formData, courseId: e.target.value})}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500 mb-2"
            >
              <option value="">Seleccionar curso *</option>
              <optgroup label="📚 Clases Regulares">
                {COURSES.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - ${c.price}/{c.priceType}</option>
                ))}
              </optgroup>
              <optgroup label="🌟 Sábados Intensivos">
                {SABADOS_INTENSIVOS.map(c => (
                  <option key={c.id} value={c.id}>{c.name} - ${c.price}</option>
                ))}
              </optgroup>
              <optgroup label="🎪 Dance Camp 2026">
                {DANCE_CAMP.map(c => (
                  <option key={c.id} value={c.id}>{c.name.replace('Dance Camp 2026 - ', '')} - ${c.price}</option>
                ))}
              </optgroup>
            </select>

            {formData.age && getSuggestedCourses(parseInt(formData.age)).length > 0 && (
              <p className="text-xs text-purple-600 mb-2">
                💡 Sugeridos: {getSuggestedCourses(parseInt(formData.age)).map(c => c.name.split(' - ')[0].replace('Dance Camp 2026 - ', '')).slice(0, 2).join(', ')}
              </p>
            )}

            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({...formData, notes: e.target.value})}
              className="w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
              rows={2}
              placeholder="Notas (opcional)"
            />
          </div>

          {/* BOTONES */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-1.5"
            >
              <Check size={16} />
              {isEditing ? 'Guardar' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
