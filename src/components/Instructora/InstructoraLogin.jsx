import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export default function InstructoraLogin({ onLogin }) {
  const [cedula, setCedula]     = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
  const [remember, setRemember] = useState(false)
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // La verificación de credenciales ocurre server-side (Edge Function
      // staff-login): el navegador nunca ve el hash de la contraseña.
      const res = await fetch(`${SUPABASE_URL}/functions/v1/staff-login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: 'instructora',
          identifier: cedula.trim(),
          password
        })
      })
      const result = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(result.error || 'Cédula o contraseña incorrectos')
        return
      }

      const storage = remember ? localStorage : sessionStorage
      storage.setItem('instructora_auth', '1')
      storage.setItem('instructora_id', result.id)
      storage.setItem('instructora_name', result.name)
      storage.setItem('instructora_must_change_pw', result.mustChangePw ? '1' : '0')
      storage.setItem('instructora_remember', remember ? '1' : '0')

      onLogin({
        id: result.id,
        name: result.name,
        email: result.email,
        mustChangePw: !!result.mustChangePw,
      })
    } catch (err) {
      console.error('[InstructoraLogin] error:', err)
      setError('Error al iniciar sesión. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{
      background: 'linear-gradient(135deg, #551735 0%, #6b2145 50%, #7e2d55 100%)'
    }}>
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-4">
            <img
              src="/logo-cream.png"
              alt="Studio Dancers"
              className="h-20 mx-auto"
              style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}
              onError={(e) => { e.target.src = '/logo.png' }}
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Studio Dancers</h1>
          <p className="text-white/70 text-sm">Portal de Instructoras</p>
        </div>

        {/* Card de login */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Cédula
              </label>
              <input
                type="text"
                name="cedula"
                value={cedula}
                onChange={e => { setCedula(e.target.value); setError('') }}
                placeholder="Número de cédula"
                autoComplete="username"
                autoFocus
                inputMode="numeric"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#7e2d55] focus:ring-4 focus:ring-[#f9e8f0] outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="flex items-center border-2 border-gray-200 rounded-xl focus-within:border-[#7e2d55] transition-all">
                <input
                  type={showPw ? 'text' : 'password'}
                  name="password"
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="flex-1 px-4 py-3 bg-transparent outline-none text-sm min-w-0"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="px-3 text-gray-400 hover:text-[#6b2145] transition-colors shrink-0"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Recordar sesión */}
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={e => setRemember(e.target.checked)}
                className="w-4 h-4 rounded border-gray-300 text-[#6b2145] accent-[#6b2145] cursor-pointer"
              />
              <span className="text-sm text-gray-600">Recordar sesión en este dispositivo</span>
            </label>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 rounded-xl font-semibold text-white active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed outline-none"
              style={{
                background: 'linear-gradient(135deg, #6b2145 0%, #551735 100%)',
                boxShadow: '0 4px 15px rgba(126, 45, 85, 0.4)'
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Verificando...
                </span>
              ) : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-[#e8b4cc] text-sm mt-8">
          © {new Date().getFullYear()} Studio Dancers
        </p>
      </div>
    </div>
  )
}
