import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ClientPortalApp from './components/ClientPortal/ClientPortalApp'
import RecepcionApp from './components/Recepcion/RecepcionApp'

const params = window.location.search

// Portal de recepción: ?recepcion
const isRecepcion = params.includes('recepcion')
// Portal del cliente: ?portal
const isPortal = !isRecepcion && (params.includes('portal') || window.location.hash === '#portal')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isRecepcion ? <RecepcionApp /> : isPortal ? <ClientPortalApp /> : <App />}
  </StrictMode>,
)
