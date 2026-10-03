import { useState, useEffect, useRef } from 'react'
import { X, Check, User, Users, CreditCard, Search, UserCheck } from 'lucide-react'
import { addDays, format } from 'date-fns'
import { getTodayEC, getCycleInfo, getNextNClassDays, getNextClassDay, getDaysToDueDate, getStudentCycleClasses, formatDate } from '../lib/dateUtils'

// Reusable labeled input component
function LabeledInput({ label, required, children }) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-gray-500 mb-0.5 uppercase tracking-wider">
        {label}{required && <span className="text-red-500 ml-0.5 text-xs font-bold">*</span>}
      </label>
      {children}
    </div>
  )
}

export default function StudentForm({
  student = null,
  courses = [],
  allStudents = [],
  onSubmit,
  onClose
}) {
  const isEditing = !!student

  // ── Buscador de representante ────────────────────────────────────
  const [parentSearch, setParentSearch] = useState('')
  const [parentDropdown, setParentDropdown] = useState(false)
  const searchRef = useRef(null)

  // Extrae representantes únicos de alumnos existentes (solo menores con parent_name)
  const knownParents = (() => {
    const seen = new Set()
    return (allStudents || [])
      .filter(s => s.is_minor && s.parent_name)
      .filter(s => {
        const key = (s.parent_name || '').toLowerCase().trim()
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .map(s => ({
        name:    s.parent_name    || '',
        cedula:  s.parent_cedula  || '',
        phone:   s.parent_phone   || '',
        email:   s.parent_email   || '',
        address: s.parent_address || '',
      }))
  })()

  const filteredParents = parentSearch.trim().length >= 2
    ? knownParents.filter(p =>
        p.name.toLowerCase().includes(parentSearch.toLowerCase()) ||
        p.phone.includes(parentSearch) ||
        p.cedula.includes(parentSearch)
      )
    : []

  function applyParent(p) {
    setFormData(prev => ({
      ...prev,
      parentName:    p.name,
      parentCedula:  p.cedula,
      parentPhone:   p.phone,
      parentEmail:   p.email,
      parentAddress: p.address,
    }))
    setParentSearch('')
    setParentDropdown(false)
  }
  // ─────────────────────────────────────────────────────────────────

  const [formData, setFormData] = useState({
    name: '', cedula: '', age: '', phone: '', email: '', address: '',
    isMinor: true,
    parentName: '', parentCedula: '', parentPhone: '', parentEmail: '', parentAddress: '',
    hasDifferentPayer: false,
    billingFromRep: true,
    billingFromSelf: true,
    payerName: '', payerCedula: '', payerPhone: '', payerAddress: '', payerEmail: '',
    courseId: '', notes: '',
    enrollmentDate: getTodayEC(),
    isCourtesy: false,
    courtesyEndDate: '',
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
        billingFromRep: !hasPayer && (student.is_minor !== false),
        billingFromSelf: !hasPayer && (student.is_minor === false),
        payerName: student.payer_name || '',
        payerCedula: student.payer_cedula || '',
        payerPhone: student.payer_phone || '',
        payerAddress: student.payer_address || '',
        payerEmail: student.payer_email || '',
        courseId: student.course_id || '',
        notes: student.notes || '',
        enrollmentDate: student.enrollment_date || getTodayEC(),
        isCourtesy: student.is_courtesy || false,
        courtesyEndDate: student.courtesy_end_date || '',
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

  const [submitting, setSubmitting] = useState(false)

  // ── Cambio de curso de una alumna existente ─────────────────────────
  const [changeMode, setChangeMode] = useState(null)      // 'renewal' | 'now' | 'immediate'
  const [changeFee, setChangeFee] = useState('')
  const [changeClasses, setChangeClasses] = useState(null)
  const [cancelNextCourse, setCancelNextCourse] = useState(false)

  const findCourse = (id) => courses.find(c => (c.id || c.code) === id || c.code === id || c.id === id)
  const priceTypeOf = (c) => c?.priceType || c?.price_type
  const isRecurringCourse = (c) => priceTypeOf(c) === 'mes' || priceTypeOf(c) === 'paquete'
  const classDaysOf = (c) => c?.classDays || c?.class_days || null
  const perCycleOf = (c) => c?.classesPerCycle || c?.classesPerPackage || c?.classes_per_cycle || null

  const oldCourse = isEditing ? findCourse(student.course_id) : null
  const newCourse = findCourse(formData.courseId)
  const courseChanged = isEditing && !!formData.courseId && formData.courseId !== student.course_id

  const change = (() => {
    if (!courseChanged || !newCourse) return null
    const oldFee = parseFloat(student.monthly_fee) || oldCourse?.price || 0
    const oldPrice = parseFloat(oldCourse?.price) || 0
    const newPrice = parseFloat(newCourse.price) || 0
    // Tarifa sugerida: si tenía tarifa histórica y el curso nuevo cuesta lo mismo, se mantiene
    const defaultFee = oldFee < oldPrice && newPrice === oldPrice ? oldFee : newPrice

    // ¿Tiene un ciclo pagado en curso con clases por tomar?
    let remaining = 0
    if (isRecurringCourse(oldCourse) && student.last_payment_date && student.next_payment_date &&
        classDaysOf(oldCourse) && perCycleOf(oldCourse) && getDaysToDueDate(student.next_payment_date) > 0) {
      const info = getCycleInfo(student.last_payment_date, student.next_payment_date, classDaysOf(oldCourse),
        perCycleOf(oldCourse), null, getStudentCycleClasses(student))
      if (info) remaining = Math.max(0, info.totalClasses - info.classesPassed)
    }
    const hasBalance = parseFloat(student.amount_paid || 0) > 0 && parseFloat(student.balance || 0) > 0
    const canConvert = remaining > 0 && !hasBalance && isRecurringCourse(newCourse) && classDaysOf(newCourse) && perCycleOf(newCourse)

    const fee = changeFee !== '' && !isNaN(parseFloat(changeFee)) ? parseFloat(changeFee) : defaultFee
    // Valor de lo que le queda (las congeladas no se cobran: precio por clase del ciclo estándar)
    const value = canConvert ? remaining * oldFee / perCycleOf(oldCourse) : 0
    const perClassNew = canConvert && fee > 0 ? fee / perCycleOf(newCourse) : 0
    const suggested = perClassNew > 0 ? Math.round(value / perClassNew) : 0
    const classes = changeClasses ?? suggested

    let nextPaymentDate = null
    if (canConvert) {
      const today = new Date(getTodayEC() + 'T12:00:00')
      const days = classDaysOf(newCourse)
      const list = classes > 0 ? getNextNClassDays(today, days, classes) : []
      const next = list.length > 0 ? getNextClassDay(addDays(list[list.length - 1], 1), days) : getNextClassDay(today, days)
      nextPaymentDate = format(next, 'yyyy-MM-dd')
    }

    const mode = changeMode || (remaining > 0 ? 'renewal' : 'immediate')
    return { oldFee, defaultFee, fee, remaining, hasBalance, canConvert, value, suggested, classes, nextPaymentDate, mode }
  })()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    if (change && change.mode === 'now' && !change.nextPaymentDate) return
    setSubmitting(true)
    await onSubmit({
      ...formData,
      courseChange: change ? { mode: change.mode, fee: change.fee, classes: change.classes, nextPaymentDate: change.nextPaymentDate } : null,
      cancelNextCourse,
    })
    setSubmitting(false) // solo llega aquí si el form sigue montado (caso error)
  }

  const inputClass = "w-full px-3 py-2 text-base border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-[#c98daa] focus:border-[#9e4d75] transition-all"
  const inputClassBlue = "w-full px-3 py-2 text-base border-2 border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-400 focus:border-blue-400 transition-all"
  const inputClassGreen = "w-full px-3 py-2 text-base border-2 border-green-100 rounded-xl focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-all"

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 flex items-center justify-between sticky top-0 bg-[#551735] text-white z-10 rounded-t-2xl">
          <h2 className="font-semibold">
            {isEditing ? 'Editar Alumno' : 'Nuevo Alumno'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-xl active:scale-95 transition-all">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Toggle Menor / Adulto */}
          <div className="flex rounded-xl overflow-hidden border-2 border-[#e8b4cc]">
            <button
              type="button"
              onClick={() => setFormData({...formData, isMinor: true})}
              className={`flex-1 py-2 text-sm font-medium active:scale-95 transition-all flex items-center justify-center gap-1.5 ${
                formData.isMinor
                  ? 'bg-[#6b2145] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Users size={14} />
              Menor de edad
            </button>
            <button
              type="button"
              onClick={() => setFormData({...formData, isMinor: false, age: ''})}
              className={`flex-1 py-2 text-sm font-medium active:scale-95 transition-all flex items-center justify-center gap-1.5 ${
                !formData.isMinor
                  ? 'bg-[#6b2145] text-white'
                  : 'bg-white text-gray-600 hover:bg-gray-50'
              }`}
            >
              <User size={14} />
              Adulto
            </button>
          </div>

          {/* DATOS DEL ALUMNO */}
          <div className="bg-[#fdf5f9] rounded-xl p-3">
            <h3 className="text-sm font-semibold text-[#441029] mb-3 flex items-center gap-1.5">
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
            <div className="bg-blue-50 rounded-xl p-3">
              <h3 className="text-sm font-semibold text-blue-800 mb-3 flex items-center gap-1.5">
                <Users size={14} /> Representante
              </h3>

              {/* ── Buscador de representante existente ── */}
              {!isEditing && knownParents.length > 0 && (
                <div className="relative mb-3" ref={searchRef}>
                  <div className="flex items-center gap-1.5 w-full border border-blue-200 rounded-xl bg-white px-2.5 py-1.5 focus-within:ring-2 focus-within:ring-blue-400">
                    <Search size={13} className="text-blue-400 shrink-0" />
                    <input
                      type="text"
                      value={parentSearch}
                      onChange={e => { setParentSearch(e.target.value); setParentDropdown(true) }}
                      onFocus={() => setParentDropdown(true)}
                      onBlur={() => setTimeout(() => setParentDropdown(false), 150)}
                      placeholder="Buscar representante existente…"
                      className="flex-1 min-w-0 text-xs bg-transparent focus:outline-none placeholder-blue-300"
                    />
                  </div>
                  {parentDropdown && filteredParents.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-blue-200 rounded-xl shadow-lg overflow-hidden max-h-48 overflow-y-auto">
                      {filteredParents.map((p, i) => (
                        <button
                          key={i}
                          type="button"
                          onMouseDown={() => applyParent(p)}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-left hover:bg-blue-50 active:scale-95 transition-all border-b border-gray-50 last:border-0"
                        >
                          <UserCheck size={14} className="text-blue-500 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                            <p className="text-[10px] text-gray-400 truncate">{p.phone}{p.cedula ? ` · ${p.cedula}` : ''}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                  {parentDropdown && parentSearch.trim().length >= 2 && filteredParents.length === 0 && (
                    <div className="absolute z-20 w-full mt-1 bg-white border border-blue-100 rounded-xl shadow px-3 py-2">
                      <p className="text-xs text-gray-400">Sin coincidencias — ingresa los datos manualmente</p>
                    </div>
                  )}
                </div>
              )}

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

          {/* DATOS DE FACTURACIÓN */}
          {(() => {
            const isMinor   = formData.isMinor
            const useRep    = isMinor  && formData.billingFromRep
            const useSelf   = !isMinor && formData.billingFromSelf

            // Fuente de datos según modo
            const billingName    = useRep  ? formData.parentName    : useSelf ? formData.name        : formData.payerName
            const billingCedula  = useRep  ? formData.parentCedula  : useSelf ? formData.cedula      : formData.payerCedula
            const billingPhone   = useRep  ? formData.parentPhone   : useSelf ? formData.phone       : formData.payerPhone
            const billingEmail   = useRep  ? formData.parentEmail   : useSelf ? formData.email       : formData.payerEmail
            const billingAddress = useRep  ? formData.parentAddress : useSelf ? formData.address     : formData.payerAddress

            const disabled = useRep || useSelf
            const setPayerField = (field, val) => setFormData(prev => ({ ...prev, [field]: val }))

            return (
              <div className="bg-green-50 border-2 border-green-100 rounded-xl p-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-green-800 flex items-center gap-1.5">
                    <CreditCard size={14} /> Datos de Facturación
                  </h3>
                  {isMinor ? (
                    <label className="flex items-center gap-1.5 text-xs text-green-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.billingFromRep}
                        onChange={(e) => setFormData(prev => ({ ...prev, billingFromRep: e.target.checked }))}
                        className="w-3.5 h-3.5 text-green-600 rounded"
                      />
                      Usar datos del representante
                    </label>
                  ) : (
                    <label className="flex items-center gap-1.5 text-xs text-green-700 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formData.billingFromSelf}
                        onChange={(e) => setFormData(prev => ({ ...prev, billingFromSelf: e.target.checked }))}
                        className="w-3.5 h-3.5 text-green-600 rounded"
                      />
                      Usar mis datos
                    </label>
                  )}
                </div>

                <div className="space-y-2">
                  <LabeledInput label="Nombre / Razón social">
                    <input
                      type="text"
                      value={billingName}
                      disabled={disabled}
                      onChange={(e) => setPayerField('payerName', e.target.value)}
                      className={`${inputClassGreen} disabled:opacity-60 disabled:bg-green-100`}
                      placeholder="Nombre completo o empresa"
                    />
                  </LabeledInput>

                  <div className="grid grid-cols-2 gap-2">
                    <LabeledInput label="Cédula / RUC" required={!isMinor}>
                      <input
                        type="text"
                        required={!isMinor}
                        value={billingCedula}
                        disabled={disabled}
                        onChange={(e) => setPayerField('payerCedula', e.target.value)}
                        className={`${inputClassGreen} disabled:opacity-60 disabled:bg-green-100`}
                        placeholder="0912345678"
                      />
                    </LabeledInput>
                    <LabeledInput label="Teléfono">
                      <input
                        type="tel"
                        value={billingPhone}
                        disabled={disabled}
                        onChange={(e) => setPayerField('payerPhone', e.target.value)}
                        className={`${inputClassGreen} disabled:opacity-60 disabled:bg-green-100`}
                        placeholder="09XXXXXXXX"
                      />
                    </LabeledInput>
                  </div>

                  <LabeledInput label="Email de facturación">
                    <input
                      type="email"
                      value={billingEmail}
                      disabled={disabled}
                      onChange={(e) => setPayerField('payerEmail', e.target.value)}
                      className={`${inputClassGreen} disabled:opacity-60 disabled:bg-green-100`}
                      placeholder="correo@email.com"
                    />
                  </LabeledInput>

                  <LabeledInput label="Dirección">
                    <input
                      type="text"
                      value={billingAddress}
                      disabled={disabled}
                      onChange={(e) => setPayerField('payerAddress', e.target.value)}
                      className={`${inputClassGreen} disabled:opacity-60 disabled:bg-green-100`}
                      placeholder="Dirección"
                    />
                  </LabeledInput>
                </div>

                {isMinor && formData.billingFromRep && (
                  <p className="text-[10px] text-green-600 mt-2">
                    El comprobante se emitirá a nombre del representante registrado.
                  </p>
                )}
              </div>
            )
          })()}

          {/* CURSO y REGISTRO */}
          <div className="bg-gray-50 rounded-xl p-3 space-y-2">
            <h3 className="text-sm font-semibold text-gray-800">Curso y Registro</h3>
            <LabeledInput label="Curso" required>
              <select
                required
                value={formData.courseId}
                onChange={(e) => {
                  setFormData({...formData, courseId: e.target.value})
                  // Al elegir otro curso se reinician las opciones del cambio
                  setChangeMode(null); setChangeFee(''); setChangeClasses(null)
                }}
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

            {/* Cambio de curso programado (al renovar) */}
            {isEditing && !courseChanged && student.next_course_id && (
              <div className="rounded-xl border border-line bg-surface px-3 py-2.5 text-xs text-ink-soft flex items-center justify-between gap-2">
                <span>
                  {cancelNextCourse
                    ? 'Se cancelará el cambio programado.'
                    : <>Al renovar pasa a <strong className="text-ink">{findCourse(student.next_course_id)?.name || 'otro curso'}</strong>.</>}
                </span>
                <button type="button" onClick={() => setCancelNextCourse(v => !v)} className="sd-btn sd-btn-ghost sd-btn-sm shrink-0">
                  {cancelNextCourse ? 'Mantener' : 'Cancelar cambio'}
                </button>
              </div>
            )}

            {/* Cambio de curso: cuándo aplica y qué pasa con lo pagado */}
            {change && (
              <div className="rounded-xl border border-line-strong bg-surface p-3 space-y-3 text-sm">
                <p className="font-semibold text-ink">Cambio de curso</p>

                {change.remaining > 0 ? (
                  <>
                    <p className="text-xs text-ink-soft leading-relaxed">
                      Le quedan <strong className="text-ink">{change.remaining} {change.remaining === 1 ? 'clase' : 'clases'}</strong> pagadas de {oldCourse?.name}.
                    </p>
                    <label className="flex items-start gap-2 cursor-pointer">
                      <input type="radio" name="changeMode" className="mt-1" checked={change.mode === 'renewal'} onChange={() => setChangeMode('renewal')} />
                      <span>
                        <span className="font-medium text-ink">Al renovar (recomendado)</span>
                        <span className="block text-xs text-ink-muted">
                          Termina lo pagado en su curso actual y pasa a {newCourse?.name} desde su próxima renovación ({formatDate(student.next_payment_date)}).
                        </span>
                      </span>
                    </label>
                    <label className={`flex items-start gap-2 ${change.canConvert ? 'cursor-pointer' : 'opacity-50'}`}>
                      <input type="radio" name="changeMode" className="mt-1" disabled={!change.canConvert} checked={change.mode === 'now'} onChange={() => setChangeMode('now')} />
                      <span>
                        <span className="font-medium text-ink">Desde ahora</span>
                        <span className="block text-xs text-ink-muted">
                          {change.hasBalance
                            ? 'No disponible: tiene un saldo pendiente en el ciclo actual.'
                            : `Sus ${change.remaining} clases restantes (≈ $${change.value.toFixed(2)}) se convierten en clases del curso nuevo.`}
                        </span>
                      </span>
                    </label>
                  </>
                ) : (
                  <p className="text-xs text-ink-soft leading-relaxed">
                    No tiene clases pagadas pendientes: el cambio aplica desde ya y su próximo pago será del curso nuevo.
                  </p>
                )}

                <div className="grid grid-cols-2 gap-2">
                  <LabeledInput label="Tarifa en el curso nuevo">
                    <input type="number" step="0.01" min="0" value={changeFee !== '' ? changeFee : change.defaultFee}
                      onChange={(e) => { setChangeFee(e.target.value); setChangeClasses(null) }} className={inputClass} />
                  </LabeledInput>
                  {change.mode === 'now' && (
                    <LabeledInput label="Clases en el curso nuevo">
                      <input type="number" min="0" max="60" value={change.classes}
                        onChange={(e) => setChangeClasses(Math.max(0, parseInt(e.target.value) || 0))} className={inputClass} />
                    </LabeledInput>
                  )}
                </div>
                {change.defaultFee !== (parseFloat(newCourse?.price) || 0) && changeFee === '' && (
                  <p className="text-[11px] text-ink-muted -mt-1">Se mantiene su tarifa histórica (el curso nuevo cuesta lo mismo).</p>
                )}
                {change.mode === 'now' && change.nextPaymentDate && (
                  <p className="text-xs text-ink-soft">
                    Sugerido: {change.suggested} {change.suggested === 1 ? 'clase' : 'clases'}. Próximo cobro: <strong className="text-ink">{formatDate(change.nextPaymentDate, 'EEEE dd/MM')}</strong>.
                  </p>
                )}
              </div>
            )}

            {formData.age && (() => {
              const age = parseInt(formData.age)
              const suggested = courses.filter(c => age >= (c.ageMin || c.age_min || 3) && age <= (c.ageMax || c.age_max || 99))
              return suggested.length > 0 ? (
                <p className="text-xs text-[#6b2145]">
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

            {/* Pase de Cortesía */}
            <div className={`rounded-xl border-2 p-3 transition-all ${formData.isCourtesy ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-gray-50'}`}>
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formData.isCourtesy}
                  onChange={(e) => setFormData({ ...formData, isCourtesy: e.target.checked, courtesyEndDate: e.target.checked ? formData.courtesyEndDate : '' })}
                  className="w-4 h-4 accent-amber-500 rounded"
                />
                <div>
                  <span className="text-sm font-semibold text-gray-700">Pase de Cortesía / VIP</span>
                  <p className="text-[11px] text-gray-500 leading-tight">No genera registros financieros</p>
                </div>
              </label>
              {formData.isCourtesy && (
                <div className="mt-2.5">
                  <label className="block text-[10px] font-medium text-amber-700 mb-0.5 uppercase tracking-wider">Válido hasta</label>
                  <input
                    type="date"
                    value={formData.courtesyEndDate}
                    onChange={(e) => setFormData({ ...formData, courtesyEndDate: e.target.value })}
                    className="w-full px-3 py-2 text-sm border-2 border-amber-300 rounded-xl focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white transition-all"
                  />
                </div>
              )}
            </div>

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
              className="flex-1 px-4 py-2.5 border border-gray-200 text-gray-600 rounded-2xl hover:bg-gray-50 active:scale-95 transition-all font-medium text-sm"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-[#6b2145] hover:bg-[#551735] active:scale-95 transition-all disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-2xl font-medium text-sm flex items-center justify-center gap-1.5"
            >
              {submitting ? (
                <>
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Guardando...
                </>
              ) : (
                <>
                  <Check size={16} />
                  {isEditing ? 'Guardar' : 'Registrar'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
