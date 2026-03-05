import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import ClientPortalApp from './components/ClientPortal/ClientPortalApp'

// Portal del cliente: accesible en ?portal (o ?portal=1, &portal, etc.)
// La admin app es la ruta por defecto (sin ?portal en la URL)
const isPortal = window.location.search.includes('portal') ||
                 window.location.hash === '#portal'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isPortal ? <ClientPortalApp /> : <App />}
  </StrictMode>,
)
