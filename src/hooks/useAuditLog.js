import { useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'

const PAGE_SIZE = 50

export function useAuditLog() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(false)
  const [offset, setOffset] = useState(0)

  const fetchLogs = useCallback(async ({ dateFrom, dateTo, action, tableName, reset = true } = {}) => {
    try {
      setLoading(true)
      const newOffset = reset ? 0 : offset

      let query = supabase
        .from('audit_log')
        .select('*')
        .order('created_at', { ascending: false })
        .range(newOffset, newOffset + PAGE_SIZE - 1)

      if (dateFrom) {
        query = query.gte('created_at', `${dateFrom}T00:00:00`)
      }
      if (dateTo) {
        query = query.lte('created_at', `${dateTo}T23:59:59`)
      }
      if (action) {
        query = query.eq('action', action)
      }
      if (tableName) {
        query = query.eq('table_name', tableName)
      }

      const { data, error } = await query

      if (error) throw error

      const results = data || []
      setHasMore(results.length === PAGE_SIZE)

      if (reset) {
        setLogs(results)
        setOffset(PAGE_SIZE)
      } else {
        setLogs(prev => [...prev, ...results])
        setOffset(prev => prev + PAGE_SIZE)
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err)
    } finally {
      setLoading(false)
    }
  }, [offset])

  const loadMore = useCallback((filters) => {
    fetchLogs({ ...filters, reset: false })
  }, [fetchLogs])

  return { logs, loading, hasMore, fetchLogs, loadMore }
}
