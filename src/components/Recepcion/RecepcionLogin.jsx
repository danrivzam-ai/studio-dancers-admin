import { useState } from 'react'
import { Lock, Eye, EyeOff, User } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const PURPLE = '#7B2D8E'

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

    const { data, error: dbError } = await supabase
      .from('receptionists')
      .select('id, name, password, active')
      .eq('username', username.trim().toLowerCase())
      .single()

    if (dbError || !data) {
      setError('Usuario o contraseña incorrectos')
      setLoading(false)
      return
    }

    if (!data.active) {
      setError('Esta cuenta está desactivada')
      setLoading(false)
      return
    }

    if (password !== data.password) {
      setError('Usuario o contraseña incorrectos')
      setLoading(false)
      return
    }

    sessionStorage.setItem('recepcion_auth', '1')
    sessionStorage.setItem('recepcion_name', data.name)
    onLogin(data.name)
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-md"
            style={{ background: PURPLE }}>
            <Lock size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-800">Studio Dancers</h1>
          <p className="text-sm text-gray-500 mt-0.5">Portal Recepción</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-4">
          {/* Usuario */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Usuario</label>
            <div className="relative">
              <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={username}
                onChange={e => { setUsername(e.target.value); setError('') }}
                placeholder="tu.usuario"
                autoFocus
                autoCapitalize="none"
                className="w-full border rounded-xl pl-9 pr-4 py-2.5 text-sm focus:ring-2 focus:ring-purple-300 focus:outline-none"
              />
            </div>
          </div>

          {/* Contraseña */}
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1.5">Contraseña</label>
            <div className="relative">
              <input
                type={showPw ? 'text' : 'password'}
                value={password}
                onChange={e => { setPassword(e.target.value); setError('') }}
                placeholder="••••••••••"
                className="w-full border rounded-xl px-4 py-2.5 pr-10 text-sm focus:ring-2 focus:ring-purple-300 focus:outline-none"
              />
              <button type="button" onClick={() => setShowPw(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
          </div>

          <button type="submit" disabled={loading || !username || !password}
            className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-opacity"
            style={{ background: PURPLE }}>
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  )
}
