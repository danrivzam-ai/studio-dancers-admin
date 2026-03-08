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
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'border-emerald-400',
    label: 'Pago al día',
  },
  por_vencer: {
    Icon: Clock,
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'border-amber-400',
    label: 'Pago próximo a vencer',
  },
  vencido: {
    Icon: AlertCircle,
    color: 'text-red-600',
    bg: 'bg-red-50',
    border: 'border-red-400',
    label: 'Pago vencido',
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
          <p className="text-xs text-gray-400 mt-0.5">Tu información de cobro</p>
        </div>
        <span className="text-3xl">🩰</span>
      </div>

      {/* Curso + Estado en una tarjeta */}
      <div className={`rounded-2xl border-t-4 ${sc.border} bg-white shadow-sm overflow-hidden`}>
        <div className="p-4 border-b border-gray-50">
          <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Curso inscrito</p>
          <p className="font-semibold text-gray-800">{course_name || 'Ballet Niñas'}</p>
        </div>
        <div className={`p-4 ${sc.bg}`}>
          <div className="flex items-center gap-3">
            <Icon size={24} className={sc.color} />
            <div>
              <p className={`font-bold ${sc.color}`}>{sc.label}</p>
              {next_payment_date && (
                <p className="text-xs text-gray-500 mt-0.5">
                  Próximo pago: {formatFecha(next_payment_date)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Upload comprobante */}
      <UploadComprobante auth={auth} student={student} />

      {/* Contacto */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">
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
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-100 text-red-400 hover:text-red-600 hover:bg-red-50 active:scale-95 transition-all"
      >
        <LogOut size={15} />
        <span className="text-sm font-medium">Cerrar sesión</span>
      </button>
    </div>
  )
}
