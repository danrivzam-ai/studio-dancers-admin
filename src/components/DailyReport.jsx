import { useEffect } from 'react'
import {
  DollarSign, TrendingDown, TrendingUp, Banknote, Building2,
  CreditCard, ArrowLeftRight, ChevronLeft, ChevronRight, RefreshCw, Calendar
} from 'lucide-react'
import { useDailyReport } from '../hooks/useDailyReport'

const fmt = (n) => `$${parseFloat(n || 0).toLocaleString('es-EC', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

export default function DailyReport({ cashRegister }) {
  const { report, loading, date, setDate, fetchReport } = useDailyReport()

  useEffect(() => {
    fetchReport(date)
  }, [date, fetchReport])

  const today = new Date().toISOString().split('T')[0]
  const isToday = date === today

  const changeDate = (days) => {
    const d = new Date(date + 'T12:00:00')
    d.setDate(d.getDate() + days)
    setDate(d.toISOString().split('T')[0])
  }

  const formatDateDisplay = (d) => {
    const dt = new Date(d + 'T12:00:00')
    return dt.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  }

  if (loading && !report) {
    return (
      <div className="flex items-center justify-center py-16">
        <RefreshCw size={24} className="animate-spin text-blue-500 mr-3" />
        <span className="text-gray-500">Cargando reporte...</span>
      </div>
    )
  }

  const r = report || {
    incomeByMethod: { cash: 0, transfer: 0, card: 0 },
    incomeBySource: {
      studentPayments: { total: 0, cash: 0, transfer: 0, count: 0 },
      quickPayments: { total: 0, cash: 0, transfer: 0, count: 0 },
      sales: { total: 0, cash: 0, transfer: 0, card: 0, count: 0 }
    },
    totalIncome: 0, incomeCount: 0,
    expensesByMethod: { cash: 0, transfer: 0, card: 0 },
    expensesByCategory: [],
    expensesTotal: 0, expensesCount: 0,
    movements: { deposits: 0, cashIn: 0, cashOut: 0, net: 0, count: 0 },
    totals: { totalIncome: 0, totalExpenses: 0, netBalance: 0, cashInHand: 0, inBank: 0, openingAmount: 0 }
  }

  return (
    <div className="space-y-4">
      {/* Header con fecha */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Reporte del Dia</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => changeDate(-1)}
            className="p-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2 bg-white border border-gray-300 rounded-lg px-3 py-2">
            <Calendar size={16} className="text-gray-500" />
            <input
              type="date"
              value={date}
              max={today}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-sm font-medium text-gray-700 outline-none"
            />
          </div>
          <button
            onClick={() => changeDate(1)}
            disabled={isToday}
            className="p-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
          {!isToday && (
            <button
              onClick={() => setDate(today)}
              className="px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Hoy
            </button>
          )}
          <button
            onClick={() => fetchReport(date)}
            className="p-2 bg-white border border-gray-300 hover:bg-gray-50 rounded-lg transition-colors"
            title="Actualizar"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin text-blue-500' : 'text-gray-500'} />
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-500 capitalize -mt-2">{formatDateDisplay(date)}</p>

      {/* Estado de caja */}
      {r.cashRegister ? (
        <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
          r.cashRegister.status === 'open'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-gray-100 text-gray-600 border border-gray-200'
        }`}>
          <span className={`w-2 h-2 rounded-full ${r.cashRegister.status === 'open' ? 'bg-green-500' : 'bg-gray-400'}`} />
          Caja {r.cashRegister.status === 'open' ? 'abierta' : 'cerrada'}
          {r.totals.openingAmount > 0 && ` · Apertura: ${fmt(r.totals.openingAmount)}`}
        </div>
      ) : (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
          <span className="w-2 h-2 rounded-full bg-yellow-500" />
          No se abrio caja este dia
        </div>
      )}

      {/* Fila 1: Resumen principal */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp size={20} className="text-green-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">Ingresos</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{fmt(r.totalIncome)}</p>
          <p className="text-xs text-gray-400 mt-1">{r.incomeCount} transaccion{r.incomeCount !== 1 ? 'es' : ''}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown size={20} className="text-red-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">Egresos</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{fmt(r.expensesTotal)}</p>
          <p className="text-xs text-gray-400 mt-1">{r.expensesCount} egreso{r.expensesCount !== 1 ? 's' : ''}</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-2 rounded-lg ${r.totals.netBalance >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
              <DollarSign size={20} className={r.totals.netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'} />
            </div>
            <span className="text-sm font-medium text-gray-500">Balance</span>
          </div>
          <p className={`text-2xl font-bold ${r.totals.netBalance >= 0 ? 'text-blue-600' : 'text-orange-600'}`}>
            {fmt(r.totals.netBalance)}
          </p>
          <p className="text-xs text-gray-400 mt-1">Ingresos - Egresos</p>
        </div>
      </div>

      {/* Fila 2: Donde esta el dinero */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Banknote size={20} className="text-green-600" />
            <span className="text-sm font-semibold text-green-800">Efectivo en caja</span>
          </div>
          <p className="text-2xl font-bold text-green-700">{fmt(r.totals.cashInHand)}</p>
          <div className="mt-2 space-y-1 text-xs text-green-600">
            {r.totals.openingAmount > 0 && <p>Apertura: {fmt(r.totals.openingAmount)}</p>}
            <p>+ Ingresos efectivo: {fmt(r.incomeByMethod.cash)}</p>
            {r.expensesByMethod.cash > 0 && <p>- Egresos efectivo: {fmt(r.expensesByMethod.cash)}</p>}
            {r.movements.deposits > 0 && <p>- Depositos: {fmt(r.movements.deposits)}</p>}
            {r.movements.cashIn > 0 && <p>+ Retiros/Prestamos: {fmt(r.movements.cashIn)}</p>}
            {r.movements.cashOut > 0 && <p>- Reembolsos: {fmt(r.movements.cashOut)}</p>}
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <Building2 size={20} className="text-blue-600" />
            <span className="text-sm font-semibold text-blue-800">En banco</span>
          </div>
          <p className="text-2xl font-bold text-blue-700">{fmt(r.totals.inBank)}</p>
          <div className="mt-2 space-y-1 text-xs text-blue-600">
            <p>Transferencias recibidas: {fmt(r.incomeByMethod.transfer)}</p>
            {r.movements.deposits > 0 && <p>Depositos realizados: {fmt(r.movements.deposits)}</p>}
            {r.incomeByMethod.card > 0 && <p>Pagos con tarjeta: {fmt(r.incomeByMethod.card)}</p>}
          </div>
        </div>
      </div>

      {/* Fila 3: Desglose de ingresos */}
      {r.totalIncome > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <TrendingUp size={18} className="text-green-600" />
            Desglose de ingresos
          </h3>
          <div className="space-y-3">
            {r.incomeBySource.studentPayments.total > 0 && (
              <IncomeRow
                label="Pagos de alumnos"
                total={r.incomeBySource.studentPayments.total}
                cash={r.incomeBySource.studentPayments.cash}
                transfer={r.incomeBySource.studentPayments.transfer}
                count={r.incomeBySource.studentPayments.count}
              />
            )}
            {r.incomeBySource.quickPayments.total > 0 && (
              <IncomeRow
                label="Pagos rapidos"
                total={r.incomeBySource.quickPayments.total}
                cash={r.incomeBySource.quickPayments.cash}
                transfer={r.incomeBySource.quickPayments.transfer}
                count={r.incomeBySource.quickPayments.count}
              />
            )}
            {r.incomeBySource.sales.total > 0 && (
              <IncomeRow
                label="Ventas"
                total={r.incomeBySource.sales.total}
                cash={r.incomeBySource.sales.cash}
                transfer={r.incomeBySource.sales.transfer}
                card={r.incomeBySource.sales.card}
                count={r.incomeBySource.sales.count}
              />
            )}
          </div>
          {/* Totales por método */}
          <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap gap-4 text-sm">
            <span className="flex items-center gap-1.5">
              <Banknote size={14} className="text-green-600" />
              <span className="text-gray-600">Efectivo:</span>
              <span className="font-semibold text-gray-800">{fmt(r.incomeByMethod.cash)}</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Building2 size={14} className="text-blue-600" />
              <span className="text-gray-600">Transferencia:</span>
              <span className="font-semibold text-gray-800">{fmt(r.incomeByMethod.transfer)}</span>
            </span>
            {r.incomeByMethod.card > 0 && (
              <span className="flex items-center gap-1.5">
                <CreditCard size={14} className="text-purple-600" />
                <span className="text-gray-600">Tarjeta:</span>
                <span className="font-semibold text-gray-800">{fmt(r.incomeByMethod.card)}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Fila 4: Desglose de egresos por categoria */}
      {r.expensesTotal > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <TrendingDown size={18} className="text-red-600" />
            Egresos por categoria
          </h3>
          <div className="space-y-2">
            {r.expensesByCategory.map(cat => (
              <div key={cat.name} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: cat.color }} />
                  <span className="text-sm text-gray-700">{cat.name}</span>
                  <span className="text-xs text-gray-400">({cat.count})</span>
                </div>
                <span className="text-sm font-semibold text-red-600">{fmt(cat.total)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap gap-4 text-sm">
            {r.expensesByMethod.cash > 0 && (
              <span className="flex items-center gap-1.5">
                <Banknote size={14} className="text-green-600" />
                <span className="text-gray-600">Efectivo:</span>
                <span className="font-semibold text-gray-800">{fmt(r.expensesByMethod.cash)}</span>
              </span>
            )}
            {r.expensesByMethod.transfer > 0 && (
              <span className="flex items-center gap-1.5">
                <Building2 size={14} className="text-blue-600" />
                <span className="text-gray-600">Transferencia:</span>
                <span className="font-semibold text-gray-800">{fmt(r.expensesByMethod.transfer)}</span>
              </span>
            )}
            {r.expensesByMethod.card > 0 && (
              <span className="flex items-center gap-1.5">
                <CreditCard size={14} className="text-purple-600" />
                <span className="text-gray-600">Tarjeta:</span>
                <span className="font-semibold text-gray-800">{fmt(r.expensesByMethod.card)}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {/* Fila 5: Movimientos de caja */}
      {r.movements.count > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
            <ArrowLeftRight size={18} className="text-blue-600" />
            Movimientos de caja
          </h3>
          <div className="space-y-2 text-sm">
            {r.movements.deposits > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Depositos bancarios</span>
                <span className="font-medium text-red-600">- {fmt(r.movements.deposits)}</span>
              </div>
            )}
            {r.movements.cashIn > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Retiros / Prestamos</span>
                <span className="font-medium text-green-600">+ {fmt(r.movements.cashIn)}</span>
              </div>
            )}
            {r.movements.cashOut > 0 && (
              <div className="flex justify-between py-1">
                <span className="text-gray-600">Reembolsos al dueno</span>
                <span className="font-medium text-red-600">- {fmt(r.movements.cashOut)}</span>
              </div>
            )}
            <div className="flex justify-between py-2 border-t border-gray-100 font-semibold">
              <span className="text-gray-700">Efecto neto en caja</span>
              <span className={r.movements.net >= 0 ? 'text-green-600' : 'text-red-600'}>
                {r.movements.net >= 0 ? '+' : ''}{fmt(r.movements.net)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {r.totalIncome === 0 && r.expensesTotal === 0 && r.movements.count === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <DollarSign className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500 font-medium">Sin movimientos este dia</p>
          <p className="text-gray-400 text-sm mt-1">No hay ingresos, egresos ni movimientos registrados</p>
        </div>
      )}
    </div>
  )
}

function IncomeRow({ label, total, cash, transfer, card = 0, count }) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <span className="text-sm font-medium text-gray-700">{label}</span>
        <span className="text-xs text-gray-400 ml-2">({count})</span>
        <div className="flex gap-3 mt-0.5">
          {cash > 0 && <span className="text-xs text-gray-500">Efectivo {fmt(cash)}</span>}
          {transfer > 0 && <span className="text-xs text-gray-500">Transferencia {fmt(transfer)}</span>}
          {card > 0 && <span className="text-xs text-gray-500">Tarjeta {fmt(card)}</span>}
        </div>
      </div>
      <span className="text-lg font-bold text-green-600">{fmt(total)}</span>
    </div>
  )
}
