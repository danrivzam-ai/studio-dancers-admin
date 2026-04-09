import { useState, useEffect } from 'react'
import { Lock, Unlock } from 'lucide-react'

// SVG curtain panel — drawn as overlapping folds of fabric
function Curtain({ side }) {
  const isLeft = side === 'left'

  // Fold lines give depth; gradient simulates lighting
  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none"
      style={{
        width: '38%',
        [isLeft ? 'left' : 'right']: 0,
        zIndex: 1,
        overflow: 'hidden',
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 200 600"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Main fabric gradient — light from center stage */}
          <linearGradient
            id={`fabricGrad${side}`}
            x1={isLeft ? '0%' : '100%'}
            y1="0%"
            x2={isLeft ? '100%' : '0%'}
            y2="0%"
          >
            <stop offset="0%"   stopColor="#1a0509" />
            <stop offset="30%"  stopColor="#3d0e1f" />
            <stop offset="58%"  stopColor="#7a1a38" />
            <stop offset="78%"  stopColor="#551735" />
            <stop offset="100%" stopColor="#3d0e1f" />
          </linearGradient>

          {/* Fold highlight */}
          <linearGradient
            id={`foldGrad${side}`}
            x1={isLeft ? '0%' : '100%'}
            y1="0%"
            x2={isLeft ? '100%' : '0%'}
            y2="0%"
          >
            <stop offset="0%"   stopColor="rgba(255,255,255,0.0)" />
            <stop offset="50%"  stopColor="rgba(255,255,255,0.06)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0.0)" />
          </linearGradient>

          {/* Bottom shadow */}
          <linearGradient id={`bottomFade${side}`} x1="0%" y1="85%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.5)" />
          </linearGradient>

          {/* Top valance */}
          <linearGradient id={`valanceGrad${side}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#220710" />
            <stop offset="100%" stopColor="#551735" />
          </linearGradient>
        </defs>

        {/* ── Main curtain body ── */}
        {isLeft ? (
          /* Left curtain — hangs from left, bunches toward right edge */
          <path
            d="M0,0 C30,80 -10,160 20,240 C50,320 10,400 30,480 C45,540 20,580 0,600 L200,600 C180,540 200,460 185,380 C165,290 195,210 175,130 C155,50 185,20 200,0 Z"
            fill={`url(#fabricGrad${side})`}
          />
        ) : (
          /* Right curtain — mirror */
          <path
            d="M200,0 C170,80 210,160 180,240 C150,320 190,400 170,480 C155,540 180,580 200,600 L0,600 C20,540 0,460 15,380 C35,290 5,210 25,130 C45,50 15,20 0,0 Z"
            fill={`url(#fabricGrad${side})`}
          />
        )}

        {/* Fold highlight overlay */}
        {isLeft ? (
          <path
            d="M60,0 C80,80 55,160 70,240 C85,320 65,400 75,480 C82,540 70,580 65,600 L85,600 C90,540 80,460 90,380 C103,290 85,210 95,130 C105,50 85,20 80,0 Z"
            fill={`url(#foldGrad${side})`}
          />
        ) : (
          <path
            d="M140,0 C120,80 145,160 130,240 C115,320 135,400 125,480 C118,540 130,580 135,600 L115,600 C110,540 120,460 110,380 C97,290 115,210 105,130 C95,50 115,20 120,0 Z"
            fill={`url(#foldGrad${side})`}
          />
        )}

        {/* Second fold */}
        {isLeft ? (
          <path
            d="M120,0 C140,80 115,160 128,240 C142,320 125,400 132,480 C138,540 128,580 125,600 L142,600 C148,540 140,460 148,380 C158,290 145,210 152,130 C158,50 145,20 140,0 Z"
            fill={`url(#foldGrad${side})`}
          />
        ) : (
          <path
            d="M80,0 C60,80 85,160 72,240 C58,320 75,400 68,480 C62,540 72,580 75,600 L58,600 C52,540 60,460 52,380 C42,290 55,210 48,130 C42,50 55,20 60,0 Z"
            fill={`url(#foldGrad${side})`}
          />
        )}

        {/* Bottom shadow for depth */}
        <rect x="0" y="0" width="200" height="600" fill={`url(#bottomFade${side})`} />

        {/* ── Valance (top decorative band) ── */}
        {isLeft ? (
          <path
            d="M0,0 C40,12 80,8 120,15 C160,22 180,12 200,0 L200,55 C180,45 160,52 120,48 C80,44 40,50 0,40 Z"
            fill={`url(#valanceGrad${side})`}
          />
        ) : (
          <path
            d="M200,0 C160,12 120,8 80,15 C40,22 20,12 0,0 L0,55 C20,45 40,52 80,48 C120,44 160,50 200,40 Z"
            fill={`url(#valanceGrad${side})`}
          />
        )}

        {/* Gold valance trim */}
        {isLeft ? (
          <path
            d="M0,38 C40,50 80,46 120,52 C160,58 180,50 200,40"
            fill="none"
            stroke="#c9a84c"
            strokeWidth="2.5"
            opacity="0.7"
          />
        ) : (
          <path
            d="M200,38 C160,50 120,46 80,52 C40,58 20,50 0,40"
            fill="none"
            stroke="#c9a84c"
            strokeWidth="2.5"
            opacity="0.7"
          />
        )}

        {/* Gold fringe drops */}
        {[20, 45, 70, 95, 120, 145, 170].map((x, i) => (
          <g key={i}>
            <line x1={x} y1={isLeft ? 42 + (i % 3) * 3 : 44 + (i % 3) * 3} x2={x} y2={isLeft ? 58 + (i % 3) * 4 : 60 + (i % 3) * 4}
              stroke="#c9a84c" strokeWidth="1.5" opacity="0.6" />
            <circle cx={x} cy={isLeft ? 60 + (i % 3) * 4 : 62 + (i % 3) * 4} r="2" fill="#c9a84c" opacity="0.55" />
          </g>
        ))}
      </svg>
    </div>
  )
}

// Stage floor — subtle spotlight glow at bottom
function StageFloor() {
  return (
    <div
      className="absolute bottom-0 left-0 right-0 pointer-events-none"
      style={{ height: '18%', zIndex: 1 }}
    >
      <svg width="100%" height="100%" viewBox="0 0 800 180" preserveAspectRatio="none">
        <defs>
          <radialGradient id="spotlightFloor" cx="50%" cy="0%" r="80%">
            <stop offset="0%"   stopColor="rgba(255,220,150,0.18)" />
            <stop offset="60%"  stopColor="rgba(120,30,50,0.10)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="800" height="180" fill="url(#spotlightFloor)" />
      </svg>
    </div>
  )
}

// Spotlight beam from top-center
function Spotlight() {
  return (
    <div
      className="absolute top-0 left-0 right-0 pointer-events-none"
      style={{ height: '65%', zIndex: 1 }}
    >
      <svg width="100%" height="100%" viewBox="0 0 800 500" preserveAspectRatio="none">
        <defs>
          <radialGradient id="spotBeam" cx="50%" cy="0%" r="60%">
            <stop offset="0%"   stopColor="rgba(255,240,200,0.09)" />
            <stop offset="70%"  stopColor="rgba(255,200,120,0.03)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0)" />
          </radialGradient>
        </defs>
        <ellipse cx="400" cy="0" rx="260" ry="520" fill="url(#spotBeam)" />
      </svg>
    </div>
  )
}

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

  const hours   = time.getHours().toString().padStart(2, '0')
  const minutes = time.getMinutes().toString().padStart(2, '0')
  const seconds = time.getSeconds().toString().padStart(2, '0')

  const days   = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
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
    <div
      className="select-none overflow-hidden"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0, bottom: 0,
        width: '100vw',
        height: '100vh',
        zIndex: 99999,
        background: 'linear-gradient(180deg, #0d0206 0%, #1a0509 30%, #220810 60%, #150306 100%)',
      }}
    >
      {/* Theater curtains */}
      <Curtain side="left" />
      <Curtain side="right" />

      {/* Spotlight glow from above */}
      <Spotlight />

      {/* Stage floor glow */}
      <StageFloor />

      {/* ── Center stage content ── */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center"
        style={{ zIndex: 10 }}
      >
        {/* Logo */}
        <div className="mb-5 flex flex-col items-center">
          <img
            src="/logo2.png"
            alt="Studio Dancers"
            style={{
              width: 'clamp(110px, 22vw, 200px)',
              height: 'auto',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 18px rgba(180,80,110,0.55)) drop-shadow(0 2px 8px rgba(0,0,0,0.7))',
            }}
          />
        </div>

        {/* Clock */}
        <div className="text-center mb-2">
          <div
            className="font-mono font-light tracking-widest text-white"
            style={{
              fontSize: 'clamp(3rem, 10vw, 6.5rem)',
              lineHeight: 1,
              textShadow: '0 0 30px rgba(200,100,130,0.4), 0 2px 10px rgba(0,0,0,0.8)',
            }}
          >
            {hours}:{minutes}
            <span style={{ opacity: 0.35, fontSize: '0.42em' }}>:{seconds}</span>
          </div>
          <p className="text-white/50 text-sm sm:text-base mt-2 font-light tracking-wide">{dateStr}</p>
        </div>

        {/* School name */}
        <p
          className="text-sm sm:text-base font-semibold tracking-widest uppercase mb-8"
          style={{ color: 'rgba(201,168,76,0.75)', textShadow: '0 1px 6px rgba(0,0,0,0.6)' }}
        >
          {schoolName}
        </p>

        {/* PIN form */}
        <form onSubmit={handleSubmit} className="w-full max-w-xs px-4">
          <div
            className="rounded-2xl p-5 border"
            style={{
              background: 'rgba(255,255,255,0.07)',
              backdropFilter: 'blur(12px)',
              borderColor: 'rgba(255,255,255,0.13)',
            }}
          >
            <div className="flex items-center gap-2 justify-center mb-4">
              <Lock size={15} className="text-white/50" />
              <p className="text-white/70 text-sm">Ingresa el PIN para desbloquear</p>
            </div>

            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError('') }}
              className="w-full px-4 py-3 rounded-xl text-center text-2xl tracking-[0.5em] text-white placeholder-white/25 focus:outline-none transition-all"
              style={{
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.22)',
              }}
              onFocus={e => e.target.style.boxShadow = '0 0 0 2px rgba(201,168,76,0.4)'}
              onBlur={e => e.target.style.boxShadow = 'none'}
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
              className="mt-3 w-full flex items-center justify-center gap-2 font-medium py-2.5 rounded-xl transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: 'rgba(85,23,53,0.7)',
                border: '1px solid rgba(201,168,76,0.35)',
                color: 'rgba(255,255,255,0.9)',
              }}
              onMouseEnter={e => { if (!e.currentTarget.disabled) e.currentTarget.style.background = 'rgba(120,30,65,0.85)' }}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(85,23,53,0.7)'}
            >
              <Unlock size={15} />
              Desbloquear
            </button>
          </div>
        </form>
      </div>

      {/* Bottom branding */}
      <p
        className="absolute bottom-3 left-0 right-0 text-center text-xs"
        style={{ color: 'rgba(255,255,255,0.15)', zIndex: 10 }}
      >
        Studio Dancers · Sistema de Administración
      </p>
    </div>
  )
}
