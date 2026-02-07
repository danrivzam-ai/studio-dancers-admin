import { useState, useEffect } from 'react'
import { X, ArrowLeftRight, Trash2, AlertTriangle, Check, Clock, Building2, ArrowUpCircle, ArrowDownCircle, HandCoins } from 'lucide-react'
import { useCashMovements } from '../hooks/useCashMovements'
import { formatDate } from '../lib/dateUtils'

const MOVEMENT_TYPES = [
  {
    id: 'deposit',
    name: 'Depósito bancario',
    description: 'Salida de efectivo → banco',
    icon: Building2,
    color: 'red',
    sign: '-',
    showBank: true,
  },
  {
    id: 'withdrawal',
    name: 'Retiro bancario',
    description: 'Entrada de efectivo ← banco',
    icon: ArrowDownCircle,
    color: 'green',
    sign: '+',
    showBank: true,
  },
  {
    id: 'owner_loan',
    name: 'Préstamo del dueño',
    description: 'Entrada de efectivo a caja',
    icon: HandCoins,
    color: 'green',
    sign: '+',
    showBank: false,
  },
  {
    id: 'owner_reimbursement',
    name: 'Reembolso al dueño',
    description: 'Salida de efectivo de caja',
    icon: ArrowUpCircle,
    color: 'red',
    sign: '-',
    showBank: false,
  },
]

function getMovementType(typeId) {
  return MOVEMENT_TYPES.find(t => t.id === typeId) || MOVEMENT_TYPES[0]
}

export default function CashMovements({ onClose, cashRegisterId, settings }) {
  const { movements, loading, netTotal, depositsTotal, cashInTotal, cashOutTotal, createMovement, deleteMovement } = useCashMovements(cashRegisterId)

  const [activeTab, setActiveTab] = useState('register')
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState(null)
  const [successMessage, setSuccessMessage] = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)

  const [formData, setFormData] = useState({
    type: '',
    amount: '',
    bank: '',
    receiptNumber: '',
    responsible: '',
    notes: ''
  })

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

  const selectedType = MOVEMENT_TYPES.find(t => t.id === formData.type)

  const resetForm = () => {
    setFormData({
      type: '',
      amount: '',
      bank: '',
      receiptNumber: '',
      responsible: '',
      notes: ''
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!formData.type) {
      setErrorMessage('Selecciona un tipo de movimiento')
      return
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setErrorMessage('Ingresa un monto válido')
      return
    }
    if (!cashRegisterId) {
      setErrorMessage('No hay caja abierta. Abre la caja primero.')
      return
    }

    setSubmitting(true)
    try {
      const result = await createMovement({
        type: formData.type,
        amount: formData.amount,
        bank: formData.bank.trim(),
        receiptNumber: formData.receiptNumber.trim(),
        responsible: formData.responsible.trim(),
        notes: formData.notes.trim()
      })

      if (result.success) {
        const typeName = getMovementType(formData.type).name
        setSuccessMessage(`${typeName} registrado correctamente`)
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
    const result = await deleteMovement(id)
    if (result.success) {
      setDeleteConfirm(null)
      setSuccessMessage('Movimiento eliminado')
    } else {
      setErrorMessage('Error al eliminar: ' + result.error)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b bg-gradient-to-r from-purple-600 to-purple-800 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <ArrowLeftRight size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Movimientos de Caja</h2>
                <p className="text-sm text-purple-200">{settings?.name || 'Academia'}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {movements.length > 0 && (
                <div className="text-right">
                  <p className="text-xs text-purple-300">Neto</p>
                  <p className={`text-lg font-bold ${netTotal >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                    {netTotal >= 0 ? '+' : ''}{netTotal.toFixed(2)}
                  </p>
                </div>
              )}
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
            Historial ({movements.length})
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

        {/* No cash register warning */}
        {!cashRegisterId && (
          <div className="mx-4 mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-yellow-700">
            <AlertTriangle size={18} />
            <span className="text-sm">No hay caja abierta. Abre la caja primero para registrar movimientos.</span>
          </div>
        )}

        {/* Tab: Registrar */}
        {activeTab === 'register' && (
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {/* Tipo de movimiento */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de movimiento *
              </label>
              <div className="grid grid-cols-2 gap-2">
                {MOVEMENT_TYPES.map(type => {
                  const Icon = type.icon
                  return (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => setFormData({ ...formData, type: type.id, bank: '' })}
                      className={`p-3 rounded-lg border-2 text-left transition-all ${
                        formData.type === type.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Icon size={18} className={type.color === 'green' ? 'text-green-600' : 'text-red-600'} />
                        <span className={`text-xs font-bold ${type.color === 'green' ? 'text-green-600' : 'text-red-600'}`}>
                          {type.sign}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-800">{type.name}</p>
                      <p className="text-xs text-gray-400">{type.description}</p>
                    </button>
                  )
                })}
              </div>
            </div>

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

            {/* Banco (solo para depósito/retiro) */}
            {selectedType?.showBank && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Banco
                </label>
                <input
                  type="text"
                  value={formData.bank}
                  onChange={(e) => setFormData({ ...formData, bank: e.target.value })}
                  className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  placeholder="Nombre del banco"
                />
              </div>
            )}

            {/* N° Comprobante */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                N° Comprobante
              </label>
              <input
                type="text"
                value={formData.receiptNumber}
                onChange={(e) => setFormData({ ...formData, receiptNumber: e.target.value })}
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Número de comprobante (opcional)"
              />
            </div>

            {/* Responsable */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Responsable
              </label>
              <input
                type="text"
                value={formData.responsible}
                onChange={(e) => setFormData({ ...formData, responsible: e.target.value })}
                className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                placeholder="Quién realiza el movimiento (opcional)"
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
                placeholder="Observaciones (opcional)"
              />
            </div>

            {/* Botón submit */}
            <button
              type="submit"
              disabled={submitting || !cashRegisterId}
              className="w-full px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
            >
              {submitting ? 'Registrando...' : 'Registrar Movimiento'}
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
            ) : movements.length === 0 ? (
              <div className="p-8 text-center">
                <ArrowLeftRight className="mx-auto text-gray-300 mb-3" size={48} />
                <p className="text-gray-500">No hay movimientos registrados</p>
                <button
                  onClick={() => setActiveTab('register')}
                  className="mt-3 text-purple-600 hover:text-purple-700 text-sm font-medium"
                >
                  Registrar un movimiento
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {movements.map(movement => {
                  const type = getMovementType(movement.type)
                  const Icon = type.icon
                  const isInflow = type.sign === '+'

                  return (
                    <div
                      key={movement.id}
                      className="bg-gray-50 rounded-xl p-4 border border-gray-100"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Icon size={16} className={isInflow ? 'text-green-600' : 'text-red-600'} />
                            <span className="text-sm font-medium text-gray-800">{type.name}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                              <Clock size={12} />
                              {formatDate(movement.movement_date, 'HH:mm')}
                            </span>
                            {movement.bank && <span>{movement.bank}</span>}
                            {movement.responsible && <span>{movement.responsible}</span>}
                          </div>
                          {movement.notes && (
                            <p className="text-xs text-gray-500 mt-1">{movement.notes}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-2 ml-3">
                          <span className={`text-lg font-bold ${isInflow ? 'text-green-600' : 'text-red-600'}`}>
                            {type.sign}${parseFloat(movement.amount).toFixed(2)}
                          </span>
                          <button
                            onClick={() => setDeleteConfirm(movement.id)}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Eliminar"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Confirm delete */}
                      {deleteConfirm === movement.id && (
                        <div className="mt-3 pt-3 border-t flex items-center justify-between">
                          <span className="text-sm text-red-600">¿Eliminar este movimiento?</span>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-3 py-1 text-sm bg-gray-200 hover:bg-gray-300 rounded-lg"
                            >
                              No
                            </button>
                            <button
                              onClick={() => handleDelete(movement.id)}
                              className="px-3 py-1 text-sm bg-red-600 hover:bg-red-700 text-white rounded-lg"
                            >
                              Sí, eliminar
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Resumen */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4 space-y-2">
                  {depositsTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Depósitos bancarios:</span>
                      <span className="font-medium text-red-600">-${depositsTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {cashInTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Retiros / Préstamos:</span>
                      <span className="font-medium text-green-600">+${cashInTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {cashOutTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Reembolsos:</span>
                      <span className="font-medium text-red-600">-${cashOutTotal.toFixed(2)}</span>
                    </div>
                  )}
                  <hr className="border-blue-200" />
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-700">Efecto neto en caja</span>
                    <span className={`text-xl font-bold ${netTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {netTotal >= 0 ? '+' : ''}{netTotal.toFixed(2)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">{movements.length} movimientos</p>
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
