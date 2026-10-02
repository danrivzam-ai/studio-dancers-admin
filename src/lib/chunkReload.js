// Errores típicos cuando la app abierta pide un archivo de una versión anterior
// (después de publicar, los nombres de los archivos cambian). "reading 'default'" aparece
// cuando el servidor devuelve otra cosa en lugar del archivo pedido.
const CHUNK_ERROR = /dynamically imported module|Importing a module script failed|error loading dynamically imported module|Failed to fetch|Unable to preload CSS|ChunkLoadError|reading 'default'/i
const RELOAD_KEY = 'sd-chunk-reload'

export function isChunkLoadError(error) {
  return CHUNK_ERROR.test(String(error?.message || error || ''))
}

// Recarga una sola vez por sesión para tomar la versión nueva (evita bucles)
export function reloadOnceForNewVersion() {
  try {
    if (sessionStorage.getItem(RELOAD_KEY)) return false
    sessionStorage.setItem(RELOAD_KEY, '1')
  } catch { /* sin almacenamiento: recargar igual */ }
  window.location.reload()
  return true
}

// Tras unos segundos funcionando bien, se permite otra recarga automática
// (por si se publica otra versión durante la misma sesión)
export function clearReloadFlagLater(ms = 15000) {
  setTimeout(() => { try { sessionStorage.removeItem(RELOAD_KEY) } catch { /* nada */ } }, ms)
}
