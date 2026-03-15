import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import Modal from '../ui/Modal'

export default function LoginPage({ onLogin }) {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isResetting, setIsResetting] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
    setError('')
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      })

      if (error) throw error

      if (data.user) {
        onLogin(data.user)
      }
    } catch (err) {
      setError(err.message === 'Invalid login credentials'
        ? 'Email o contraseña incorrectos'
        : err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    if (!resetEmail.trim()) return
    setLoading(true)
    setError('')
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
        redirectTo: `${window.location.origin}/reset-password`
      })
      if (error) throw error
      setResetSent(true)
    } catch (err) {
      setError(err.message || 'No se pudo enviar el enlace. Verifica el correo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-purple-700 via-purple-800 to-pink-700">
      <div className="w-full max-w-md">
        {/* Logo y título */}
        <div className="text-center mb-6">
          <div className="mx-auto mb-4">
            <img
              src="/logo-cream.png"
              alt="Studio Dancers"
              className="h-20 mx-auto drop-shadow-lg"
              onError={(e) => { e.target.src = '/logo.png' }}
            />
          </div>
          <h1 className="text-2xl font-bold text-white mb-1 tracking-tight">Studio Dancers</h1>
          <p className="text-white/70 text-sm">Sistema de Administracion</p>
        </div>

        {/* ── Modal recuperar contraseña ── */}
        <Modal isOpen={isResetting} onClose={() => { setIsResetting(false); setError('') }} ariaLabel="Recuperar contraseña">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
              <div className="px-6 pt-6 pb-2">
                <h2 className="text-lg font-bold text-gray-800 mb-1">Recuperar contraseña</h2>
                <p className="text-sm text-gray-500">Te enviaremos un enlace a tu correo para restablecer la contraseña.</p>
              </div>

              {resetSent ? (
                <div className="px-6 py-5 space-y-4">
                  <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
                    Enlace enviado a <strong>{resetEmail}</strong>. Revisa tu bandeja (y la carpeta de spam).
                  </div>
                  <button
                    onClick={() => { setIsResetting(false); setResetSent(false) }}
                    className="w-full py-3 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 active:scale-95 transition-all"
                  >
                    Volver al login
                  </button>
                </div>
              ) : (
                <form onSubmit={handleResetPassword} className="px-6 py-5 space-y-4">
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">{error}</div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Correo electrónico</label>
                    <input
                      type="email"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      placeholder="tu@email.com"
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                      required
                      autoFocus
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl font-semibold text-white active:scale-95 transition-all disabled:opacity-50 btn-primary-gradient"
                  >
                    {loading ? 'Enviando...' : 'Enviar enlace'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setIsResetting(false); setError('') }}
                    className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors"
                  >
                    Cancelar
                  </button>
                </form>
              )}
            </div>
        </Modal>

        {/* Card de login */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <form onSubmit={handleLogin} className="p-6 space-y-5">
            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Correo Electrónico
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="tu@email.com"
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 pr-12 py-3 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3.5 rounded-xl font-semibold text-white active:scale-95 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed btn-primary-gradient"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-3">
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Ingresando...
                </span>
              ) : 'Iniciar Sesión'}
            </button>

            <button
              type="button"
              className="w-full text-sm text-purple-600 hover:text-purple-700 font-medium py-2"
              onClick={() => { setIsResetting(true); setError(''); setResetSent(false); setResetEmail(formData.email) }}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-purple-200 text-sm mt-8">
          © {new Date().getFullYear()} Studio Dancers Admin
        </p>
      </div>
    </div>
  )
}
