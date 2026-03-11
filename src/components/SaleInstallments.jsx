import { useState, useRef } from 'react'
import { toPng } from 'html-to-image'
import {
  Plus, X, ChevronDown, ChevronUp, Package, DollarSign,
  CheckCircle, Clock, AlertCircle, Printer, Trash2, PackageCheck,
  Search, Minus, CreditCard, ClipboardList
} from 'lucide-react'

const PAYMENT_METHODS = ['Efectivo', 'Transferencia']

// ─── Utilidades ──────────────────────────────────────────────────────────────
const fmt = (n) => `$${parseFloat(n || 0).toFixed(2)}`
const fmtDate = (d) => {
  if (!d) return ''
  const dt = new Date(d + 'T12:00:00')
  return dt.toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
}

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
      const dataUrl = await toPng(receiptRef.current, { pixelRatio: 2, backgroundColor: '#ffffff' })
      const link = document.createElement('a')
      link.download = `Abono_${plan.customer_name.replace(/\s+/g, '_')}_${installmentNumber}.png`
      link.href = dataUrl
      link.click()
    } catch (e) { console.error(e) }
    setDownloading(false)
  }

  const itemsLabel = Array.isArray(plan.items)
    ? plan.items.map(i => `${i.name}${i.quantity > 1 ? ` x${i.quantity}` : ''}`).join(', ')
    : ''

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Acciones */}
        <div className="flex justify-between items-center px-4 py-3 border-b bg-gray-50">
          <p className="font-semibold text-gray-700 text-sm">Comprobante de abono</p>
          <div className="flex gap-2">
            <button onClick={handleDownload} disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs font-semibold hover:bg-purple-700 disabled:opacity-50">
              <Printer size={13} /> {downloading ? 'Guardando...' : 'Descargar'}
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Recibo visual (capturado como imagen) */}
        <div ref={receiptRef} className="p-6 bg-white font-mono text-sm" style={{ minWidth: 320 }}>
          {/* Encabezado */}
          <div className="text-center mb-4">
            <p className="font-bold text-lg tracking-wide">{schoolName.toUpperCase()}</p>
            <p className="text-xs text-gray-500 mt-1">Comprobante de Abono</p>
            <div className="border-t border-dashed border-gray-300 mt-3" />
          </div>

          {/* Datos del cliente */}
          <div className="space-y-1 mb-4 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Cliente:</span>
              <span className="font-semibold text-right ml-2">{plan.customer_name}</span>
            </div>
            {plan.customer_cedula_ruc && (
              <div className="flex justify-between">
                <span className="text-gray-500">C.I./RUC:</span>
                <span>{plan.customer_cedula_ruc}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-500">Artículo(s):</span>
              <span className="text-right ml-2 max-w-[60%]">{itemsLabel}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-300 mb-4" />

          {/* Resumen de pagos */}
          <div className="space-y-1.5 text-xs mb-4">
            <div className="flex justify-between text-gray-600">
              <span>Total del plan:</span>
              <span>{fmt(plan.total_amount)}</span>
            </div>
            <div className="flex justify-between text-gray-600">
              <span>Abonos anteriores:</span>
              <span>{fmt(parseFloat(plan.amount_paid) - parseFloat(payment.amount))}</span>
            </div>
            <div className="border-t border-gray-200 my-1" />
            <div className="flex justify-between font-bold text-sm">
              <span>Este abono (N° {installmentNumber}):</span>
              <span>{fmt(payment.amount)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Forma de pago:</span>
              <span>{payment.payment_method}</span>
            </div>
          </div>

          <div className="border-t border-dashed border-gray-300 mb-4" />

          {/* Saldo */}
          <div className={`flex justify-between font-bold text-sm rounded p-2 ${balance <= 0 ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
            <span>{balance <= 0 ? '✓ PAGADO COMPLETO' : 'SALDO PENDIENTE:'}</span>
            <span>{balance <= 0 ? '' : fmt(balance)}</span>
          </div>

          {/* Pie */}
          <div className="text-center mt-4 text-xs text-gray-400">
            <p>{fmtDate(payment.payment_date)}</p>
            <p className="mt-1">Gracias por su confianza</p>
            <div className="border-t border-dashed border-gray-300 mt-3" />
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Modal: Registrar abono ────────────────────────────────────────────────────
function PaymentModal({ plan, onConfirm, onClose, loading }) {
  const [amount, setAmount]   = useState('')
  const [method, setMethod]   = useState('Efectivo')
  const [notes, setNotes]     = useState('')
  const [error, setError]     = useState('')

  const balance = parseFloat(plan.total_amount) - parseFloat(plan.amount_paid)

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    const val = parseFloat(amount)
    if (!val || val <= 0)     { setError('Ingresa un monto válido'); return }
    if (val > balance + 0.01) { setError(`El abono supera el saldo pendiente (${fmt(balance)})`); return }
    onConfirm({ amount: val, paymentMethod: method, notes })
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden">
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
            <span className="text-sm text-amber-700">Saldo pendiente</span>
            <span className="font-bold text-amber-800 text-lg">{fmt(balance)}</span>
          </div>

          {/* Monto */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Monto del abono</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
              <input type="number" step="0.01" min="0.01" value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full pl-7 pr-3 py-3 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
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

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full py-3.5 rounded-xl bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 transition-all">
            {loading ? 'Registrando...' : 'Confirmar abono'}
          </button>
        </form>
      </div>
    </div>
  )
}

// ─── Modal: Nuevo plan ─────────────────────────────────────────────────────────
function NewPlanModal({ allProducts, students = [], onConfirm, onClose, loading, preselect = null }) {
  const [customerName,    setCustomerName]    = useState('')
  const [customerCedula,  setCustomerCedula]  = useState('')
  const [customerEmail,   setCustomerEmail]   = useState('')
  const [notes,           setNotes]           = useState('')
  const [studentSearch,   setStudentSearch]   = useState('')
  const [productSearch,   setProductSearch]   = useState('')
  const [cart,            setCart]            = useState(preselect ? [{ product: preselect, quantity: 1 }] : [])
  const [customTotal,     setCustomTotal]     = useState('')
  const [error,           setError]           = useState('')
  const [showStudents,    setShowStudents]     = useState(false)

  const cartTotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0)
  const total     = customTotal ? parseFloat(customTotal) : cartTotal

  // Autocompletar desde estudiante
  const fillFromStudent = (student) => {
    setCustomerName(student.name)
    setCustomerCedula(student.cedula || '')
    setCustomerEmail(student.email || '')
    setStudentSearch('')
    setShowStudents(false)
  }

  const filteredStudents = studentSearch.length >= 2
    ? students.filter(s => s.name.toLowerCase().includes(studentSearch.toLowerCase()) ||
                           (s.cedula || '').includes(studentSearch)).slice(0, 6)
    : []

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id)
      if (existing) return prev.map(i => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { product, quantity: 1 }]
    })
    setProductSearch('')
  }

  const removeFromCart = (productId) => setCart(prev => prev.filter(i => i.product.id !== productId))
  const updateQty = (productId, qty) => {
    if (qty <= 0) { removeFromCart(productId); return }
    setCart(prev => prev.map(i => i.product.id === productId ? { ...i, quantity: qty } : i))
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

          {/* Buscar alumno (autocompletar) */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Cliente</label>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={studentSearch}
                onChange={e => { setStudentSearch(e.target.value); setShowStudents(true) }}
                onFocus={() => setShowStudents(true)}
                placeholder="Buscar alumna o cliente..."
                className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400"
              />
              {studentSearch && (
                <button type="button" onClick={() => { setStudentSearch(''); setShowStudents(false) }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                  <X size={14} />
                </button>
              )}
            </div>
            {showStudents && filteredStudents.length > 0 && (
              <div className="mt-1 border-2 border-purple-200 rounded-xl overflow-hidden bg-white shadow-lg z-10">
                {filteredStudents.map(s => (
                  <button key={s.id} type="button"
                    onMouseDown={() => fillFromStudent(s)}
                    className="w-full px-3 py-2.5 text-left flex justify-between items-center hover:bg-purple-50 border-b last:border-0">
                    <span className="text-sm font-medium text-gray-800">{s.name}</span>
                    {s.cedula && <span className="text-xs text-gray-400 ml-2">{s.cedula}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Nombre del cliente (editable) */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Nombre completo *</label>
            <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400"
              placeholder="Nombre completo" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Cédula / RUC</label>
              <input type="text" value={customerCedula} onChange={e => setCustomerCedula(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400"
                placeholder="0912345678" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Correo</label>
              <input type="email" value={customerEmail} onChange={e => setCustomerEmail(e.target.value)}
                className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400"
                placeholder="email@..." />
            </div>
          </div>

          {/* Artículos */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Artículos *</label>

            {/* Buscador */}
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input type="text" value={productSearch} onChange={e => setProductSearch(e.target.value)}
                placeholder="Buscar y agregar artículo..."
                className="w-full pl-9 pr-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400" />
              {productSearch && (
                <button type="button" onClick={() => setProductSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Dropdown resultados — siempre en el flujo, no absolute */}
            {filteredProducts.length > 0 && (
              <div className="mt-1 border-2 border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                {filteredProducts.map(p => {
                  const outOfStock = p.stock !== null && p.stock !== undefined && p.stock === 0
                  return (
                    <button key={p.id} type="button"
                      onMouseDown={() => { addToCart(p); setProductSearch('') }}
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

            {/* Carrito */}
            {cart.length > 0 && (
              <div className="space-y-2 mt-2">
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
              Total acordado *
              {cart.length > 0 && cartTotal > 0 && (
                <span className="ml-2 text-purple-500 font-normal normal-case">(catálogo: ${cartTotal.toFixed(2)})</span>
              )}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
              <input type="number" step="0.01" min="0.01" value={customTotal}
                onChange={e => setCustomTotal(e.target.value)}
                className="w-full pl-7 pr-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400"
                placeholder={cart.length > 0 ? cartTotal.toFixed(2) : '0.00'} />
            </div>
            <p className="text-xs text-gray-400 mt-1">Ajusta si hay descuento o acuerdo especial.</p>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">Nota (opcional)</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-400"
              placeholder="Ej: Uniforme show de mayo, talla M..." />
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">{error}</p>}
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

// ─── Tarjeta de plan ───────────────────────────────────────────────────────────
function PlanCard({ plan, onPay, onCancel, onMarkDelivered }) {
  const [expanded, setExpanded] = useState(false)
  const balance    = parseFloat(plan.total_amount) - parseFloat(plan.amount_paid)
  const paidPct    = Math.min(100, (parseFloat(plan.amount_paid) / parseFloat(plan.total_amount)) * 100)
  const itemsLabel = Array.isArray(plan.items) ? plan.items.map(i => `${i.name}${i.quantity > 1 ? ` ×${i.quantity}` : ''}`).join(', ') : ''
  const payments   = plan.sale_plan_payments || []

  return (
    <div className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${plan.status === 'paid' ? 'border-green-200' : 'border-gray-200'}`}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-800 text-sm truncate">{plan.customer_name}</p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{itemsLabel}</p>
          </div>
          <StatusBadge status={plan.status} />
        </div>

        {/* Barra de progreso */}
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

        {/* Acciones rápidas */}
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
          <button onClick={() => setExpanded(v => !v)}
            className="p-2 rounded-xl border-2 border-gray-200 text-gray-500 hover:border-gray-300 transition-all">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>

      {/* Historial expandible */}
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
            <p className="text-xs text-gray-400 mt-2 italic bg-gray-50 px-3 py-2 rounded-xl">
              Nota: {plan.notes}
            </p>
          )}

          {plan.status !== 'paid' && plan.status !== 'cancelled' && (
            <button onClick={() => onCancel(plan.id)}
              className="mt-3 flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium">
              <Trash2 size={12} /> Cancelar plan
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Componente principal exportado ──────────────────────────────────────────
export default function SaleInstallments({
  allProducts      = [],
  students         = [],
  schoolName       = 'Studio Dancers',
  activePlans      = [],
  paidPlans        = [],
  totalDebt        = 0,
  loading          = false,
  onCreatePlan,
  onRegisterPayment,
  onCancelPlan,
  onMarkDelivered,
  externalShowNew  = false,
  externalPreselect = null,
  onExternalClose,
}) {
  const [showNew,       setShowNew]       = useState(false)
  const [payingPlan,    setPayingPlan]    = useState(null)
  const [receipt,       setReceipt]       = useState(null)
  const [saving,        setSaving]        = useState(false)
  const [tab,           setTab]           = useState('active')
  const [confirmCancel, setConfirmCancel] = useState(null)

  const isNewOpen    = showNew || externalShowNew
  const preselect    = externalShowNew ? externalPreselect : null
  const closeNew     = () => { setShowNew(false); if (onExternalClose) onExternalClose() }

  const visiblePlans = tab === 'active' ? activePlans : paidPlans

  const handleCreatePlan = async (formData) => {
    setSaving(true)
    const res = await onCreatePlan(formData)
    setSaving(false)
    if (res.success) closeNew()
  }

  const handlePayment = async (paymentData) => {
    if (!payingPlan) return
    setSaving(true)
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
    }
  }

  const handleCancel = async (planId) => {
    await onCancelPlan(planId)
    setConfirmCancel(null)
  }

  return (
    <div className="space-y-4">

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
                ${tab === key ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-semibold hover:bg-purple-700 transition-all shadow-sm">
          <Plus size={16} /> Nuevo
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
              onMarkDelivered={onMarkDelivered}
            />
          ))}
        </div>
      )}

      {/* Modales */}
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
          onClose={() => setPayingPlan(null)}
          loading={saving}
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
    </div>
  )
}
