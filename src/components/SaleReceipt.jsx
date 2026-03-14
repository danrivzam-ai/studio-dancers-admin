import { X, Download } from 'lucide-react'
import jsPDF from 'jspdf'
import Modal from './ui/Modal'

const PAYMENT_LABELS = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta'
}

export default function SaleReceipt({ receipt, schoolName, onClose }) {

  const handleDownload = () => {
    try {
      const doc = new jsPDF({ unit: 'mm', format: [80, 200], orientation: 'portrait' })
      const W = 80
      let y = 8

      const center = (text, fontSize, bold = false) => {
        doc.setFontSize(fontSize)
        doc.setFont('helvetica', bold ? 'bold' : 'normal')
        doc.text(text, W / 2, y, { align: 'center' })
        y += fontSize * 0.45
      }
      const line = (dashed = false) => {
        dashed
          ? doc.setLineDashPattern([1, 1], 0)
          : doc.setLineDashPattern([], 0)
        doc.line(4, y, W - 4, y)
        y += 4
      }
      const row = (left, right, fontSize = 8) => {
        doc.setFontSize(fontSize)
        doc.setFont('helvetica', 'normal')
        doc.text(left, 5, y)
        doc.text(right, W - 5, y, { align: 'right' })
        y += fontSize * 0.45
      }

      // Cabecera
      center(schoolName || 'Studio Dancers', 11, true)
      y += 1
      center('Comprobante de Venta', 7)
      y += 1
      line(true)
      center(receipt.receiptNumber || '', 7)
      center(receipt.date ? receipt.date.split('-').reverse().join('/') : '', 7)
      y += 1
      line(true)

      // Cliente
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text('Cliente:', 5, y)
      doc.setFont('helvetica', 'bold')
      const clientLines = doc.splitTextToSize(receipt.customerName || '-', W - 30)
      doc.text(clientLines, W - 5, y, { align: 'right' })
      y += Math.max(clientLines.length * 3.5, 4)
      line(true)

      // Ítems
      for (const item of receipt.items) {
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(8)
        const nameLines = doc.splitTextToSize(item.productName || '-', W - 10)
        doc.text(nameLines, 5, y)
        y += nameLines.length * 3.5
        row(`  $${parseFloat(item.unitPrice).toFixed(2)} × ${item.quantity}`,
            `$${(parseFloat(item.unitPrice) * parseInt(item.quantity)).toFixed(2)}`, 8)
        y += 1
      }

      line(false)
      y += 1
      // Total
      doc.setFontSize(10)
      doc.setFont('helvetica', 'bold')
      doc.text('TOTAL', 5, y)
      doc.setTextColor(22, 163, 74)
      doc.text(`$${parseFloat(receipt.total).toFixed(2)}`, W - 5, y, { align: 'right' })
      doc.setTextColor(0, 0, 0)
      y += 4
      doc.setFontSize(7)
      doc.setFont('helvetica', 'normal')
      doc.text(PAYMENT_LABELS[receipt.paymentMethod] || receipt.paymentMethod || '', W - 5, y, { align: 'right' })
      y += 6
      line(true)
      center('¡Gracias por tu compra!', 7)
      center(schoolName || 'Studio Dancers', 7)

      doc.save(`comprobante-${receipt.receiptNumber || 'venta'}.pdf`)
    } catch (err) {
      console.error('Error generando PDF:', err)
      alert('No se pudo generar el comprobante. Intenta de nuevo.')
    }
  }

  const formattedDate = (() => {
    if (!receipt.date) return ''
    const [y, m, d] = receipt.date.split('-')
    return `${d}/${m}/${y}`
  })()

  return (
    <Modal isOpen={true} onClose={onClose} ariaLabel="Comprobante de venta">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-800 text-white rounded-t-2xl">
          <span className="font-semibold">Comprobante de Venta</span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleDownload}
              className="p-2 hover:bg-white/20 rounded-xl active:scale-95 transition-all"
              title="Descargar imagen"
            >
              <Download size={18} />
            </button>
            <button
              onClick={onClose}
              aria-label="Cerrar"
              className="p-2 hover:bg-white/20 rounded-xl active:scale-95 transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Ticket imprimible */}
        <div className="p-4">
          <div
            className="bg-white border border-gray-200 rounded-xl p-5 font-mono text-sm"
            style={{ minWidth: 280 }}
          >
            {/* Cabecera */}
            <div className="text-center mb-4">
              <p className="font-bold text-lg tracking-wide uppercase">{schoolName}</p>
              <p className="text-xs text-gray-500 mt-0.5">Comprobante de Venta</p>
              <div className="border-t border-dashed border-gray-300 my-3" />
              <p className="text-xs text-gray-600">{receipt.receiptNumber}</p>
              <p className="text-xs text-gray-400">{formattedDate}</p>
            </div>

            {/* Cliente */}
            <div className="mb-3">
              <div className="border-t border-dashed border-gray-300 mb-2" />
              <div className="flex justify-between text-xs text-gray-600">
                <span>Cliente:</span>
                <span className="font-semibold text-gray-800 text-right max-w-[60%] break-words">{receipt.customerName}</span>
              </div>
            </div>

            {/* Ítems */}
            <div className="border-t border-dashed border-gray-300 py-3 space-y-2">
              {receipt.items.map((item, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="text-gray-800 font-medium truncate">{item.productName}</p>
                    <p className="text-gray-400">${parseFloat(item.unitPrice).toFixed(2)} × {item.quantity}</p>
                  </div>
                  <span className="font-semibold text-gray-800 shrink-0">
                    ${(parseFloat(item.unitPrice) * parseInt(item.quantity)).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            <div className="border-t-2 border-gray-800 pt-3 mt-1">
              <div className="flex justify-between items-center">
                <span className="font-bold text-base">TOTAL</span>
                <span className="font-bold text-xl text-green-700">${parseFloat(receipt.total).toFixed(2)}</span>
              </div>
              <p className="text-xs text-gray-500 mt-1 text-right">
                {PAYMENT_LABELS[receipt.paymentMethod] || receipt.paymentMethod}
              </p>
            </div>

            {/* Pie */}
            <div className="border-t border-dashed border-gray-300 mt-4 pt-3 text-center">
              <p className="text-[10px] text-gray-400">¡Gracias por tu compra!</p>
              <p className="text-[10px] text-gray-400">{schoolName}</p>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
