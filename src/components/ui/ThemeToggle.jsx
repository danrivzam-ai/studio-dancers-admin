import { useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { getThemePref, setThemePref } from '../../lib/theme'

const NEXT = { light: 'dark', dark: 'system', system: 'light' }
const LABEL = { light: 'Tema claro', dark: 'Tema oscuro', system: 'Tema del sistema' }
const ICON = { light: Sun, dark: Moon, system: Monitor }

// Botón que alterna claro → oscuro → sistema
export default function ThemeToggle({ className = '' }) {
  const [pref, setPref] = useState(getThemePref)
  const Icon = ICON[pref]
  return (
    <button
      type="button"
      onClick={() => { const next = NEXT[pref]; setThemePref(next); setPref(next) }}
      className={className}
      title={`${LABEL[pref]} (toca para cambiar)`}
      aria-label={`${LABEL[pref]}. Cambiar tema`}
    >
      <Icon size={18} />
    </button>
  )
}
