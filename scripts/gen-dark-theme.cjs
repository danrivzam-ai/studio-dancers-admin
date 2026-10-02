// Genera src/styles/theme-dark.css a partir de la paleta por defecto de Tailwind 4.
// Uso: node scripts/gen-dark-theme.cjs  (volver a correr si se actualiza Tailwind o la paleta)
const fs = require('fs')
const theme = fs.readFileSync('node_modules/tailwindcss/theme.css', 'utf8')
const defaults = {}
for (const m of theme.matchAll(/--color-([a-z]+)-(\d+):\s*([^;]+);/g)) {
  (defaults[m[1]] ||= {})[m[2]] = m[3].trim()
}
// purple está remapeado a guinda en index.css
defaults.purple = { 50: '#fdf2f7', 100: '#f9e8f0', 200: '#f0c4d8', 300: '#e8b4cc', 400: '#c07a9a', 500: '#9e4a72', 600: '#7e2d55', 700: '#6b2145', 800: '#551735', 900: '#3d0f26', 950: '#2a0a1a' }

const NEUTRALS = ['gray', 'slate', 'zinc', 'neutral', 'stone']
const CHROMATIC = Object.keys(defaults).filter(h => !NEUTRALS.includes(h))
const STOPS = ['50', '100', '200', '300', '400', '500', '600', '700', '800', '900', '950']

// Grises oscuros con un toque cálido (familia guinda)
const DARK_NEUTRAL = { 50: '#1c1619', 100: '#241c20', 200: '#31272c', 300: '#43383e', 400: '#6e6168', 500: '#968990', 600: '#b4a8ae', 700: '#cfc4c9', 800: '#e6dde1', 900: '#f4eef1', 950: '#faf7f8' }
const BASE = '#1c1619'

let dark = ''
let light = ''
for (const hue of [...NEUTRALS, ...CHROMATIC]) {
  const d = defaults[hue]; if (!d) continue
  for (const st of STOPS) {
    if (!d[st]) continue
    light += `  --color-${hue}-${st}: ${d[st]};\n`
    let v
    if (NEUTRALS.includes(hue)) v = DARK_NEUTRAL[st]
    else if (st === '50') v = `color-mix(in oklab, ${d['500']} 14%, ${BASE})`
    else if (st === '100') v = `color-mix(in oklab, ${d['500']} 22%, ${BASE})`
    else if (st === '200') v = `color-mix(in oklab, ${d['500']} 34%, ${BASE})`
    else if (st === '300') v = `color-mix(in oklab, ${d['500']} 55%, ${BASE})`
    else if (st === '700') v = d['300']
    else if (st === '800') v = d['200']
    else if (st === '900') v = d['100']
    else if (st === '950') v = d['50']
    else v = d[st] // 400/500/600 se mantienen
    dark += `  --color-${hue}-${st}: ${v};\n`
  }
}

const esc = (c) => c.replace(/([\[\]#/:.])/g, '\\$1')
const map = (cls, prop, value, variants = ['']) => variants.map(v => {
  const pseudo = v === 'hover:' ? ':hover' : v === 'focus:' ? ':focus' : v === 'focus-within:' ? ':focus-within' : ''
  return `  .dark .${esc(v + cls)}${pseudo} { ${prop}: ${value}; }`
}).join('\n')

const overrides = [
  // Blanco como superficie (text-white se mantiene blanco)
  map('bg-white', 'background-color', 'var(--sd-surface)', ['', 'hover:']),
  map('bg-white/95', 'background-color', 'color-mix(in oklab, var(--sd-surface) 95%, transparent)'),
  map('bg-white/90', 'background-color', 'color-mix(in oklab, var(--sd-surface) 90%, transparent)'),
  map('bg-white/80', 'background-color', 'color-mix(in oklab, var(--sd-surface) 80%, transparent)'),
  map('bg-white/70', 'background-color', 'color-mix(in oklab, var(--sd-surface) 70%, transparent)'),
  map('bg-gray-100/80', 'background-color', 'var(--sd-surface-alt)'),
  // Rosados claros de marca → tinte guinda oscuro
  ...['#fdf5f9', '#f9e8f0', '#fdf2f7', '#f2e8ed', '#f0f4fa'].map(h => map(`bg-[${h}]`, 'background-color', 'var(--sd-brand-soft)', ['', 'hover:'])),
  // Texto guinda oscuro → rosa claro legible
  ...['#551735', '#441029', '#6b2145', '#7e2d55', '#9e4d75', '#3a0f24', '#a05c7e', '#1e3a5f'].map(h => map(`text-[${h}]`, 'color', 'var(--sd-brand-ink)', ['', 'hover:'])),
  // Rellenos guinda → guinda un poco más claro para que se distinga del fondo
  ...['#551735', '#6b2145', '#441029'].map(h => map(`bg-[${h}]`, 'background-color', 'var(--sd-brand)', ['', 'hover:'])),
  // Bordes rosados → línea
  ...['#e8b4cc', '#f9e8f0', '#c98daa', '#dce4f0', '#9e4d75'].map(h => map(`border-[${h}]`, 'border-color', 'var(--sd-line-strong)', ['', 'hover:', 'focus:', 'focus-within:'])),
  // Anillos de foco rosados
  ...['#f9e8f0', '#c98daa'].map(h => map(`ring-[${h}]`, '--tw-ring-color', 'var(--sd-brand-soft)', ['', 'focus:', 'focus-within:'])),
].join('\n')

const css = `/* ═══════════════════════════════════════════════════════════════════════════
   Modo oscuro — GENERADO por un script a partir de la paleta de Tailwind 4.
   Funciona por variables: .dark redefine tokens y paleta; .force-light restaura
   los valores claros (recibos y reportes que se exportan como imagen).
   ═══════════════════════════════════════════════════════════════════════════ */

:root.dark {
  color-scheme: dark;
  --sd-paper: #141012;
  --sd-surface: #1c1619;
  --sd-surface-alt: #241c20;
  --sd-ink: #f1e9ed;
  --sd-ink-soft: #c7b9c0;
  --sd-ink-muted: #95878e;
  --sd-line: #31272c;
  --sd-line-strong: #43383e;
  --sd-brand: #8a2c5a;
  --sd-brand-hover: #9c3566;
  --sd-brand-soft: #3a1e2b;
  --sd-brand-ink: #f0b3cd;
  --sd-ok: #5fcf94;     --sd-ok-soft: #163626;
  --sd-warn: #f0b257;   --sd-warn-soft: #3a2a12;
  --sd-danger: #ff8a7a; --sd-danger-soft: #3d1a17;
  --sd-shadow: 0 1px 2px rgb(0 0 0 / 0.4);
${dark}}

/* Contenido que se exporta como imagen o se imprime: siempre claro */
.force-light {
  color-scheme: light;
  --sd-paper: #f7f3f1;
  --sd-surface: #ffffff;
  --sd-surface-alt: #faf7f6;
  --sd-ink: #2a1a21;
  --sd-ink-soft: #5c4a52;
  --sd-ink-muted: #8f7f86;
  --sd-line: #ebe3e0;
  --sd-line-strong: #d9ccc8;
  --sd-brand: #551735;
  --sd-brand-hover: #6b2145;
  --sd-brand-soft: #f6e9ef;
  --sd-brand-ink: #551735;
  --sd-ok: #1f7a4d;     --sd-ok-soft: #e7f4ec;
  --sd-warn: #a15c07;   --sd-warn-soft: #fbf1e1;
  --sd-danger: #b42318; --sd-danger-soft: #fdecea;
  color: var(--sd-ink);
${light}}

@layer utilities {
${overrides}
}
`
fs.mkdirSync('src/styles', { recursive: true })
fs.writeFileSync('src/styles/theme-dark.css', css)
console.log('ok', CHROMATIC.length, 'hues', css.length, 'bytes')
