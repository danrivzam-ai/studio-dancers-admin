/**
 * EmptyState — Centered placeholder when a list or section has no data.
 *
 * Usage:
 *   <EmptyState icon={Search} title="Sin resultados" />
 *   <EmptyState icon={ClipboardList} title="No hay planes" description="Crea uno para empezar" />
 *
 * Props:
 *   icon        — Lucide icon component (rendered at 40px, gray)
 *   title       — Primary message (required)
 *   description — Optional secondary message
 *   action      — Optional ReactNode (button, link, etc.)
 *   className   — Extra classes on the wrapper
 */

export default function EmptyState({ icon: Icon, title, description, action, className = '' }) {
  return (
    <div className={`text-center py-10 ${className}`}>
      {Icon && <Icon size={40} className="mx-auto text-gray-300 mb-3" />}
      <p className="text-gray-500 font-medium text-sm">{title}</p>
      {description && <p className="text-gray-400 text-xs mt-1">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
