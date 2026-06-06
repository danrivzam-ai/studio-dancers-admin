import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'

// Cuando el service worker instala una nueva versión, recarga la página
// automáticamente para que el usuario vea los cambios sin intervención manual.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}
import App from './App.jsx'
import ClientPortalApp from './components/ClientPortal/ClientPortalApp'
import RecepcionApp from './components/Recepcion/RecepcionApp'
import InstructoraApp from './components/Instructora/InstructoraApp'
import LandingPage from './components/LandingPage'
import { ToastProvider } from './components/Toast'
import { ModalProvider } from './context/ModalContext'

const params = window.location.search

// Portal de recepción: ?recepcion
const isRecepcion = params.includes('recepcion')
// Portal del cliente: ?portal
const isPortal = !isRecepcion && (params.includes('portal') || window.location.hash === '#portal')
// Directorio de aliados (público): ?aliados
const isAliados = !isRecepcion && !isPortal && params.includes('aliados')
// Portal de instructoras: ?instructora
const isInstructora = !isRecepcion && !isPortal && !isAliados && params.includes('instructora')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ModalProvider>
      <ToastProvider>
        {isRecepcion ? <RecepcionApp />
          : isPortal ? <ClientPortalApp />
          : isAliados ? <LandingPage />
          : isInstructora ? <InstructoraApp />
          : <App />}
      </ToastProvider>
    </ModalProvider>
  </StrictMode>,
)
