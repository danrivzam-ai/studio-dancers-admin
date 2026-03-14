import { useEffect, useRef } from 'react'

/**
 * Shared accessible modal wrapper.
 *
 * Provides: Escape-to-close, role="dialog", aria-modal, aria-label,
 * click-outside-to-close, and basic focus trap.
 *
 * Usage:
 *   <Modal isOpen={show} onClose={close} ariaLabel="Eliminar registro">
 *     <div className="bg-white rounded-2xl ...">...</div>
 *   </Modal>
 */
export default function Modal({ isOpen, onClose, ariaLabel, children, className = '' }) {
  const overlayRef = useRef(null)
  const previousFocus = useRef(null)

  // Escape key handler
  useEffect(() => {
    if (!isOpen) return
    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Focus management: save previous focus, restore on close
  useEffect(() => {
    if (isOpen) {
      previousFocus.current = document.activeElement
      // Focus first focusable element inside modal after paint
      requestAnimationFrame(() => {
        const focusable = overlayRef.current?.querySelector(
          'button, [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
        focusable?.focus()
      })
    } else if (previousFocus.current) {
      previousFocus.current.focus()
      previousFocus.current = null
    }
  }, [isOpen])

  // Focus trap: Tab cycles within the modal
  useEffect(() => {
    if (!isOpen) return
    const handleTab = (e) => {
      if (e.key !== 'Tab') return
      const overlay = overlayRef.current
      if (!overlay) return
      const focusables = overlay.querySelectorAll(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', handleTab)
    return () => window.removeEventListener('keydown', handleTab)
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div
      ref={overlayRef}
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel}
      className={`fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50 ${className}`}
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose()
      }}
    >
      {children}
    </div>
  )
}
