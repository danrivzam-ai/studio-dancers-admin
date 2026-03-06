import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ClientPortalApp from './components/ClientPortal/ClientPortalApp'
import RecepcionApp from './components/Recepcion/RecepcionApp'
import LandingPage from './components/LandingPage'

const params = window.location.search

// Portal de recepción: ?recepcion
const isRecepcion = params.includes('recepcion')
// Portal del cliente: ?portal
const isPortal = !isRecepcion && (params.includes('portal') || window.location.hash === '#portal')
// Directorio de aliados (público): ?aliados
const isAliados = !isRecepcion && !isPortal && params.includes('aliados')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isRecepcion ? <RecepcionApp />
      : isPortal ? <ClientPortalApp />
      : isAliados ? <LandingPage />
      : <App />}
  </StrictMode>,
)
