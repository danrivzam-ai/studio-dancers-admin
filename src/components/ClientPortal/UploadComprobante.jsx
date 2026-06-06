import { useState, useRef, useEffect } from 'react'
import { Upload, Camera, X, CheckCircle, ChevronDown, ChevronUp, Clock, XCircle, BadgeCheck } from 'lucide-react'
import { supabase } from '../../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

const BANKS = [
  'Banco Pichincha', 'Banco del Pacífico', 'Banco de Guayaquil',
  'Banco Bolivariano', 'Banco del Austro', 'Banco Internacional',
  'Banco Solidario', 'Produbanco', 'BanEcuador',
  'Cooperativa JEP', 'Cooperativa Jardín Azuayo', 'Otro'
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

  // Últimas solicitudes de transferencia del alumno
  const [recentRequests, setRecentRequests] = useState([])

  useEffect(() => {
    if (!student?.id) return
    supabase
      .from('transfer_requests')
      .select('id, amount, bank_name, status, rejection_reason, submitted_at, receipt_number')
      .eq('student_id', student.id)
      .order('submitted_at', { ascending: false })
      .limit(5)
      .then(({ data }) => { if (data) setRecentRequests(data) })
  }, [student?.id, success]) // re-fetch after new submission

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

      // 3. Notificar a Telegram — vía Edge Function server-side. El token del
      // bot vive en school_settings y se lee con el service role; el portal
      // (superficie pública) nunca lo recibe ni lo expone en el bundle.
      try {
        await fetch(`${SUPABASE_URL}/functions/v1/notify-transfer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            studentName: student?.name || '—',
            amount: parseFloat(amount),
            bankName: bank,
            receiptNumber: receiptNo.trim() || null
          })
        })
      } catch {
        // Silencioso — no bloquea el flujo del portal
      }

      // 4. Show success
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

  // ── Helpers de estado ─────────────────────────────────────────────
  const statusConfig = (req) => {
    if (req.status === 'approved') return {
      icon: <CheckCircle size={15} className="text-green-500 shrink-0" />,
      label: 'Pago confirmado',
      sub: `$${parseFloat(req.amount).toFixed(2)} · ${req.bank_name}`,
      bg: 'bg-green-50 border-green-200',
      text: 'text-green-800',
    }
    if (req.status === 'rejected' && req.rejection_reason === 'COBRADO_EXTERNAMENTE') return {
      icon: <BadgeCheck size={15} className="text-blue-500 shrink-0" />,
      label: 'Pago procesado',
      sub: `$${parseFloat(req.amount).toFixed(2)} · ${req.bank_name}`,
      bg: 'bg-blue-50 border-blue-200',
      text: 'text-blue-800',
    }
    if (req.status === 'rejected') return {
      icon: <XCircle size={15} className="text-red-400 shrink-0" />,
      label: 'Comprobante rechazado',
      sub: req.rejection_reason || 'Contáctanos para más información',
      bg: 'bg-red-50 border-red-200',
      text: 'text-red-800',
    }
    // pending / default
    return {
      icon: <Clock size={15} className="text-amber-500 shrink-0" />,
      label: 'En revisión…',
      sub: `$${parseFloat(req.amount).toFixed(2)} · ${req.bank_name} · Te avisamos cuando se confirme`,
      bg: 'bg-amber-50 border-amber-200',
      text: 'text-amber-800',
    }
  }

  // ── Collapsed button ──────────────────────────────────────────────
  if (!open) {
    return (
      <div className="space-y-2">
        {/* Historial de solicitudes recientes */}
        {recentRequests.map(req => {
          const cfg = statusConfig(req)
          return (
            <div key={req.id} className={`flex items-start gap-2.5 p-3 rounded-2xl border ${cfg.bg}`}>
              {cfg.icon}
              <div className="min-w-0">
                <p className={`text-sm font-semibold ${cfg.text}`}>{cfg.label}</p>
                <p className={`text-xs mt-0.5 ${cfg.text} opacity-75 leading-snug`}>{cfg.sub}</p>
              </div>
            </div>
          )
        })}

        <button
          onClick={() => setOpen(true)}
          className="w-full flex items-center justify-between p-4 bg-[#fdf5f9] border border-[#f9e8f0] rounded-2xl hover:bg-[#f9e8f0] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#6b2145] rounded-xl flex items-center justify-center shrink-0">
              <Upload size={16} className="text-white" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-[#441029]">Subir comprobante de pago</p>
              <p className="text-xs text-[#7e2d55]">Transferencia o depósito bancario</p>
            </div>
          </div>
          <ChevronDown size={18} className="text-[#9e4d75]" />
        </button>
      </div>
    )
  }

  // ── Expanded form ─────────────────────────────────────────────────
  return (
    <div className="bg-white border border-[#f9e8f0] rounded-2xl overflow-hidden shadow-sm">
      {/* Header */}
      <button
        onClick={() => { setOpen(false); resetForm() }}
        className="w-full flex items-center justify-between px-4 py-3 bg-[#6b2145] text-white"
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
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-[#9e4d75]"
          >
            <option value="">Seleccionar...</option>
            {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>

        {/* Monto */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Monto transferido ($)</label>
          <input
              type="number"
              step="0.01"
              min="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-[#9e4d75]"
            />
        </div>

        {/* Número comprobante (opcional) */}
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">N° de comprobante <span className="text-gray-400">(opcional)</span></label>
          <input
            type="text"
            value={receiptNo}
            onChange={(e) => setReceiptNo(e.target.value)}
            placeholder="Ej: 0012345678"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm bg-gray-50 focus:outline-none focus:border-[#9e4d75]"
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
              className="w-full py-5 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center gap-1.5 hover:border-[#c98daa] hover:bg-[#fdf5f9]/30 transition-colors"
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
          className="w-full py-3 rounded-xl bg-[#6b2145] text-white text-sm font-semibold hover:bg-[#551735] active:bg-[#441029] disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
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
