import { Suspense, createElement, lazy } from 'react'

// Carga un componente bajo demanda (code-splitting) ya envuelto en su propio
// Suspense, para que el lugar donde se usa no cambie. Pensado para modales y
// paneles que arrastran librerías pesadas (xlsx, jspdf) y no siempre se abren.
export function lazyLoad(factory, fallback = null) {
  const LazyComponent = lazy(factory)
  function LazyLoaded(props) {
    return createElement(Suspense, { fallback }, createElement(LazyComponent, props))
  }
  return LazyLoaded
}
