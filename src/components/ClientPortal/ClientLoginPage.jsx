import { useState } from 'react'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { clientLogin, savePortalAuth } from '../../lib/adultas'

export default function ClientLoginPage({ onLogin }) {
  const [cedula, setCedula] = useState('')
  const [phone4, setPhone4] = useState('')
  const [showPhone, setShowPhone] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!cedula.trim() || !phone4.trim()) return

    setLoading(true)
    setError('')

    const { data, error: rpcError } = await clientLogin(cedula.trim(), phone4.trim())

    if (rpcError) {
      setError('Ocurrió un error. Intenta de nuevo.')
      setLoading(false)
      return
    }

    if (!data || data.length === 0) {
      setError('No encontramos tu información. Verifica tu cédula y los últimos 4 dígitos de tu teléfono.')
      setLoading(false)
      return
    }

    // Si hay un solo alumno, entrar directo. Si hay varios, seleccionar.
    const auth = {
      cedula: cedula.trim(),
      phone4: phone4.trim(),
      students: data
    }

    savePortalAuth(auth)
    onLogin(auth)
    setLoading(false)
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, #7B2D8E 0%, #5a1a6e 50%, #3a0d4a 100%)' }}
    >
      {/* Logo y nombre */}
      <div className="text-center mb-8">
        <img
          src="/logo-white.png"
          alt="Studio Dancers"
          className="h-14 mx-auto mb-3"
          style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}
          onError={e => { e.target.src = '/logo2.png' }}
        />
        <h1 className="text-2xl font-bold text-white tracking-tight">Mi Studio</h1>
        <p className="text-white/60 text-sm mt-1">Accede a tu espacio personal</p>
      </div>

      {/* Card de login */}
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="px-1 pt-1">
          <div className="rounded-xl px-6 py-5" style={{ background: 'linear-gradient(135deg, #f3e5f5 0%, #ede7f6 100%)' }}>
            <div className="flex items-center justify-center gap-2 mb-1">
              <Lock size={16} style={{ color: '#7B2D8E' }} />
              <p className="font-semibold text-sm" style={{ color: '#7B2D8E' }}>Ingresa con tus datos</p>
            </div>
            <p className="text-center text-xs text-gray-500">
              Usa la cédula y los últimos 4 dígitos del teléfono que diste al inscribirte
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-xl text-sm text-red-700 bg-red-50 border border-red-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Cédula de identidad
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={cedula}
              onChange={e => { setCedula(e.target.value); setError('') }}
              placeholder="0912345678"
              maxLength={13}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Últimos 4 dígitos de tu teléfono
            </label>
            <div className="relative">
              <input
                type={showPhone ? 'text' : 'password'}
                inputMode="numeric"
                value={phone4}
                onChange={e => { setPhone4(e.target.value.replace(/\D/g, '').slice(0, 4)); setError('') }}
                placeholder="••••"
                maxLength={4}
                className="w-full px-4 pr-12 py-3 border-2 border-gray-200 rounded-xl text-base focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 transition-all tracking-widest font-mono"
                required
              />
              <button
                type="button"
                onClick={() => setShowPhone(!showPhone)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1 active:scale-95 transition-all"
              >
                {showPhone ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-1">
              Ej.: si tu número es 0991234567, escribe <strong>4567</strong>
            </p>
          </div>

          <button
            type="submit"
            disabled={loading || cedula.length < 6 || phone4.length !== 4}
            className="w-full py-3.5 rounded-xl font-semibold text-white text-base active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: 'linear-gradient(135deg, #7B2D8E 0%, #5a1a6e 100%)',
              boxShadow: '0 4px 15px rgba(123,45,142,0.35)'
            }}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Ingresando...
              </span>
            ) : 'Entrar a Mi Studio'}
          </button>
        </form>

        <div className="px-6 pb-5 text-center">
          <p className="text-xs text-gray-400">
            ¿Problemas para ingresar? Contáctanos en el estudio.
          </p>
        </div>
      </div>

      <p className="text-white/30 text-xs mt-8">Studio Dancers © {new Date().getFullYear()}</p>
    </div>
  )
}
