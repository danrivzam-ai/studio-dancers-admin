import { useState } from 'react'
import { Sparkles, Target, BookHeart, CalendarDays, BarChart2 } from 'lucide-react'
import TabBienestar from './tabs/TabBienestar'
import TabRetos from './tabs/TabRetos'
import TabDiario from './tabs/TabDiario'
import TabCalendario from './tabs/TabCalendario'
import TabReportes from './tabs/TabReportes'

// Adultas: Bienestar · Retos · Mi Diario · Calendario · Reportes
const TABS = [
  { id: 'bienestar',  label: 'Bienestar',  Icon: Sparkles    },
  { id: 'retos',      label: 'Retos',      Icon: Target      },
  { id: 'diario',     label: 'Mi diario',  Icon: BookHeart   },
  { id: 'calendario', label: 'Calendario', Icon: CalendarDays },
  { id: 'reportes',   label: 'Reportes',   Icon: BarChart2   },
]

export default function AdultDashboard({ auth, student, onLogout }) {
  const [activeTab, setActiveTab] = useState('bienestar')

  const sharedProps = { auth, student }

  const initials = (student.name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const ps = student.payment_status
  const chip = ps === 'ok' || ps === 'paid' || ps === 'active_package'
    ? { label: 'Al día', cls: 'bg-emerald-100 text-emerald-700' }
    : ps === 'overdue' || ps === 'due_today'
    ? { label: 'Vencido', cls: 'bg-red-100 text-red-700' }
    : ps === 'urgent' || ps === 'upcoming'
    ? { label: 'Por renovar', cls: 'bg-amber-100 text-amber-700' }
    : null

  return (
    <div className="min-h-svh flex flex-col bg-gray-50">

      {/* Header compacto */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-2.5">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center shrink-0">
            <span className="text-purple-700 font-bold text-xs">{initials}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-gray-800 leading-tight truncate">
              {student.name.split(' ').slice(0, 2).join(' ')}
            </p>
            <p className="text-[11px] text-gray-400 truncate">{student.course_name || student.course_id}</p>
          </div>
          {chip && (
            <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full shrink-0 ${chip.cls}`}>
              {chip.label}
            </span>
          )}
        </div>
      </header>

      {/* Contenido principal */}
      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'bienestar'  && <TabBienestar  {...sharedProps} />}
        {activeTab === 'retos'      && <TabRetos      {...sharedProps} />}
        {activeTab === 'diario'     && <TabDiario     {...sharedProps} />}
        {activeTab === 'calendario' && <TabCalendario {...sharedProps} />}
        {activeTab === 'reportes'   && <TabReportes   {...sharedProps} onLogout={onLogout} />}
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 shadow-lg z-40">
        <div className="flex">
          {TABS.map(({ id, label, Icon }) => {
            const active = activeTab === id
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className={`relative flex-1 flex flex-col items-center gap-0.5 pt-2 pb-3 transition-all ${active ? 'bg-purple-50' : 'hover:bg-gray-50'}`}
              >
                <Icon
                  size={20}
                  className={active ? 'text-purple-600' : 'text-gray-400'}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span className={`text-[10px] font-semibold ${active ? 'text-purple-600' : 'text-gray-400'}`}>
                  {label}
                </span>
                {active && (
                  <span className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-full bg-purple-500" />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
