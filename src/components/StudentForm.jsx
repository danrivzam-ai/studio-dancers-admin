import { useState, useEffect } from 'react'
import { X, Check, User, Users, CreditCard } from 'lucide-react'
import { getTodayEC } from '../lib/dateUtils'

// Reusable labeled input component
function LabeledInput({ label, required, children }) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-gray-500 mb-0.5 uppercase tracking-wider">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}

export default function StudentForm({
  student = null,
  courses = [],
  onSubmit,
  onClose
}) {
  const isEditing = !!student

  const [formData, setFormData] = useState({
    name: '', cedula: '', age: '', phone: '', email: '', address: '',
    isMinor: true,
    parentName: '', parentCedula: '', parentPhone: '', parentEmail: '', parentAddress: '',
    hasDifferentPayer: false,
    payerName: '', payerCedula: '', payerPhone: '', payerAddress: '',
    courseId: '', notes: '',
    enrollmentDate: getTodayEC()
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
        address: student.address || '',
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
        enrollmentDate: student.enrollment_date || getTodayEC()
      })
    }
  }, [student])

  // Auto-detectar menor/adulto según edad
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

  const inputClass = "w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
  const inputClassBlue = "w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500"
  const inputClassGreen = "w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-green-500"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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
          {/* Toggle Menor / Adulto */}
          <div className="flex rounded-lg overflow-hidden border-2 border-purple-200">
            <button
              type="button"
              onClick={() => setFormData({...formData, isMinor: true})}
              className={`flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                formData.isMinor
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users size={14} />
              Menor de edad
            </button>
            <button
              type="button"
              onClick={() => setFormData({...formData, isMinor: false, age: ''})}
              className={`flex-1 py-2 text-sm font-medium transition-colors flex items-center justify-center gap-1.5 ${
                !formData.isMinor
                  ? 'bg-purple-600 text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <User size={14} />
              Adulto
            </button>
          </div>

          {/* DATOS DEL ALUMNO */}
          <div className="bg-purple-50 rounded-lg p-3">
            <h3 className="text-sm font-semibold text-purple-800 mb-3 flex items-center gap-1.5">
              <User size={14} /> {formData.isMinor ? 'Datos del Alumno' : 'Datos Personales'}
            </h3>
            <div className="space-y-2">
              <LabeledInput label="Nombre completo" required>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className={inputClass}
                  placeholder="Nombre completo"
                />
              </LabeledInput>

              <div className="grid grid-cols-2 gap-2">
                <LabeledInput label="Cédula">
                  <input
                    type="text"
                    value={formData.cedula}
                    onChange={(e) => setFormData({...formData, cedula: e.target.value})}
                    className={inputClass}
                    placeholder="0912345678"
                  />
                </LabeledInput>
                {formData.isMinor ? (
                  <LabeledInput label="Edad" required>
                    <input
                      type="number"
                      min="3"
                      max="17"
                      required
                      value={formData.age}
                      onChange={(e) => setFormData({...formData, age: e.target.value})}
                      className={inputClass}
                      placeholder="Edad"
                    />
                  </LabeledInput>
                ) : (
                  <LabeledInput label="Teléfono" required>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className={inputClass}
                      placeholder="09XXXXXXXX"
                    />
                  </LabeledInput>
                )}
              </div>

              {/* Adultos: email + dirección */}
              {!formData.isMinor && (
                <div className="grid grid-cols-2 gap-2">
                  <LabeledInput label="Email">
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className={inputClass}
                      placeholder="correo@email.com"
                    />
                  </LabeledInput>
                  <LabeledInput label="Dirección">
                    <input
                      type="text"
                      value={formData.address}
                      onChange={(e) => setFormData({...formData, address: e.target.value})}
                      className={inputClass}
                      placeholder="Dirección"
                    />
                  </LabeledInput>
                </div>
              )}

              {/* Menores: teléfono y email opcionales */}
              {formData.isMinor && (
                <div className="grid grid-cols-2 gap-2">
                  <LabeledInput label="Teléfono">
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className={inputClass}
                      placeholder="09XXXXXXXX"
                    />
                  </LabeledInput>
                  <LabeledInput label="Email">
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className={inputClass}
                      placeholder="correo@email.com"
                    />
                  </LabeledInput>
                </div>
              )}
            </div>
          </div>

          {/* REPRESENTANTE (solo menores) */}
          {formData.isMinor && (
            <div className="bg-blue-50 rounded-lg p-3">
              <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-1.5">
                <Users size={14} /> Representante
              </h3>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <LabeledInput label="Nombre" required>
                    <input
                      type="text"
                      required
                      value={formData.parentName}
                      onChange={(e) => setFormData({...formData, parentName: e.target.value})}
                      className={inputClassBlue}
                      placeholder="Nombre completo"
                    />
                  </LabeledInput>
                  <LabeledInput label="Cédula / RUC">
                    <input
                      type="text"
                      value={formData.parentCedula}
                      onChange={(e) => setFormData({...formData, parentCedula: e.target.value})}
                      className={inputClassBlue}
                      placeholder="0912345678"
                    />
                  </LabeledInput>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <LabeledInput label="Teléfono" required>
                    <input
                      type="tel"
                      required
                      value={formData.parentPhone}
                      onChange={(e) => setFormData({...formData, parentPhone: e.target.value})}
                      className={inputClassBlue}
                      placeholder="09XXXXXXXX"
                    />
                  </LabeledInput>
                  <LabeledInput label="Email">
                    <input
                      type="email"
                      value={formData.parentEmail}
                      onChange={(e) => setFormData({...formData, parentEmail: e.target.value})}
                      className={inputClassBlue}
                      placeholder="correo@email.com"
                    />
                  </LabeledInput>
                </div>
                <LabeledInput label="Dirección">
                  <input
                    type="text"
                    value={formData.parentAddress}
                    onChange={(e) => setFormData({...formData, parentAddress: e.target.value})}
                    className={`w-full ${inputClassBlue}`}
                    placeholder="Dirección"
                  />
                </LabeledInput>
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
                  <LabeledInput label="Nombre" required>
                    <input
                      type="text"
                      required={formData.hasDifferentPayer}
                      value={formData.payerName}
                      onChange={(e) => setFormData({...formData, payerName: e.target.value})}
                      className={inputClassGreen}
                      placeholder="Nombre completo"
                    />
                  </LabeledInput>
                  <LabeledInput label="Cédula / RUC" required>
                    <input
                      type="text"
                      required={formData.hasDifferentPayer}
                      value={formData.payerCedula}
                      onChange={(e) => setFormData({...formData, payerCedula: e.target.value})}
                      className={inputClassGreen}
                      placeholder="0912345678"
                    />
                  </LabeledInput>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <LabeledInput label="Teléfono">
                    <input
                      type="tel"
                      value={formData.payerPhone}
                      onChange={(e) => setFormData({...formData, payerPhone: e.target.value})}
                      className={inputClassGreen}
                      placeholder="09XXXXXXXX"
                    />
                  </LabeledInput>
                  <LabeledInput label="Dirección">
                    <input
                      type="text"
                      value={formData.payerAddress || ''}
                      onChange={(e) => setFormData({...formData, payerAddress: e.target.value})}
                      className={inputClassGreen}
                      placeholder="Dirección"
                    />
                  </LabeledInput>
                </div>
              </div>
            )}
          </div>

          {/* CURSO y REGISTRO */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <h3 className="text-sm font-semibold text-gray-800">Curso y Registro</h3>
            <LabeledInput label="Curso" required>
              <select
                required
                value={formData.courseId}
                onChange={(e) => setFormData({...formData, courseId: e.target.value})}
                className={inputClass}
              >
                <option value="">Seleccionar curso</option>
                {(() => {
                  const regular = courses.filter(c => (c.priceType || c.price_type) === 'mes' || (c.priceType || c.price_type) === 'clase')
                  const packages = courses.filter(c => (c.priceType || c.price_type) === 'paquete')
                  const programs = courses.filter(c => (c.priceType || c.price_type) === 'programa')
                  return (
                    <>
                      {regular.length > 0 && (
                        <optgroup label="Clases Regulares">
                          {regular.map(c => (
                            <option key={c.id || c.code} value={c.id || c.code}>
                              {c.name} - ${c.price}/{c.priceType || c.price_type}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {packages.length > 0 && (
                        <optgroup label="Paquetes">
                          {packages.map(c => (
                            <option key={c.id || c.code} value={c.id || c.code}>
                              {c.name} - ${c.price}
                            </option>
                          ))}
                        </optgroup>
                      )}
                      {programs.length > 0 && (
                        <optgroup label="Programas">
                          {programs.map(c => (
                            <option key={c.id || c.code} value={c.id || c.code}>
                              {c.name} - ${c.price}
                            </option>
                          ))}
                        </optgroup>
                      )}
                    </>
                  )
                })()}
              </select>
            </LabeledInput>

            {formData.age && (() => {
              const age = parseInt(formData.age)
              const suggested = courses.filter(c => age >= (c.ageMin || c.age_min || 3) && age <= (c.ageMax || c.age_max || 99))
              return suggested.length > 0 ? (
                <p className="text-xs text-purple-600">
                  Sugeridos: {suggested.map(c => c.name.split(' - ')[0]).slice(0, 3).join(', ')}
                </p>
              ) : null
            })()}

            <LabeledInput label="Fecha de inscripción">
              <input
                type="date"
                value={formData.enrollmentDate}
                onChange={(e) => setFormData({...formData, enrollmentDate: e.target.value})}
                className={inputClass}
              />
            </LabeledInput>

            <LabeledInput label="Notas">
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({...formData, notes: e.target.value})}
                className={inputClass}
                rows={2}
                placeholder="Notas adicionales..."
              />
            </LabeledInput>
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
