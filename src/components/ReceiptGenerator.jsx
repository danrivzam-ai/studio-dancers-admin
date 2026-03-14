import { useRef, useEffect, useState } from 'react'
import { toPng } from 'html-to-image'
import { X, Download, Send, CheckCircle, AlertCircle } from 'lucide-react'
import { formatDate, getMonthName, getCycleInfo } from '../lib/dateUtils'
import { getCourseById } from '../lib/courses'
import { useToast } from './Toast'
import InvoiceButton from './InvoiceButton'
import Modal from './ui/Modal'

export default function ReceiptGenerator({
  payment,
  student,
  settings,
  onClose,
  onSendApiComprobante,   // (payment, student, course, receiptNumber) => Promise<{success, error}>
}) {
  const receiptRef = useRef(null)
  const toast = useToast()
  const [logoBase64, setLogoBase64] = useState(null)
  const [waStatus, setWaStatus] = useState(null) // null | 'sending' | 'sent' | 'manual'
  const isQuickPayment = payment?.isQuickPayment
  const isReprint = payment?.isReprint || false
  const course = isQuickPayment ? null : getCourseById(student?.course_id)

  // Pre-load logo as base64 for image capture (avoids cross-origin issues)
  useEffect(() => {
    const tryLoadAsBase64 = (url) => {
      return new Promise((resolve) => {
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas')
            canvas.width = img.naturalWidth
            canvas.height = img.naturalHeight
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0)
            resolve(canvas.toDataURL('image/png'))
          } catch {
            resolve(null)
          }
        }
        img.onerror = () => resolve(null)
        img.src = url
      })
    }

    const loadLogo = async () => {
      if (!settings?.logo_url) return
      // Try the configured URL first
      let base64 = await tryLoadAsBase64(settings.logo_url)
      // If it fails (CORS), fallback to local logo
      if (!base64 && settings.logo_url !== '/logo.png') {
        base64 = await tryLoadAsBase64('/logo.png')
      }
      setLogoBase64(base64)
    }

    loadLogo()
  }, [settings?.logo_url])

  // Calcular información de saldos
  const coursePrice = course?.price || 0
  const isProgram = !isQuickPayment && course?.priceType === 'programa'
  const isRecurring = !isQuickPayment && (course?.priceType === 'mes' || course?.priceType === 'paquete')
  const totalPaid = parseFloat(payment?.newAmountPaid ?? student?.amount_paid ?? payment?.amount ?? 0)
  const balance = parseFloat(payment?.newBalance ?? student?.balance ?? 0)
  const hasBalance = (isProgram || isRecurring) && balance > 0
  const isPartialPayment = payment?.isPartialPayment || payment?.paymentStatus === 'partial' || (isRecurring && totalPaid > 0 && totalPaid < coursePrice)

  const downloadReceipt = async () => {
    if (!receiptRef.current) return

    try {
      // First attempt with filter to skip problematic external images
      let dataUrl
      try {
        dataUrl = await toPng(receiptRef.current, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          cacheBust: true,
          skipFonts: true
        })
      } catch {
        // If first attempt fails, retry filtering out images that aren't base64
        dataUrl = await toPng(receiptRef.current, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          skipFonts: true,
          filter: (node) => {
            // Skip img elements with external URLs (non-base64)
            if (node.tagName === 'IMG' && node.src && !node.src.startsWith('data:')) {
              return false
            }
            return true
          }
        })
      }

      const receiptNumber = payment.receipt_number || payment.receiptNumber || 'SN'
      const customerName = student?.name || 'Cliente'
      const link = document.createElement('a')
      link.download = `Comprobante_${receiptNumber}_${customerName.replace(/\s+/g, '_')}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Error generating receipt:', err)
      toast.error('Error al generar. Intenta de nuevo o usa captura de pantalla.')
    }
  }

  const sendWhatsApp = async () => {
    // Primero descargar la imagen
    await downloadReceipt()

    const receiptNumber = payment.receipt_number || payment.receiptNumber || 'SN'
    const courseName = isQuickPayment ? payment.className : (course?.name || 'N/A')

    // Formatear mensaje con info de saldos si aplica
    let balanceInfo = ''
    if (isProgram || (isRecurring && isPartialPayment)) {
      if (balance > 0) {
        balanceInfo = `
💳 Saldo pendiente: $${balance.toFixed(2)}`
      } else {
        balanceInfo = isProgram ? `
✅ Programa completamente pagado` : `
✅ Ciclo completamente pagado`
      }
    }

    const nextPaymentLine = !isQuickPayment &&
      (course?.priceType === 'mes' || course?.priceType === 'paquete') &&
      student.next_payment_date
        ? `\n\uD83D\uDCC6 Pr\u00f3ximo cobro: ${formatDate(student.next_payment_date)}`
        : ''

    const isRepresentante = student.is_minor !== false
    const paymentHeader = isRepresentante
      ? `El pago de ${student.name} qued\u00f3 registrado.`
      : 'Su pago qued\u00f3 registrado.'

    const message = `Hola \uD83D\uDE0A
${paymentHeader}
Aqu\u00ed est\u00e1 su comprobante:

\uD83D\uDCCB Comprobante N\u00b0 ${receiptNumber}
\uD83D\uDCB0 Monto: $${parseFloat(payment.amount).toFixed(2)}
\uD83D\uDCC5 Fecha: ${formatDate(payment.payment_date)}
\uD83D\uDCDA ${isQuickPayment ? 'Clase' : 'Curso'}: ${courseName}${balanceInfo}${nextPaymentLine}

Gracias por confiar en nosotros \uD83E\uDE70

${settings.name}`

    // ── Intentar envío automático via Meta API ──────────────────────────────
    if (onSendApiComprobante && student?.phone) {
      setWaStatus('sending')
      const apiResult = await onSendApiComprobante(payment, student, course, receiptNumber)
      if (apiResult?.success) {
        setWaStatus('sent')
        // Template enviado automáticamente → no abrir wa.me (evitar duplicado)
        setTimeout(() => setWaStatus(null), 5000)
        return
      }
      // Si la API falla, caer en el flujo manual (wa.me)
      setWaStatus('manual')
      setTimeout(() => setWaStatus(null), 4000)
    }

    // ── Fallback: abrir WhatsApp web con mensaje pre-llenado ────────────────
    const phone = student.phone?.replace(/\D/g, '') || ''
    const phoneWithCode = phone.startsWith('0') ? `593${phone.slice(1)}` : phone

    const whatsappUrl = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  if (!payment || !student) return null

  return (
    <Modal isOpen={true} onClose={onClose} ariaLabel="Comprobante de Pago">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 flex items-center justify-between sticky top-0 bg-gradient-to-r from-purple-600 to-purple-800 text-white z-10 rounded-t-2xl">
          <h2 className="text-lg font-semibold">Comprobante de Pago</h2>
          <button
            onClick={onClose}
            aria-label="Cerrar"
            className="p-2 hover:bg-white/20 rounded-xl active:scale-95 transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Receipt Preview */}
        <div className="p-4">
          <div
            ref={receiptRef}
            className="bg-white border-2 border-gray-200 rounded-xl p-6 shadow-inner"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {/* School Header */}
            <div className="text-center border-b-2 border-dashed border-gray-300 pb-4 mb-4">
              {(logoBase64 || settings.logo_url) ? (
                <img
                  src={logoBase64 || settings.logo_url}
                  alt="Logo"
                  className="h-12 max-w-[150px] mx-auto mb-2 object-contain"
                  onError={(e) => {
                    e.target.onerror = null
                    e.target.style.display = 'none'
                  }}
                />
              ) : (
                <div className="text-4xl mb-2">🩰</div>
              )}
              <h1 className="text-xl font-bold text-purple-800">{settings.name}</h1>
              <p className="text-sm text-gray-600">{settings.address}</p>
              {settings.phone && <p className="text-sm text-gray-600">Tel: {settings.phone}</p>}
              {settings.ruc && <p className="text-sm text-gray-600">RUC: {settings.ruc}</p>}
            </div>

            {/* Receipt Title */}
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-gray-800">COMPROBANTE DE PAGO</h2>
              {isReprint && (
                <span className="inline-block px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded-full mb-1 font-semibold">
                  REIMPRESIÓN
                </span>
              )}
              {isQuickPayment && (
                <span className="inline-block px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full mb-1 ml-1">
                  Clase Diaria
                </span>
              )}
              <p className="text-purple-600 font-semibold">N° {payment.receipt_number || payment.receiptNumber}</p>
              <p className="text-sm text-gray-500">Fecha: {formatDate(payment.payment_date)}</p>
            </div>

            {/* Student/Customer Info */}
            <div className="bg-gray-50 rounded-xl p-3 mb-4">
              <p className="text-sm">
                <span className="font-semibold">{isQuickPayment ? 'Cliente:' : 'Alumno:'}</span> {student.name}
              </p>
              {student.cedula && (
                <p className="text-sm"><span className="font-semibold">Cédula:</span> {student.cedula}</p>
              )}
              <p className="text-sm">
                <span className="font-semibold">{isQuickPayment ? 'Clase:' : 'Curso:'}</span> {isQuickPayment ? payment.className : (course?.name || 'N/A')}
              </p>
              {!isQuickPayment && (
                <p className="text-sm"><span className="font-semibold">Período:</span> {getMonthName(payment.payment_date)}</p>
              )}
              {/* Datos del pagador si es diferente */}
              {!isQuickPayment && student.payer_name && student.payer_name !== student.name && student.payer_name !== student.parent_name && (
                <>
                  <hr className="my-2 border-gray-300" />
                  <p className="text-sm"><span className="font-semibold">Comprobante a:</span> {student.payer_name}</p>
                  {student.payer_cedula && (
                    <p className="text-sm"><span className="font-semibold">Cédula/RUC:</span> {student.payer_cedula}</p>
                  )}
                </>
              )}
            </div>

            {/* Payment Details */}
            <div className="border-t-2 border-b-2 border-dashed border-gray-300 py-4 mb-4">
              {/* Descuento aplicado */}
              {payment.discount?.hasDiscount && (
                <>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-500 text-sm">Precio regular:</span>
                    <span className="text-sm text-gray-400 line-through">${parseFloat(payment.discount.originalPrice).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-green-600 text-sm font-medium">Descuento:</span>
                    <span className="text-sm font-medium text-green-600">-${parseFloat(payment.discount.discountAmount).toFixed(2)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">{payment.discount?.hasDiscount ? 'Total pagado:' : 'Monto pagado:'}</span>
                <span className="text-2xl font-bold text-green-600">${parseFloat(payment.amount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Forma de pago:</span>
                <span className="font-medium">{payment.payment_method}</span>
              </div>
              {payment.bank_name && (
                <div className="flex justify-between items-center mt-1">
                  <span className="text-gray-600">Banco:</span>
                  <span className="font-medium text-sm">{payment.bank_name}</span>
                </div>
              )}
              {payment.transfer_receipt && (
                <div className="flex justify-between items-center mt-1">
                  <span className="text-gray-600">N° Comprobante:</span>
                  <span className="font-medium text-sm">{payment.transfer_receipt}</span>
                </div>
              )}
            </div>

            {/* Balance Info for Programs and Recurring with partial payments */}
            {(isProgram || (isRecurring && isPartialPayment)) && (
              <div className={`rounded-xl p-3 mb-4 ${hasBalance ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
                <p className="text-sm font-semibold text-center mb-2">
                  {hasBalance ? 'Estado de Cuenta del Ciclo' : (isProgram ? 'Programa Pagado' : 'Ciclo Pagado')}
                </p>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div>
                    <p className="text-gray-500">{isRecurring ? 'Ciclo' : 'Precio'}</p>
                    <p className="font-bold">${coursePrice.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Abonado</p>
                    <p className="font-bold text-green-600">${totalPaid.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Saldo</p>
                    <p className={`font-bold ${hasBalance ? 'text-orange-600' : 'text-green-600'}`}>
                      ${balance.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Cycle Info & Next Payment - for monthly and package courses */}
            {!isQuickPayment && (course?.priceType === 'mes' || course?.priceType === 'paquete') && student.next_payment_date && (() => {
              const cycleClasses = course?.classesPerCycle || course?.classesPerPackage || null
              const cycleBaseDate = payment.cycle_start_date || payment.payment_date
              const cycleInfo = cycleBaseDate
                ? getCycleInfo(cycleBaseDate, student.next_payment_date, course?.classDays, cycleClasses)
                : null
              const dayNames = { 0: 'Domingos', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábados' }
              const classDaysLabel = course?.classDays?.map(d => dayNames[d]).join(' y ') || ''

              return (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 mb-4">
                  {cycleInfo && (
                    <div className="text-center mb-3 pb-2 border-b border-purple-200">
                      <p className="text-xs font-bold text-purple-700 mb-1">CICLO PAGADO</p>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-purple-500">Inicia:</span>
                          <span className="font-bold text-purple-700 ml-1">{cycleInfo.cycleStart}</span>
                        </div>
                        <div>
                          <span className="text-purple-500">Termina:</span>
                          <span className="font-bold text-purple-700 ml-1">{cycleInfo.cycleEnd}</span>
                        </div>
                      </div>
                      {(cycleInfo.totalClasses || classDaysLabel) && (
                        <p className="text-[10px] text-purple-500 mt-1">
                          {cycleInfo.totalClasses ? `${cycleInfo.totalClasses} clases` : ''}{cycleInfo.totalClasses && classDaysLabel ? ' • ' : ''}{classDaysLabel}
                        </p>
                      )}
                    </div>
                  )}
                  <p className="text-sm text-center">
                    <span className="text-xs text-purple-600">Próximo cobro:</span>
                    <br />
                    <span className="text-lg font-bold text-purple-700">
                      {formatDate(student.next_payment_date)}
                    </span>
                  </p>
                </div>
              )
            })()}

            {/* Footer */}
            <div className="text-center text-gray-500 text-sm">
              <p>¡Gracias por su preferencia!</p>
              {settings.email && <p className="text-xs mt-1">{settings.email}</p>}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t bg-gray-50 rounded-b-2xl">
          <div className="flex gap-3 mb-3">
            <button
              onClick={downloadReceipt}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 active:scale-95 transition-all"
            >
              <Download size={20} />
              Descargar
            </button>
            {student.phone && (
              <button
                onClick={sendWhatsApp}
                disabled={waStatus === 'sending'}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 active:scale-95 transition-all disabled:opacity-60"
              >
                <Send size={20} />
                {waStatus === 'sending' ? 'Enviando...' : 'WhatsApp'}
              </button>
            )}
          </div>

          {/* Toast de estado de envío API */}
          {waStatus === 'sent' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
              <CheckCircle size={16} />
              <span>Comprobante enviado autom\u00e1ticamente por WhatsApp</span>
            </div>
          )}
          {waStatus === 'manual' && (
            <div className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-xl text-amber-700 text-sm">
              <AlertCircle size={16} />
              <span>API no disponible \u2014 enviado por WhatsApp Web</span>
            </div>
          )}

          {/* Botón Generar Factura Electrónica */}
          {!isQuickPayment && (
            <div className="mt-2">
              <InvoiceButton
                payment={payment}
                student={student}
                courseName={course?.name}
                settings={settings}
                logoBase64={logoBase64}
              />
            </div>
          )}

          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-xl active:scale-95 transition-all text-sm"
          >
            Cerrar (Esc)
          </button>
        </div>
      </div>
    </Modal>
  )
}
