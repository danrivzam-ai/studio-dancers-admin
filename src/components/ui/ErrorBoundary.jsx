import { Component } from 'react'
import { isChunkLoadError, reloadOnceForNewVersion } from '../../lib/chunkReload'

// Evita la pantalla en blanco: si algo falla al mostrar una pantalla, se ve un
// aviso con "Recargar" y el detalle del error. `compact` = aviso dentro de un modal.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info?.componentStack)
    if (isChunkLoadError(error)) reloadOnceForNewVersion()
  }

  render() {
    const { error } = this.state
    if (!error) return this.props.children

    const chunk = isChunkLoadError(error)
    const box = (
      <div className="sd-card max-w-sm w-full p-5 text-center">
        <p className="text-base font-bold text-brand-ink">
          {chunk ? 'Hay una versión nueva' : 'Algo salió mal al mostrar esta pantalla'}
        </p>
        <p className="text-sm text-ink-soft mt-1.5">
          {chunk ? 'Recarga para usar la versión actualizada.' : 'Tus datos están a salvo. Recarga para continuar.'}
        </p>
        <button onClick={() => window.location.reload()} className="sd-btn sd-btn-primary sd-btn-full mt-4">
          Recargar
        </button>
        {!chunk && (
          <p className="text-[11px] text-ink-muted mt-3 break-words">Detalle: {String(error?.message || error)}</p>
        )}
      </div>
    )

    if (this.props.compact) {
      return (
        <div className="fixed inset-0 z-[80] bg-[#1a0010]/60 flex items-center justify-center p-4">{box}</div>
      )
    }
    return <div className="min-h-screen bg-paper flex items-center justify-center p-4">{box}</div>
  }
}
