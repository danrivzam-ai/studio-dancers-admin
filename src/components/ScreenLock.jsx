import { useState, useEffect, useRef } from 'react'
import { Lock, Unlock } from 'lucide-react'

function Curtain({ side }) {
  const isLeft = side === 'left'
  return (
    <div
      className="absolute top-0 bottom-0 pointer-events-none"
      style={{ width: '34%', [isLeft ? 'left' : 'right']: 0, zIndex: 1, overflow: 'hidden' }}
    >
      <svg width="100%" height="100%" viewBox="0 0 200 600" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id={`fg${side}`} x1={isLeft ? '0%' : '100%'} y1="0%" x2={isLeft ? '100%' : '0%'} y2="0%">
            <stop offset="0%"   stopColor="#110307" />
            <stop offset="28%"  stopColor="#3a0d1c" />
            <stop offset="55%"  stopColor="#6e1833" />
            <stop offset="80%"  stopColor="#551735" />
            <stop offset="100%" stopColor="#3a0d1c" />
          </linearGradient>
          <linearGradient id={`hl${side}`} x1={isLeft ? '0%' : '100%'} y1="0%" x2={isLeft ? '100%' : '0%'} y2="0%">
            <stop offset="0%"   stopColor="rgba(255,255,255,0)" />
            <stop offset="50%"  stopColor="rgba(255,255,255,0.055)" />
            <stop offset="100%" stopColor="rgba(255,255,255,0)" />
          </linearGradient>
          <linearGradient id={`btm${side}`} x1="0%" y1="82%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="rgba(0,0,0,0)" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.55)" />
          </linearGradient>
          <linearGradient id={`val${side}`} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%"   stopColor="#1e0710" />
            <stop offset="100%" stopColor="#551735" />
          </linearGradient>
        </defs>

        {/* Main curtain body */}
        {isLeft
          ? <path d="M0,0 C25,70 -5,150 18,230 C42,315 8,395 28,475 C42,535 18,575 0,600 L200,600 C182,540 200,460 186,378 C168,288 196,208 178,128 C158,48 186,18 200,0 Z" fill={`url(#fg${side})`} />
          : <path d="M200,0 C175,70 205,150 182,230 C158,315 192,395 172,475 C158,535 182,575 200,600 L0,600 C18,540 0,460 14,378 C32,288 4,208 22,128 C42,48 14,18 0,0 Z" fill={`url(#fg${side})`} />
        }
        {/* Fold highlight 1 */}
        {isLeft
          ? <path d="M58,0 C76,70 54,150 68,230 C83,315 63,395 72,475 C80,535 68,575 64,600 L82,600 C88,540 78,460 88,378 C100,288 84,208 93,128 C102,48 84,18 80,0 Z" fill={`url(#hl${side})`} />
          : <path d="M142,0 C124,70 146,150 132,230 C117,315 137,395 128,475 C120,535 132,575 136,600 L118,600 C112,540 122,460 112,378 C100,288 116,208 107,128 C98,48 116,18 120,0 Z" fill={`url(#hl${side})`} />
        }
        {/* Fold highlight 2 */}
        {isLeft
          ? <path d="M118,0 C136,70 116,150 128,230 C142,315 126,395 132,475 C138,535 128,575 126,600 L142,600 C148,540 140,460 148,378 C158,288 144,208 150,128 C158,48 144,18 140,0 Z" fill={`url(#hl${side})`} />
          : <path d="M82,0 C64,70 84,150 72,230 C58,315 74,395 68,475 C62,535 72,575 74,600 L58,600 C52,540 60,460 52,378 C42,288 56,208 50,128 C42,48 56,18 60,0 Z" fill={`url(#hl${side})`} />
        }
        {/* Bottom shadow */}
        <rect x="0" y="0" width="200" height="600" fill={`url(#btm${side})`} />

        {/* Valance */}
        {isLeft
          ? <path d="M0,0 C50,14 100,9 150,16 C175,20 190,13 200,0 L200,52 C190,44 175,50 150,47 C100,43 50,50 0,38 Z" fill={`url(#val${side})`} />
          : <path d="M200,0 C150,14 100,9 50,16 C25,20 10,13 0,0 L0,52 C10,44 25,50 50,47 C100,43 150,50 200,38 Z" fill={`url(#val${side})`} />
        }
        {/* Gold trim line */}
        {isLeft
          ? <path d="M0,37 C50,50 100,45 150,52 C175,56 190,50 200,40" fill="none" stroke="#c9a84c" strokeWidth="2" opacity="0.65" />
          : <path d="M200,37 C150,50 100,45 50,52 C25,56 10,50 0,40" fill="none" stroke="#c9a84c" strokeWidth="2" opacity="0.65" />
        }
        {/* Fringe drops */}
        {[18,38,58,78,98,118,138,158,178].map((x, i) => (
          <g key={i}>
            <line x1={x} y1={42+(i%3)*2} x2={x} y2={56+(i%3)*5} stroke="#c9a84c" strokeWidth="1.2" opacity="0.55" />
            <circle cx={x} cy={57+(i%3)*5} r="1.8" fill="#c9a84c" opacity="0.5" />
          </g>
        ))}
      </svg>
    </div>
  )
}

// CSS injection for autofill override
const autofillStyle = `
  .pin-input:-webkit-autofill,
  .pin-input:-webkit-autofill:hover,
  .pin-input:-webkit-autofill:focus,
  .pin-input:-webkit-autofill:active {
    -webkit-box-shadow: 0 0 0 1000px rgba(60,10,25,0.85) inset !important;
    -webkit-text-fill-color: white !important;
    caret-color: white !important;
    background-color: transparent !important;
    transition: background-color 9999s ease-in-out 0s;
  }
  .pin-input { background-color: rgba(255,255,255,0.10) !important; }
  .pin-input::placeholder { color: rgba(255,255,255,0.22); }
`

export default function ScreenLock({ isLocked, onUnlock, schoolName, securityPin }) {
  const [time, setTime]         = useState(new Date())
  const [pin, setPin]           = useState('')
  const [error, setError]       = useState('')
  const [attempts, setAttempts] = useState(0)
  const [blocked, setBlocked]   = useState(false)
  const [blockTimer, setBlockTimer] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    const interval = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (!isLocked) { setPin(''); setError(''); setAttempts(0); setBlocked(false); setBlockTimer(0) }
    else { setTimeout(() => inputRef.current?.focus(), 100) }
  }, [isLocked])

  useEffect(() => {
    if (blockTimer <= 0) return
    const t = setTimeout(() => {
      setBlockTimer(prev => { if (prev <= 1) { setBlocked(false); setAttempts(0); return 0 } return prev - 1 })
    }, 1000)
    return () => clearTimeout(t)
  }, [blockTimer])

  if (!isLocked) return null

  const H = time.getHours().toString().padStart(2, '0')
  const M = time.getMinutes().toString().padStart(2, '0')
  const S = time.getSeconds().toString().padStart(2, '0')
  const days   = ['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado']
  const months = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre']
  const dateStr = `${days[time.getDay()]}, ${time.getDate()} de ${months[time.getMonth()]}`

  const handleSubmit = (e) => {
    e.preventDefault()
    if (blocked) return
    if (pin === securityPin) {
      onUnlock()
    } else {
      const next = attempts + 1
      setAttempts(next); setPin('')
      if (next >= 5) { setBlocked(true); setBlockTimer(30); setError('Demasiados intentos. Espera 30 segundos.') }
      else { setError(`PIN incorrecto. ${5 - next} intento${5 - next !== 1 ? 's' : ''} restante${5 - next !== 1 ? 's' : ''}.`) }
    }
  }

  return (
    <div
      className="select-none overflow-hidden"
      style={{ position: 'fixed', inset: 0, zIndex: 99999,
        background: 'linear-gradient(180deg, #0d0206 0%, #1c0609 35%, #220810 65%, #130305 100%)' }}
    >
      <style>{autofillStyle}</style>

      {/* Curtains */}
      <Curtain side="left" />
      <Curtain side="right" />

      {/* Spotlight from top center */}
      <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1 }}>
        <div style={{
          position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
          width: '60%', height: '70%',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255,230,190,0.10) 0%, rgba(180,80,110,0.04) 45%, transparent 75%)'
        }} />
      </div>

      {/* Center stage */}
      <div className="absolute inset-0 flex flex-col items-center justify-center" style={{ zIndex: 10 }}>

        {/* Logo — brightness boost for contrast */}
        <img
          src="/logo2.png"
          alt="Studio Dancers"
          style={{
            width: 'clamp(100px, 18vw, 170px)',
            height: 'auto',
            objectFit: 'contain',
            marginBottom: '1.1rem',
            filter: 'brightness(1.5) saturate(1.1) drop-shadow(0 0 14px rgba(220,120,160,0.6)) drop-shadow(0 0 32px rgba(200,80,120,0.35))',
          }}
        />

        {/* Clock */}
        <div
          className="font-mono font-extralight text-white tracking-widest"
          style={{ fontSize: 'clamp(3.2rem, 11vw, 6rem)', lineHeight: 1,
            textShadow: '0 0 24px rgba(210,120,150,0.35), 0 2px 12px rgba(0,0,0,0.9)' }}
        >
          {H}:{M}
          <span style={{ fontSize: '0.38em', opacity: 0.3, letterSpacing: '0.08em' }}> :{S}</span>
        </div>

        {/* Date */}
        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', marginTop: '0.45rem',
          fontWeight: 300, letterSpacing: '0.04em' }}>
          {dateStr}
        </p>

        {/* Studio name in gold */}
        <p style={{ color: '#c9a84c', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.22em',
          textTransform: 'uppercase', marginTop: '0.55rem', marginBottom: '1.8rem',
          textShadow: '0 0 12px rgba(201,168,76,0.5)' }}>
          {schoolName}
        </p>

        {/* PIN Card */}
        <div style={{ width: '100%', maxWidth: '280px', padding: '0 1rem' }}>
          <form onSubmit={handleSubmit}>
            <div style={{
              background: 'rgba(255,255,255,0.06)',
              backdropFilter: 'blur(16px)',
              border: '1px solid rgba(255,255,255,0.11)',
              borderRadius: '18px',
              padding: '1.25rem 1.25rem 1.35rem',
            }}>
              {/* Label */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '0.45rem', marginBottom: '0.85rem' }}>
                <Lock size={13} style={{ color: 'rgba(255,255,255,0.4)' }} />
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.78rem', letterSpacing: '0.03em' }}>
                  Ingresa el PIN para desbloquear
                </span>
              </div>

              {/* PIN input */}
              <input
                ref={inputRef}
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                autoComplete="new-password"
                maxLength={6}
                className="pin-input"
                value={pin}
                onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError('') }}
                disabled={blocked}
                placeholder="• • • •"
                style={{
                  width: '100%',
                  padding: '0.6rem 1rem',
                  background: 'rgba(255,255,255,0.10)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: '12px',
                  textAlign: 'center',
                  fontSize: '1.6rem',
                  letterSpacing: '0.55em',
                  color: 'white',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={e => { e.target.style.borderColor = 'rgba(201,168,76,0.55)'; e.target.style.boxShadow = '0 0 0 2px rgba(201,168,76,0.20)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(255,255,255,0.18)'; e.target.style.boxShadow = 'none' }}
              />

              {/* Error / block message */}
              {error && (
                <p style={{ color: '#fca5a5', fontSize: '0.72rem', marginTop: '0.55rem', textAlign: 'center' }}>
                  {error}
                </p>
              )}
              {blocked && blockTimer > 0 && (
                <p style={{ color: '#fde68a', fontSize: '0.72rem', marginTop: '0.35rem', textAlign: 'center' }}>
                  Disponible en {blockTimer}s
                </p>
              )}

              {/* Submit button */}
              <button
                type="submit"
                disabled={pin.length < 4 || blocked}
                style={{
                  marginTop: '0.9rem',
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  padding: '0.62rem',
                  borderRadius: '11px',
                  background: pin.length >= 4 && !blocked
                    ? 'linear-gradient(135deg, #7a1a38 0%, #551735 100%)'
                    : 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(201,168,76,0.3)',
                  color: pin.length >= 4 && !blocked ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.3)',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  letterSpacing: '0.04em',
                  cursor: pin.length < 4 || blocked ? 'not-allowed' : 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Unlock size={13} />
                Desbloquear
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Bottom branding */}
      <p className="absolute bottom-3 left-0 right-0 text-center"
        style={{ color: 'rgba(255,255,255,0.18)', fontSize: '0.68rem', zIndex: 10, letterSpacing: '0.06em' }}>
        Studio Dancers · Sistema de Administración
      </p>
    </div>
  )
}
