import { useState, useEffect, useMemo } from 'react'
import { X, Download, BookOpen, BarChart3, FileText, TrendingUp, RefreshCw } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import * as XLSX from 'xlsx'

// ─── Plan de cuentas ────────────────────────────────────────────────────────
const PLAN_CUENTAS = {
  '1.1.01': 'Caja',
  '1.1.02': 'Bancos',
  '4.1.01': 'Ingresos por servicios de enseñanza',
  '4.1.02': 'Ingresos por venta de productos',
  '4.1.03': 'Otros ingresos',
  '5.1.01': 'Gastos de personal / honorarios',
  '5.1.02': 'Gastos administrativos',
  '5.1.03': 'Gastos de arriendo',
  '5.1.04': 'Gastos de servicios básicos',
  '5.1.05': 'Gastos de marketing y publicidad',
  '5.1.06': 'Otros gastos operacionales',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(n) {
  return parseFloat(n || 0).toFixed(2)
}

function getCtaEfectivo(paymentMethod) {
  const m = (paymentMethod || '').toLowerCase()
  if (m.includes('transfer') || m.includes('banco') || m.includes('depósito') || m.includes('deposito')) {
    return '1.1.02'
  }
  return '1.1.01'
}

function getCtaGasto(categoryName) {
  const n = (categoryName || '').toLowerCase()
  if (n.includes('honor') || n.includes('personal') || n.includes('instructor') || n.includes('sueldo')) return '5.1.01'
  if (n.includes('arrend') || n.includes('local') || n.includes('alquiler')) return '5.1.03'
  if (n.includes('agua') || n.includes('luz') || n.includes('básic') || n.includes('basic') || n.includes('electric') || n.includes('internet') || n.includes('teléf')) return '5.1.04'
  if (n.includes('market') || n.includes('public') || n.includes('publicid') || n.includes('anuncio') || n.includes('redes')) return '5.1.05'
  return '5.1.02'
}

function getMesLabel(year, month) {
  const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
  return `${meses[month - 1]} ${year}`
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function ContabilidadPanel({ settings, onClose }) {
  const now = new Date()
  const [periodoTipo, setPeriodoTipo] = useState('mes') // 'mes' | 'rango'
  const [anio, setAnio] = useState(now.getFullYear())
  const [mes, setMes] = useState(now.getMonth() + 1)
  const [fechaInicio, setFechaInicio] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-01`)
  const [fechaFin, setFechaFin] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2,'0')}-${String(new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()).padStart(2,'0')}`)
  const [activeTab, setActiveTab] = useState('diario')
  const [asientos, setAsientos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Calcular rango de fechas efectivo
  const rangoFechas = useMemo(() => {
    if (periodoTipo === 'mes') {
      const lastDay = new Date(anio, mes, 0).getDate()
      return {
        inicio: `${anio}-${String(mes).padStart(2,'0')}-01`,
        fin: `${anio}-${String(mes).padStart(2,'0')}-${String(lastDay).padStart(2,'0')}`,
      }
    }
    return { inicio: fechaInicio, fin: fechaFin }
  }, [periodoTipo, anio, mes, fechaInicio, fechaFin])

  const cargarDatos = async () => {
    setLoading(true)
    setError(null)
    try {
      const { inicio, fin } = rangoFechas
      const finExtended = fin + 'T23:59:59'

      const [
        { data: payments, error: eP },
        { data: quickPayments, error: eQ },
        { data: sales, error: eS },
        { data: expenses, error: eE },
      ] = await Promise.all([
        supabase
          .from('payments')
          .select('id, payment_date, amount, payment_method, bank_name, student_id, notes')
          .gte('payment_date', inicio)
          .lte('payment_date', fin)
          .order('payment_date', { ascending: true }),
        supabase
          .from('quick_payments')
          .select('id, payment_date, amount, payment_method, bank_name, description')
          .gte('payment_date', inicio)
          .lte('payment_date', fin)
          .order('payment_date', { ascending: true }),
        supabase
          .from('sales')
          .select('id, created_at, total_amount, payment_method')
          .gte('created_at', inicio)
          .lte('created_at', finExtended)
          .order('created_at', { ascending: true }),
        supabase
          .from('expenses')
          .select('id, expense_date, amount, description, expense_categories(name)')
          .gte('expense_date', inicio)
          .lte('expense_date', fin)
          .order('expense_date', { ascending: true }),
      ])

      if (eP) throw eP
      if (eQ) throw eQ
      if (eS) throw eS
      if (eE) throw eE

      const lista = []
      let seq = 1

      // Pagos de mensualidad
      for (const p of (payments || [])) {
        const ctaDebe = getCtaEfectivo(p.payment_method)
        lista.push({
          n: seq++,
          fecha: p.payment_date,
          descripcion: `Mensualidad - ${p.notes || p.student_id || ''}`.trim().replace(/\s*-\s*$/, ''),
          cuenta_debe: ctaDebe,
          nombre_debe: PLAN_CUENTAS[ctaDebe],
          monto_debe: parseFloat(p.amount || 0),
          cuenta_haber: '4.1.01',
          nombre_haber: PLAN_CUENTAS['4.1.01'],
          monto_haber: parseFloat(p.amount || 0),
          tipo: 'payment',
        })
      }

      // Quick payments (clases diarias / otros)
      for (const q of (quickPayments || [])) {
        const ctaDebe = getCtaEfectivo(q.payment_method)
        lista.push({
          n: seq++,
          fecha: q.payment_date,
          descripcion: q.description || 'Clase / pago rápido',
          cuenta_debe: ctaDebe,
          nombre_debe: PLAN_CUENTAS[ctaDebe],
          monto_debe: parseFloat(q.amount || 0),
          cuenta_haber: '4.1.03',
          nombre_haber: PLAN_CUENTAS['4.1.03'],
          monto_haber: parseFloat(q.amount || 0),
          tipo: 'quick',
        })
      }

      // Ventas (tienda)
      for (const s of (sales || [])) {
        const fechaVenta = (s.created_at || '').substring(0, 10)
        const ctaDebe = getCtaEfectivo(s.payment_method)
        lista.push({
          n: seq++,
          fecha: fechaVenta,
          descripcion: 'Venta de productos',
          cuenta_debe: ctaDebe,
          nombre_debe: PLAN_CUENTAS[ctaDebe],
          monto_debe: parseFloat(s.total_amount || 0),
          cuenta_haber: '4.1.02',
          nombre_haber: PLAN_CUENTAS['4.1.02'],
          monto_haber: parseFloat(s.total_amount || 0),
          tipo: 'sale',
        })
      }

      // Gastos
      for (const e of (expenses || [])) {
        const catName = e.expense_categories?.name || ''
        const ctaDebe = getCtaGasto(catName)
        // Para gastos: si fue con transferencia → haber Bancos, si no → haber Caja
        // expenses no siempre tienen payment_method, asumimos Caja por defecto
        const ctaHaber = e.payment_method ? getCtaEfectivo(e.payment_method) : '1.1.01'
        lista.push({
          n: seq++,
          fecha: e.expense_date,
          descripcion: e.description || catName || 'Gasto',
          cuenta_debe: ctaDebe,
          nombre_debe: PLAN_CUENTAS[ctaDebe],
          monto_debe: parseFloat(e.amount || 0),
          cuenta_haber: ctaHaber,
          nombre_haber: PLAN_CUENTAS[ctaHaber],
          monto_haber: parseFloat(e.amount || 0),
          tipo: 'expense',
        })
      }

      // Ordenar por fecha
      lista.sort((a, b) => a.fecha.localeCompare(b.fecha))
      // Re-numerar
      lista.forEach((a, i) => { a.n = i + 1 })

      setAsientos(lista)
    } catch (err) {
      console.error('Error cargando datos contables:', err)
      setError(err.message || 'Error al cargar datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    cargarDatos()
  }, [rangoFechas])

  // ─── Libro Mayor ────────────────────────────────────────────────────────────
  const libroMayor = useMemo(() => {
    const cuentas = {}
    for (const a of asientos) {
      // Debe
      if (!cuentas[a.cuenta_debe]) cuentas[a.cuenta_debe] = { codigo: a.cuenta_debe, nombre: a.nombre_debe, movimientos: [] }
      cuentas[a.cuenta_debe].movimientos.push({ fecha: a.fecha, descripcion: a.descripcion, debe: a.monto_debe, haber: 0 })
      // Haber
      if (!cuentas[a.cuenta_haber]) cuentas[a.cuenta_haber] = { codigo: a.cuenta_haber, nombre: a.nombre_haber, movimientos: [] }
      cuentas[a.cuenta_haber].movimientos.push({ fecha: a.fecha, descripcion: a.descripcion, debe: 0, haber: a.monto_haber })
    }
    // Calcular saldos acumulados
    return Object.values(cuentas).sort((a, b) => a.codigo.localeCompare(b.codigo)).map(cuenta => {
      let saldo = 0
      const movs = cuenta.movimientos.sort((a, b) => a.fecha.localeCompare(b.fecha)).map(m => {
        saldo += m.debe - m.haber
        return { ...m, saldo }
      })
      const totalDebe = movs.reduce((s, m) => s + m.debe, 0)
      const totalHaber = movs.reduce((s, m) => s + m.haber, 0)
      return { ...cuenta, movimientos: movs, totalDebe, totalHaber, saldoFinal: saldo }
    })
  }, [asientos])

  // ─── Balance de Comprobación ─────────────────────────────────────────────────
  const balanceComprobacion = useMemo(() => {
    return libroMayor.map(c => ({
      codigo: c.codigo,
      nombre: c.nombre,
      totalDebe: c.totalDebe,
      totalHaber: c.totalHaber,
      saldoDeudor: c.saldoFinal > 0 ? c.saldoFinal : 0,
      saldoAcreedor: c.saldoFinal < 0 ? Math.abs(c.saldoFinal) : 0,
    }))
  }, [libroMayor])

  const totalesBalance = useMemo(() => ({
    debe: balanceComprobacion.reduce((s, c) => s + c.totalDebe, 0),
    haber: balanceComprobacion.reduce((s, c) => s + c.totalHaber, 0),
    deudor: balanceComprobacion.reduce((s, c) => s + c.saldoDeudor, 0),
    acreedor: balanceComprobacion.reduce((s, c) => s + c.saldoAcreedor, 0),
  }), [balanceComprobacion])

  // ─── Estado de Resultados ───────────────────────────────────────────────────
  const estadoResultados = useMemo(() => {
    const ingresos = libroMayor.filter(c => c.codigo.startsWith('4.'))
    const gastos = libroMayor.filter(c => c.codigo.startsWith('5.'))
    const totalIngresos = ingresos.reduce((s, c) => s + Math.abs(c.saldoFinal), 0)
    const totalGastos = gastos.reduce((s, c) => s + Math.abs(c.saldoFinal), 0)
    return { ingresos, gastos, totalIngresos, totalGastos, utilidad: totalIngresos - totalGastos }
  }, [libroMayor])

  // ─── Exportar Excel ─────────────────────────────────────────────────────────
  const exportarExcel = () => {
    const wb = XLSX.utils.book_new()
    const periodoLabel = periodoTipo === 'mes' ? getMesLabel(anio, mes) : `${rangoFechas.inicio} al ${rangoFechas.fin}`

    // Hoja 1: Libro Diario
    const diarioData = [
      [`LIBRO DIARIO - ${settings?.school_name || settings?.name || 'Studio Dancers'}`],
      [`Período: ${periodoLabel}`],
      [],
      ['N°', 'Fecha', 'Descripción', 'Cuenta Debe', 'Debe ($)', 'Cuenta Haber', 'Haber ($)'],
      ...asientos.map(a => [
        a.n,
        a.fecha,
        a.descripcion,
        `${a.cuenta_debe} - ${a.nombre_debe}`,
        parseFloat(fmt(a.monto_debe)),
        `${a.cuenta_haber} - ${a.nombre_haber}`,
        parseFloat(fmt(a.monto_haber)),
      ]),
      [],
      ['', '', 'TOTALES', '', asientos.reduce((s, a) => s + a.monto_debe, 0), '', asientos.reduce((s, a) => s + a.monto_haber, 0)],
    ]
    const wsDiario = XLSX.utils.aoa_to_sheet(diarioData)
    XLSX.utils.book_append_sheet(wb, wsDiario, 'Libro Diario')

    // Hoja 2: Libro Mayor
    const mayorData = [`LIBRO MAYOR - ${periodoLabel}`, []]
    const wsMayor = XLSX.utils.aoa_to_sheet([[`LIBRO MAYOR - ${periodoLabel}`], []])
    let rowIdx = 2
    for (const cuenta of libroMayor) {
      XLSX.utils.sheet_add_aoa(wsMayor, [
        [`${cuenta.codigo} - ${cuenta.nombre}`],
        ['Fecha', 'Descripción', 'Debe ($)', 'Haber ($)', 'Saldo ($)'],
        ...cuenta.movimientos.map(m => [m.fecha, m.descripcion, parseFloat(fmt(m.debe)), parseFloat(fmt(m.haber)), parseFloat(fmt(m.saldo))]),
        ['', 'TOTALES', parseFloat(fmt(cuenta.totalDebe)), parseFloat(fmt(cuenta.totalHaber)), parseFloat(fmt(cuenta.saldoFinal))],
        [],
      ], { origin: { r: rowIdx, c: 0 } })
      rowIdx += cuenta.movimientos.length + 4
    }
    XLSX.utils.book_append_sheet(wb, wsMayor, 'Libro Mayor')

    // Hoja 3: Balance de Comprobación
    const balData = [
      [`BALANCE DE COMPROBACIÓN - ${periodoLabel}`],
      [],
      ['Código', 'Cuenta', 'Total Debe ($)', 'Total Haber ($)', 'Saldo Deudor ($)', 'Saldo Acreedor ($)'],
      ...balanceComprobacion.map(c => [
        c.codigo, c.nombre,
        parseFloat(fmt(c.totalDebe)), parseFloat(fmt(c.totalHaber)),
        parseFloat(fmt(c.saldoDeudor)), parseFloat(fmt(c.saldoAcreedor)),
      ]),
      [],
      ['', 'TOTALES',
        parseFloat(fmt(totalesBalance.debe)), parseFloat(fmt(totalesBalance.haber)),
        parseFloat(fmt(totalesBalance.deudor)), parseFloat(fmt(totalesBalance.acreedor)),
      ],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(balData), 'Balance Comprobacion')

    // Hoja 4: Estado de Resultados
    const { ingresos, gastos, totalIngresos, totalGastos, utilidad } = estadoResultados
    const erData = [
      [`ESTADO DE RESULTADOS - ${periodoLabel}`],
      [],
      ['INGRESOS'],
      ['Código', 'Cuenta', 'Monto ($)'],
      ...ingresos.map(c => [c.codigo, c.nombre, parseFloat(fmt(Math.abs(c.saldoFinal)))]),
      ['', 'TOTAL INGRESOS', parseFloat(fmt(totalIngresos))],
      [],
      ['GASTOS'],
      ['Código', 'Cuenta', 'Monto ($)'],
      ...gastos.map(c => [c.codigo, c.nombre, parseFloat(fmt(Math.abs(c.saldoFinal)))]),
      ['', 'TOTAL GASTOS', parseFloat(fmt(totalGastos))],
      [],
      ['', utilidad >= 0 ? 'UTILIDAD DEL PERÍODO' : 'PÉRDIDA DEL PERÍODO', parseFloat(fmt(Math.abs(utilidad)))],
    ]
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(erData), 'Estado de Resultados')

    const nombreArchivo = `Contabilidad_${(settings?.school_name || settings?.name || 'StudioDancers').replace(/\s+/g, '_')}_${periodoLabel.replace(/\s+/g,'_')}.xlsx`
    XLSX.writeFile(wb, nombreArchivo)
  }

  // ─── Render ──────────────────────────────────────────────────────────────────
  const tabs = [
    { id: 'diario', label: 'Libro Diario', icon: BookOpen },
    { id: 'mayor', label: 'Libro Mayor', icon: FileText },
    { id: 'balance', label: 'Balance de Comprobación', icon: BarChart3 },
    { id: 'resultados', label: 'Estado de Resultados', icon: TrendingUp },
  ]

  const meses = [
    { v: 1, l: 'Enero' }, { v: 2, l: 'Febrero' }, { v: 3, l: 'Marzo' },
    { v: 4, l: 'Abril' }, { v: 5, l: 'Mayo' }, { v: 6, l: 'Junio' },
    { v: 7, l: 'Julio' }, { v: 8, l: 'Agosto' }, { v: 9, l: 'Septiembre' },
    { v: 10, l: 'Octubre' }, { v: 11, l: 'Noviembre' }, { v: 12, l: 'Diciembre' },
  ]

  const anios = []
  for (let y = now.getFullYear(); y >= now.getFullYear() - 4; y--) anios.push(y)

  const totalDiarioDebe = asientos.reduce((s, a) => s + a.monto_debe, 0)
  const totalDiarioHaber = asientos.reduce((s, a) => s + a.monto_haber, 0)

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl my-4 min-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#551735] text-white px-6 py-4 rounded-t-2xl flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <BookOpen size={22} />
            </div>
            <div>
              <h2 className="text-xl font-bold">Contabilidad</h2>
              {(settings?.legal_name || settings?.school_name || settings?.name) && (
                <p className="text-xs text-white/70">{settings?.legal_name || settings?.school_name || settings?.name}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={exportarExcel}
              disabled={loading || asientos.length === 0}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white px-3 py-2 rounded-xl text-sm font-medium transition-all active:scale-95"
            >
              <Download size={16} />
              Exportar Excel
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Selector de período */}
        <div className="px-6 py-4 border-b border-gray-100 bg-[#fdf5f9]">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex rounded-xl overflow-hidden border border-gray-200">
              <button
                onClick={() => setPeriodoTipo('mes')}
                className={`px-4 py-2 text-sm font-medium transition-all ${periodoTipo === 'mes' ? 'bg-[#551735] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                Mes
              </button>
              <button
                onClick={() => setPeriodoTipo('rango')}
                className={`px-4 py-2 text-sm font-medium transition-all ${periodoTipo === 'rango' ? 'bg-[#551735] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
              >
                Rango
              </button>
            </div>

            {periodoTipo === 'mes' ? (
              <>
                <select
                  value={mes}
                  onChange={e => setMes(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#551735]/30"
                >
                  {meses.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
                </select>
                <select
                  value={anio}
                  onChange={e => setAnio(parseInt(e.target.value))}
                  className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#551735]/30"
                >
                  {anios.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-500">Desde:</label>
                  <input
                    type="date"
                    value={fechaInicio}
                    onChange={e => setFechaInicio(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#551735]/30"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-gray-500">Hasta:</label>
                  <input
                    type="date"
                    value={fechaFin}
                    onChange={e => setFechaFin(e.target.value)}
                    className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#551735]/30"
                  />
                </div>
              </>
            )}

            <button
              onClick={cargarDatos}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#6b2145] hover:bg-[#551735] text-white rounded-xl text-sm font-medium transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
              Actualizar
            </button>

            {!loading && (
              <span className="text-xs text-gray-400 ml-auto">
                {asientos.length} asiento{asientos.length !== 1 ? 's' : ''} encontrado{asientos.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 border-b border-gray-100">
          <div className="flex gap-1 overflow-x-auto pb-px">
            {tabs.map(tab => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-t-xl font-medium text-sm whitespace-nowrap transition-all ${
                    activeTab === tab.id
                      ? 'bg-[#551735] text-white'
                      : 'text-gray-500 hover:text-[#551735] hover:bg-[#fdf5f9]'
                  }`}
                >
                  <Icon size={15} />
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 p-6 overflow-auto">
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-3">
                <RefreshCw size={28} className="animate-spin text-[#551735]" />
                <p className="text-gray-500 text-sm">Cargando datos contables...</p>
              </div>
            </div>
          )}

          {error && !loading && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
              <strong>Error:</strong> {error}
            </div>
          )}

          {!loading && !error && asientos.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-gray-400">
              <BookOpen size={48} className="mb-3 opacity-30" />
              <p className="text-lg font-medium">Sin movimientos</p>
              <p className="text-sm">No se encontraron transacciones en el período seleccionado.</p>
            </div>
          )}

          {!loading && !error && asientos.length > 0 && (
            <>
              {/* ── Libro Diario ── */}
              {activeTab === 'diario' && (
                <div>
                  <h3 className="text-lg font-bold text-[#551735] mb-4">Libro Diario</h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600">
                          <th className="px-3 py-3 text-left font-semibold w-10">N°</th>
                          <th className="px-3 py-3 text-left font-semibold">Fecha</th>
                          <th className="px-3 py-3 text-left font-semibold">Descripción</th>
                          <th className="px-3 py-3 text-left font-semibold">Cuenta Debe</th>
                          <th className="px-3 py-3 text-right font-semibold">Debe ($)</th>
                          <th className="px-3 py-3 text-left font-semibold">Cuenta Haber</th>
                          <th className="px-3 py-3 text-right font-semibold">Haber ($)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {asientos.map(a => (
                          <tr key={a.n} className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-2.5 text-gray-400 text-xs">{a.n}</td>
                            <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{a.fecha}</td>
                            <td className="px-3 py-2.5 text-gray-800 max-w-xs truncate" title={a.descripcion}>{a.descripcion}</td>
                            <td className="px-3 py-2.5">
                              <span className="font-mono text-xs text-[#551735] font-semibold">{a.cuenta_debe}</span>
                              <span className="text-gray-500 text-xs ml-1">{a.nombre_debe}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-green-700 font-medium">${fmt(a.monto_debe)}</td>
                            <td className="px-3 py-2.5">
                              <span className="font-mono text-xs text-[#6b2145] font-semibold">{a.cuenta_haber}</span>
                              <span className="text-gray-500 text-xs ml-1">{a.nombre_haber}</span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-blue-700 font-medium">${fmt(a.monto_haber)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 font-bold">
                          <td colSpan={4} className="px-3 py-3 text-right text-gray-700">TOTALES</td>
                          <td className="px-3 py-3 text-right font-mono text-green-800">${fmt(totalDiarioDebe)}</td>
                          <td className="px-3 py-3"></td>
                          <td className="px-3 py-3 text-right font-mono text-blue-800">${fmt(totalDiarioHaber)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Libro Mayor ── */}
              {activeTab === 'mayor' && (
                <div>
                  <h3 className="text-lg font-bold text-[#551735] mb-4">Libro Mayor</h3>
                  <div className="space-y-6">
                    {libroMayor.map(cuenta => (
                      <div key={cuenta.codigo} className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="bg-[#fdf5f9] px-4 py-3 flex items-center gap-2">
                          <span className="font-mono text-sm font-bold text-[#551735]">{cuenta.codigo}</span>
                          <span className="text-gray-700 font-semibold">{cuenta.nombre}</span>
                        </div>
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs">
                              <th className="px-3 py-2 text-left">Fecha</th>
                              <th className="px-3 py-2 text-left">Descripción</th>
                              <th className="px-3 py-2 text-right">Debe ($)</th>
                              <th className="px-3 py-2 text-right">Haber ($)</th>
                              <th className="px-3 py-2 text-right">Saldo ($)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {cuenta.movimientos.map((m, i) => (
                              <tr key={i} className="hover:bg-gray-50">
                                <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{m.fecha}</td>
                                <td className="px-3 py-2 text-gray-700 max-w-xs truncate" title={m.descripcion}>{m.descripcion}</td>
                                <td className="px-3 py-2 text-right font-mono text-green-700">{m.debe > 0 ? `$${fmt(m.debe)}` : '-'}</td>
                                <td className="px-3 py-2 text-right font-mono text-blue-700">{m.haber > 0 ? `$${fmt(m.haber)}` : '-'}</td>
                                <td className={`px-3 py-2 text-right font-mono font-medium ${m.saldo >= 0 ? 'text-gray-800' : 'text-orange-600'}`}>${fmt(Math.abs(m.saldo))}</td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="bg-gray-50 font-semibold text-sm">
                              <td colSpan={2} className="px-3 py-2.5 text-gray-600">Totales</td>
                              <td className="px-3 py-2.5 text-right font-mono text-green-800">${fmt(cuenta.totalDebe)}</td>
                              <td className="px-3 py-2.5 text-right font-mono text-blue-800">${fmt(cuenta.totalHaber)}</td>
                              <td className={`px-3 py-2.5 text-right font-mono font-bold ${cuenta.saldoFinal >= 0 ? 'text-[#551735]' : 'text-orange-600'}`}>${fmt(Math.abs(cuenta.saldoFinal))}</td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ── Balance de Comprobación ── */}
              {activeTab === 'balance' && (
                <div>
                  <h3 className="text-lg font-bold text-[#551735] mb-4">Balance de Comprobación</h3>
                  <div className="overflow-x-auto rounded-xl border border-gray-200">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-gray-600">
                          <th className="px-3 py-3 text-left font-semibold">Código</th>
                          <th className="px-3 py-3 text-left font-semibold">Cuenta</th>
                          <th className="px-3 py-3 text-right font-semibold">Total Debe ($)</th>
                          <th className="px-3 py-3 text-right font-semibold">Total Haber ($)</th>
                          <th className="px-3 py-3 text-right font-semibold">Saldo Deudor ($)</th>
                          <th className="px-3 py-3 text-right font-semibold">Saldo Acreedor ($)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {balanceComprobacion.map(c => (
                          <tr key={c.codigo} className="hover:bg-gray-50 transition-colors">
                            <td className="px-3 py-2.5 font-mono text-xs text-[#551735] font-semibold">{c.codigo}</td>
                            <td className="px-3 py-2.5 text-gray-800">{c.nombre}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-green-700">${fmt(c.totalDebe)}</td>
                            <td className="px-3 py-2.5 text-right font-mono text-blue-700">${fmt(c.totalHaber)}</td>
                            <td className="px-3 py-2.5 text-right font-mono">{c.saldoDeudor > 0 ? `$${fmt(c.saldoDeudor)}` : '-'}</td>
                            <td className="px-3 py-2.5 text-right font-mono">{c.saldoAcreedor > 0 ? `$${fmt(c.saldoAcreedor)}` : '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 font-bold text-sm">
                          <td colSpan={2} className="px-3 py-3 text-right text-gray-700">TOTALES</td>
                          <td className="px-3 py-3 text-right font-mono text-green-800">${fmt(totalesBalance.debe)}</td>
                          <td className="px-3 py-3 text-right font-mono text-blue-800">${fmt(totalesBalance.haber)}</td>
                          <td className="px-3 py-3 text-right font-mono text-gray-800">${fmt(totalesBalance.deudor)}</td>
                          <td className="px-3 py-3 text-right font-mono text-gray-800">${fmt(totalesBalance.acreedor)}</td>
                        </tr>
                        {Math.abs(totalesBalance.debe - totalesBalance.haber) < 0.01 ? (
                          <tr>
                            <td colSpan={6} className="px-3 py-2 text-center text-green-600 text-xs font-medium bg-green-50">
                              Cuadre correcto: Total Debe = Total Haber
                            </td>
                          </tr>
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-3 py-2 text-center text-orange-600 text-xs font-medium bg-orange-50">
                              Diferencia: ${fmt(Math.abs(totalesBalance.debe - totalesBalance.haber))} — Revisar asientos
                            </td>
                          </tr>
                        )}
                      </tfoot>
                    </table>
                  </div>
                </div>
              )}

              {/* ── Estado de Resultados ── */}
              {activeTab === 'resultados' && (
                <div className="max-w-2xl mx-auto">
                  <h3 className="text-lg font-bold text-[#551735] mb-1">Estado de Resultados</h3>
                  <p className="text-sm text-gray-400 mb-6">
                    {periodoTipo === 'mes' ? getMesLabel(anio, mes) : `${rangoFechas.inicio} al ${rangoFechas.fin}`}
                  </p>

                  {/* Ingresos */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
                    <div className="bg-green-50 px-4 py-3 font-semibold text-green-800 border-b border-green-100">
                      INGRESOS
                    </div>
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100">
                        {estadoResultados.ingresos.map(c => (
                          <tr key={c.codigo} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{c.codigo}</td>
                            <td className="px-4 py-2.5 text-gray-700">{c.nombre}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-medium text-green-700">${fmt(Math.abs(c.saldoFinal))}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-green-50 font-bold">
                          <td colSpan={2} className="px-4 py-3 text-green-800">TOTAL INGRESOS</td>
                          <td className="px-4 py-3 text-right font-mono text-green-800 text-base">${fmt(estadoResultados.totalIngresos)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Gastos */}
                  <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
                    <div className="bg-red-50 px-4 py-3 font-semibold text-red-800 border-b border-red-100">
                      GASTOS
                    </div>
                    <table className="w-full text-sm">
                      <tbody className="divide-y divide-gray-100">
                        {estadoResultados.gastos.map(c => (
                          <tr key={c.codigo} className="hover:bg-gray-50">
                            <td className="px-4 py-2.5 font-mono text-xs text-gray-400">{c.codigo}</td>
                            <td className="px-4 py-2.5 text-gray-700">{c.nombre}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-medium text-red-700">${fmt(Math.abs(c.saldoFinal))}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-red-50 font-bold">
                          <td colSpan={2} className="px-4 py-3 text-red-800">TOTAL GASTOS</td>
                          <td className="px-4 py-3 text-right font-mono text-red-800 text-base">${fmt(estadoResultados.totalGastos)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  {/* Utilidad/Pérdida */}
                  <div className={`rounded-xl p-5 border-2 ${estadoResultados.utilidad >= 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-600">
                          {estadoResultados.utilidad >= 0 ? 'UTILIDAD DEL PERÍODO' : 'PÉRDIDA DEL PERÍODO'}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">Ingresos - Gastos</p>
                      </div>
                      <p className={`text-3xl font-bold font-mono ${estadoResultados.utilidad >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                        {estadoResultados.utilidad < 0 && '-'}${fmt(Math.abs(estadoResultados.utilidad))}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
