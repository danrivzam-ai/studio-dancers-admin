import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

/**
 * useClasesOnline — Hook para gestionar clases online (admin).
 * Subir/eliminar videos, listar clases.
 */
export function useClasesOnline() {
  const [activeClasses, setActiveClasses] = useState([])
  const [allClasses, setAllClasses] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploading, setUploading] = useState(false)

  const callEdgeFunction = async (action, extraBody = {}) => {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) throw new Error('No session')

    const res = await fetch(`${SUPABASE_URL}/functions/v1/clases-online`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ action, ...extraBody }),
    })

    const json = await res.json()
    if (!res.ok) throw new Error(json.error || 'Error del servidor')
    return json
  }

  const fetchActiveClasses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const json = await callEdgeFunction('list-active')
      setActiveClasses(json.classes || [])
      return { success: true, data: json.classes }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchAllClasses = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const json = await callEdgeFunction('list-all')
      setAllClasses(json.classes || [])
      return { success: true, data: json.classes }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setLoading(false)
    }
  }, [])

  const uploadClass = useCallback(async (file, type, title = '') => {
    setUploading(true)
    setUploadProgress(0)
    setError(null)
    try {
      const { uploadUrl, classId } = await callEdgeFunction('get-upload-url', {
        type,
        title: title || null,
        fileSize: file.size,
        contentType: file.type || 'video/mp4',
      })

      await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('PUT', uploadUrl, true)
        xhr.setRequestHeader('Content-Type', file.type || 'video/mp4')

        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            setUploadProgress(Math.round((e.loaded / e.total) * 100))
          }
        }
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve()
          else reject(new Error(`Upload failed: ${xhr.status}`))
        }
        xhr.onerror = () => reject(new Error('Upload failed'))
        xhr.send(file)
      })

      const result = await callEdgeFunction('confirm-upload', { classId })
      setUploadProgress(100)
      return { success: true, data: result.class }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    } finally {
      setUploading(false)
    }
  }, [])

  const getVideoUrl = useCallback(async (classId) => {
    try {
      const json = await callEdgeFunction('get-video-url', { classId })
      return { success: true, videoUrl: json.videoUrl }
    } catch (err) {
      return { success: false, error: err.message }
    }
  }, [])

  const deleteClass = useCallback(async (classId) => {
    setError(null)
    try {
      await callEdgeFunction('delete-class', { classId })
      return { success: true }
    } catch (err) {
      setError(err.message)
      return { success: false, error: err.message }
    }
  }, [])

  const dailyClass = activeClasses.find(c => c.type === 'daily')
  const weeklyClass = activeClasses.find(c => c.type === 'weekly')

  return {
    activeClasses, allClasses, dailyClass, weeklyClass,
    loading, error, uploading, uploadProgress,
    fetchActiveClasses, fetchAllClasses,
    uploadClass, getVideoUrl, deleteClass,
    setError, setUploadProgress,
  }
}
