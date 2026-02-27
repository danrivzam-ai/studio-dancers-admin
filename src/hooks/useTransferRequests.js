import { useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { logAudit } from '../lib/auditLog'

// Request browser notification permission on load
function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission()
  }
}

// Send browser push notification
function sendNotification(title, body, onClick) {
  // Browser notification (works even when tab is in background)
  if ('Notification' in window && Notification.permission === 'granted') {
    const notif = new Notification(title, {
      body,
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'transfer-' + Date.now(),
      requireInteraction: true,
    })
    if (onClick) {
      notif.onclick = () => {
        window.focus()
        onClick()
        notif.close()
      }
    }
  }
}

// Play notification sound
function playNotificationSound() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 800
    gain.gain.value = 0.3
    osc.start()
    osc.stop(ctx.currentTime + 0.15)
    setTimeout(() => {
      const osc2 = ctx.createOscillator()
      const gain2 = ctx.createGain()
      osc2.connect(gain2)
      gain2.connect(ctx.destination)
      osc2.frequency.value = 1000
      gain2.gain.value = 0.3
      osc2.start()
      osc2.stop(ctx.currentTime + 0.15)
    }, 180)
  } catch (e) {
    // Silently fail if audio context not available
  }
}

export function useTransferRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)
  const [newTransferAlert, setNewTransferAlert] = useState(null)
  const onNewTransferRef = useRef(null)

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('transfer_requests')
        .select('*, students(name, course_id, monthly_fee, payer_name, payer_cedula)')
        .order('submitted_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setRequests(data || [])
      setPendingCount((data || []).filter(r => r.status === 'pending').length)
    } catch (err) {
      console.error('Error fetching transfer requests:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  // Initial fetch + request notification permission
  useEffect(() => {
    fetchRequests()
    requestNotificationPermission()
  }, [fetchRequests])

  // --- SUPABASE REALTIME: listen for new transfer_requests ---
  useEffect(() => {
    const channel = supabase
      .channel('transfer-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'transfer_requests'
        },
        async (payload) => {
          const newReq = payload.new
          console.log('[Realtime] Nueva transferencia recibida:', newReq)

          // Fetch student name for the notification
          let studentName = 'Alumna'
          try {
            const { data: student } = await supabase
              .from('students')
              .select('name')
              .eq('id', newReq.student_id)
              .single()
            if (student) studentName = student.name
          } catch (e) { /* ignore */ }

          const amount = parseFloat(newReq.amount || 0).toFixed(2)
          const method = newReq.bank_name || 'Transferencia'

          // Update data
          await fetchRequests()

          // Set alert for in-app toast
          const alertData = {
            id: newReq.id,
            studentName,
            amount,
            method,
            timestamp: new Date()
          }
          setNewTransferAlert(alertData)

          // Clear alert after 8 seconds
          setTimeout(() => setNewTransferAlert(null), 8000)

          // Play sound
          playNotificationSound()

          // Browser notification
          sendNotification(
            '💰 Nueva solicitud de pago',
            `${studentName} - $${amount} vía ${method}`,
            () => onNewTransferRef.current?.()
          )
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchRequests])

  // Optimistic local update — avoids full refetch after each action
  const updateRequestLocally = (requestId, updates) => {
    setRequests(prev => {
      const updated = prev.map(r => r.id === requestId ? { ...r, ...updates } : r)
      setPendingCount(updated.filter(r => r.status === 'pending').length)
      return updated
    })
  }

  const approveRequest = async (requestId) => {
    // Optimistic update first (instant UI feedback)
    updateRequestLocally(requestId, { status: 'approved', verified_at: new Date().toISOString() })

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id
      const { data, error } = await supabase
        .from('transfer_requests')
        .update({
          status: 'approved',
          verified_at: new Date().toISOString(),
          verified_by: userId
        })
        .eq('id', requestId)
        .select()
        .single()

      if (error) throw error
      logAudit({ action: 'transfer_approved', tableName: 'transfer_requests', recordId: requestId, newData: data })
      return { success: true, data }
    } catch (err) {
      console.error('Error approving transfer:', err)
      // Revert on error
      updateRequestLocally(requestId, { status: 'pending', verified_at: null })
      return { success: false, error: err.message }
    }
  }

  const rejectRequest = async (requestId, reason) => {
    updateRequestLocally(requestId, { status: 'rejected', rejection_reason: reason, verified_at: new Date().toISOString() })

    try {
      const userId = (await supabase.auth.getUser()).data.user?.id
      const { data, error } = await supabase
        .from('transfer_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          verified_at: new Date().toISOString(),
          verified_by: userId
        })
        .eq('id', requestId)
        .select()
        .single()

      if (error) throw error
      logAudit({ action: 'transfer_rejected', tableName: 'transfer_requests', recordId: requestId, newData: data })
      return { success: true, data }
    } catch (err) {
      console.error('Error rejecting transfer:', err)
      updateRequestLocally(requestId, { status: 'pending', rejection_reason: null, verified_at: null })
      return { success: false, error: err.message }
    }
  }

  return {
    requests,
    loading,
    pendingCount,
    newTransferAlert,
    setNewTransferAlert,
    onNewTransferRef,
    fetchRequests,
    approveRequest,
    rejectRequest
  }
}
