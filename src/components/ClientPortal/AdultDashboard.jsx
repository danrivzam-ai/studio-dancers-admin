import { useState, useEffect } from 'react'
import { LogOut, BookOpen, TrendingUp, Home, RefreshCw } from 'lucide-react'
import {
  getAdultasCicloActual,
  getAdultasBitacora,
  getAdultasProgresion,
  getAdultasConstancia,
  getAdultasTips
} from '../../lib/adultas'
import Block1CicloActual from './Block1CicloActual'
import Block2Constancia from './Block2Constancia'
import Block3Progresion from './Block3Progresion'
import Block4Bitacora from './Block4Bitacora'
import Block5Tips from './Block5Tips'

const TABS = [
  { id: 'inicio', label: 'Inicio', Icon: Home },
  { id: 'bitacora', label: 'Bitácora', Icon: BookOpen },
  { id: 'progreso', label: 'Mi Progreso', Icon: TrendingUp }
]

export default function AdultDashboard({ student, auth, onLogout, allStudents }) {
  const [activeTab, setActiveTab] = useState('inicio')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Data state
  const [cicloData, setCicloData] = useState(null)
  const [bitacoraData, setBitacoraData] = useState(null)
  const [progresionData, setProgresionData] = useState(null)
  const [constanciaData, setConstanciaData] = useState(null)
  const [tipsData, setTipsData] = useState(null)

  const { cedula, phone4 } = auth
  const studentId = student.id

  const loadData = async (showLoader = true) => {
    if (showLoader) setLoading(true)
    else setRefreshing(true)

    const [ciclo, bitacora, progresion, constancia, tips] = await Promise.all([
      getAdultasCicloActual(cedula, phone4, studentId),
      getAdultasBitacora(cedula, phone4, studentId),
      getAdultasProgresion(cedula, phone4, studentId),
      getAdultasConstancia(cedula, phone4, studentId),
      getAdultasTips(cedula, phone4, studentId)
    ])

    setCicloData(ciclo.data)
    setBitacoraData(Array.isArray(bitacora.data) ? bitacora.data : [])
    setProgresionData(progresion.data)
    setConstanciaData(constancia.data)
    setTipsData(Array.isArray(tips.data) ? tips.data : [])

    if (showLoader) setLoading(false)
    else setRefreshing(false)
  }

  useEffect(() => {
    loadData(true)
  }, [studentId])

  const courseName = student.course_name || 'Mi curso'

  return (
    <div
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        background: '#f5f5f5',
        maxWidth: '480px',
        margin: '0 auto',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* ── Header ── */}
      <div
        className="shrink-0 px-4 pt-4 pb-3"
        style={{
          background: 'linear-gradient(160deg, #7B2D8E 0%, #5a1a6e 100%)',
          boxShadow: '0 2px 12px rgba(123,45,142,0.25)'
        }}
      >
        <div className="flex items-center justify-between mb-1">
          <img
            src="/logo-white.png"
            alt="Studio Dancers"
            className="h-7"
            style={{ filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))' }}
            onError={e => { e.target.src = '/logo2.png' }}
          />
          <div className="flex items-center gap-1">
            {refreshing && (
              <RefreshCw size={14} className="text-white/60 animate-spin" />
            )}
            <button
              onClick={() => loadData(false)}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Actualizar"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={onLogout}
              className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              title="Cerrar sesión"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
        <div>
          <h1 className="text-white font-bold text-lg leading-tight">{student.name}</h1>
          <p className="text-white/60 text-xs">{courseName}</p>
        </div>
      </div>

      {/* ── Contenido según tab ── */}
      <div className="flex-1 overflow-y-auto">
        {/* ── Tab: Inicio ── */}
        {activeTab === 'inicio' && (
          <div className="p-4 space-y-4">
            {/* Bloque 1: Mi ciclo actual */}
            <section>
              <Block1CicloActual cicloData={cicloData} loading={loading} />
            </section>

            {/* Bloque 2: Mi constancia */}
            {(loading || constanciaData) && (
              <section>
                <Block2Constancia data={constanciaData} loading={loading} />
              </section>
            )}

            {/* Bloque 3: Progresión — versión compacta en inicio */}
            {(loading || (progresionData?.bloques?.length > 0)) && (
              <section>
                <div className="flex items-center justify-between mb-2 px-1">
                  <p className="text-sm font-bold text-gray-700">Lo que hemos cubierto</p>
                  <button
                    onClick={() => setActiveTab('progreso')}
                    className="text-xs font-semibold"
                    style={{ color: '#7B2D8E' }}
                  >
                    Ver todo →
                  </button>
                </div>
                {loading ? (
                  <div className="space-y-2">
                    {[...Array(2)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
                  </div>
                ) : (
                  <Block3Progresion data={progresionData} loading={false} compact />
                )}
              </section>
            )}

            {/* Bloque 4: Bitácora — versión compacta en inicio */}
            <section>
              <div className="flex items-center justify-between mb-2 px-1">
                <p className="text-sm font-bold text-gray-700">Bitácora de clase</p>
                <button
                  onClick={() => setActiveTab('bitacora')}
                  className="text-xs font-semibold"
                  style={{ color: '#7B2D8E' }}
                >
                  Ver todo →
                </button>
              </div>
              <Block4Bitacora entries={bitacoraData} loading={loading} compact />
            </section>

            {/* Bloque 5: Tip de la semana */}
            {(loading || (tipsData && tipsData.length > 0)) && (
              <section>
                <div className="flex items-center justify-between mb-2 px-1">
                  <p className="text-sm font-bold text-gray-700">Tip de la semana</p>
                </div>
                <Block5Tips tips={tipsData} loading={loading} />
              </section>
            )}
          </div>
        )}

        {/* ── Tab: Bitácora completa ── */}
        {activeTab === 'bitacora' && (
          <div className="p-4">
            <h2 className="text-base font-bold text-gray-800 mb-4">Bitácora de clase</h2>
            <Block4Bitacora entries={bitacoraData} loading={loading} compact={false} />
          </div>
        )}

        {/* ── Tab: Mi progreso completo ── */}
        {activeTab === 'progreso' && (
          <div className="p-4">
            <h2 className="text-base font-bold text-gray-800 mb-4">Mi progreso</h2>
            <Block3Progresion data={progresionData} loading={loading} compact={false} />
          </div>
        )}
      </div>

      {/* ── Tab Bar — al fondo usando flexbox, no fixed ── */}
      <div
        className="shrink-0 flex"
        style={{
          background: 'white',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
          height: '56px'
        }}
      >
        {TABS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className="flex-1 flex flex-col items-center justify-center gap-0.5 transition-colors relative"
            style={{ color: activeTab === id ? '#7B2D8E' : '#9ca3af' }}
          >
            <Icon size={20} strokeWidth={activeTab === id ? 2.5 : 1.8} />
            <span className="text-[10px] font-semibold">{label}</span>
            {activeTab === id && (
              <div
                className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-0.5 rounded-full"
                style={{ background: '#7B2D8E' }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}
