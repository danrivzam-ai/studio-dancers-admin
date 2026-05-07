import { useState, useEffect, useCallback } from 'react'
import { FileText, Download, X, AlertCircle, CheckCircle, Loader2, RefreshCw, ExternalLink, Receipt, User, CreditCard } from 'lucide-react'
import { useInvoices } from '../hooks/useInvoices'
import { detectBuyerIdType, resolveBuyerData, generateItemDescription } from '../lib/sriUtils'
import { downloadRidePDF } from '../lib/rideGenerator'
import Modal from './ui/Modal'

const ID_TYPE_LABELS = { '04': 'RUC', '05': 'Cédula', '06': 'Pasaporte', '07': 'Consumidor Final' }

export default function InvoiceModal({ payment, student, courseName, settings, onClose, logoBase64 }) {
  const { submitToFactuplan, checkFactuplanStatus, downloadFactuplanDoc,
          getInvoiceByPayment, createDraftInvoice, loading } = useInvoices()

  const [invoice, setInvoice] = useState(null)
  const [step, setStep]       = useState('form')   // form | sending | processing | done | error
  const [errorMsg, setErrorMsg] = useState('')
  const [polling, setPolling]   = useState(false)

  const usesFactuplan = !!(settings?.sri_invoicing_enabled)

  const resolved = resolveBuyerData(student)
  const [buyer, setBuyer] = useState({
    name:     resolved.name     || '',
    idNumber: resolved.idNumber || '',
    email:    resolved.email    || '',
    address:  resolved.address  || '',
  })

  const { idType } = detectBuyerIdType(buyer.idNumber)
  const amount = parseFloat(payment?.amount || 0).toFixed(2)

  // Verificar si ya hay factura para este pago
  useEffect(() => {
    if (!payment?.id) return
    getInvoiceByPayment(payment.id).then(r => {
      if (r.success && r.data) { setInvoice(r.data); setStep('done') }
    })
  }, [payment?.id]) // eslint-disable-line

  // Poll automático cuando está procesando
  const pollStatus = useCallback(async (inv) => {
    if (!inv?.factuplan_id) return
    setPolling(true)
    try {
      const r = await checkFactuplanStatus({ invoiceId: inv.id, factuplanId: inv.factuplan_id })
      if (r.success) {
        const updated = { ...inv, status: r.localStatus }
        setInvoice(updated)
        if (r.localStatus === 'authorized') setStep('done')
        if (r.localStatus === 'rejected') { setStep('error'); setErrorMsg('El SRI rechazó el comprobante.') }
      }
    } finally {
      setPolling(false)
    }
  }, [checkFactuplanStatus])

  const handleEmit = async () => {
    if (!buyer.name.trim()) return
    setStep('sending')
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
    if (usesFactuplan) {
      result = await submitToFactuplan({ payment: paymentPayload, buyer: { idType, ...buyer }, settings })
      if (result.success) {
        const inv = result.data
        setInvoice(inv)
        if (inv.status === 'processing') {
          setStep('processing')
          setTimeout(() => pollStatus(inv), 8000)
        } else {
          setStep('done')
        }
      } else {
        setErrorMsg(result.error || 'Error al conectar con Factuplan')
        setStep('error')
      }
    } else {
      result = await createDraftInvoice({ payment, student, courseName, settings, buyerOverride: buyer })
      if (result.success) { setInvoice(result.data); setStep('done') }
      else { setErrorMsg(result.error || 'Error al generar'); setStep('error') }
    }
  }

  const handleDownloadPDF = async () => {
    if (!invoice) return
    if (invoice.factuplan_id) {
      const r = await downloadFactuplanDoc({ factuplanId: invoice.factuplan_id })
      const url = r?.data?.pdfUrl || r?.data?.pdf
      if (url) { window.open(url, '_blank'); return }
    }
    downloadRidePDF(invoice, { logoBase64 })
  }

  const handleDownloadXML = async () => {
    if (!invoice?.factuplan_id) return
    const r = await downloadFactuplanDoc({ factuplanId: invoice.factuplan_id })
    const url = r?.data?.xmlUrl || r?.data?.xml
    if (url) window.open(url, '_blank')
  }

  return (
    <Modal isOpen={true} onClose={onClose} ariaLabel="Factura electrónica"
      className="!items-end sm:!items-center !p-0 sm:!p-4">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-md flex flex-col overflow-hidden"
        style={{ maxHeight: '92svh', paddingBottom: 'env(safe-area-inset-bottom)' }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="bg-[#1e3a5f] text-white">
          <div className="flex justify-center pt-2.5 pb-0.5 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-white/25" />
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-2.5">
              <Receipt size={18} />
              <span className="font-semibold">Factura Electrónica</span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/15 transition">
              <X size={17} />
            </button>
          </div>
        </div>

        {/* ── Resumen del pago (siempre visible) ─────────────────────────── */}
        <div className="bg-[#f0f4fa] px-5 py-3 flex items-center justify-between text-sm border-b border-[#dce4f0]">
          <div>
            <p className="font-semibold text-gray-800 truncate max-w-[200px]">{student?.name}</p>
            <p className="text-gray-500 text-xs truncate max-w-[200px]">{courseName || 'Sin programa'}</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-[#1e3a5f] text-lg">${amount}</p>
            <p className="text-gray-400 text-xs capitalize">{payment?.payment_method}</p>
          </div>
        </div>

        {/* ── Contenido scrollable ────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto">

          {/* STEP: formulario ─────────────────────────────────────────────── */}
          {step === 'form' && (
            <div className="px-5 py-5 space-y-5">

              {/* Sección: comprador */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <User size={14} className="text-[#1e3a5f]" />
                  <span className="text-xs font-bold text-[#1e3a5f] uppercase tracking-wide">Datos del comprador</span>
                  {student?.is_minor && (
                    <span className="ml-auto text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Representante</span>
                  )}
                </div>

                <div className="space-y-3">
                  {/* Nombre */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Nombre / Razón Social <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={buyer.name}
                      onChange={e => setBuyer(p => ({ ...p, name: e.target.value }))}
                      placeholder="Ej: Juan Pérez García"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-[#1e3a5f] focus:bg-white focus:ring-2 focus:ring-[#1e3a5f]/10 transition"
                    />
                  </div>

                  {/* Identificación */}
                  <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Cédula / RUC / Pasaporte</label>
                      <input
                        type="text"
                        value={buyer.idNumber}
                        onChange={e => setBuyer(p => ({ ...p, idNumber: e.target.value }))}
                        placeholder="0000000000"
                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-[#1e3a5f] focus:bg-white focus:ring-2 focus:ring-[#1e3a5f]/10 transition"
                      />
                    </div>
                    <div className="rounded-xl bg-[#eef2f8] border border-[#dce4f0] px-3 py-2.5 text-xs font-semibold text-[#1e3a5f] whitespace-nowrap">
                      {ID_TYPE_LABELS[idType]}
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Correo electrónico
                      <span className="ml-1 text-gray-400 font-normal">(para envío automático)</span>
                    </label>
                    <input
                      type="email"
                      value={buyer.email}
                      onChange={e => setBuyer(p => ({ ...p, email: e.target.value }))}
                      placeholder="correo@ejemplo.com"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-[#1e3a5f] focus:bg-white focus:ring-2 focus:ring-[#1e3a5f]/10 transition"
                    />
                  </div>

                  {/* Dirección */}
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      Dirección
                      <span className="ml-1 text-gray-400 font-normal">(opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={buyer.address}
                      onChange={e => setBuyer(p => ({ ...p, address: e.target.value }))}
                      placeholder="Ej: Alborada, Guayaquil"
                      className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3.5 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-[#1e3a5f] focus:bg-white focus:ring-2 focus:ring-[#1e3a5f]/10 transition"
                    />
                  </div>
                </div>
              </div>

              {/* Sección: detalle de factura */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CreditCard size={14} className="text-[#1e3a5f]" />
                  <span className="text-xs font-bold text-[#1e3a5f] uppercase tracking-wide">Detalle de la factura</span>
                </div>
                <div className="rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-4 py-3 flex justify-between text-sm">
                    <span className="text-gray-600">Enseñanza de danza</span>
                    <span className="font-medium text-gray-800">${amount}</span>
                  </div>
                  <div className="px-4 py-2 flex justify-between text-xs bg-gray-50 border-t border-gray-100">
                    <span className="text-gray-400">IVA 0% — actividad P8549.03</span>
                    <span className="text-gray-400">$0.00</span>
                  </div>
                  <div className="px-4 py-3 flex justify-between text-sm font-bold border-t border-gray-200 bg-[#f0f4fa]">
                    <span className="text-[#1e3a5f]">TOTAL</span>
                    <span className="text-[#1e3a5f]">${amount}</span>
                  </div>
                </div>
              </div>

              {!usesFactuplan && (
                <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-xl px-4 py-3">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>Factuplan no está activo. Se generará un borrador local sin autorización SRI.</span>
                </div>
              )}

              {errorMsg && (
                <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 rounded-xl px-4 py-3">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          )}

          {/* STEP: enviando ───────────────────────────────────────────────── */}
          {step === 'sending' && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 size={40} className="animate-spin text-[#1e3a5f]" />
              <p className="text-sm text-gray-500">Enviando a Factuplan…</p>
            </div>
          )}

          {/* STEP: procesando en SRI ─────────────────────────────────────── */}
          {step === 'processing' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 px-6 text-center">
              <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center">
                <Loader2 size={30} className="animate-spin text-amber-500" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">Procesando en el SRI</p>
                <p className="text-sm text-gray-500 mt-1 leading-snug">
                  La factura fue enviada.<br />El SRI está validando el comprobante.
                </p>
              </div>
              <button onClick={() => pollStatus(invoice)} disabled={polling}
                className="flex items-center gap-1.5 text-sm px-4 py-2 rounded-xl border border-amber-200 text-amber-700 hover:bg-amber-50 disabled:opacity-50 transition">
                <RefreshCw size={13} className={polling ? 'animate-spin' : ''} />
                {polling ? 'Consultando…' : 'Verificar estado'}
              </button>
            </div>
          )}

          {/* STEP: autorizada ─────────────────────────────────────────────── */}
          {step === 'done' && invoice && (
            <div className="px-5 py-6 space-y-4">
              <div className="flex flex-col items-center gap-2 py-2">
                <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle size={28} className="text-emerald-500" />
                </div>
                <p className="font-bold text-gray-800">Factura generada</p>
                {invoice.invoice_number && (
                  <p className="text-sm text-gray-500">N° {invoice.invoice_number}</p>
                )}
                <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                  invoice.status === 'authorized' ? 'bg-emerald-100 text-emerald-700' :
                  invoice.status === 'processing' ? 'bg-amber-100 text-amber-700' :
                  'bg-gray-100 text-gray-600'
                }`}>
                  {invoice.status === 'authorized' ? '✓ Autorizada SRI' :
                   invoice.status === 'processing' ? 'Procesando…' : invoice.status}
                </span>
              </div>

              <div className="rounded-xl border border-gray-200 divide-y divide-gray-100 text-sm overflow-hidden">
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-gray-500">Comprador</span>
                  <span className="font-medium text-gray-800 truncate max-w-[55%] text-right">{invoice.buyer_name}</span>
                </div>
                <div className="flex justify-between px-4 py-2.5">
                  <span className="text-gray-500">Identificación</span>
                  <span className="text-gray-700">{invoice.buyer_id_number}</span>
                </div>
                {invoice.authorization_number && (
                  <div className="flex justify-between px-4 py-2.5">
                    <span className="text-gray-500">Clave acceso</span>
                    <span className="text-gray-500 text-xs truncate max-w-[55%] text-right">{invoice.authorization_number}</span>
                  </div>
                )}
                <div className="flex justify-between px-4 py-2.5 font-semibold bg-gray-50">
                  <span>Total</span>
                  <span>${Number(invoice.total).toFixed(2)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <button onClick={handleDownloadPDF}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white bg-[#1e3a5f] hover:bg-[#162d4a] active:scale-[.98] transition">
                  <Download size={15} />
                  Descargar RIDE (PDF)
                </button>
                {invoice.factuplan_id && (
                  <button onClick={handleDownloadXML}
                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 active:scale-[.98] transition">
                    <ExternalLink size={14} />
                    Descargar XML
                  </button>
                )}
              </div>
            </div>
          )}

          {/* STEP: error ──────────────────────────────────────────────────── */}
          {step === 'error' && (
            <div className="flex flex-col items-center justify-center py-12 gap-4 px-6 text-center">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
                <AlertCircle size={28} className="text-red-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-800">No se pudo emitir</p>
                <p className="text-sm text-red-500 mt-1">{errorMsg}</p>
              </div>
              <button onClick={() => { setStep('form'); setErrorMsg('') }}
                className="text-sm text-[#1e3a5f] underline underline-offset-2">
                Intentar de nuevo
              </button>
            </div>
          )}
        </div>

        {/* ── Footer con acciones ─────────────────────────────────────────── */}
        {(step === 'form' || step === 'done' || step === 'error' || step === 'processing') && (
          <div className="px-5 py-4 border-t border-gray-100 flex gap-2.5">
            {step === 'form' && (
              <>
                <button onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition">
                  Cancelar
                </button>
                <button onClick={handleEmit} disabled={loading || !buyer.name.trim()}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#1e3a5f] hover:bg-[#162d4a] disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition active:scale-[.98]">
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
                  Emitir Factura
                </button>
              </>
            )}
            {(step === 'done' || step === 'error' || step === 'processing') && (
              <button onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition">
                Cerrar
              </button>
            )}
          </div>
        )}
      </div>
    </Modal>
  )
}
