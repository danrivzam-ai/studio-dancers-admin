import { useRef, useEffect, useState } from 'react'
import { toPng } from 'html-to-image'
import { X, Download, Send } from 'lucide-react'
import { formatDate, getMonthName, getCycleInfo } from '../lib/dateUtils'
import { getCourseById } from '../lib/courses'

export default function ReceiptGenerator({
  payment,
  student,
  settings,
  onClose
}) {
  const receiptRef = useRef(null)
  const [logoBase64, setLogoBase64] = useState(null)
  const isQuickPayment = payment?.isQuickPayment
  const isReprint = payment?.isReprint || false
  const course = isQuickPayment ? null : getCourseById(student?.course_id)

  // Pre-load logo as base64 so html2canvas can render it (avoids cross-origin issues)
  useEffect(() => {
    if (!settings?.logo_url) return
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth
        canvas.height = img.naturalHeight
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0)
        setLogoBase64(canvas.toDataURL('image/png'))
      } catch {
        // If toDataURL fails (tainted canvas), ignore — logo won't appear in download
        setLogoBase64(null)
      }
    }
    img.onerror = () => setLogoBase64(null)
    img.src = settings.logo_url
  }, [settings?.logo_url])

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Calcular información de saldos
  const coursePrice = course?.price || 0
  const isProgram = !isQuickPayment && course?.priceType === 'programa'
  const isRecurring = !isQuickPayment && (course?.priceType === 'mes' || course?.priceType === 'paquete')
  const totalPaid = parseFloat(payment?.newAmountPaid || student?.amount_paid || payment?.amount || 0)
  const balance = parseFloat(payment?.newBalance || student?.balance || 0)
  const hasBalance = (isProgram || isRecurring) && balance > 0
  const isPartialPayment = payment?.isPartialPayment || payment?.paymentStatus === 'partial' || (isRecurring && totalPaid > 0 && totalPaid < coursePrice)

  const downloadReceipt = async () => {
    if (!receiptRef.current) return

    try {
      const dataUrl = await toPng(receiptRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        cacheBust: true,
        skipFonts: true
      })

      const receiptNumber = payment.receipt_number || payment.receiptNumber || 'SN'
      const customerName = student?.name || 'Cliente'
      const link = document.createElement('a')
      link.download = `Comprobante_${receiptNumber}_${customerName.replace(/\s+/g, '_')}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Error generating receipt:', err)
      alert('Error al generar. Intenta de nuevo o usa captura de pantalla.')
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
💳 *Saldo pendiente: $${balance.toFixed(2)}*`
      } else {
        balanceInfo = isProgram ? `
✅ *Programa PAGADO en su totalidad*` : `
✅ *Ciclo PAGADO*`
      }
    }

    const message = `Hola ${student.name}, adjunto su comprobante de pago.

📋 *Comprobante N° ${receiptNumber}*
💰 Monto pagado: $${parseFloat(payment.amount).toFixed(2)}
📅 Fecha: ${formatDate(payment.payment_date)}
📚 ${isQuickPayment ? 'Clase' : 'Curso'}: ${courseName}${balanceInfo}
${!isQuickPayment && (course?.priceType === 'mes' || course?.priceType === 'paquete') && student.next_payment_date ? `
📆 Próximo cobro: *${formatDate(student.next_payment_date)}*` : ''}

¡Gracias por su preferencia!
🩰 ${settings.name}`

    // Limpiar número de teléfono
    const phone = student.phone?.replace(/\D/g, '') || ''
    const phoneWithCode = phone.startsWith('0') ? `593${phone.slice(1)}` : phone

    // Abrir WhatsApp
    const whatsappUrl = `https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`
    window.open(whatsappUrl, '_blank')
  }

  if (!payment || !student) return null

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={(e) => {
        // Cerrar al hacer clic fuera del modal
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-semibold text-gray-800">Comprobante de Pago</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Cerrar (Esc)"
          >
            <X size={20} />
          </button>
        </div>

        {/* Receipt Preview */}
        <div className="p-4">
          <div
            ref={receiptRef}
            className="bg-white border-2 border-gray-200 rounded-lg p-6 shadow-inner"
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
                  📋 REIMPRESIÓN
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
            <div className="bg-gray-50 rounded-lg p-3 mb-4">
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
              <div className={`rounded-lg p-3 mb-4 ${hasBalance ? 'bg-orange-50 border border-orange-200' : 'bg-green-50 border border-green-200'}`}>
                <p className="text-sm font-semibold text-center mb-2">
                  {hasBalance ? '📊 Estado de Cuenta del Ciclo' : (isProgram ? '✅ Programa Pagado' : '✅ Ciclo Pagado')}
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
              const cycleInfo = payment.payment_date
                ? getCycleInfo(payment.payment_date, student.next_payment_date, course?.classDays, cycleClasses)
                : null
              const dayNames = { 0: 'Domingos', 1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves', 5: 'Viernes', 6: 'Sábados' }
              const classDaysLabel = course?.classDays?.map(d => dayNames[d]).join(' y ') || ''

              return (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-4">
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
                      <p className="text-[10px] text-purple-500 mt-1">
                        {cycleInfo.totalClasses} clases • {classDaysLabel}
                      </p>
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
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
            >
              <Download size={20} />
              Descargar
            </button>
            {student.phone && (
              <button
                onClick={sendWhatsApp}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
              >
                <Send size={20} />
                WhatsApp
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-xl transition-colors text-sm"
          >
            Cerrar (Esc)
          </button>
        </div>
      </div>
    </div>
  )
}
