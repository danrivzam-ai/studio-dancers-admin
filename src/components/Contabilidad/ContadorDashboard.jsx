import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { getTodayEC } from '../../lib/dateUtils'
import {
  TrendingUp, TrendingDown, DollarSign, FileText, LogOut,
  BookOpen, BarChart3, Calendar, ChevronDown, Download, RefreshCw, Eye, EyeOff
} from 'lucide-react'
import ContabilidadPanel from './ContabilidadPanel'
import * as XLSX from 'xlsx'

// Formatear moneda
const fmt = (n) => `$${(parseFloat(n) || 0).toFixed(2)}`

// Nombre del mes en español
const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

export default function ContadorDashboard({ user, settings, onSignOut }) {
  const today = new Date()
  const currentYear = today.getFullYear()
  const currentMonth = today.getMonth() // 0-indexed

  const [selectedYear, setSelectedYear] = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)
  const [loading, setLoading] = useState(true)
  const [hideAmounts, setHideAmounts] = useState(false)
  const [showContabilidad, setShowContabilidad] = useState(false)

  // Datos financieros
  const [ingresos, setIngresos] = useState(0)
  const [egresos, setEgresos] = useState(0)
  const [recentPayments, setRecentPayments] = useState([])
  const [recentExpenses, setRecentExpenses] = useState([])
  const [monthlySummary, setMonthlySummary] = useState([]) // últimos 6 meses

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const firstDay = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0)
      const lastDayStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`

      // Pagos del mes seleccionado (payments + quick_payments)
      const [paymentsRes, quickRes, expensesRes] = await Promise.all([
        supabase
          .from('payments')
          .select('amount, payment_date, student_id, students(name)')
          .gte('payment_date', `${firstDay}T00:00:00`)
          .lte('payment_date', `${lastDayStr}T23:59:59`)
          .order('payment_date', { ascending: false }),
        supabase
          .from('quick_payments')
          .select('amount, created_at, student_name, notes')
          .gte('created_at', `${firstDay}T00:00:00`)
          .lte('created_at', `${lastDayStr}T23:59:59`)
          .order('created_at', { ascending: false }),
        supabase
          .from('expenses')
          .select('amount, expense_date, description, expense_categories(name, color)')
          .is('deleted_at', null)
          .eq('voided', false)
          .gte('expense_date', `${firstDay}T00:00:00`)
          .lte('expense_date', `${lastDayStr}T23:59:59`)
          .order('expense_date', { ascending: false })
      ])

      const payments = paymentsRes.data || []
      const quick = quickRes.data || []
      const expenses = expensesRes.data || []

      const totalIngresos = payments.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0)
        + quick.reduce((s, q) => s + (parseFloat(q.amount) || 0), 0)
      const totalEgresos = expenses.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)

      setIngresos(totalIngresos)
      setEgresos(totalEgresos)

      // Últimos pagos combinados
      const combined = [
        ...payments.map(p => ({
          type: 'ingreso',
          name: p.students?.name || '—',
          concept: 'Mensualidad',
          amount: parseFloat(p.amount) || 0,
          date: p.payment_date
        })),
        ...quick.map(q => ({
          type: 'ingreso',
          name: q.student_name || '—',
          concept: q.notes || 'Pago rápido',
          amount: parseFloat(q.amount) || 0,
          date: q.created_at
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 12)

      setRecentPayments(combined)
      setRecentExpenses(expenses.slice(0, 12))

      // Resumen últimos 6 meses
      const summary = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(selectedYear, selectedMonth - i, 1)
        const y = d.getFullYear()
        const m = d.getMonth()
        const f = `${y}-${String(m + 1).padStart(2, '0')}-01`
        const l = new Date(y, m + 1, 0)
        const lStr = `${y}-${String(m + 1).padStart(2, '0')}-${String(l.getDate()).padStart(2, '0')}`

        const [pRes, qRes, eRes] = await Promise.all([
          supabase.from('payments').select('amount').gte('payment_date', `${f}T00:00:00`).lte('payment_date', `${lStr}T23:59:59`),
          supabase.from('quick_payments').select('amount').gte('created_at', `${f}T00:00:00`).lte('created_at', `${lStr}T23:59:59`),
          supabase.from('expenses').select('amount').is('deleted_at', null).eq('voided', false).gte('expense_date', `${f}T00:00:00`).lte('expense_date', `${lStr}T23:59:59`)
        ])
        const ing = (pRes.data || []).reduce((s, x) => s + (parseFloat(x.amount) || 0), 0)
          + (qRes.data || []).reduce((s, x) => s + (parseFloat(x.amount) || 0), 0)
        const egr = (eRes.data || []).reduce((s, x) => s + (parseFloat(x.amount) || 0), 0)
        summary.push({ label: MESES[m].slice(0, 3), ingresos: ing, egresos: egr, utilidad: ing - egr })
      }
      setMonthlySummary(summary)
    } catch (err) {
      console.error('Error fetching contador data:', err)
    } finally {
      setLoading(false)
    }
  }, [selectedYear, selectedMonth])

  useEffect(() => { fetchData() }, [fetchData])

  // Exportar resumen mensual a Excel
  const exportExcel = () => {
    const rows = monthlySummary.map(m => ({
      'Mes': m.label,
      'Ingresos ($)': m.ingresos.toFixed(2),
      'Egresos ($)': m.egresos.toFixed(2),
      'Utilidad ($)': m.utilidad.toFixed(2)
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Resumen mensual')
    XLSX.writeFile(wb, `resumen-financiero-${selectedYear}.xlsx`)
  }

  const utilidad = ingresos - egresos
  const margen = ingresos > 0 ? ((utilidad / ingresos) * 100).toFixed(1) : '0.0'
  const mesLabel = `${MESES[selectedMonth]} ${selectedYear}`

  if (showContabilidad) {
    return (
      <ContabilidadPanel
        settings={settings}
        onClose={() => setShowContabilidad(false)}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 sm:px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-gray-900">
              {settings?.legal_name || settings?.name || 'Studio Dancers'}
            </h1>
            <p className="text-sm text-gray-500">Panel Contadora · {user?.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setHideAmounts(h => !h)}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              title={hideAmounts ? 'Mostrar montos' : 'Ocultar montos'}
            >
              {hideAmounts ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
            <button
              onClick={fetchData}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
              title="Actualizar datos"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={onSignOut}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 px-3 py-2 rounded-lg transition-colors"
            >
              <LogOut size={15} />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">

        {/* Selector de período */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Calendar size={16} className="text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Período:</span>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
            </select>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-purple-300"
            >
              {[currentYear - 1, currentYear].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 text-sm bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Download size={14} />
            Exportar resumen
          </button>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* Ingresos */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-emerald-50 rounded-xl">
                <TrendingUp size={20} className="text-emerald-600" />
              </div>
              <span className="text-xs text-gray-400 font-medium">{mesLabel}</span>
            </div>
            <p className="text-xs text-gray-500 mb-1">Ingresos totales</p>
            <p className="text-2xl font-bold text-gray-900">
              {hideAmounts ? '•••••' : fmt(ingresos)}
            </p>
            <p className="text-xs text-emerald-600 mt-1">Mensualidades + pagos rápidos</p>
          </div>

          {/* Egresos */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-start justify-between mb-3">
              <div className="p-2 bg-red-50 rounded-xl">
                <TrendingDown size={20} className="text-red-500" />
              </div>
              <span className="text-xs text-gray-400 font-medium">{mesLabel}</span>
            </div>
            <p className="text-xs text-gray-500 mb-1">Egresos totales</p>
            <p className="text-2xl font-bold text-gray-900">
              {hideAmounts ? '•••••' : fmt(egresos)}
            </p>
            <p className="text-xs text-red-500 mt-1">Gastos operativos registrados</p>
          </div>

          {/* Utilidad */}
          <div className={`rounded-2xl border shadow-sm p-5 ${utilidad >= 0 ? 'bg-purple-50 border-purple-100' : 'bg-orange-50 border-orange-100'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className={`p-2 rounded-xl ${utilidad >= 0 ? 'bg-purple-100' : 'bg-orange-100'}`}>
                <DollarSign size={20} className={utilidad >= 0 ? 'text-purple-700' : 'text-orange-600'} />
              </div>
              <span className="text-xs text-gray-400 font-medium">{mesLabel}</span>
            </div>
            <p className="text-xs text-gray-500 mb-1">Utilidad / Pérdida</p>
            <p className={`text-2xl font-bold ${utilidad >= 0 ? 'text-purple-800' : 'text-orange-700'}`}>
              {hideAmounts ? '•••••' : fmt(utilidad)}
            </p>
            <p className={`text-xs mt-1 ${utilidad >= 0 ? 'text-purple-600' : 'text-orange-600'}`}>
              Margen: {hideAmounts ? '—' : `${margen}%`}
            </p>
          </div>
        </div>

        {/* Acceso rápido a módulos */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={() => setShowContabilidad(true)}
            className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-purple-200 hover:shadow-md transition-all text-left group"
          >
            <div className="p-3 bg-purple-50 rounded-xl group-hover:bg-purple-100 transition-colors">
              <BookOpen size={22} className="text-purple-700" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Libros contables</p>
              <p className="text-sm text-gray-500 mt-0.5">Libro diario, mayor, balance y resultados</p>
            </div>
          </button>

          <button
            onClick={exportExcel}
            className="flex items-center gap-4 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 hover:border-emerald-200 hover:shadow-md transition-all text-left group"
          >
            <div className="p-3 bg-emerald-50 rounded-xl group-hover:bg-emerald-100 transition-colors">
              <Download size={22} className="text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">Exportar a Excel</p>
              <p className="text-sm text-gray-500 mt-0.5">Resumen de los últimos 6 meses</p>
            </div>
          </button>
        </div>

        {/* Tabla: Resumen últimos 6 meses */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
            <BarChart3 size={16} className="text-gray-400" />
            <h2 className="font-semibold text-gray-900 text-sm">Tendencia — últimos 6 meses</h2>
          </div>
          {loading ? (
            <div className="px-5 py-8 text-center text-gray-400 text-sm">Cargando...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                    <th className="px-5 py-3 text-left font-medium">Mes</th>
                    <th className="px-5 py-3 text-right font-medium">Ingresos</th>
                    <th className="px-5 py-3 text-right font-medium">Egresos</th>
                    <th className="px-5 py-3 text-right font-medium">Utilidad</th>
                    <th className="px-5 py-3 text-right font-medium">Margen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {monthlySummary.map((row, i) => (
                    <tr key={i} className={`hover:bg-gray-50 transition-colors ${i === monthlySummary.length - 1 ? 'font-semibold bg-purple-50/40' : ''}`}>
                      <td className="px-5 py-3 text-gray-700">{row.label}</td>
                      <td className="px-5 py-3 text-right text-emerald-700">
                        {hideAmounts ? '•••' : fmt(row.ingresos)}
                      </td>
                      <td className="px-5 py-3 text-right text-red-600">
                        {hideAmounts ? '•••' : fmt(row.egresos)}
                      </td>
                      <td className={`px-5 py-3 text-right font-medium ${row.utilidad >= 0 ? 'text-purple-700' : 'text-orange-600'}`}>
                        {hideAmounts ? '•••' : fmt(row.utilidad)}
                      </td>
                      <td className="px-5 py-3 text-right text-gray-500">
                        {hideAmounts ? '—' : row.ingresos > 0 ? `${((row.utilidad / row.ingresos) * 100).toFixed(1)}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Últimos movimientos — 2 columnas */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Ingresos recientes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <TrendingUp size={15} className="text-emerald-500" />
              <h2 className="font-semibold text-gray-900 text-sm">Ingresos recientes</h2>
              <span className="ml-auto text-xs text-gray-400">{mesLabel}</span>
            </div>
            {loading ? (
              <div className="px-5 py-6 text-center text-gray-400 text-sm">Cargando...</div>
            ) : recentPayments.length === 0 ? (
              <div className="px-5 py-6 text-center text-gray-400 text-sm">Sin ingresos en este período</div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {recentPayments.map((p, i) => (
                  <li key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{p.name}</p>
                      <p className="text-xs text-gray-400">{p.concept}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-emerald-700">
                        {hideAmounts ? '•••' : fmt(p.amount)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {p.date ? new Date(p.date).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' }) : '—'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Egresos recientes */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <TrendingDown size={15} className="text-red-400" />
              <h2 className="font-semibold text-gray-900 text-sm">Egresos recientes</h2>
              <span className="ml-auto text-xs text-gray-400">{mesLabel}</span>
            </div>
            {loading ? (
              <div className="px-5 py-6 text-center text-gray-400 text-sm">Cargando...</div>
            ) : recentExpenses.length === 0 ? (
              <div className="px-5 py-6 text-center text-gray-400 text-sm">Sin egresos en este período</div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {recentExpenses.map((e, i) => (
                  <li key={i} className="px-5 py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0 flex items-center gap-2">
                      {e.expense_categories?.color && (
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: e.expense_categories.color }} />
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">{e.description || '—'}</p>
                        <p className="text-xs text-gray-400">{e.expense_categories?.name || 'Sin categoría'}</p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-red-600">
                        {hideAmounts ? '•••' : fmt(e.amount)}
                      </p>
                      <p className="text-xs text-gray-400">
                        {e.expense_date ? new Date(e.expense_date).toLocaleDateString('es-EC', { day: '2-digit', month: 'short' }) : '—'}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Pie de página */}
        <p className="text-center text-xs text-gray-400 pb-4">
          {settings?.legal_name || 'ADLAB STUDIO S.A.S.'} · RUC: {settings?.ruc || '—'} · Datos en tiempo real
        </p>
      </div>
    </div>
  )
}
