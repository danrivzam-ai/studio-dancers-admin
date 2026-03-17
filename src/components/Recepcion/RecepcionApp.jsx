import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import RecepcionLogin from './RecepcionLogin'
import App from '../../App'

export default function RecepcionApp() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem('recepcion_auth') === '1'
  )
  const [userName, setUserName] = useState(
    () => sessionStorage.getItem('recepcion_name') || ''
  )

  // Defensa: si hay sesión de Supabase Auth de un shadow user del portal, cerrarla
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.app_metadata?.portal_role === 'alumna') {
        supabase.auth.signOut()
      }
    })
  }, [])

  const handleLogout = () => {
    sessionStorage.removeItem('recepcion_auth')
    sessionStorage.removeItem('recepcion_name')
    setAuthed(false)
    setUserName('')
  }

  if (!authed) return <RecepcionLogin onLogin={(name) => { setUserName(name); setAuthed(true) }} />
  return <App isRecepcion={true} userName={userName} onLogout={handleLogout} />
}
