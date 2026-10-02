import { Settings, Lock, LogOut } from 'lucide-react'
import ThemeToggle from './ui/ThemeToggle'

// Barra lateral de PC (≥1024px). En celular y tablet la navegación sigue siendo
// la barra inferior (BottomNav) y las pestañas superiores.
//   tabs:  secciones [{ id, icon, label, count }]
//   tools: herramientas que abren modales [{ id, icon, label, onClick, badge }]
export default function SideNav({ activeTab, onTabChange, tabs, tools, userLabel, roleLabel, onSettings, onLock, onLogout }) {
  return (
    <aside className="hidden lg:flex fixed inset-y-0 left-0 z-30 w-60 flex-col bg-surface border-r border-line">
      <div className="px-5 pt-5 pb-4">
        <img src="/logo2.png" alt="Studio Dancers" className="h-10 w-auto object-contain dark:hidden" />
        <img src="/logo-cream.png" alt="Studio Dancers" className="h-10 w-auto object-contain hidden dark:block" />
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-3" aria-label="Secciones">
        <ul className="space-y-0.5">
          {tabs.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <li key={tab.id}>
                <button
                  onClick={() => onTabChange(tab.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`w-full flex items-center gap-3 h-10 px-3 rounded-lg text-sm transition-colors ${
                    isActive
                      ? 'bg-brand-soft text-brand-ink font-semibold'
                      : 'text-ink-soft hover:bg-surface-alt hover:text-ink font-medium'
                  }`}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.3 : 1.9} className="shrink-0" />
                  <span className="flex-1 text-left truncate">{tab.label}</span>
                  {tab.count > 0 && (
                    <span className="text-xs tabular-nums text-ink-muted">{tab.count}</span>
                  )}
                </button>
              </li>
            )
          })}
        </ul>

        {tools.length > 0 && (
          <>
            <p className="sd-section-title px-3 mt-6 mb-2">Herramientas</p>
            <ul className="space-y-0.5">
              {tools.map(tool => {
                const Icon = tool.icon
                return (
                  <li key={tool.id}>
                    <button
                      onClick={tool.onClick}
                      className="w-full flex items-center gap-3 h-10 px-3 rounded-lg text-sm font-medium text-ink-soft hover:bg-surface-alt hover:text-ink transition-colors"
                    >
                      <Icon size={18} strokeWidth={1.9} className="shrink-0" />
                      <span className="flex-1 text-left truncate">{tool.label}</span>
                      {tool.badge > 0 && (
                        <span className="min-w-5 h-5 px-1.5 rounded-full bg-brand text-white text-[11px] font-bold flex items-center justify-center">
                          {tool.badge}
                        </span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </nav>

      <div className="border-t border-line px-3 py-3 flex items-center gap-2">
        <div className="flex-1 min-w-0 px-2">
          <p className="text-sm font-semibold text-ink truncate">{userLabel}</p>
          {roleLabel && <p className="text-xs text-ink-muted truncate">{roleLabel}</p>}
        </div>
        {onSettings && (
          <button onClick={onSettings} className="w-9 h-9 flex items-center justify-center rounded-full text-ink-soft hover:bg-surface-alt hover:text-ink" title="Configuración" aria-label="Configuración">
            <Settings size={17} />
          </button>
        )}
        <ThemeToggle className="w-9 h-9 flex items-center justify-center rounded-full text-ink-soft hover:bg-surface-alt hover:text-ink" />
        <button onClick={onLock} className="w-9 h-9 flex items-center justify-center rounded-full text-ink-soft hover:bg-surface-alt hover:text-ink" title="Bloquear pantalla" aria-label="Bloquear pantalla">
          <Lock size={17} />
        </button>
        <button onClick={onLogout} className="w-9 h-9 flex items-center justify-center rounded-full text-ink-soft hover:bg-surface-alt hover:text-[#b42318]" title="Cerrar sesión" aria-label="Cerrar sesión">
          <LogOut size={17} />
        </button>
      </div>
    </aside>
  )
}
