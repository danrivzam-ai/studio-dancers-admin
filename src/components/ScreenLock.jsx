import { useState, useEffect } from 'react'
import { Lock, Unlock } from 'lucide-react'

export default function ScreenLock({ isLocked, onUnlock, schoolName, securityPin }) {
  const [time, setTime] = useState(new Date())
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [blocked, setBlocked] = useState(false)
  const [blockTimer, setBlockTimer] = useState(0)

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!isLocked) {
      setPin('')
      setError('')
      setAttempts(0)
      setBlocked(false)
      setBlockTimer(0)
    }
  }, [isLocked])

  useEffect(() => {
    if (blockTimer <= 0) return
    const t = setTimeout(() => {
      setBlockTimer(prev => {
        if (prev <= 1) { setBlocked(false); setAttempts(0); return 0 }
        return prev - 1
      })
    }, 1000)
    return () => clearTimeout(t)
  }, [blockTimer])

  if (!isLocked) return null

  const hours = time.getHours().toString().padStart(2, '0')
  const minutes = time.getMinutes().toString().padStart(2, '0')
  const seconds = time.getSeconds().toString().padStart(2, '0')

  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
  const months = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
  const dateStr = `${days[time.getDay()]}, ${time.getDate()} de ${months[time.getMonth()]} de ${time.getFullYear()}`

  const handleSubmit = (e) => {
    e.preventDefault()
    if (blocked) return

    if (pin === securityPin) {
      onUnlock()
    } else {
      const next = attempts + 1
      setAttempts(next)
      setPin('')
      if (next >= 5) {
        setBlocked(true)
        setBlockTimer(30)
        setError('Demasiados intentos. Espera 30 segundos.')
      } else {
        setError(`PIN incorrecto. ${5 - next} intento${5 - next !== 1 ? 's' : ''} restante${5 - next !== 1 ? 's' : ''}.`)
      }
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-gradient-to-br from-purple-900 via-purple-800 to-indigo-900 select-none">
      {/* Reloj */}
      <div className="text-center mb-8">
        <div className="text-white/90 font-mono font-light tracking-widest" style={{ fontSize: 'clamp(3rem, 10vw, 7rem)', lineHeight: 1 }}>
          {hours}:{minutes}
          <span className="text-white/40 text-[0.45em]">:{seconds}</span>
        </div>
        <p className="text-white/60 text-sm sm:text-base mt-2 font-light">{dateStr}</p>
      </div>

      {/* Nombre del estudio */}
      <p className="text-white/70 text-lg sm:text-xl font-semibold tracking-wide mb-8">{schoolName}</p>

      {/* Formulario de desbloqueo */}
      <form onSubmit={handleSubmit} className="w-full max-w-xs px-4">
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-5 border border-white/20">
          <div className="flex items-center gap-2 justify-center mb-4">
            <Lock size={16} className="text-white/60" />
            <p className="text-white/80 text-sm">Ingresa el PIN para desbloquear</p>
          </div>

          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError('') }}
            className="w-full px-4 py-3 bg-white/20 border border-white/30 rounded-xl text-center text-2xl tracking-[0.5em] text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-white/40 transition-all"
            placeholder="••••"
            autoFocus
            disabled={blocked}
          />

          {error && (
            <p className="text-red-300 text-xs mt-2 text-center">{error}</p>
          )}
          {blocked && blockTimer > 0 && (
            <p className="text-yellow-300 text-xs mt-1 text-center">Disponible en {blockTimer}s</p>
          )}

          <button
            type="submit"
            disabled={pin.length < 4 || blocked}
            className="mt-3 w-full flex items-center justify-center gap-2 bg-white/20 hover:bg-white/30 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-xl transition-all active:scale-95"
          >
            <Unlock size={16} />
            Desbloquear
          </button>
        </div>
      </form>

      {/* Branding sutil */}
      <p className="absolute bottom-4 text-white/20 text-xs">Studio Dancers · Sistema de Administración</p>
    </div>
  )
}
