import { LogOut, Phone, MapPin, Calendar, BookOpen } from 'lucide-react'

const STUDIO_WHATSAPP = '593963741884' // TODO: reemplazar con número real
const STUDIO_DIRECCION = 'La Alborada, Guayaquil'

function formatFecha(dateStr) {
  if (!dateStr) return 'Por definir'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-EC', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

function EstadoBadge({ estado }) {
  if (!estado) return null
  const cfg = {
    activo:      { label: 'Ciclo activo',     bg: 'bg-green-100',  text: 'text-green-700'  },
    por_renovar: { label: 'Por renovar',       bg: 'bg-amber-100',  text: 'text-amber-700'  },
    vencido:     { label: 'Ciclo vencido',     bg: 'bg-red-100',    text: 'text-red-700'    },
  }[estado] || { label: estado, bg: 'bg-gray-100', text: 'text-gray-700' }
  return (
    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cfg.bg} ${cfg.text}`}>
      {cfg.label}
    </span>
  )
}

export default function TabMiCuenta({ auth, student, onLogout }) {
  // student viene del login: { id, name, course_name, payment_status,
  //   next_payment_date, cycle_start_date, classes_used, classes_per_cycle, ... }

  const cursos = Array.isArray(student)
    ? student
    : [student]

  return (
    <div className="px-4 pt-5 pb-8 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-800">Mi cuenta</h2>
        <p className="text-xs text-gray-500 mt-0.5">Información de tu inscripción</p>
      </div>

      {/* Datos de la alumna */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-50">
          <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center">
            <span className="text-purple-700 font-bold text-lg">
              {student.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()}
            </span>
          </div>
          <div>
            <p className="font-bold text-gray-800">{student.name}</p>
            <p className="text-xs text-gray-500">Alumna adulta</p>
          </div>
        </div>

        {/* Cursos */}
        {cursos.map((s, i) => (
          <div key={s.id || i} className={i > 0 ? 'mt-4 pt-4 border-t border-gray-50' : ''}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <BookOpen size={14} className="text-purple-500" />
                <p className="text-sm font-semibold text-gray-700">{s.course_name}</p>
              </div>
              <EstadoBadge estado={s.payment_status === 'paid' ? 'activo' : s.payment_status === 'pending' ? 'por_renovar' : null} />
            </div>

            <div className="space-y-1.5 ml-5">
              {s.cycle_start_date && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Calendar size={12} className="text-gray-400" />
                  <span>Inicio del ciclo: <strong>{formatFecha(s.cycle_start_date)}</strong></span>
                </div>
              )}
              {s.next_payment_date && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Calendar size={12} className="text-gray-400" />
                  <span>Renovación: <strong>{formatFecha(s.next_payment_date)}</strong></span>
                </div>
              )}
              {s.classes_per_cycle != null && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="w-3 h-3 rounded-full bg-gray-300 inline-block" />
                  <span>Clases del ciclo: <strong>{s.classes_used ?? '–'} / {s.classes_per_cycle}</strong></span>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Contacto */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contacto Studio Dancers</p>
        <a
          href={`https://wa.me/${STUDIO_WHATSAPP}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 text-sm text-gray-700 hover:text-green-600 transition-colors"
        >
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
            <Phone size={14} className="text-green-600" />
          </div>
          <span>WhatsApp Studio Dancers</span>
        </a>
        <div className="flex items-center gap-3 text-sm text-gray-600">
          <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
            <MapPin size={14} className="text-gray-500" />
          </div>
          <span>{STUDIO_DIRECCION}</span>
        </div>
      </div>

      {/* Cerrar sesión */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-gray-200 text-gray-500 text-sm hover:bg-gray-50 transition-colors"
      >
        <LogOut size={15} />
        Cerrar sesión
      </button>
    </div>
  )
}
