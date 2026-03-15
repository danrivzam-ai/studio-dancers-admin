import Modal from './Modal'

/**
 * ConfirmDialog — Reusable confirmation modal with icon, message, and action buttons.
 *
 * Usage:
 *   <ConfirmDialog
 *     isOpen={!!confirmId}
 *     onClose={() => setConfirmId(null)}
 *     onConfirm={() => handleDelete(confirmId)}
 *     icon={Trash2}
 *     iconColor="red"
 *     title="¿Eliminar este registro?"
 *     description="Esta acción no se puede deshacer."
 *     confirmLabel="Sí, eliminar"
 *     confirmColor="red"
 *   />
 *
 * Props:
 *   isOpen        — Whether the dialog is visible
 *   onClose       — Called when Cancel is clicked or overlay/Escape
 *   onConfirm     — Called when confirm button is clicked
 *   icon          — Lucide icon component (optional)
 *   iconColor     — 'red' | 'amber' | 'purple' (default 'red')
 *   title         — Primary question/message
 *   description   — Optional secondary text
 *   confirmLabel  — Text for confirm button (default "Sí, confirmar")
 *   cancelLabel   — Text for cancel button (default "No, volver")
 *   confirmColor  — 'red' | 'amber' | 'purple' (default 'red')
 *   loading       — Disables confirm button when true
 */

const ICON_COLORS = {
  red:    'text-red-400',
  amber:  'text-amber-400',
  purple: 'text-purple-400',
}

const BTN_COLORS = {
  red:    'bg-red-500 hover:bg-red-600',
  amber:  'bg-amber-500 hover:bg-amber-600',
  purple: 'bg-purple-600 hover:bg-purple-700',
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  icon: Icon,
  iconColor = 'red',
  title,
  description,
  confirmLabel = 'Sí, confirmar',
  cancelLabel = 'No, volver',
  confirmColor = 'red',
  loading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} ariaLabel={title}>
      <div className="w-full max-w-xs p-6 text-center">
        {Icon && <Icon size={32} className={`mx-auto mb-3 ${ICON_COLORS[iconColor] || ICON_COLORS.red}`} />}
        <p className="font-semibold text-gray-800 mb-1">{title}</p>
        {description && <p className="text-xs text-gray-500 mb-5">{description}</p>}
        {!description && <div className="mb-5" />}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 active:scale-95 transition-all"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-semibold active:scale-95 transition-all disabled:opacity-50 ${BTN_COLORS[confirmColor] || BTN_COLORS.red}`}
          >
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  )
}
