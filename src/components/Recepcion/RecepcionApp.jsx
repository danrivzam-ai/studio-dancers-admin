import { useState } from 'react'
import RecepcionLogin from './RecepcionLogin'
import App from '../../App'

export default function RecepcionApp() {
  const [authed, setAuthed] = useState(
    () => sessionStorage.getItem('recepcion_auth') === '1'
  )
  const [userName, setUserName] = useState(
    () => sessionStorage.getItem('recepcion_name') || ''
  )

  const handleLogout = () => {
    sessionStorage.removeItem('recepcion_auth')
    sessionStorage.removeItem('recepcion_name')
    setAuthed(false)
    setUserName('')
  }

  if (!authed) return <RecepcionLogin onLogin={(name) => { setUserName(name); setAuthed(true) }} />
  return <App isRecepcion={true} userName={userName} onLogout={handleLogout} />
}
