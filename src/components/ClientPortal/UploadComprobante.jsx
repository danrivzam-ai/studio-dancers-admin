import { useState, useRef } from 'react'
import { Upload, Camera, X, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const BANKS = [
  'Banco Pichincha', 'Banco del Pacífico', 'Banco de Guayaquil',
  'Banco Bolivariano', 'Banco del Austro', 'Banco Internacional',
  'Banco Solidario', 'Produbanco', 'BanEcuador',
  'Cooperativa JEP', 'Cooperativa Jardín Azuayo', 'PayPhone (Tarjeta)', 'Otro'
]

function compressImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const MAX = 1200
        const scale = Math.min(1, MAX / img.width)
        canvas.width = img.width * scale
        canvas.height = img.height * scale
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(resolve, 'image/jpeg', 0.72)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export default function UploadComprobante({ auth, student }) {
  const [open, setOpen] = useState(false)
  const [bank, setBank] = useState('')
  const [amount, setAmount] = useState('')
  const [receiptNo, setReceiptNo] = useState('')
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  // Reset form
  const resetForm = () => {
    setBank(''); setAmount(''); setReceiptNo('')
    setImage(null); setPreview(null); setError('')
  }

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target.result)
    reader.readAsDataURL(file)
    setImage(await compressImage(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!bank)                              { setError('Selecciona el banco o método de pago'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('Ingresa el monto transferido'); return }
    if (!image)                             { setError('Adjunta la foto del comprobante'); return }

    setLoading(true)
    try {
      // 1. Upload image to transfer-receipts bucket
      const fileName = `portal_${student.id}_${Date.now()}.jpg`
      const { error: uploadError } = await supabase.storage
        .from('transfer-receipts')
        .upload(fileName, image, { contentType: 'image/jpeg' })
      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('transfer-receipts')
        .getPublicUrl(fileName)

      // 2. Insert into transfer_requests — triggers realtime notification to admin
      const { error: insertError } = await supabase
        .from('transfer_requests')
        .insert({
          student_id: student.id,
          amount: parseFloat(amount),
          bank_name: bank,
          receipt_image_url: urlData.publicUrl,
          receipt_number: receiptNo.trim() || null,
          submitted_by_cedula: auth.cedula,
          submitted_by_phone: auth.phone4,
          status: 'pending'
        })
      if (insertError) throw insertError

      // 3. Show success
      setSuccess(true)
      resetForm()
      setTimeout(() => { setSuccess(false); setOpen(false) }, 4000)
    } catch (err) {
      console.error('Error subiendo comprobante:', err)
      setError('No se pudo enviar. Intenta de nuevo o contáctanos.')
    } finally {
      setLoading(false)
    }
  }

  // ── Success state ─────────────────────────────────────────────────
  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3">
        <CheckCircle size={22} className="text-green-500 shrink-0" />
        <div>
          <p className="font-semibold text-green-800 text-sm">¡Comprobante enviado!</p>
          <p className="text-xs text-green-600 mt-0.5">El estudio lo revisará y confirmará tu pago pronto.</p>
        </div>
      </div>
    )
  }

  // ── Collapsed button ──────────────────────────────────────────────
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center justify-between p-4 bg-purple-50 border border-purple-100 rounded-2xl hover:bg-purple-100 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-purple-600 rounded-xl flex items-center justify-center shrink-0">
            <Upload size={16} className="text-white" />
          </div>
          <div className="text-left">
            <p className="text-sm font-semibold text-purple-800">Subir comprobante de pago</p>
            <p className="text-xs text-purple-500">Transferencia, depósito o PayPhone</p>
          </div>
        </div>
        <ChevronDown size={18} className="text-purple-400" />
      </button>
    )
  }

  // ── Expanded form ─────────────────────────────────────────────────
  return (
    <div className="bg-white border border-purple-100 rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <button
        onClick={() => { setOpen(false); resetForm() }}
        className="w-full flex items-center justify-between px-4 py-3 bg-purple-600 text-white"
      >
        <div className="flex items-center gap-2">
          <Upload size={16} />
          <span className="text-sm font-semibold">Subir comprobante de pago</span>
        </div>
        <ChevronUp size={16} className="opacity-70" />
      </button>

      <form onSubmit={handleSubmit} className="p-4 space-y-3">
        {/* Banco */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Banco / método de pago</label>
          <select
            value={bank}
            onChange={(e) => setBank(e.target.value)}
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-purple-400"
          >
            <option value="">Seleccionar...</option>
            {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/* Monto */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Monto transferido ($)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">$</span>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full pl-7 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-purple-400"
            />
          </div>
        </div>

        {/* Número comprobante (opcional) */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">N° de comprobante <span className="text-gray-400">(opcional)</span></label>
          <input
            type="text"
            value={receiptNo}
            onChange={(e) => setReceiptNo(e.target.value)}
            placeholder="Ej: 0012345678"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-purple-400"
          />
        </div>

        {/* Foto del comprobante */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Foto del comprobante</label>
          {preview ? (
            <div className="relative rounded-xl overflow-hidden border border-gray-200">
              <img src={preview} alt="Comprobante" className="w-full max-h-44 object-contain bg-gray-50" />
              <button
                type="button"
                onClick={() => { setImage(null); setPreview(null) }}
                className="absolute top-2 right-2 bg-white/90 p-1 rounded-full shadow-sm"
              >
                <X size={14} className="text-gray-600" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full py-5 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center gap-1.5 hover:border-purple-300 hover:bg-purple-50/30 transition-colors"
            >
              <Camera size={24} className="text-gray-300" />
              <span className="text-xs text-gray-400">Toca para adjuntar foto</span>
            </button>
          )}
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </div>

        {/* Error */}
        {error && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-xl px-3 py-2">
            {error}
          </p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 active:bg-purple-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          {loading ? (
            <>
              <svg className="animate-spin w-4 h-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Enviando...
            </>
          ) : (
            <><Upload size={15} /> Enviar comprobante</>
          )}
        </button>
      </form>
    </div>
  )
}
