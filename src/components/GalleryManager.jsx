import { useState, useRef } from 'react'
import { Images, Upload, Trash2, Edit2, Check, X, ImageOff, Loader2 } from 'lucide-react'
import { useGallery } from '../hooks/useGallery'

export default function GalleryManager() {
  const { photos, loading, uploading, getPhotoUrl, uploadPhoto, deletePhoto, updateCaption } = useGallery()

  const fileInputRef = useRef(null)
  const [deleteConfirm, setDeleteConfirm] = useState(null) // photo id pending delete
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
    if (result.success) {
      showToast('Foto eliminada')
    } else {
      showToast(`Error: ${result.error}`, 'err')
    }
    setDeleteConfirm(null)
  }

  // ── Caption ──────────────────────────────────────────────────────────
  const startEditCaption = (photo) => {
    setEditingCaption({ id: photo.id, value: photo.caption || '' })
  }

  const saveCaption = async () => {
    if (!editingCaption) return
    setSavingCaption(true)
    const result = await updateCaption(editingCaption.id, editingCaption.value)
    setSavingCaption(false)
    if (result.success) {
      showToast('Pie de foto actualizado')
    } else {
      showToast(`Error: ${result.error}`, 'err')
    }
    setEditingCaption(null)
  }

  // ── Render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Images size={20} className="text-purple-600" />
          <h2 className="text-lg font-semibold text-gray-800">Galería del estudio</h2>
          {!loading && (
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-medium">
              {photos.length} {photos.length === 1 ? 'foto' : 'fotos'}
            </span>
          )}
        </div>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-300 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
        >
          {uploading ? (
            <Loader2 size={15} className="animate-spin" />
          ) : (
            <Upload size={15} />
          )}
          {uploading ? 'Subiendo...' : 'Subir fotos'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Toast */}
      {toast && (
        <div className={`text-sm px-4 py-2 rounded-xl font-medium ${
          toast.type === 'err' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
        }`}>
          {toast.msg}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="aspect-square bg-gray-200 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && photos.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-400 gap-3">
          <ImageOff size={40} strokeWidth={1.5} />
          <p className="text-sm font-medium">No hay fotos aún</p>
          <p className="text-xs text-gray-400">Sube las primeras imágenes del estudio</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="mt-2 flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"
          >
            <Upload size={14} />
            Subir fotos
          </button>
        </div>
      )}

      {/* Photo grid */}
      {!loading && photos.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map(photo => {
            const url = getPhotoUrl(photo.storage_path)
            const isEditing = editingCaption?.id === photo.id
            const isDeleting = deleteConfirm === photo.id

            return (
              <div key={photo.id} className="group relative bg-gray-100 rounded-xl overflow-hidden shadow-sm">
                {/* Image */}
                <div className="aspect-square">
                  <img
                    src={url}
                    alt={photo.caption || 'Foto del estudio'}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </div>

                {/* Caption area */}
                <div className="p-2 bg-white border-t border-gray-100">
                  {isEditing ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editingCaption.value}
                        onChange={e => setEditingCaption(prev => ({ ...prev, value: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') saveCaption(); if (e.key === 'Escape') setEditingCaption(null) }}
                        placeholder="Pie de foto..."
                        autoFocus
                        className="flex-1 text-xs border border-purple-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple-400 min-w-0"
                      />
                      <button
                        onClick={saveCaption}
                        disabled={savingCaption}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                      >
                        {savingCaption ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />}
                      </button>
                      <button
                        onClick={() => setEditingCaption(null)}
                        className="p-1 text-gray-400 hover:bg-gray-100 rounded"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-1 min-h-[24px]">
                      <p className="text-xs text-gray-500 truncate flex-1">
                        {photo.caption || <span className="italic text-gray-300">Sin pie de foto</span>}
                      </p>
                      <button
                        onClick={() => startEditCaption(photo)}
                        className="p-1 text-gray-300 hover:text-purple-500 rounded shrink-0"
                        title="Editar pie de foto"
                      >
                        <Edit2 size={12} />
                      </button>
                    </div>
                  )}
                </div>

                {/* Delete button — top-right overlay */}
                {!isDeleting && (
                  <button
                    onClick={() => setDeleteConfirm(photo.id)}
                    className="absolute top-2 right-2 p-1.5 bg-black/40 hover:bg-red-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                    title="Eliminar foto"
                  >
                    <Trash2 size={13} />
                  </button>
                )}

                {/* Delete confirm overlay */}
                {isDeleting && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 p-3">
                    <p className="text-white text-xs font-medium text-center">Eliminar esta foto?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => confirmDelete(photo)}
                        className="bg-red-500 hover:bg-red-600 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
                      >
                        Eliminar
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-medium"
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
