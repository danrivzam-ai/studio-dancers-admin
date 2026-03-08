import { LogOut, Music2, Star } from 'lucide-react'

export default function InstructoraDashboard({ instructor, onLogout }) {
  const firstName = instructor.name.split(' ')[0]

  return (
    <div className="min-h-screen" style={{
      background: 'linear-gradient(135deg, #f5f3ff 0%, #fdf2f8 100%)'
    }}>
      {/* Header */}
      <header className="bg-white border-b border-purple-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
              style={{ background: 'linear-gradient(135deg, #9333ea, #be185d)' }}>
              {instructor.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800">{instructor.name}</p>
              <p className="text-xs text-purple-500">Instructora</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors px-3 py-2 rounded-xl hover:bg-red-50"
          >
            <LogOut size={15} />
            Salir
          </button>
        </div>
      </header>

      {/* Contenido */}
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        {/* Bienvenida */}
        <div className="rounded-2xl p-6 text-white" style={{
          background: 'linear-gradient(135deg, #9333ea 0%, #7e22ce 60%, #be185d 100%)'
        }}>
          <p className="text-purple-200 text-sm mb-1">¡Bienvenida de vuelta!</p>
          <h1 className="text-2xl font-bold mb-0.5">{firstName} 🎉</h1>
          <p className="text-purple-200 text-sm">Aquí está tu espacio de instructora.</p>
        </div>

        {/* Próximamente */}
        <div className="bg-white rounded-2xl border border-purple-100 p-6 text-center space-y-3">
          <div className="flex justify-center">
            <div className="w-14 h-14 rounded-2xl bg-purple-50 flex items-center justify-center">
              <Music2 size={26} className="text-purple-400" />
            </div>
          </div>
          <h2 className="font-semibold text-gray-800">Portal en construcción</h2>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            Aquí podrás ver tu horario, clases asignadas y más. Muy pronto.
          </p>
          <div className="flex items-center justify-center gap-1.5 text-xs text-purple-400 font-medium">
            <Star size={12} />
            Próximas funciones
            <Star size={12} />
          </div>
        </div>
      </main>
    </div>
  )
}
