// ─── PARTNERS DATA ────────────────────────────────────────────────────────────
// Reemplaza estos datos con los aliados reales del estudio.
// tier: 'oro' | 'plata' | 'bronce'
const PARTNERS = [
  {
    id: 1,
    tier: 'oro',
    name: 'TiendaDanza EC',
    category: 'Indumentaria de danza',
    description: 'Todo lo que necesitas para brillar en el escenario. Uniformes, mallas y accesorios para ballet.',
    whatsapp: '593XXXXXXXXX',
    instagram: 'tiendadanza.ec',
    emoji: '👗',
  },
  {
    id: 2,
    tier: 'plata',
    name: 'FisioBalance',
    category: 'Fisioterapia deportiva',
    description: 'Prevención y recuperación de lesiones para bailarinas.',
    whatsapp: '593XXXXXXXXX',
    instagram: null,
    emoji: '🩺',
  },
  {
    id: 3,
    tier: 'plata',
    name: 'CalzaDance',
    category: 'Calzado especializado',
    description: 'Zapatillas de punta, medias puntas y calzado de danza de las mejores marcas.',
    whatsapp: '593XXXXXXXXX',
    instagram: 'calzadance.ec',
    emoji: '🩰',
  },
  {
    id: 4,
    tier: 'bronce',
    name: 'NutriMove',
    category: 'Nutrición deportiva',
    description: null,
    whatsapp: '593XXXXXXXXX',
    instagram: null,
    emoji: '🥗',
  },
]

const STUDIO_WHATSAPP = '593963741884' // Número del estudio para "unirse a la red"

// ─── TIER COMPONENTS ─────────────────────────────────────────────────────────

function PartnerOro({ p }) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-md border border-amber-100">
      <div className="px-5 py-3 flex items-center gap-2" style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)' }}>
        <span className="text-xl">{p.emoji}</span>
        <div className="flex-1">
          <p className="font-bold text-white text-sm leading-tight">{p.name}</p>
          <p className="text-amber-100 text-xs">{p.category}</p>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/20 text-white">⭐ Partner Oro</span>
      </div>
      <div className="bg-white p-4">
        <p className="text-sm text-gray-600 mb-3">{p.description}</p>
        <div className="flex gap-2">
          <a
            href={`https://wa.me/${p.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 py-2 rounded-xl text-xs font-semibold text-center text-white"
            style={{ background: '#22c55e' }}
          >
            WhatsApp
          </a>
          {p.instagram && (
            <a
              href={`https://instagram.com/${p.instagram}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 py-2 rounded-xl text-xs font-semibold text-center text-white"
              style={{ background: 'linear-gradient(135deg, #e1306c, #833ab4)' }}
            >
              Instagram
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

function PartnerPlata({ p }) {
  return (
    <div className="rounded-2xl overflow-hidden shadow-sm border-2 border-gray-200 bg-white">
      <div className="p-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{p.emoji}</span>
          <div>
            <p className="font-bold text-gray-800 text-xs leading-tight">{p.name}</p>
            <p className="text-[10px] text-gray-400">{p.category}</p>
          </div>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">✦ Plata</span>
      </div>
      <div className="p-3">
        {p.description && <p className="text-xs text-gray-500 mb-2 line-clamp-2">{p.description}</p>}
        <a
          href={`https://wa.me/${p.whatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full py-1.5 rounded-xl text-xs font-semibold text-center text-white active:scale-95 transition-all"
          style={{ background: '#22c55e' }}
        >
          WhatsApp
        </a>
      </div>
    </div>
  )
}

function PartnerBronce({ p }) {
  return (
    <a
      href={`https://wa.me/${p.whatsapp}`}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 bg-white rounded-xl px-3 py-2.5 border border-gray-100 shadow-sm hover:border-amber-200 active:scale-95 transition-all"
    >
      <span className="text-lg">{p.emoji}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-700 text-xs truncate">{p.name}</p>
        <p className="text-[10px] text-gray-400 truncate">{p.category}</p>
      </div>
      <span className="text-[10px] text-green-600 font-medium shrink-0">WhatsApp →</span>
    </a>
  )
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────

export default function LandingPage() {
  const oroPartners    = PARTNERS.filter(p => p.tier === 'oro')
  const plataPartners  = PARTNERS.filter(p => p.tier === 'plata')
  const broncePartners = PARTNERS.filter(p => p.tier === 'bronce')

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero */}
      <div className="text-white py-10 px-4 text-center" style={{ background: 'linear-gradient(135deg, #7e22ce 0%, #6b21a8 50%, #be185d 100%)' }}>
        <img
          src="/logo-cream.png"
          alt="Studio Dancers"
          className="h-16 mx-auto mb-4"
          style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))' }}
          onError={(e) => { e.target.src = '/logo.png' }}
        />
        <h1 className="text-2xl font-bold tracking-tight">Studio Dancers</h1>
        <p className="text-purple-200 text-sm mt-1">La Alborada, Guayaquil</p>
      </div>

      {/* Partners section */}
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">
        {/* Section header */}
        <div className="text-center">
          <p className="text-xs font-bold text-purple-600 uppercase tracking-widest mb-1">Red de confianza</p>
          <h2 className="text-xl font-bold text-gray-800">Productos y servicios recomendados</h2>
          <p className="text-sm text-gray-500 mt-1">Aliados seleccionados por Studio Dancers para nuestras alumnas</p>
        </div>

        {/* Oro partners */}
        {oroPartners.length > 0 && (
          <div className="space-y-3">
            {oroPartners.map(p => <PartnerOro key={p.id} p={p} />)}
          </div>
        )}

        {/* Plata partners */}
        {plataPartners.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {plataPartners.map(p => <PartnerPlata key={p.id} p={p} />)}
          </div>
        )}

        {/* Bronce partners */}
        {broncePartners.length > 0 && (
          <div className="space-y-2">
            {broncePartners.map(p => <PartnerBronce key={p.id} p={p} />)}
          </div>
        )}

        {/* CTA para nuevos aliados */}
        <div className="text-center pt-2">
          <p className="text-xs text-gray-400">
            ¿Quieres ser parte de nuestra red?{' '}
            <a
              href={`https://wa.me/${STUDIO_WHATSAPP}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 font-semibold hover:underline"
            >
              Escríbenos por WhatsApp
            </a>
          </p>
        </div>
      </div>

      {/* Footer */}
      <p className="text-center text-gray-400 text-xs pb-8">
        © {new Date().getFullYear()} Studio Dancers Admin
      </p>
    </div>
  )
}
