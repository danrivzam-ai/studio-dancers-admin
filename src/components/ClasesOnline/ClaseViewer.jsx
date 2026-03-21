import { useState, useEffect, useRef, useCallback } from 'react'
import { LogOut, Clock, RefreshCw, Film, Video, AlertCircle } from 'lucide-react'
import { useClasesOnline } from '../../hooks/useClasesOnline'

// ── Countdown timer ─────────────────────────────────────────────
function Countdown({ expiresAt }) {
  const [text, setText] = useState('')
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt) - new Date()
      if (diff <= 0) {
        setText('Expirada')
        setExpired(true)
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setText(`${h}h ${m}m ${s}s`)
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  if (expired) return null

  return (
    <div className="flex items-center gap-1.5 text-xs text-white/70">
      <Clock size={12} />
      <span>Disponible por {text}</span>
    </div>
  )
}

// ── Video Player with auto-refresh of signed URL ────────────────
function VideoPlayer({ classId, getVideoUrl }) {
  const videoRef = useRef(null)
  const [videoUrl, setVideoUrl] = useState(null)
  const [loadingUrl, setLoadingUrl] = useState(true)
  const [urlError, setUrlError] = useState(null)

  const fetchUrl = useCallback(async () => {
    const result = await getVideoUrl(classId)
    if (result.success) {
      setVideoUrl(result.videoUrl)
      setUrlError(null)
    } else {
      setUrlError(result.error)
    }
    setLoadingUrl(false)
  }, [classId, getVideoUrl])

  useEffect(() => {
    fetchUrl()
    // Refrescar URL cada 90 minutos
    const interval = setInterval(fetchUrl, 90 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchUrl])

  if (loadingUrl) {
    return (
      <div className="aspect-video bg-black/40 rounded-2xl flex items-center justify-center">
        <div className="w-8 h-8 border-3 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  if (urlError) {
    return (
      <div className="aspect-video bg-black/20 rounded-2xl flex items-center justify-center p-4">
        <div className="text-center text-white/70">
          <AlertCircle size={24} className="mx-auto mb-2 text-red-400" />
          <p className="text-sm">Error al cargar el video</p>
          <button onClick={fetchUrl} className="mt-2 text-xs text-purple-300 underline">Reintentar</button>
        </div>
      </div>
    )
  }

  return (
    <video
      ref={videoRef}
      src={videoUrl}
      controls
      controlsList="nodownload noremoteplayback"
      disablePictureInPicture
      playsInline
      className="w-full aspect-video bg-black rounded-2xl"
      style={{ maxHeight: '70vh' }}
    >
      Tu navegador no soporta video HTML5.
    </video>
  )
}

// ── Main viewer component ───────────────────────────────────────
export default function ClaseViewer({ student, onLogout }) {
  const {
    dailyClass, weeklyClass, loading,
    fetchActiveClasses, getVideoUrl,
  } = useClasesOnline()

  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    fetchActiveClasses()
  }, [fetchActiveClasses])

  // Auto-refresh cada 5 minutos para detectar nuevas clases
  useEffect(() => {
    const interval = setInterval(fetchActiveClasses, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [fetchActiveClasses])

  const handleRefresh = async () => {
    setRefreshing(true)
    await fetchActiveClasses()
    setTimeout(() => setRefreshing(false), 500)
  }

  // Verificar si la clase daily ya expiró (client-side)
  const isDailyExpired = dailyClass && new Date(dailyClass.expires_at) < new Date()

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: 'linear-gradient(160deg, #551735 0%, #1a0a12 100%)' }}
    >
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-3">
          <img
            src="/logo-white.png"
            alt="Studio Dancers"
            className="h-8"
            style={{ filter: 'drop-shadow(0 2px 6px rgba(0,0,0,0.3))' }}
            onError={e => { e.target.src = '/logo2.png' }}
          />
          <div>
            <p className="text-white text-sm font-semibold leading-tight">Clases Online</p>
            <p className="text-white/50 text-xs">{student?.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className="p-2 text-white/50 hover:text-white transition-colors"
            title="Actualizar"
          >
            <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          </button>
          <button
            onClick={onLogout}
            className="p-2 text-white/50 hover:text-white transition-colors"
            title="Salir"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-6 max-w-2xl mx-auto w-full space-y-6">
        {loading && !dailyClass && !weeklyClass ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Video semanal */}
            {weeklyClass && (
              <section>
                <div className="flex items-center gap-2 mb-3">
                  <Film size={16} className="text-purple-300" />
                  <h2 className="text-sm font-semibold text-white/80">
                    {weeklyClass.title || 'Lo que trabajamos esta semana'}
                  </h2>
                </div>
                <VideoPlayer classId={weeklyClass.id} getVideoUrl={getVideoUrl} />
              </section>
            )}

            {/* Clase del día */}
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Video size={16} className="text-purple-300" />
                <h2 className="text-sm font-semibold text-white/80">Clase del día</h2>
              </div>

              {dailyClass && !isDailyExpired ? (
                <div className="space-y-3">
                  {dailyClass.title && (
                    <p className="text-white/60 text-sm">{dailyClass.title}</p>
                  )}
                  <VideoPlayer classId={dailyClass.id} getVideoUrl={getVideoUrl} />
                  <div className="flex justify-center">
                    <Countdown expiresAt={dailyClass.expires_at} />
                  </div>
                </div>
              ) : isDailyExpired || (dailyClass && !dailyClass.active) ? (
                /* Clase expirada */
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/10">
                  <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                    <Clock size={24} className="text-white/40" />
                  </div>
                  <p className="text-white/80 font-medium mb-1">La clase de hoy ya no está disponible</p>
                  <p className="text-white/40 text-sm">Hasta mañana.</p>
                </div>
              ) : (
                /* Sin clase subida */
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-8 text-center border border-white/10">
                  <div className="w-14 h-14 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-4">
                    <Video size={24} className="text-white/40" />
                  </div>
                  <p className="text-white/80 font-medium mb-1">La clase de hoy estará disponible pronto</p>
                  <p className="text-white/40 text-sm">Te avisaremos cuando esté lista.</p>
                  <button
                    onClick={handleRefresh}
                    className="mt-4 text-xs text-purple-300 hover:text-purple-200 transition-colors flex items-center gap-1 mx-auto"
                  >
                    <RefreshCw size={12} />
                    Actualizar
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="text-center py-4">
        <p className="text-white/20 text-xs">Studio Dancers © {new Date().getFullYear()}</p>
      </footer>
    </div>
  )
}
