/**
 * CobranzaReport.jsx
 * Reporte exportable de cobranza: gracia, vencidas, suspendidas, inactivas.
 * Exporta a Excel (.xlsx) y PDF.
 * Regla de contacto: menores → representante | adultos → pagador o alumna
 */
import { useState, useMemo } from 'react'
import { X, Download, FileText, MessageCircle } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { getDaysUntilDue, getPaymentStatus } from '../lib/dateUtils'
import { openWhatsApp, buildReminderMessage, getContactInfo } from '../lib/whatsapp'

// ── helpers ──────────────────────────────────────────────────────────────────

function formatDateShort(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-EC', {
    day: '2-digit', month: '2-digit', year: '2-digit'
  })
}

const STATUS_ORDER  = ['mora', 'overdue', 'grace', 'upcoming', 'due_today', 'urgent']
const STATUS_LABELS = {
  mora:      '🚫 Suspendida',
  overdue:   '🔴 Vencida',
  grace:     '🟡 En gracia',
  upcoming:  '🟠 Próxima',
  due_today: '🔴 Vence hoy',
  urgent:    '🟠 Vence pronto',
}
const STATUS_BG = {
  mora:      'bg-rose-50 border-rose-200',
  overdue:   'bg-red-50 border-red-200',
  grace:     'bg-amber-50 border-amber-200',
  upcoming:  'bg-yellow-50 border-yellow-200',
  due_today: 'bg-red-50 border-red-200',
  urgent:    'bg-orange-50 border-orange-200',
}
const STATUS_BADGE = {
  mora:      'bg-rose-100 text-rose-700',
  overdue:   'bg-red-100 text-red-700',
  grace:     'bg-amber-100 text-amber-700',
  upcoming:  'bg-yellow-100 text-yellow-700',
  due_today: 'bg-red-100 text-red-700',
  urgent:    'bg-orange-100 text-orange-700',
}

// ── componente ────────────────────────────────────────────────────────────────

export default function CobranzaReport({
  students,
  courses,
  settings,
  graceDays = 5,
  moraDays  = 20,
  autoInactiveDays = 60,
  onClose,
  getCourseById,
  enrichCourse,
}) {
  const [filterStatus, setFilterStatus] = useState('all')
  const [exporting, setExporting] = useState(false)

  // Construir lista de cobranza
  const cobranzaList = useMemo(() => {
    return students
      .filter(s => {
        const course = enrichCourse(getCourseById(s.course_id))
        if (!course) return false
        const pt = course.priceType || course.price_type
        return pt === 'mes' || pt === 'paquete'
      })
      .map(s => {
        const course = enrichCourse(getCourseById(s.course_id))
        const status = getPaymentStatus(s, course, autoInactiveDays, graceDays, moraDays)
        const days   = getDaysUntilDue(s.next_payment_date)
        const { contactName, contactPhone, contactRelation } = getContactInfo(s)
        return {
          student: s,
          course,
          status,
          days,
          contactName,
          contactPhone,
          contactRelation,
          amount: parseFloat(s.monthly_fee || 0),
        }
      })
      .filter(row => STATUS_ORDER.includes(row.status.status))
      .sort((a, b) => {
        const oa = STATUS_ORDER.indexOf(a.status.status)
        const ob = STATUS_ORDER.indexOf(b.status.status)
        if (oa !== ob) return oa - ob
        return a.days - b.days  // más vencidas primero
      })
  }, [students, graceDays, moraDays, autoInactiveDays])

  const filtered = filterStatus === 'all'
    ? cobranzaList
    : cobranzaList.filter(r => r.status.status === filterStatus)

  const totals = useMemo(() => ({
    mora:    cobranzaList.filter(r => r.status.status === 'mora').length,
    overdue: cobranzaList.filter(r => r.status.status === 'overdue').length,
    grace:   cobranzaList.filter(r => r.status.status === 'grace').length,
    upcoming: cobranzaList.filter(r => ['upcoming','due_today','urgent'].includes(r.status.status)).length,
    totalAmount: cobranzaList.reduce((s, r) => s + r.amount, 0),
  }), [cobranzaList])

  // ── Exportar Excel ──────────────────────────────────────────────────────────
  function exportExcel() {
    setExporting(true)
    try {
      const today = new Date().toLocaleDateString('es-EC')
      const rows = filtered.map((r, i) => ({
        '#': i + 1,
        'Alumna':         r.student.name,
        'Contacto':       r.contactName,
        'Relación':       r.contactRelation,
        'Teléfono':       r.contactPhone || '—',
        'Curso':          r.course?.name || '—',
        'Estado':         STATUS_LABELS[r.status.status] || r.status.label,
        'Días':           r.days < 0 ? Math.abs(r.days) : `En ${r.days}d`,
        'Monto ($)':      r.amount.toFixed(2),
        'Próx. venc.':    formatDateShort(r.student.next_payment_date),
      }))
      const ws = XLSX.utils.json_to_sheet(rows)
      // Ancho de columnas
      ws['!cols'] = [
        { wch: 4 }, { wch: 26 }, { wch: 22 }, { wch: 14 },
        { wch: 14 }, { wch: 22 }, { wch: 18 }, { wch: 9 },
        { wch: 10 }, { wch: 12 }
      ]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, 'Cobranza')
      XLSX.writeFile(wb, `reporte-cobranza-${today.replace(/\//g, '-')}.xlsx`)
    } finally {
      setExporting(false)
    }
  }

  // ── Exportar PDF ────────────────────────────────────────────────────────────
  function exportPDF() {
    setExporting(true)
    try {
      const doc = new jsPDF({ orientation: 'landscape', format: 'a4' })
      const today = new Date().toLocaleDateString('es-EC', { day: '2-digit', month: 'long', year: 'numeric' })

      doc.setFontSize(16)
      doc.setTextColor(90, 30, 120)
      doc.text('Reporte de Cobranza', 14, 16)
      doc.setFontSize(9)
      doc.setTextColor(120, 120, 120)
      doc.text(`${settings?.name || 'Studio Dancers'} · ${today} · ${filtered.length} registro${filtered.length !== 1 ? 's' : ''}`, 14, 22)

      autoTable(doc, {
        startY: 27,
        head: [['#', 'Alumna', 'Contacto', 'Teléfono', 'Curso', 'Estado', 'Días', 'Monto']],
        body: filtered.map((r, i) => [
          i + 1,
          r.student.name,
          `${r.contactName}${r.contactRelation !== 'Alumna' ? `\n(${r.contactRelation})` : ''}`,
          r.contactPhone || '—',
          r.course?.name || '—',
          STATUS_LABELS[r.status.status] || r.status.label,
          r.days < 0 ? `${Math.abs(r.days)}d atrás` : `En ${r.days}d`,
          `$${r.amount.toFixed(2)}`,
        ]),
        styles:     { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [90, 30, 120], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 245, 255] },
        columnStyles: {
          0: { cellWidth: 8 },
          1: { cellWidth: 40 },
          2: { cellWidth: 38 },
          3: { cellWidth: 28 },
          4: { cellWidth: 38 },
          5: { cellWidth: 28 },
          6: { cellWidth: 18 },
          7: { cellWidth: 18 },
        },
      })

      const today2 = new Date().toLocaleDateString('es-EC').replace(/\//g, '-')
      doc.save(`reporte-cobranza-${today2}.pdf`)
    } finally {
      setExporting(false)
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-3 sm:p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-purple-700 to-purple-900 text-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">📋 Reporte de Cobranza</h2>
              <p className="text-xs text-purple-200 mt-0.5">
                {cobranzaList.length} alumna{cobranzaList.length !== 1 ? 's' : ''} con cobro pendiente o próximo
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
              <X size={20} />
            </button>
          </div>

          {/* Resumen de totales */}
          <div className="grid grid-cols-4 gap-2 mt-3">
            {[
              { label: '🚫 Suspendidas', value: totals.mora,    color: 'bg-rose-500/30' },
              { label: '🔴 Vencidas',    value: totals.overdue, color: 'bg-red-500/30' },
              { label: '🟡 En gracia',   value: totals.grace,   color: 'bg-amber-400/30' },
              { label: '🟠 Próximas',    value: totals.upcoming,color: 'bg-orange-400/30' },
            ].map(t => (
              <div key={t.label} className={`${t.color} rounded-xl px-3 py-2 text-center`}>
                <p className="text-xl font-bold">{t.value}</p>
                <p className="text-[10px] text-purple-100">{t.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Filtros + Exportar */}
        <div className="p-3 border-b bg-gray-50 flex flex-wrap items-center gap-2 flex-shrink-0">
          <div className="flex gap-1.5 flex-wrap flex-1">
            {[
              { v: 'all',     l: 'Todas' },
              { v: 'mora',    l: '🚫 Suspendidas' },
              { v: 'overdue', l: '🔴 Vencidas' },
              { v: 'grace',   l: '🟡 En gracia' },
              { v: 'upcoming',l: '🟠 Próximas' },
            ].map(f => (
              <button
                key={f.v}
                onClick={() => setFilterStatus(f.v)}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  filterStatus === f.v
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-white border border-gray-200 text-gray-600 hover:border-purple-300'
                }`}
              >
                {f.l}
                {f.v !== 'all' && (
                  <span className="ml-1.5 text-[10px] font-bold">
                    {f.v === 'upcoming'
                      ? totals.upcoming
                      : totals[f.v] || 0}
                  </span>
                )}
              </button>
            ))}
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              onClick={exportExcel}
              disabled={exporting || filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              <Download size={13} /> Excel
            </button>
            <button
              onClick={exportPDF}
              disabled={exporting || filtered.length === 0}
              className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              <FileText size={13} /> PDF
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <p className="text-base font-medium">Sin registros para este filtro</p>
              <p className="text-xs mt-1">¡Todas las alumnas al día! 🎉</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b sticky top-0 z-10">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 w-8">#</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Alumna</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden sm:table-cell">Contacto</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 hidden md:table-cell">Curso</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Estado</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">Monto</th>
                  <th className="px-3 py-3 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filtered.map((row, i) => (
                  <tr key={row.student.id} className={`border-l-4 ${STATUS_BG[row.status.status] || ''} border`}>
                    <td className="px-4 py-3 text-xs text-gray-400 font-mono">{i + 1}</td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-800 text-sm">{row.student.name}</p>
                      <p className="text-xs text-gray-400 md:hidden">{row.course?.name || '—'}</p>
                      {row.status.status === 'mora' && (
                        <span className="inline-block mt-0.5 text-[10px] font-semibold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-full">
                          🚫 No puede asistir
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <p className="text-sm font-medium text-gray-700">{row.contactName}</p>
                      <p className="text-xs text-gray-400">{row.contactRelation} · {row.contactPhone || 'Sin tel.'}</p>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <p className="text-sm text-gray-600">{row.course?.name || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${STATUS_BADGE[row.status.status] || 'bg-gray-100 text-gray-600'}`}>
                        {STATUS_LABELS[row.status.status] || row.status.label}
                      </span>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {row.days < 0 ? `${Math.abs(row.days)}d atrás` : row.days === 0 ? 'Hoy' : `En ${row.days}d`}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-bold text-gray-800">${row.amount.toFixed(2)}</p>
                    </td>
                    <td className="px-3 py-3">
                      {row.contactPhone && (
                        <button
                          onClick={() => openWhatsApp(
                            row.contactPhone,
                            buildReminderMessage(row.student, row.course?.name || 'N/A', row.days, settings, graceDays, moraDays)
                          )}
                          className="p-1.5 text-green-500 hover:bg-green-100 rounded-xl transition-colors"
                          title={`Enviar WA a ${row.contactRelation}`}
                        >
                          <MessageCircle size={14} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              {filtered.length > 0 && (
                <tfoot className="border-t bg-gray-50 sticky bottom-0">
                  <tr>
                    <td colSpan={5} className="px-4 py-2.5 text-xs text-gray-500 font-medium">
                      {filtered.length} registro{filtered.length !== 1 ? 's' : ''}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-gray-800">
                      ${filtered.reduce((s, r) => s + r.amount, 0).toFixed(2)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
