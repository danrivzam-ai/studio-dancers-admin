import { useState } from 'react'
import { Lightbulb, ChevronDown, ChevronUp } from 'lucide-react'

export default function Block5Tips({ tips, loading }) {
  const [showAll, setShowAll] = useState(false)

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-24 bg-yellow-50 rounded-2xl" />
      </div>
    )
  }

  const list = Array.isArray(tips) ? tips : []
  if (list.length === 0) return null

  const latest = list[0]
  const rest = list.slice(1)

  return (
    <div className="space-y-2">
      {/* Tip principal */}
      <div
        className="rounded-2xl p-4 shadow-sm"
        style={{
          background: 'linear-gradient(135deg, #fff8e1 0%, #fffde7 100%)',
          border: '1.5px solid #E9C46A44'
        }}
      >
        <div className="flex items-center gap-2 mb-2">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
            style={{ background: '#E9C46A' }}
          >
            <Lightbulb size={14} style={{ color: 'white' }} />
          </div>
          <p className="text-xs font-bold uppercase tracking-wide" style={{ color: '#b8860b' }}>
            Tip de la semana
          </p>
        </div>
        {latest.titulo && (
          <p className="font-semibold text-sm text-gray-800 mb-1">{latest.titulo}</p>
        )}
        <p className="text-sm text-gray-600 leading-relaxed">{latest.contenido}</p>
      </div>

      {/* Historial de tips */}
      {rest.length > 0 && (
        <div>
          <button
            onClick={() => setShowAll(s => !s)}
            className="flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors"
            style={{ color: '#7B2D8E', background: '#f3e5f5' }}
          >
            {showAll ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            {showAll ? 'Ocultar' : `Ver todos los tips (${rest.length + 1})`}
          </button>

          {showAll && (
            <div className="mt-2 space-y-2">
              {rest.map(tip => (
                <div
                  key={tip.id}
                  className="rounded-xl p-3.5 border"
                  style={{ background: 'white', borderColor: '#f0f0f0' }}
                >
                  {tip.titulo && (
                    <p className="font-semibold text-sm text-gray-700 mb-1">{tip.titulo}</p>
                  )}
                  <p className="text-sm text-gray-600 leading-relaxed">{tip.contenido}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
