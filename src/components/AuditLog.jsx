import { useState, useEffect } from 'react'
import {
  X, Search, ChevronDown, ChevronUp, RefreshCw,
  Plus, Trash2, Edit2, Eye, LogIn, LogOut, DollarSign, Settings, RotateCcw
} from 'lucide-react'
import { useAuditLog } from '../hooks/useAuditLog'

const ACTION_CONFIG = {
  // Egresos
  expense_created: { label: 'Egreso registrado', icon: Plus, color: 'text-red-600', bg: 'bg-red-50' },
  expense_deleted: { label: 'Egreso eliminado', icon: Trash2, color: 'text-red-700', bg: 'bg-red-100' },
  // Movimientos de caja
  cash_movement_created: { label: 'Movimiento de caja', icon: DollarSign, color: 'text-blue-600', bg: 'bg-blue-50' },
  cash_movement_deleted: { label: 'Movimiento eliminado', icon: Trash2, color: 'text-blue-700', bg: 'bg-blue-100' },
  // Caja
  cash_register_opened: { label: 'Caja abierta', icon: LogIn, color: 'text-green-600', bg: 'bg-green-50' },
  cash_register_closed: { label: 'Caja cerrada', icon: LogOut, color: 'text-gray-600', bg: 'bg-gray-100' },
  // Ventas
  sale_created: { label: 'Venta registrada', icon: Plus, color: 'text-green-600', bg: 'bg-green-50' },
  sale_deleted: { label: 'Venta eliminada', icon: Trash2, color: 'text-red-600', bg: 'bg-red-50' },
  // Alumnos
  student_created: { label: 'Alumno registrado', icon: Plus, color: 'text-purple-600', bg: 'bg-purple-50' },
  student_updated: { label: 'Alumno actualizado', icon: Edit2, color: 'text-blue-600', bg: 'bg-blue-50' },
  student_deleted: { label: 'Alumno eliminado', icon: Trash2, color: 'text-red-600', bg: 'bg-red-50' },
  // Pagos
  payment_registered: { label: 'Pago registrado', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
  payment_voided: { label: 'Pago anulado', icon: Trash2, color: 'text-red-700', bg: 'bg-red-100' },
  quick_payment_created: { label: 'Pago rapido registrado', icon: DollarSign, color: 'text-green-600', bg: 'bg-green-50' },
  // Categorías
  category_created: { label: 'Categoria creada', icon: Plus, color: 'text-orange-600', bg: 'bg-orange-50' },
  category_updated: { label: 'Categoria actualizada', icon: Edit2, color: 'text-orange-600', bg: 'bg-orange-50' },
  category_deactivated: { label: 'Categoria desactivada', icon: Trash2, color: 'text-orange-700', bg: 'bg-orange-100' },
  category_reactivated: { label: 'Categoria reactivada', icon: RotateCcw, color: 'text-green-600', bg: 'bg-green-50' },
  subcategory_created: { label: 'Subcategoria creada', icon: Plus, color: 'text-orange-500', bg: 'bg-orange-50' },
  subcategory_updated: { label: 'Subcategoria actualizada', icon: Edit2, color: 'text-orange-500', bg: 'bg-orange-50' },
  subcategory_deactivated: { label: 'Subcategoria desactivada', icon: Trash2, color: 'text-orange-600', bg: 'bg-orange-100' },
  subcategory_reactivated: { label: 'Subcategoria reactivada', icon: RotateCcw, color: 'text-green-500', bg: 'bg-green-50' },
  // Settings
  settings_updated: { label: 'Configuracion actualizada', icon: Settings, color: 'text-gray-600', bg: 'bg-gray-100' },
}

const DEFAULT_CONFIG = { label: 'Accion', icon: Eye, color: 'text-gray-600', bg: 'bg-gray-100' }

const TABLE_LABELS = {
  expenses: 'Egresos',
  cash_movements: 'Movimientos',
  cash_registers: 'Caja',
  sales: 'Ventas',
  students: 'Alumnos',
  payments: 'Pagos',
  quick_payments: 'Pagos rapidos',
  expense_categories: 'Categorias',
  expense_subcategories: 'Subcategorias',
  school_settings: 'Configuracion',
}

function timeAgo(dateStr) {
  const now = new Date()
  const d = new Date(dateStr)
  const diff = Math.floor((now - d) / 1000)
  if (diff < 60) return 'hace un momento'
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`
  if (diff < 172800) return 'ayer'
  return d.toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })
}

function formatTime(dateStr) {
  return new Date(dateStr).toLocaleTimeString('es-EC', { hour: '2-digit', minute: '2-digit' })
}

function getDescription(log) {
  const data = log.new_data || log.old_data
  if (!data) return null

  const amount = data.amount || data.total || data.opening_amount || data.closing_amount
  const name = data.name || data.customer_name || data.description || data.product_name

  const parts = []
  if (name) parts.push(name)
  if (amount) parts.push(`$${parseFloat(amount).toFixed(2)}`)

  return parts.length > 0 ? parts.join(' · ') : null
}

export default function AuditLog({ onClose }) {
  const { logs, loading, hasMore, fetchLogs, loadMore } = useAuditLog()

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const [dateFrom, setDateFrom] = useState(weekAgo)
  const [dateTo, setDateTo] = useState(today)
  const [filterTable, setFilterTable] = useState('')
  const [expandedLog, setExpandedLog] = useState(null)

  const filters = { dateFrom, dateTo, tableName: filterTable || undefined }

  useEffect(() => {
    fetchLogs(filters)
  }, [])

  const handleFilter = () => {
    fetchLogs(filters)
  }

  const setPreset = (days) => {
    const to = today
    const from = new Date(Date.now() - days * 86400000).toISOString().split('T')[0]
    setDateFrom(from)
    setDateTo(to)
    fetchLogs({ dateFrom: from, dateTo: to, tableName: filterTable || undefined })
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-700 to-slate-900 text-white p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold">Log de Auditoria</h2>
              <p className="text-slate-300 text-sm">{logs.length} eventos{hasMore ? '+' : ''}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="p-4 border-b border-gray-100 space-y-3">
          {/* Presets */}
          <div className="flex gap-2">
            {[
              { label: 'Hoy', days: 0 },
              { label: 'Semana', days: 7 },
              { label: 'Mes', days: 30 },
            ].map(p => (
              <button
                key={p.label}
                onClick={() => p.days === 0
                  ? (() => { setDateFrom(today); setDateTo(today); fetchLogs({ dateFrom: today, dateTo: today, tableName: filterTable || undefined }) })()
                  : setPreset(p.days)
                }
                className="px-3 py-1.5 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors font-medium"
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Date range + table filter */}
          <div className="flex gap-2 items-end flex-wrap">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Desde</label>
              <input
                type="date"
                value={dateFrom}
                max={dateTo}
                onChange={(e) => setDateFrom(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Hasta</label>
              <input
                type="date"
                value={dateTo}
                max={today}
                onChange={(e) => setDateTo(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Modulo</label>
              <select
                value={filterTable}
                onChange={(e) => setFilterTable(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm bg-white"
              >
                <option value="">Todos</option>
                {Object.entries(TABLE_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <button
              onClick={handleFilter}
              disabled={loading}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
            >
              <Search size={14} />
              Buscar
            </button>
          </div>
        </div>

        {/* Log list */}
        <div className="flex-1 overflow-y-auto">
          {loading && logs.length === 0 && (
            <div className="flex items-center justify-center py-16">
              <RefreshCw size={24} className="animate-spin text-slate-500 mr-3" />
              <span className="text-gray-500">Cargando...</span>
            </div>
          )}

          {!loading && logs.length === 0 && (
            <div className="text-center py-16">
              <Search className="mx-auto text-gray-300 mb-3" size={48} />
              <p className="text-gray-500 font-medium">Sin eventos</p>
              <p className="text-gray-400 text-sm">No hay registros de auditoria en este periodo</p>
            </div>
          )}

          <div className="divide-y divide-gray-50">
            {logs.map(log => {
              const config = ACTION_CONFIG[log.action] || DEFAULT_CONFIG
              const Icon = config.icon
              const isExpanded = expandedLog === log.id
              const description = getDescription(log)

              return (
                <div key={log.id} className="hover:bg-gray-50/50 transition-colors">
                  <div
                    className="flex items-start gap-3 p-4 cursor-pointer"
                    onClick={() => setExpandedLog(isExpanded ? null : log.id)}
                  >
                    <div className={`p-2 rounded-lg flex-shrink-0 ${config.bg}`}>
                      <Icon size={16} className={config.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{config.label}</span>
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full">
                          {TABLE_LABELS[log.table_name] || log.table_name}
                        </span>
                      </div>
                      {description && (
                        <p className="text-sm text-gray-500 mt-0.5 truncate">{description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs text-gray-400">{timeAgo(log.created_at)}</span>
                        <span className="text-xs text-gray-300">{formatTime(log.created_at)}</span>
                      </div>
                    </div>
                    <div className="flex-shrink-0">
                      {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 ml-11">
                      <div className="bg-gray-50 rounded-lg p-3 space-y-2 text-xs">
                        <div className="flex gap-4">
                          <span className="text-gray-400">Fecha:</span>
                          <span className="text-gray-600">
                            {new Date(log.created_at).toLocaleString('es-EC')}
                          </span>
                        </div>
                        {log.user_id && (
                          <div className="flex gap-4">
                            <span className="text-gray-400">Usuario:</span>
                            <span className="text-gray-600 font-mono">{log.user_id.substring(0, 8)}...</span>
                          </div>
                        )}
                        <div className="flex gap-4">
                          <span className="text-gray-400">Accion:</span>
                          <span className="text-gray-600 font-mono">{log.action}</span>
                        </div>
                        <div className="flex gap-4">
                          <span className="text-gray-400">Tabla:</span>
                          <span className="text-gray-600 font-mono">{log.table_name}</span>
                        </div>
                        {log.record_id && (
                          <div className="flex gap-4">
                            <span className="text-gray-400">Registro:</span>
                            <span className="text-gray-600 font-mono">{log.record_id.substring(0, 8)}...</span>
                          </div>
                        )}
                        {log.new_data && (
                          <div>
                            <span className="text-gray-400 block mb-1">Datos nuevos:</span>
                            <pre className="bg-white border border-gray-200 rounded p-2 overflow-x-auto text-gray-600 max-h-32 overflow-y-auto">
                              {JSON.stringify(log.new_data, null, 2)}
                            </pre>
                          </div>
                        )}
                        {log.old_data && (
                          <div>
                            <span className="text-gray-400 block mb-1">Datos anteriores:</span>
                            <pre className="bg-white border border-gray-200 rounded p-2 overflow-x-auto text-gray-600 max-h-32 overflow-y-auto">
                              {JSON.stringify(log.old_data, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Load more */}
          {hasMore && (
            <div className="p-4 text-center">
              <button
                onClick={() => loadMore(filters)}
                disabled={loading}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Cargando...' : 'Cargar mas'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
