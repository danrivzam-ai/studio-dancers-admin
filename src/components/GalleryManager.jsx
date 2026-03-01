import { useState, useRef } from 'react'
import { Images, Upload, Trash2, Edit2, Check, X, ImageOff, Loader2 } from 'lucide-react'
import { useGallery } from '../hooks/useGallery'

export default function GalleryManager() {
  const { photos, loading, uploading, getPhotoUrl, uploadPhoto, deletePhoto, updateCaption } = useGallery()

  const fileInputRef = useRef(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null)
  const [editingCaption, setEditingCaption] = useState(null) // { id, value }
  const [savingCaption, setSavingCaption] = useState(false)
  const [toast, setToast] = useState(null)

  const showToast = (msg, type = 'ok') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  // ── Upload ──────────────────────────────────────────────────────────
  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files)
    if (!files.length) return
    e.target.value = ''

    let errors = 0
    for (const file of files) {
      const result = await uploadPhoto(file)
      if (!result.success) {
        errors++
        showToast(`Error al subir "${file.name}": ${result.error}`, 'err')
      }
    }
    const ok = files.length - errors
    if (ok > 0) showToast(`${ok === 1 ? 'Foto subida' : `${ok} fotos subidas`} correctamente`)
  }

  // ── Delete ───────────────────────────────────────────────────────────
  const confirmDelete = async (photo) => {
    const result = await deletePhoto(photo)
    if (result.success) showToast('Foto eliminada')
    else showToast(`Error: ${result.error}`, 'err')
    setDeleteConfirm(null)
  }

  // ── Caption ──────────────────────────────────────────────────────────
  const saveCaption = async () => {
    if (!editingCaption) return
    setSavingCaption(true)
    const result = await updateCaption(editingCaption.id, editingCaption.value)
    setSavingCaption(false)
    if (result.success) showToast('Pie de foto actualizado')
    else showToast(`Error: ${result.error}`, 'err')
    setEditingCaption(null)
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
            const isEditing = editingCaption?.id === photo.id
            const isDeleting = deleteConfirm === photo.id

            return (
              <div key={photo.id} className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden shadow-sm">
                {/* Thumbnail */}
                <img
                  src={url}
                  alt={photo.caption || 'Foto del estudio'}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />

                {/* Hover overlay — caption + actions */}
                {!isEditing && !isDeleting && (
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-all flex flex-col justify-between p-1.5 opacity-0 group-hover:opacity-100">
                    {/* Delete — top right */}
                    <div className="flex justify-end">
                      <button
                        onClick={() => setDeleteConfirm(photo.id)}
                        className="p-1 bg-red-500 hover:bg-red-600 text-white rounded"
                        title="Eliminar"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>

                    {/* Caption — bottom */}
                    <button
                      onClick={() => setEditingCaption({ id: photo.id, value: photo.caption || '' })}
                      className="flex items-center gap-1 bg-black/40 hover:bg-black/60 rounded px-1.5 py-0.5 text-left w-full"
                      title="Editar pie de foto"
                    >
                      <Edit2 size={8} className="text-white/70 shrink-0" />
                      <span className="text-[9px] text-white/80 truncate leading-tight">
                        {photo.caption || 'Pie de foto...'}
                      </span>
                    </button>
                  </div>
                )}

                {/* Caption edit mode */}
                {isEditing && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col justify-end p-1.5 gap-1">
                    <input
                      type="text"
                      value={editingCaption.value}
                      onChange={e => setEditingCaption(prev => ({ ...prev, value: e.target.value }))}
                      onKeyDown={e => { if (e.key === 'Enter') saveCaption(); if (e.key === 'Escape') setEditingCaption(null) }}
                      placeholder="Pie de foto..."
                      autoFocus
                      className="w-full text-[10px] bg-white/10 border border-white/30 text-white placeholder-white/40 rounded px-1.5 py-1 focus:outline-none focus:border-white/60"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={saveCaption}
                        disabled={savingCaption}
                        className="flex-1 bg-green-500 hover:bg-green-600 text-white rounded py-0.5 text-[9px] font-medium flex items-center justify-center gap-0.5"
                      >
                        {savingCaption ? <Loader2 size={9} className="animate-spin" /> : <Check size={9} />}
                        Guardar
                      </button>
                      <button
                        onClick={() => setEditingCaption(null)}
                        className="flex-1 bg-white/20 hover:bg-white/30 text-white rounded py-0.5 text-[9px] font-medium"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}

                {/* Delete confirm overlay */}
                {isDeleting && (
                  <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-2 p-2">
                    <p className="text-white text-[10px] font-medium text-center leading-tight">¿Eliminar foto?</p>
                    <div className="flex gap-1 w-full">
                      <button
                        onClick={() => confirmDelete(photo)}
                        className="flex-1 bg-red-500 hover:bg-red-600 text-white py-1 rounded text-[9px] font-medium"
                      >
                        Eliminar
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="flex-1 bg-white/20 hover:bg-white/30 text-white py-1 rounded text-[9px] font-medium"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
