import { StrictMode, Suspense, lazy } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { applyTheme, watchSystemTheme } from './lib/theme'

// Tema antes del primer render: evita el destello blanco en modo oscuro
applyTheme()
watchSystemTheme()

// Cuando el service worker instala una nueva versión, recarga la página
// automáticamente para que el usuario vea los cambios sin intervención manual.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}
import { ToastProvider } from './components/Toast'
import { ModalProvider } from './context/ModalContext'

const params = window.location.search

// Portal de recepción: ?recepcion
const isRecepcion = params.includes('recepcion')
// Directorio de aliados (público): ?aliados
const isAliados = !isRecepcion && params.includes('aliados')
// Portal de instructoras: ?instructora
const isInstructora = !isRecepcion && !isAliados && params.includes('instructora')

// Cada app se carga por separado: una instructora o la recepción no descargan
// el panel administrativo completo. (El portal de alumnas vive en su propio repo.)
// Un lazy() por app: si se agrupan en un solo import() con ternario, Vite
// precarga los archivos del panel admin para todas.
const SelectedApp = isRecepcion ? lazy(() => import('./components/Recepcion/RecepcionApp'))
  : isAliados ? lazy(() => import('./components/LandingPage'))
  : isInstructora ? lazy(() => import('./components/Instructora/InstructoraApp'))
  : lazy(() => import('./App.jsx'))

const appLoading = (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <div className="w-10 h-10 rounded-full border-4 border-[#f9e8f0] border-t-[#551735] animate-spin" />
  </div>
)

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ModalProvider>
      <ToastProvider>
        <Suspense fallback={appLoading}>
          <SelectedApp />
        </Suspense>
      </ToastProvider>
    </ModalProvider>
  </StrictMode>,
)
