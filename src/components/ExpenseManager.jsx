import { useState, useEffect } from 'react'
import { X, DollarSign, TrendingDown, Trash2, Banknote, Smartphone, CreditCard, AlertTriangle, Check, Clock } from 'lucide-react'
import { useExpenses } from '../hooks/useExpenses'
import { formatDate } from '../lib/dateUtils'

const PAYMENT_METHODS = [
  { id: 'cash', name: 'Efectivo', icon: Banknote },
  { id: 'transfer', name: 'Transferencia', icon: Smartphone },
  { id: 'card', name: 'Tarjeta', icon: CreditCard },
]

export default function ExpenseManager({ onClose, cashRegisterId, settings }) {
  const { expenses, categories, loading, todayExpensesTotal, createExpense, deleteExpense, fetchExpenses } = useExpenses()

  const [activeTab, setActiveTab] = useState('register')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const [formData, setFormData] = useState({
    categoryId: '',
    subcategoryId: '',
    amount: '',
    paymentMethod: 'cash',
    description: '',
    provider: '',
    receiptNumber: '',
    notes: ''
  })

  // Auto-dismiss messages
  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [errorMessage])

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000)
      return () => clearTimeout(timer)
    }
  }, [successMessage])

  // Subcategorías de la categoría seleccionada
  const selectedCategory = categories.find(c => c.id === formData.categoryId)
  const subcategories = selectedCategory?.expense_subcategories?.filter(s => s.active !== false) || []

  const resetForm = () => {
    setFormData({
      categoryId: '',
      subcategoryId: '',
      amount: '',
      paymentMethod: 'cash',
      description: '',
      provider: '',
      receiptNumber: '',
      notes: ''
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.categoryId) {
      setErrorMessage('Selecciona una categoría')
      return
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setErrorMessage('Ingresa un monto válido')
      return
    }
    if (!formData.description.trim()) {
      setErrorMessage('Ingresa una descripción del gasto')
      return
    }

    setSubmitting(true)
    try {
      const result = await createExpense({
        cashRegisterId,
        categoryId: formData.categoryId,
        subcategoryId: formData.subcategoryId || null,
        amount: formData.amount,
        paymentMethod: formData.paymentMethod,
        description: formData.description.trim(),
        provider: formData.provider.trim(),
        receiptNumber: formData.receiptNumber.trim(),
        notes: formData.notes.trim()
      })

      if (result.success) {
        setSuccessMessage('Egreso registrado correctamente')
        resetForm()
      } else {
        setErrorMessage('Error: ' + result.error)
      }
    } catch (err) {
      setErrorMessage('Error: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    const result = await deleteExpense(id)
    if (result.success) {
      setDeleteConfirm(null)
      setSuccessMessage('Egreso eliminado')
    } else {
      setErrorMessage('Error al eliminar: ' + result.error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-5 border-b bg-gradient-to-r from-purple-600 to-purple-800 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <TrendingDown size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Egresos</h2>
                <p className="text-sm text-white/80">{settings?.name || 'Academia'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <p className="text-xs text-purple-300">Hoy</p>
                <p className="text-lg font-bold text-red-300">-${todayExpensesTotal.toFixed(2)}</p>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50">
          <button
            onClick={() => setActiveTab('register')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'register'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Registrar
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'text-purple-600 border-b-2 border-purple-600 bg-white'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Historial ({expenses.length})
          </button>
        </div>

        {/* Messages */}
        {errorMessage && (
          <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-red-700">
            <AlertTriangle size={18} />
            <span className="text-sm flex-1">{errorMessage}</span>
            <button onClick={() => setErrorMessage(null)}>
              <X size={16} />
            </button>
          </div>
        )}
        {successMessage && (
          <div className="mx-4 mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2 text-green-700">
            <Check size={18} />
            <span className="text-sm">{successMessage}</span>
          </div>
        )}

        {/* Tab: Registrar */}
        {activeTab === 'register' && (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Categoría */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoría *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setFormData({ ...formData, categoryId: cat.id, subcategoryId: '' })}
                    className={`p-3 rounded-lg border-2 text-sm font-medium transition-all text-left ${
                      formData.categoryId === cat.id
                        ? 'border-purple-500 bg-purple-50 text-purple-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: cat.color || '#6B7280' }}
                      />
                      <span className="truncate">{cat.name}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Subcategoría */}
            {subcategories.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subcategoría
                </label>
                <select
                  value={formData.subcategoryId}
                  onChange={(e) => setFormData({ ...formData, subcategoryId: e.target.value })}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                >
                  <option value="">Seleccionar...</option>
                  {subcategories.map(sub => (
                    <option key={sub.id} value={sub.id}>{sub.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Monto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">$</span>
                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="w-full pl-8 pr-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-lg"
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Método de pago */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Método de pago
              </label>
              <div className="grid grid-cols-3 gap-2">
                {PAYMENT_METHODS.map(method => {
                  const Icon = method.icon
                  return (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, paymentMethod: method.id })}
                      className={`p-3 rounded-xl border-2 flex flex-col items-center gap-1 transition-all ${
                        formData.paymentMethod === method.id
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <Icon size={22} />
                      <span className="text-xs font-medium">{method.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Descripción */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descripción *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Describe el gasto..."
                rows={2}
                required
              />
            </div>

            {/* Proveedor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Proveedor / Beneficiario
              </label>
              <input
                type="text"
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Nombre del proveedor (opcional)"
              />
            </div>

            {/* Comprobante */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                N° Comprobante / Factura
              </label>
              <input
                type="text"
                value={formData.receiptNumber}
                onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Número de comprobante (opcional)"
              />
            </div>

            {/* Notas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notas
              </label>
              <input
                type="text"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Observaciones adicionales (opcional)"
              />
            </div>

            {/* Botón submit */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
            >
              {submitting ? 'Registrando...' : 'Registrar Egreso'}
            </button>
          </form>
        )}

        {/* Tab: Historial */}
        {activeTab === 'history' && (
          <div className="p-4">
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin text-3xl mb-2">⏳</div>
                <p className="text-gray-500 text-sm">Cargando...</p>
              </div>
            ) : expenses.length === 0 ? (
              <div className="p-8 text-center">
                <TrendingDown className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-500">No hay egresos registrados hoy</p>
                <button
                  onClick={() => setActiveTab('register')}
                  className="mt-3 text-purple-600 hover:text-purple-700 text-sm font-medium"
                >
                  Registrar un egreso
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {expenses.map(expense => (
                  <div
                    key={expense.id}
                    className="bg-gray-50 rounded-xl p-4 border border-gray-100"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                            style={{ backgroundColor: expense.expense_categories?.color || '#6B7280' }}
                          />
                          <span className="text-xs font-medium text-gray-500">
                            {expense.expense_categories?.name}
                            {expense.expense_subcategories?.name && ` › ${expense.expense_subcategories.name}`}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-gray-800 truncate">{expense.description}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock size={12} />
                            {formatDate(expense.expense_date, 'HH:mm')}
                          </span>
                          <span>
                            {expense.payment_method === 'cash' ? 'Efectivo' :
                             expense.payment_method === 'transfer' ? 'Transferencia' :
                             expense.payment_method === 'card' ? 'Tarjeta' : expense.payment_method}
                          </span>
                          {expense.provider && <span>{expense.provider}</span>}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-3">
                        <span className="text-lg font-bold text-red-600">
                          -${parseFloat(expense.amount).toFixed(2)}
                        </span>
                        <button
                          onClick={() => setDeleteConfirm(expense.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>

                    {/* Confirm delete */}
                    {deleteConfirm === expense.id && (
                      <div className="mt-3 pt-3 border-t flex items-center justify-between">
                        <span className="text-sm text-red-600">¿Eliminar este egreso?</span>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg"
                          >
                            No
                          </button>
                          <button
                            onClick={() => handleDelete(expense.id)}
                            className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg"
                          >
                            Sí, eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {/* Total */}
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 mt-4">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">Total egresos del día</span>
                    <span className="text-xl font-bold text-red-600">
                      -${todayExpensesTotal.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{expenses.length} registros</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
