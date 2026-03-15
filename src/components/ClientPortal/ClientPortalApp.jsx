import { useState, useEffect } from 'react'
import { getPortalAuth, savePortalAuth, clearPortalAuth } from '../../lib/adultas'
import { COURSES } from '../../lib/courses'
import ClientLoginPage from './ClientLoginPage'
import AdultDashboard from './AdultDashboard'
import NinasDashboard from './NinasDashboard'

// IDs de cursos adultas (solo Ballet Adultos — tienen Bienestar, Retos, Diario, etc.)
const ADULTAS_IDS = new Set(COURSES.map(c => c.id))
const isAdulta = (student) => ADULTAS_IDS.has(student?.course_id)

/**
 * ClientPortalApp — La app "Mi Studio" para alumnas.
 * Detecta si la alumna es adulta o niña y muestra el dashboard correcto.
 * Se activa cuando la URL contiene ?portal (o variantes).
 *
 * Auth flow:
 * 1. Verificar sessionStorage para sesión guardada
 * 2. Si no hay sesión → mostrar login
 * 3. Si hay sesión y hay múltiples alumnos → mostrar selector
 * 4. Si hay sesión con un solo alumno → mostrar dashboard
 */
export default function ClientPortalApp() {
  const [auth, setAuth] = useState(null)            // { cedula, phone4, students: [...] }
  const [selectedStudent, setSelectedStudent] = useState(null)  // student object
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Restaurar sesión guardada
    const saved = getPortalAuth()
    if (saved) {
      setAuth(saved)
      // Si solo hay un alumno, seleccionarlo automáticamente
      if (saved.students?.length === 1) {
        setSelectedStudent(saved.students[0])
      }
    }
    setReady(true)
  }, [])

  const handleLogin = (authData) => {
    setAuth(authData)
    if (authData.students?.length === 1) {
      setSelectedStudent(authData.students[0])
    }
  }

  const handleLogout = () => {
    clearPortalAuth()
    setAuth(null)
    setSelectedStudent(null)
  }

  const handleSelectStudent = (student) => {
    setSelectedStudent(student)
    // Actualizar auth guardado con el alumno seleccionado
    if (auth) {
      savePortalAuth({ ...auth, lastStudentId: student.id })
    }
  }

  if (!ready) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(160deg, #7B2D8E 0%, #3a0d4a 100%)' }}
      >
        <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  // No autenticado
  if (!auth) {
    return <ClientLoginPage onLogin={handleLogin} />
  }

  // Múltiples alumnos — mostrar selector
  if (!selectedStudent && auth.students?.length > 1) {
    return <StudentSelector students={auth.students} onSelect={handleSelectStudent} onLogout={handleLogout} />
  }

  // Dashboard principal — diferenciado por tipo de alumna
  if (selectedStudent) {
    const sharedProps = {
      student: selectedStudent,
      auth,
      onLogout: handleLogout,
      allStudents: auth.students,
    }
    return isAdulta(selectedStudent)
      ? <AdultDashboard {...sharedProps} />
      : <NinasDashboard {...sharedProps} />
  }

  // Fallback: volver al login
  return <ClientLoginPage onLogin={handleLogin} />
}

// ── Selector de alumno (si hay múltiples registros) ──────────────
function StudentSelector({ students, onSelect, onLogout }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-4"
      style={{ background: 'linear-gradient(160deg, #7B2D8E 0%, #3a0d4a 100%)' }}
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
          Encontramos más de una alumna con estos datos. Selecciona tu nombre.
        </p>

        <div className="space-y-2">
          {students.map(s => (
            <button
              key={s.id}
              onClick={() => onSelect(s)}
              className="w-full text-left px-4 py-3.5 rounded-xl border-2 border-gray-100 hover:border-purple-300 hover:bg-purple-50 transition-all"
            >
              <p className="font-semibold text-gray-800">{s.name}</p>
              <p className="text-xs text-gray-500">{s.course_name || s.course_id}</p>
            </button>
          ))}
        </div>

        <button
          onClick={onLogout}
          className="w-full mt-4 py-2.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  )
}
