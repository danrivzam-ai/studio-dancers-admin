import { useState, useEffect } from 'react'
import {
  FileText, Check, RotateCcw, ChevronDown, ChevronUp,
  User, Clock, AlertCircle, BookOpen, MessageSquare,
} from 'lucide-react'
import { getReportesPendientes, aprobarReporte, devolverReporte } from '../lib/reportes'

const MONTHS = ['', 'ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']

function fmtDate(iso) {
  if (!iso) return ''
  const [, m, d] = iso.split('-')
  return `${parseInt(d)} ${MONTHS[parseInt(m)]}`
}

function fmtDatetime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

export default function ReportesManager() {
  const [reportes,  setReportes]  = useState([])
  const [loading,   setLoading]   = useState(true)
  const [expanded,  setExpanded]  = useState({})
  const [notaInput, setNotaInput] = useState({})   // { [id]: string }
  const [showNota,  setShowNota]  = useState({})   // { [id]: bool }
  const [saving,    setSaving]    = useState({})   // { [id]: true }

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    const { data } = await getReportesPendientes()
    setReportes(data)
    setLoading(false)
  }

  async function handleAprobar(id) {
    setSaving(s => ({ ...s, [id]: true }))
    await aprobarReporte(id)
    setSaving(s => ({ ...s, [id]: false }))
    load()
  }

  async function handleDevolver(id) {
    const nota = (notaInput[id] || '').trim()
    if (!nota) return
    setSaving(s => ({ ...s, [id]: true }))
    await devolverReporte(id, nota)
    setSaving(s => ({ ...s, [id]: false }))
    setShowNota(n => ({ ...n, [id]: false }))
    setNotaInput(n => { const copy = { ...n }; delete copy[id]; return copy })
    load()
  }

  function toggleExpanded(id) {
    setExpanded(e => ({ ...e, [id]: !e[id] }))
  }

  if (loading) return (
    <div className="flex items-center justify-center py-16">
      <div className="w-6 h-6 border-2 border-purple-300 border-t-purple-700 rounded-full animate-spin" />
    </div>
  )

  if (reportes.length === 0) return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-4">
      <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mb-3">
        <Check size={24} className="text-green-500" />
      </div>
      <p className="font-semibold text-gray-700">Sin reportes pendientes</p>
      <p className="text-sm text-gray-400 mt-1">Todos los reportes han sido revisados.</p>
    </div>
  )

  // Group by course_name + numero_ciclo
  const grouped = {}
  reportes.forEach(r => {
    const key = `${r.course_name} — Ciclo ${r.numero_ciclo}`
    if (!grouped[key]) grouped[key] = []
    grouped[key].push(r)
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-800">Reportes pendientes</h2>
        <span className="bg-orange-100 text-orange-700 text-xs font-bold px-2.5 py-1 rounded-full">
          {reportes.length}
        </span>
      </div>

      {Object.entries(grouped).map(([groupKey, items]) => (
        <div key={groupKey}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 px-1">{groupKey}</p>

          <div className="space-y-2">
            {items.map(r => (
              <div key={r.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">

                {/* Header row */}
                <button
                  onClick={() => toggleExpanded(r.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
                    <User size={14} className="text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{r.student_name}</p>
                    <p className="text-xs text-gray-400">
                      {r.asistencias_count}/{r.total_clases} clases · {fmtDate(r.fecha_inicio)}{r.fecha_fin ? ` – ${fmtDate(r.fecha_fin)}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {r.estado === 'devuelto' && (
                      <span className="bg-red-100 text-red-600 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                        Devuelto
                      </span>
                    )}
                    {expanded[r.id]
                      ? <ChevronUp size={15} className="text-gray-400" />
                      : <ChevronDown size={15} className="text-gray-400" />}
                  </div>
                </button>

                {/* Expanded content */}
                {expanded[r.id] && (
                  <div className="px-4 pb-4 space-y-4 border-t border-gray-50">

                    {/* Nota devolución previa */}
                    {r.estado === 'devuelto' && r.nota_devolucion && (
                      <div className="flex items-start gap-2 bg-red-50 rounded-xl px-3 py-2 mt-3">
                        <AlertCircle size={13} className="text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wide">Nota anterior</p>
                          <p className="text-xs text-red-700 mt-0.5">{r.nota_devolucion}</p>
                        </div>
                      </div>
                    )}

                    {/* Resumen contenido */}
                    <div className="mt-3">
                      <div className="flex items-center gap-1.5 mb-1">
                        <BookOpen size={12} className="text-gray-400" />
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Resumen del contenido</p>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl px-3 py-2">
                        {r.resumen_contenido || <span className="text-gray-400 italic">Sin resumen</span>}
                      </p>
                    </div>

                    {/* Observación profesora */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <MessageSquare size={12} className="text-gray-400" />
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">
                          Observación de {r.instructor_name || 'la instructora'}
                        </p>
                      </div>
                      <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 rounded-xl px-3 py-2">
                        {r.observacion_profesora || <span className="text-gray-400 italic">Sin observación</span>}
                      </p>
                    </div>

                    {/* Próximo ciclo */}
                    {r.proximo_ciclo_texto && (
                      <div>
                        <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide mb-1">Próximo ciclo</p>
                        <p className="text-sm text-gray-600 italic bg-purple-50 rounded-xl px-3 py-2">
                          {r.proximo_ciclo_texto}
                        </p>
                      </div>
                    )}

                    {/* Fecha generado */}
                    <div className="flex items-center gap-1.5 text-gray-400">
                      <Clock size={11} />
                      <p className="text-[10px]">Generado {fmtDatetime(r.fecha_generado)}</p>
                    </div>

                    {/* Nota de devolución (formulario) */}
                    {showNota[r.id] && (
                      <div className="space-y-2">
                        <textarea
                          rows={2}
                          value={notaInput[r.id] || ''}
                          onChange={e => setNotaInput(n => ({ ...n, [r.id]: e.target.value }))}
                          placeholder="Indica qué debe corregir la instructora…"
                          className="w-full border border-red-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => setShowNota(n => ({ ...n, [r.id]: false }))}
                            className="flex-1 py-2 rounded-xl border border-gray-200 text-sm text-gray-600 font-medium"
                          >
                            Cancelar
                          </button>
                          <button
                            onClick={() => handleDevolver(r.id)}
                            disabled={saving[r.id] || !notaInput[r.id]?.trim()}
                            className="flex-1 py-2 rounded-xl bg-red-500 text-white text-sm font-semibold disabled:opacity-50"
                          >
                            {saving[r.id] ? 'Enviando…' : 'Enviar devolución'}
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Action buttons */}
                    {!showNota[r.id] && (
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowNota(n => ({ ...n, [r.id]: true }))}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-red-200 text-red-600 text-sm font-medium hover:bg-red-50 transition-colors"
                        >
                          <RotateCcw size={14} />
                          Devolver
                        </button>
                        <button
                          onClick={() => handleAprobar(r.id)}
                          disabled={saving[r.id]}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold disabled:opacity-50 hover:bg-green-600 transition-colors"
                        >
                          <Check size={14} />
                          {saving[r.id] ? 'Aprobando…' : 'Aprobar'}
                        </button>
                      </div>
                    )}

                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
