import { useState, useEffect } from 'react'
import { FileText, CheckCircle, Clock, AlertTriangle } from 'lucide-react'
import { useInvoices } from '../hooks/useInvoices'
import InvoiceModal from './InvoiceModal'

/**
 * Botón "Generar Factura" que se integra en ReceiptGenerator y PaymentHistory.
 * Muestra el estado si ya existe una factura para ese pago.
 *
 * @param {object} props
 * @param {object} props.payment - Datos del pago
 * @param {object} props.student - Datos de la alumna
 * @param {string} props.courseName - Nombre del curso
 * @param {object} props.settings - Configuración de la escuela
 * @param {string} props.logoBase64 - Logo en base64 (opcional)
 * @param {string} props.variant - 'button' (default) o 'badge' (compacto)
 */
export default function InvoiceButton({ payment, student, courseName, settings, logoBase64, variant = 'button' }) {
  const { getInvoiceByPayment } = useInvoices()
  const [showModal, setShowModal] = useState(false)
  const [existingInvoice, setExistingInvoice] = useState(null)
  const [checked, setChecked] = useState(false)

  // No mostrar si la facturación no está habilitada
  if (!settings?.sri_invoicing_enabled) return null

  useEffect(() => {
    async function check() {
      if (!payment?.id) return
      const result = await getInvoiceByPayment(payment.id)
      if (result.success && result.data) {
        setExistingInvoice(result.data)
      }
      setChecked(true)
    }
    check()
  }, [payment?.id, getInvoiceByPayment])

  if (!checked) return null

  const statusConfig = {
    authorized: { icon: CheckCircle, color: 'text-green-600 bg-green-50', label: 'Autorizada' },
    draft: { icon: Clock, color: 'text-yellow-600 bg-yellow-50', label: 'Borrador' },
    sent: { icon: Clock, color: 'text-blue-600 bg-blue-50', label: 'Enviada' },
    rejected: { icon: AlertTriangle, color: 'text-red-600 bg-red-50', label: 'Rechazada' },
    voided: { icon: AlertTriangle, color: 'text-gray-600 bg-gray-50', label: 'Anulada' },
  }

  // Si ya existe factura, mostrar badge con estado
  if (existingInvoice) {
    const config = statusConfig[existingInvoice.status] || statusConfig.draft
    const Icon = config.icon

    if (variant === 'badge') {
      return (
        <>
          <button
            onClick={() => setShowModal(true)}
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${config.color} hover:opacity-80 transition`}
          >
            <Icon className="w-3 h-3" />
            {existingInvoice.invoice_number}
          </button>
          {showModal && (
            <InvoiceModal
              payment={payment}
              student={student}
              courseName={courseName}
              settings={settings}
              logoBase64={logoBase64}
              onClose={() => setShowModal(false)}
            />
          )}
        </>
      )
    }

    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium ${config.color} hover:opacity-80 transition`}
        >
          <Icon className="w-4 h-4" />
          Factura {config.label} — {existingInvoice.invoice_number}
        </button>
        {showModal && (
          <InvoiceModal
            payment={payment}
            student={student}
            courseName={courseName}
            settings={settings}
            logoBase64={logoBase64}
            onClose={() => setShowModal(false)}
          />
        )}
      </>
    )
  }

  // No existe factura → botón para generar
  if (variant === 'badge') {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition"
        >
          <FileText className="w-3 h-3" />
          Facturar
        </button>
        {showModal && (
          <InvoiceModal
            payment={payment}
            student={student}
            courseName={courseName}
            settings={settings}
            logoBase64={logoBase64}
            onClose={() => {
              setShowModal(false)
              // Re-check after modal closes
              getInvoiceByPayment(payment.id).then(r => {
                if (r.success && r.data) setExistingInvoice(r.data)
              })
            }}
          />
        )}
      </>
    )
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition"
      >
        <FileText className="w-4 h-4" />
        Generar Factura
      </button>
      {showModal && (
        <InvoiceModal
          payment={payment}
          student={student}
          courseName={courseName}
          settings={settings}
          logoBase64={logoBase64}
          onClose={() => {
            setShowModal(false)
            getInvoiceByPayment(payment.id).then(r => {
              if (r.success && r.data) setExistingInvoice(r.data)
            })
          }}
        />
      )}
    </>
  )
}
