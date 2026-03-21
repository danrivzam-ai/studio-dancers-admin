import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ClientPortalApp from './components/ClientPortal/ClientPortalApp'
import RecepcionApp from './components/Recepcion/RecepcionApp'
import InstructoraApp from './components/Instructora/InstructoraApp'
import LandingPage from './components/LandingPage'
import ClasesOnlineApp from './components/ClasesOnline/ClasesOnlineApp'
import { ToastProvider } from './components/Toast'

const params = window.location.search

// Portal de recepción: ?recepcion
const isRecepcion = params.includes('recepcion')
// Portal del cliente: ?portal
const isPortal = !isRecepcion && (params.includes('portal') || window.location.hash === '#portal')
// Directorio de aliados (público): ?aliados
const isAliados = !isRecepcion && !isPortal && params.includes('aliados')
// Portal de instructoras: ?instructora
const isInstructora = !isRecepcion && !isPortal && !isAliados && params.includes('instructora')
// Clases online: ?clases
const isClases = !isRecepcion && !isPortal && !isAliados && !isInstructora && params.includes('clases')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ToastProvider>
      {isRecepcion ? <RecepcionApp />
        : isPortal ? <ClientPortalApp />
        : isAliados ? <LandingPage />
        : isInstructora ? <InstructoraApp />
        : isClases ? <ClasesOnlineApp />
        : <App />}
    </ToastProvider>
  </StrictMode>,
)
