import { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { getRetos } from '../../../lib/adultas'

const CATEGORIA_CFG = {
  fuerza:            { emoji: '💪', label: 'Fuerza',            color: 'text-teal-600'   },
  flexibilidad:      { emoji: '🤸', label: 'Flexibilidad',      color: 'text-blue-600'   },
  equilibrio:        { emoji: '⚖️', label: 'Equilibrio',        color: 'text-amber-600'  },
  musicalidad:       { emoji: '🎵', label: 'Musicalidad',       color: 'text-rose-500'   },
  conciencia_corporal: { emoji: '🧘', label: 'Conciencia corporal', color: 'text-purple-600' },
}

function formatSemana(dateStr) {
  const d = new Date(dateStr + 'T12:00:00')
  const fin = new Date(d)
  fin.setDate(fin.getDate() + 6)
  const opts = { day: 'numeric', month: 'short' }
  return `${d.toLocaleDateString('es-EC', opts)} – ${fin.toLocaleDateString('es-EC', opts)}`
}

export default function TabRetos({ auth, student }) {
  const [retos, setRetos] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(null)

  useEffect(() => {
    async function load() {
      const { data } = await getRetos(auth.cedula, auth.phone4, student.id, 20)
      setRetos(data)
      setLoading(false)
    }
    load()
  }, [auth, student])

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
    </div>
  )

  const activo = retos.find(r => r.es_activo)
  const historial = retos.filter(r => !r.es_activo)

  return (
    <div className="px-4 pt-5 pb-4 max-w-lg mx-auto space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-800">Retos</h2>
        <p className="text-xs text-gray-500 mt-0.5">Un nuevo reto cada semana</p>
      </div>

      {/* Reto activo */}
      {activo ? (() => {
        const cfg = CATEGORIA_CFG[activo.categoria] || CATEGORIA_CFG.fuerza
        return (
          <div className="rounded-2xl p-5 bg-purple-50 border border-purple-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-bold text-purple-700 uppercase tracking-wide">Reto de esta semana</span>
              <span className="text-[10px] text-gray-400">{formatSemana(activo.semana_inicio)}</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-3xl">{cfg.emoji}</span>
              <div>
                <p className="font-bold text-gray-800 text-base leading-snug">{activo.titulo}</p>
                <p className="text-sm text-gray-600 mt-1.5 leading-relaxed">{activo.descripcion}</p>
                {activo.tip_extra && (
                  <div className="mt-3 bg-white/70 rounded-xl px-3 py-2">
                    <p className="text-xs text-purple-700 font-semibold mb-0.5">💡 Consejo extra</p>
                    <p className="text-xs text-gray-600">{activo.tip_extra}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      })() : (
        <div className="bg-white rounded-2xl border border-gray-100 p-5 text-center text-gray-400">
          <span className="text-3xl block mb-2">🎯</span>
          <p className="text-sm">El reto de esta semana aparecerá el lunes</p>
        </div>
      )}

      {/* Historial */}
      {historial.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Retos anteriores</p>
          <div className="space-y-2">
            {historial.map(r => {
              const cfg = CATEGORIA_CFG[r.categoria] || CATEGORIA_CFG.fuerza
              const open = expanded === r.pub_reto_id
              return (
                <div key={r.pub_reto_id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <button
                    onClick={() => setExpanded(prev => prev === r.pub_reto_id ? null : r.pub_reto_id)}
                    className="w-full flex items-center gap-3 p-3 text-left"
                  >
                    <span className="text-xl shrink-0">{cfg.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{r.titulo}</p>
                      <p className="text-[10px] text-gray-400">{formatSemana(r.semana_inicio)}</p>
                    </div>
                    {open ? <ChevronUp size={14} className="text-gray-300" /> : <ChevronDown size={14} className="text-gray-300" />}
                  </button>
                  {open && (
                    <div className="px-4 pb-3 border-t border-gray-50 pt-2 text-sm text-gray-600 leading-relaxed">
                      {r.descripcion}
                      {r.tip_extra && (
                        <p className="mt-2 text-xs text-purple-600 bg-purple-50 rounded-xl px-3 py-1.5">
                          💡 {r.tip_extra}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
