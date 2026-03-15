import { useState } from 'react'
import { Download, Users, UserCheck, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { getCourseById } from '../lib/courses'
import * as XLSX from 'xlsx'

/**
 * Exporta CSVs en formato Meta Offline Conversions.
 * Genera dos archivos separados:
 *  1. Adultas que pagan sus clases
 *  2. Padres/Madres representantes de menores
 *
 * Columnas Meta requeridas:
 * email, phone, fn (first name), ln (last name), country, event_name,
 * event_time, value, currency, content_name
 */
export default function MetaOfflineExport() {
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState(null)
  const [error, setError] = useState(null)

  function normalizePhone(phone) {
    if (!phone) return ''
    const cleaned = phone.replace(/\D/g, '')
    if (cleaned.startsWith('593')) return cleaned
    if (cleaned.startsWith('0')) return `593${cleaned.slice(1)}`
    return cleaned
  }

  function splitName(fullName) {
    if (!fullName) return { fn: '', ln: '' }
    const parts = fullName.trim().split(/\s+/)
    if (parts.length === 1) return { fn: parts[0], ln: '' }
    return { fn: parts[0], ln: parts.slice(1).join(' ') }
  }

  async function handleExport() {
    setLoading(true)
    setError(null)
    setStats(null)

    try {
      // Traer pagos con datos del alumno
      const { data: payments, error: payErr } = await supabase
        .from('payments')
        .select('id, amount, payment_method, payment_date, student_id')
        .order('payment_date', { ascending: true })

      if (payErr) throw payErr

      // Traer todos los estudiantes
      const { data: students, error: stuErr } = await supabase
        .from('students')
        .select('id, name, email, phone, cedula, is_minor, parent_name, parent_email, parent_phone, parent_cedula, course_id, deleted_at')

      if (stuErr) throw stuErr

      const studentMap = {}
      students.forEach(s => { studentMap[s.id] = s })

      const adultRows = []
      const parentRows = []

      // Fecha actual para event_time (Meta rechaza >7 días)
      const now = new Date().toISOString().split('.')[0]

      for (const pay of payments) {
        const student = studentMap[pay.student_id]
        if (!student) continue
        if (student.is_courtesy || student.deleted_at) continue

        const course = getCourseById(student.course_id)
        const courseName = course?.name || 'Mensualidad'

        if (student.is_minor) {
          const { fn, ln } = splitName(student.parent_name)
          if (!student.parent_email && !student.parent_phone) continue
          parentRows.push({
            email: (student.parent_email || '').trim().toLowerCase(),
            phone: normalizePhone(student.parent_phone),
            fn: fn.toLowerCase(),
            ln: ln.toLowerCase(),
            country: 'ec',
            event_name: 'Purchase',
            event_time: now,
            value: parseFloat(pay.amount) || 0,
            currency: 'USD',
            content_name: courseName,
            content_category: 'representante',
            original_date: pay.payment_date || '',
          })
        } else {
          const { fn, ln } = splitName(student.name)
          if (!student.email && !student.phone) continue
          adultRows.push({
            email: (student.email || '').trim().toLowerCase(),
            phone: normalizePhone(student.phone),
            fn: fn.toLowerCase(),
            ln: ln.toLowerCase(),
            country: 'ec',
            event_name: 'Purchase',
            event_time: now,
            value: parseFloat(pay.amount) || 0,
            currency: 'USD',
            content_name: courseName,
            content_category: 'adulta',
            original_date: pay.payment_date || '',
          })
        }
      }

      // Leads (registros)
      for (const student of students) {
        if (student.is_courtesy || student.deleted_at) continue
        if (!student.email && !student.phone && !student.parent_email && !student.parent_phone) continue

        const course = getCourseById(student.course_id)
        const courseName = course?.name || 'Registro'

        if (student.is_minor) {
          const { fn, ln } = splitName(student.parent_name)
          if (!student.parent_email && !student.parent_phone) continue
          parentRows.push({
            email: (student.parent_email || '').trim().toLowerCase(),
            phone: normalizePhone(student.parent_phone),
            fn: fn.toLowerCase(),
            ln: ln.toLowerCase(),
            country: 'ec',
            event_name: 'Lead',
            event_time: now,
            value: 0,
            currency: 'USD',
            content_name: courseName,
            content_category: 'representante',
            original_date: student.enrollment_date || '',
          })
        } else {
          const { fn, ln } = splitName(student.name)
          if (!student.email && !student.phone) continue
          adultRows.push({
            email: (student.email || '').trim().toLowerCase(),
            phone: normalizePhone(student.phone),
            fn: fn.toLowerCase(),
            ln: ln.toLowerCase(),
            country: 'ec',
            event_name: 'Lead',
            event_time: now,
            value: 0,
            currency: 'USD',
            content_name: courseName,
            content_category: 'adulta',
            original_date: student.enrollment_date || '',
          })
        }
      }

      setStats({ adults: adultRows.length, parents: parentRows.length })

      // Generar y descargar CSVs
      if (adultRows.length > 0) downloadCSV(adultRows, 'Meta_Offline_Adultas')
      if (parentRows.length > 0) downloadCSV(parentRows, 'Meta_Offline_Representantes')

    } catch (err) {
      console.error('[MetaOfflineExport]', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  function downloadCSV(rows, filename) {
    const ws = XLSX.utils.json_to_sheet(rows)
    const csv = XLSX.utils.sheet_to_csv(ws)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Users size={15} className="text-blue-500" />
        <span className="text-sm font-medium text-gray-700">Exportar para Meta Offline Conversions</span>
      </div>
      <p className="text-xs text-gray-500">
        Genera 2 archivos CSV separados: Adultas y Representantes. Súbelos en Meta Events Manager → Offline Events.
      </p>

      <button
        onClick={handleExport}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50 text-sm font-medium"
      >
        {loading ? (
          <><Loader2 size={16} className="animate-spin" /> Generando...</>
        ) : (
          <><Download size={16} /> Descargar CSVs para Meta</>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-600">Error: {error}</p>
      )}

      {stats && (
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-purple-50 rounded-xl p-3 text-center">
            <UserCheck size={18} className="mx-auto text-purple-600 mb-1" />
            <p className="text-lg font-bold text-purple-700">{stats.adults}</p>
            <p className="text-xs text-purple-600">Eventos Adultas</p>
          </div>
          <div className="bg-blue-50 rounded-xl p-3 text-center">
            <Users size={18} className="mx-auto text-blue-600 mb-1" />
            <p className="text-lg font-bold text-blue-700">{stats.parents}</p>
            <p className="text-xs text-blue-600">Eventos Representantes</p>
          </div>
        </div>
      )}
    </div>
  )
}
