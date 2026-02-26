import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { logAudit } from '../lib/auditLog'

export function useTransferRequests() {
  const [requests, setRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [pendingCount, setPendingCount] = useState(0)

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

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const approveRequest = async (requestId) => {
    try {
      const { data, error } = await supabase
        .from('transfer_requests')
        .update({
          status: 'approved',
          verified_at: new Date().toISOString(),
          verified_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', requestId)
        .select()
        .single()

      if (error) throw error
      logAudit({ action: 'transfer_approved', tableName: 'transfer_requests', recordId: requestId, newData: data })
      await fetchRequests()
      return { success: true, data }
    } catch (err) {
      console.error('Error approving transfer:', err)
      return { success: false, error: err.message }
    }
  }

  const rejectRequest = async (requestId, reason) => {
    try {
      const { data, error } = await supabase
        .from('transfer_requests')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          verified_at: new Date().toISOString(),
          verified_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', requestId)
        .select()
        .single()

      if (error) throw error
      logAudit({ action: 'transfer_rejected', tableName: 'transfer_requests', recordId: requestId, newData: data })
      await fetchRequests()
      return { success: true, data }
    } catch (err) {
      console.error('Error rejecting transfer:', err)
      return { success: false, error: err.message }
    }
  }

  return {
    requests,
    loading,
    pendingCount,
    fetchRequests,
    approveRequest,
    rejectRequest
  }
}
