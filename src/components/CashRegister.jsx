import { useState, useEffect } from 'react'
import { X, DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle, AlertCircle, Calendar, RefreshCw } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { formatDate, formatDateForInput } from '../lib/dateUtils'

export default function CashRegister({ onClose, settings }) {
  const [loading, setLoading] = useState(true)
  const [cashRegister, setCashRegister] = useState(null)
  const [todayData, setTodayData] = useState({
    studentPayments: 0,
    quickPayments: 0,
    sales: 0,
    totalIncome: 0,
    paymentsCount: 0
  })
  const [openingAmount, setOpeningAmount] = useState('')
  const [closingAmount, setClosingAmount] = useState('')
  const [notes, setNotes] = useState('')
  const [selectedDate, setSelectedDate] = useState(formatDateForInput(new Date()))

  // Cargar datos del día
  const fetchDayData = async (date) => {
    try {
      setLoading(true)

      // Verificar si hay caja abierta para este día
      const { data: registerData, error: registerError } = await supabase
        .from('cash_registers')
        .select('*')
        .eq('register_date', date)
        .single()

      if (registerError && registerError.code !== 'PGRST116') {
        // PGRST116 = no rows returned (es OK, no hay caja)
        throw registerError
      }

      setCashRegister(registerData || null)

      // Pagos de estudiantes
      const { data: studentPayments } = await supabase
        .from('payments')
        .select('amount, payment_method')
        .eq('payment_date', date)

      // Pagos rápidos
      const { data: quickPayments } = await supabase
        .from('quick_payments')
        .select('amount, payment_method')
        .eq('payment_date', date)

      // Ventas
      const { data: salesData } = await supabase
        .from('sales')
        .select('total')
        .eq('sale_date', date)

      const studentTotal = studentPayments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0
      const quickTotal = quickPayments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0
      const salesTotal = salesData?.reduce((sum, s) => sum + parseFloat(s.total || 0), 0) || 0

      setTodayData({
        studentPayments: studentTotal,
        quickPayments: quickTotal,
        sales: salesTotal,
        totalIncome: studentTotal + quickTotal + salesTotal,
        paymentsCount: (studentPayments?.length || 0) + (quickPayments?.length || 0) + (salesData?.length || 0)
      })

      // Si hay caja abierta, cargar sus datos
      if (registerData) {
        setOpeningAmount(registerData.opening_amount?.toString() || '')
        setClosingAmount(registerData.closing_amount?.toString() || '')
        setNotes(registerData.notes || '')
      } else {
        setOpeningAmount('')
        setClosingAmount('')
        setNotes('')
      }

    } catch (err) {
      console.error('Error fetching day data:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDayData(selectedDate)
  }, [selectedDate])

  // Abrir caja
  const handleOpenRegister = async () => {
    if (!openingAmount || parseFloat(openingAmount) < 0) {
      alert('Ingrese un monto de apertura válido')
      return
    }

    try {
      const { data, error } = await supabase
        .from('cash_registers')
        .insert([{
          register_date: selectedDate,
          opening_amount: parseFloat(openingAmount),
          status: 'open',
          opened_at: new Date().toISOString(),
          notes: notes || null
        }])
        .select()
        .single()

      if (error) throw error

      setCashRegister(data)
      alert('✅ Caja abierta correctamente')
    } catch (err) {
      console.error('Error opening register:', err)
      alert('Error: ' + err.message)
    }
  }

  // Cerrar caja
  const handleCloseRegister = async () => {
    if (!closingAmount || parseFloat(closingAmount) < 0) {
      alert('Ingrese el monto de cierre (efectivo en caja)')
      return
    }

    const expectedAmount = parseFloat(cashRegister.opening_amount) + todayData.totalIncome
    const actualAmount = parseFloat(closingAmount)
    const difference = actualAmount - expectedAmount

    try {
      const { data, error } = await supabase
        .from('cash_registers')
        .update({
          closing_amount: actualAmount,
          expected_amount: expectedAmount,
          difference: difference,
          total_income: todayData.totalIncome,
          status: 'closed',
          closed_at: new Date().toISOString(),
          notes: notes || null
        })
        .eq('id', cashRegister.id)
        .select()
        .single()

      if (error) throw error

      setCashRegister(data)
      alert('✅ Caja cerrada correctamente')
    } catch (err) {
      console.error('Error closing register:', err)
      alert('Error: ' + err.message)
    }
  }

  const isToday = selectedDate === formatDateForInput(new Date())
  const expectedClosing = cashRegister ? parseFloat(cashRegister.opening_amount) + todayData.totalIncome : 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b bg-gradient-to-r from-green-50 to-emerald-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg">
                <DollarSign className="text-green-600" size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-800">Cuadre de Caja</h2>
                <p className="text-sm text-gray-500">{settings?.name || 'Academia'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/50 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Date Selector */}
        <div className="p-4 border-b bg-gray-50">
          <div className="flex items-center gap-3">
            <Calendar size={18} className="text-gray-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
            />
            <button
              onClick={() => fetchDayData(selectedDate)}
              className="p-2 bg-gray-200 hover:bg-gray-300 rounded-lg transition-colors"
              title="Actualizar"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-gray-500">Cargando...</p>
          </div>
        ) : (
          <div className="p-6 space-y-6">
            {/* Estado de la caja */}
            <div className={`rounded-xl p-4 ${
              cashRegister?.status === 'closed'
                ? 'bg-gray-100 border border-gray-300'
                : cashRegister?.status === 'open'
                  ? 'bg-green-50 border border-green-200'
                  : 'bg-yellow-50 border border-yellow-200'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                {cashRegister?.status === 'closed' ? (
                  <CheckCircle className="text-gray-600" size={20} />
                ) : cashRegister?.status === 'open' ? (
                  <Clock className="text-green-600" size={20} />
                ) : (
                  <AlertCircle className="text-yellow-600" size={20} />
                )}
                <span className="font-semibold text-gray-800">
                  {cashRegister?.status === 'closed'
                    ? 'Caja Cerrada'
                    : cashRegister?.status === 'open'
                      ? 'Caja Abierta'
                      : 'Sin abrir'}
                </span>
              </div>
              {cashRegister?.opened_at && (
                <p className="text-xs text-gray-500">
                  Abierta: {formatDate(cashRegister.opened_at, 'dd/MM/yyyy HH:mm')}
                </p>
              )}
              {cashRegister?.closed_at && (
                <p className="text-xs text-gray-500">
                  Cerrada: {formatDate(cashRegister.closed_at, 'dd/MM/yyyy HH:mm')}
                </p>
              )}
            </div>

            {/* Resumen de ingresos del día */}
            <div className="bg-white border rounded-xl p-4">
              <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <TrendingUp size={18} className="text-green-600" />
                Ingresos del día
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pagos de alumnos:</span>
                  <span className="font-medium">${todayData.studentPayments.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Pagos rápidos:</span>
                  <span className="font-medium">${todayData.quickPayments.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Ventas:</span>
                  <span className="font-medium">${todayData.sales.toFixed(2)}</span>
                </div>
                <hr className="my-2" />
                <div className="flex justify-between font-semibold">
                  <span className="text-gray-800">Total ingresos:</span>
                  <span className="text-green-600 text-lg">${todayData.totalIncome.toFixed(2)}</span>
                </div>
                <p className="text-xs text-gray-400">{todayData.paymentsCount} transacciones</p>
              </div>
            </div>

            {/* Formulario según estado */}
            {!cashRegister && isToday && (
              /* Abrir caja */
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <h3 className="font-semibold text-yellow-800 mb-3">Abrir Caja</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Monto de apertura (efectivo inicial)
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={openingAmount}
                        onChange={(e) => setOpeningAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notas (opcional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-yellow-500"
                      placeholder="Observaciones..."
                    />
                  </div>
                  <button
                    onClick={handleOpenRegister}
                    className="w-full px-4 py-3 bg-yellow-500 hover:bg-yellow-600 text-white rounded-xl font-medium transition-colors"
                  >
                    Abrir Caja
                  </button>
                </div>
              </div>
            )}

            {cashRegister?.status === 'open' && isToday && (
              /* Cerrar caja */
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h3 className="font-semibold text-green-800 mb-3">Cerrar Caja</h3>
                <div className="space-y-3">
                  <div className="bg-white rounded-lg p-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">Apertura:</span>
                      <span className="font-medium">${parseFloat(cashRegister.opening_amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-600">+ Ingresos:</span>
                      <span className="font-medium text-green-600">${todayData.totalIncome.toFixed(2)}</span>
                    </div>
                    <hr className="my-2" />
                    <div className="flex justify-between font-semibold">
                      <span className="text-gray-800">Esperado en caja:</span>
                      <span className="text-blue-600">${expectedClosing.toFixed(2)}</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Efectivo real en caja
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">$</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={closingAmount}
                        onChange={(e) => setClosingAmount(e.target.value)}
                        className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  {closingAmount && (
                    <div className={`p-3 rounded-lg ${
                      parseFloat(closingAmount) === expectedClosing
                        ? 'bg-green-100 text-green-800'
                        : parseFloat(closingAmount) > expectedClosing
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-red-100 text-red-800'
                    }`}>
                      <div className="flex items-center gap-2">
                        {parseFloat(closingAmount) === expectedClosing ? (
                          <CheckCircle size={18} />
                        ) : parseFloat(closingAmount) > expectedClosing ? (
                          <TrendingUp size={18} />
                        ) : (
                          <TrendingDown size={18} />
                        )}
                        <span className="font-medium">
                          {parseFloat(closingAmount) === expectedClosing
                            ? 'Cuadre perfecto'
                            : parseFloat(closingAmount) > expectedClosing
                              ? `Sobrante: $${(parseFloat(closingAmount) - expectedClosing).toFixed(2)}`
                              : `Faltante: $${(expectedClosing - parseFloat(closingAmount)).toFixed(2)}`
                          }
                        </span>
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notas de cierre (opcional)
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500"
                      placeholder="Observaciones del cierre..."
                    />
                  </div>

                  <button
                    onClick={handleCloseRegister}
                    className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium transition-colors"
                  >
                    Cerrar Caja
                  </button>
                </div>
              </div>
            )}

            {cashRegister?.status === 'closed' && (
              /* Resumen de caja cerrada */
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Resumen del cierre</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Apertura:</span>
                    <span className="font-medium">${parseFloat(cashRegister.opening_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ingresos:</span>
                    <span className="font-medium text-green-600">${parseFloat(cashRegister.total_income || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Esperado:</span>
                    <span className="font-medium">${parseFloat(cashRegister.expected_amount || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cierre real:</span>
                    <span className="font-medium">${parseFloat(cashRegister.closing_amount || 0).toFixed(2)}</span>
                  </div>
                  <hr className="my-2" />
                  <div className={`flex justify-between font-semibold ${
                    parseFloat(cashRegister.difference || 0) === 0
                      ? 'text-green-600'
                      : parseFloat(cashRegister.difference || 0) > 0
                        ? 'text-blue-600'
                        : 'text-red-600'
                  }`}>
                    <span>Diferencia:</span>
                    <span>
                      {parseFloat(cashRegister.difference || 0) === 0
                        ? 'Cuadrado'
                        : parseFloat(cashRegister.difference || 0) > 0
                          ? `+$${parseFloat(cashRegister.difference).toFixed(2)}`
                          : `-$${Math.abs(parseFloat(cashRegister.difference)).toFixed(2)}`
                      }
                    </span>
                  </div>
                  {cashRegister.notes && (
                    <p className="text-xs text-gray-500 mt-2">Notas: {cashRegister.notes}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-3 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
