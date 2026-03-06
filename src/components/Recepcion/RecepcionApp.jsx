import { useState } from 'react'
import RecepcionLogin from './RecepcionLogin'
import RecepcionDashboard from './RecepcionDashboard'

export default function RecepcionApp() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem('recepcion_auth') === '1'
  )

  const handleLogout = () => {
    sessionStorage.removeItem('recepcion_auth')
    setAuthed(false)
  }

  if (!authed) return <RecepcionLogin onLogin={() => setAuthed(true)} />
  return <RecepcionDashboard onLogout={handleLogout} />
}
