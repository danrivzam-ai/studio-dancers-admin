import { useRef, useEffect } from 'react'
import { formatDate, getMonthName, getCycleInfo, getStudentCycleClasses } from '../lib/dateUtils'
import { getCourseById } from '../lib/courses'
import { getContactInfo } from '../lib/whatsapp'
import { ReceiptSheet, ReceiptFields, ReceiptAmount, ReceiptStats, ReceiptModal } from './ui/Receipt'
import { downloadReceiptImage } from '../lib/receiptImage'

const money = (n) => `$${parseFloat(n || 0).toFixed(2)}`
const DAY_NAMES = { 0: 'Dom', 1: 'Lun', 2: 'Mar', 3: 'Mié', 4: 'Jue', 5: 'Vie', 6: 'Sáb' }

export default function ReceiptGenerator({
  payment: paymentRaw,
  student,
  settings,
  onClose
}) {
  // Adapter: el modal nuevo genera payment.discount (objeto camelCase).
  // Pero cuando se reimprime desde historial, payment viene de BD con
  // campos snake_case planos (discount_original_price, discount_amount...).
  // Sin este adapter, los recibos del historial nunca mostraban descuento.
  const payment = (() => {
    if (!paymentRaw) return paymentRaw
    if (paymentRaw.discount && typeof paymentRaw.discount === 'object') return paymentRaw
    const orig = parseFloat(paymentRaw.discount_original_price ?? 0)
    const disc = parseFloat(paymentRaw.discount_amount ?? 0)
    if (!orig || !disc) return paymentRaw
    return {
      ...paymentRaw,
      discount: {
        hasDiscount: true,
        originalPrice: orig,
        discountAmount: disc,
        discountType: paymentRaw.discount_type || 'fixed',
        discountValue: paymentRaw.discount_value || disc.toFixed(2),
      },
    }
  })()
  const receiptRef = useRef(null)
  const isQuickPayment = payment?.isQuickPayment
  const isReprint = payment?.isReprint || false
  // Reimpresión de un pago anterior al último: el estado de cuenta y el ciclo de hoy no le corresponden
  const isHistoric = payment?.isHistoric || false
  const course = isQuickPayment ? null : getCourseById(student?.course_id)

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Calcular información de saldos
  const isProgram = !isQuickPayment && course?.priceType === 'programa'
  const isRecurring = !isQuickPayment && (course?.priceType === 'mes' || course?.priceType === 'paquete')
  // Precio del ciclo: tarifa personal de la alumna (puede ser histórica) en mes/paquete
  const coursePrice = isRecurring
    ? (parseFloat(student?.monthly_fee) || course?.price || 0)
    : (parseFloat(student?.total_program_price) || course?.price || 0)
  const totalPaid = parseFloat(payment?.newAmountPaid ?? student?.amount_paid ?? payment?.amount ?? 0)
  const balance = parseFloat(payment?.newBalance ?? student?.balance ?? 0)
  const hasBalance = (isProgram || isRecurring) && balance > 0
  const isPartialPayment = payment?.isPartialPayment || payment?.paymentStatus === 'partial' || (isRecurring && totalPaid > 0 && totalPaid < coursePrice)

  const receiptNumber = payment?.receipt_number || payment?.receiptNumber || 'SN'

  const downloadReceipt = () =>
    downloadReceiptImage(receiptRef.current, `Comprobante_${receiptNumber}_${student?.name || 'Cliente'}.png`)

  // Teléfono del contacto correcto (menores → representante), igual que los recordatorios
  const contactPhone = student ? getContactInfo(student).contactPhone : ''

  const sendWhatsApp = () => {
    const courseName = isQuickPayment ? payment.className : (course?.name || 'N/A')

    let balanceInfo = ''
    if (isProgram || (isRecurring && isPartialPayment)) {
      balanceInfo = balance > 0
        ? `\n💳 *Saldo pendiente: $${balance.toFixed(2)}*`
        : (isProgram ? '\n✅ *Programa PAGADO en su totalidad*' : '\n✅ *Ciclo PAGADO*')
    }

    const message = `Hola ${student.name}, adjunto su comprobante de pago.

📋 *Comprobante N° ${receiptNumber}*
💰 Monto pagado: $${parseFloat(payment.amount).toFixed(2)}
📅 Fecha: ${formatDate(payment.payment_date)}
📚 ${isQuickPayment ? 'Clase' : 'Curso'}: ${courseName}${balanceInfo}
${isRecurring && student.next_payment_date ? `
📆 Próximo cobro: *${formatDate(student.next_payment_date)}*` : ''}

¡Gracias por su preferencia!
${settings.name}`

    const phone = (contactPhone || '').replace(/\D/g, '')
    const phoneWithCode = phone.startsWith('0') ? `593${phone.slice(1)}` : phone
    window.open(`https://wa.me/${phoneWithCode}?text=${encodeURIComponent(message)}`, '_blank')
  }

  if (!payment || !student) return null

  // Descuento: solo si la matemática cuadra (original - descuento ≈ monto)
  const discount = (() => {
    if (!payment.discount?.hasDiscount) return null
    const orig = parseFloat(payment.discount.originalPrice) || 0
    const disc = parseFloat(payment.discount.discountAmount) || 0
    const amt = parseFloat(payment.amount) || 0
    return Math.abs((orig - disc) - amt) < 0.01 ? { orig, disc } : null
  })()

  // Ciclo pagado (mes / paquete)
  const cycle = (() => {
    if (!isRecurring || !student.next_payment_date) return null
    const cycleClasses = course?.classesPerCycle || course?.classesPerPackage || null
    let base = payment.cycle_start_date || payment.payment_date
    let end = student.next_payment_date
    const cicloIni = course?.cicloInicio || course?.ciclo_inicio
    const cicloFin = course?.cicloFin || course?.ciclo_fin
    if (cicloIni && base && base < cicloIni) base = cicloIni
    if (cicloFin && end && end > cicloFin) end = cicloFin
    const planMonths = payment.plan_months || payment.planMonths || null
    const info = base
      ? getCycleInfo(base, end, course?.classDays, cycleClasses, planMonths, planMonths ? null : getStudentCycleClasses(student))
      : null
    const days = course?.classDays?.map(d => DAY_NAMES[d]).join('/') || ''
    return { info, days }
  })()
  const planName = payment.plan_name || payment.planName
  const planMonths = payment.plan_months || payment.planMonths

  const showPayer = !isQuickPayment && student.payer_name && student.payer_name !== student.name && student.payer_name !== student.parent_name
  const methodDetail = [payment.bank_name, payment.transfer_receipt && `Ref. ${payment.transfer_receipt}`].filter(Boolean).join(' · ')

  return (
    <ReceiptModal title="Comprobante de pago" onClose={onClose} onDownload={downloadReceipt} onWhatsApp={contactPhone ? sendWhatsApp : null}>
      <ReceiptSheet
        ref={receiptRef}
        settings={settings}
        title="Comprobante de pago"
        number={receiptNumber}
        date={formatDate(payment.payment_date)}
        tags={[
          isReprint && 'Reimpresión',
          isQuickPayment && 'Clase diaria',
          planName && `Plan ${planName}${planMonths ? ` · ${planMonths} ${planMonths === 1 ? 'mes' : 'meses'}` : ''}`,
          discount && `Descuento -${money(discount.disc)}`,
        ]}
      >
        <ReceiptFields items={[
          { label: isQuickPayment ? 'Cliente' : 'Alumna', value: student.name },
          { label: 'Cédula', value: student.cedula },
          { label: isQuickPayment ? 'Clase' : 'Curso', value: isQuickPayment ? payment.className : (course?.name || 'N/A'), full: !student.cedula ? false : true },
          { label: 'Período', value: !isQuickPayment && (isHistoric || !cycle?.info) ? getMonthName(payment.payment_date) : null },
          showPayer && { label: 'Facturado a', value: `${student.payer_name}${student.payer_cedula ? ` · ${student.payer_cedula}` : ''}`, full: true },
        ]} />

        <ReceiptAmount
          label={discount ? 'Total pagado' : 'Monto pagado'}
          amount={payment.amount}
          strike={discount ? money(discount.orig) : null}
          method={payment.payment_method}
          detail={methodDetail}
        />

        {!isHistoric && (isProgram || (isRecurring && isPartialPayment)) && (
          <ReceiptStats
            title={hasBalance ? 'Estado de cuenta' : (isProgram ? 'Programa pagado' : 'Ciclo pagado')}
            items={[
              { label: isRecurring ? 'Ciclo' : 'Precio', value: money(coursePrice) },
              { label: 'Abonado', value: money(totalPaid), tone: 'ok' },
              { label: 'Saldo', value: money(balance), tone: hasBalance ? 'warn' : 'ok' },
            ]}
          />
        )}

        {!isHistoric && cycle && (
          <ReceiptStats
            title={cycle.info?.totalClasses ? `Ciclo · ${cycle.info.totalClasses} clases${cycle.days ? ` · ${cycle.days}` : ''}` : 'Ciclo'}
            items={[
              ...(cycle.info ? [{ label: 'Inicia', value: cycle.info.cycleStart }, { label: 'Termina', value: cycle.info.cycleEnd }] : []),
              { label: 'Próximo cobro', value: formatDate(student.next_payment_date) },
            ]}
          />
        )}
      </ReceiptSheet>
    </ReceiptModal>
  )
}
