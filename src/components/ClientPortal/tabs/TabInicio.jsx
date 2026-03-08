import { useState, useEffect } from 'react'
import { ChevronRight, Sparkles, Target, BookHeart } from 'lucide-react'
import { getBienestar, getRetos, getDiarioList } from '../../../lib/adultas'
import { CATEGORIA_CFG } from './TabBienestar'

export default function TabInicio({ auth, student, onNavigate }) {
  const [bienestar, setBienestar] = useState(null)
  const [reto, setReto] = useState(null)
  const [diario, setDiario] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { cedula, phoneLast4 } = auth
      const sid = student.id
      const [b, r, d] = await Promise.all([
        getBienestar(cedula, phoneLast4, sid, 1, 0),
        getRetos(cedula, phoneLast4, sid, 10),
        getDiarioList(cedula, phoneLast4, sid, 1, 0),
      ])
      setBienestar(b.data?.[0] || null)
      setReto(r.data?.find(x => x.es_activo) || r.data?.[0] || null)
      setDiario(d.data?.[0] || null)
      setLoading(false)
    }
    load()
  }, [auth, student])

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-6 h-6 border-2 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
    </div>
  )

  return (
    <div className="px-4 pt-6 pb-4 max-w-lg mx-auto space-y-4">
      {/* Saludo */}
      <div className="mb-2">
        <h1 className="text-xl font-bold text-gray-800">
          Hola, {student.name.split(' ')[0]} 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Tu espacio entre clases</p>
      </div>

      {/* Tarjeta: Contenido nuevo */}
      {bienestar && (() => {
        const cfg = CATEGORIA_CFG[bienestar.categoria] || CATEGORIA_CFG.fortalecimiento
        return (
          <button
            onClick={() => onNavigate('bienestar')}
            className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-left hover:shadow-md active:scale-[0.99] transition-all"
          >
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={15} className="text-purple-500" />
              <span className="text-xs font-semibold text-purple-600 uppercase tracking-wide">Contenido nuevo</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-2xl">{cfg.emoji}</span>
              <div className="flex-1 min-w-0">
                <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full mb-1 ${cfg.badgeBg} ${cfg.badgeText}`}>
                  {cfg.label}
                </span>
                <p className="font-semibold text-gray-800 text-sm leading-snug">{bienestar.titulo}</p>
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  {bienestar.cuerpo.replace(/[#*_]/g, '').slice(0, 120)}…
                </p>
              </div>
              <ChevronRight size={16} className="text-gray-300 shrink-0 mt-1" />
            </div>
          </button>
        )
      })()}

      {/* Tarjeta: Reto de la semana */}
      {reto && (
        <button
          onClick={() => onNavigate('retos')}
          className="w-full bg-purple-50 border border-purple-100 rounded-2xl p-4 text-left hover:shadow-md active:scale-[0.99] transition-all"
        >
          <div className="flex items-center gap-2 mb-2">
            <Target size={15} className="text-purple-600" />
            <span className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Reto de la semana</span>
          </div>
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-gray-800 text-sm leading-snug">{reto.titulo}</p>
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">{reto.descripcion}</p>
            </div>
            <ChevronRight size={16} className="text-purple-300 shrink-0 mt-1" />
          </div>
        </button>
      )}

      {/* Tarjeta: Mi diario */}
      <button
        onClick={() => onNavigate('diario')}
        className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 p-4 text-left hover:shadow-md active:scale-[0.99] transition-all"
      >
        <div className="flex items-center gap-2 mb-2">
          <BookHeart size={15} className="text-rose-400" />
          <span className="text-xs font-semibold text-rose-500 uppercase tracking-wide">Mi diario</span>
        </div>
        {diario ? (
          <div className="flex items-start gap-2">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-gray-400 mb-0.5">
                {new Date(diario.fecha + 'T12:00:00').toLocaleDateString('es-EC', { day: 'numeric', month: 'short' })}
                {diario.estado_animo && ` · ${ANIMO_EMOJI[diario.estado_animo] || ''}`}
              </p>
              <p className="text-sm text-gray-700 line-clamp-2">{diario.contenido}</p>
            </div>
            <ChevronRight size={16} className="text-gray-300 shrink-0 mt-1" />
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            ¿Cómo fue tu última clase? Escribe tus impresiones.
          </p>
        )}
      </button>
    </div>
  )
}

export const ANIMO_EMOJI = {
  feliz: '😊', motivada: '💪', cansada: '😴', frustrada: '😤', neutral: '😐'
}
