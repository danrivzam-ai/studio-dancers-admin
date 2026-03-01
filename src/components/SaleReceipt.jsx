import { useRef } from 'react'
import { toPng } from 'html-to-image'
import { X, Download, Printer } from 'lucide-react'

const PAYMENT_LABELS = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta'
}

export default function SaleReceipt({ receipt, schoolName, onClose }) {
  const receiptRef = useRef(null)

  const handleDownload = async () => {
    if (!receiptRef.current) return
    try {
      const dataUrl = await toPng(receiptRef.current, { cacheBust: true, pixelRatio: 2 })
      const link = document.createElement('a')
      link.download = `comprobante-${receipt.receiptNumber}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Error generando imagen:', err)
    }
  }

  const handlePrint = () => {
    const printContent = receiptRef.current?.innerHTML
    if (!printContent) return
    const win = window.open('', '_blank')
    win.document.write(`
      <html><head><title>Comprobante ${receipt.receiptNumber}</title>
      <style>
        body { font-family: 'Courier New', monospace; font-size: 13px; margin: 0; padding: 20px; }
        * { box-sizing: border-box; }
      </style></head>
      <body>${printContent}</body></html>
    `)
    win.document.close()
    win.print()
    win.close()
  }

  const formattedDate = (() => {
    if (!receipt.date) return ''
    const [y, m, d] = receipt.date.split('-')
    return `${d}/${m}/${y}`
  })()

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        {/* Toolbar */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <span className="font-semibold text-gray-800">Comprobante de Venta</span>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrint}
              className="p-2 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
              title="Imprimir"
            >
              <Printer size={18} />
            </button>
            <button
              onClick={handleDownload}
              className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
              title="Descargar imagen"
            >
              <Download size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Ticket imprimible */}
        <div className="p-4">
          <div
            ref={receiptRef}
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
    </div>
  )
}
