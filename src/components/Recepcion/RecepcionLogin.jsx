import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export default function RecepcionLogin({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPw, setShowPw]     = useState(false)
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
          role: 'recepcion',
          identifier: username.trim().toLowerCase(),
          password
        })
      })
      const result = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(result.error || 'Usuario o contraseña incorrectos')
        return
      }

      sessionStorage.setItem('recepcion_auth', '1')
      sessionStorage.setItem('recepcion_name', result.name)
      onLogin(result.name)
    } catch (err) {
      console.error('[RecepcionLogin] error:', err)
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
          <p className="text-white/70 text-sm">Portal de Recepción</p>
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
                Usuario
              </label>
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError('') }}
                placeholder="tu.usuario"
                autoFocus
                autoCapitalize="none"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-[#7e2d55] focus:ring-4 focus:ring-[#f9e8f0] outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={e => { setPassword(e.target.value); setError('') }}
                  placeholder="••••••••"
                  className="w-full px-4 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-[#7e2d55] focus:ring-4 focus:ring-[#f9e8f0] outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPw ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3.5 rounded-xl font-semibold text-white active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Footer */}
        <p className="text-center text-[#e8b4cc] text-sm mt-8">
          © {new Date().getFullYear()} Studio Dancers Admin
        </p>
      </div>
    </div>
  )
}
