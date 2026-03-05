import { useState, useMemo } from 'react'
import { ChevronDown, ChevronUp, Lock, Check } from 'lucide-react'

function getBlockStatus(items) {
  if (!items || items.length === 0) return 'pendiente'
  const estados = items.map(i => i.estado)
  if (estados.every(e => e === 'cubierto')) return 'cubierto'
  if (estados.some(e => e === 'en_curso' || e === 'cubierto')) return 'activo'
  return 'pendiente'
}

const ITEM_ESTADO_STYLE = {
  cubierto: { dot: '#2A9D8F', text: '#2A9D8F', bg: '#e8f5e9', label: 'Cubierto', icon: '✓' },
  en_curso: { dot: '#7B2D8E', text: '#7B2D8E', bg: '#f3e5f5', label: 'En curso', icon: '●' },
  pendiente: { dot: '#d1d5db', text: '#9ca3af', bg: '#f9fafb', label: 'Pendiente', icon: '○' }
}

function BloqueCard({ bloque, defaultOpen }) {
  const status = getBlockStatus(bloque.items)
  const [open, setOpen] = useState(defaultOpen ?? status === 'activo')

  const headerStyle = {
    cubierto: { bg: '#e8f5e9', border: '#2A9D8F33', iconBg: '#2A9D8F', iconColor: 'white' },
    activo: { bg: '#f3e5f5', border: '#7B2D8E55', iconBg: '#7B2D8E', iconColor: 'white' },
    pendiente: { bg: '#f5f5f5', border: '#e5e7eb', iconBg: '#e5e7eb', iconColor: '#9ca3af' }
  }[status]

  const headerIcon = {
    cubierto: <Check size={14} style={{ color: headerStyle.iconColor }} />,
    activo: <span className="text-[10px] font-bold" style={{ color: headerStyle.iconColor }}>EN CURSO</span>,
    pendiente: <Lock size={12} style={{ color: headerStyle.iconColor }} />
  }[status]

  return (
    <div
      className="rounded-xl overflow-hidden transition-all"
      style={{ border: `1.5px solid ${headerStyle.border}` }}
    >
      {/* Header del bloque */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 text-left transition-colors"
        style={{ background: headerStyle.bg }}
      >
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0"
          style={{ background: headerStyle.iconBg }}
        >
          {headerIcon}
        </div>
        <span className="flex-1 font-semibold text-sm text-gray-800 leading-tight">
          {bloque.nombre}
        </span>
        <span className="text-xs text-gray-400 mr-1">
          {bloque.items?.filter(i => i.estado === 'cubierto').length}/{bloque.items?.length}
        </span>
        {open
          ? <ChevronUp size={15} className="text-gray-400 shrink-0" />
          : <ChevronDown size={15} className="text-gray-400 shrink-0" />}
      </button>

      {/* Items del bloque */}
      {open && (
        <div className="px-4 py-3 space-y-2 bg-white">
          {bloque.descripcion && (
            <p className="text-xs text-gray-500 mb-2 italic">{bloque.descripcion}</p>
          )}
          {bloque.items?.map(item => {
            const cfg = ITEM_ESTADO_STYLE[item.estado] || ITEM_ESTADO_STYLE.pendiente
            return (
              <div
                key={item.id}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm"
                style={{ background: cfg.bg }}
              >
                <span
                  className="w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0"
                  style={{ background: cfg.dot, color: 'white' }}
                >
                  {cfg.icon}
                </span>
                <span className="flex-1 leading-tight" style={{ color: item.estado === 'pendiente' ? '#9ca3af' : '#333' }}>
                  {item.nombre}
                </span>
                {item.estado === 'cubierto' && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: '#2A9D8F22', color: '#2A9D8F' }}>
                    ✓
                  </span>
                )}
                {item.estado === 'en_curso' && (
                  <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full shrink-0" style={{ background: '#7B2D8E22', color: '#7B2D8E' }}>
                    Activo
                  </span>
                )}
              </div>
            )
          })}
          {(!bloque.items || bloque.items.length === 0) && (
            <p className="text-xs text-gray-400 text-center py-2">Sin ítems</p>
          )}
        </div>
      )}
    </div>
  )
}

export default function Block3Progresion({ data, loading, compact }) {
  const bloques = data?.bloques || []
  const plantilla = data?.plantilla

  if (loading) {
    return (
      <div className="space-y-2 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-100 rounded-xl" />
        ))}
      </div>
    )
  }

  if (!plantilla || bloques.length === 0) {
    return (
      <div className="rounded-2xl p-5 text-center" style={{ background: '#f9f9f9', border: '1px dashed #e5e7eb' }}>
        <p className="text-sm font-medium text-gray-500">Sin plan de progresión</p>
        <p className="text-xs text-gray-400 mt-1">
          Tu profesora aún no ha asignado un plan de progresión a tu curso.
        </p>
      </div>
    )
  }

  const covered = bloques.filter(b => getBlockStatus(b.items) === 'cubierto').length
  const total = bloques.length

  return (
    <div className="space-y-2">
      {/* Resumen general */}
      {!compact && (
        <div className="flex items-center justify-between px-1 mb-3">
          <div>
            <p className="text-sm font-semibold text-gray-700">{plantilla.nombre}</p>
            {plantilla.descripcion && (
              <p className="text-xs text-gray-400">{plantilla.descripcion}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-lg font-bold" style={{ color: '#2A9D8F' }}>{covered}/{total}</p>
            <p className="text-[10px] text-gray-400">bloques</p>
          </div>
        </div>
      )}

      {/* Timeline de bloques */}
      <div className="space-y-2">
        {bloques.map((bloque, idx) => (
          <BloqueCard key={bloque.id} bloque={bloque} />
        ))}
      </div>
    </div>
  )
}
