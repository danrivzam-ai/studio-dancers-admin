import { useState, useEffect } from 'react'
import { X, DollarSign, TrendingUp, TrendingDown, Clock, CheckCircle, AlertCircle, Calendar, RefreshCw, ArrowDownCircle, ArrowUpCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { logAudit } from '../lib/auditLog'
import { formatDate, formatDateForInput } from '../lib/dateUtils'

export default function CashRegister({ onClose, settings }) {
  const [loading, setLoading] = useState(true)
  const [cashRegister, setCashRegister] = useState(null)
  const [todayData, setTodayData] = useState({
    studentPayments: 0,
    quickPayments: 0,
    sales: 0,
    totalIncome: 0,
    paymentsCount: 0,
    incomeCash: 0,
    expensesTotal: 0,
    expensesCash: 0,
    expensesOther: 0,
    expensesCount: 0,
    depositsTotal: 0,
    cashInTotal: 0,
    cashOutTotal: 0,
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
        .maybeSingle()

      if (registerError) throw registerError

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
        .select('total, payment_method')
        .eq('sale_date', date)

      // Egresos (solo si hay caja)
      let expensesData = []
      if (registerData?.id) {
        const { data } = await supabase
          .from('expenses')
          .select('amount, payment_method')
          .eq('cash_register_id', registerData.id)
          .is('deleted_at', null)
          .eq('voided', false)
        expensesData = data || []
      }

      // Movimientos de caja (solo si hay caja)
      let movementsData = []
      if (registerData?.id) {
        const { data } = await supabase
          .from('cash_movements')
          .select('amount, type')
          .eq('cash_register_id', registerData.id)
          .is('deleted_at', null)
        movementsData = data || []
      }

      // Calcular totales de ingresos
      const studentTotal = studentPayments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0
      const quickTotal = quickPayments?.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0
      const salesTotal = salesData?.reduce((sum, s) => sum + parseFloat(s.total || 0), 0) || 0

      // Ingresos en efectivo
      const studentCash = studentPayments?.filter(p => p.payment_method === 'Efectivo').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0
      const quickCash = quickPayments?.filter(p => p.payment_method === 'Efectivo').reduce((sum, p) => sum + parseFloat(p.amount || 0), 0) || 0
      const salesCash = salesData?.filter(s => s.payment_method === 'cash').reduce((sum, s) => sum + parseFloat(s.total || 0), 0) || 0
      const incomeCash = studentCash + quickCash + salesCash

      // Calcular egresos
      const expensesTotal = expensesData.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
      const expensesCash = expensesData.filter(e => e.payment_method === 'cash').reduce((sum, e) => sum + parseFloat(e.amount || 0), 0)
      const expensesOther = expensesTotal - expensesCash

      // Calcular movimientos
      const depositsTotal = movementsData.filter(m => m.type === 'deposit').reduce((sum, m) => sum + parseFloat(m.amount || 0), 0)
      const cashInTotal = movementsData.filter(m => m.type === 'withdrawal' || m.type === 'owner_loan').reduce((sum, m) => sum + parseFloat(m.amount || 0), 0)
      const cashOutTotal = movementsData.filter(m => m.type === 'owner_reimbursement').reduce((sum, m) => sum + parseFloat(m.amount || 0), 0)

      setTodayData({
        studentPayments: studentTotal,
        quickPayments: quickTotal,
        sales: salesTotal,
        totalIncome: studentTotal + quickTotal + salesTotal,
        paymentsCount: (studentPayments?.length || 0) + (quickPayments?.length || 0) + (salesData?.length || 0),
        incomeCash,
        expensesTotal,
        expensesCash,
        expensesOther,
        expensesCount: expensesData.length,
        depositsTotal,
        cashInTotal,
        cashOutTotal,
      })

      // Si hay caja, cargar sus datos
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
      logAudit({ action: 'cash_register_opened', tableName: 'cash_registers', recordId: data.id, newData: { opening_amount: data.opening_amount, register_date: data.register_date } })
      alert('Caja abierta correctamente')
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

    const actualAmount = parseFloat(closingAmount)

    try {
      const { data, error } = await supabase
        .from('cash_registers')
        .update({
          closing_amount: actualAmount,
          expected_amount: expectedClosing,
          difference: actualAmount - expectedClosing,
          total_income: todayData.totalIncome,
          total_expenses: todayData.expensesTotal,
          total_movements: todayData.cashInTotal - todayData.depositsTotal - todayData.cashOutTotal,
          status: 'closed',
          closed_at: new Date().toISOString(),
          notes: notes || null
        })
        .eq('id', cashRegister.id)
        .select()
        .single()

      if (error) throw error

      setCashRegister(data)
      logAudit({ action: 'cash_register_closed', tableName: 'cash_registers', recordId: data.id, newData: { closing_amount: data.closing_amount, expected_amount: data.expected_amount, difference: data.difference } })
      alert('Caja cerrada correctamente')
    } catch (err) {
      console.error('Error closing register:', err)
      alert('Error: ' + err.message)
    }
  }

  const isToday = selectedDate === formatDateForInput(new Date())

  // Fórmula de cuadre real:
  // Esperado = Apertura + Ingresos(efectivo) - Egresos(efectivo) - Depósitos + Retiros/Préstamos - Reembolsos
  const expectedClosing = cashRegister
    ? parseFloat(cashRegister.opening_amount)
      + todayData.incomeCash
      - todayData.expensesCash
      - todayData.depositsTotal
      + todayData.cashInTotal
      - todayData.cashOutTotal
    : 0

  const hasExpenses = todayData.expensesTotal > 0
  const hasMovements = todayData.depositsTotal > 0 || todayData.cashInTotal > 0 || todayData.cashOutTotal > 0

  // Balance neto del día
  const netBalance = todayData.totalIncome - todayData.expensesTotal

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-5 border-b bg-gradient-to-r from-purple-600 to-purple-800 text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <DollarSign size={24} />
              </div>
              <div>
                <h2 className="text-xl font-semibold">Cuadre de Caja</h2>
                <p className="text-sm text-purple-200">{settings?.name || 'Academia'}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
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
              className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
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
          <div className="p-6 space-y-4">
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
                <div className="flex justify-between text-xs text-gray-400">
                  <span>{todayData.paymentsCount} transacciones</span>
                  <span>En efectivo: ${todayData.incomeCash.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Resumen de egresos del día */}
            {hasExpenses && (
              <div className="bg-white border rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <TrendingDown size={18} className="text-red-600" />
                  Egresos del día
                </h3>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Egresos en efectivo:</span>
                    <span className="font-medium text-red-600">-${todayData.expensesCash.toFixed(2)}</span>
                  </div>
                  {todayData.expensesOther > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Egresos otros medios:</span>
                      <span className="font-medium">-${todayData.expensesOther.toFixed(2)}</span>
                    </div>
                  )}
                  <hr className="my-2" />
                  <div className="flex justify-between font-semibold">
                    <span className="text-gray-800">Total egresos:</span>
                    <span className="text-red-600 text-lg">-${todayData.expensesTotal.toFixed(2)}</span>
                  </div>
                  <p className="text-xs text-gray-400">{todayData.expensesCount} registros</p>
                </div>
              </div>
            )}

            {/* Movimientos de caja */}
            {hasMovements && (
              <div className="bg-white border rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
                  <ArrowDownCircle size={18} className="text-blue-600" />
                  Movimientos de caja
                </h3>
                <div className="space-y-2">
                  {todayData.depositsTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Depósitos bancarios:</span>
                      <span className="font-medium text-red-600">-${todayData.depositsTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {todayData.cashInTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Retiros / Préstamos:</span>
                      <span className="font-medium text-green-600">+${todayData.cashInTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {todayData.cashOutTotal > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Reembolsos al dueño:</span>
                      <span className="font-medium text-red-600">-${todayData.cashOutTotal.toFixed(2)}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Balance neto */}
            {hasExpenses && (
              <div className={`rounded-xl p-4 border ${netBalance >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-gray-700">Balance neto del día</span>
                  <span className={`text-xl font-bold ${netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ${netBalance.toFixed(2)}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">Ingresos - Egresos (todos los medios de pago)</p>
              </div>
            )}

            {/* Formulario: Abrir caja */}
            {!cashRegister && isToday && (
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

            {/* Formulario: Cerrar caja */}
            {cashRegister?.status === 'open' && isToday && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <h3 className="font-semibold text-green-800 mb-3">Cerrar Caja</h3>
                <div className="space-y-3">
                  {/* Desglose del cuadre */}
                  <div className="bg-white rounded-lg p-3 space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Apertura:</span>
                      <span className="font-medium">${parseFloat(cashRegister.opening_amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">+ Ingresos efectivo:</span>
                      <span className="font-medium text-green-600">+${todayData.incomeCash.toFixed(2)}</span>
                    </div>
                    {todayData.expensesCash > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">- Egresos efectivo:</span>
                        <span className="font-medium text-red-600">-${todayData.expensesCash.toFixed(2)}</span>
                      </div>
                    )}
                    {todayData.depositsTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">- Depósitos bancarios:</span>
                        <span className="font-medium text-red-600">-${todayData.depositsTotal.toFixed(2)}</span>
                      </div>
                    )}
                    {todayData.cashInTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">+ Retiros / Préstamos:</span>
                        <span className="font-medium text-green-600">+${todayData.cashInTotal.toFixed(2)}</span>
                      </div>
                    )}
                    {todayData.cashOutTotal > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">- Reembolsos dueño:</span>
                        <span className="font-medium text-red-600">-${todayData.cashOutTotal.toFixed(2)}</span>
                      </div>
                    )}
                    <hr className="my-2" />
                    <div className="flex justify-between font-semibold">
                      <span className="text-gray-800">Esperado en caja:</span>
                      <span className="text-blue-600 text-lg">${expectedClosing.toFixed(2)}</span>
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
                        className="w-full pl-8 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
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
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
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

            {/* Resumen de caja cerrada */}
            {cashRegister?.status === 'closed' && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <h3 className="font-semibold text-gray-800 mb-3">Resumen del cierre</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Apertura:</span>
                    <span className="font-medium">${parseFloat(cashRegister.opening_amount).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ingresos totales:</span>
                    <span className="font-medium text-green-600">${parseFloat(cashRegister.total_income || 0).toFixed(2)}</span>
                  </div>
                  {parseFloat(cashRegister.total_expenses || 0) > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Egresos totales:</span>
                      <span className="font-medium text-red-600">-${parseFloat(cashRegister.total_expenses || 0).toFixed(2)}</span>
                    </div>
                  )}
                  {cashRegister.total_movements != null && parseFloat(cashRegister.total_movements) !== 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Movimientos netos:</span>
                      <span className={`font-medium ${parseFloat(cashRegister.total_movements) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {parseFloat(cashRegister.total_movements) >= 0 ? '+' : ''}{parseFloat(cashRegister.total_movements).toFixed(2)}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Esperado en caja:</span>
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
            className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
