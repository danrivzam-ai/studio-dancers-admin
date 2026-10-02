// Tema claro / oscuro / sistema. La preferencia es por dispositivo (localStorage);
// si el almacenamiento no está disponible se usa la del sistema.
const KEY = 'sd-theme'
const media = typeof window !== 'undefined' && window.matchMedia
  ? window.matchMedia('(prefers-color-scheme: dark)')
  : null

export function getThemePref() {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'light' || v === 'dark' ? v : 'system'
  } catch {
    return 'system'
  }
}

export function applyTheme(pref = getThemePref()) {
  const dark = pref === 'dark' || (pref === 'system' && !!media?.matches)
  document.documentElement.classList.toggle('dark', dark)
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#141012' : '#551735')
  return dark
}

export function setThemePref(pref) {
  try {
    if (pref === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, pref)
  } catch { /* sin almacenamiento: solo aplica en esta sesión */ }
  applyTheme(pref)
}

// Si la preferencia es "sistema", seguir los cambios del sistema en vivo
export function watchSystemTheme() {
  if (!media) return () => {}
  const onChange = () => { if (getThemePref() === 'system') applyTheme('system') }
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}
