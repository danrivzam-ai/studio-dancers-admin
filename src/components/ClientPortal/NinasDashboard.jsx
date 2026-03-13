import { useState } from 'react'
import { CreditCard, CalendarDays, BookOpen, BarChart2, Gift } from 'lucide-react'
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

  const initials = (student.name || '').split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const isCourtesy = student.is_courtesy
  const ps = student.payment_status
  // DB values: 'paid' | 'pending' | 'partial' | 'overdue'
  const chip = isCourtesy
    ? { label: 'Cortesía', cls: 'bg-amber-100 text-amber-700' }
    : ps === 'paid'
    ? { label: 'Al día', cls: 'bg-emerald-100 text-emerald-700' }
    : ps === 'overdue'
    ? { label: 'Vencido', cls: 'bg-red-100 text-red-700' }
    : (ps === 'pending' || ps === 'partial')
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
        {isCourtesy && (
          <div className="mx-4 mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
            <Gift size={18} className="mx-auto mb-1 text-amber-500" />
            <p className="text-xs font-semibold text-amber-800">Pase de Cortesía</p>
            <p className="text-[11px] text-amber-600 mt-0.5">
              {student.courtesy_end_date
                ? `Válido hasta ${new Date(student.courtesy_end_date + 'T12:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'short', year: 'numeric' })}`
                : 'Acceso indefinido'}
            </p>
          </div>
        )}
        {activeTab === 'pagos'      && <TabPagos        auth={auth} student={student} onLogout={onLogout} />}
        {activeTab === 'calendario' && <TabCalendario   auth={auth} student={student} />}
        {activeTab === 'glosario'   && <TabGlosario     />}
        {activeTab === 'reportes'   && <TabReportesNinas auth={auth} student={student} onLogout={onLogout} />}
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
