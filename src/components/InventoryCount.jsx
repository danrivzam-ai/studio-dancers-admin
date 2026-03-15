import { useState, useRef } from 'react'
import { X, ClipboardCheck, Download, AlertTriangle, CheckCircle, MinusCircle } from 'lucide-react'
import { toPng } from 'html-to-image'
import { useToast } from './Toast'
import Modal from './ui/Modal'

export default function InventoryCount({ products, onAdjustStock, onClose, schoolName }) {
  const toast = useToast()
  const reportRef = useRef(null)
  const [counts, setCounts] = useState({}) // { productCode: physicalCount }
  const [submitting, setSubmitting] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [submitted, setSubmitted] = useState(false) // show report after submit

  // Only products with stock tracking
  const trackedProducts = products.filter(p => p.stock !== null && p.stock !== undefined && p.active !== false)

  const handleCountChange = (code, value) => {
    setCounts(prev => ({
      ...prev,
      [code]: value === '' ? '' : parseInt(value) || 0
    }))
  }

  // Calculate differences
  const getDifferences = () => {
    return trackedProducts.map(p => {
      const code = p.code || p.id
      const systemStock = p.stock ?? 0
      const physical = counts[code]
      const hasCount = physical !== undefined && physical !== ''
      const physicalQty = hasCount ? parseInt(physical) : null
      const diff = hasCount ? physicalQty - systemStock : null
      return {
        ...p,
        code,
        systemStock,
        physicalQty,
        diff,
        hasCount
      }
    })
  }

  const differences = getDifferences()
  const countedItems = differences.filter(d => d.hasCount)
  const itemsWithDiff = countedItems.filter(d => d.diff !== 0)
  const allCounted = countedItems.length === trackedProducts.length
  const allMatch = itemsWithDiff.length === 0 && allCounted

  // Submit adjustments
  const handleSubmit = async () => {
    if (itemsWithDiff.length === 0 && allCounted) {
      toast.success('Todo cuadra perfectamente. Sin ajustes necesarios.')
      setSubmitted(true)
      return
    }

    if (!allCounted) {
      toast.warning('Completa el conteo de todos los productos antes de guardar.')
      return
    }

    setSubmitting(true)
    try {
      let adjusted = 0
      for (const item of itemsWithDiff) {
        const result = await onAdjustStock(
          item.code,
          item.diff, // positive = surplus, negative = shortage
          'adjustment',
          null,
          `Conteo físico: sistema ${item.systemStock}, real ${item.physicalQty}`
        )
        if (result.success) adjusted++
      }
      toast.success(`Inventario ajustado: ${adjusted} producto${adjusted !== 1 ? 's' : ''} actualizado${adjusted !== 1 ? 's' : ''}`)
      setSubmitted(true)
    } catch (err) {
      toast.error('Error al ajustar inventario: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  // Download report as PNG
  const handleDownload = async () => {
    if (!reportRef.current || downloading) return
    setDownloading(true)
    try {
      const dataUrl = await toPng(reportRef.current, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        skipFonts: true
      })
      const link = document.createElement('a')
      link.download = `Conteo_Inventario_${new Date().toISOString().slice(0, 10)}.png`
      link.href = dataUrl
      link.click()
    } catch (err) {
      console.error('Error generating report:', err)
      toast.error('Error al generar reporte')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} ariaLabel="Conteo físico de inventario">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 bg-purple-700 text-white rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl">
              <ClipboardCheck size={20} />
            </div>
            <div>
              <h3 className="font-semibold text-sm">Conteo Físico de Inventario</h3>
              <p className="text-purple-200 text-xs mt-0.5">
                {trackedProducts.length} producto{trackedProducts.length !== 1 ? 's' : ''} con control de stock
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/20 rounded-xl active:scale-95 transition-all">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {!submitted ? (
            <>
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 mb-4">
                <p className="text-xs text-blue-700">
                  Ingresa la cantidad <strong>real</strong> de cada producto. Al guardar, el sistema ajustará automáticamente las diferencias.
                </p>
              </div>

              {/* Product list */}
              {trackedProducts.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <ClipboardCheck size={40} className="mx-auto mb-3 opacity-40" />
                  <p className="font-medium text-gray-500">Sin productos con control de stock</p>
                  <p className="text-xs mt-1">Agrega stock a tus productos para usar el conteo físico.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {differences.map(item => (
                    <div
                      key={item.code}
                      className={`p-3 rounded-xl border transition-all ${
                        item.hasCount
                          ? item.diff === 0
                            ? 'border-green-200 bg-green-50/50'
                            : item.diff > 0
                              ? 'border-blue-200 bg-blue-50/50'
                              : 'border-red-200 bg-red-50/50'
                          : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm text-gray-800 truncate">{item.name}</p>
                          <p className="text-xs text-gray-500">
                            Sistema: <span className="font-semibold">{item.systemStock} ud</span>
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="0"
                            value={counts[item.code] ?? ''}
                            onChange={(e) => handleCountChange(item.code, e.target.value)}
                            className="w-20 text-center px-2 py-2 border-2 border-gray-200 rounded-xl text-sm font-bold focus:border-purple-400 outline-none transition-all"
                            placeholder="—"
                          />

                          {item.hasCount && (
                            <div className="w-16 text-center">
                              {item.diff === 0 ? (
                                <span className="text-xs font-semibold text-green-600 flex items-center gap-0.5 justify-center">
                                  <CheckCircle size={12} /> OK
                                </span>
                              ) : (
                                <span className={`text-xs font-bold ${item.diff > 0 ? 'text-blue-600' : 'text-red-600'}`}>
                                  {item.diff > 0 ? '+' : ''}{item.diff}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Summary */}
              {countedItems.length > 0 && (
                <div className={`mt-4 p-3 rounded-xl ${
                  allMatch ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'
                }`}>
                  <div className="flex items-center gap-2 mb-1">
                    {allMatch
                      ? <CheckCircle size={16} className="text-green-600" />
                      : <AlertTriangle size={16} className="text-amber-600" />
                    }
                    <span className={`text-sm font-semibold ${allMatch ? 'text-green-700' : 'text-amber-700'}`}>
                      {allMatch
                        ? 'Todo cuadra perfectamente'
                        : `${itemsWithDiff.length} producto${itemsWithDiff.length !== 1 ? 's' : ''} con diferencia`}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {countedItems.length} de {trackedProducts.length} contados
                    {!allCounted && ' · Completa todos para guardar'}
                  </p>
                </div>
              )}
            </>
          ) : (
            /* Report view after submit */
            <div>
              <div ref={reportRef} style={{ padding: '24px', backgroundColor: '#ffffff', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
                {/* Report Header */}
                <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                  <div style={{ fontSize: '16px', fontWeight: '700', color: '#1f2937' }}>{schoolName || 'Academia'}</div>
                  <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '2px' }}>CONTEO FÍSICO DE INVENTARIO</div>
                  <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '4px' }}>
                    {new Date().toLocaleDateString('es-EC', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                  </div>
                </div>

                {/* Table header */}
                <div style={{ display: 'flex', padding: '8px 4px', borderBottom: '2px solid #e5e7eb', fontSize: '10px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <span style={{ flex: 2 }}>Producto</span>
                  <span style={{ flex: 1, textAlign: 'center' }}>Sistema</span>
                  <span style={{ flex: 1, textAlign: 'center' }}>Real</span>
                  <span style={{ flex: 1, textAlign: 'center' }}>Dif.</span>
                </div>

                {/* Table rows */}
                {differences.filter(d => d.hasCount).map((item, i) => (
                  <div key={item.code} style={{
                    display: 'flex', padding: '8px 4px', alignItems: 'center',
                    borderBottom: '1px solid #f3f4f6',
                    backgroundColor: i % 2 === 0 ? '#ffffff' : '#f9fafb'
                  }}>
                    <span style={{ flex: 2, fontSize: '12px', color: '#374151', fontWeight: '500' }}>{item.name}</span>
                    <span style={{ flex: 1, textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>{item.systemStock}</span>
                    <span style={{ flex: 1, textAlign: 'center', fontSize: '12px', color: '#374151', fontWeight: '600' }}>{item.physicalQty}</span>
                    <span style={{
                      flex: 1, textAlign: 'center', fontSize: '12px', fontWeight: '700',
                      color: item.diff === 0 ? '#059669' : item.diff > 0 ? '#2563eb' : '#dc2626'
                    }}>
                      {item.diff === 0 ? '✓' : item.diff > 0 ? `+${item.diff}` : item.diff}
                    </span>
                  </div>
                ))}

                {/* Summary box */}
                <div style={{
                  marginTop: '16px', padding: '12px', borderRadius: '10px',
                  backgroundColor: allMatch ? '#ecfdf5' : '#fffbeb',
                  border: `1.5px solid ${allMatch ? '#a7f3d0' : '#fde68a'}`
                }}>
                  <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: '700', color: allMatch ? '#059669' : '#d97706' }}>
                    {allMatch ? 'Inventario cuadrado — sin diferencias' : `${itemsWithDiff.length} producto${itemsWithDiff.length !== 1 ? 's' : ''} ajustado${itemsWithDiff.length !== 1 ? 's' : ''}`}
                  </div>
                  {!allMatch && (
                    <div style={{ textAlign: 'center', fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
                      {itemsWithDiff.filter(d => d.diff < 0).length > 0 && `Faltantes: ${itemsWithDiff.filter(d => d.diff < 0).length}`}
                      {itemsWithDiff.filter(d => d.diff < 0).length > 0 && itemsWithDiff.filter(d => d.diff > 0).length > 0 && ' · '}
                      {itemsWithDiff.filter(d => d.diff > 0).length > 0 && `Sobrantes: ${itemsWithDiff.filter(d => d.diff > 0).length}`}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div style={{ textAlign: 'center', marginTop: '12px', fontSize: '10px', color: '#9ca3af' }}>
                  Generado el {new Date().toLocaleString('es-EC')}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t bg-gray-50 rounded-b-2xl">
          {!submitted ? (
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-3 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm active:scale-95 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={countedItems.length === 0 || submitting || !allCounted}
                className="flex-1 px-3 py-2.5 bg-purple-700 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95 transition-all"
              >
                {submitting
                  ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <ClipboardCheck size={16} />
                }
                {submitting ? 'Ajustando...' : allMatch ? 'Confirmar cuadre' : `Ajustar ${itemsWithDiff.length} diferencia${itemsWithDiff.length !== 1 ? 's' : ''}`}
              </button>
            </div>
          ) : (
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 px-3 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm active:scale-95 transition-all"
              >
                Cerrar
              </button>
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex-1 px-3 py-2.5 bg-purple-700 text-white rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 disabled:opacity-50 active:scale-95 transition-all"
              >
                {downloading
                  ? <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  : <Download size={16} />
                }
                {downloading ? 'Generando...' : 'Descargar Reporte'}
              </button>
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}
