import { useState, useEffect } from 'react'
import { FileText, Download, Send, X, AlertCircle, CheckCircle, Loader2, Edit3 } from 'lucide-react'
import { useInvoices } from '../hooks/useInvoices'
import { detectBuyerIdType, resolveBuyerData, getBuyerIdTypeLabel } from '../lib/sriUtils'
import { downloadRidePDF } from '../lib/rideGenerator'
import Modal from './ui/Modal'

/**
 * Modal para generar y gestionar facturas electrónicas SRI
 *
 * @param {object} props
 * @param {object} props.payment - Datos del pago
 * @param {object} props.student - Datos de la alumna
 * @param {string} props.courseName - Nombre del curso
 * @param {object} props.settings - Configuración de la escuela
 * @param {function} props.onClose - Callback al cerrar
 * @param {string} props.logoBase64 - Logo en base64 (opcional)
 */
export default function InvoiceModal({ payment, student, courseName, settings, onClose, logoBase64 }) {
  const { createDraftInvoice, getInvoiceByPayment, loading } = useInvoices()

  const [existingInvoice, setExistingInvoice] = useState(null)
  const [step, setStep] = useState('buyer') // buyer | generating | done | error
  const [errorMsg, setErrorMsg] = useState('')
  const [editingBuyer, setEditingBuyer] = useState(false)

  // Datos del comprador (pre-llenados desde alumna)
  const resolved = resolveBuyerData(student)
  const [buyerData, setBuyerData] = useState({
    name: resolved.name,
    idNumber: resolved.idNumber,
    email: resolved.email,
    phone: resolved.phone,
    address: resolved.address,
  })

  const { idType } = detectBuyerIdType(buyerData.idNumber)

  // Verificar si ya existe factura para este pago
  useEffect(() => {
    async function checkExisting() {
      if (!payment?.id) return
      const result = await getInvoiceByPayment(payment.id)
      if (result.success && result.data) {
        setExistingInvoice(result.data)
        setStep('done')
      }
    }
    checkExisting()
  }, [payment?.id, getInvoiceByPayment])

  const handleBuyerChange = (field, value) => {
    setBuyerData(prev => ({ ...prev, [field]: value }))
  }

  const handleGenerate = async () => {
    if (!buyerData.name.trim()) {
      setErrorMsg('El nombre del comprador es obligatorio')
      return
    }

    setStep('generating')
    setErrorMsg('')

    const result = await createDraftInvoice({
      payment,
      student,
      courseName,
      settings,
      buyerOverride: buyerData,
    })

    if (result.success) {
      setExistingInvoice(result.data)
      setStep('done')
    } else {
      setErrorMsg(result.error || 'Error al generar la factura')
      setStep('error')
    }
  }

  const handleDownloadRIDE = () => {
    if (!existingInvoice) return
    downloadRidePDF(existingInvoice, { logoBase64 })
  }

  const amount = parseFloat(payment?.amount || 0).toFixed(2)

  return (
    <Modal isOpen={true} onClose={onClose} ariaLabel="Factura">
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h2 className="text-lg font-bold text-gray-800">Factura Electrónica</h2>
          </div>
          <button onClick={onClose} aria-label="Cerrar" className="p-1 hover:bg-gray-100 rounded-full">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Resumen del pago */}
          <div className="bg-blue-50 rounded-xl p-3">
            <p className="text-sm text-blue-800 font-medium">Pago a facturar</p>
            <div className="mt-1 grid grid-cols-2 gap-1 text-sm text-blue-700">
              <span>Alumna:</span>
              <span className="font-medium">{student?.name}</span>
              <span>Curso:</span>
              <span className="font-medium">{courseName || 'N/A'}</span>
              <span>Monto:</span>
              <span className="font-bold">${amount}</span>
              <span>Método:</span>
              <span className="font-medium capitalize">{payment?.payment_method}</span>
            </div>
          </div>

          {/* Step: Datos del comprador */}
          {step === 'buyer' && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700">Datos del Comprador</h3>
                {student?.is_minor && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    Menor — datos del representante
                  </span>
                )}
              </div>

              <div className="space-y-3">
                {/* Nombre */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nombre / Razón Social *</label>
                  <input
                    type="text"
                    value={buyerData.name}
                    onChange={e => handleBuyerChange('name', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                    placeholder="Nombre del comprador"
                  />
                </div>

                {/* Identificación */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 mb-1 block">Cédula / RUC / Pasaporte</label>
                    <input
                      type="text"
                      value={buyerData.idNumber}
                      onChange={e => handleBuyerChange('idNumber', e.target.value)}
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                      placeholder="Identificación"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                    <div className="border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600">
                      {getBuyerIdTypeLabel(idType)}
                    </div>
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Email (para envío de factura)</label>
                  <input
                    type="email"
                    value={buyerData.email}
                    onChange={e => handleBuyerChange('email', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                    placeholder="correo@ejemplo.com"
                  />
                </div>

                {/* Teléfono */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Teléfono</label>
                  <input
                    type="text"
                    value={buyerData.phone}
                    onChange={e => handleBuyerChange('phone', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                    placeholder="09XXXXXXXX"
                  />
                </div>

                {/* Dirección */}
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Dirección</label>
                  <input
                    type="text"
                    value={buyerData.address}
                    onChange={e => handleBuyerChange('address', e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-300 focus:border-blue-400"
                    placeholder="Dirección del comprador"
                  />
                </div>
              </div>

              {/* Detalle de factura preview */}
              <div className="bg-gray-50 rounded-xl p-3">
                <p className="text-xs font-bold text-gray-600 mb-2">Detalle de la Factura</p>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Servicio de enseñanza de danza — {courseName}</span>
                  <span className="font-bold">${amount}</span>
                </div>
                <div className="border-t mt-2 pt-2 flex justify-between text-sm">
                  <span className="text-gray-500">Subtotal IVA 0%</span>
                  <span>${amount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">IVA 0%</span>
                  <span>$0.00</span>
                </div>
                <div className="flex justify-between text-sm font-bold mt-1 pt-1 border-t">
                  <span>TOTAL</span>
                  <span>${amount}</span>
                </div>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-2 rounded-lg">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {errorMsg}
                </div>
              )}

              {/* Nota ambiente */}
              {settings?.sri_environment !== '2' && (
                <p className="text-xs text-amber-600 bg-amber-50 p-2 rounded-lg">
                  ⚠ Ambiente de PRUEBAS — las facturas se generarán como borrador sin validez tributaria.
                </p>
              )}
            </>
          )}

          {/* Step: Generando */}
          {step === 'generating' && (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <p className="text-sm text-gray-600">Generando factura...</p>
            </div>
          )}

          {/* Step: Done */}
          {step === 'done' && existingInvoice && (
            <>
              <div className="flex flex-col items-center py-4 gap-2">
                <CheckCircle className="w-12 h-12 text-green-500" />
                <p className="text-lg font-bold text-gray-800">Factura Generada</p>
                <p className="text-sm text-gray-500">No. {existingInvoice.invoice_number}</p>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  existingInvoice.status === 'authorized' ? 'bg-green-100 text-green-700' :
                  existingInvoice.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                  existingInvoice.status === 'rejected' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {existingInvoice.status === 'authorized' ? 'Autorizada SRI' :
                   existingInvoice.status === 'draft' ? 'Borrador' :
                   existingInvoice.status === 'rejected' ? 'Rechazada' :
                   existingInvoice.status.toUpperCase()}
                </span>
              </div>

              {/* Resumen factura */}
              <div className="bg-gray-50 rounded-xl p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-gray-500">Comprador:</span>
                  <span className="font-medium">{existingInvoice.buyer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">ID:</span>
                  <span>{existingInvoice.buyer_id_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total:</span>
                  <span className="font-bold">${Number(existingInvoice.total).toFixed(2)}</span>
                </div>
              </div>

              {/* Acciones */}
              <div className="space-y-2">
                <button
                  onClick={handleDownloadRIDE}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white py-2.5 rounded-xl hover:bg-blue-700 transition font-medium"
                >
                  <Download className="w-4 h-4" />
                  Descargar RIDE (PDF)
                </button>

                {existingInvoice.buyer_email && (
                  <button
                    onClick={() => {
                      // TODO Fase B: envío por email
                      alert('El envío por email estará disponible cuando se conecte con el SRI.')
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-2.5 rounded-xl hover:bg-gray-200 transition text-sm"
                  >
                    <Send className="w-4 h-4" />
                    Enviar por Email
                  </button>
                )}
              </div>
            </>
          )}

          {/* Step: Error */}
          {step === 'error' && (
            <div className="flex flex-col items-center py-6 gap-3">
              <AlertCircle className="w-12 h-12 text-red-500" />
              <p className="text-sm text-red-600 text-center">{errorMsg}</p>
              <button
                onClick={() => setStep('buyer')}
                className="text-sm text-blue-600 underline"
              >
                Intentar de nuevo
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-2">
          {step === 'buyer' && (
            <>
              <button
                onClick={onClose}
                className="flex-1 py-2.5 border rounded-xl text-gray-600 hover:bg-gray-50 transition text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleGenerate}
                disabled={loading || !buyerData.name.trim()}
                className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition font-medium text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                Generar Factura
              </button>
            </>
          )}
          {(step === 'done' || step === 'error') && (
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border rounded-xl text-gray-600 hover:bg-gray-50 transition text-sm"
            >
              Cerrar
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
