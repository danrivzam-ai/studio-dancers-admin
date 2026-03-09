import { useState, useEffect } from 'react'
import { LogOut, Calendar, Clock, Music2 } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const DAY_NAMES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

const DAY_PILL = [
  '',
  'bg-purple-100 text-purple-700 border-purple-200',
  'bg-blue-100 text-blue-700 border-blue-200',
  'bg-green-100 text-green-700 border-green-200',
  'bg-orange-100 text-orange-700 border-orange-200',
  'bg-pink-100 text-pink-700 border-pink-200',
  'bg-teal-100 text-teal-700 border-teal-200',
  'bg-yellow-100 text-yellow-700 border-yellow-200',
]

export default function InstructoraDashboard({ instructor, onLogout }) {
  const firstName = instructor.name.split(' ')[0]

  const [schedule, setSchedule] = useState([])
  const [loading, setLoading] = useState(true)

  // Día actual: 1=Lunes … 7=Domingo
  const todayDow = (() => {
    const d = new Date().getDay() // 0=Dom, 1=Lun …
    return d === 0 ? 7 : d
  })()

  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        const { data } = await supabase
          .from('instructor_schedule')
          .select('*')
          .eq('instructor_id', instructor.id)
          .order('day_of_week')
          .order('time_start')
        setSchedule(data || [])
      } catch {
        // tabla puede no existir aún — no romper la app
      } finally {
        setLoading(false)
      }
    }
    fetchSchedule()
  }, [instructor.id])

  // Agrupar slots por día
  const byDay = schedule.reduce((acc, slot) => {
    if (!acc[slot.day_of_week]) acc[slot.day_of_week] = []
    acc[slot.day_of_week].push(slot)
    return acc
  }, {})
  const days = Object.keys(byDay).map(Number).sort((a, b) => a - b)

  const totalClases = schedule.length

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #f5f3ff 0%, #fdf2f8 100%)'
    }}>
      {/* Header */}
      <header className="bg-white border-b border-purple-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0"
              style={{ background: 'linear-gradient(135deg, #9333ea, #be185d)' }}
            >
              {instructor.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{instructor.name}</p>
              <p className="text-xs text-purple-500">Instructora</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors px-3 py-2 rounded-xl hover:bg-red-50"
          >
            <LogOut size={15} />
            Salir
          </button>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-2xl mx-auto px-4 py-6 space-y-5">

        {/* Bienvenida */}
        <div className="rounded-2xl p-6 text-white" style={{
          background: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 60%, #be185d 100%)'
        }}>
          <p className="text-purple-200 text-sm mb-1">¡Bienvenida de vuelta!</p>
          <h1 className="text-2xl font-bold mb-1">{firstName} 🎉</h1>
          {!loading && (
            <p className="text-purple-200 text-sm">
              {totalClases > 0
                ? `${totalClases} ${totalClases === 1 ? 'clase' : 'clases'} distribuidas en ${days.length} ${days.length === 1 ? 'día' : 'días'} a la semana`
                : 'Tu administrador configurará tu horario pronto'}
            </p>
          )}
        </div>

        {/* Horario semanal */}
        <div>
          <h2 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
            <Calendar size={16} className="text-purple-500" />
            Mi horario semanal
          </h2>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="w-7 h-7 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
            </div>

          ) : days.length === 0 ? (
            <div className="bg-white rounded-2xl border border-purple-100 p-8 text-center space-y-3">
              <div className="flex justify-center">
                <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center">
                  <Music2 size={26} className="text-purple-400" />
                </div>
              </div>
              <p className="text-gray-600 font-medium text-sm">Aún no tienes clases asignadas</p>
              <p className="text-gray-400 text-xs max-w-xs mx-auto">
                Tu administrador configurará tu horario personalizado muy pronto.
              </p>
            </div>

          ) : (
            <div className="space-y-3">
              {days.map(dow => {
                const slots = byDay[dow]
                const isToday = dow === todayDow

                return (
                  <div
                    key={dow}
                    className={`bg-white rounded-2xl border p-4 space-y-3 transition-shadow ${
                      isToday
                        ? 'border-purple-300 shadow-md shadow-purple-100'
                        : 'border-purple-100'
                    }`}
                  >
                    {/* Cabecera del día */}
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full border ${DAY_PILL[dow]}`}>
                        {DAY_NAMES[dow]}
                      </span>
                      {isToday && (
                        <span className="text-xs text-purple-600 font-semibold bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                          Hoy
                        </span>
                      )}
                      <span className="ml-auto text-xs text-gray-400">
                        {slots.length} {slots.length === 1 ? 'clase' : 'clases'}
                      </span>
                    </div>

                    {/* Bloques de clase */}
                    <div className="space-y-2">
                      {slots.map(slot => (
                        <div
                          key={slot.id}
                          className="flex items-start gap-3 pl-3 border-l-2 border-purple-200"
                        >
                          {/* Hora */}
                          <div className="flex items-center gap-1 text-xs text-gray-400 shrink-0 pt-0.5 min-w-[80px]">
                            <Clock size={11} />
                            <span className="font-mono">
                              {slot.time_start.substring(0, 5)} – {slot.time_end.substring(0, 5)}
                            </span>
                          </div>

                          {/* Info */}
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-800 leading-tight">
                              {slot.group_name}
                            </p>
                            {slot.notes && (
                              <p className="text-xs text-gray-400 mt-0.5">{slot.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
