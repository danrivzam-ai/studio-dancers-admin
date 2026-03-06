import { LogOut, CreditCard, CalendarCheck, Phone } from 'lucide-react'

const STUDIO_WHATSAPP = '593963741884'  // TODO: reemplazar con número real

function formatFecha(dateStr) {
  if (!dateStr) return 'Por definir'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-EC', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

const ESTADO_PAGO = {
  al_dia:     { label: 'Al día ✓',    bg: 'bg-green-100', text: 'text-green-700' },
  por_vencer: { label: 'Por renovar', bg: 'bg-amber-100', text: 'text-amber-700' },
  vencido:    { label: 'Vencido',     bg: 'bg-red-100',   text: 'text-red-700'   },
}

export default function TabReportesNinas({ auth, student, onLogout }) {
  const {
    name,
    course_name,
    payment_status,
    next_payment_date,
    classes_used,
    classes_per_cycle,
    enrollment_date,
  } = student

  const ps = ESTADO_PAGO[payment_status] || ESTADO_PAGO.por_vencer

  const initials = (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  return (
    <div className="px-4 pt-5 pb-10 max-w-lg mx-auto space-y-4">
      {/* Título */}
      <div>
        <h2 className="text-lg font-bold text-gray-800">Reportes</h2>
        <p className="text-xs text-gray-500 mt-0.5">Resumen de inscripción</p>
      </div>

      {/* Perfil */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-50">
          <div className="w-11 h-11 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
            <span className="text-purple-700 font-bold">{initials}</span>
          </div>
          <div>
            <p className="font-bold text-gray-800">{name}</p>
            <p className="text-xs text-gray-500 mt-0.5">{course_name || 'Ballet Niñas'}</p>
          </div>
        </div>

        {/* Estado de pago */}
        <div className="flex items-center justify-between py-2.5">
          <div className="flex items-center gap-2 text-gray-600">
            <CreditCard size={15} className="text-gray-400" />
            <span className="text-sm">Estado de pago</span>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${ps.bg} ${ps.text}`}>
            {ps.label}
          </span>
        </div>

        {next_payment_date && (
          <div className="flex items-center justify-between py-2.5 border-t border-gray-50">
            <div className="flex items-center gap-2 text-gray-600">
              <CalendarCheck size={15} className="text-gray-400" />
              <span className="text-sm">Próximo pago</span>
            </div>
            <span className="text-sm font-semibold text-gray-800">
              {formatFecha(next_payment_date)}
            </span>
          </div>
        )}

        {enrollment_date && (
          <div className="flex items-center justify-between py-2.5 border-t border-gray-50">
            <span className="text-sm text-gray-600">Inscrita desde</span>
            <span className="text-sm font-semibold text-gray-800">
              {formatFecha(enrollment_date)}
            </span>
          </div>
        )}
      </div>

      {/* Clases del ciclo (si aplica) */}
      {classes_per_cycle > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-semibold text-gray-700">Clases del ciclo</p>
            <span className="text-xs text-gray-500">
              {classes_used || 0} / {classes_per_cycle}
            </span>
          </div>
          <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-purple-400 to-purple-600"
              style={{ width: `${Math.min(100, Math.round(((classes_used || 0) / classes_per_cycle) * 100))}%` }}
            />
          </div>
        </div>
      )}

      {/* Contacto */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
          Contacto
        </p>
        <a
          href={`https://wa.me/${STUDIO_WHATSAPP}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 text-green-600 hover:text-green-700 transition-colors"
        >
          <Phone size={16} />
          <span className="text-sm font-medium">Studio Dancers WhatsApp</span>
        </a>
      </div>

      {/* Cerrar sesión */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
      >
        <LogOut size={15} />
        <span className="text-sm">Cerrar sesión</span>
      </button>
    </div>
  )
}
