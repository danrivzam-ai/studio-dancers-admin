import { useState, useRef } from 'react'
import { Images, Upload, Trash2, Edit2, Check, X, ImageOff, Loader2, AlertTriangle } from 'lucide-react'
import { useGallery } from '../hooks/useGallery'

export default function GalleryManager() {
  const { photos, loading, uploading, getPhotoUrl, uploadPhoto, deletePhoto, updateCaption } = useGallery()

  const fileInputRef = useRef(null)
  const [deleteTarget, setDeleteTarget]   = useState(null) // photo object
  const [editTarget, setEditTarget]       = useState(null) // { id, value, url }
  const [savingCaption, setSavingCaption] = useState(false)
  const [deleting, setDeleting]           = useState(false)
  const [toast, setToast]                 = useState(null)

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3500)
  }

  // ── Upload ──────────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    e.target.value = ''
    let errors = 0
    for (const file of files) {
      const result = await uploadPhoto(file)
      if (!result.success) { errors++; showToast(`Error al subir "${file.name}": ${result.error}`, 'err') }
    }
    const ok = files.length - errors
    if (ok > 0) showToast(`${ok === 1 ? 'Foto subida' : `${ok} fotos subidas`} correctamente`)
  }

  // ── Delete ───────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    const result = await deletePhoto(deleteTarget)
    setDeleting(false)
    if (result.success) showToast('Foto eliminada')
    else showToast(`Error: ${result.error}`, 'err')
    setDeleteTarget(null)
  }

  // ── Caption ──────────────────────────────────────────────────────────
  const saveCaption = async () => {
    if (!editTarget) return
    setSavingCaption(true)
    const result = await updateCaption(editTarget.id, editTarget.value)
    setSavingCaption(false)
    if (result.success) showToast('Pie de foto actualizado')
    else showToast(`Error: ${result.error}`, 'err')
    setEditTarget(null)
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Images size={18} className="text-purple-600" />
          <h2 className="text-base font-semibold text-gray-800">Galería del estudio</h2>
          {!loading && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
              {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
            </span>
          )}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {uploading ? 'Subiendo...' : 'Subir fotos'}
        </button>
        <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileChange} />
      </div>

      {/* Toast */}
      {toast && (
        <div className={`text-xs px-3 py-2 rounded-lg font-medium ${
          toast.type === 'err' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="aspect-square bg-gray-200 rounded-lg animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && photos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-14 text-gray-400 gap-2">
          <ImageOff size={36} strokeWidth={1.5} />
          <p className="text-sm font-medium">No hay fotos aún</p>
          <p className="text-xs text-gray-400">Sube las primeras imágenes del estudio</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 flex items-center gap-1.5 bg-purple-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium hover:bg-purple-700 transition-colors"
          >
            <Upload size={13} />
            Subir fotos
          </button>
        </div>
      )}

      {/* Thumbnail grid */}
      {!loading && photos.length > 0 && (
        <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
          {photos.map(photo => {
            const url = getPhotoUrl(photo.storage_path)
            return (
              <div key={photo.id} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-sm">
                <img
                  src={url}
                  alt={photo.caption || 'Foto del estudio'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {/* Hover overlay */}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/55 transition-all opacity-0 group-hover:opacity-100 flex flex-col justify-between p-1.5">
                  {/* Delete — top right */}
                  <div className="flex justify-end">
                    <button
                      onClick={() => setDeleteTarget(photo)}
                      className="p-1.5 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
                      title="Eliminar foto"
                    >
                      <Trash2 size={11} />
                    </button>
                  </div>
                  {/* Caption edit — bottom */}
                  <button
                    onClick={() => setEditTarget({ id: photo.id, value: photo.caption || '', url })}
                    className="flex items-center gap-1 bg-black/50 hover:bg-black/70 rounded-md px-1.5 py-1 text-left w-full transition-colors"
                    title="Editar pie de foto"
                  >
                    <Edit2 size={9} className="text-white/80 shrink-0" />
                    <span className="text-[9px] text-white/80 truncate leading-tight">
                      {photo.caption || 'Agregar pie de foto'}
                    </span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* ══════ MODAL: Editar pie de foto ══════ */}
      {editTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setEditTarget(null)}>
          <div
            className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Preview + header */}
            <div className="relative h-36 bg-gray-900">
              <img src={editTarget.url} alt="" className="w-full h-full object-cover opacity-70" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-4 right-4">
                <p className="text-white font-semibold text-sm">Pie de foto</p>
                <p className="text-white/60 text-xs">Aparece en la galería del portal</p>
              </div>
              <button
                onClick={() => setEditTarget(null)}
                className="absolute top-3 right-3 w-7 h-7 bg-black/40 hover:bg-black/60 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>

            {/* Input + actions */}
            <div className="p-4 space-y-3">
              <input
                type="text"
                value={editTarget.value}
                onChange={e => setEditTarget(prev => ({ ...prev, value: e.target.value }))}
                onKeyDown={e => { if (e.key === 'Enter') saveCaption(); if (e.key === 'Escape') setEditTarget(null) }}
                placeholder="Ej: Clase de técnica clásica"
                autoFocus
                maxLength={80}
                className="w-full text-sm border border-gray-300 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setEditTarget(null)}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveCaption}
                  disabled={savingCaption}
                  className="flex-1 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  {savingCaption ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                  Guardar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ MODAL: Confirmar eliminación ══════ */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={() => setDeleteTarget(null)}>
          <div
            className="bg-white w-full sm:max-w-sm sm:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            {/* Preview */}
            <div className="relative h-36 bg-gray-900">
              <img src={getPhotoUrl(deleteTarget.storage_path)} alt="" className="w-full h-full object-cover opacity-50" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-12 h-12 bg-red-500/90 rounded-full flex items-center justify-center">
                  <AlertTriangle size={22} className="text-white" />
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 space-y-1 mb-1 text-center">
              <p className="font-semibold text-gray-800">¿Eliminar esta foto?</p>
              <p className="text-xs text-gray-400">Se borrará del storage y no podrás recuperarla</p>
              {deleteTarget.caption && (
                <p className="text-xs text-gray-500 italic">"{deleteTarget.caption}"</p>
              )}
            </div>

            <div className="flex gap-2 p-4 pt-0">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 disabled:bg-red-300 text-white text-sm font-medium flex items-center justify-center gap-1.5 transition-colors"
              >
                {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
