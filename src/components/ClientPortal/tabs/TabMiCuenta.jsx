import { useState, useRef } from 'react'
import { LogOut, Phone, MapPin, Calendar, BookOpen, Camera } from 'lucide-react'
import { supabase } from '../../../lib/supabase'
import { useToast } from '../../Toast'

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

export default function TabMiCuenta({ auth, student, onLogout }) {
  const toast = useToast()
  const [photoError, setPhotoError] = useState(false)
  const [photoTimestamp, setPhotoTimestamp] = useState(null)
  const [photoUploading, setPhotoUploading] = useState(false)
  const avatarInputRef = useRef(null)

  const cursos = Array.isArray(student) ? student : [student]
  const initials = student.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()

  const avatarUrl = supabase.storage.from('avatars').getPublicUrl(`${student.id}.jpg`).data?.publicUrl
    + (photoTimestamp ? `?t=${photoTimestamp}` : '')

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setPhotoUploading(true)
    try {
      const blob = await compressAvatar(file)
      const { error } = await supabase.storage.from('avatars')
        .upload(`${student.id}.jpg`, blob, { upsert: true, contentType: 'image/jpeg' })
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
    <div className="px-4 pt-5 pb-8 max-w-lg mx-auto space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-gray-800">Mi cuenta</h2>
        <p className="text-xs text-gray-500 mt-0.5">Información de tu inscripción</p>
      </div>

      {/* Datos de la alumna */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-50">
          {/* Avatar con upload */}
          <div
            className="relative w-14 h-14 rounded-full shrink-0 cursor-pointer group"
            onClick={() => avatarInputRef.current?.click()}
            title="Toca para cambiar tu foto"
          >
            {!photoError
              ? <img
                  src={avatarUrl}
                  alt={student.name}
                  onError={() => setPhotoError(true)}
                  onLoad={() => setPhotoError(false)}
                  className="w-full h-full rounded-full object-cover"
                />
              : <div className="w-full h-full rounded-full bg-purple-100 flex items-center justify-center">
                  <span className="text-purple-700 font-bold text-lg">{initials}</span>
                </div>
            }
            {/* Overlay */}
            {photoUploading ? (
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center">
                <svg className="animate-spin w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
            ) : (
              <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/25 flex items-center justify-center transition-colors">
                <Camera size={14} className="text-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}
            <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
          </div>

          <div>
            <p className="font-bold text-gray-800">{student.name}</p>
            <p className="text-xs text-gray-400 mt-0.5">Toca tu foto para cambiarla</p>
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
