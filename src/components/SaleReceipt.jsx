import { useRef } from 'react'
import { ReceiptSheet, ReceiptFields, ReceiptAmount, ReceiptItems, ReceiptModal } from './ui/Receipt'
import { downloadReceiptImage } from '../lib/receiptImage'

const PAYMENT_LABELS = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta'
}

const money = (n) => `$${parseFloat(n || 0).toFixed(2)}`

export default function SaleReceipt({ receipt, settings, schoolName, onClose }) {
  const receiptRef = useRef(null)

  const formattedDate = (() => {
    if (!receipt.date) return ''
    const [y, m, d] = receipt.date.split('-')
    return `${d}/${m}/${y}`
  })()

  const handleDownload = () =>
    downloadReceiptImage(receiptRef.current, `Comprobante-Venta-${receipt.receiptNumber || 'SN'}.png`)

  return (
    <ReceiptModal title="Comprobante de venta" onClose={onClose} onDownload={handleDownload}>
      <ReceiptSheet
        ref={receiptRef}
        settings={settings || { name: schoolName }}
        title="Comprobante de venta"
        number={receipt.receiptNumber}
        date={formattedDate}
        thanks="¡Gracias por tu compra!"
      >
        <ReceiptFields items={[
          { label: 'Cliente', value: receipt.customerName, full: !receipt.program },
          { label: 'Programa', value: receipt.program },
        ]} />

        <ReceiptItems items={receipt.items.map(item => ({
          name: item.productName,
          detail: `${money(item.unitPrice)} × ${item.quantity}`,
          amount: money(parseFloat(item.unitPrice) * parseInt(item.quantity)),
        }))} />

        <ReceiptAmount
          label="Total"
          amount={receipt.total}
          method={PAYMENT_LABELS[receipt.paymentMethod] || receipt.paymentMethod}
        />
      </ReceiptSheet>
    </ReceiptModal>
  )
}
