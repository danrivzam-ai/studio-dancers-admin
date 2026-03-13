import { useState, useRef, useEffect } from 'react'
import { toPng } from 'html-to-image'
import {
  Plus, X, ChevronDown, ChevronUp,
  CheckCircle, Clock, AlertCircle, Printer, Trash2, PackageCheck,
  Search, Minus, ClipboardList, Database, Copy, Check,
  Eye, MessageCircle
} from 'lucide-react'

const PAYMENT_METHODS = ['Efectivo', 'Transferencia']

// ─── Utilidades ──────────────────────────────────────────────────────────────
const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`
const fmtDate = (d) => {
  if (!d) return ''
  const dt = new Date(d + 'T12:00:00')
  return dt.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Toast global ─────────────────────────────────────────────────────────────
function Toast({ msg, type = 'success', onDone }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500)
    return () => clearTimeout(t)
  }, [onDone])
  const colors = {
    success: 'bg-green-600',
    error:   'bg-red-600',
    info:    'bg-purple-600',
  }
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] px-5 py-3 rounded-2xl text-white text-sm font-semibold shadow-2xl flex items-center gap-2.5 max-w-xs text-center ${colors[type]}`}>
      {type === 'success' && <CheckCircle size={16} />}
      {type === 'error'   && <AlertCircle size={16} />}
      {msg}
    </div>
  )
}

// ─── Banner: migración pendiente ──────────────────────────────────────────────
const SETUP_SQL = `-- Ejecutar en Supabase → SQL Editor
CREATE TABLE IF NOT EXISTS sale_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT NOT NULL,
  customer_cedula_ruc TEXT,
  customer_email TEXT,
  items JSONB NOT NULL DEFAULT '[]',
  total_amount DECIMAL(10,2) NOT NULL,
  amount_paid DECIMAL(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','partial','paid','cancelled')),
  delivered BOOLEAN NOT NULL DEFAULT false,
  notes TEXT,
  requires_invoice BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS sale_plan_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES sale_plans(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  installment_number INT NOT NULL DEFAULT 1,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE sale_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE sale_plan_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sale_plans_all" ON sale_plans;
DROP POLICY IF EXISTS "sale_plan_payments_all" ON sale_plan_payments;
CREATE POLICY "sale_plans_all" ON sale_plans FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "sale_plan_payments_all" ON sale_plan_payments FOR ALL USING (true) WITH CHECK (true);`

function DbSetupBanner({ error, onRetry }) {
  const [copied, setCopied] = useState(false)
  const isTableMissing = error && (error.includes('does not exist') || error.includes('relation') || error.includes('42P01'))

  const handleCopy = () => {
    navigator.clipboard.writeText(SETUP_SQL).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-5 space-y-3">
      <div className="flex items-start gap-3">
        <Database size={22} className="text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-amber-800">Configuración pendiente</p>
          <p className="text-sm text-amber-700 mt-1">
            {isTableMissing
              ? 'Las tablas de planes de abono no existen aún en Supabase. Sigue los pasos:'
              : `Error: ${error}`}
          </p>
        </div>
      </div>

      {isTableMissing && (
        <ol className="text-sm text-amber-800 space-y-1 ml-7 list-decimal">
          <li>Abre <strong>Supabase → SQL Editor</strong></li>
          <li>Copia el SQL y pégalo, luego presiona <strong>Run</strong></li>
          <li>Vuelve aquí y recarga la página</li>
        </ol>
      )}

      <div className="flex gap-2 ml-7">
        {isTableMissing && (
          <button onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 bg-amber-600 text-white rounded-xl text-xs font-semibold hover:bg-amber-700 transition-all">
            {copied ? <><Check size={13} /> Copiado</> : <><Copy size={13} /> Copiar SQL</>}
          </button>
        )}
        <button onClick={onRetry}
          className="px-3 py-2 border-2 border-amber-400 text-amber-700 rounded-xl text-xs font-semibold hover:bg-amber-100 transition-all">
          Reintentar
        </button>
      </div>
    </div>
  )
}

// ─── StatusBadge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const cfg = {
    pending:   { label: 'Pendiente',  cls: 'bg-gray-100 text-gray-600',   icon: Clock },
    partial:   { label: 'En abonos',  cls: 'bg-amber-100 text-amber-700', icon: AlertCircle },
    paid:      { label: 'Pagado',     cls: 'bg-green-100 text-green-700', icon: CheckCircle },
    cancelled: { label: 'Cancelado',  cls: 'bg-red-100 text-red-600',     icon: X },
  }
  const { label, cls, icon: Icon } = cfg[status] || cfg.pending
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${cls}`}>
      <Icon size={11} /> {label}
    </span>
  )
}

// ─── Recibo de abono ──────────────────────────────────────────────────────────
function InstallmentReceipt({ plan, payment, installmentNumber, balance, onClose, schoolName = 'Studio Dancers' }) {
  const receiptRef = useRef(null)
  const [downloading, setDownloading] = useState(false)

  const handleDownload = async () => {
    if (!receiptRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(receiptRef.current, { pixelRatio: 2, backgroundColor: '#ffffff', cacheBust: true })
      const filename = `Abono_${plan.customer_name.replace(/\s+/g, '_')}_${installmentNumber}.png`

      // Convertir data URL a blob para mejor compatibilidad móvil
      const res = await fetch(dataUrl)
      const blob = await res.blob()

      // Intentar compartir en móvil (nativo)
      if (navigator.share && navigator.canShare?.({ files: [new File([blob], filename, { type: 'image/png' })] })) {
        const file = new File([blob], filename, { type: 'image/png' })
        await navigator.share({ files: [file], title: 'Comprobante de abono' })
      } else {
        // Fallback: descargar con blob URL
        const blobUrl = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = blobUrl
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
      }
    } catch (e) { console.error('toPng error:', e) }
    setDownloading(false)
  }

  const itemsLabel = Array.isArray(plan.items)
    ? plan.items.map(i => `${i.name}${i.quantity > 1 ? ` x${i.quantity}` : ''}`).join(', ')
    : ''

  const amtPaid = parseFloat(plan.amount_paid || 0)
  const total   = parseFloat(plan.total_amount || 0)

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Acciones */}
        <div className="flex justify-between items-center px-4 py-3 border-b bg-gray-50">
          <p className="font-semibold text-gray-700 text-sm">Comprobante de abono</p>
          <div className="flex gap-2">
            <button onClick={handleDownload} disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 disabled:opacity-50">
              <Printer size={13} /> {downloading ? 'Guardando...' : (navigator.share ? 'Compartir' : 'Descargar PNG')}
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Recibo visual */}
        <div ref={receiptRef} className="p-6 bg-white" style={{ minWidth: 320 }}>
          <div className="text-center mb-4">
            <p className="font-bold text-lg tracking-wide uppercase">{schoolName}</p>
            <p className="text-xs text-gray-500 mt-1">Comprobante de Abono #{installmentNumber}</p>
            <div className="border-t border-dashed border-gray-300 mt-3" />
          </div>

          <div className="space-y-1.5 mb-4 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-gray-500">Cliente:</span>
              <span className="font-semibold text-right ml-4">{plan.customer_name}</span>
            </div>
            {plan.customer_cedula_ruc && (
              <div className="flex justify-between">
                <span className="text-gray-500">C.I.:</span>
                <span>{plan.customer_cedula_ruc}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Artículo(s):</span>
              <span className="text-right ml-4 max-w-[60%]">{itemsLabel}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-300 mb-4" />

          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex justify-between">
              <span className="text-gray-500">Abono #{installmentNumber}:</span>
              <span className="font-bold text-green-700">{fmt(payment?.amount)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total plan:</span>
              <span>{fmt(total)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Total pagado:</span>
              <span>{fmt(amtPaid)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span className="text-gray-700">Saldo pendiente:</span>
              <span className={balance <= 0 ? 'text-green-600' : 'text-amber-700'}>{fmt(balance)}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-300 mt-4 mb-3" />

          <div className="text-center text-xs text-gray-400 font-mono">
            <p>{payment?.payment_method} · {fmtDate(payment?.payment_date || new Date().toISOString().split('T')[0])}</p>
            {balance <= 0 && <p className="font-bold text-green-600 mt-1">✓ PLAN CANCELADO</p>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal: Registrar abono ───────────────────────────────────────────────────
function PaymentModal({ plan, onConfirm, onClose, loading, serverError }) {
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('Efectivo')
  const [notes,  setNotes]  = useState('')
  const [error,  setError]  = useState('')
  const [confirmStep, setConfirmStep] = useState(false)

  const balance = parseFloat(plan.total_amount) - parseFloat(plan.amount_paid)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    const val = parseFloat(amount)
    if (!val || val <= 0)     { setError('Ingresa un monto válido'); return }
    if (val > balance + 0.01) { setError(`El abono supera el saldo pendiente (${fmt(balance)})`); return }
    setConfirmStep(true)
  }

  const handleConfirm = () => {
    onConfirm({ amount: parseFloat(amount), paymentMethod: method, notes })
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="relative bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div>
            <p className="font-semibold text-gray-800">Registrar abono</p>
            <p className="text-xs text-gray-500 mt-0.5">{plan.customer_name}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Saldo actual */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 flex justify-between items-center">
            <div>
              <p className="text-xs text-amber-600">Saldo pendiente</p>
              <p className="font-bold text-amber-800 text-xl">{fmt(balance)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Pagado</p>
              <p className="text-sm font-semibold text-gray-600">{fmt(plan.amount_paid)} / {fmt(plan.total_amount)}</p>
            </div>
          </div>

          {/* Monto */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Monto del abono *</label>
            <div className="flex items-center gap-1.5 border-2 border-gray-200 rounded-xl px-3 py-3 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 bg-white">
              <span className="text-gray-400 font-medium shrink-0">$</span>
              <input type="number" step="0.01" min="0.01" value={amount}
                onChange={e => setAmount(e.target.value)}
                className="flex-1 text-base outline-none bg-transparent"
                placeholder="0.00" autoFocus required />
            </div>
            <button type="button" onClick={() => setAmount(balance.toFixed(2))}
              className="mt-1.5 text-xs text-purple-600 hover:text-purple-700 font-medium">
              Pagar saldo completo ({fmt(balance)})
            </button>
          </div>

          {/* Método */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Forma de pago</label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map(m => (
                <button key={m} type="button" onClick={() => setMethod(m)}
                  className={`py-2.5 rounded-xl text-sm font-semibold border-2 transition-all ${method === m ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Nota (opcional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400"
              placeholder="Observación..." />
          </div>

          {(error || serverError) && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 leading-relaxed">
              {error || serverError}
            </p>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 transition-all">
            Revisar abono
          </button>
        </form>

        {/* ── Paso de confirmación ──────────────────────────────────── */}
        {confirmStep && (
          <div className="absolute inset-0 bg-white rounded-t-3xl sm:rounded-2xl flex flex-col p-5 gap-4 z-10">
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                <Check size={22} className="text-purple-600" />
              </div>
              <h3 className="font-bold text-gray-800">¿Confirmar este abono?</h3>
              <p className="text-xs text-gray-500 mt-1">Revisa los datos antes de registrar</p>
            </div>
            <div className="rounded-2xl border border-gray-100 divide-y divide-gray-100 overflow-hidden">
              <div className="flex justify-between items-center px-4 py-2.5">
                <span className="text-sm text-gray-500">Cliente</span>
                <span className="text-sm font-semibold text-gray-800 text-right max-w-[55%] truncate">{plan.customer_name}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-3 bg-purple-50">
                <span className="text-sm text-gray-600 font-medium">Abono</span>
                <span className="text-2xl font-extrabold text-purple-700">{fmt(parseFloat(amount))}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-2.5">
                <span className="text-sm text-gray-500">Saldo restante</span>
                <span className="text-sm font-semibold text-amber-700">{fmt(Math.max(0, balance - parseFloat(amount)))}</span>
              </div>
              <div className="flex justify-between items-center px-4 py-2.5">
                <span className="text-sm text-gray-500">Método</span>
                <span className="text-sm font-semibold text-gray-800">{method}</span>
              </div>
              {notes && (
                <div className="flex justify-between items-center px-4 py-2.5">
                  <span className="text-sm text-gray-500">Notas</span>
                  <span className="text-sm font-semibold text-gray-800 text-right max-w-[55%]">{notes}</span>
                </div>
              )}
            </div>
            <div className="flex gap-3 mt-auto">
              <button type="button" onClick={() => setConfirmStep(false)}
                className="flex-1 px-4 py-3 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 active:scale-95 transition-all text-sm">
                ← Editar
              </button>
              <button type="button" onClick={handleConfirm} disabled={loading}
                className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-semibold">
                <Check size={18} />
                {loading ? 'Registrando...' : 'Sí, registrar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Modal: Nuevo plan ─────────────────────────────────────────────────────────
function NewPlanModal({ allProducts, students = [], onConfirm, onClose, loading, preselect = null }) {
  const [customerName,   setCustomerName]   = useState('')
  const [customerCedula, setCustomerCedula] = useState('')
  const [customerEmail,  setCustomerEmail]  = useState('')
  const [customerPhone,  setCustomerPhone]  = useState('')
  const [notes,          setNotes]          = useState('')
  const [studentSearch,  setStudentSearch]  = useState('')
  const [productSearch,  setProductSearch]  = useState('')
  const [cart,           setCart]           = useState(preselect ? [{ product: preselect, quantity: 1 }] : [])
  const [customTotal,    setCustomTotal]    = useState('')
  const [error,          setError]          = useState('')
  const [showStudents,   setShowStudents]   = useState(false)
  const [selectedStudent, setSelectedStudent] = useState(null) // alumna vinculada

  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const total     = customTotal ? parseFloat(customTotal) : cartTotal

  const fillFromStudent = (student) => {
    if (student.is_minor) {
      setCustomerName(student.parent_name || student.name)
      setCustomerCedula(student.parent_cedula || '')
      setCustomerEmail(student.parent_email || '')
      setCustomerPhone(student.parent_phone || student.phone || '')
    } else {
      setCustomerName(student.name)
      setCustomerCedula(student.cedula || '')
      setCustomerEmail(student.email || '')
      setCustomerPhone(student.phone || '')
    }
    setSelectedStudent(student)
    setStudentSearch('')
    setShowStudents(false)
  }

  const filteredStudents = studentSearch.length >= 2
    ? students.filter(s =>
        s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
        (s.cedula || '').includes(studentSearch)
      ).slice(0, 6)
    : []

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      const next = existing
        ? prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
        : [...prev, { product, quantity: 1 }]
      const newCartTotal = next.reduce((s, i) => s + i.product.price * i.quantity, 0)
      setCustomTotal(newCartTotal.toFixed(2))
      return next
    })
    setProductSearch('')
  }

  const removeFromCart = (productId) => {
    setCart(prev => {
      const next = prev.filter(i => i.product.id !== productId)
      const newCartTotal = next.reduce((s, i) => s + i.product.price * i.quantity, 0)
      setCustomTotal(newCartTotal > 0 ? newCartTotal.toFixed(2) : '')
      return next
    })
  }
  const updateQty = (productId, qty) => {
    if (qty <= 0) { removeFromCart(productId); return }
    setCart(prev => {
      const next = prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i)
      const newCartTotal = next.reduce((s, i) => s + i.product.price * i.quantity, 0)
      setCustomTotal(newCartTotal.toFixed(2))
      return next
    })
  }

  const handleSubmit = () => {
    setError('')
    if (!customerName.trim()) { setError('Ingresa el nombre del cliente'); return }
    if (cart.length === 0)    { setError('Agrega al menos un artículo'); return }
    if (!total || total <= 0) { setError('El total debe ser mayor a 0'); return }
    onConfirm({
      customerName:   customerName.trim(),
      customerCedula: customerCedula.trim() || null,
      customerEmail:  customerEmail.trim() || null,
      customerPhone:  customerPhone.trim() || null,
      studentId:      selectedStudent?.id || null,
      studentName:    selectedStudent ? selectedStudent.name : null,
      studentCourse:  selectedStudent?.course_name || null,
      items: cart.map(i => ({
        product_code: i.product.code || i.product.id,
        name:         i.product.name,
        quantity:     i.quantity,
        unit_price:   i.product.price
      })),
      totalAmount: total,
      notes: notes.trim() || null
    })
  }

  const filteredProducts = productSearch
    ? allProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
    : []

  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <p className="font-semibold text-gray-800">Nuevo plan de abonos</p>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl"><X size={18} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">

          {/* Buscar alumna (autocompletar) */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Buscar alumna en sistema</label>
            <div className="flex items-center gap-2 border-2 border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-purple-400 bg-white">
              <Search size={14} className="text-gray-400 shrink-0" />
              <input
                type="text"
                value={studentSearch}
                onChange={e => { setStudentSearch(e.target.value); setShowStudents(true) }}
                onFocus={() => setShowStudents(true)}
                onBlur={() => setTimeout(() => setShowStudents(false), 250)}
                placeholder="Nombre o cédula..."
                className="flex-1 text-sm outline-none bg-transparent"
              />
              {studentSearch && (
                <button type="button" onMouseDown={() => { setStudentSearch(''); setShowStudents(false) }}
                  className="text-gray-300 hover:text-gray-500 shrink-0">
                  <X size={14} />
                </button>
              )}
            </div>
            {showStudents && filteredStudents.length > 0 && (
              <div className="mt-1 border-2 border-purple-200 rounded-xl overflow-hidden bg-white shadow-lg z-10">
                {filteredStudents.map(s => (
                  <button key={s.id} type="button"
                    onMouseDown={(e) => { e.preventDefault(); fillFromStudent(s) }}
                    className="w-full px-3 py-2.5 text-left flex justify-between items-center hover:bg-purple-50 border-b last:border-0">
                    <span className="text-sm font-medium text-gray-800">{s.name}</span>
                    {s.cedula && <span className="text-xs text-gray-400 ml-2">{s.cedula}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info alumna seleccionada */}
          {selectedStudent && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl px-3 py-2 flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-purple-800">
                  👩‍🎓 {selectedStudent.name}
                  {selectedStudent.is_minor && <span className="ml-1 text-purple-500">(menor)</span>}
                </p>
                {selectedStudent.course_name && (
                  <p className="text-[10px] text-purple-600">🎓 {selectedStudent.course_name}</p>
                )}
              </div>
              <button type="button" onClick={() => {
                setSelectedStudent(null)
                setCustomerName(''); setCustomerCedula(''); setCustomerEmail(''); setCustomerPhone('')
              }} className="text-purple-400 hover:text-purple-600">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Nombre */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              {selectedStudent?.is_minor ? 'Nombre del representante *' : 'Nombre completo *'}
            </label>
            <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400"
              placeholder={selectedStudent?.is_minor ? 'Nombre del representante' : 'Nombre completo'} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Cédula / RUC</label>
              <input type="text" value={customerCedula} onChange={e => setCustomerCedula(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400"
                placeholder="0912345678" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">WhatsApp</label>
              <input type="tel" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400"
                placeholder="0991234567" />
            </div>
          </div>

          {/* Artículos */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Artículos *</label>
            <div className="flex items-center gap-2 border-2 border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-purple-400 bg-white">
              <Search size={14} className="text-gray-400 shrink-0" />
              <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                placeholder="Buscar y agregar artículo..."
                className="flex-1 text-sm outline-none bg-transparent" />
              {productSearch && (
                <button type="button" onMouseDown={() => setProductSearch('')}
                  className="text-gray-300 hover:text-gray-500 shrink-0">
                  <X size={14} />
                </button>
              )}
            </div>

            {filteredProducts.length > 0 && (
              <div className="mt-1 border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                {filteredProducts.map(p => {
                  const outOfStock = p.stock !== null && p.stock !== undefined && p.stock === 0
                  return (
                    <button key={p.id} type="button"
                      onMouseDown={() => addToCart(p)}
                      disabled={outOfStock}
                      className="w-full px-3 py-2.5 text-left text-sm flex justify-between items-center hover:bg-gray-50 border-b last:border-0 disabled:opacity-40">
                      <span className="font-medium">{p.name}</span>
                      <span className="text-xs text-gray-500 shrink-0 ml-2">${p.price}</span>
                    </button>
                  )
                })}
              </div>
            )}
            {productSearch && filteredProducts.length === 0 && (
              <p className="text-xs text-gray-400 text-center py-2 mt-1">Sin resultados</p>
            )}

            {cart.length > 0 && (
              <div className="space-y-2 mt-3">
                {cart.map(({ product, quantity }) => (
                  <div key={product.id} className="flex items-center gap-2 bg-gray-50 rounded-xl border border-gray-100 px-3 py-2">
                    <span className="flex-1 text-sm font-medium text-gray-800 truncate">{product.name}</span>
                    <span className="text-xs text-gray-500 shrink-0">${product.price}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <button type="button" onMouseDown={() => updateQty(product.id, quantity - 1)}
                        className="w-6 h-6 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-full">
                        <Minus size={11} />
                      </button>
                      <span className="w-5 text-center text-xs font-bold">{quantity}</span>
                      <button type="button" onMouseDown={() => updateQty(product.id, quantity + 1)}
                        className="w-6 h-6 flex items-center justify-center bg-gray-200 hover:bg-gray-300 rounded-full">
                        <Plus size={11} />
                      </button>
                    </div>
                    <button type="button" onMouseDown={() => removeFromCart(product.id)}
                      className="text-red-400 hover:text-red-600">
                      <X size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Precio total del producto *
            </label>
            <div className="flex items-center gap-1.5 border-2 border-gray-200 rounded-xl px-3 py-2.5 focus-within:border-purple-400 bg-white">
              <span className="text-gray-400 font-medium text-sm shrink-0">$</span>
              <input type="number" step="0.01" min="0.01" value={customTotal}
                onChange={e => setCustomTotal(e.target.value)}
                className="flex-1 text-sm outline-none bg-transparent"
                placeholder="0.00" />
            </div>
            <p className="text-xs text-gray-400 mt-1">Se llena automáticamente al seleccionar el artículo. Puedes ajustarlo si hay descuento.</p>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Nota (opcional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400"
              placeholder="Ej: Uniforme show de mayo, talla M..." />
          </div>

          {error && <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">{error}</p>}
        </div>

        <div className="px-5 py-4 border-t bg-white shrink-0">
          <button type="button" onClick={handleSubmit} disabled={loading}
            className="w-full py-3.5 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 disabled:opacity-50 transition-all">
            {loading ? 'Guardando...' : `Crear plan · ${total > 0 ? fmt(total) : '$--'}`}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Tarjeta de plan ──────────────────────────────────────────────────────────
// Formatea teléfono Ecuador para wa.me (09XX → 593XX)
function buildWALink(plan) {
  const balance  = parseFloat(plan.total_amount) - parseFloat(plan.amount_paid)
  const items    = Array.isArray(plan.items) ? plan.items.map(i => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ') : ''
  const payments = plan.sale_plan_payments || []
  const last     = [...payments].sort((a, b) => b.installment_number - a.installment_number)[0]

  let msg = `Hola *${plan.customer_name}*, le contactamos de *Studio Dancers* sobre su plan de abono.`
  msg += `\n\n🛍️ *Artículo(s):* ${items}`
  if (last) {
    msg += `\n💳 *Último abono:* ${fmt(last.amount)} el ${fmtDate(last.payment_date)}`
  }
  msg += `\n💰 *Total abonado:* ${fmt(plan.amount_paid)}`
  msg += `\n⚠️ *Saldo pendiente:* ${fmt(Math.max(0, balance))}`
  msg += `\n\nPor favor coordine su próximo abono. ¡Gracias! 🙏`

  const raw = (plan.customer_phone || '').replace(/\D/g, '')
  const phone = raw.startsWith('593') ? raw : raw.startsWith('0') ? '593' + raw.slice(1) : '593' + raw
  return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
}

function PlanCard({ plan, onPay, onCancel, onDelete, onUpdateTotal, onMarkDelivered, students = [] }) {
  const [expanded, setExpanded] = useState(false)
  const [showDetail, setShowDetail] = useState(false)
  const [editingTotal, setEditingTotal] = useState(false)
  const [newTotal, setNewTotal] = useState('')
  const [editError, setEditError] = useState('')
  const [editSaving, setEditSaving] = useState(false)
  const balance    = parseFloat(plan.total_amount) - parseFloat(plan.amount_paid)
  const paidPct    = Math.min(100, (parseFloat(plan.amount_paid) / parseFloat(plan.total_amount)) * 100)
  const itemsLabel = Array.isArray(plan.items)
    ? plan.items.map(i => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ')
    : ''
  const payments = plan.sale_plan_payments || []

  // Buscar alumna en sistema por student_id o cédula como fallback
  const linkedStudent = plan.student_id
    ? students.find(s => s.id === plan.student_id)
    : plan.customer_cedula_ruc
      ? students.find(s => (s.cedula || '') === plan.customer_cedula_ruc)
      : null
  const effectivePhone = plan.customer_phone || linkedStudent?.phone || ''
  const effectiveCourse = plan.student_course || linkedStudent?.course_name || ''
  const effectiveStudentName = plan.student_name || linkedStudent?.name || ''
  // Mostrar nombre alumna solo si es diferente al customer_name (representante)
  const showStudentName = effectiveStudentName && effectiveStudentName !== plan.customer_name

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${plan.status === 'paid' ? 'border-green-200' : 'border-gray-200'}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 text-sm truncate">{plan.customer_name}</p>
            {showStudentName && (
              <p className="text-xs text-purple-600 font-medium truncate">👩‍🎓 {effectiveStudentName}</p>
            )}
            <p className="text-xs text-gray-500 mt-0.5 truncate">{itemsLabel}</p>
            {effectiveCourse && (
              <p className="text-[10px] text-gray-400 truncate">🎓 {effectiveCourse}</p>
            )}
          </div>
          <StatusBadge status={plan.status} />
        </div>

        {/* Progreso */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>Pagado: <strong className="text-gray-700">{fmt(plan.amount_paid)}</strong></span>
            <span>Total: <strong className="text-gray-700">{fmt(plan.total_amount)}</strong></span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div
              className={`h-2 rounded-full transition-all ${plan.status === 'paid' ? 'bg-green-500' : 'bg-amber-400'}`}
              style={{ width: `${paidPct}%` }}
            />
          </div>
          {plan.status !== 'paid' && balance > 0 && (
            <p className="text-xs text-amber-700 font-semibold mt-1">Saldo pendiente: {fmt(balance)}</p>
          )}
        </div>

        {/* Acciones */}
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {plan.status !== 'paid' && plan.status !== 'cancelled' && (
            <button onClick={() => onPay(plan)}
              className="flex-1 py-2 rounded-xl bg-purple-600 text-white text-xs font-semibold hover:bg-purple-700 transition-all">
              + Abonar
            </button>
          )}
          <button
            onClick={() => onMarkDelivered(plan.id, !plan.delivered)}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border-2 transition-all
              ${plan.delivered
                ? 'border-green-400 bg-green-50 text-green-700'
                : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
            <PackageCheck size={13} />
            {plan.delivered ? 'Entregado' : 'Sin entregar'}
          </button>
          {/* Ojo: ver detalle */}
          <button onClick={() => setShowDetail(true)}
            className="p-2 rounded-xl border-2 border-gray-200 text-gray-500 hover:border-purple-300 hover:text-purple-600 transition-all"
            title="Ver detalle">
            <Eye size={14} />
          </button>
          {/* WhatsApp: solo si tiene teléfono y hay saldo */}
          {effectivePhone && balance > 0 && (
            <a href={buildWALink({ ...plan, customer_phone: effectivePhone })} target="_blank" rel="noopener noreferrer"
              className="p-2 rounded-xl border-2 border-green-200 text-green-600 hover:bg-green-50 hover:border-green-400 transition-all"
              title="Enviar recordatorio por WhatsApp">
              <MessageCircle size={14} />
            </a>
          )}
          <button onClick={() => setExpanded(v => !v)}
            className="p-2 rounded-xl border-2 border-gray-200 text-gray-500 hover:border-gray-300 transition-all">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Historial */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 pb-4">
          {payments.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">Sin abonos registrados aún</p>
          ) : (
            <div className="space-y-2 mt-3">
              {[...payments]
                .sort((a, b) => a.installment_number - b.installment_number)
                .map(pmt => (
                  <div key={pmt.id} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                    <div>
                      <p className="text-xs font-semibold text-gray-700">Abono #{pmt.installment_number} · {fmt(pmt.amount)}</p>
                      <p className="text-xs text-gray-400">{fmtDate(pmt.payment_date)} · {pmt.payment_method}</p>
                      {pmt.notes && <p className="text-xs text-gray-400 italic">{pmt.notes}</p>}
                    </div>
                  </div>
                ))}
            </div>
          )}
          {plan.notes && (
            <p className="text-xs text-gray-400 mt-2 italic bg-gray-50 px-3 py-2 rounded-xl">Nota: {plan.notes}</p>
          )}

          {/* Editar total */}
          {plan.status !== 'cancelled' && (
            <div className="mt-3">
              {editingTotal ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-amber-800">Corregir precio total del plan</p>
                  <div className="flex items-center gap-1.5 border-2 border-amber-300 rounded-xl px-3 py-2 bg-white focus-within:border-amber-500">
                    <span className="text-gray-500 font-medium text-sm shrink-0">$</span>
                    <input type="number" step="0.01" min="0.01" value={newTotal}
                      onChange={e => { setNewTotal(e.target.value); setEditError('') }}
                      className="flex-1 text-sm outline-none bg-transparent"
                      placeholder={fmt(plan.total_amount)} autoFocus />
                  </div>
                  {editError && <p className="text-xs text-red-600">{editError}</p>}
                  <div className="flex gap-2">
                    <button type="button" onClick={async () => {
                      const v = parseFloat(newTotal)
                      if (!v || v <= 0) { setEditError('Ingresa un valor válido'); return }
                      setEditSaving(true)
                      const res = await onUpdateTotal(plan.id, v)
                      setEditSaving(false)
                      if (res.success) { setEditingTotal(false); setNewTotal('') }
                      else setEditError(res.error || 'Error al guardar')
                    }} disabled={editSaving}
                      className="flex-1 py-2 rounded-xl bg-amber-500 text-white text-xs font-semibold hover:bg-amber-600 disabled:opacity-50">
                      {editSaving ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button type="button" onClick={() => { setEditingTotal(false); setNewTotal(''); setEditError('') }}
                      className="flex-1 py-2 rounded-xl border-2 border-gray-200 text-xs font-semibold text-gray-600">
                      Cancelar
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => { setEditingTotal(true); setNewTotal(plan.total_amount) }}
                  className="flex items-center gap-1.5 text-xs text-amber-600 hover:text-amber-800 font-medium">
                  ✏ Corregir precio total
                </button>
              )}
            </div>
          )}

          {plan.status !== 'paid' && plan.status !== 'cancelled' && (
            <button onClick={() => onCancel(plan.id)}
              className="mt-2 flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium">
              <Trash2 size={12} /> Cancelar plan
            </button>
          )}
          {parseFloat(plan.amount_paid) === 0 && (
            <button onClick={() => onDelete(plan.id)}
              className="mt-1 flex items-center gap-1.5 text-xs text-red-700 hover:text-red-900 font-semibold">
              <Trash2 size={12} /> Eliminar plan (sin abonos)
            </button>
          )}
        </div>
      )}

      {/* ─── Modal de detalle ─────────────────────────────── */}
      {showDetail && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setShowDetail(false)}>
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}>

            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-800 text-white">
              <p className="font-semibold text-sm">Detalle del plan</p>
              <button onClick={() => setShowDetail(false)}
                className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
                <X size={16} />
              </button>
            </div>

            <div className="overflow-y-auto max-h-[70vh]">
              <div className="p-4 space-y-4">

                {/* Datos del cliente */}
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-1">Cliente / Representante</p>
                  <p className="font-bold text-gray-800">{plan.customer_name}</p>
                  {plan.customer_cedula_ruc && (
                    <p className="text-sm text-gray-500 mt-0.5">CI/RUC: {plan.customer_cedula_ruc}</p>
                  )}
                  {effectivePhone && (
                    <p className="text-sm text-gray-500 mt-0.5">📱 {effectivePhone}</p>
                  )}
                  {plan.customer_email && (
                    <p className="text-sm text-gray-500 mt-0.5">✉️ {plan.customer_email}</p>
                  )}
                </div>

                {/* Alumna y curso */}
                {(showStudentName || effectiveCourse) && (
                  <div className="bg-purple-50 rounded-xl p-3">
                    <p className="text-xs text-purple-400 uppercase tracking-wide font-semibold mb-1">Alumna</p>
                    {showStudentName && (
                      <p className="text-sm font-semibold text-purple-800">👩‍🎓 {effectiveStudentName}</p>
                    )}
                    {effectiveCourse && (
                      <p className="text-xs text-purple-600 mt-0.5">🎓 {effectiveCourse}</p>
                    )}
                  </div>
                )}

                {/* Artículos */}
                {Array.isArray(plan.items) && plan.items.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Artículos</p>
                    {plan.items.map((item, i) => (
                      <div key={i} className="flex justify-between text-sm py-0.5">
                        <span className="text-gray-700">{item.name}{item.quantity > 1 ? ` ×${item.quantity}` : ''}</span>
                        <span className="text-gray-500 ml-2">${((item.unit_price || 0) * (item.quantity || 1)).toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Saldos */}
                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total del plan</span>
                    <span className="font-semibold">{fmt(plan.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total abonado</span>
                    <span className="font-semibold text-green-600">{fmt(plan.amount_paid)}</span>
                  </div>
                  {balance > 0 && (
                    <div className="flex justify-between text-sm bg-amber-50 rounded-xl px-3 py-2">
                      <span className="text-amber-700 font-semibold">Saldo pendiente</span>
                      <span className="font-bold text-amber-700">{fmt(balance)}</span>
                    </div>
                  )}
                  {balance <= 0 && (
                    <p className="text-center text-xs font-semibold text-green-600 bg-green-50 rounded-xl px-3 py-2">
                      ✓ Plan cancelado completamente
                    </p>
                  )}
                </div>

                {/* Historial de abonos */}
                {payments.length > 0 && (
                  <div className="border-t pt-3">
                    <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">Historial de abonos</p>
                    {[...payments]
                      .sort((a, b) => a.installment_number - b.installment_number)
                      .map(pmt => (
                        <div key={pmt.id} className="flex justify-between items-start py-1.5 border-b last:border-0">
                          <div>
                            <p className="text-xs font-semibold text-gray-700">
                              Abono #{pmt.installment_number} · {fmt(pmt.amount)}
                            </p>
                            <p className="text-xs text-gray-400">{fmtDate(pmt.payment_date)} · {pmt.payment_method}</p>
                            {pmt.notes && <p className="text-xs text-gray-400 italic">{pmt.notes}</p>}
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Footer: botón WhatsApp */}
            <div className="p-4 border-t bg-gray-50 space-y-2">
              {effectivePhone ? (
                <a href={buildWALink({ ...plan, customer_phone: effectivePhone })} target="_blank" rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold text-sm transition-all active:scale-95">
                  <MessageCircle size={16} />
                  {balance > 0 ? 'Enviar recordatorio por WhatsApp' : 'Enviar mensaje por WhatsApp'}
                </a>
              ) : (
                <p className="text-xs text-gray-400 text-center">
                  Sin teléfono registrado — edita el plan para agregar uno
                </p>
              )}
              <button onClick={() => setShowDetail(false)}
                className="w-full py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-all">
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function SaleInstallments({
  allProducts       = [],
  students          = [],
  schoolName        = 'Studio Dancers',
  activePlans       = [],
  paidPlans         = [],
  totalDebt         = 0,
  loading           = false,
  dbError           = null,
  onCreatePlan,
  onRegisterPayment,
  onCancelPlan,
  onDeletePlan,
  onUpdatePlanTotal,
  onMarkDelivered,
  onRefresh,
  externalShowNew   = false,
  externalPreselect = null,
  onExternalClose,
}) {
  const [showNew,       setShowNew]       = useState(false)
  const [payingPlan,    setPayingPlan]    = useState(null)
  const [paymentError,  setPaymentError]  = useState('')
  const [receipt,       setReceipt]       = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [tab,           setTab]           = useState('active')
  const [confirmCancel, setConfirmCancel] = useState(null)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [toast,         setToast]         = useState(null)  // { msg, type }

  const showToast = (msg, type = 'success') => setToast({ msg, type })

  const isNewOpen = showNew || externalShowNew
  const preselect = externalShowNew ? externalPreselect : null
  const closeNew  = () => { setShowNew(false); if (onExternalClose) onExternalClose() }

  const visiblePlans = tab === 'active' ? activePlans : paidPlans

  const handleCreatePlan = async (formData) => {
    setSaving(true)
    const res = await onCreatePlan(formData)
    setSaving(false)
    if (res.success) {
      closeNew()
      showToast('Plan creado correctamente')
    } else {
      showToast(res.error || 'Error al crear el plan', 'error')
    }
  }

  const handlePayment = async (paymentData) => {
    if (!payingPlan) return
    setSaving(true)
    setPaymentError('')
    const res = await onRegisterPayment(payingPlan.id, paymentData)
    setSaving(false)
    if (res.success) {
      setReceipt({
        plan:              { ...payingPlan, amount_paid: parseFloat(payingPlan.amount_paid) + paymentData.amount },
        payment:           res.payment,
        installmentNumber: res.installmentNumber,
        balance:           res.balance,
      })
      setPayingPlan(null)
      setPaymentError('')
      showToast('Abono registrado')
    } else {
      const msg = res.error || 'Error al registrar el abono'
      setPaymentError(msg)
      showToast(msg, 'error')
    }
  }

  const handleCancel = async (planId) => {
    const res = await onCancelPlan(planId)
    setConfirmCancel(null)
    if (res.success) showToast('Plan cancelado')
    else showToast(res.error || 'Error al cancelar', 'error')
  }

  const handleDelete = async (planId) => {
    const res = await onDeletePlan(planId)
    setConfirmDelete(null)
    if (res.success) showToast('Plan eliminado')
    else showToast(res.error || 'Error al eliminar', 'error')
  }

  return (
    <div className="space-y-4">

      {/* Banner de error de DB */}
      {dbError && <DbSetupBanner error={dbError} onRetry={onRefresh} />}

      {!dbError && (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white rounded-2xl border border-gray-200 p-4 text-center">
              <p className="text-2xl font-bold text-gray-800">{activePlans.length}</p>
              <p className="text-xs text-gray-500 mt-0.5">Planes activos</p>
            </div>
            <div className="bg-amber-50 rounded-2xl border border-amber-100 p-4 text-center">
              <p className="text-2xl font-bold text-amber-700">{fmt(totalDebt)}</p>
              <p className="text-xs text-amber-600 mt-0.5">Por cobrar</p>
            </div>
            <div className="bg-green-50 rounded-2xl border border-green-100 p-4 text-center">
              <p className="text-2xl font-bold text-green-700">{paidPlans.length}</p>
              <p className="text-xs text-green-600 mt-0.5">Pagados</p>
            </div>
          </div>

          {/* Tabs + botón nuevo */}
          <div className="flex items-center justify-between gap-3">
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              {[['active', 'Activos'], ['paid', 'Pagados']].map(([key, label]) => (
                <button key={key} onClick={() => setTab(key)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all
                    ${tab === key ? 'bg-white shadow-sm text-purple-700' : 'text-gray-500 hover:text-gray-700'}`}>
                  {label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowNew(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-all shadow-sm">
              <Plus size={16} /> Nuevo plan
            </button>
          </div>

          {/* Lista */}
          {loading ? (
            <div className="text-center py-10 text-gray-400 text-sm">Cargando planes...</div>
          ) : visiblePlans.length === 0 ? (
            <div className="text-center py-10">
              <ClipboardList size={36} className="mx-auto text-gray-300 mb-3" />
              <p className="text-gray-400 text-sm">
                {tab === 'active' ? 'No hay planes de abono activos' : 'No hay planes pagados aún'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {visiblePlans.map(plan => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  onPay={setPayingPlan}
                  onCancel={setConfirmCancel}
                  onDelete={setConfirmDelete}
                  onUpdateTotal={onUpdatePlanTotal}
                  onMarkDelivered={onMarkDelivered}
                  students={students}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Modales ─────────────────────────────────────────────────── */}
      {isNewOpen && (
        <NewPlanModal
          allProducts={allProducts}
          students={students}
          preselect={preselect}
          onConfirm={handleCreatePlan}
          onClose={closeNew}
          loading={saving}
        />
      )}

      {payingPlan && (
        <PaymentModal
          plan={payingPlan}
          onConfirm={handlePayment}
          onClose={() => { setPayingPlan(null); setPaymentError('') }}
          loading={saving}
          serverError={paymentError}
        />
      )}

      {receipt && (
        <InstallmentReceipt
          plan={receipt.plan}
          payment={receipt.payment}
          installmentNumber={receipt.installmentNumber}
          balance={receipt.balance}
          schoolName={schoolName}
          onClose={() => setReceipt(null)}
        />
      )}

      {confirmCancel && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center">
            <Trash2 size={32} className="mx-auto text-red-400 mb-3" />
            <p className="font-semibold text-gray-800 mb-1">¿Cancelar este plan?</p>
            <p className="text-xs text-gray-500 mb-5">Los abonos registrados no se eliminarán del historial.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmCancel(null)}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300">
                No, volver
              </button>
              <button onClick={() => handleCancel(confirmCancel)}
                className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-semibold hover:bg-red-600">
                Sí, cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6 text-center">
            <Trash2 size={32} className="mx-auto text-red-600 mb-3" />
            <p className="font-semibold text-gray-800 mb-1">¿Eliminar este plan?</p>
            <p className="text-xs text-gray-500 mb-5">Esta acción es permanente y no se puede deshacer. Solo es posible porque no tiene abonos registrados.</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300">
                No, volver
              </button>
              <button onClick={() => handleDelete(confirmDelete)}
                className="flex-1 py-2.5 rounded-xl bg-red-700 text-white text-sm font-semibold hover:bg-red-800">
                Sí, eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)} />
      )}
    </div>
  )
}
