import { useState } from 'react'
// SECURITY WARNING: bcryptjs runs client-side. Password hashing should be server-side.
// TODO: Migrate to Supabase Edge Function for password change operations.
import bcrypt from 'bcryptjs'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import InstructoraLogin from './InstructoraLogin'
import InstructoraDashboard from './InstructoraDashboard'

// Lee la sesión desde localStorage (recordar) o sessionStorage (solo esta sesión)
function readSession() {
  const fromLocal = localStorage.getItem('instructora_auth') === '1'
  const fromSession = sessionStorage.getItem('instructora_auth') === '1'
  if (!fromLocal && !fromSession) return null
  const storage = fromLocal ? localStorage : sessionStorage
  return {
    id: storage.getItem('instructora_id'),
    name: storage.getItem('instructora_name'),
    mustChangePw: storage.getItem('instructora_must_change_pw') === '1',
    remember: fromLocal,
  }
}

function clearSession() {
  ;['instructora_auth', 'instructora_id', 'instructora_name', 'instructora_must_change_pw', 'instructora_remember'].forEach(k => {
    localStorage.removeItem(k)
    sessionStorage.removeItem(k)
  })
}

// ── Modal de cambio de contraseña obligatorio ────────────────────────────────
function ChangePasswordModal({ instructorId, instructorName, onChanged }) {
  const [newPw, setNewPw]         = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [showNew, setShowNew]     = useState(false)
  const [showCfm, setShowCfm]     = useState(false)
  const [error, setError]         = useState('')
  const [saving, setSaving]       = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (newPw.length < 6) { setError('La contraseña debe tener al menos 6 caracteres'); return }
    if (newPw !== confirmPw) { setError('Las contraseñas no coinciden'); return }
    setSaving(true)
    try {
      const hashed = await bcrypt.hash(newPw, 10)
      const { error: dbErr } = await supabase
        .from('instructors')
        .update({ password: hashed, must_change_password: false })
        .eq('id', instructorId)
      if (dbErr) throw dbErr

      // Actualizar flag en storage
      ;[localStorage, sessionStorage].forEach(s => {
        if (s.getItem('instructora_auth') === '1') {
          s.setItem('instructora_must_change_pw', '0')
        }
      })
      onChanged()
    } catch (err) {
      setError('No se pudo actualizar la contraseña. Intenta de nuevo.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #7e22ce 0%, #6b21a8 50%, #be185d 100%)'
    }}>
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
            <Lock size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1">¡Bienvenida, {instructorName.split(' ')[0]}!</h1>
          <p className="text-white/80 text-sm">Antes de continuar, debes crear tu propia contraseña.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          <form onSubmit={handleSubmit} className="px-6 pt-6 pb-7 space-y-5">
            <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl text-purple-700 text-sm">
              Por seguridad, el administrador ha solicitado que cambies tu contraseña inicial.
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nueva contraseña</label>
              <div className="flex items-center border-2 border-gray-200 rounded-xl focus-within:border-purple-500 transition-all">
                <input
                  type={showNew ? 'text' : 'password'}
                  value={newPw}
                  onChange={e => { setNewPw(e.target.value); setError('') }}
                  placeholder="Mínimo 6 caracteres"
                  autoComplete="new-password"
                  className="flex-1 px-4 py-3 bg-transparent outline-none text-sm min-w-0"
                  required
                />
                <button type="button" onClick={() => setShowNew(v => !v)}
                  className="px-3 text-gray-400 hover:text-purple-600 transition-colors shrink-0">
                  {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Confirmar contraseña</label>
              <div className="flex items-center border-2 border-gray-200 rounded-xl focus-within:border-purple-500 transition-all">
                <input
                  type={showCfm ? 'text' : 'password'}
                  value={confirmPw}
                  onChange={e => { setConfirmPw(e.target.value); setError('') }}
                  placeholder="Repite la contraseña"
                  autoComplete="new-password"
                  className="flex-1 px-4 py-3 bg-transparent outline-none text-sm min-w-0"
                  required
                />
                <button type="button" onClick={() => setShowCfm(v => !v)}
                  className="px-3 text-gray-400 hover:text-purple-600 transition-colors shrink-0">
                  {showCfm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 rounded-xl font-semibold text-white active:scale-95 transition-all disabled:opacity-50 outline-none btn-primary-gradient"
            >
              {saving ? 'Guardando...' : 'Guardar contraseña y continuar'}
            </button>
          </form>
        </div>

        <p className="text-center text-purple-200 text-sm mt-8">
          © {new Date().getFullYear()} Studio Dancers
        </p>
      </div>
    </div>
  )
}

// ── App principal ────────────────────────────────────────────────────────────
export default function InstructoraApp() {
  const [instructor, setInstructor] = useState(() => readSession())

  const handleLogin = (data) => {
    setInstructor(data)
  }

  const handlePasswordChanged = () => {
    setInstructor(prev => ({ ...prev, mustChangePw: false }))
  }

  const handleLogout = () => {
    clearSession()
    setInstructor(null)
  }

  if (!instructor) {
    return <InstructoraLogin onLogin={handleLogin} />
  }

  if (instructor.mustChangePw) {
    return (
      <ChangePasswordModal
        instructorId={instructor.id}
        instructorName={instructor.name}
        onChanged={handlePasswordChanged}
      />
    )
  }

  return (
    <InstructoraDashboard
      instructor={instructor}
      onLogout={handleLogout}
    />
  )
}
