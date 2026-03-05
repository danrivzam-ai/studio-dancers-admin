import { formatFirstDate } from '../../lib/adultas'

export default function Block2Constancia({ data, loading }) {
  if (loading) {
    return (
      <div className="rounded-2xl p-5 animate-pulse" style={{ background: '#f0fdf9' }}>
        <div className="h-3 bg-green-200 rounded w-1/3 mb-3" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-16 bg-green-100 rounded-xl" />
          <div className="h-16 bg-green-100 rounded-xl" />
        </div>
      </div>
    )
  }

  if (!data) return null

  const { total_clases, primera_asistencia, racha_ciclos } = data

  // Si no hay datos aún, no mostrar el bloque
  if (!total_clases && !racha_ciclos) return null

  return (
    <div className="rounded-2xl p-5 shadow-sm" style={{ background: 'linear-gradient(135deg, #e8f5e9 0%, #f0fdf4 100%)' }}>
      <p className="text-xs font-semibold uppercase tracking-wide mb-3" style={{ color: '#2A9D8F' }}>
        Mi Constancia
      </p>

      <div className="grid grid-cols-2 gap-3">
        {/* Total clases */}
        <div
          className="rounded-xl p-3.5 text-center"
          style={{ background: 'white', boxShadow: '0 1px 4px rgba(42,157,143,0.1)' }}
        >
          <p className="text-3xl font-black" style={{ color: '#2A9D8F' }}>
            {total_clases}
          </p>
          <p className="text-xs font-semibold text-gray-600 mt-0.5">
            clases en total
          </p>
          {primera_asistencia && (
            <p className="text-[10px] text-gray-400 mt-1">
              Desde {formatFirstDate(primera_asistencia)}
            </p>
          )}
        </div>

        {/* Racha */}
        <div
          className="rounded-xl p-3.5 text-center"
          style={{
            background: racha_ciclos > 0
              ? 'linear-gradient(135deg, #E9C46A22 0%, #E9C46A11 100%)'
              : 'white',
            boxShadow: '0 1px 4px rgba(42,157,143,0.1)'
          }}
        >
          {racha_ciclos > 0 ? (
            <>
              <p className="text-3xl font-black" style={{ color: '#E9C46A' }}>
                🔥 {racha_ciclos}
              </p>
              <p className="text-xs font-semibold text-gray-600 mt-0.5">
                {racha_ciclos === 1 ? 'ciclo seguido' : 'ciclos seguidos'}
              </p>
              <p className="text-[10px] text-gray-400 mt-1">con buena asistencia</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-black text-gray-300">⭐</p>
              <p className="text-xs text-gray-400 mt-1 leading-tight">
                Comienza tu racha de constancia en este ciclo
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
