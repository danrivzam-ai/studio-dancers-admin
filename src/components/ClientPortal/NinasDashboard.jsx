import { useState } from 'react'
import { CreditCard, CalendarDays, BookOpen, BarChart2 } from 'lucide-react'
import TabPagos from './tabs/TabPagos'
import TabCalendario from './tabs/TabCalendario'
import TabGlosario from './tabs/TabGlosario'
import TabReportesNinas from './tabs/TabReportesNinas'

// Niñas: Pagos · Calendario · Glosario · Reportes
const TABS = [
  { id: 'pagos',      label: 'Pagos',      Icon: CreditCard  },
  { id: 'calendario', label: 'Calendario', Icon: CalendarDays },
  { id: 'glosario',   label: 'Glosario',   Icon: BookOpen    },
  { id: 'reportes',   label: 'Reportes',   Icon: BarChart2   },
]

export default function NinasDashboard({ auth, student, onLogout }) {
  const [activeTab, setActiveTab] = useState('pagos')

  return (
    <div className="min-h-svh flex flex-col bg-gray-50">
      {/* Contenido principal */}
      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'pagos'      && <TabPagos        auth={auth} student={student} onLogout={onLogout} />}
        {activeTab === 'calendario' && <TabCalendario   auth={auth} student={student} />}
        {activeTab === 'glosario'   && <TabGlosario     />}
        {activeTab === 'reportes'   && <TabReportesNinas auth={auth} student={student} onLogout={onLogout} />}
      </div>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 inset-x-0 bg-white border-t border-gray-100 shadow-sm z-40">
        <div className="flex">
          {TABS.map(({ id, label, Icon }) => {
            const active = activeTab === id
            return (
              <button
                key={id}
                onClick={() => setActiveTab(id)}
                className="relative flex-1 flex flex-col items-center gap-0.5 py-2.5 transition-colors"
              >
                <Icon
                  size={20}
                  className={active ? 'text-purple-600' : 'text-gray-400'}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span className={`text-[10px] font-medium ${active ? 'text-purple-600' : 'text-gray-400'}`}>
                  {label}
                </span>
                {active && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-purple-600" />
                )}
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
