import { forwardRef, useState } from 'react'
import { X, Download, Check, Send } from 'lucide-react'

/**
 * Diseño único de comprobantes (pago de alumna, pago rápido, venta y abono).
 * Formato horizontal-compacto: 420 px de ancho y datos en dos columnas para que
 * la imagen que se comparte por WhatsApp sea corta (≈ 4:5) sin perder datos.
 * Siempre claro (.force-light): no hereda el modo oscuro.
 */

const BRAND = '#551735'
const BRAND_SOFT = '#fbf3f7'
const LINE = '#ece4e8'
const INK = '#2b1a22'
const MUTED = '#8a7a82'

const RECEIPT_WIDTH = 420

/** Hoja del comprobante: cabecera de la escuela + tipo/número/fecha + contenido. */
export const ReceiptSheet = forwardRef(function ReceiptSheet(
  { settings = {}, title, number, date, tags = [], children, thanks = '¡Gracias por su preferencia!' }, ref
) {
  const name = settings.name || 'Studio Dancers'
  const footer = [settings.phone && `Tel. ${settings.phone}`, settings.email, settings.address].filter(Boolean).join(' · ')
  // El RUC es de la razón social (ADLAB STUDIO S.A.S.), no del nombre comercial
  const legal = [settings.legal_name, settings.ruc && `RUC ${settings.ruc}`].filter(Boolean).join(' · ')
  return (
    <div ref={ref} className="force-light"
      style={{ width: RECEIPT_WIDTH, maxWidth: '100%', background: '#fff', color: INK, fontFamily: 'Arial, Helvetica, sans-serif',
        borderRadius: 14, overflow: 'hidden', border: `1px solid ${LINE}` }}>
      {/* Cabecera: escuela a la izquierda, comprobante a la derecha */}
      <div style={{ background: BRAND, color: '#fff', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        {/* Logo crema de la marca (archivo propio: siempre sale en la imagen descargada) */}
        <img src="/logo-cream-receipt.png" alt={name} style={{ height: 42, width: 'auto', display: 'block' }} />
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{ fontSize: 9, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.8 }}>{title}</div>
          {number && <div style={{ fontWeight: 700, fontSize: 14, marginTop: 1 }}>N° {number}</div>}
          {date && <div style={{ fontSize: 10, opacity: 0.85 }}>{date}</div>}
        </div>
      </div>

      <div style={{ padding: '14px 18px 12px' }}>
        {tags.filter(Boolean).length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 10 }}>
            {tags.filter(Boolean).map(t => (
              <span key={t} style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.6, textTransform: 'uppercase', color: BRAND,
                background: BRAND_SOFT, border: `1px solid ${LINE}`, borderRadius: 999, padding: '2px 8px' }}>{t}</span>
            ))}
          </div>
        )}
        {children}
        <div style={{ textAlign: 'center', fontSize: 10, color: MUTED, marginTop: 12, paddingTop: 10, borderTop: `1px dashed ${LINE}` }}>
          <div style={{ fontWeight: 700, color: BRAND, fontSize: 11 }}>{thanks}</div>
          {footer && <div style={{ marginTop: 2 }}>{footer}</div>}
          {legal && <div style={{ marginTop: 1, fontSize: 9 }}>{legal}</div>}
        </div>
      </div>
    </div>
  )
})

/** Datos en dos columnas: [{ label, value, full? }] */
export function ReceiptFields({ items }) {
  const list = items.filter(i => i && i.value)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: 14, rowGap: 8, marginBottom: 12 }}>
      {list.map(i => (
        <div key={i.label} style={{ gridColumn: i.full ? '1 / -1' : 'auto', minWidth: 0 }}>
          <div style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6 }}>{i.label}</div>
          <div style={{ fontSize: 12, fontWeight: 600, lineHeight: 1.25, overflowWrap: 'anywhere' }}>{i.value}</div>
        </div>
      ))}
    </div>
  )
}

/** Bloque del monto: total grande a la izquierda, forma de pago a la derecha. */
export function ReceiptAmount({ label = 'Total pagado', amount, method, detail, strike }) {
  return (
    <div style={{ background: BRAND_SOFT, border: `1px solid ${LINE}`, borderRadius: 12, padding: '10px 14px', marginBottom: 10,
      display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
      <div>
        <div style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.6 }}>{label}</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 26, fontWeight: 800, color: BRAND, lineHeight: 1.1 }}>${parseFloat(amount || 0).toFixed(2)}</span>
          {strike && <span style={{ fontSize: 12, color: MUTED, textDecoration: 'line-through' }}>{strike}</span>}
        </div>
      </div>
      {(method || detail) && (
        <div style={{ textAlign: 'right', fontSize: 11, minWidth: 0 }}>
          {method && <div style={{ fontWeight: 700 }}>{method}</div>}
          {detail && <div style={{ color: MUTED, marginTop: 1, overflowWrap: 'anywhere' }}>{detail}</div>}
        </div>
      )}
    </div>
  )
}

/** Fila de cifras en columnas iguales: [{ label, value, tone }] (tone: 'ok' | 'warn') */
export function ReceiptStats({ title, items }) {
  const color = (tone) => (tone === 'ok' ? '#1f7a4d' : tone === 'warn' ? '#b45309' : INK)
  return (
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 12, padding: '8px 10px', marginBottom: 10 }}>
      {title && <div style={{ fontSize: 9, fontWeight: 700, color: BRAND, textTransform: 'uppercase', letterSpacing: 0.6, marginBottom: 6 }}>{title}</div>}
      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${items.length}, 1fr)`, gap: 6, textAlign: 'center' }}>
        {items.map(i => (
          <div key={i.label}>
            <div style={{ fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.4 }}>{i.label}</div>
            <div style={{ fontSize: 13, fontWeight: 700, color: color(i.tone) }}>{i.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Líneas de artículos (venta): [{ name, detail, amount }] */
export function ReceiptItems({ items }) {
  return (
    <div style={{ borderTop: `1px dashed ${LINE}`, borderBottom: `1px dashed ${LINE}`, padding: '6px 0', marginBottom: 10 }}>
      {items.map((i, idx) => (
        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '3px 0', fontSize: 12 }}>
          <div style={{ minWidth: 0 }}>
            <span style={{ fontWeight: 600 }}>{i.name}</span>
            {i.detail && <span style={{ color: MUTED, marginLeft: 6, fontSize: 11 }}>{i.detail}</span>}
          </div>
          <span style={{ fontWeight: 600, flexShrink: 0 }}>{i.amount}</span>
        </div>
      ))}
    </div>
  )
}

/** Ventana estándar alrededor del comprobante: vista previa + acciones iguales en todos. */
export function ReceiptModal({ title, onClose, onDownload, onWhatsApp, children }) {
  const [state, setState] = useState('idle') // idle | busy | done
  const download = async () => {
    setState('busy')
    try { await onDownload(); setState('done'); setTimeout(() => setState('idle'), 2500) }
    catch (err) { console.error('Error generando comprobante:', err); alert('No se pudo generar la imagen. Intenta de nuevo.'); setState('idle') }
  }
  return (
    <div className="fixed inset-0 bg-black/55 flex items-end sm:items-center justify-center p-0 sm:p-4 z-[60]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-paper w-full sm:w-auto sm:max-w-[468px] rounded-t-2xl sm:rounded-2xl shadow-2xl flex flex-col max-h-[94svh]"
        role="dialog" aria-modal="true" aria-label={title}>
        <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
          <p className="font-semibold text-ink">{title}</p>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full text-ink-muted hover:bg-surface-alt" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto p-3 sm:p-4 flex justify-center">{children}</div>
        <div className="flex gap-2 p-3 sm:p-4 border-t border-line shrink-0">
          <button onClick={download} disabled={state === 'busy'} className="flex-1 sd-btn sd-btn-primary">
            {state === 'done' ? <Check size={17} /> : <Download size={17} />}
            {state === 'busy' ? 'Generando…' : state === 'done' ? '¡Descargado!' : 'Descargar imagen'}
          </button>
          {onWhatsApp && (
            <button onClick={onWhatsApp} className="flex-1 sd-btn sd-btn-secondary">
              <Send size={17} /> WhatsApp
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
