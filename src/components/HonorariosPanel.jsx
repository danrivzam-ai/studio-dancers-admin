import { useState, useEffect, useRef } from 'react'
import {
  Plus, X, ChevronDown, ChevronUp, Printer, Copy, Check, Trash2,
  DollarSign, Clock, Calendar, MessageSquare, FileText, AlertCircle
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
  useHonorarios, buildDetails, recalcDetail,
  DAY_NAMES, formatTime12, calcHorasClase
} from '../hooks/useHonorarios'

function fmtDate(dateStr) {
  if (!dateStr) return ''
  const [y, m, d] = dateStr.split('-')
  const months = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`
}

function fmtMoney(n) {
  return `$${Number(n || 0).toFixed(2)}`
}

// ── Comprobante imprimible ──────────────────────────────────────────────────
function ComprobantePrint({ periodo, instructor, onClose }) {
  const [copied, setCopied] = useState(false)

  const whatsappText = () => {
    const details = periodo.payment_details || []
    const lines = details.map(d =>
      `• ${d.dia_nombre || DAY_NAMES[d.dia_semana] || ''} (${d.horario}) → ${d.clases_efectivas} clases · ${d.horas_trabajadas} h · ${fmtMoney(d.monto)}`
    ).join('\n')
    return `🩰 *STUDIO DANCERS — Comprobante de Pago*
👩‍🏫 *Profesora:* ${instructor.name}
📅 *Período:* ${fmtDate(periodo.fecha_inicio)} al ${fmtDate(periodo.fecha_fin)}${periodo.observaciones ? `\n📝 *Obs.:* ${periodo.observaciones}` : ''}
📋 *Detalle:*
${lines}
⏱ *Total horas:* ${periodo.total_horas} h
💵 *TOTAL: ${fmtMoney(periodo.total_pagar)}*
_Confirma el recibo respondiendo con tu nombre._ ✅`
  }

  const handleCopyWA = async () => {
    await navigator.clipboard.writeText(whatsappText())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const details = periodo.payment_details || []

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-2 sm:p-4 z-[60]" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[95vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Actions header */}
        <div className="px-4 py-3 border-b bg-gray-50 flex items-center justify-between gap-2">
          <span className="text-sm font-semibold text-gray-700">Comprobante {periodo.numero_comprobante}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyWA}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-xs font-semibold transition-all active:scale-95"
            >
              {copied ? <Check size={13} /> : <MessageSquare size={13} />}
              {copied ? 'Copiado' : 'Copiar WhatsApp'}
            </button>
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#6b2145] hover:bg-[#551735] text-white rounded-xl text-xs font-semibold transition-all active:scale-95"
            >
              <Printer size={13} /> Imprimir / PDF
            </button>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors">
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable receipt */}
        <div className="overflow-y-auto flex-1 p-6 print:p-4" id="comprobante-print">
          {/* Header */}
          <div className="text-center mb-5 print:mb-4">
            <h1 className="text-xl font-bold text-[#551735] tracking-wide">STUDIO DANCERS</h1>
            <p className="text-sm text-gray-600 mt-0.5">Comprobante de Pago a Docente</p>
            <p className="text-xs text-gray-400 mt-0.5">N.° {periodo.numero_comprobante}</p>
          </div>

          {/* Instructor info */}
          <div className="bg-gray-50 rounded-xl p-3 mb-4 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Profesora:</span>
              <span className="font-semibold">{instructor.name}</span>
            </div>
            {instructor.cedula && (
              <div className="flex justify-between mt-1">
                <span className="text-gray-500">C.I.:</span>
                <span className="font-medium">{instructor.cedula}</span>
              </div>
            )}
            <div className="flex justify-between mt-1">
              <span className="text-gray-500">Período:</span>
              <span className="font-medium">{fmtDate(periodo.fecha_inicio)} — {fmtDate(periodo.fecha_fin)}</span>
            </div>
            {periodo.observaciones && (
              <div className="flex justify-between mt-1">
                <span className="text-gray-500">Obs.:</span>
                <span className="text-right ml-4 text-gray-700">{periodo.observaciones}</span>
              </div>
            )}
            <div className="flex justify-between mt-1">
              <span className="text-gray-500">Tarifa:</span>
              <span className="font-medium">{fmtMoney(periodo.tarifa_hora_snapshot)}/hora</span>
            </div>
          </div>

          {/* Detail table */}
          <table className="w-full text-xs mb-4 border-collapse">
            <thead>
              <tr className="bg-[#551735] text-white">
                <th className="text-left px-2 py-1.5 rounded-tl-lg">Día / Horario</th>
                <th className="text-center px-2 py-1.5">Clases</th>
                <th className="text-center px-2 py-1.5">Hrs/clase</th>
                <th className="text-center px-2 py-1.5">Total hrs</th>
                <th className="text-right px-2 py-1.5 rounded-tr-lg">Monto</th>
              </tr>
            </thead>
            <tbody>
              {details.map((d, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-2 py-1.5">
                    <span className="font-semibold">{d.dia_nombre || DAY_NAMES[d.dia_semana]}</span>
                    <br />
                    <span className="text-gray-500">{d.horario}</span>
                    {d.group_name && <span className="text-gray-400"> · {d.group_name}</span>}
                    {(d.canceladas > 0 || d.recuperaciones > 0) && (
                      <span className="text-xs text-orange-600 ml-1">
                        {d.canceladas > 0 && `-${d.canceladas}can`}
                        {d.recuperaciones > 0 && ` +${d.recuperaciones}rec`}
                      </span>
                    )}
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
                <td className="px-2 py-2 font-bold text-[#551735]">TOTAL</td>
                <td colSpan={2}></td>
                <td className="text-center px-2 py-2 font-bold text-[#551735]">{periodo.total_horas}h</td>
                <td className="text-right px-2 py-2 font-bold text-[#551735] text-sm">{fmtMoney(periodo.total_pagar)}</td>
              </tr>
            </tfoot>
          </table>

          {/* Signature lines */}
          <div className="mt-6 pt-4 border-t border-dashed border-gray-300 grid grid-cols-2 gap-6 text-xs text-gray-500">
            <div className="text-center">
              <div className="border-b border-gray-400 mb-1 h-8"></div>
              <p>Firma / C.I. Profesora</p>
            </div>
            <div className="text-center">
              <div className="border-b border-gray-400 mb-1 h-8"></div>
              <p>Sello Studio Dancers · Fecha</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Modal nueva liquidación ──────────────────────────────────────────────────
function LiquidacionModal({ instructor, scheduleSlots, onClose, onSaved }) {
  const today = new Date().toISOString().slice(0, 10)
  const [fechaInicio, setFechaInicio] = useState('')
  const [fechaFin, setFechaFin] = useState('')
  const [observaciones, setObservaciones] = useState('')
  const [details, setDetails] = useState([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const { createPeriodo } = useHonorarios()

  // Recalculate whenever dates change
  useEffect(() => {
    if (!fechaInicio || !fechaFin || fechaFin < fechaInicio) {
      setDetails([])
      return
    }
    const tarifa = instructor.tarifa_hora || 0
    const built = buildDetails(scheduleSlots, fechaInicio, fechaFin, tarifa)
    setDetails(built)
  }, [fechaInicio, fechaFin, instructor, scheduleSlots])

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
    setSaving(true)
    setError('')
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
        {/* Header */}
        <div className="px-5 py-4 border-b bg-[#551735] text-white flex items-center justify-between">
          <div>
            <h2 className="font-bold">Nueva Liquidación</h2>
            <p className="text-xs text-white/70 mt-0.5">{instructor.name} · {fmtMoney(instructor.tarifa_hora)}/h</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-4">
          {/* Dates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha inicio *</label>
              <input
                type="date"
                value={fechaInicio}
                onChange={e => setFechaInicio(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-base focus:ring-4 focus:ring-[#f9e8f0] focus:border-[#7e2d55] outline-none transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha fin *</label>
              <input
                type="date"
                value={fechaFin}
                min={fechaInicio}
                onChange={e => setFechaFin(e.target.value)}
                className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-base focus:ring-4 focus:ring-[#f9e8f0] focus:border-[#7e2d55] outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Observaciones <span className="text-gray-400 font-normal">(opcional)</span></label>
            <input
              type="text"
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              placeholder="Ej: incluye semana de feriados"
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-[#f9e8f0] focus:border-[#7e2d55] outline-none transition-all"
            />
          </div>

          {/* Detail table */}
          {details.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Detalle de clases — edita cancelaciones y recuperaciones</p>
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 text-gray-500">
                      <th className="text-left px-3 py-2">Día / Grupo</th>
                      <th className="text-center px-2 py-2">Prog.</th>
                      <th className="text-center px-2 py-2">−Cancel.</th>
                      <th className="text-center px-2 py-2">+Recup.</th>
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
                          {d.group_name && <p className="text-gray-400 truncate max-w-[100px]">{d.group_name}</p>}
                        </td>
                        <td className="text-center px-2 py-2 text-gray-700">{d.clases_programadas}</td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            min="0"
                            max={d.clases_programadas}
                            value={d.canceladas}
                            onChange={e => updateDetail(i, 'canceladas', e.target.value)}
                            className="w-12 text-center px-1 py-1 border border-red-200 rounded-lg text-red-700 font-semibold focus:ring-2 focus:ring-red-200 outline-none"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            type="number"
                            min="0"
                            value={d.recuperaciones}
                            onChange={e => updateDetail(i, 'recuperaciones', e.target.value)}
                            className="w-12 text-center px-1 py-1 border border-green-200 rounded-lg text-green-700 font-semibold focus:ring-2 focus:ring-green-200 outline-none"
                          />
                        </td>
                        <td className="text-center px-2 py-2 font-bold text-gray-800">{d.clases_efectivas}</td>
                        <td className="text-right px-2 py-2 font-bold text-[#551735]">{fmtMoney(d.monto)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#551735] bg-[#fdf5f9]">
                      <td colSpan={4} className="px-3 py-2 font-bold text-[#551735] text-xs">TOTAL</td>
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
              <AlertCircle size={14} />
              Esta instructora no tiene horario configurado. Agrégalo en su perfil primero.
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-xs">
              <AlertCircle size={14} /> {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 border border-gray-300 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors font-medium text-sm"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !fechaInicio || !fechaFin || details.length === 0}
            className="flex-1 py-2.5 bg-[#6b2145] hover:bg-[#551735] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-medium text-sm transition-colors flex items-center justify-center gap-1.5"
          >
            <FileText size={15} />
            {saving ? 'Guardando...' : 'Guardar y generar comprobante'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Tarjeta de instructora ────────────────────────────────────────────────────
function InstructorCard({ instructor, onNewLiquidacion }) {
  const [expanded, setExpanded] = useState(false)
  const [periodos, setPeriodos] = useState([])
  const [loadingPeriodos, setLoadingPeriodos] = useState(false)
  const [viewPeriodo, setViewPeriodo] = useState(null)
  const { fetchPeriodosByInstructor, deletePeriodo } = useHonorarios()

  const loadPeriodos = async () => {
    if (periodos.length > 0) { setExpanded(e => !e); return }
    setLoadingPeriodos(true)
    const data = await fetchPeriodosByInstructor(instructor.id)
    setPeriodos(data)
    setLoadingPeriodos(false)
    setExpanded(true)
  }

  const handleDelete = async (periodoId) => {
    if (!window.confirm('¿Eliminar esta liquidación?')) return
    await deletePeriodo(periodoId)
    setPeriodos(prev => prev.filter(p => p.id !== periodoId))
  }

  const handleNewSaved = (periodo) => {
    setPeriodos(prev => [periodo, ...prev])
    setViewPeriodo(periodo)
    onNewLiquidacion()
  }

  const [showLiquidacion, setShowLiquidacion] = useState(false)
  const [scheduleSlots, setScheduleSlots] = useState([])

  const openLiquidacion = async () => {
    const { data } = await supabase
      .from('instructor_schedule')
      .select('*')
      .eq('instructor_id', instructor.id)
      .order('day_of_week')
    setScheduleSlots(data || [])
    setShowLiquidacion(true)
  }

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {/* Card header */}
        <div className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#f9e8f0] flex items-center justify-center shrink-0">
            <span className="text-[#6b2145] font-bold text-base">{instructor.name?.[0]?.toUpperCase()}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-gray-900 truncate">{instructor.name}</p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xs text-[#6b2145] font-semibold flex items-center gap-1">
                <DollarSign size={11} />
                {instructor.tarifa_hora ? `${fmtMoney(instructor.tarifa_hora)}/h` : 'Sin tarifa'}
              </span>
              {instructor.cedula && (
                <span className="text-xs text-gray-400">C.I. {instructor.cedula}</span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={openLiquidacion}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#6b2145] hover:bg-[#551735] text-white rounded-xl text-xs font-semibold transition-all active:scale-95"
            >
              <Plus size={13} /> Nueva liquidación
            </button>
            <button
              onClick={loadPeriodos}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all"
              title="Historial"
            >
              {loadingPeriodos
                ? <Clock size={16} className="animate-spin" />
                : expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* Periodos history */}
        {expanded && (
          <div className="border-t border-gray-100">
            {periodos.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Sin liquidaciones registradas</p>
            ) : periodos.map(p => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 border-b border-gray-50 last:border-0 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-700">{p.numero_comprobante}</span>
                    <span className="text-xs text-gray-400">{fmtDate(p.fecha_inicio)} — {fmtDate(p.fecha_fin)}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="text-xs text-gray-500 flex items-center gap-0.5">
                      <Clock size={10} /> {p.total_horas}h
                    </span>
                    <span className="text-sm font-bold text-[#551735]">{fmtMoney(p.total_pagar)}</span>
                    {p.observaciones && <span className="text-xs text-gray-400 truncate">{p.observaciones}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setViewPeriodo(p)}
                    className="p-1.5 text-gray-400 hover:text-[#6b2145] hover:bg-[#fdf5f9] rounded-lg transition-all"
                    title="Ver comprobante"
                  >
                    <FileText size={14} />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                    title="Eliminar"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modals */}
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

  useEffect(() => {
    fetchInstructors()
  }, [])

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

  const totalTarifas = instructors.reduce((s, i) => s + (i.tarifa_hora || 0), 0)

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign size={20} className="text-[#6b2145]" />
          <h2 className="text-lg font-semibold text-gray-800">Honorarios Docentes</h2>
          <span className="text-xs text-gray-400">{instructors.length} instructoras activas</span>
        </div>
        <div className="text-right">
          <p className="text-xs text-gray-400">Tarifas por hora</p>
          <p className="text-sm font-bold text-[#551735]">
            {instructors.map(i => `${i.name.split(' ')[0]}: ${fmtMoney(i.tarifa_hora)}`).join(' · ')}
          </p>
        </div>
      </div>

      {/* Tip */}
      <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl text-blue-700 text-xs">
        <AlertCircle size={13} className="shrink-0 mt-0.5" />
        <span>
          Para configurar la <strong>tarifa por hora</strong> de cada instructora, ve a la pestaña <strong>Instructoras</strong> y edita su perfil.
          El horario se configura desde el mismo perfil (botón Horario).
        </span>
      </div>

      {/* Instructor cards */}
      {loading ? (
        <div className="text-center py-10 text-gray-400 text-sm">Cargando instructoras...</div>
      ) : instructors.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">No hay instructoras activas</div>
      ) : (
        <div className="space-y-3">
          {instructors.map(inst => (
            <InstructorCard
              key={inst.id}
              instructor={inst}
              onNewLiquidacion={fetchInstructors}
            />
          ))}
        </div>
      )}

      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #comprobante-print { display: block !important; position: fixed; top: 0; left: 0; width: 100%; }
        }
      `}</style>
    </div>
  )
}
