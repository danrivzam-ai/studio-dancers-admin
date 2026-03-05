import { useState } from 'react'
import { Home, Sparkles, Target, BookHeart, User } from 'lucide-react'
import TabInicio from './tabs/TabInicio'
import TabBienestar from './tabs/TabBienestar'
import TabRetos from './tabs/TabRetos'
import TabDiario from './tabs/TabDiario'
import TabMiCuenta from './tabs/TabMiCuenta'

const TABS = [
  { id: 'inicio',    label: 'Inicio',    Icon: Home      },
  { id: 'bienestar', label: 'Bienestar', Icon: Sparkles  },
  { id: 'retos',     label: 'Retos',     Icon: Target    },
  { id: 'diario',    label: 'Mi diario', Icon: BookHeart },
  { id: 'cuenta',    label: 'Mi cuenta', Icon: User      },
]

export default function AdultDashboard({ auth, student, onLogout }) {
  const [activeTab, setActiveTab] = useState('inicio')

  const sharedProps = { auth, student }

  return (
    <div className="min-h-svh flex flex-col bg-gray-50">
      {/* Contenido principal */}
      <div className="flex-1 overflow-y-auto pb-20">
        {activeTab === 'inicio'    && <TabInicio    {...sharedProps} onNavigate={setActiveTab} />}
        {activeTab === 'bienestar' && <TabBienestar {...sharedProps} />}
        {activeTab === 'retos'     && <TabRetos     {...sharedProps} />}
        {activeTab === 'diario'    && <TabDiario    {...sharedProps} />}
        {activeTab === 'cuenta'    && <TabMiCuenta  {...sharedProps} onLogout={onLogout} />}
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
