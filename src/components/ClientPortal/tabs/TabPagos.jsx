import { LogOut, Phone, MapPin, CheckCircle, AlertCircle, Clock } from 'lucide-react'
import UploadComprobante from '../UploadComprobante'

const STUDIO_WHATSAPP = '593963741884'  // TODO: reemplazar con número real

function formatFecha(dateStr) {
  if (!dateStr) return 'Por definir'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-EC', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

const ESTADO_CFG = {
  al_dia: {
    Icon: CheckCircle,
    color: 'text-green-500',
    bg: 'bg-green-50',
    border: 'border-green-100',
    label: 'Pago al día',
    emoji: '✅',
  },
  por_vencer: {
    Icon: Clock,
    color: 'text-amber-500',
    bg: 'bg-amber-50',
    border: 'border-amber-100',
    label: 'Pago próximo a vencer',
    emoji: '⏰',
  },
  vencido: {
    Icon: AlertCircle,
    color: 'text-red-500',
    bg: 'bg-red-50',
    border: 'border-red-100',
    label: 'Pago vencido',
    emoji: '❗',
  },
}

export default function TabPagos({ auth, student, onLogout }) {
  const { name, course_name, payment_status, next_payment_date } = student

  const sc  = ESTADO_CFG[payment_status] || ESTADO_CFG.por_vencer
  const Icon = sc.Icon

  return (
    <div className="px-4 pt-5 pb-10 max-w-lg mx-auto space-y-4">
      {/* Encabezado */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-lg font-bold text-gray-800">Estado de pago</h2>
          <p className="text-xs text-gray-500 mt-0.5">{name}</p>
        </div>
        <span className="text-3xl">🩰</span>
      </div>

      {/* Curso */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">
          Curso inscrito
        </p>
        <p className="font-semibold text-gray-800">{course_name || 'Ballet Niñas'}</p>
      </div>

      {/* Estado */}
      <div className={`rounded-2xl border ${sc.border} ${sc.bg} p-4`}>
        <div className="flex items-center gap-3">
          <Icon size={26} className={sc.color} />
          <div>
            <p className={`font-bold ${sc.color} text-base`}>{sc.label}</p>
            {next_payment_date && (
              <p className="text-xs text-gray-500 mt-0.5">
                Próximo pago: {formatFecha(next_payment_date)}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Upload comprobante */}
      <UploadComprobante auth={auth} student={student} />

      {/* Contacto */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
          ¿Tienes preguntas?
        </p>
        <a
          href={`https://wa.me/${STUDIO_WHATSAPP}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 text-green-600 hover:text-green-700 transition-colors"
        >
          <Phone size={16} />
          <span className="text-sm font-medium">Contactar al Studio por WhatsApp</span>
        </a>
        <div className="flex items-center gap-3 text-gray-400">
          <MapPin size={16} />
          <span className="text-sm">La Alborada, Guayaquil</span>
        </div>
      </div>

      {/* Cerrar sesión */}
      <button
        onClick={onLogout}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-gray-100 text-gray-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 transition-colors"
      >
        <LogOut size={15} />
        <span className="text-sm">Cerrar sesión</span>
      </button>
    </div>
  )
}
