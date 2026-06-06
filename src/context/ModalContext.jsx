import { createContext, useContext, useEffect, useState } from 'react'
import AdLabModal from '../components/AdLabModal'

const ModalContext = createContext(null)

export function ModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)

  const showModal = () => setIsOpen(true)
  const hideModal = () => setIsOpen(false)

  // Interceptor global: captura clics en enlaces externos y WhatsApp
  useEffect(() => {
    function handleClick(e) {
      const link = e.target.closest('a[href]')
      if (!link) return

      const href = link.getAttribute('href') || ''
      const isExternal = href.startsWith('https://') || href.startsWith('http://')
      if (!isExternal) return

      // No interceptar el propio modal de ADLAB
      if (link.closest('[data-adlab-modal]')) return

      e.preventDefault()
      e.stopPropagation()
      showModal()
    }

    document.addEventListener('click', handleClick, true)
    return () => document.removeEventListener('click', handleClick, true)
  }, [])

  return (
    <ModalContext.Provider value={{ showModal, hideModal }}>
      {children}
      <AdLabModal isOpen={isOpen} onClose={hideModal} />
    </ModalContext.Provider>
  )
}

export function useModal() {
  return useContext(ModalContext)
}
