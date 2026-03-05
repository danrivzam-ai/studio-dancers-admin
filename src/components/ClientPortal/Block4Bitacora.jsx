import { formatDateLong } from '../../lib/adultas'

function groupByCiclo(entries) {
  const groups = {}
  entries.forEach(e => {
    const key = e.numero_ciclo ?? 0
    if (!groups[key]) groups[key] = []
    groups[key].push(e)
  })
  // Sort groups descending by ciclo number
  return Object.entries(groups)
    .sort(([a], [b]) => Number(b) - Number(a))
    .map(([ciclo, items]) => ({ ciclo: Number(ciclo), items }))
}

function EntryCard({ entry }) {
  const fecha = entry.fecha_clase
    ? formatDateLong(entry.fecha_clase)
    : ''

  return (
    <div
      className="rounded-xl border p-3.5"
      style={{ background: 'white', borderColor: '#f0f0f0' }}
    >
      {fecha && (
        <p className="text-[11px] font-semibold uppercase tracking-wide mb-1" style={{ color: '#999' }}>
          {fecha}
        </p>
      )}
      {entry.titulo && (
        <p className="font-semibold text-sm text-gray-800 mb-1">{entry.titulo}</p>
      )}
      <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
        {entry.contenido}
      </p>
    </div>
  )
}

export default function Block4Bitacora({ entries, loading, compact }) {
  if (loading) {
    return (
      <div className="space-y-3 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-100 rounded-xl" />
        ))}
      </div>
    )
  }

  const list = Array.isArray(entries) ? entries : []

  if (list.length === 0) {
    return (
      <div
        className="rounded-2xl p-5 text-center"
        style={{ background: '#f9f9f9', border: '1px dashed #e5e7eb' }}
      >
        <p className="text-sm font-medium text-gray-500">Sin notas de clase aún</p>
        <p className="text-xs text-gray-400 mt-1">
          Tu profesora aún no ha publicado notas de clase para este ciclo.
        </p>
      </div>
    )
  }

  // En modo compacto (dashboard principal), mostrar solo las últimas 3 entradas sin agrupar
  if (compact) {
    return (
      <div className="space-y-2">
        {list.slice(0, 3).map(entry => (
          <EntryCard key={entry.id} entry={entry} />
        ))}
      </div>
    )
  }

  const grouped = groupByCiclo(list)

  return (
    <div className="space-y-5">
      {grouped.map(({ ciclo, items }) => (
        <div key={ciclo}>
          {/* Separador de ciclo */}
          <div className="flex items-center gap-2 mb-2">
            <div className="flex-1 h-px" style={{ background: '#e5e7eb' }} />
            <span
              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
              style={{ background: '#f3e5f5', color: '#7B2D8E' }}
            >
              Ciclo {ciclo}
            </span>
            <div className="flex-1 h-px" style={{ background: '#e5e7eb' }} />
          </div>

          <div className="space-y-2">
            {items.map(entry => (
              <EntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
