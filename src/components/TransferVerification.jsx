import { useState } from 'react'
import { X, CheckCircle, XCircle, Clock, Image, ChevronDown, ChevronUp, DollarSign, Hash, Plus, Upload, Camera } from 'lucide-react'
import { formatDate } from '../lib/dateUtils'
import { supabase } from '../lib/supabase'

// ═══════ MANUAL TRANSFER FORM (WhatsApp) ═══════
function ManualTransferForm({ students, onSubmitted, onCancel }) {
  const [studentId, setStudentId] = useState('')
  const [amount, setAmount] = useState('')
  const [bankName, setBankName] = useState('')
  const [receiptNumber, setReceiptNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [image, setImage] = useState(null)
  const [preview, setPreview] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const BANKS = [
    'Banco Pichincha', 'Banco del Pacífico', 'Banco de Guayaquil',
    'Banco Bolivariano', 'Banco del Austro', 'Banco Internacional',
    'Banco Solidario', 'Produbanco', 'Cooperativa JEP',
    'Cooperativa Jardín Azuayo', 'PayPhone (Tarjeta)', 'Otro'
  ]

  const compressImage = (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new window.Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const maxWidth = 1200
          const scale = Math.min(1, maxWidth / img.width)
          canvas.width = img.width * scale
          canvas.height = img.height * scale
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
          canvas.toBlob(resolve, 'image/jpeg', 0.7)
        }
        img.src = e.target.result
      }
      reader.readAsDataURL(file)
    })
  }

  const handleImageChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target.result)
    reader.readAsDataURL(file)
    const compressed = await compressImage(file)
    setImage(compressed)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!studentId) { setError('Seleccione la alumna'); return }
    if (!amount || parseFloat(amount) <= 0) { setError('Ingrese el monto'); return }
    if (!bankName) { setError('Seleccione el banco'); return }

    setLoading(true)
    try {
      let receiptUrl = null

      // Upload image if provided
      if (image) {
        const fileName = `admin_${studentId}_${Date.now()}.jpg`
        const { error: uploadError } = await supabase.storage
          .from('transfer-receipts')
          .upload(fileName, image, { contentType: 'image/jpeg' })
        if (uploadError) throw uploadError

        const { data: urlData } = supabase.storage
          .from('transfer-receipts')
          .getPublicUrl(fileName)
        receiptUrl = urlData.publicUrl
      }

      // Insert directly into transfer_requests (admin has auth)
      const { error: insertError } = await supabase
        .from('transfer_requests')
        .insert({
          student_id: studentId,
          amount: parseFloat(amount),
          bank_name: bankName,
          receipt_image_url: receiptUrl,
          receipt_number: receiptNumber.trim() || null,
          notes: notes.trim() ? `[Registrado por admin vía WhatsApp] ${notes.trim()}` : '[Registrado por admin vía WhatsApp]',
          submitted_by_cedula: 'ADMIN',
          submitted_by_phone: 'ADMIN',
          status: 'pending'
        })

      if (insertError) throw insertError
      onSubmitted()
    } catch (err) {
      console.error('Manual transfer error:', err)
      setError('Error al registrar: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-4 space-y-3 border-b bg-blue-50">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm font-semibold text-blue-800">Registrar transferencia (WhatsApp)</p>
        <button type="button" onClick={onCancel} className="text-gray-400 hover:text-gray-600">
          <X size={16} />
        </button>
      </div>

      {/* Student */}
      <select
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
      >
        <option value="">Seleccionar alumna...</option>
        {students.map(s => (
          <option key={s.id} value={s.id}>{s.name}</option>
        ))}
      </select>

      {/* Amount + Bank in row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="Monto"
          />
        </div>
        <select
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">Banco...</option>
          {BANKS.map(b => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      {/* Receipt number */}
      <div className="relative">
        <Hash size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={receiptNumber}
          onChange={(e) => setReceiptNumber(e.target.value)}
          className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
          placeholder="N° Comprobante"
        />
      </div>

      {/* Image upload */}
      {preview ? (
        <div className="relative">
          <img src={preview} alt="Comprobante" className="w-full rounded-lg border max-h-32 object-contain bg-gray-50" />
          <button
            type="button"
            onClick={() => { setImage(null); setPreview(null) }}
            className="absolute top-1 right-1 bg-white/90 p-0.5 rounded-full shadow"
          >
            <X size={12} className="text-gray-600" />
          </button>
        </div>
      ) : (
        <label className="flex items-center justify-center gap-2 w-full py-2 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-colors">
          <Camera size={16} className="text-gray-400" />
          <span className="text-xs text-gray-500">Subir foto (opcional)</span>
          <input type="file" accept="image/*" onChange={handleImageChange} className="hidden" />
        </label>
      )}

      {/* Notes */}
      <input
        type="text"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
        placeholder="Nota (opcional)"
      />

      {error && <p className="text-red-600 text-xs bg-red-50 rounded-lg p-2">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-blue-600 text-white rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-1.5"
      >
        {loading ? 'Registrando...' : (
          <><Upload size={14} /> Registrar transferencia</>
        )}
      </button>
    </form>
  )
}

// ═══════ MAIN COMPONENT ═══════
export default function TransferVerification({
  requests,
  loading,
  onApprove,
  onReject,
  onClose,
  onRegisterPayment,
  getCourseById,
  enrichCourse,
  students
}) {
  const [filter, setFilter] = useState('pending')
  const [expandedImage, setExpandedImage] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(null)
  const [showManualForm, setShowManualForm] = useState(false)

  const filtered = requests.filter(r => filter === 'all' || r.status === filter)

  const handleApprove = async (request) => {
    if (!confirm(`¿Aprobar transferencia de $${request.amount} para ${request.students?.name}?`)) return
    setProcessing(request.id)
    try {
      const student = request.students
      if (onRegisterPayment && student) {
        const result = await onRegisterPayment(request.student_id, {
          amount: parseFloat(request.amount),
          paymentMethod: 'Transferencia',
          bankName: request.bank_name || '',
          transferReceipt: request.receipt_number || request.id.slice(0, 8),
          notes: `Aprobado desde portal. ${request.receipt_number ? 'Comp: ' + request.receipt_number : 'Ref: ' + request.id.slice(0, 8)}`
        })
        if (!result?.success) {
          throw new Error(result?.error || 'Error registrando el pago del estudiante')
        }
      }
      await onApprove(request.id)
    } catch (err) {
      console.error('Error approving:', err)
      alert('Error al aprobar: ' + err.message)
    } finally {
      setProcessing(null)
    }
  }

  const handleReject = async (requestId) => {
    if (!rejectReason.trim()) { alert('Ingresa un motivo de rechazo'); return }
    setProcessing(requestId)
    try {
      await onReject(requestId, rejectReason.trim())
      setRejectingId(null)
      setRejectReason('')
    } catch (err) {
      alert('Error al rechazar: ' + err.message)
    } finally {
      setProcessing(null)
    }
  }

  const statusBadge = (status) => {
    switch (status) {
      case 'pending': return <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full text-[10px] font-medium flex items-center gap-1"><Clock size={10} />Pendiente</span>
      case 'approved': return <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-[10px] font-medium flex items-center gap-1"><CheckCircle size={10} />Aprobada</span>
      case 'rejected': return <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-[10px] font-medium flex items-center gap-1"><XCircle size={10} />Rechazada</span>
      default: return null
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 sm:p-5 border-b bg-gradient-to-r from-blue-600 to-blue-800 text-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <DollarSign size={22} />
              </div>
              <div>
                <h2 className="text-lg font-semibold">Transferencias</h2>
                <p className="text-xs text-white/80">Verificación de comprobantes</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowManualForm(!showManualForm)}
                className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                title="Registrar transferencia manual (WhatsApp)"
              >
                <Plus size={20} />
              </button>
              <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Manual Transfer Form */}
        {showManualForm && (
          <ManualTransferForm
            students={students || []}
            onSubmitted={() => {
              setShowManualForm(false)
              onClose() // Close and re-fetch
            }}
            onCancel={() => setShowManualForm(false)}
          />
        )}

        {/* Filters */}
        <div className="p-3 border-b flex gap-2 overflow-x-auto">
          {[
            { key: 'pending', label: 'Pendientes', count: requests.filter(r => r.status === 'pending').length },
            { key: 'approved', label: 'Aprobadas', count: requests.filter(r => r.status === 'approved').length },
            { key: 'rejected', label: 'Rechazadas', count: requests.filter(r => r.status === 'rejected').length },
            { key: 'all', label: 'Todas', count: requests.length }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                filter === f.key ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'
              }`}
            >
              {f.label} ({f.count})
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-8 text-center text-gray-500">Cargando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <DollarSign size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">No hay transferencias {filter === 'pending' ? 'pendientes' : ''}</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(req => (
                <div key={req.id} className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-sm text-gray-800 truncate">{req.students?.name || 'Alumno'}</h3>
                      <p className="text-xs text-gray-500">{req.bank_name || 'Sin banco'} • {formatDate(req.submitted_at)}</p>
                      <p className="text-xs text-gray-400">
                        {req.submitted_by_cedula === 'ADMIN' ? 'Registrado por admin' : `Cédula: ${req.submitted_by_cedula}`}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-green-600">${parseFloat(req.amount).toFixed(2)}</p>
                      {statusBadge(req.status)}
                    </div>
                  </div>

                  {/* Receipt Number */}
                  {req.receipt_number && (
                    <div className="flex items-center gap-1.5 mb-2 bg-gray-50 rounded-lg px-2.5 py-1.5">
                      <Hash size={12} className="text-gray-400" />
                      <span className="text-xs text-gray-600">N° Comprobante:</span>
                      <span className="text-xs font-semibold text-gray-800 font-mono">{req.receipt_number}</span>
                    </div>
                  )}

                  {/* Receipt Image */}
                  {req.receipt_image_url && (
                    <button
                      onClick={() => setExpandedImage(expandedImage === req.id ? null : req.id)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 mb-2"
                    >
                      <Image size={12} />
                      {expandedImage === req.id ? 'Ocultar' : 'Ver'} comprobante
                      {expandedImage === req.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>
                  )}
                  {expandedImage === req.id && req.receipt_image_url && (
                    <div className="mb-2 rounded-lg overflow-hidden border">
                      <img
                        src={req.receipt_image_url}
                        alt="Comprobante"
                        className="w-full max-h-80 object-contain bg-gray-50 cursor-pointer"
                        onClick={() => window.open(req.receipt_image_url, '_blank')}
                      />
                    </div>
                  )}

                  {/* Rejection reason */}
                  {req.status === 'rejected' && req.rejection_reason && (
                    <p className="text-xs text-red-500 bg-red-50 px-2 py-1 rounded mb-2">Motivo: {req.rejection_reason}</p>
                  )}

                  {req.notes && (
                    <p className="text-xs text-gray-400 mb-2">Nota: {req.notes}</p>
                  )}

                  {/* Actions for pending */}
                  {req.status === 'pending' && (
                    <>
                      {rejectingId === req.id ? (
                        <div className="flex gap-2 mt-2">
                          <input
                            type="text"
                            value={rejectReason}
                            onChange={(e) => setRejectReason(e.target.value)}
                            placeholder="Motivo de rechazo..."
                            className="flex-1 px-3 py-1.5 border rounded-lg text-xs"
                            autoFocus
                          />
                          <button
                            onClick={() => handleReject(req.id)}
                            disabled={processing === req.id}
                            className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium disabled:opacity-50"
                          >
                            Rechazar
                          </button>
                          <button
                            onClick={() => { setRejectingId(null); setRejectReason('') }}
                            className="px-2 py-1.5 text-gray-500 text-xs"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex gap-2 mt-2">
                          <button
                            onClick={() => handleApprove(req)}
                            disabled={processing === req.id}
                            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckCircle size={14} />
                            {processing === req.id ? 'Procesando...' : 'Aprobar y registrar pago'}
                          </button>
                          <button
                            onClick={() => setRejectingId(req.id)}
                            disabled={processing === req.id}
                            className="px-3 py-2 bg-red-100 text-red-700 rounded-lg text-xs font-medium hover:bg-red-200 disabled:opacity-50"
                          >
                            <XCircle size={14} />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
