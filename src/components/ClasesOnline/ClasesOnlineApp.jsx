import { useState, useEffect } from 'react'
import { getPortalSession, signOutPortal } from '../../lib/adultas'
import ClasesLoginPage, { getClasesAuth, saveClasesAuth, clearClasesAuth } from './ClasesLoginPage'
import ClaseViewer from './ClaseViewer'

/**
 * ClasesOnlineApp — App de clases grabadas para alumnas.
 * Se activa con ?clases en la URL.
 *
 * Auth flow (idéntico a ClientPortalApp):
 * 1. Verificar sessionStorage para sesión guardada
 * 2. Si no hay sesión → mostrar login
 * 3. Si hay múltiples alumnas → mostrar selector
 * 4. Si hay una sola → mostrar ClaseViewer
 */
export default function ClasesOnlineApp() {
  const [auth, setAuth] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const restoreSession = async () => {
      const session = await getPortalSession()
      const saved = getClasesAuth()

      const isPortalSession = session?.user?.app_metadata?.portal_role === 'alumna'

      if (session && isPortalSession && saved) {
        setAuth(saved)
        if (saved.students?.length === 1) {
          setSelectedStudent(saved.students[0])
        }
      } else {
        if (saved) clearClasesAuth()
      }
      setReady(true)
    }
    restoreSession()
  }, [])

  const handleLogin = (authData) => {
    setAuth(authData)
    if (authData.students?.length === 1) {
      setSelectedStudent(authData.students[0])
    }
  }

  const handleLogout = async () => {
    await signOutPortal()
    clearClasesAuth()
    setAuth(null)
    setSelectedStudent(null)
  }

  const handleSelectStudent = (student) => {
    setSelectedStudent(student)
    if (auth) saveClasesAuth({ ...auth, lastStudentId: student.id })
  }

  // Loading
  if (!ready) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #551735 0%, #1a0a12 100%)' }}
      >
        <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  // Not authenticated
  if (!auth) {
    return <ClasesLoginPage onLogin={handleLogin} />
  }

  // Multiple students → selector
  if (!selectedStudent && auth.students?.length > 1) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-4"
        style={{ background: 'linear-gradient(160deg, #551735 0%, #1a0a12 100%)' }}
      >
        <img
          src="/logo-white.png"
          alt="Studio Dancers"
          className="h-12 mb-6"
          style={{ filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))' }}
          onError={e => { e.target.src = '/logo2.png' }}
        />

        <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-1">¿Quién eres?</h2>
          <p className="text-sm text-gray-500 mb-4">
            Encontramos más de una alumna. Selecciona tu nombre.
          </p>

          <div className="space-y-2">
            {auth.students.map(s => (
              <button
                key={s.id}
                onClick={() => handleSelectStudent(s)}
                className="w-full text-left px-4 py-3.5 rounded-xl border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50 transition-all"
              >
                <p className="font-semibold text-gray-800">{s.name}</p>
                <p className="text-xs text-gray-500">{s.course_name || s.course_id}</p>
              </button>
            ))}
          </div>

          <button
            onClick={handleLogout}
            className="w-full mt-4 py-2.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    )
  }

  // Main viewer
  if (selectedStudent) {
    return <ClaseViewer student={selectedStudent} onLogout={handleLogout} />
  }

  // Fallback
  return <ClasesLoginPage onLogin={handleLogin} />
}
