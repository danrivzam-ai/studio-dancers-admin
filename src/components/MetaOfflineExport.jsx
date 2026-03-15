import { useState } from 'react'
import { Send, Users, UserCheck, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getCourseById } from '../lib/courses'

const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID
const ACCESS_TOKEN = import.meta.env.VITE_META_CAPI_TOKEN
const API_VERSION = 'v21.0'
const ENDPOINT = `https://graph.facebook.com/${API_VERSION}/${PIXEL_ID}/events`
const BATCH_SIZE = 100 // Máximo de Meta por request

/**
 * Envía eventos históricos a Meta CAPI en lotes.
 * event_time = fecha actual (Meta rechaza >7 días)
 * original_date se mantiene como referencia interna.
 */
export default function MetaOfflineExport() {
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(null)

  function normalizePhone(phone) {
    if (!phone) return null
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('593')) return cleaned
    if (cleaned.startsWith('0')) return `593${cleaned.slice(1)}`
    return cleaned
  }

  function splitName(fullName) {
    if (!fullName) return { fn: null, ln: null }
    const parts = fullName.trim().split(/\s+/)
    if (parts.length === 1) return { fn: parts[0], ln: null }
    return { fn: parts[0], ln: parts.slice(1).join(' ') }
  }

  async function sha256(value) {
    if (!value) return null
    const normalized = value.trim().toLowerCase()
    const encoded = new TextEncoder().encode(normalized)
    const buffer = await crypto.subtle.digest('SHA-256', encoded)
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('')
  }

  async function buildUserData(student) {
    const isMinor = student.is_minor
    const phone = isMinor ? student.parent_phone : student.phone
    const email = isMinor ? student.parent_email : student.email
    const name = isMinor ? student.parent_name : student.name
    const cedula = isMinor ? student.parent_cedula : student.cedula

    const { fn, ln } = splitName(name)
    const normalizedPhone = normalizePhone(phone)

    const [hashedPhone, hashedEmail, hashedFn, hashedLn, hashedExternalId, hashedCountry] = await Promise.all([
      sha256(normalizedPhone),
      sha256(email),
      sha256(fn),
      sha256(ln),
      sha256(cedula),
      sha256('ec'),
    ])

    const userData = { country: [hashedCountry] }
    if (hashedPhone) userData.ph = [hashedPhone]
    if (hashedEmail) userData.em = [hashedEmail]
    if (hashedFn) userData.fn = [hashedFn]
    if (hashedLn) userData.ln = [hashedLn]
    if (hashedExternalId) userData.external_id = [hashedExternalId]

    return userData
  }

  async function sendBatch(events) {
    const res = await fetch(`${ENDPOINT}?access_token=${ACCESS_TOKEN}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: events }),
    })
    const result = await res.json()
    if (!res.ok) throw new Error(result.error?.message || 'Error de Meta API')
    return result
  }

  async function handleSend() {
    if (!PIXEL_ID || !ACCESS_TOKEN) {
      setError('Faltan variables VITE_META_PIXEL_ID o VITE_META_CAPI_TOKEN')
      return
    }

    setLoading(true)
    setError(null)
    setStats(null)
    setProgress('Cargando datos...')

    try {
      // Traer pagos
      const { data: payments, error: payErr } = await supabase
        .from('payments')
        .select('id, amount, payment_method, payment_date, student_id')
        .order('payment_date', { ascending: true })

      if (payErr) throw payErr

      // Traer estudiantes
      const { data: students, error: stuErr } = await supabase
        .from('students')
        .select('id, name, email, phone, cedula, is_minor, is_courtesy, parent_name, parent_email, parent_phone, parent_cedula, course_id')

      if (stuErr) throw stuErr

      const studentMap = {}
      students.forEach(s => { studentMap[s.id] = s })

      const now = Math.floor(Date.now() / 1000)
      const adultEvents = []
      const parentEvents = []

      // Purchase events
      for (const pay of payments) {
        const student = studentMap[pay.student_id]
        if (!student || student.is_courtesy) continue

        const contactField = student.is_minor
          ? (student.parent_email || student.parent_phone)
          : (student.email || student.phone)
        if (!contactField) continue

        const course = getCourseById(student.course_id)
        const courseName = course?.name || 'Mensualidad'
        const userData = await buildUserData(student)
        const category = student.is_minor ? 'menor_con_representante' : 'adulta'

        const event = {
          event_name: 'Purchase',
          event_time: now,
          action_source: 'physical_store',
          event_id: `bulk_purchase_${pay.id}`,
          user_data: userData,
          custom_data: {
            currency: 'USD',
            value: parseFloat(pay.amount) || 0,
            content_name: courseName,
            content_category: category,
          },
        }

        if (student.is_minor) {
          parentEvents.push(event)
        } else {
          adultEvents.push(event)
        }
      }

      // Lead events
      for (const student of students) {
        if (student.is_courtesy) continue
        const contactField = student.is_minor
          ? (student.parent_email || student.parent_phone)
          : (student.email || student.phone)
        if (!contactField) continue

        const course = getCourseById(student.course_id)
        const courseName = course?.name || 'Registro'
        const userData = await buildUserData(student)
        const category = student.is_minor ? 'menor_con_representante' : 'adulta'

        const event = {
          event_name: 'Lead',
          event_time: now,
          action_source: 'physical_store',
          event_id: `bulk_lead_${student.id}`,
          user_data: userData,
          custom_data: {
            content_name: courseName,
            content_category: category,
          },
        }

        if (student.is_minor) {
          parentEvents.push(event)
        } else {
          adultEvents.push(event)
        }
      }

      // Enviar en lotes de 100
      const allEvents = [...adultEvents, ...parentEvents]
      const totalBatches = Math.ceil(allEvents.length / BATCH_SIZE)
      let sent = 0
      let errors = 0

      for (let i = 0; i < allEvents.length; i += BATCH_SIZE) {
        const batch = allEvents.slice(i, i + BATCH_SIZE)
        const batchNum = Math.floor(i / BATCH_SIZE) + 1
        setProgress(`Enviando lote ${batchNum}/${totalBatches} (${batch.length} eventos)...`)

        try {
          await sendBatch(batch)
          sent += batch.length
        } catch (err) {
          console.error(`[Meta CAPI] Lote ${batchNum} falló:`, err)
          errors += batch.length
        }

        // Pausa breve entre lotes para no saturar
        if (i + BATCH_SIZE < allEvents.length) {
          await new Promise(r => setTimeout(r, 500))
        }
      }

      setStats({
        adults: adultEvents.length,
        parents: parentEvents.length,
        sent,
        errors,
        total: allEvents.length,
      })
      setProgress(null)

    } catch (err) {
      console.error('[MetaOfflineExport]', err)
      setError(err.message)
      setProgress(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Send size={15} className="text-blue-500" />
        <span className="text-sm font-medium text-gray-700">Envío masivo Meta CAPI</span>
      </div>
      <p className="text-xs text-gray-500">
        Envía todos los pagos y registros históricos a Meta con <code className="bg-gray-100 px-1 rounded">content_category</code> diferenciado (adulta / representante) para crear audiencias personalizadas.
      </p>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex gap-2">
        <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
        <p className="text-xs text-amber-700">
          Usa <code className="bg-amber-100 px-1 rounded">event_time</code> actual para que Meta acepte los eventos. Las fechas originales no se modifican en la BD.
        </p>
      </div>

      <button
        onClick={handleSend}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 text-sm font-medium"
      >
        {loading ? (
          <><Loader2 size={16} className="animate-spin" /> {progress || 'Procesando...'}</>
        ) : (
          <><Send size={16} /> Enviar lote a Meta CAPI</>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 p-2 rounded-xl">Error: {error}</p>
      )}

      {stats && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <UserCheck size={18} className="mx-auto text-purple-600 mb-1" />
              <p className="text-lg font-bold text-purple-700">{stats.adults}</p>
              <p className="text-xs text-purple-600">Adultas</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <Users size={18} className="mx-auto text-blue-600 mb-1" />
              <p className="text-lg font-bold text-blue-700">{stats.parents}</p>
              <p className="text-xs text-blue-600">Representantes</p>
            </div>
          </div>
          <div className={`flex items-center gap-2 p-2 rounded-xl text-xs font-medium ${stats.errors > 0 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
            <CheckCircle2 size={14} />
            {stats.sent} enviados de {stats.total}{stats.errors > 0 ? ` · ${stats.errors} errores` : ' · Sin errores'}
          </div>
        </div>
      )}
    </div>
  )
}
