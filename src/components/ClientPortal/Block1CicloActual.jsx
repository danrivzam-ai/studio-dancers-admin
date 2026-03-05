import { useMemo } from 'react'
import {
  getExpectedClassDates,
  getClassDateStatus,
  formatClassDateShort,
  getTodayEC
} from '../../lib/adultas'

const ESTADO_CONFIG = {
  presente: {
    bg: '#2A9D8F',
    border: '#1f7a6e',
    icon: '✓',
    label: 'Asististe',
    textColor: 'white'
  },
  tardia: {
    bg: '#F4A261',
    border: '#d4844b',
    icon: '⏱',
    label: 'Llegaste tarde',
    textColor: 'white'
  },
  ausente: {
    bg: '#e5e7eb',
    border: '#d1d5db',
    icon: '✕',
    label: 'No asististe',
    textColor: '#9ca3af'
  },
  futura: {
    bg: 'transparent',
    border: '#d1d5db',
    icon: '',
    label: 'Próxima clase',
    textColor: '#d1d5db',
    dashed: true
  }
}

export default function Block1CicloActual({ cicloData, loading }) {
  const today = getTodayEC()

  const { ciclo, asistencias, classDays, expectedDates, attended, classNumber } = useMemo(() => {
    if (!cicloData?.ciclo) {
      return { ciclo: null, asistencias: [], classDays: [], expectedDates: [], attended: 0, classNumber: 0 }
    }

    const c = cicloData.ciclo
    const att = cicloData.asistencias || []
    const cd = cicloData.class_days

    // Normalizar class_days (puede venir como string, array, etc.)
    let days = []
    if (Array.isArray(cd)) {
      days = cd.map(d => typeof d === 'string' ? parseInt(d, 10) : d)
    } else if (typeof cd === 'string') {
      try {
        const parsed = JSON.parse(cd)
        days = Array.isArray(parsed) ? parsed.map(d => parseInt(d, 10)) : []
      } catch {
        days = cd.replace(/[{}\[\]]/g, '').split(',').map(n => parseInt(n.trim(), 10)).filter(n => !isNaN(n))
      }
    }

    const dates = getExpectedClassDates(c.fecha_inicio, c.total_clases, days)
    const presentCount = att.filter(a => a.estado === 'presente' || a.estado === 'tardia').length

    // Clase actual = cuántas fechas esperadas han pasado o son hoy
    const passedOrToday = dates.filter(d => d <= today).length
    const classNum = Math.min(passedOrToday, c.total_clases)

    return {
      ciclo: c,
      asistencias: att,
      classDays: days,
      expectedDates: dates,
      attended: presentCount,
      classNumber: classNum
    }
  }, [cicloData, today])

  if (loading) {
    return (
      <div className="rounded-2xl p-5 animate-pulse" style={{ background: '#f3e5f5' }}>
        <div className="h-4 bg-purple-200 rounded w-1/3 mb-3" />
        <div className="h-8 bg-purple-200 rounded w-2/3 mb-2" />
        <div className="h-3 bg-purple-200 rounded w-full mb-4" />
        <div className="flex gap-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="w-8 h-8 bg-purple-200 rounded-full" />
          ))}
        </div>
      </div>
    )
  }

  if (!ciclo) {
    return (
      <div className="rounded-2xl p-5 text-center" style={{ background: '#f9f9f9', border: '1px dashed #e5e7eb' }}>
        <p className="text-sm font-medium text-gray-500">Sin ciclo activo</p>
        <p className="text-xs text-gray-400 mt-1">
          Cuando tu ciclo comience, aquí verás tu asistencia.
        </p>
      </div>
    )
  }

  const totalClases = ciclo.total_clases
  const attendedWidth = totalClases > 0 ? (attended / totalClases) * 100 : 0
  const passedWidth = totalClases > 0 ? (classNumber / totalClases) * 100 : 0

  return (
    <div
      className="rounded-2xl p-5 shadow-sm"
      style={{ background: 'linear-gradient(135deg, #f3e5f5 0%, #ede7f6 100%)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#7B2D8E' }}>
          Mi Ciclo Actual
        </p>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: '#7B2D8E', color: 'white' }}
        >
          Ciclo {ciclo.numero_ciclo}
        </span>
      </div>

      {/* Texto principal */}
      <h2 className="text-3xl font-bold mb-0.5" style={{ color: '#3a0d4a' }}>
        Clase {classNumber} de {totalClases}
      </h2>
      <p className="text-sm font-medium mb-4" style={{ color: '#7B2D8E' }}>
        Has asistido a <strong>{attended}</strong>
        {attended === 1 ? ' clase' : ' clases'}
        {classNumber > 0 && attended < classNumber && (
          <span style={{ color: '#9ca3af' }}>
            {' '}· {classNumber - attended} {classNumber - attended === 1 ? 'falta' : 'faltas'}
          </span>
        )}
      </p>

      {/* Barra de progreso */}
      <div className="mb-4">
        <div className="relative h-3 rounded-full overflow-hidden" style={{ background: '#e5e7eb' }}>
          {/* Clases que pasaron (gris = sin asistir) */}
          {passedWidth > 0 && (
            <div
              className="absolute h-full rounded-full transition-all duration-700"
              style={{ width: `${passedWidth}%`, background: '#e0d0e8' }}
            />
          )}
          {/* Clases asistidas (verde) */}
          {attendedWidth > 0 && (
            <div
              className="absolute h-full rounded-full transition-all duration-700"
              style={{ width: `${attendedWidth}%`, background: '#2A9D8F' }}
            />
          )}
        </div>
        <div className="flex justify-between text-[10px] mt-1" style={{ color: '#999' }}>
          <span style={{ color: '#2A9D8F', fontWeight: 600 }}>{attended} asistidas</span>
          <span>{totalClases} en total</span>
        </div>
      </div>

      {/* Círculos individuales por clase */}
      {expectedDates.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {expectedDates.map((dateStr, idx) => {
            const status = getClassDateStatus(dateStr, asistencias, today)
            const config = ESTADO_CONFIG[status]

            return (
              <div key={dateStr} className="flex flex-col items-center gap-0.5">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all"
                  style={{
                    background: config.bg,
                    border: `2px ${config.dashed ? 'dashed' : 'solid'} ${config.border}`,
                    color: config.textColor
                  }}
                  title={`${formatClassDateShort(dateStr)} — ${config.label}`}
                >
                  {config.icon}
                </div>
                <span className="text-[9px] font-medium leading-none text-center" style={{ color: '#999', maxWidth: '36px' }}>
                  {formatClassDateShort(dateStr)}
                </span>
              </div>
            )
          })}
        </div>
      ) : (
        // Si no hay classDays en la BD, mostrar barra simple con número de asistencias
        <div className="flex gap-2 flex-wrap">
          {[...Array(totalClases)].map((_, idx) => {
            const att = asistencias[idx]
            const status = att
              ? (att.estado === 'presente' ? 'presente' : att.estado === 'tardia' ? 'tardia' : 'ausente')
              : (idx < classNumber ? 'ausente' : 'futura')
            const config = ESTADO_CONFIG[status]
            return (
              <div
                key={idx}
                className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                style={{
                  background: config.bg,
                  border: `2px ${config.dashed ? 'dashed' : 'solid'} ${config.border}`,
                  color: config.textColor
                }}
              >
                {config.icon || (status === 'futura' ? String(idx + 1) : '')}
              </div>
            )
          })}
        </div>
      )}

      {/* Objetivo del ciclo */}
      {ciclo.objetivo_ciclo && (
        <div
          className="mt-4 px-3 py-2 rounded-xl text-xs"
          style={{ background: 'rgba(123,45,142,0.08)', color: '#5a1a6e' }}
        >
          <span className="font-semibold">Objetivo del ciclo: </span>
          {ciclo.objetivo_ciclo}
        </div>
      )}
    </div>
  )
}
