import { useState } from 'react'
import { Download, Database, CheckCircle, Loader2, AlertTriangle } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from '../lib/supabase'
import { getCourseById } from '../lib/courses'
import { formatDate } from '../lib/dateUtils'

export default function BackupExport({ settings }) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null) // { success, message, counts }

  const exportBackup = async () => {
    setLoading(true)
    setResult(null)

    try {
      // Fetch all data in parallel
      const [
        { data: students, error: e1 },
        { data: payments, error: e2 },
        { data: quickPayments, error: e3 },
        { data: expenses, error: e4 },
        { data: sales, error: e5 },
        { data: categories, error: e6 }
      ] = await Promise.all([
        supabase.from('students').select('*').eq('active', true).order('name'),
        supabase.from('payments').select('*, students(name)').order('payment_date', { ascending: false }),
        supabase.from('quick_payments').select('*').order('payment_date', { ascending: false }),
        supabase.from('expenses').select('*, expense_categories(name), expense_subcategories(name)').is('deleted_at', null).order('expense_date', { ascending: false }),
        supabase.from('sales').select('*').is('deleted_at', null).order('sale_date', { ascending: false }),
        supabase.from('expense_categories').select('*, expense_subcategories(id, name)').eq('active', true)
      ])

      // Check for errors
      const errors = [e1, e2, e3, e4, e5, e6].filter(Boolean)
      if (errors.length > 0) {
        console.error('Backup errors:', errors)
      }

      const wb = XLSX.utils.book_new()

      // ── Sheet 1: Alumnos ──
      const studentsData = (students || []).map(s => {
        const course = getCourseById(s.course_id)
        return {
          'Nombre': s.name || '',
          'Cédula': s.cedula || '',
          'Edad': s.age || '',
          'Teléfono': s.phone || '',
          'Email': s.email || '',
          'Es Menor': s.is_minor ? 'Sí' : 'No',
          'Representante': s.parent_name || '',
          'Cédula Rep.': s.parent_cedula || '',
          'Tel. Rep.': s.parent_phone || '',
          'Curso': course?.name || s.course_id || '',
          'Precio Curso': course?.price || '',
          'Tipo Precio': course?.priceType || '',
          'Mensualidad': s.monthly_fee || '',
          'Fecha Inscripción': s.enrollment_date ? formatDate(s.enrollment_date) : '',
          'Último Pago': s.last_payment_date ? formatDate(s.last_payment_date) : '',
          'Próximo Cobro': s.next_payment_date ? formatDate(s.next_payment_date) : '',
          'Monto Pagado': s.amount_paid || 0,
          'Saldo Pendiente': s.balance || 0,
          'Estado Pago': s.payment_status || '',
          'Pausado': s.is_paused ? 'Sí' : 'No',
          'Notas': s.notes || ''
        }
      })
      if (studentsData.length > 0) {
        const ws1 = XLSX.utils.json_to_sheet(studentsData)
        ws1['!cols'] = [
          { wch: 25 }, { wch: 12 }, { wch: 6 }, { wch: 14 }, { wch: 25 },
          { wch: 10 }, { wch: 25 }, { wch: 12 }, { wch: 14 }, { wch: 30 },
          { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
          { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 8 }, { wch: 30 }
        ]
        XLSX.utils.book_append_sheet(wb, ws1, 'Alumnos')
      }

      // ── Sheet 2: Pagos ──
      const paymentsData = (payments || []).map(p => ({
        'N° Comprobante': p.receipt_number || '',
        'Alumno': p.students?.name || '',
        'Monto': p.amount || 0,
        'Fecha': p.payment_date ? formatDate(p.payment_date) : '',
        'Método': p.payment_method || '',
        'Tipo': p.payment_type || '',
        'Banco': p.bank_name || '',
        'N° Transferencia': p.transfer_receipt || '',
        'Precio Original': p.discount_original_price || '',
        'Descuento': p.discount_amount || '',
        'Pagador': p.payer_name || '',
        'Cédula Pagador': p.payer_cedula || '',
        'Notas': p.notes || ''
      }))
      if (paymentsData.length > 0) {
        const ws2 = XLSX.utils.json_to_sheet(paymentsData)
        ws2['!cols'] = [
          { wch: 15 }, { wch: 25 }, { wch: 12 }, { wch: 14 }, { wch: 14 },
          { wch: 10 }, { wch: 20 }, { wch: 18 }, { wch: 14 }, { wch: 12 },
          { wch: 25 }, { wch: 14 }, { wch: 30 }
        ]
        XLSX.utils.book_append_sheet(wb, ws2, 'Pagos')
      }

      // ── Sheet 3: Pagos Rápidos ──
      const quickData = (quickPayments || []).map(p => ({
        'N° Comprobante': p.receipt_number || '',
        'Cliente': p.customer_name || '',
        'Clase': p.class_name || p.class_type || '',
        'Monto': p.amount || 0,
        'Fecha': p.payment_date ? formatDate(p.payment_date) : '',
        'Método': p.payment_method || '',
        'Banco': p.bank_name || '',
        'N° Transferencia': p.transfer_receipt || '',
        'Notas': p.notes || ''
      }))
      if (quickData.length > 0) {
        const ws3 = XLSX.utils.json_to_sheet(quickData)
        ws3['!cols'] = [
          { wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 12 }, { wch: 14 },
          { wch: 14 }, { wch: 20 }, { wch: 18 }, { wch: 30 }
        ]
        XLSX.utils.book_append_sheet(wb, ws3, 'Pagos Rápidos')
      }

      // ── Sheet 4: Egresos ──
      const expensesData = (expenses || []).map(e => ({
        'Fecha': e.expense_date ? formatDate(e.expense_date) : '',
        'Monto': e.amount || 0,
        'Descripción': e.description || '',
        'Categoría': e.expense_categories?.name || '',
        'Subcategoría': e.expense_subcategories?.name || '',
        'Método Pago': e.payment_method || '',
        'N° Comprobante': e.receipt_number || '',
        'Proveedor': e.provider || '',
        'Notas': e.notes || ''
      }))
      if (expensesData.length > 0) {
        const ws4 = XLSX.utils.json_to_sheet(expensesData)
        ws4['!cols'] = [
          { wch: 14 }, { wch: 12 }, { wch: 35 }, { wch: 20 }, { wch: 20 },
          { wch: 14 }, { wch: 15 }, { wch: 20 }, { wch: 30 }
        ]
        XLSX.utils.book_append_sheet(wb, ws4, 'Egresos')
      }

      // ── Sheet 5: Ventas ──
      const salesData = (sales || []).map(s => ({
        'Fecha': s.sale_date ? formatDate(s.sale_date) : '',
        'Cliente': s.customer_name || '',
        'Producto': s.product_name || '',
        'Cantidad': s.quantity || 1,
        'P. Unitario': s.unit_price || 0,
        'Total': s.total || 0,
        'Notas': s.notes || ''
      }))
      if (salesData.length > 0) {
        const ws5 = XLSX.utils.json_to_sheet(salesData)
        ws5['!cols'] = [
          { wch: 14 }, { wch: 25 }, { wch: 30 }, { wch: 10 }, { wch: 12 },
          { wch: 12 }, { wch: 30 }
        ]
        XLSX.utils.book_append_sheet(wb, ws5, 'Ventas')
      }

      // ── Sheet 6: Categorías de Egresos ──
      const catData = (categories || []).flatMap(cat =>
        (cat.expense_subcategories || [{ name: '(sin subcategoría)' }]).map(sub => ({
          'Categoría': cat.name || '',
          'Subcategoría': sub.name || '',
          'Color': cat.color || ''
        }))
      )
      if (catData.length > 0) {
        const ws6 = XLSX.utils.json_to_sheet(catData)
        ws6['!cols'] = [{ wch: 25 }, { wch: 25 }, { wch: 10 }]
        XLSX.utils.book_append_sheet(wb, ws6, 'Categorías')
      }

      // Generate file
      const dateStr = new Date().toISOString().split('T')[0]
      const schoolName = (settings?.name || 'Backup').replace(/\s+/g, '_')
      const fileName = `Backup_${schoolName}_${dateStr}.xlsx`
      XLSX.writeFile(wb, fileName)

      setResult({
        success: true,
        message: `Backup exportado: ${fileName}`,
        counts: {
          alumnos: studentsData.length,
          pagos: paymentsData.length,
          pagosRapidos: quickData.length,
          egresos: expensesData.length,
          ventas: salesData.length
        }
      })
    } catch (err) {
      console.error('Error exporting backup:', err)
      setResult({
        success: false,
        message: 'Error al exportar. Intenta de nuevo.'
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="border-t pt-4 mt-4">
      <div className="flex items-center gap-2 mb-3">
        <Database size={16} className="text-blue-600" />
        <label className="text-sm font-medium text-gray-700">
          Respaldo de Datos
        </label>
      </div>

      <p className="text-xs text-gray-500 mb-3">
        Descarga un Excel con toda la información: alumnos, pagos, egresos, ventas y categorías.
        Recomendamos hacer un respaldo periódicamente.
      </p>

      <button
        type="button"
        onClick={exportBackup}
        disabled={loading}
        className="w-full px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
      >
        {loading ? (
          <>
            <Loader2 size={18} className="animate-spin" />
            Exportando datos...
          </>
        ) : (
          <>
            <Download size={18} />
            Descargar Respaldo Completo
          </>
        )}
      </button>

      {/* Result feedback */}
      {result && (
        <div className={`mt-3 p-3 rounded-lg text-sm ${
          result.success
            ? 'bg-green-50 border border-green-200 text-green-700'
            : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <div className="flex items-center gap-2 mb-1">
            {result.success ? <CheckCircle size={16} /> : <AlertTriangle size={16} />}
            <span className="font-medium">{result.message}</span>
          </div>
          {result.counts && (
            <div className="text-xs mt-1 space-y-0.5 text-green-600">
              <p>✓ {result.counts.alumnos} alumnos • {result.counts.pagos} pagos • {result.counts.pagosRapidos} pagos rápidos</p>
              <p>✓ {result.counts.egresos} egresos • {result.counts.ventas} ventas</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
