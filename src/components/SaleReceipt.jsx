import { useRef, useState } from 'react'
import { toPng } from 'html-to-image'
import { X, Download, Check } from 'lucide-react'

const PAYMENT_LABELS = {
  cash: 'Efectivo',
  transfer: 'Transferencia',
  card: 'Tarjeta'
}

export default function SaleReceipt({ receipt, schoolName, onClose }) {
  const receiptRef = useRef(null)
  const [downloading, setDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  const handleDownload = async () => {
    if (!receiptRef.current) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(receiptRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        skipFonts: true,
        filter: (node) => {
          if (node.tagName === 'IMG' && node.src && !node.src.startsWith('data:')) return false
          return true
        }
      })
      const link = document.createElement('a')
      link.download = `Comprobante-Venta-${receipt.receiptNumber || 'SN'}.png`
      link.href = dataUrl
      link.click()
      setDownloaded(true)
      setTimeout(() => setDownloaded(false), 3000)
    } catch (err) {
      console.error('Error generando comprobante PNG:', err)
      alert('Error al generar la imagen. Intenta de nuevo.')
    } finally {
      setDownloading(false)
    }
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
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-[#6b2145] to-[#441029] text-white rounded-t-2xl">
          <span className="font-semibold">Comprobante de Venta</span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="p-2 hover:bg-white/20 rounded-xl active:scale-95 transition-all disabled:opacity-60"
              title={downloading ? 'Generando…' : downloaded ? '¡Descargado!' : 'Descargar imagen'}
            >
              {downloaded ? <Check size={18} /> : <Download size={18} />}
            </button>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl active:scale-95 transition-all"
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
              {receipt.program && (
                <div className="flex justify-between text-xs text-gray-600 mt-1">
                  <span>Programa:</span>
                  <span className="font-semibold text-gray-800 text-right max-w-[60%] break-words">{receipt.program}</span>
                </div>
              )}
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
