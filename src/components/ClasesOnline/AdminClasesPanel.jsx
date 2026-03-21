import { useState, useEffect, useRef } from 'react'
import { Upload, Trash2, Clock, Video, Film, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'
import { useClasesOnline } from '../../hooks/useClasesOnline'
import DeleteConfirmModal from '../DeleteConfirmModal'

function formatFileSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function TimeRemaining({ expiresAt }) {
  const [remaining, setRemaining] = useState('')

  useEffect(() => {
    const update = () => {
      const diff = new Date(expiresAt) - new Date()
      if (diff <= 0) {
        setRemaining('Expirada')
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      setRemaining(`${h}h ${m}m restantes`)
    }
    update()
    const interval = setInterval(update, 60000)
    return () => clearInterval(interval)
  }, [expiresAt])

  return <span>{remaining}</span>
}

function ClassCard({ cls, type, onUpload, onDelete, uploading, uploadProgress }) {
  const fileRef = useRef(null)
  const [title, setTitle] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('video/')) {
      alert('Solo se permiten archivos de video')
      return
    }
    if (file.size > 1.5 * 1024 * 1024 * 1024) {
      if (!confirm('El archivo es mayor a 1.5GB. La subida puede demorar. ¿Continuar?')) return
    }

    await onUpload(file, type, title)
    setTitle('')
    if (fileRef.current) fileRef.current.value = ''
  }

  const typeLabel = type === 'daily' ? 'Clase del día' : 'Video semanal'
  const TypeIcon = type === 'daily' ? Video : Film

  if (!cls) {
    return (
      <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-6">
        <div className="flex items-center gap-2 mb-4">
          <TypeIcon size={20} className="text-gray-400" />
          <h3 className="font-semibold text-gray-700">{typeLabel}</h3>
          <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Sin publicar</span>
        </div>

        <div className="space-y-3">
          <input
            type="text"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder={type === 'daily' ? 'Título de la clase (opcional)' : 'Mensaje de la semana (opcional)'}
            className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl text-sm focus:outline-none focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all"
          />

          <input
            ref={fileRef}
            type="file"
            accept="video/*"
            onChange={handleFileSelect}
            className="hidden"
            disabled={uploading}
          />

          <button
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Upload size={18} />
            {uploading ? 'Subiendo...' : 'Subir video'}
          </button>

          {uploading && (
            <div className="space-y-1">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500 text-center">{uploadProgress}%</p>
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-2xl border-2 border-purple-100 p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TypeIcon size={20} className="text-purple-600" />
            <h3 className="font-semibold text-gray-700">{typeLabel}</h3>
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
              <CheckCircle size={12} /> Activa
            </span>
          </div>
          <button
            onClick={() => setConfirmDelete(true)}
            className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
            title="Eliminar clase"
          >
            <Trash2 size={18} />
          </button>
        </div>

        {cls.title && (
          <p className="text-sm text-gray-600 mb-2">{cls.title}</p>
        )}

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock size={12} />
            <TimeRemaining expiresAt={cls.expires_at} />
          </span>
          <span>Fecha: {cls.class_date}</span>
          <span>{formatFileSize(cls.file_size)}</span>
        </div>
      </div>

      {confirmDelete && (
        <DeleteConfirmModal
          title="Eliminar clase"
          message={`¿Eliminar "${cls.title || typeLabel}"? El video se borrará permanentemente.`}
          onConfirm={async () => {
            await onDelete(cls.id)
            setConfirmDelete(false)
          }}
          onCancel={() => setConfirmDelete(false)}
        />
      )}
    </>
  )
}

export default function AdminClasesPanel() {
  const {
    dailyClass, weeklyClass, allClasses,
    loading, error, uploading, uploadProgress,
    fetchActiveClasses, fetchAllClasses,
    uploadClass, deleteClass, setError, setUploadProgress,
  } = useClasesOnline()

  const [message, setMessage] = useState(null)

  useEffect(() => {
    fetchActiveClasses()
    fetchAllClasses()
  }, [fetchActiveClasses, fetchAllClasses])

  useEffect(() => {
    if (!message) return
    const t = setTimeout(() => setMessage(null), 5000)
    return () => clearTimeout(t)
  }, [message])

  const handleUpload = async (file, type, title) => {
    const result = await uploadClass(file, type, title)
    if (result.success) {
      setMessage({ type: 'success', text: 'Video subido correctamente' })
      setUploadProgress(0)
      fetchActiveClasses()
      fetchAllClasses()
    } else {
      setMessage({ type: 'error', text: result.error || 'Error al subir' })
    }
  }

  const handleDelete = async (classId) => {
    const result = await deleteClass(classId)
    if (result.success) {
      setMessage({ type: 'success', text: 'Clase eliminada' })
      fetchActiveClasses()
      fetchAllClasses()
    } else {
      setMessage({ type: 'error', text: result.error || 'Error al eliminar' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Clases Online</h2>
          <p className="text-sm text-gray-500">Sube la clase del día y el video semanal para las alumnas</p>
        </div>
        <button
          onClick={() => { fetchActiveClasses(); fetchAllClasses() }}
          disabled={loading}
          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl transition-all"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {message && (
        <div className={`p-3 rounded-xl text-sm flex items-center gap-2 ${
          message.type === 'success'
            ? 'bg-green-50 text-green-700 border border-green-100'
            : 'bg-red-50 text-red-700 border border-red-100'
        }`}>
          {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {message.text}
        </div>
      )}

      {error && (
        <div className="p-3 rounded-xl text-sm bg-red-50 text-red-700 border border-red-100 flex items-center gap-2">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <ClassCard
          cls={dailyClass}
          type="daily"
          onUpload={handleUpload}
          onDelete={handleDelete}
          uploading={uploading}
          uploadProgress={uploadProgress}
        />
        <ClassCard
          cls={weeklyClass}
          type="weekly"
          onUpload={handleUpload}
          onDelete={handleDelete}
          uploading={uploading}
          uploadProgress={uploadProgress}
        />
      </div>

      {allClasses.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">Historial reciente</h3>
          <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
            {allClasses.map(cls => (
              <div key={cls.id} className="px-4 py-3 flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  {cls.type === 'daily' ? <Video size={16} className="text-gray-400" /> : <Film size={16} className="text-gray-400" />}
                  <div>
                    <p className="font-medium text-gray-700">
                      {cls.title || (cls.type === 'daily' ? 'Clase del día' : 'Video semanal')}
                    </p>
                    <p className="text-xs text-gray-400">{cls.class_date} · {formatFileSize(cls.file_size)}</p>
                  </div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  cls.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>
                  {cls.active ? 'Activa' : 'Expirada'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
