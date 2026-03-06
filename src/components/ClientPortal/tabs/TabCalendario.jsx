import { useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { getCourseById } from '../../../lib/courses'

const DIAS_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

// Retorna array de celdas para el mes (null = celda vacía antes del día 1)
function buildMonthCells(year, month) {
  const firstDow = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const cells = []
  for (let i = 0; i < firstDow; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, dow: new Date(year, month, d).getDay() })
  }
  return cells
}

export default function TabCalendario({ student }) {
  const now = new Date()
  const [year, setYear]   = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth())

  const course    = getCourseById(student?.course_id)
  const classDays = Array.isArray(course?.classDays)
    ? course.classDays.map(d => typeof d === 'string' ? parseInt(d, 10) : d)
    : []

  const cells = buildMonthCells(year, month)

  const isToday = (day) =>
    day === now.getDate() && month === now.getMonth() && year === now.getFullYear()

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="px-4 pt-6 pb-8 max-w-lg mx-auto">
      {/* Título */}
      <div className="mb-5">
        <h2 className="text-lg font-bold text-gray-800">Calendario</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          {course ? course.schedule : 'Días de clase del mes'}
        </p>
      </div>

      {/* Tarjeta del calendario */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
        {/* Navegación de mes */}
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={prevMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <ChevronLeft size={18} className="text-gray-600" />
          </button>
          <span className="font-semibold text-gray-800">
            {MESES[month]} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 rounded-lg hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        </div>

        {/* Encabezados de día */}
        <div className="grid grid-cols-7 mb-1">
          {DIAS_SEMANA.map((d, i) => (
            <div key={i} className="text-center text-[11px] font-semibold text-gray-400 py-1">
              {d}
            </div>
          ))}
        </div>

        {/* Celdas */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((cell, i) => {
            if (!cell) return <div key={i} />
            const today    = isToday(cell.day)
            const classDay = classDays.includes(cell.dow)
            return (
              <div key={i} className="flex items-center justify-center py-0.5">
                <div
                  className={[
                    'w-8 h-8 flex items-center justify-center rounded-full text-sm leading-none',
                    today
                      ? 'bg-purple-600 text-white font-bold shadow-sm'
                      : classDay
                        ? 'bg-purple-100 text-purple-700 font-semibold'
                        : 'text-gray-600',
                  ].join(' ')}
                >
                  {cell.day}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Leyenda */}
      <div className="mt-3 flex items-center gap-5 px-1">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-purple-600 shrink-0" />
          <span className="text-xs text-gray-500">Hoy</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-purple-100 shrink-0" />
          <span className="text-xs text-gray-500">Día de clase</span>
        </div>
      </div>

      {/* Info del curso */}
      {course && (
        <div className="mt-4 rounded-xl bg-purple-50 border border-purple-100 p-4">
          <p className="text-xs font-semibold text-purple-700 mb-0.5">{course.name}</p>
          <p className="text-xs text-purple-600">{course.schedule}</p>
        </div>
      )}
    </div>
  )
}
