import { useState, useEffect, useCallback } from 'react'
import { FileText, Download, X, AlertCircle, CheckCircle, Loader2, RefreshCw, ExternalLink } from 'lucide-react'
import { useInvoices } from '../hooks/useInvoices'
import { detectBuyerIdType, resolveBuyerData, getBuyerIdTypeLabel, generateItemDescription } from '../lib/sriUtils'
import { downloadRidePDF } from '../lib/rideGenerator'
import Modal from './ui/Modal'

/**
 * Modal para emitir y gestionar facturas electrónicas via Factuplan → SRI Ecuador
 *
 * Flujo:
 *  buyer → (loading) → processing → authorized
 *                                 → rejected / error
 *
 * Si Factuplan no está configurado (sin emission_point_id) se genera borrador local.
 */
export default function InvoiceModal({ payment, student, courseName, settings, onClose, logoBase64 }) {
  const { submitToFactuplan, checkFactuplanStatus, downloadFactuplanDoc,
          getInvoiceByPayment, createDraftInvoice, loading } = useInvoices()

  const [existingInvoice, setExistingInvoice] = useState(null)
  const [step, setStep]       = useState('buyer')  // buyer | loading | processing | done | error
  const [errorMsg, setErrorMsg] = useState('')
  const [polling, setPolling]   = useState(false)

  const usesFactuplan = !!(settings?.factuplan_emission_point_id || settings?.sri_invoicing_enabled)

  // Datos comprador (pre-llenados desde alumna)
  const resolved = resolveBuyerData(student)
  const [buyer, setBuyer] = useState({
    name:     resolved.name,
    idNumber: resolved.idNumber,
    email:    resolved.email,
    phone:    resolved.phone,
    address:  resolved.address,
  })

  const { idType } = detectBuyerIdType(buyer.idNumber)

  // Verificar si ya existe factura
  useEffect(() => {
    async function checkExisting() {
      if (!payment?.id) return
      const result = await getInvoiceByPayment(payment.id)
      if (result.success && result.data) {
        setExistingInvoice(result.data)
        setStep('done')
      }
    }
    checkExisting()
  }, [payment?.id])  // eslint-disable-line

  // ── Polling automático cuando está en 'processing' ────────────────────────
  const pollStatus = useCallback(async (invoice) => {
    if (!invoice?.factuplan_id) return
    setPolling(true)
    try {
      const r = await checkFactuplanStatus({ invoiceId: invoice.id, factuplanId: invoice.factuplan_id })
      if (r.success) {
        const updated = { ...invoice, status: r.localStatus }
        setExistingInvoice(updated)
        if (r.localStatus === 'authorized') setStep('done')
        else if (r.localStatus === 'rejected') { setStep('error'); setErrorMsg('El SRI rechazó el comprobante. Revise los datos e intente de nuevo.') }
      }
    } finally {
      setPolling(false)
    }
  }, [checkFactuplanStatus])

  // ── Emitir ────────────────────────────────────────────────────────────────
  const handleGenerate = async () => {
    if (!buyer.name.trim()) { setErrorMsg('El nombre del comprador es obligatorio'); return }
    setStep('loading')
    setErrorMsg('')

    const paymentPayload = {
      id:            payment.id,
      studentId:     student?.id,
      amount:        payment.amount,
      paymentMethod: payment.payment_method,
      description:   generateItemDescription(payment, student, courseName),
      studentName:   student?.name,
      courseName,
    }

    let result

    // ── Ruta Factuplan (producción) ──────────────────────────────────────
    if (usesFactuplan) {
      result = await submitToFactuplan({
        payment:  paymentPayload,
        buyer:    { idType, ...buyer },
        settings,
      })

      if (result.success) {
        const inv = result.data
        setExistingInvoice(inv)
        if (inv.status === 'processing') {
          setStep('processing')
          // Primer poll automático a los 8 s (el SRI suele tardar 3-10 s)
          setTimeout(() => pollStatus(inv), 8000)
        } else {
          setStep('done')
        }
      } else {
        setErrorMsg(result.error || 'Error al comunicarse con Factuplan')
        setStep('error')
      }
      return
    }

    // ── Ruta borrador local (fallback sin Factuplan) ──────────────────────
    result = await createDraftInvoice({ payment, student, courseName, settings, buyerOverride: buyer })
    if (result.success) { setExistingInvoice(result.data); setStep('done') }
    else { setErrorMsg(result.error || 'Error al generar la factura'); setStep('error') }
  }

  // ── Descargar PDF desde Factuplan ─────────────────────────────────────────
  const handleDownloadPDF = async () => {
    if (!existingInvoice) return
    if (existingInvoice.factuplan_id) {
      const r = await downloadFactuplanDoc({ factuplanId: existingInvoice.factuplan_id })
      if (r.success && r.data?.pdfUrl) {
        window.open(r.data.pdfUrl, '_blank')
      } else if (r.success && r.data?.pdf) {
        window.open(r.data.pdf, '_blank')
      } else {
        // Fallback: RIDE local
        downloadRidePDF(existingInvoice, { logoBase64 })
      }
    } else {
      downloadRidePDF(existingInvoice, { logoBase64 })
    }
  }

  const amount = parseFloat(payment?.amount || 0).toFixed(2)

  // ── Colores de estado ─────────────────────────────────────────────────────
  const statusChip = {
    authorized: 'bg-emerald-100 text-emerald-700',
    processing: 'bg-amber-100 text-amber-700',
    draft:      'bg-gray-100 text-gray-600',
    rejected:   'bg-red-100 text-red-700',
    voided:     'bg-gray-100 text-gray-500',
  }
  const statusLabel = {
    authorized: 'Autorizada SRI ✓',
    processing: 'Procesando en SRI…',
    draft:      'Borrador',
    rejected:   'Rechazada',
    voided:     'Anulada',
  }

  return (
    <Modal isOpen={true} onClose={onClose} ariaLabel="Factura electrónica"
      className="!items-end sm:!items-center !p-0 sm:!p-4">
      <div className="relative bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[92svh] sm:max-h-[90vh] flex flex-col overflow-hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}>

        {/* Header */}
        <div className="flex flex-col" style={{ background: '#1e3a5f' }}>
          <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-white/30" />
          </div>
          <div className="px-5 pb-4 pt-3 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white">
              <FileText size={18} />
              <span className="font-semibold text-base">Factura Electrónica</span>
            </div>
            <button onClick={onClose} aria-label="Cerrar"
              className="p-2 hover:bg-white/20 rounded-xl active:scale-95 transition-all text-white">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">

          {/* Resumen del pago */}
          <div className="rounded-xl p-3.5" style={{ background: '#eef2f8' }}>
            <p className="text-xs font-semibold text-[#1e3a5f] mb-2 uppercase tracking-wide">Pago a facturar</p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              <span className="text-gray-500">Alumna</span>
              <span className="font-medium text-gray-800 truncate">{student?.name}</span>
              <span className="text-gray-500">Programa</span>
              <span className="font-medium text-gray-800 truncate">{courseName || 'N/A'}</span>
              <span className="text-gray-500">Monto</span>
              <span className="font-bold text-[#1e3a5f]">${amount}</span>
              <span className="text-gray-500">Forma de pago</span>
              <span className="font-medium text-gray-800 capitalize">{payment?.payment_method}</span>
            </div>
          </div>

          {/* ── Step: datos del comprador ─────────────────────────────────── */}
          {step === 'buyer' && (
            <>
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-gray-700">Datos del Comprador</h3>
                {student?.is_minor && (
                  <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">
                    Menor — datos del representante
                  </span>
                )}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Nombre / Razón Social *</label>
                  <input type="text" value={buyer.name}
                    onChange={e => setBuyer(p => ({ ...p, name: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1e3a5f]"
                    placeholder="Nombre completo o razón social" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 mb-1 block">Cédula / RUC / Pasaporte</label>
                    <input type="text" value={buyer.idNumber}
                      onChange={e => setBuyer(p => ({ ...p, idNumber: e.target.value }))}
                      className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1e3a5f]"
                      placeholder="Identificación" />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 mb-1 block">Tipo</label>
                    <div className="border-2 border-gray-100 rounded-xl px-2 py-2 text-xs bg-gray-50 text-gray-600 h-[42px] flex items-center">
                      {getBuyerIdTypeLabel(idType)}
                    </div>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Email (para envío automático)</label>
                  <input type="email" value={buyer.email}
                    onChange={e => setBuyer(p => ({ ...p, email: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1e3a5f]"
                    placeholder="correo@ejemplo.com (opcional)" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 mb-1 block">Dirección</label>
                  <input type="text" value={buyer.address}
                    onChange={e => setBuyer(p => ({ ...p, address: e.target.value }))}
                    className="w-full border-2 border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#1e3a5f]"
                    placeholder="Dirección del comprador (opcional)" />
                </div>
              </div>

              {/* Preview montos */}
              <div className="rounded-xl p-3 bg-gray-50">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Enseñanza de danza — IVA 0%</span>
                  <span className="font-medium">${amount}</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-sm font-bold">
                  <span>TOTAL</span><span>${amount}</span>
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">Exento de IVA — actividad P8549.03 SRI</p>
              </div>

              {errorMsg && (
                <div className="flex items-center gap-2 text-red-600 text-sm bg-red-50 p-3 rounded-xl">
                  <AlertCircle size={15} className="shrink-0" />
                  {errorMsg}
                </div>
              )}

              {!usesFactuplan && (
                <p className="text-xs text-amber-700 bg-amber-50 p-3 rounded-xl">
                  ⚠ Factuplan no está configurado. Se generará un borrador local sin autorización SRI.
                  Configure el punto de emisión en Ajustes para emitir facturas reales.
                </p>
              )}
            </>
          )}

          {/* ── Step: generando ──────────────────────────────────────────── */}
          {step === 'loading' && (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
              <Loader2 size={36} className="animate-spin text-[#1e3a5f]" />
              <p className="text-sm text-gray-600">Enviando a Factuplan…</p>
            </div>
          )}

          {/* ── Step: procesando en SRI ───────────────────────────────────── */}
          {step === 'processing' && existingInvoice && (
            <div className="flex flex-col items-center justify-center py-6 gap-4 text-center">
              <div className="w-14 h-14 rounded-full bg-amber-100 flex items-center justify-center">
                <Loader2 size={28} className="animate-spin text-amber-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">Procesando en el SRI</p>
                <p className="text-sm text-gray-500 mt-1">La factura fue enviada. El SRI está validando el comprobante.</p>
                <p className="text-xs text-gray-400 mt-1">Esto puede tardar hasta 30 segundos.</p>
              </div>
              <button
                onClick={() => pollStatus(existingInvoice)}
                disabled={polling}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-300 text-amber-700 text-sm hover:bg-amber-50 disabled:opacity-50"
              >
                <RefreshCw size={14} className={polling ? 'animate-spin' : ''} />
                {polling ? 'Consultando…' : 'Verificar estado'}
              </button>
            </div>
          )}

          {/* ── Step: factura lista ───────────────────────────────────────── */}
          {step === 'done' && existingInvoice && (
            <>
              <div className="flex flex-col items-center py-4 gap-2">
                <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center">
                  <CheckCircle size={28} className="text-emerald-600" />
                </div>
                <p className="font-bold text-gray-800 text-lg">Factura Generada</p>
                {existingInvoice.invoice_number && (
                  <p className="text-sm text-gray-500">N° {existingInvoice.invoice_number}</p>
                )}
                <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusChip[existingInvoice.status] ?? statusChip.draft}`}>
                  {statusLabel[existingInvoice.status] ?? existingInvoice.status}
                </span>
              </div>

              <div className="bg-gray-50 rounded-xl p-3.5 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Comprador</span>
                  <span className="font-medium text-gray-800 truncate max-w-[60%] text-right">{existingInvoice.buyer_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Identificación</span>
                  <span className="text-gray-700">{existingInvoice.buyer_id_number}</span>
                </div>
                {existingInvoice.authorization_number && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Clave acceso</span>
                    <span className="text-gray-700 text-xs truncate max-w-[55%]">{existingInvoice.authorization_number}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold pt-1 border-t">
                  <span>Total</span>
                  <span>${Number(existingInvoice.total).toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <button onClick={handleDownloadPDF}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white"
                  style={{ background: '#1e3a5f' }}>
                  <Download size={16} />
                  Descargar RIDE (PDF)
                </button>
                {existingInvoice.factuplan_id && (
                  <button onClick={async () => {
                    const r = await downloadFactuplanDoc({ factuplanId: existingInvoice.factuplan_id })
                    if (r.success && (r.data?.xmlUrl || r.data?.xml)) {
                      window.open(r.data.xmlUrl || r.data.xml, '_blank')
                    }
                  }}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 transition">
                    <ExternalLink size={14} />
                    Descargar XML
                  </button>
                )}
              </div>
            </>
          )}

          {/* ── Step: error ───────────────────────────────────────────────── */}
          {step === 'error' && (
            <div className="flex flex-col items-center py-6 gap-3 text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center">
                <AlertCircle size={28} className="text-red-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">Error al emitir</p>
                <p className="text-sm text-red-600 mt-1">{errorMsg}</p>
              </div>
              <button onClick={() => { setStep('buyer'); setErrorMsg('') }}
                className="text-sm text-[#1e3a5f] underline">
                Intentar de nuevo
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t flex gap-3">
          {step === 'buyer' && (
            <>
              <button onClick={onClose}
                className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
                Cancelar
              </button>
              <button onClick={handleGenerate}
                disabled={loading || !buyer.name.trim()}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: '#1e3a5f' }}>
                {loading ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
                Emitir Factura
              </button>
            </>
          )}
          {(step === 'done' || step === 'processing' || step === 'error') && (
            <button onClick={onClose}
              className="flex-1 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition">
              Cerrar
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
