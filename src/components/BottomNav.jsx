import { useState } from 'react'
import {
  Users, ShoppingBag, TrendingDown, BarChart3,
  Calendar, GraduationCap, Megaphone, Monitor, X, MoreHorizontal
} from 'lucide-react'

// Tabs visibles en la barra fija inferior (mobile)
const PRIMARY_ADMIN = [
  { id: 'students',  icon: Users,       label: 'Alumnos' },
  { id: 'sales',     icon: ShoppingBag, label: 'Tienda'  },
  { id: 'expenses',  icon: TrendingDown,label: 'Egresos' },
  { id: 'report',    icon: BarChart3,   label: 'Reporte' },
]

const PRIMARY_RECEPCION = [
  { id: 'students',  icon: Users,       label: 'Alumnos' },
  { id: 'sales',     icon: ShoppingBag, label: 'Tienda'  },
  { id: 'expenses',  icon: TrendingDown,label: 'Egresos' },
  { id: 'courses',   icon: Calendar,    label: 'Cursos'  },
]

export default function BottomNav({
  activeTab,
  onTabChange,
  isAdmin = false,
  isRecepcion = false,
  pendingTransfers = 0,
  announcementCount = 0,
}) {
  const [showMore, setShowMore] = useState(false)

  const primaryTabs = isRecepcion ? PRIMARY_RECEPCION : PRIMARY_ADMIN

  const moreTabs = isRecepcion ? [] : [
    { id: 'courses',        icon: Calendar,       label: 'Cursos'    },
    { id: 'academico',      icon: GraduationCap,  label: 'Académico' },
    { id: 'tablon',         icon: Megaphone,      label: 'Tablón',   badge: announcementCount },
    ...(isAdmin ? [{ id: 'recepcionistas', icon: Monitor, label: 'Recepción' }] : []),
  ]

  const isMoreActive = moreTabs.some(t => t.id === activeTab)
  const hasMoreBadge = pendingTransfers > 0 && !showMore

  const handleSelect = (tabId) => {
    onTabChange(tabId)
    setShowMore(false)
  }

  return (
    <>
      {/* Overlay oscuro cuando "Más" está abierto */}
      {showMore && (
        <div
          className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
          onClick={() => setShowMore(false)}
        />
      )}

      {/* Sheet de "Más" — desliza desde abajo */}
      {showMore && moreTabs.length > 0 && (
        <div
          className="fixed left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl"
          style={{
            bottom: 0,
            paddingBottom: 'calc(4rem + env(safe-area-inset-bottom))',
          }}
        >
          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          {/* Título */}
          <div className="flex items-center justify-between px-5 py-3">
            <span className="text-sm font-semibold text-gray-600 tracking-wide uppercase" style={{ fontSize: '0.7rem', letterSpacing: '0.08em' }}>
              Más secciones
            </span>
            <button
              onClick={() => setShowMore(false)}
              className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Grid de pestañas secundarias */}
          <div className="grid grid-cols-4 gap-2 px-4 pb-3">
            {moreTabs.map(tab => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleSelect(tab.id)}
                  className="relative flex flex-col items-center gap-2 py-4 px-1 rounded-2xl transition-all active:scale-95"
                  style={{
                    background: isActive ? '#fdf2f7' : 'transparent',
                    color: isActive ? '#551735' : '#6b7280',
                  }}
                >
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.75} />
                  <span
                    className="leading-none font-medium"
                    style={{ fontSize: '0.65rem' }}
                  >
                    {tab.label}
                  </span>
                  {tab.badge > 0 && (
                    <span
                      className="absolute flex items-center justify-center text-white font-bold rounded-full"
                      style={{
                        top: '0.5rem', right: '0.5rem',
                        width: '1.1rem', height: '1.1rem',
                        fontSize: '0.55rem',
                        background: '#551735',
                      }}
                    >
                      {tab.badge > 9 ? '9+' : tab.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Barra fija inferior */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white md:hidden"
        style={{
          borderTop: '1px solid rgba(85, 23, 53, 0.08)',
          boxShadow: '0 -2px 16px rgba(85, 23, 53, 0.07)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <div className="flex items-stretch" style={{ height: '4rem' }}>
          {primaryTabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => handleSelect(tab.id)}
                className="relative flex-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
                style={{ color: isActive ? '#551735' : '#9ca3af' }}
              >
                {/* Indicador activo */}
                {isActive && (
                  <span
                    className="absolute top-0 left-1/2 rounded-full"
                    style={{
                      width: '1.75rem', height: '2px',
                      background: '#551735',
                      transform: 'translateX(-50%)',
                    }}
                  />
                )}
                <div
                  className="flex items-center justify-center rounded-xl transition-all"
                  style={{
                    width: '2.25rem', height: '2.25rem',
                    background: isActive ? '#fdf2f7' : 'transparent',
                  }}
                >
                  <Icon size={19} strokeWidth={isActive ? 2.5 : 1.75} />
                </div>
                <span
                  className="leading-none"
                  style={{
                    fontSize: '0.6rem',
                    fontWeight: isActive ? 700 : 500,
                  }}
                >
                  {tab.label}
                </span>
              </button>
            )
          })}

          {/* Botón "Más" — solo si hay pestañas secundarias */}
          {moreTabs.length > 0 && (
            <button
              onClick={() => setShowMore(prev => !prev)}
              className="relative flex-1 flex flex-col items-center justify-center gap-1 transition-all active:scale-95"
              style={{ color: isMoreActive || showMore ? '#551735' : '#9ca3af' }}
            >
              {(isMoreActive || showMore) && (
                <span
                  className="absolute top-0 left-1/2 rounded-full"
                  style={{
                    width: '1.75rem', height: '2px',
                    background: '#551735',
                    transform: 'translateX(-50%)',
                  }}
                />
              )}
              <div
                className="flex items-center justify-center rounded-xl transition-all"
                style={{
                  width: '2.25rem', height: '2.25rem',
                  background: isMoreActive || showMore ? '#fdf2f7' : 'transparent',
                }}
              >
                <MoreHorizontal
                  size={19}
                  strokeWidth={isMoreActive || showMore ? 2.5 : 1.75}
                />
              </div>
              <span
                className="leading-none"
                style={{
                  fontSize: '0.6rem',
                  fontWeight: isMoreActive || showMore ? 700 : 500,
                }}
              >
                Más
              </span>

              {/* Badge transferencias pendientes */}
              {hasMoreBadge && (
                <span
                  className="absolute flex items-center justify-center text-white font-bold rounded-full"
                  style={{
                    top: '0.375rem', right: 'calc(50% - 1.5rem)',
                    width: '1.1rem', height: '1.1rem',
                    fontSize: '0.55rem',
                    background: '#2563eb',
                  }}
                >
                  {pendingTransfers > 9 ? '9+' : pendingTransfers}
                </span>
              )}
            </button>
          )}
        </div>
      </nav>
    </>
  )
}
