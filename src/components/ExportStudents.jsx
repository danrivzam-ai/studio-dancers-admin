import { useState } from 'react'
import { X, Download, FileSpreadsheet, FileText } from 'lucide-react'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ALL_COURSES, getCourseById } from '../lib/courses'
import { formatDate } from '../lib/dateUtils'

export default function ExportStudents({ students, settings, onClose }) {
  const [selectedCourse, setSelectedCourse] = useState('all')
  const [exportFormat, setExportFormat] = useState('excel')

  // Filtrar estudiantes por curso
  const filteredStudents = selectedCourse === 'all'
    ? students
    : students.filter(s => s.course_id === selectedCourse)

  // Preparar datos para exportación
  const prepareData = () => {
    return filteredStudents.map(student => {
      const course = getCourseById(student.course_id)
      return {
        'Alumno': student.name,
        'Edad': student.age || '-',
        'Teléfono': student.phone || '-',
        'Email': student.email || '-',
        'Representante': student.parent_name || '-',
        'Curso': course?.name || 'Sin curso',
        'Horario': course?.schedule || '-',
        'Mensualidad': `$${student.monthly_fee || 0}`,
        'Próximo Cobro': student.next_payment_date ? formatDate(student.next_payment_date) : '-',
        'Fecha Inscripción': student.enrollment_date ? formatDate(student.enrollment_date) : '-'
      }
    })
  }

  // Exportar a Excel
  const exportToExcel = () => {
    const data = prepareData()
    const courseName = selectedCourse === 'all'
      ? 'Todos los cursos'
      : getCourseById(selectedCourse)?.name || 'Curso'

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Alumnos')

    // Ajustar anchos de columna
    const colWidths = [
      { wch: 25 }, // Alumno
      { wch: 8 },  // Edad
      { wch: 15 }, // Teléfono
      { wch: 25 }, // Email
      { wch: 25 }, // Representante
      { wch: 30 }, // Curso
      { wch: 20 }, // Horario
      { wch: 12 }, // Mensualidad
      { wch: 15 }, // Próximo Cobro
      { wch: 15 }, // Fecha Inscripción
    ]
    ws['!cols'] = colWidths

    const fileName = `Alumnos_${courseName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`
    XLSX.writeFile(wb, fileName)
  }

  // Exportar a PDF
  const exportToPDF = () => {
    const data = prepareData()
    const courseName = selectedCourse === 'all'
      ? 'Todos los cursos'
      : getCourseById(selectedCourse)?.name || 'Curso'

    const doc = new jsPDF('landscape')

    // Título
    doc.setFontSize(18)
    doc.setTextColor(102, 51, 153) // Purple
    doc.text(settings.name || 'Escuela de Danza', 14, 15)

    doc.setFontSize(12)
    doc.setTextColor(100)
    doc.text(`Listado de Alumnos - ${courseName}`, 14, 23)
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-EC')}`, 14, 30)
    doc.text(`Total: ${filteredStudents.length} alumno${filteredStudents.length !== 1 ? 's' : ''}`, 14, 37)

    // Tabla
    const tableData = data.map(row => [
      row['Alumno'],
      row['Edad'],
      row['Teléfono'],
      row['Representante'],
      row['Curso'],
      row['Mensualidad'],
      row['Próximo Cobro']
    ])

    autoTable(doc, {
      startY: 45,
      head: [['Alumno', 'Edad', 'Teléfono', 'Representante', 'Curso', 'Mensualidad', 'Próx. Cobro']],
      body: tableData,
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [102, 51, 153], // Purple
        textColor: 255,
        fontStyle: 'bold',
      },
      alternateRowStyles: {
        fillColor: [245, 240, 255],
      },
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 15, halign: 'center' },
        2: { cellWidth: 30 },
        3: { cellWidth: 45 },
        4: { cellWidth: 55 },
        5: { cellWidth: 25, halign: 'right' },
        6: { cellWidth: 30, halign: 'center' },
      },
    })

    // Footer
    const pageCount = doc.internal.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setTextColor(150)
      doc.text(
        `${settings.address || ''} | Página ${i} de ${pageCount}`,
        doc.internal.pageSize.width / 2,
        doc.internal.pageSize.height - 10,
        { align: 'center' }
      )
    }

    const fileName = `Alumnos_${courseName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`
    doc.save(fileName)
  }

  // Manejar exportación
  const handleExport = () => {
    if (exportFormat === 'excel') {
      exportToExcel()
    } else {
      exportToPDF()
    }
    onClose()
  }

  // Agrupar cursos por tipo
  const regularCourses = ALL_COURSES.filter(c => !c.id.startsWith('camp-') && !c.id.startsWith('sabados-'))
  const sabadosIntensivos = ALL_COURSES.filter(c => c.id.startsWith('sabados-'))
  const danceCamp = ALL_COURSES.filter(c => c.id.startsWith('camp-'))

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800">Exportar Listado</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Seleccionar curso */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Seleccionar curso
            </label>
            <select
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
              className="w-full px-4 py-2 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="all">Todos los cursos ({students.length} alumnos)</option>

              {regularCourses.length > 0 && (
                <optgroup label="Clases Regulares">
                  {regularCourses.map(course => {
                    const count = students.filter(s => s.course_id === course.id).length
                    return (
                      <option key={course.id} value={course.id}>
                        {course.name} ({count})
                      </option>
                    )
                  })}
                </optgroup>
              )}

              {sabadosIntensivos.length > 0 && (
                <optgroup label="Sábados Intensivos">
                  {sabadosIntensivos.map(course => {
                    const count = students.filter(s => s.course_id === course.id).length
                    return (
                      <option key={course.id} value={course.id}>
                        {course.name} ({count})
                      </option>
                    )
                  })}
                </optgroup>
              )}

              {danceCamp.length > 0 && (
                <optgroup label="Dance Camp 2026">
                  {danceCamp.map(course => {
                    const count = students.filter(s => s.course_id === course.id).length
                    return (
                      <option key={course.id} value={course.id}>
                        {course.name} ({count})
                      </option>
                    )
                  })}
                </optgroup>
              )}
            </select>
          </div>

          {/* Seleccionar formato */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Formato de exportación
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setExportFormat('excel')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  exportFormat === 'excel'
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileSpreadsheet size={32} />
                <span className="font-medium">Excel</span>
                <span className="text-xs text-gray-500">.xlsx</span>
              </button>
              <button
                type="button"
                onClick={() => setExportFormat('pdf')}
                className={`p-4 rounded-xl border-2 flex flex-col items-center gap-2 transition-all ${
                  exportFormat === 'pdf'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <FileText size={32} />
                <span className="font-medium">PDF</span>
                <span className="text-xs text-gray-500">.pdf</span>
              </button>
            </div>
          </div>

          {/* Preview */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-sm text-gray-600 mb-2">Vista previa:</p>
            <div className="text-sm">
              <p className="font-medium text-gray-800">
                {filteredStudents.length} alumno{filteredStudents.length !== 1 ? 's' : ''} a exportar
              </p>
              <p className="text-gray-500">
                Curso: {selectedCourse === 'all' ? 'Todos' : getCourseById(selectedCourse)?.name}
              </p>
            </div>
          </div>

          {/* Columnas incluidas */}
          <div className="text-xs text-gray-500">
            <p className="font-medium mb-1">Columnas incluidas:</p>
            <p>Alumno, Edad, Teléfono, Email, Representante, Curso, Horario, Mensualidad, Próximo Cobro, Fecha Inscripción</p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleExport}
              disabled={filteredStudents.length === 0}
              className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <Download size={20} />
              Exportar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
