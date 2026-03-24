import { useState, useEffect } from 'react'
import {
  Plus, X, ChevronDown, ChevronUp, Download, Check, Trash2,
  DollarSign, Clock, MessageSquare, FileText, AlertCircle, Layers
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { supabase } from '../lib/supabase'
import {
  useHonorarios, buildDetails, recalcDetail, DAY_NAMES
} from '../hooks/useHonorarios'

function fmtDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`
}
function fmtMoney(n) { return `$${Number(n || 0).toFixed(2)}` }

// ── Genera y descarga PDF con jsPDF ─────────────────────────────────────────
function downloadPDF(blocks) {
  // blocks = [{ periodo, instructorName, instructorCedula }]
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const PX = 85  // color morado Studio Dancers R
  const PG = 23
  const PB = 53
  let y = 12

  blocks.forEach((block, idx) => {
    const { periodo, instructorName, instructorCedula } = block
    const details = periodo.payment_details || []

    // Línea de corte entre comprobantes
    if (idx > 0) {
      doc.setDrawColor(200, 200, 200)
      doc.setLineDashPattern([1.5, 1.5], 0)
      doc.line(10, y, 200, y)
      doc.setFontSize(7)
      doc.setTextColor(190, 190, 190)
      doc.text('✂', 105, y + 2.5, { align: 'center' })
      doc.setLineDashPattern([], 0)
      y += 6
    }

    // Encabezado
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.setTextColor(PX, PG, PB)
    doc.text('STUDIO DANCERS', 105, y + 5, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(120, 120, 120)
    doc.text('Comprobante de Pago a Docente', 105, y + 10, { align: 'center' })
    y += 13

    // Info en dos líneas compactas
    doc.setFontSize(8.5)
    doc.setTextColor(50, 50, 50)
    doc.setFont('helvetica', 'bold')
    doc.text(instructorName, 10, y)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 100, 100)
    const infoRight = [
      instructorCedula ? `C.I. ${instructorCedula}` : '',
      `N.° ${periodo.numero_comprobante || ''}`,
      `${fmtMoney(periodo.tarifa_hora_snapshot)}/hora`,
    ].filter(Boolean).join('   ·   ')
    doc.text(infoRight, 200, y, { align: 'right' })
    y += 5

    doc.setFontSize(8)
    doc.setTextColor(80, 80, 80)
    const periodoText = `Período: ${fmtDate(periodo.fecha_inicio)} — ${fmtDate(periodo.fecha_fin)}${periodo.observaciones ? `   ·   Obs.: ${periodo.observaciones}` : ''}`
    doc.text(periodoText, 10, y)
    y += 4

    // Tabla
    autoTable(doc, {
      startY: y,
      head: [['Día / Horario / Grupo', 'Clases', 'Hrs/cl.', 'Total h', 'Monto']],
      body: details.map(d => [
        [d.dia_nombre || DAY_NAMES[d.dia_semana] || '', ' · ', d.horario || '', d.group_name ? ` · ${d.group_name}` : '', (d.canceladas > 0 || d.recuperaciones > 0) ? ` (${d.canceladas > 0 ? `-${d.canceladas}can` : ''}${d.recuperaciones > 0 ? ` +${d.recuperaciones}rec` : ''})` : ''].join(''),
        d.clases_efectivas,
        `${d.horas_clase}h`,
        `${d.horas_trabajadas}h`,
        fmtMoney(d.monto),
      ]),
      foot: [['TOTAL', '', '', `${periodo.total_horas}h`, fmtMoney(periodo.total_pagar)]],
      headStyles: { fillColor: [PX, PG, PB], textColor: 255, fontSize: 8, fontStyle: 'bold', cellPadding: 2.5 },
      footStyles: { fillColor: [253, 240, 245], textColor: [PX, PG, PB], fontStyle: 'bold', fontSize: 9, cellPadding: 2.5 },
      bodyStyles: { fontSize: 8, cellPadding: 2 },
      alternateRowStyles: { fillColor: [250, 250, 250] },
      columnStyles: {
        0: { cellWidth: 98 },
        1: { halign: 'center', cellWidth: 16 },
        2: { halign: 'center', cellWidth: 18 },
        3: { halign: 'center', cellWidth: 18 },
        4: { halign: 'right', cellWidth: 28 },
      },
      margin: { left: 10, right: 10 },
      showFoot: 'lastPage',
    })

    y = doc.lastAutoTable.finalY + 6

    // Líneas de firma
    doc.setDrawColor(170, 170, 170)
    doc.line(10, y + 14, 85, y + 14)
    doc.line(115, y + 14, 200, y + 14)
    doc.setFontSize(7)
    doc.setTextColor(160, 160, 160)
    doc.text('Firma / C.I. Profesora', 47, y + 18, { align: 'center' })
    doc.text('Sello Studio Dancers · Fecha', 157, y + 18, { align: 'center' })
    y += 24
  })

  const fileName = blocks.length === 1
    ? `Comprobante ${blocks[0].periodo.numero_comprobante} - ${blocks[0].instructorName}.pdf`
    : `Comprobantes Studio Dancers.pdf`
  doc.save(fileName)
}

// ── WhatsApp text ────────────────────────────────────────────────────────────
function buildWhatsApp(periodo, instructorName) {
  const details = periodo.payment_details || []
  const lines = details.map(d =>
    `• ${d.dia_nombre || DAY_NAMES[d.dia_semana] || ''} (${d.horario}) → ${d.clases_efectivas} clases · ${d.horas_trabajadas} h · ${fmtMoney(d.monto)}`
  ).join('\n')
  return `🩰 *STUDIO DANCERS — Comprobante de Pago*
👩‍🏫 *Profesora:* ${instructorName}
📅 *Período:* ${fmtDate(periodo.fecha_inicio)} al ${fmtDate(periodo.fecha_fin)}${periodo.observaciones ? `\n📝 *Obs.:* ${periodo.observaciones}` : ''}
📋 *Detalle:*
${lines}
⏱ *Total horas:* ${periodo.total_horas} h
💵 *TOTAL: ${fmtMoney(periodo.total_pagar)}*
_Confirma el recibo respondiendo con tu nombre._ ✅`
}

// ── Comprobante vista ────────────────────────────────────────────────────────
function ComprobantePrint({ periodo, instructor, onClose }) {
  const [copied, setCopied] = useState(false)
  const details = periodo.payment_details || []

  const handleDownload = () => {
    downloadPDF([{ periodo, instructorName: instructor.name, instructorCedula: instructor.cedula }])
  }

  const handleCopyWA = async () => {
    await navigator.clipboard.writeText(buildWhatsApp(periodo, instructor.name))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-2 sm:p-4 z-[60]" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-700">Comprobante {periodo.numero_comprobante}</span>
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={handleCopyWA}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold transition-all active:scale-95">
              {copied ? <Check size={13} /> : <MessageSquare size={13} />}
              {copied ? 'Copiado' : 'WhatsApp'}
            </button>
            <button onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6b2145] hover:bg-[#551735] text-white rounded-xl text-xs font-semibold transition-all active:scale-95">
              <Download size={13} /> Descargar PDF
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="overflow-y-auto flex-1 p-5">
          <div className="text-center mb-4">
            <h2 className="text-lg font-bold text-[#551735] tracking-wide">STUDIO DANCERS</h2>
            <p className="text-sm text-gray-500">Comprobante de Pago a Docente</p>
            <p className="text-xs text-gray-400">N.° {periodo.numero_comprobante}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm space-y-1">
            <div className="flex justify-between"><span className="text-gray-500">Profesora:</span><span className="font-semibold">{instructor.name}</span></div>
            {instructor.cedula && <div className="flex justify-between"><span className="text-gray-500">C.I.:</span><span>{instructor.cedula}</span></div>}
            <div className="flex justify-between"><span className="text-gray-500">Período:</span><span className="font-medium">{fmtDate(periodo.fecha_inicio)} — {fmtDate(periodo.fecha_fin)}</span></div>
            {periodo.observaciones && <div className="flex justify-between"><span className="text-gray-500">Obs.:</span><span className="text-gray-700">{periodo.observaciones}</span></div>}
            <div className="flex justify-between"><span className="text-gray-500">Tarifa:</span><span>{fmtMoney(periodo.tarifa_hora_snapshot)}/hora</span></div>
          </div>
          <table className="w-full text-xs border-collapse mb-4">
            <thead>
              <tr className="bg-[#551735] text-white">
                <th className="text-left px-2 py-1.5">Día / Horario</th>
                <th className="text-center px-2 py-1.5">Clases</th>
                <th className="text-center px-2 py-1.5">Hrs/cl.</th>
                <th className="text-center px-2 py-1.5">Total h</th>
                <th className="text-right px-2 py-1.5">Monto</th>
              </tr>
            </thead>
            <tbody>
              {details.map((d, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-2 py-1.5">
                    <span className="font-semibold">{d.dia_nombre || DAY_NAMES[d.dia_semana]}</span>
                    <br/><span className="text-gray-400">{d.horario}</span>
                    {d.group_name && <><br/><span className="text-gray-400">{d.group_name}</span></>}
                  </td>
                  <td className="text-center px-2 py-1.5 font-medium">{d.clases_efectivas}</td>
                  <td className="text-center px-2 py-1.5">{d.horas_clase}h</td>
                  <td className="text-center px-2 py-1.5">{d.horas_trabajadas}h</td>
                  <td className="text-right px-2 py-1.5 font-semibold">{fmtMoney(d.monto)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#551735] bg-[#fdf5f9]">
                <td colSpan={3} className="px-2 py-2 font-bold text-[#551735]">TOTAL</td>
                <td className="text-center px-2 py-2 font-bold text-[#551735]">{periodo.total_horas}h</td>
                <td className="text-right px-2 py-2 font-bold text-[#551735]">{fmtMoney(periodo.total_pagar)}</td>
              </tr>
            </tfoot>
          </table>
          <div className="grid grid-cols-2 gap-6 mt-4 pt-3 border-t border-dashed border-gray-300 text-xs text-gray-400 text-center">
            <div><div className="h-8 border-b border-gray-400 mb-1"></div>Firma / C.I. Profesora</div>
            <div><div className="h-8 border-b border-gray-400 mb-1"></div>Sello Studio Dancers · Fecha</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal hoja combinada ─────────────────────────────────────────────────────
function MultiPrintModal({ instructors, onClose }) {
  const [selected, setSelected] = useState({}) // { periodoId: { periodo, instructor } }
  const [periodosByInst, setPeriodosByInst] = useState({})
  const [loading, setLoading] = useState(true)
  const { fetchPeriodosByInstructor } = useHonorarios()

  useEffect(() => {
    const load = async () => {
      const map = {}
      for (const inst of instructors) {
        const data = await fetchPeriodosByInstructor(inst.id)
        map[inst.id] = { instructor: inst, periodos: data.slice(0, 5) }
      }
      setPeriodosByInst(map)
      setLoading(false)
    }
    load()
  }, [])

  const toggleSelect = (periodoId, periodo, instructor) => {
    setSelected(prev => {
      const next = { ...prev }
      if (next[periodoId]) delete next[periodoId]
      else next[periodoId] = { periodo, instructor }
      return next
    })
  }

  const handleDownload = () => {
    const blocks = Object.values(selected).map(({ periodo, instructor }) => ({
      periodo, instructorName: instructor.name, instructorCedula: instructor.cedula
    }))
    if (blocks.length === 0) return
    downloadPDF(blocks)
  }

  const selectedCount = Object.keys(selected).length

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-[60]" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b bg-[#551735] text-white flex items-center justify-between">
          <div>
            <h2 className="font-bold flex items-center gap-2"><Layers size={16}/> Hoja combinada</h2>
            <p className="text-xs text-white/70 mt-0.5">Selecciona los comprobantes a imprimir juntos</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl"><X size={18}/></button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {loading ? (
            <p className="text-center text-gray-400 text-sm py-6">Cargando...</p>
          ) : Object.values(periodosByInst).map(({ instructor, periodos }) => (
            <div key={instructor.id}>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">{instructor.name}</p>
              {periodos.length === 0 ? (
                <p className="text-xs text-gray-400 pl-2">Sin liquidaciones</p>
              ) : periodos.map(p => {
                const isSelected = !!selected[p.id]
                return (
                  <button
                    key={p.id}
                    onClick={() => toggleSelect(p.id, p, instructor)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 mb-1.5 text-left transition-all ${
                      isSelected
                        ? 'border-[#6b2145] bg-[#fdf5f9]'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-all ${
                      isSelected ? 'border-[#6b2145] bg-[#6b2145]' : 'border-gray-300'
                    }`}>
                      {isSelected && <Check size={11} className="text-white"/>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-xs font-bold text-gray-700">{p.numero_comprobante}</span>
                      <span className="text-xs text-gray-400 ml-2">{fmtDate(p.fecha_inicio)} — {fmtDate(p.fecha_fin)}</span>
                    </div>
                    <span className="text-sm font-bold text-[#551735] shrink-0">{fmtMoney(p.total_pagar)}</span>
                  </button>
                )
              })}
            </div>
          ))}
        </div>

        <div className="p-4 border-t bg-gray-50 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-100 font-medium text-sm">
            Cancelar
          </button>
          <button
            onClick={handleDownload}
            disabled={selectedCount === 0}
            className="flex-1 py-2.5 bg-[#6b2145] hover:bg-[#551735] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download size={15}/>
            Descargar PDF {selectedCount > 0 ? `(${selectedCount})` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Modal nueva liquidación ───────────────────────────────────────────────────
function LiquidacionModal({ instructor, scheduleSlots, onClose, onSaved }) {
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [details, setDetails] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { createPeriodo } = useHonorarios()

  useEffect(() => {
    if (!fechaInicio || !fechaFin || fechaFin < fechaInicio) { setDetails([]); return }
    setDetails(buildDetails(scheduleSlots, fechaInicio, fechaFin, instructor.tarifa_hora || 0))
  }, [fechaInicio, fechaFin])

  const updateDetail = (idx, field, value) => {
    setDetails(prev => {
      const updated = [...prev]
      const d = { ...updated[idx], [field]: Math.max(0, parseInt(value) || 0) }
      updated[idx] = recalcDetail(d, instructor.tarifa_hora || 0)
      return updated
    })
  }

  const totalHoras = details.reduce((s, d) => s + d.horas_trabajadas, 0)
  const totalPagar = details.reduce((s, d) => s + d.monto, 0)

  const handleSave = async () => {
    if (!fechaInicio || !fechaFin) { setError('Selecciona el período'); return }
    if (details.length === 0) { setError('No hay horario configurado para esta instructora'); return }
    setSaving(true); setError('')
    try {
      const periodo = await createPeriodo({ instructor, fechaInicio, fechaFin, observaciones, details })
      onSaved(periodo)
    } catch (err) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-[55]" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[95vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="px-5 py-4 border-b bg-[#551735] text-white flex items-center justify-between">
          <div>
            <h2 className="font-bold">Nueva Liquidación</h2>
            <p className="text-xs text-white/70 mt-0.5">{instructor.name} · {fmtMoney(instructor.tarifa_hora)}/h</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl"><X size={18}/></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha inicio *</label>
              <input type="date" value={fechaInicio} onChange={e => setFechaInicio(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-base focus:ring-4 focus:ring-[#f9e8f0] focus:border-[#7e2d55] outline-none transition-all"/>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha fin *</label>
              <input type="date" value={fechaFin} min={fechaInicio} onChange={e => setFechaFin(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-base focus:ring-4 focus:ring-[#f9e8f0] focus:border-[#7e2d55] outline-none transition-all"/>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Observaciones <span className="font-normal text-gray-400">(opcional)</span></label>
            <input type="text" value={observaciones} onChange={e => setObservaciones(e.target.value)}
              placeholder="Ej: incluye semana de feriados"
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-[#f9e8f0] focus:border-[#7e2d55] outline-none transition-all"/>
          </div>

          {details.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Detalle — edita canceladas o recuperaciones si aplica</p>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500">
                      <th className="text-left px-3 py-2">Día</th>
                      <th className="text-center px-2 py-2">Prog.</th>
                      <th className="text-center px-2 py-2 text-red-500">−Can.</th>
                      <th className="text-center px-2 py-2 text-green-600">+Rec.</th>
                      <th className="text-center px-2 py-2">Efect.</th>
                      <th className="text-right px-2 py-2">Monto</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.map((d, i) => (
                      <tr key={i} className="border-t border-gray-100">
                        <td className="px-3 py-2">
                          <p className="font-semibold text-gray-800">{d.dia_nombre}</p>
                          <p className="text-gray-400">{d.horario}</p>
                        </td>
                        <td className="text-center px-2 py-2 text-gray-600">{d.clases_programadas}</td>
                        <td className="px-1 py-1.5">
                          <input type="number" min="0" max={d.clases_programadas} value={d.canceladas}
                            onChange={e => updateDetail(i, 'canceladas', e.target.value)}
                            className="w-12 text-center px-1 py-1 border border-red-200 rounded-lg text-red-700 font-semibold focus:ring-2 focus:ring-red-200 outline-none"/>
                        </td>
                        <td className="px-1 py-1.5">
                          <input type="number" min="0" value={d.recuperaciones}
                            onChange={e => updateDetail(i, 'recuperaciones', e.target.value)}
                            className="w-12 text-center px-1 py-1 border border-green-200 rounded-lg text-green-700 font-semibold focus:ring-2 focus:ring-green-200 outline-none"/>
                        </td>
                        <td className="text-center px-2 py-2 font-bold text-gray-800">{d.clases_efectivas}</td>
                        <td className="text-right px-2 py-2 font-bold text-[#551735]">{fmtMoney(d.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#551735] bg-[#fdf5f9]">
                      <td colSpan={4} className="px-3 py-2 font-bold text-[#551735]">TOTAL</td>
                      <td className="text-center px-2 py-2 font-bold text-[#551735]">{totalHoras.toFixed(1)}h</td>
                      <td className="text-right px-2 py-2 font-bold text-[#551735]">{fmtMoney(totalPagar)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {fechaInicio && fechaFin && fechaFin >= fechaInicio && details.length === 0 && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-xs">
              <AlertCircle size={14}/>
              Esta instructora no tiene horario. Agrégalo en su perfil primero.
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
              <AlertCircle size={14}/> {error}
            </div>
          )}
        </div>

        <div className="p-4 border-t bg-gray-50 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-100 font-medium text-sm">
            Cancelar
          </button>
          <button onClick={handleSave}
            disabled={saving || !fechaInicio || !fechaFin || details.length === 0}
            className="flex-1 py-2.5 bg-[#6b2145] hover:bg-[#551735] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm flex items-center justify-center gap-1.5">
            <FileText size={15}/>
            {saving ? 'Guardando...' : 'Guardar y ver comprobante'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta de instructora ────────────────────────────────────────────────────
function InstructorCard({ instructor }) {
  const [expanded, setExpanded] = useState(false)
  const [periodos, setPeriodos] = useState([])
  const [loadingPeriodos, setLoadingPeriodos] = useState(false)
  const [viewPeriodo, setViewPeriodo] = useState(null)
  const [showLiquidacion, setShowLiquidacion] = useState(false)
  const [scheduleSlots, setScheduleSlots] = useState([])
  const { fetchPeriodosByInstructor, deletePeriodo } = useHonorarios()

  const loadPeriodos = async () => {
    if (periodos.length > 0 || loadingPeriodos) { setExpanded(e => !e); return }
    setLoadingPeriodos(true)
    const data = await fetchPeriodosByInstructor(instructor.id)
    setPeriodos(data)
    setLoadingPeriodos(false)
    setExpanded(true)
  }

  const openLiquidacion = async () => {
    const { data } = await supabase
      .from('instructor_schedule')
      .select('*')
      .eq('instructor_id', instructor.id)
      .order('day_of_week')
    setScheduleSlots(data || [])
    setShowLiquidacion(true)
  }

  const handleNewSaved = (periodo) => {
    setPeriodos(prev => [periodo, ...prev])
    setExpanded(true)
    setViewPeriodo(periodo)
  }

  const handleDelete = async (periodoId) => {
    if (!window.confirm('¿Eliminar esta liquidación? Esta acción no se puede deshacer.')) return
    await deletePeriodo(periodoId)
    setPeriodos(prev => prev.filter(p => p.id !== periodoId))
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#f9e8f0] flex items-center justify-center shrink-0">
            <span className="text-[#6b2145] font-bold text-base">{instructor.name?.[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 truncate">{instructor.name}</p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-[#6b2145] font-semibold flex items-center gap-1">
                <DollarSign size={11}/>
                {instructor.tarifa_hora ? `${fmtMoney(instructor.tarifa_hora)}/h` : <span className="text-amber-600">Sin tarifa — edita su perfil</span>}
              </span>
              {instructor.cedula && <span className="text-xs text-gray-400">C.I. {instructor.cedula}</span>}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={openLiquidacion}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#6b2145] hover:bg-[#551735] text-white rounded-xl text-xs font-semibold transition-all active:scale-95">
              <Plus size={13}/> Nueva liquidación
            </button>
            <button onClick={loadPeriodos}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
              title="Ver historial">
              {loadingPeriodos
                ? <Clock size={16} className="animate-spin"/>
                : expanded ? <ChevronUp size={16}/> : <ChevronDown size={16}/>}
            </button>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-gray-100">
            {periodos.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Sin liquidaciones registradas</p>
            ) : periodos.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-gray-700">{p.numero_comprobante}</span>
                    <span className="text-xs text-gray-400">{fmtDate(p.fecha_inicio)} — {fmtDate(p.fecha_fin)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-500 flex items-center gap-0.5"><Clock size={10}/> {p.total_horas}h</span>
                    <span className="text-sm font-bold text-[#551735]">{fmtMoney(p.total_pagar)}</span>
                    {p.observaciones && <span className="text-xs text-gray-400 truncate">{p.observaciones}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => setViewPeriodo(p)}
                    className="p-1.5 text-gray-400 hover:text-[#6b2145] hover:bg-[#fdf5f9] rounded-lg transition-all" title="Ver comprobante">
                    <FileText size={14}/>
                  </button>
                  <button onClick={() => handleDelete(p.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all" title="Eliminar">
                    <Trash2 size={14}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showLiquidacion && (
        <LiquidacionModal
          instructor={instructor}
          scheduleSlots={scheduleSlots}
          onClose={() => setShowLiquidacion(false)}
          onSaved={(p) => { setShowLiquidacion(false); handleNewSaved(p) }}
        />
      )}

      {viewPeriodo && (
        <ComprobantePrint
          periodo={viewPeriodo}
          instructor={instructor}
          onClose={() => setViewPeriodo(null)}
        />
      )}
    </>
  )
}

// ── Panel principal ───────────────────────────────────────────────────────────
export default function HonorariosPanel() {
  const [instructors, setInstructors] = useState([])
  const [loading, setLoading] = useState(true)
  const [showMultiPrint, setShowMultiPrint] = useState(false)

  useEffect(() => { fetchInstructors() }, [])

  const fetchInstructors = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('instructors')
      .select('id, name, cedula, tarifa_hora, active')
      .eq('active', true)
      .order('name')
    setInstructors(data || [])
    setLoading(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign size={20} className="text-[#6b2145]"/>
          <h2 className="text-lg font-semibold text-gray-800">Honorarios Docentes</h2>
          <span className="text-xs text-gray-400">{instructors.length} instructoras activas</span>
        </div>
        <button
          onClick={() => setShowMultiPrint(true)}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-[#fdf5f9] hover:border-[#c98daa] hover:text-[#551735] transition-all text-xs font-medium"
        >
          <Layers size={14}/> Hoja combinada
        </button>
      </div>

      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-xs">
        <AlertCircle size={13} className="shrink-0 mt-0.5"/>
        <span>
          Configura la <strong>tarifa/hora</strong> en <strong>Instructoras → Editar perfil</strong>.
          El horario se gestiona desde el mismo perfil con el botón <strong>Horario</strong>.
        </span>
      </div>

      {loading ? (
        <p className="text-center text-gray-400 text-sm py-10">Cargando...</p>
      ) : instructors.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-10">No hay instructoras activas</p>
      ) : (
        <div className="space-y-3">
          {instructors.map(inst => <InstructorCard key={inst.id} instructor={inst}/>)}
        </div>
      )}

      {showMultiPrint && (
        <MultiPrintModal instructors={instructors} onClose={() => setShowMultiPrint(false)}/>
      )}
    </div>
  )
}
