import { useState, useRef } from 'react'
import { LogOut, CreditCard, CalendarCheck, Phone, Camera } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../Toast'

const STUDIO_WHATSAPP = '593963741884'

async function compressAvatar(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 400
        let w = img.width, h = img.height
        if (w > h) { if (w > MAX) { h = Math.round(h * MAX / w); w = MAX } }
        else { if (h > MAX) { w = Math.round(w * MAX / h); h = MAX } }
        const canvas = document.createElement('canvas')
        canvas.width = w; canvas.height = h
        canvas.getContext('2d').drawImage(img, 0, 0, w, h)
        canvas.toBlob(resolve, 'image/jpeg', 0.75)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

function formatFecha(dateStr) {
  if (!dateStr) return 'Por definir'
  return new Date(dateStr + 'T12:00:00').toLocaleDateString('es-EC', {
    day: 'numeric', month: 'long', year: 'numeric'
  })
}

// DB values: 'paid' | 'pending' | 'partial' | 'overdue'
function normPS(ps) {
  if (ps === 'paid')    return 'al_dia'
  if (ps === 'overdue') return 'vencido'
  return 'por_vencer'
}

const ESTADO_PAGO = {
  al_dia:     { label: 'Al día ✓',    bg: 'bg-emerald-100', text: 'text-emerald-700', bar: 'border-t-4 border-emerald-400' },
  por_vencer: { label: 'Por renovar', bg: 'bg-amber-100',   text: 'text-amber-700',   bar: 'border-t-4 border-amber-400'   },
  vencido:    { label: 'Vencido',     bg: 'bg-red-100',     text: 'text-red-700',     bar: 'border-t-4 border-red-400'     },
}

export default function TabReportesNinas({ auth, student, onLogout }) {
  const toast = useToast()
  const [photoError, setPhotoError] = useState(false)
  const [photoTimestamp, setPhotoTimestamp] = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const avatarInputRef = useRef(null)

  const {
    id,
    name,
    course_name,
    payment_status,
    next_payment_date,
    classes_used,
    classes_per_cycle,
    enrollment_date,
  } = student

  const ps = ESTADO_PAGO[normPS(payment_status)]

  const initials = (name || '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase()

  const avatarUrl = supabase.storage.from('avatars').getPublicUrl(`${id}.jpg`).data?.publicUrl
    + (photoTimestamp ? `?t=${photoTimestamp}` : '')

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !id) return
    e.target.value = ''
    setPhotoUploading(true)
    try {
      const blob = await compressAvatar(file)
      const { error } = await supabase.storage.from('avatars')
        .upload(`${id}.jpg`, blob, { upsert: true, contentType: 'image/jpeg' })
      if (error) throw error
      setPhotoError(false)
      setPhotoTimestamp(Date.now())
    } catch {
      toast.error('No se pudo subir la foto')
    } finally {
      setPhotoUploading(false)
    }
  }

  return (
    <div className="px-4 pt-5 pb-10 max-w-lg mx-auto space-y-4">
      {/* Título */}
      <div>
        <h2 className="text-lg font-bold text-gray-800">Reportes</h2>
        <p className="text-xs text-gray-500 mt-0.5">Resumen de inscripción</p>
      </div>

      {/* Perfil */}
      <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 overflow-hidden ${ps.bar}`}>
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-50">
          {/* Avatar con upload */}
          <div
            className="relative w-11 h-11 rounded-full shrink-0 cursor-pointer group"
            onClick={() => avatarInputRef.current?.click()}
            title="Toca para cambiar tu foto"
          >
            {!photoError
              ? <img
                  src={avatarUrl}
                  alt={name}
                  onError={() => setPhotoError(true)}
                  onLoad={() => setPhotoError(false)}
                  className="w-full h-full rounded-full object-cover"
                />
              : <div className="w-full h-full rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-purple-700 font-bold">{initials}</span>
                </div>
            }
            {photoUploading ? (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <svg className="animate-spin w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : (
              <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/25 flex items-center justify-center transition-colors">
                <Camera size={12} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>
          <div>
            <p className="font-bold text-gray-800">{name}</p>
            <p className="text-xs text-gray-400 mt-0.5">Toca tu foto para cambiarla</p>
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
        className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-red-100 text-red-400 hover:text-red-600 hover:bg-red-50 active:scale-95 transition-all"
      >
        <LogOut size={15} />
        <span className="text-sm font-medium">Cerrar sesión</span>
      </button>
    </div>
  )
}
