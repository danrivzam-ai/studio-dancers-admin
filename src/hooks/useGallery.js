import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { logAudit } from '../lib/auditLog'

// Compress image to max 1200px, JPEG 82% — good quality for gallery
async function compressGalleryImage(file) {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const MAX = 1200
        const ratio = Math.min(MAX / img.width, MAX / img.height, 1)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(img.width * ratio)
        canvas.height = Math.round(img.height * ratio)
        canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
        canvas.toBlob(resolve, 'image/jpeg', 0.82)
      }
      img.src = e.target.result
    }
    reader.readAsDataURL(file)
  })
}

export function useGallery() {
  const [photos, setPhotos] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState(null)

  const fetchPhotos = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('gallery_photos')
        .select('*')
        .eq('active', true)
        .order('display_order', { ascending: true })
        .order('created_at', { ascending: false })

      if (error) {
        if (error.code === '42P01') return // table doesn't exist yet
        throw error
      }
      setPhotos(data || [])
    } catch (err) {
      setError(err.message)
      console.error('[Gallery] fetchPhotos error:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchPhotos() }, [])

  // Get public URL from storage path
  const getPhotoUrl = (storagePath) => {
    const { data } = supabase.storage.from('gallery').getPublicUrl(storagePath)
    return data.publicUrl
  }

  // Upload a photo + insert metadata row
  const uploadPhoto = async (file, caption = '') => {
    setUploading(true)
    try {
      const blob = await compressGalleryImage(file)
      const ext = 'jpg'
      const filename = `photo-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      // Upload to Supabase Storage
      const { error: storageErr } = await supabase.storage
        .from('gallery')
        .upload(filename, blob, { contentType: 'image/jpeg', upsert: false })
      if (storageErr) throw storageErr

      // Insert metadata row
      const nextOrder = photos.length > 0 ? Math.max(...photos.map(p => p.display_order)) + 1 : 0
      const { data, error: dbErr } = await supabase
        .from('gallery_photos')
        .insert([{
          storage_path: filename,
          caption: caption.trim() || null,
          display_order: nextOrder,
        }])
        .select()
        .single()
      if (dbErr) throw dbErr

      logAudit({ action: 'gallery_photo_uploaded', tableName: 'gallery_photos', recordId: data.id, newData: { filename } })
      await fetchPhotos() // refresh list from DB to confirm row exists
      return { success: true, data }
    } catch (err) {
      console.error('[Gallery] uploadPhoto error:', err)
      return { success: false, error: err.message }
    } finally {
      setUploading(false)
    }
  }

  // Soft-delete photo (active=false) + remove from storage
  const deletePhoto = async (photo) => {
    try {
      // Remove from storage
      await supabase.storage.from('gallery').remove([photo.storage_path])
      // Soft-delete the DB row
      await supabase.from('gallery_photos').update({ active: false }).eq('id', photo.id)
      setPhotos(prev => prev.filter(p => p.id !== photo.id))
      logAudit({ action: 'gallery_photo_deleted', tableName: 'gallery_photos', recordId: photo.id })
      return { success: true }
    } catch (err) {
      console.error('[Gallery] deletePhoto error:', err)
      return { success: false, error: err.message }
    }
  }

  // Update caption
  const updateCaption = async (photoId, caption) => {
    try {
      const { error } = await supabase
        .from('gallery_photos')
        .update({ caption: caption.trim() || null })
        .eq('id', photoId)
      if (error) throw error
      setPhotos(prev => prev.map(p => p.id === photoId ? { ...p, caption } : p))
      return { success: true }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }

  return {
    photos,
    loading,
    uploading,
    error,
    fetchPhotos,
    getPhotoUrl,
    uploadPhoto,
    deletePhoto,
    updateCaption,
  }
}
