/**
 * StatusBadge — Pill-shaped colored badge for status labels.
 *
 * Usage:
 *   <StatusBadge color="red">Vencida</StatusBadge>
 *   <StatusBadge color="green" size="sm">Al día</StatusBadge>
 *
 * Props:
 *   color   — 'green' | 'red' | 'amber' | 'rose' | 'blue' | 'purple' | 'gray' | 'orange' | 'yellow' | 'slate'
 *   size    — 'sm' (default) | 'xs'
 *   className — extra classes merged onto the badge
 */

const COLORS = {
  green:  'bg-green-100 text-green-700',
  emerald:'bg-emerald-100 text-emerald-700',
  red:    'bg-red-100 text-red-700',
  amber:  'bg-amber-100 text-amber-700',
  rose:   'bg-rose-100 text-rose-700',
  blue:   'bg-blue-100 text-blue-700',
  purple: 'bg-purple-100 text-purple-700',
  gray:   'bg-gray-200 text-gray-700',
  orange: 'bg-orange-100 text-orange-700',
  yellow: 'bg-yellow-100 text-yellow-700',
  slate:  'bg-slate-100 text-slate-500',
  sky:    'bg-sky-100 text-sky-700',
  pink:   'bg-pink-100 text-pink-700',
}

const SIZES = {
  sm: 'px-2.5 py-0.5 text-[11px]',
  xs: 'px-1.5 py-0.5 text-[10px]',
}

export default function StatusBadge({ color = 'gray', size = 'sm', className = '', children }) {
  const colorClasses = COLORS[color] || COLORS.gray
  const sizeClasses = SIZES[size] || SIZES.sm

  return (
    <span className={`inline-block rounded-full font-semibold tracking-wide ${colorClasses} ${sizeClasses} ${className}`}>
      {children}
    </span>
  )
}
