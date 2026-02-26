import { useRef, useEffect, useState } from 'react'
import { toPng } from 'html-to-image'
import { X, Download, Send } from 'lucide-react'
import { formatDate } from '../lib/dateUtils'
import { openWhatsAppNoRecipient, buildCloseReportMessage } from '../lib/whatsapp'

export default function CashCloseReport({ cashRegister, todayData, settings, onClose }) {
  const reportRef = useRef(null)
  const [logoBase64, setLogoBase64] = useState(null)
  const [downloading, setDownloading] = useState(false)

  // Pre-load logo as base64 (same pattern as ReceiptGenerator)
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
      let base64 = await tryLoadAsBase64(settings.logo_url)
      if (!base64 && settings.logo_url !== '/logo.png') {
        base64 = await tryLoadAsBase64('/logo.png')
      }
      setLogoBase64(base64)
    }

    loadLogo()
  }, [settings?.logo_url])

  useEffect(() => {
    const handleKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  const opening = parseFloat(cashRegister.opening_amount || 0)
  const closing = parseFloat(cashRegister.closing_amount || 0)
  const expected = parseFloat(cashRegister.expected_amount || 0)
  const diff = parseFloat(cashRegister.difference || 0)

  const downloadReport = async () => {
    if (!reportRef.current || downloading) return
    setDownloading(true)
    try {
      let dataUrl
      try {
        dataUrl = await toPng(reportRef.current, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          cacheBust: true,
          skipFonts: true
        })
      } catch {
        dataUrl = await toPng(reportRef.current, {
          quality: 1,
          pixelRatio: 2,
          backgroundColor: '#ffffff',
          skipFonts: true,
          filter: (node) => {
            if (node.tagName === 'IMG' && node.src && !node.src.startsWith('data:')) return false
            return true
          }
        })
      }
      const link = document.createElement('a')
      link.download = `Cierre_Caja_${cashRegister.register_date}${cashRegister.shift ? `_${cashRegister.shift}` : ''}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Error generating report:', err)
      alert('Error al generar reporte. Intenta de nuevo.')
    } finally {
      setDownloading(false)
    }
  }

  const sendWhatsApp = async () => {
    await downloadReport()
    const message = buildCloseReportMessage(cashRegister, todayData, settings)
    openWhatsAppNoRecipient(message)
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-[60]" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Reporte de Cierre</h3>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Report Content (capturable) */}
        <div className="overflow-y-auto flex-1 p-4">
          <div ref={reportRef} style={{ padding: '24px', backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {/* School Header */}
            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              {logoBase64 && (
                <img src={logoBase64} alt="Logo" style={{ height: '60px', margin: '0 auto 8px', display: 'block' }} />
              )}
              <div style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>{settings?.name || 'Academia'}</div>
              <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>REPORTE DE CIERRE DE CAJA</div>
            </div>

            {/* Date */}
            <div style={{ textAlign: 'center', marginBottom: '16px', padding: '8px', backgroundColor: '#f3f4f6', borderRadius: '8px' }}>
              <div style={{ fontSize: '13px', fontWeight: '600', color: '#374151' }}>
                {formatDate(cashRegister.register_date)}
                {cashRegister.shift && <span style={{ marginLeft: '8px', color: '#6b7280' }}>Turno: {cashRegister.shift}</span>}
              </div>
            </div>

            {/* Opening */}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px dashed #d1d5db' }}>
              <span style={{ fontSize: '13px', color: '#6b7280' }}>Apertura:</span>
              <span style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>${opening.toFixed(2)}</span>
            </div>

            {/* Income Section */}
            <div style={{ marginTop: '12px', marginBottom: '12px' }}>
              <div style={{ fontSize: '13px', fontWeight: '700', color: '#059669', marginBottom: '6px' }}>INGRESOS</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ fontSize: '12px', color: '#6b7280', paddingLeft: '8px' }}>Pagos alumnos:</span>
                <span style={{ fontSize: '12px', color: '#1f2937' }}>${todayData.studentPayments.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ fontSize: '12px', color: '#6b7280', paddingLeft: '8px' }}>Pagos rápidos:</span>
                <span style={{ fontSize: '12px', color: '#1f2937' }}>${todayData.quickPayments.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ fontSize: '12px', color: '#6b7280', paddingLeft: '8px' }}>Ventas:</span>
                <span style={{ fontSize: '12px', color: '#1f2937' }}>${todayData.sales.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px dashed #d1d5db' }}>
                <span style={{ fontSize: '12px', color: '#6b7280', paddingLeft: '8px' }}>En efectivo:</span>
                <span style={{ fontSize: '12px', color: '#1f2937' }}>${todayData.incomeCash.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontWeight: '600' }}>
                <span style={{ fontSize: '13px', color: '#059669' }}>Total ingresos:</span>
                <span style={{ fontSize: '13px', color: '#059669' }}>${todayData.totalIncome.toFixed(2)}</span>
              </div>
            </div>

            {/* Expenses Section */}
            {todayData.expensesTotal > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#dc2626', marginBottom: '6px' }}>EGRESOS</div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                  <span style={{ fontSize: '12px', color: '#6b7280', paddingLeft: '8px' }}>En efectivo:</span>
                  <span style={{ fontSize: '12px', color: '#1f2937' }}>-${todayData.expensesCash.toFixed(2)}</span>
                </div>
                {todayData.expensesOther > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280', paddingLeft: '8px' }}>Otros métodos:</span>
                    <span style={{ fontSize: '12px', color: '#1f2937' }}>-${todayData.expensesOther.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontWeight: '600', borderTop: '1px dashed #d1d5db' }}>
                  <span style={{ fontSize: '13px', color: '#dc2626' }}>Total egresos:</span>
                  <span style={{ fontSize: '13px', color: '#dc2626' }}>-${todayData.expensesTotal.toFixed(2)}</span>
                </div>
              </div>
            )}

            {/* Movements Section */}
            {(todayData.depositsTotal > 0 || todayData.cashInTotal > 0 || todayData.cashOutTotal > 0) && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: '700', color: '#2563eb', marginBottom: '6px' }}>MOVIMIENTOS</div>
                {todayData.depositsTotal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280', paddingLeft: '8px' }}>Depósitos bancarios:</span>
                    <span style={{ fontSize: '12px', color: '#1f2937' }}>-${todayData.depositsTotal.toFixed(2)}</span>
                  </div>
                )}
                {todayData.cashInTotal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280', paddingLeft: '8px' }}>Retiros/Préstamos:</span>
                    <span style={{ fontSize: '12px', color: '#1f2937' }}>+${todayData.cashInTotal.toFixed(2)}</span>
                  </div>
                )}
                {todayData.cashOutTotal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                    <span style={{ fontSize: '12px', color: '#6b7280', paddingLeft: '8px' }}>Reembolsos:</span>
                    <span style={{ fontSize: '12px', color: '#1f2937' }}>-${todayData.cashOutTotal.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Closing Summary */}
            <div style={{ marginTop: '8px', padding: '12px', backgroundColor: '#f9fafb', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>Esperado en caja:</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>${expected.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0' }}>
                <span style={{ fontSize: '13px', color: '#6b7280' }}>Cierre real:</span>
                <span style={{ fontSize: '13px', fontWeight: '600', color: '#1f2937' }}>${closing.toFixed(2)}</span>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between', padding: '8px 0', marginTop: '4px',
                borderTop: '2px solid #d1d5db', fontWeight: '700', fontSize: '14px',
                color: diff === 0 ? '#059669' : diff > 0 ? '#2563eb' : '#dc2626'
              }}>
                <span>Diferencia:</span>
                <span>
                  {diff === 0 ? '✅ Cuadrado' : diff > 0 ? `+$${diff.toFixed(2)}` : `-$${Math.abs(diff).toFixed(2)}`}
                </span>
              </div>
            </div>

            {/* Notes */}
            {cashRegister.notes && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: '#9ca3af', fontStyle: 'italic' }}>
                Notas: {cashRegister.notes}
              </div>
            )}

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '10px', color: '#9ca3af' }}>
              Generado el {new Date().toLocaleString('es-EC')}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 border-t bg-gray-50 flex gap-2">
          <button
            onClick={downloadReport}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Download size={16} />
            {downloading ? 'Generando...' : 'Descargar PNG'}
          </button>
          <button
            onClick={sendWhatsApp}
            disabled={downloading}
            className="flex-1 flex items-center justify-center gap-2 px-3 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Send size={16} />
            WhatsApp
          </button>
        </div>
      </div>
    </div>
  )
}
