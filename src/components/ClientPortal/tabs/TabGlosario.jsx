import { useState } from 'react'
import { Search, ChevronDown, ChevronUp } from 'lucide-react'

// ── Vocabulario de ballet para niñas ──────────────────────────────
const CATEGORIAS = [
  {
    id: 'posiciones',
    label: '🦶 Posiciones de pies',
    terminos: [
      { term: 'Primera posición',   def: 'Talones juntos, pies en línea recta hacia afuera formando una "V".' },
      { term: 'Segunda posición',   def: 'Pies separados, alineados con los hombros, en rotación.' },
      { term: 'Tercera posición',   def: 'Un pie frente al otro, talón del pie de adelante junto al arco del de atrás.' },
      { term: 'Cuarta posición',    def: 'Un pie adelante del otro con una separación de un pie de distancia.' },
      { term: 'Quinta posición',    def: 'Un pie completamente frente al otro: el talón del pie de adelante toca la punta del pie de atrás.' },
    ],
  },
  {
    id: 'brazos',
    label: '💪 Posiciones de brazos',
    terminos: [
      { term: 'En bas',     def: 'Brazos caídos hacia abajo con un suave arco, formando un óvalo frente al cuerpo.' },
      { term: 'En avant',   def: 'Ambos brazos al frente, suavemente redondeados a la altura del estómago.' },
      { term: 'À la seconde', def: 'Brazos abiertos a los lados, ligeramente por debajo de los hombros.' },
      { term: 'En haut',    def: 'Brazos arriba formando un aro sobre la cabeza.' },
      { term: 'Port de bras', def: 'Movimiento fluido de los brazos de una posición a otra.' },
    ],
  },
  {
    id: 'pasos',
    label: '🩰 Pasos básicos',
    terminos: [
      { term: 'Plié',         def: 'Doblar las rodillas. "Demi-plié" es medio y "grand plié" es completo.' },
      { term: 'Relevé',       def: 'Subir sobre las puntas o medias puntas de los pies.' },
      { term: 'Tendu',        def: 'Deslizar el pie a lo largo del suelo hasta extender la pierna y el pie completamente.' },
      { term: 'Dégagé',       def: 'Similar al tendu, pero el pie se levanta ligeramente del suelo.' },
      { term: 'Rond de jambe', def: 'Círculo trazado con la pierna, puede ser en el suelo o en el aire.' },
      { term: 'Glissade',     def: 'Paso deslizante que conecta otros pasos.' },
      { term: 'Sauté',        def: 'Salto desde dos pies aterrizando en dos pies.' },
      { term: 'Chassé',       def: 'Paso deslizante en el que un pie "caza" al otro.' },
      { term: 'Pas de chat',  def: 'Paso de gato: salto lateral en el que las rodillas se elevan en secuencia.' },
      { term: 'Assemblé',     def: 'Salto que une ambos pies en el aire antes de aterrizar.' },
      { term: 'Jeté',         def: 'Salto donde el peso se transfiere de un pie al otro.' },
    ],
  },
  {
    id: 'giros',
    label: '🌀 Giros y piruetas',
    terminos: [
      { term: 'Pirouette',     def: 'Giro sobre una pierna. Puede ser en dedans (hacia adentro) o en dehors (hacia afuera).' },
      { term: 'Tour en l\'air', def: 'Giro en el aire.' },
      { term: 'En dehors',     def: 'Hacia afuera. Describe el sentido de rotación de un giro.' },
      { term: 'En dedans',     def: 'Hacia adentro. Describe el sentido de rotación opuesto al en dehors.' },
      { term: 'Spotting',      def: 'Técnica de fijar la vista en un punto para mantener el equilibrio al girar.' },
    ],
  },
  {
    id: 'general',
    label: '📚 Términos generales',
    terminos: [
      { term: 'En croix',       def: 'En forma de cruz: adelante, lado, atrás, lado.' },
      { term: 'À la barre',     def: 'En la barra: ejercicios realizados con apoyo de la barra.' },
      { term: 'Au milieu',      def: 'En el centro: ejercicios realizados sin apoyo de la barra.' },
      { term: 'Adagio',         def: 'Ejercicio lento y fluido que trabaja el equilibrio y la extensión.' },
      { term: 'Allegro',        def: 'Ejercicio rápido que incluye saltos y combinaciones de pasos.' },
      { term: 'Arabesque',      def: 'Posición en una pierna con la otra extendida hacia atrás.' },
      { term: 'Attitude',       def: 'Posición en una pierna con la otra doblada detrás a 90°.' },
      { term: 'Battement',      def: 'Batimiento de la pierna. Puede ser petit (pequeño) o grand (grande).' },
      { term: 'Croisé',         def: 'Cruzado: posición del cuerpo de tres cuartos con las piernas cruzadas respecto al público.' },
      { term: 'Effacé',         def: 'Sombreado: posición del cuerpo opuesta al croisé.' },
      { term: 'En face',        def: 'De frente: el bailarín mira directamente al público.' },
      { term: 'Épaulement',     def: 'Posicionamiento de los hombros y la cabeza para dar expresividad al movimiento.' },
      { term: 'Turnout',        def: 'Rotación externa de las caderas, piernas y pies. Base del ballet clásico.' },
    ],
  },
]

export default function TabGlosario() {
  const [search, setSearch]     = useState('')
  const [open, setOpen]         = useState(null)  // id de categoría abierta

  const query = search.trim().toLowerCase()

  // Si hay búsqueda, mostrar resultados planos de todas las categorías
  const searchResults = query
    ? CATEGORIAS.flatMap(c =>
        c.terminos.filter(
          t => t.term.toLowerCase().includes(query) || t.def.toLowerCase().includes(query)
        ).map(t => ({ ...t, categoria: c.label }))
      )
    : []

  return (
    <div className="px-4 pt-5 pb-10 max-w-lg mx-auto">
      {/* Título */}
      <div className="mb-4">
        <h2 className="text-lg font-bold text-gray-800">Glosario de Ballet</h2>
        <p className="text-xs text-gray-500 mt-0.5">Vocabulario clásico para bailarinas</p>
      </div>

      {/* Buscador */}
      <div className="relative mb-4">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar término..."
          className="w-full pl-9 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 shadow-sm"
        />
      </div>

      {/* Resultados de búsqueda */}
      {query ? (
        searchResults.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-10">
            No encontramos "{search}" en el glosario.
          </p>
        ) : (
          <div className="space-y-2">
            {searchResults.map((t, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-3.5">
                <p className="text-[10px] text-purple-500 font-semibold uppercase tracking-wide mb-0.5">
                  {t.categoria}
                </p>
                <p className="font-bold text-gray-800 text-sm">{t.term}</p>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed">{t.def}</p>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Acordeón de categorías */
        <div className="space-y-2">
          {CATEGORIAS.map(cat => {
            const isOpen = open === cat.id
            return (
              <div key={cat.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : cat.id)}
                  className="w-full flex items-center justify-between px-4 py-3.5 text-left"
                >
                  <span className="font-semibold text-gray-800 text-sm">{cat.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">{cat.terminos.length}</span>
                    {isOpen
                      ? <ChevronUp  size={16} className="text-gray-400" />
                      : <ChevronDown size={16} className="text-gray-400" />
                    }
                  </div>
                </button>

                {isOpen && (
                  <div className="border-t border-gray-50">
                    {cat.terminos.map((t, i) => (
                      <div
                        key={i}
                        className={`px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}
                      >
                        <p className="font-semibold text-gray-800 text-sm">{t.term}</p>
                        <p className="text-xs text-gray-500 mt-1 leading-relaxed">{t.def}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
