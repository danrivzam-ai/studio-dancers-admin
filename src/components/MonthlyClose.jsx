/**
 * MonthlyClose.jsx
 * Modal de cierre mensual contable.
 * Solo accesible para el rol admin.
 */
import { useState, useEffect } from 'react'
import { X, Lock, ChevronDown, ChevronUp, AlertTriangle, CheckCircle } from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import Modal from './ui/Modal'

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'
]

function fmtMoney(n) {
  return `$${parseFloat(n || 0).toFixed(2)}`
}

function periodoToLabel(periodoStr) {
  if (!periodoStr) return ''
  const [y, m] = periodoStr.split('-')
  return `${MESES[parseInt(m) - 1]} ${y}`
}

function getPrevMonths(n = 12) {
  const result = []
  const now = new Date()
  for (let i = 1; i <= n; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    result.push({ year: d.getFullYear(), month: d.getMonth() + 1 })
  }
  return result
}

// ── Tarjeta de resumen financiero ─────────────────────────────────────────────
function SummaryCard({ summary, loading }) {
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </div>
    )
  }
  if (!summary) return null

  const rows = [
    { label: 'Pagos de alumnas',  value: summary.ingresosAlumnos, sub: `${summary.paymentsCount} pagos`,  color: 'text-emerald-600' },
    { label: 'Pagos rápidos',     value: summary.ingresosRapidos, sub: `${summary.quickCount} pagos`,     color: 'text-emerald-600' },
    { label: 'Ventas tienda',     value: summary.ingresosVentas,  sub: `${summary.salesCount} ventas`,    color: 'text-emerald-600' },
    { label: 'Planes de pago',    value: summary.ingresosPlanes,  sub: `${summary.planCount} abonos`,     color: 'text-emerald-600' },
  ]

  return (
    <div className="space-y-3">
      {/* Ingresos */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
        <p className="text-xs font-semibold text-emerald-700 mb-2">📥 Ingresos del mes</p>
        <div className="space-y-1.5">
          {rows.map(r => (
            <div key={r.label} className="flex items-center justify-between text-sm">
              <span className="text-gray-600">{r.label}</span>
              <div className="text-right">
                <span className={`font-semibold ${r.color}`}>{fmtMoney(r.value)}</span>
                <span className="text-[10px] text-gray-400 ml-1.5">{r.sub}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="border-t border-emerald-200 mt-2 pt-2 flex items-center justify-between">
          <span className="text-sm font-bold text-emerald-700">Total ingresos</span>
          <span className="text-lg font-bold text-emerald-700">{fmtMoney(summary.totalIngresos)}</span>
        </div>
      </div>

      {/* Egresos */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-3">
        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-red-700">📤 Egresos del mes</p>
          <div className="text-right">
            <span className="text-lg font-bold text-red-700">{fmtMoney(summary.totalEgresos)}</span>
            <span className="text-[10px] text-gray-400 ml-1.5">{summary.expensesCount} egresos</span>
          </div>
        </div>
      </div>

      {/* Saldo neto */}
      <div className={`border rounded-xl p-3 ${summary.saldoNeto >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
        <div className="flex items-center justify-between">
          <p className={`text-sm font-bold ${summary.saldoNeto >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
            💰 Saldo neto del mes
          </p>
          <span className={`text-2xl font-bold ${summary.saldoNeto >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
            {fmtMoney(summary.saldoNeto)}
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Fila de cierre histórico ───────────────────────────────────────────────────
function CloseRow({ c, expanded, onToggle, settings }) {
  function exportPDF() {
    const doc = new jsPDF({ format: 'a5' })
    const label = periodoToLabel(c.periodo)
    const fechaCierre = new Date(c.closed_at).toLocaleDateString('es-EC', {
      day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit'
    })

    doc.setFontSize(14)
    doc.setTextColor(90, 30, 120)
    doc.text('Cierre Mensual', 14, 16)
    doc.setFontSize(10)
    doc.setTextColor(80, 80, 80)
    doc.text(`${settings?.name || 'Studio Dancers'} · ${label}`, 14, 22)
    doc.setFontSize(8)
    doc.setTextColor(150, 150, 150)
    doc.text(`Cerrado por ${c.cerrado_por_nombre || 'Admin'} el ${fechaCierre}`, 14, 27)

    autoTable(doc, {
      startY: 32,
      head: [['Concepto', 'Monto']],
      body: [
        ['Pagos de alumnas',   `$${parseFloat(c.ingresos_alumnos  || 0).toFixed(2)}`],
        ['Pagos rápidos',      `$${parseFloat(c.ingresos_rapidos  || 0).toFixed(2)}`],
        ['Ventas tienda',      `$${parseFloat(c.ingresos_ventas   || 0).toFixed(2)}`],
        ['Planes de pago',     `$${parseFloat(c.ingresos_planes   || 0).toFixed(2)}`],
        ['TOTAL INGRESOS',     `$${parseFloat(c.total_ingresos    || 0).toFixed(2)}`],
        ['Total egresos',      `$${parseFloat(c.total_egresos     || 0).toFixed(2)}`],
        ['SALDO NETO',         `$${parseFloat(c.saldo_neto        || 0).toFixed(2)}`],
      ],
      styles:     { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [90, 30, 120], textColor: 255 },
      didParseCell: (data) => {
        if (data.row.index === 4 || data.row.index === 6) {
          data.cell.styles.fontStyle = 'bold'
          data.cell.styles.fillColor = data.row.index === 6
            ? (parseFloat(c.saldo_neto) >= 0 ? [219, 234, 254] : [254, 235, 200])
            : [220, 252, 231]
        }
      }
    })

    if (c.notas) {
      const y = doc.lastAutoTable.finalY + 8
      doc.setFontSize(9)
      doc.setTextColor(80, 80, 80)
      doc.text('Notas:', 14, y)
      doc.setTextColor(120, 120, 120)
      doc.text(c.notas, 14, y + 5, { maxWidth: 130 })
    }

    doc.save(`cierre-${c.periodo}.pdf`)
  }

  const saldo = parseFloat(c.saldo_neto || 0)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <Lock size={14} className="text-purple-400 shrink-0" />
          <div className="text-left">
            <p className="text-sm font-semibold text-gray-800">{periodoToLabel(c.periodo)}</p>
            <p className="text-[11px] text-gray-400">
              Cerrado por {c.cerrado_por_nombre || 'Admin'} ·{' '}
              {new Date(c.closed_at).toLocaleDateString('es-EC')}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-sm font-bold ${saldo >= 0 ? 'text-emerald-600' : 'text-orange-600'}`}>
            {fmtMoney(saldo)}
          </span>
          {expanded ? <ChevronUp size={14} className="text-gray-400" /> : <ChevronDown size={14} className="text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-1 border-t bg-gray-50 space-y-2">
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-emerald-50 rounded-lg p-2">
              <p className="text-gray-500">Ingresos</p>
              <p className="font-bold text-emerald-700">{fmtMoney(c.total_ingresos)}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-2">
              <p className="text-gray-500">Egresos</p>
              <p className="font-bold text-red-700">{fmtMoney(c.total_egresos)}</p>
            </div>
            {c.alumnas_activas > 0 && (
              <div className="bg-purple-50 rounded-lg p-2">
                <p className="text-gray-500">Alumnas activas</p>
                <p className="font-bold text-purple-700">{c.alumnas_activas}</p>
              </div>
            )}
            {c.alumnas_mora > 0 && (
              <div className="bg-rose-50 rounded-lg p-2">
                <p className="text-gray-500">En mora</p>
                <p className="font-bold text-rose-700">{c.alumnas_mora}</p>
              </div>
            )}
          </div>
          {c.notas && (
            <p className="text-xs text-gray-500 bg-white border rounded-lg p-2 italic">
              📝 {c.notas}
            </p>
          )}
          <button
            onClick={exportPDF}
            className="w-full py-2 text-xs font-medium text-purple-700 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors"
          >
            📄 Descargar PDF
          </button>
        </div>
      )}
    </div>
  )
}

// ── Componente principal ────────────────────────────────────────────────────────
export default function MonthlyClose({
  onClose,
  closes,
  loading,
  summaryLoading,
  summary,
  fetchCloses,
  getMonthSummary,
  closeMonth,
  // Estadísticas de alumnas (del App)
  studentsCount       = 0,
  moraStudentsCount   = 0,
  inactiveStudentsCount = 0,
  settings,
  userName,
  userId,
}) {
  const prevMonths = getPrevMonths(12)

  const [selectedYear,  setSelectedYear]  = useState(prevMonths[0].year)
  const [selectedMonth, setSelectedMonth] = useState(prevMonths[0].month)
  const [notas,         setNotas]         = useState('')
  const [saving,        setSaving]        = useState(false)
  const [result,        setResult]        = useState(null)   // { ok, msg }
  const [expandedId,    setExpandedId]    = useState(null)
  const [confirm,       setConfirm]       = useState(false)

  // ¿El mes seleccionado ya está cerrado?
  const alreadyClosed = closes.some(c => {
    const [y, m] = c.periodo.split('-').map(Number)
    return y === selectedYear && m === selectedMonth
  })

  useEffect(() => {
    fetchCloses()
  }, [])

  useEffect(() => {
    setResult(null)
    setConfirm(false)
    if (!alreadyClosed) {
      getMonthSummary(selectedYear, selectedMonth)
    }
  }, [selectedYear, selectedMonth, alreadyClosed])

  async function handleClose() {
    if (!summary) return
    setSaving(true)
    setResult(null)
    try {
      const res = await closeMonth({
        year:               selectedYear,
        month:              selectedMonth,
        summaryData:        summary,
        alumnas_activas:    studentsCount,
        alumnas_mora:       moraStudentsCount,
        alumnas_inactivas:  inactiveStudentsCount,
        notas,
        userId,
        userName,
      })
      if (res.success) {
        setResult({ ok: true, msg: `Mes ${MESES[selectedMonth - 1]} ${selectedYear} cerrado correctamente.` })
        setConfirm(false)
        setNotas('')
        // Avanzar al siguiente mes previo
        if (prevMonths.length > 1) {
          setSelectedYear(prevMonths[1].year)
          setSelectedMonth(prevMonths[1].month)
        }
      } else {
        setResult({ ok: false, msg: res.error })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} ariaLabel="Cierre mensual">
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[95vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b bg-purple-700 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl">
                <Lock size={18} />
              </div>
              <div>
                <h2 className="text-base font-bold">Cierre Mensual</h2>
                <p className="text-xs text-purple-200">Solo admin · Bloquea el historial del mes</p>
              </div>
            </div>
            <button onClick={onClose} aria-label="Cerrar" className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">

          {/* Selector de mes */}
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-2">Mes a cerrar</label>
            <select
              value={`${selectedYear}-${selectedMonth}`}
              onChange={e => {
                const [y, m] = e.target.value.split('-').map(Number)
                setSelectedYear(y)
                setSelectedMonth(m)
              }}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-purple-100 focus:outline-none"
            >
              {prevMonths.map(({ year, month }) => (
                <option key={`${year}-${month}`} value={`${year}-${month}`}>
                  {MESES[month - 1]} {year}
                  {closes.some(c => {
                    const [y, m] = c.periodo.split('-').map(Number)
                    return y === year && m === month
                  }) ? ' — Cerrado' : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Mes ya cerrado */}
          {alreadyClosed && (
            <div className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
              <CheckCircle size={18} className="text-emerald-600 shrink-0" />
              <p className="text-sm text-emerald-700 font-medium">
                {MESES[selectedMonth - 1]} {selectedYear} ya fue cerrado.
              </p>
            </div>
          )}

          {/* Resumen del mes a cerrar */}
          {!alreadyClosed && (
            <>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">
                  Resumen de {MESES[selectedMonth - 1]} {selectedYear}
                </p>
                <SummaryCard summary={summary} loading={summaryLoading} />
              </div>

              {/* Estadísticas de alumnas */}
              {summary && (
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Alumnas activas', value: studentsCount,         color: 'bg-purple-50 text-purple-700' },
                    { label: 'En mora',          value: moraStudentsCount,     color: 'bg-rose-50 text-rose-700' },
                    { label: 'Inactivas',         value: inactiveStudentsCount, color: 'bg-slate-50 text-slate-600' },
                  ].map(s => (
                    <div key={s.label} className={`${s.color} rounded-xl p-2.5 text-center`}>
                      <p className="text-xl font-bold">{s.value}</p>
                      <p className="text-[10px] font-medium">{s.label}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Notas */}
              {summary && (
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Notas del cierre <span className="font-normal text-gray-400">(opcional)</span>
                  </label>
                  <textarea
                    value={notas}
                    onChange={e => setNotas(e.target.value)}
                    rows={2}
                    placeholder="Observaciones, irregularidades, acuerdos del mes..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-purple-100 focus:outline-none resize-none"
                  />
                </div>
              )}

              {/* Resultado */}
              {result && (
                <div className={`flex items-start gap-2 p-3 rounded-xl border text-sm ${
                  result.ok
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}>
                  {result.ok
                    ? <CheckCircle size={16} className="shrink-0 mt-0.5" />
                    : <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                  }
                  {result.msg}
                </div>
              )}

              {/* Confirmación + Botón */}
              {summary && !result?.ok && (
                <div className="space-y-2">
                  {!confirm ? (
                    <button
                      onClick={() => setConfirm(true)}
                      disabled={summaryLoading}
                      className="w-full py-3 bg-purple-600 text-white font-semibold text-sm rounded-xl hover:bg-purple-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <Lock size={15} />
                      Cerrar {MESES[selectedMonth - 1]} {selectedYear}
                    </button>
                  ) : (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-3">
                      <div className="flex items-start gap-2 text-sm text-amber-800">
                        <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                        <p>Esta acción es <strong>permanente</strong>. El mes quedará bloqueado y no se podrá reabrir. ¿Confirmas?</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setConfirm(false)}
                          className="flex-1 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-50"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={handleClose}
                          disabled={saving}
                          className="flex-1 py-2 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          {saving
                            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <><Lock size={13} /> Confirmar cierre</>
                          }
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Historial de cierres */}
          {closes.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">
                Historial ({closes.length} {closes.length === 1 ? 'cierre' : 'cierres'})
              </p>
              <div className="space-y-2">
                {closes.map(c => (
                  <CloseRow
                    key={c.id}
                    c={c}
                    settings={settings}
                    expanded={expandedId === c.id}
                    onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-4">
              <div className="w-5 h-5 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
