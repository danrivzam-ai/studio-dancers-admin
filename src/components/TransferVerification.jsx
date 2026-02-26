import { useState } from 'react'
import { X, CheckCircle, XCircle, Clock, Image, ChevronDown, ChevronUp, DollarSign } from 'lucide-react'
import { formatDate } from '../lib/dateUtils'

export default function TransferVerification({
  requests,
  loading,
  onApprove,
  onReject,
  onClose,
  onRegisterPayment,
  getCourseById,
  enrichCourse
}) {
  const [filter, setFilter] = useState('pending')
  const [expandedImage, setExpandedImage] = useState(null)
  const [rejectingId, setRejectingId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState(null)

  const filtered = requests.filter(r => filter === 'all' || r.status === filter)

  const handleApprove = async (request) => {
    if (!confirm(`¿Aprobar transferencia de $${request.amount} para ${request.students?.name}?`)) return
    setProcessing(request.id)
    try {
      // Registrar como pago real usando el flujo existente
      const student = request.students
      if (onRegisterPayment && student) {
        const course = enrichCourse(getCourseById(student.course_id))
        await onRegisterPayment(request.student_id, {
          amount: parseFloat(request.amount),
          paymentMethod: 'Transferencia',
          bankName: request.bank_name || '',
          transferReceipt: request.id.slice(0, 8),
          notes: `Aprobado desde portal. Ref: ${request.id.slice(0, 8)}`
        })
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
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-3 border-b flex gap-2">
          {[
            { key: 'pending', label: 'Pendientes', count: requests.filter(r => r.status === 'pending').length },
            { key: 'approved', label: 'Aprobadas', count: requests.filter(r => r.status === 'approved').length },
            { key: 'rejected', label: 'Rechazadas', count: requests.filter(r => r.status === 'rejected').length },
            { key: 'all', label: 'Todas', count: requests.length }
          ].map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
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
                      <p className="text-xs text-gray-400">Cédula: {req.submitted_by_cedula}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-green-600">${parseFloat(req.amount).toFixed(2)}</p>
                      {statusBadge(req.status)}
                    </div>
                  </div>

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
                        className="w-full max-h-80 object-contain bg-gray-50"
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

      {/* Full-screen image overlay */}
      {expandedImage && (() => {
        const req = requests.find(r => r.id === expandedImage)
        return null // Handled inline above
      })()}
    </div>
  )
}
