import { useState, useEffect } from 'react'
import {
  Plus, Users, Calendar, DollarSign, AlertCircle, Trash2, Edit2, X, Check,
  Search, ShoppingBag, Tag, Settings, CreditCard, Download, Package, Zap, ChevronDown, ChevronUp, History, Wallet, Pause, Play, RefreshCw, Eye, LogOut, TrendingDown, ArrowLeftRight, Palette, BarChart3, ScrollText
} from 'lucide-react'
import { useStudents } from './hooks/useStudents'
import { useSales } from './hooks/useSales'
import { useSchoolSettings } from './hooks/useSchoolSettings'
import { usePayments } from './hooks/usePayments'
import { useItems } from './hooks/useItems'
import { useDailyIncome } from './hooks/useDailyIncome'
import { useCashRegister } from './hooks/useCashRegister'
import { useExpenses } from './hooks/useExpenses'
import { useAuth } from './hooks/useAuth'
import { COURSES, SABADOS_INTENSIVOS, DANCE_CAMP, getSuggestedCourses } from './lib/courses'
import { formatDate, getDaysUntilDue, getPaymentStatus, getCycleInfo } from './lib/dateUtils'
import PaymentModal from './components/PaymentModal'
import ReceiptGenerator from './components/ReceiptGenerator'
import SettingsModal from './components/SettingsModal'
import ExportStudents from './components/ExportStudents'
import ManageItems from './components/ManageItems'
import StudentForm from './components/StudentForm'
import QuickPayment from './components/QuickPayment'
import PaymentHistory from './components/PaymentHistory'
import StudentDetail from './components/StudentDetail'
import DeleteConfirmModal from './components/DeleteConfirmModal'
import PinPromptModal from './components/PinPromptModal'
import CashRegister from './components/CashRegister'
import ExpenseManager from './components/ExpenseManager'
import CashMovements from './components/CashMovements'
import ManageCategories from './components/ManageCategories'
import DailyReport from './components/DailyReport'
import AuditLog from './components/AuditLog'
import LoginPage from './components/Auth/LoginPage'
import './App.css'

export default function App() {
  const { user, userRole, loading: authLoading, signOut, isAuthenticated, isAdmin, can } = useAuth()
  const { students, loading: studentsLoading, fetchStudents, createStudent, updateStudent, deleteStudent, registerPayment, pauseStudent, unpauseStudent, recalculatePaymentDates } = useStudents()
  const { sales, loading: salesLoading, createSale, deleteSale, totalSalesIncome } = useSales()
  const { settings, updateSettings } = useSchoolSettings()
  const { generateReceiptNumber } = usePayments()
  const { courses: allCourses, products: allProducts, saveCourse, deleteCourse, saveProduct, deleteProduct, getCourseById, getProductById } = useItems()
  const { todayIncome, todayPaymentsCount, refreshIncome } = useDailyIncome()
  const { isOpen: isCashOpen, notOpened: isCashNotOpened, refresh: refreshCash, todayRegister } = useCashRegister()
  const { todayExpensesTotal, refreshExpenses } = useExpenses()

  const [activeTab, setActiveTab] = useState('students')
  const [showForm, setShowForm] = useState(false)
  const [showSaleForm, setShowSaleForm] = useState(false)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showManageItems, setShowManageItems] = useState(false)
  const [showQuickPayment, setShowQuickPayment] = useState(false)
  const [showPaymentHistory, setShowPaymentHistory] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [selectedStudent, setSelectedStudent] = useState(null)
  const [lastPayment, setLastPayment] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterCourse, setFilterCourse] = useState('all')
  const [filterPayment, setFilterPayment] = useState('all')
  const [showStudentList, setShowStudentList] = useState(true) // Para lista desplegable
  const [showUpcomingPayments, setShowUpcomingPayments] = useState(true) // Para alertas de cobros
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: '', id: null, name: '' })
  const [showPinPrompt, setShowPinPrompt] = useState(false)
  const [pendingSettingsAccess, setPendingSettingsAccess] = useState(false)
  const [showCashRegister, setShowCashRegister] = useState(false)
  const [showExpenses, setShowExpenses] = useState(false)
  const [showCashMovements, setShowCashMovements] = useState(false)
  const [showManageCategories, setShowManageCategories] = useState(false)
  const [showAuditLog, setShowAuditLog] = useState(false)
  const [showStudentDetail, setShowStudentDetail] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    phone: '',
    email: '',
    parentName: '',
    parentPhone: '',
    // Pagador (si es diferente al representante)
    hasDifferentPayer: false,
    payerName: '',
    payerPhone: '',
    payerCedula: '',
    courseId: '',
    notes: ''
  })

  const [saleForm, setSaleForm] = useState({
    customerName: '',
    productId: '',
    quantity: 1,
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  // Filtrar estudiantes (incluye búsqueda por cédula)
  const filteredStudents = students.filter(student => {
    const course = getCourseById(student.course_id)
    const searchLower = searchTerm.toLowerCase()
    const matchesSearch = student.name.toLowerCase().includes(searchLower) ||
                         student.parent_name?.toLowerCase().includes(searchLower) ||
                         student.cedula?.includes(searchTerm) ||
                         student.parent_cedula?.includes(searchTerm) ||
                         student.payer_cedula?.includes(searchTerm)
    const matchesCourse = filterCourse === 'all' || student.course_id === filterCourse
    const daysUntil = getDaysUntilDue(student.next_payment_date)
    const matchesPayment = filterPayment === 'all' ||
                          (filterPayment === 'overdue' && daysUntil < 0) ||
                          (filterPayment === 'upcoming' && daysUntil >= 0 && daysUntil <= 5)
    return matchesSearch && matchesCourse && matchesPayment
  })

  // Estadísticas
  const recurringStudents = students.filter(s => {
    const course = getCourseById(s.course_id)
    return course?.priceType === 'mes' || course?.priceType === 'paquete'
  })

  const upcomingPayments = recurringStudents
    .filter(s => s.next_payment_date && s.payment_status !== 'pending' && getDaysUntilDue(s.next_payment_date) <= 5)
    .sort((a, b) => getDaysUntilDue(a.next_payment_date) - getDaysUntilDue(b.next_payment_date))

  // Alumnos con pago vencido (días negativos)
  const overduePayments = recurringStudents.filter(s => s.next_payment_date && s.payment_status !== 'pending' && getDaysUntilDue(s.next_payment_date) < 0)

  const totalMonthlyIncome = recurringStudents.reduce((sum, s) => sum + parseFloat(s.monthly_fee || 0), 0)
  const campStudents = students.filter(s => s.course_id?.startsWith('camp-'))
  const sabadosStudents = students.filter(s => s.course_id?.startsWith('sabados-'))
  const regularStudents = students.filter(s => !s.course_id?.startsWith('camp-') && !s.course_id?.startsWith('sabados-'))

  // Manejar cambio de curso
  const handleCourseChange = (courseId) => {
    setFormData({
      ...formData,
      courseId
    })
  }

  // Crear/Editar estudiante
  const handleSubmit = async (e) => {
    e.preventDefault()

    let result
    if (editingStudent) {
      result = await updateStudent(editingStudent.id, formData)
    } else {
      result = await createStudent(formData)
    }

    if (result.success) {
      resetForm()
    } else {
      alert('Error: ' + result.error)
    }
  }

  // Crear venta
  const handleSaleSubmit = async (e) => {
    e.preventDefault()
    const product = getProductById(saleForm.productId)

    const result = await createSale({
      customerName: saleForm.customerName,
      productId: saleForm.productId,
      productName: product.name,
      quantity: saleForm.quantity,
      unitPrice: product.price,
      total: product.price * saleForm.quantity,
      date: saleForm.date,
      notes: saleForm.notes
    })

    if (result.success) {
      setSaleForm({
        customerName: '',
        productId: '',
        quantity: 1,
        date: new Date().toISOString().split('T')[0],
        notes: ''
      })
      setShowSaleForm(false)
    } else {
      alert('Error: ' + result.error)
    }
  }

  // Registrar pago
  const handlePaymentComplete = async (studentId, paymentData) => {
    const result = await registerPayment(studentId, paymentData)

    if (result.success) {
      // Mostrar comprobante
      const student = students.find(s => s.id === studentId)
      setSelectedStudent({
        ...student,
        next_payment_date: result.data.next_payment_date || student.next_payment_date
      })
      setLastPayment(result.data)
      setShowPaymentModal(false)
      setShowReceipt(true)
      // Actualizar ingresos del día
      refreshIncome()
    } else {
      alert('Error: ' + result.error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      age: '',
      phone: '',
      email: '',
      parentName: '',
      parentPhone: '',
      hasDifferentPayer: false,
      payerName: '',
      payerPhone: '',
      payerCedula: '',
      courseId: '',
      notes: ''
    })
    setShowForm(false)
    setEditingStudent(null)
  }

  const handleEdit = (student) => {
    setEditingStudent(student)
    setShowForm(true)
  }

  // Handler para pago rápido (clase diaria)
  const handleQuickPayment = async (paymentData) => {
    try {
      // Guardar en la tabla quick_payments
      const { supabase } = await import('./lib/supabase')
      const { error } = await supabase
        .from('quick_payments')
        .insert([{
          customer_name: paymentData.customerName,
          customer_cedula: paymentData.customerCedula || null,
          customer_phone: paymentData.customerPhone || null,
          class_type: paymentData.classType,
          class_name: paymentData.className,
          amount: paymentData.amount,
          receipt_number: paymentData.receiptNumber,
          payment_method: paymentData.paymentMethod,
          bank_name: paymentData.bankName,
          transfer_receipt: paymentData.transferReceipt,
          notes: paymentData.notes,
          payment_date: paymentData.date
        }])

      if (error) throw error

      // Mostrar comprobante visual (ReceiptGenerator)
      setSelectedStudent({
        name: paymentData.customerName,
        cedula: paymentData.customerCedula || null,
        phone: paymentData.customerPhone || null,
        course_id: paymentData.classType
      })
      setLastPayment({
        amount: paymentData.amount,
        receipt_number: paymentData.receiptNumber,
        receiptNumber: paymentData.receiptNumber,
        payment_date: paymentData.date,
        payment_method: paymentData.paymentMethod,
        bank_name: paymentData.bankName,
        transfer_receipt: paymentData.transferReceipt,
        notes: paymentData.notes,
        isQuickPayment: true,
        className: paymentData.className
      })
      setShowQuickPayment(false)
      setShowReceipt(true)

      // Actualizar ingresos del día
      refreshIncome()
    } catch (err) {
      console.error('Error en pago rápido:', err)
      alert('Error: ' + err.message)
    }
  }

  // Handler para crear/actualizar estudiante desde StudentForm
  const handleStudentFormSubmit = async (formData) => {
    let result
    if (editingStudent) {
      result = await updateStudent(editingStudent.id, formData)
    } else {
      result = await createStudent(formData)
    }

    if (result.success) {
      setShowForm(false)
      setEditingStudent(null)
    } else {
      alert('Error: ' + result.error)
    }
  }

  // Abrir modal de confirmación para eliminar alumno
  const handleDelete = (student) => {
    setDeleteModal({
      isOpen: true,
      type: 'alumno',
      id: student.id,
      name: student.name
    })
  }

  // Abrir modal de confirmación para eliminar venta
  const handleDeleteSale = (sale) => {
    setDeleteModal({
      isOpen: true,
      type: 'venta',
      id: sale.id,
      name: sale.product_name + ' - ' + sale.customer_name
    })
  }

  // Ejecutar eliminación después de confirmar PIN
  const executeDelete = async () => {
    const { type, id } = deleteModal
    let result

    if (type === 'alumno') {
      result = await deleteStudent(id)
    } else if (type === 'venta') {
      result = await deleteSale(id)
    }

    if (!result.success) {
      throw new Error(result.error)
    }
  }

  // Handler para pausar/despausar alumno
  const handlePauseStudent = async (student) => {
    if (student.is_paused) {
      const result = await unpauseStudent(student.id)
      if (!result.success) {
        alert('Error: ' + result.error)
      }
    } else {
      const course = getCourseById(student.course_id)
      if (!course || (course.priceType !== 'mes' && course.priceType !== 'paquete')) {
        alert('Solo se pueden pausar alumnos con clases mensuales o por paquete')
        return
      }
      if (confirm(`¿Pausar 1 clase para ${student.name}?\nSe extenderá la fecha de pago.`)) {
        const result = await pauseStudent(student.id)
        if (result.success) {
          alert(`Pausa activada para ${student.name}.\nSe agregaron ${result.daysAdded} días al ciclo.`)
        } else {
          alert('Error: ' + result.error)
        }
      }
    }
  }

  // Recalcular fechas de pago de todos los alumnos
  const handleRecalculateDates = async () => {
    if (!confirm('¿Recalcular las fechas de pago de todos los alumnos?\nEsto corregirá los ciclos según la nueva lógica (8 clases MTJ, 4 sábados).')) return
    try {
      const results = await recalculatePaymentDates()
      if (results.length === 0) {
        alert('Todas las fechas ya están correctas. No se requieren cambios.')
      } else {
        const summary = results.map(r =>
          `${r.name}: ${r.oldDate} → ${r.newDate}${r.error ? ' (ERROR: ' + r.error + ')' : ' ✓'}`
        ).join('\n')
        alert(`Se actualizaron ${results.length} alumno(s):\n\n${summary}`)
      }
    } catch (err) {
      alert('Error: ' + err.message)
    }
  }

  const openPaymentModal = (student) => {
    setSelectedStudent(student)
    setShowPaymentModal(true)
  }

  // Handler para mostrar comprobante desde historial
  const handleShowReceiptFromHistory = (data) => {
    setSelectedStudent(data.student)
    setLastPayment({
      ...data.payment,
      isQuickPayment: data.isQuickPayment,
      className: data.className,
      isReprint: data.isReprint || false
    })
    setShowPaymentHistory(false)
    setShowReceipt(true)
  }

  const loading = studentsLoading || salesLoading

  // Mostrar loading mientras verifica autenticación
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #7e22ce 0%, #6b21a8 50%, #be185d 100%)'
      }}>
        <div className="text-center">
          {/* Spinner animado */}
          <div className="mb-6 flex justify-center">
            <div className="w-16 h-16 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
          </div>

          {/* Texto */}
          <p className="text-white/80 text-sm mb-6">Cargando...</p>

          {/* Barra de carga */}
          <div className="loading-bar-container">
            <div className="loading-bar"></div>
          </div>
        </div>
      </div>
    )
  }

  // Si no está autenticado, mostrar página de login
  if (!isAuthenticated) {
    return <LoginPage onLogin={(user) => console.log('Logged in:', user.email)} />
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #faf5ff 0%, #fdf2f8 50%, #fff7ed 100%)'
      }}>
        <div className="text-center">
          {/* Spinner animado */}
          <div className="mb-5 flex justify-center">
            <div className="w-14 h-14 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin"></div>
          </div>

          {/* Texto */}
          <h2 className="text-purple-800 text-lg font-semibold mb-1">Cargando datos</h2>
          <p className="text-purple-400 text-sm">Un momento por favor...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {/* Logo Centrado - Arriba */}
        <div className="text-center mb-3">
          <img
            src="/logo2.png"
            alt="Studio Dancers"
            className="object-contain mx-auto w-[120px] sm:w-[160px] md:w-[180px]"
          />
        </div>

        {/* Header con controles - Blanco */}
        <div className="bg-white rounded-2xl shadow-lg mb-4 sm:mb-6 p-3 sm:p-4">
          {/* Fila 1: Caja, Nombre, Config */}
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            {/* Izquierda: Estado de caja */}
            <button
              onClick={() => setShowCashRegister(true)}
              className={`px-3 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-all ${
                isCashOpen
                  ? 'bg-green-100 text-green-700 hover:bg-green-200'
                  : isCashNotOpened
                    ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200 animate-pulse'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isCashOpen ? 'Caja abierta' : isCashNotOpened ? 'Caja sin abrir' : 'Caja cerrada'}
            >
              <Wallet size={20} />
              <span className={`w-2 h-2 rounded-full ${
                isCashOpen ? 'bg-green-500' : isCashNotOpened ? 'bg-yellow-500' : 'bg-gray-400'
              }`} />
              <span className="hidden sm:inline">{isCashOpen ? 'Caja Abierta' : isCashNotOpened ? 'Sin Abrir' : 'Cerrada'}</span>
            </button>

            {/* Centro: Nombre */}
            <div className="text-center flex-1 min-w-0 px-2">
              <h1 className="text-base sm:text-xl md:text-2xl font-bold text-purple-800 truncate">{settings.name}</h1>
              <p className="text-gray-400 text-xs hidden md:block truncate">{settings.address}</p>
            </div>

            {/* Derecha: Configuración y Logout */}
            <div className="flex items-center gap-1">
              {can('canEditSettings') && (
                <button
                  onClick={() => {
                    if (settings.security_pin) {
                      setPendingSettingsAccess(true)
                      setShowPinPrompt(true)
                    } else {
                      setShowSettings(true)
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  title="Configuración"
                >
                  <Settings size={20} />
                </button>
              )}
              <button
                onClick={async () => {
                  if (confirm('¿Cerrar sesión?')) {
                    await signOut()
                  }
                }}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                title={`Cerrar sesión (${user?.email})`}
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>

          {/* Fila 2: Botones de acciones */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100">
            {/* Grupo izquierdo: Acciones principales */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setShowForm(true)}
                className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-3 py-2 rounded-xl font-medium transition-colors shadow-sm text-sm"
              >
                <Plus size={18} />
                <span className="hidden sm:inline">Nuevo Alumno</span>
              </button>
              <button
                onClick={() => setShowSaleForm(true)}
                className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded-xl font-medium transition-colors shadow-sm text-sm"
              >
                <ShoppingBag size={18} />
                <span className="hidden sm:inline">Venta</span>
              </button>
              <button
                onClick={() => setShowQuickPayment(true)}
                className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3 py-2 rounded-xl font-medium transition-colors shadow-sm text-sm"
                title="Pago rapido (clase diaria)"
              >
                <Zap size={18} />
                <span className="hidden sm:inline">Pago Rapido</span>
              </button>
              <button
                onClick={() => setShowExpenses(true)}
                className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl font-medium transition-colors shadow-sm text-sm"
                title="Registrar egreso"
              >
                <TrendingDown size={18} />
                <span className="hidden sm:inline">Egreso</span>
              </button>
              <button
                onClick={() => setShowCashMovements(true)}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-xl font-medium transition-colors shadow-sm text-sm"
                title="Movimiento de caja"
              >
                <ArrowLeftRight size={18} />
                <span className="hidden sm:inline">Movimiento</span>
              </button>
            </div>

            {/* Grupo derecho: Herramientas */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setShowPaymentHistory(true)}
                className="flex items-center justify-center bg-purple-100 hover:bg-purple-200 text-purple-700 w-10 h-10 rounded-xl transition-colors"
                title="Historial de pagos"
              >
                <History size={18} />
              </button>
              {can('canExport') && (
                <button
                  onClick={() => setShowExport(true)}
                  className="flex items-center justify-center bg-purple-100 hover:bg-purple-200 text-purple-700 w-10 h-10 rounded-xl transition-colors"
                  title="Exportar listado"
                >
                  <Download size={18} />
                </button>
              )}
              {can('canEditSettings') && (
                <button
                  onClick={handleRecalculateDates}
                  className="flex items-center justify-center bg-purple-100 hover:bg-purple-200 text-purple-700 w-10 h-10 rounded-xl transition-colors"
                  title="Recalcular fechas"
                >
                  <RefreshCw size={18} />
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setShowAuditLog(true)}
                  className="flex items-center justify-center bg-purple-100 hover:bg-purple-200 text-purple-700 w-10 h-10 rounded-xl transition-colors"
                  title="Log de auditoría"
                >
                  <ScrollText size={18} />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 sm:gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('students')}
            className={`px-3 sm:px-5 py-2.5 rounded-xl font-medium transition-colors whitespace-nowrap text-sm ${activeTab === 'students' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'}`}
          >
            <Users size={16} className="inline mr-1.5" />
            <span className="hidden sm:inline">Alumnos</span> ({students.length})
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`px-3 sm:px-5 py-2.5 rounded-xl font-medium transition-colors whitespace-nowrap text-sm ${activeTab === 'sales' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'}`}
          >
            <ShoppingBag size={16} className="inline mr-1.5" />
            <span className="hidden sm:inline">Ventas</span> ({sales.length})
          </button>
          <button
            onClick={() => setActiveTab('courses')}
            className={`px-3 sm:px-5 py-2.5 rounded-xl font-medium transition-colors whitespace-nowrap text-sm ${activeTab === 'courses' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'}`}
          >
            <Calendar size={16} className="inline mr-1.5" />
            Cursos
          </button>
          <button
            onClick={() => setActiveTab('expenses')}
            className={`px-3 sm:px-5 py-2.5 rounded-xl font-medium transition-colors whitespace-nowrap text-sm ${activeTab === 'expenses' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'}`}
          >
            <TrendingDown size={16} className="inline mr-1.5" />
            Egresos
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`px-3 sm:px-5 py-2.5 rounded-xl font-medium transition-colors whitespace-nowrap text-sm ${activeTab === 'report' ? 'bg-purple-600 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'}`}
          >
            <BarChart3 size={16} className="inline mr-1.5" />
            Reporte
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div className="bg-white rounded-xl shadow p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-purple-100 p-2 sm:p-3 rounded-lg shrink-0">
                <Users className="text-purple-600" size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-gray-800">{regularStudents.length}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">Regulares</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-orange-100 p-2 sm:p-3 rounded-lg shrink-0">
                <Calendar className="text-orange-600" size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-gray-800">{sabadosStudents.length}</p>
                <p className="text-xs sm:text-sm text-gray-500 truncate">Sab. Intensivos</p>
              </div>
            </div>
          </div>

          <div
            onClick={() => setShowCashRegister(true)}
            className="bg-white rounded-xl shadow p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:scale-105 transition-all border-2 border-transparent hover:border-green-300"
            title="Ver cuadre de caja"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-green-100 p-2 sm:p-3 rounded-lg shrink-0">
                <DollarSign className="text-green-600" size={20} />
              </div>
              <div className="min-w-0">
                <p className="text-xl sm:text-2xl font-bold text-green-600 truncate">${todayIncome.toFixed(2)}</p>
                <p className="text-xs sm:text-sm text-gray-500">Ingresos hoy</p>
              </div>
            </div>
          </div>

          <div className={`bg-white rounded-xl shadow p-3 sm:p-4 ${overduePayments.length > 0 ? 'animate-pulse-urgent border-2 border-red-300' : ''}`}>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-2 sm:p-3 rounded-lg shrink-0 ${overduePayments.length > 0 ? 'bg-red-100' : 'bg-yellow-100'}`}>
                <AlertCircle className={overduePayments.length > 0 ? 'text-red-600' : 'text-yellow-600'} size={20} />
              </div>
              <div className="min-w-0">
                {overduePayments.length > 0 ? (
                  <>
                    <p className="text-xl sm:text-2xl font-bold text-red-600">{overduePayments.length}</p>
                    <p className="text-xs sm:text-sm text-red-500 font-medium">Por renovar</p>
                  </>
                ) : (
                  <>
                    <p className="text-xl sm:text-2xl font-bold text-gray-800">{upcomingPayments.length}</p>
                    <p className="text-xs sm:text-sm text-gray-500">Proximos</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Payments Alert */}
        {upcomingPayments.length > 0 && activeTab === 'students' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl mb-6 overflow-hidden">
            <button
              onClick={() => setShowUpcomingPayments(!showUpcomingPayments)}
              className="w-full p-4 flex items-center justify-between hover:bg-yellow-100/50 transition-colors"
            >
              <h3 className="font-semibold text-yellow-800 flex items-center gap-2">
                <AlertCircle size={18} />
                Cobros próximos o pendientes ({upcomingPayments.length})
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-yellow-600">
                  {showUpcomingPayments ? 'Ocultar' : 'Mostrar'}
                </span>
                {showUpcomingPayments ? <ChevronUp size={18} className="text-yellow-600" /> : <ChevronDown size={18} className="text-yellow-600" />}
              </div>
            </button>
            {showUpcomingPayments && (
              <div className="px-4 pb-4 space-y-2">
                {upcomingPayments.slice(0, 10).map(student => {
                  const course = getCourseById(student.course_id)
                  const paymentStatus = getPaymentStatus(student, course)
                  return (
                    <div key={student.id} className="flex items-center justify-between bg-white rounded-lg p-3">
                      <div>
                        <p className="font-medium text-gray-800">{student.name}</p>
                        <p className="text-sm text-gray-500">{course?.name || 'Sin curso'}</p>
                        <p className="text-xs text-gray-400">Cobro: {formatDate(student.next_payment_date)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${paymentStatus.color}`}>
                            {paymentStatus.label}
                          </span>
                          <p className="text-sm text-gray-600 mt-1">${student.monthly_fee}</p>
                        </div>
                        <button
                          onClick={() => openPaymentModal(student)}
                          className="p-2 bg-green-100 text-green-700 hover:bg-green-200 rounded-lg transition-colors"
                          title="Registrar pago"
                        >
                          <CreditCard size={18} />
                        </button>
                      </div>
                    </div>
                  )
                })}
                {upcomingPayments.length > 10 && (
                  <p className="text-xs text-yellow-600 text-center pt-2">
                    ... y {upcomingPayments.length - 10} más
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Students Tab */}
        {activeTab === 'students' && (
          <>
            {/* Search and Filters */}
            <div className="bg-white rounded-xl shadow p-4 mb-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o cédula..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <select
                  value={filterCourse}
                  onChange={(e) => setFilterCourse(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Todos los cursos</option>
                  <optgroup label="Clases Regulares">
                    {COURSES.map(course => (
                      <option key={course.id} value={course.id}>{course.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Sábados Intensivos ($40 x 4 clases)">
                    {SABADOS_INTENSIVOS.map(course => (
                      <option key={course.id} value={course.id}>{course.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label="Dance Camp 2026">
                    {DANCE_CAMP.map(course => (
                      <option key={course.id} value={course.id}>{course.name}</option>
                    ))}
                  </optgroup>
                </select>
                <select
                  value={filterPayment}
                  onChange={(e) => setFilterPayment(e.target.value)}
                  className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500"
                >
                  <option value="all">Todos los pagos</option>
                  <option value="overdue">Por renovar</option>
                  <option value="upcoming">Próximos (5 días)</option>
                </select>
              </div>
            </div>

            {/* Students List */}
            <div className="bg-white rounded-xl shadow overflow-hidden">
              <button
                onClick={() => setShowStudentList(!showStudentList)}
                className="w-full p-4 border-b bg-gray-50 flex items-center justify-between hover:bg-gray-100 transition-colors"
              >
                <h2 className="font-semibold text-gray-800">Lista de Alumnos ({filteredStudents.length})</h2>
                {showStudentList ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {filteredStudents.length === 0 ? (
                <div className="p-12 text-center text-gray-500">
                  <Users size={48} className="mx-auto mb-4 opacity-50" />
                  <p>No hay alumnos registrados</p>
                  <button
                    onClick={() => setShowForm(true)}
                    className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
                  >
                    Agregar primer alumno
                  </button>
                </div>
              ) : showStudentList && (
                <div className="divide-y max-h-[600px] overflow-y-auto">
                  {filteredStudents.map(student => {
                    const course = getCourseById(student.course_id)
                    const paymentStatus = getPaymentStatus(student, course)
                    const isCamp = student.course_id?.startsWith('camp-')

                    return (
                      <div key={student.id} className={`p-4 hover:bg-gray-50 transition-colors ${isCamp ? 'border-l-4 border-pink-400' : ''}`}>
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-start gap-3">
                              <div className={`${isCamp ? 'bg-pink-100 text-pink-700' : 'bg-purple-100 text-purple-700'} w-10 h-10 rounded-full flex items-center justify-center font-bold`}>
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="font-semibold text-gray-800">{student.name}</h3>
                                <p className="text-sm text-gray-500">
                                  {student.age} años • {course?.name || 'Sin curso asignado'}
                                </p>
                                {student.parent_name && (
                                  <p className="text-sm text-gray-400">👤 {student.parent_name}</p>
                                )}
                                {student.phone && (
                                  <p className="text-sm text-gray-400">📱 {student.phone}</p>
                                )}
                                {(course?.priceType === 'mes' || course?.priceType === 'paquete') && student.last_payment_date && (() => {
                                  const cycleClasses = course?.classesPerCycle || course?.classesPerPackage || null
                                  const cycleInfo = getCycleInfo(student.last_payment_date, student.next_payment_date, course?.classDays, cycleClasses)
                                  if (!cycleInfo) return null
                                  const progress = (cycleInfo.classesPassed / cycleInfo.totalClasses) * 100
                                  return (
                                    <div className="mt-1.5 max-w-[220px]">
                                      <div className="flex items-center justify-between text-[10px] text-gray-400 mb-0.5">
                                        <span>{cycleInfo.daysLabel} • {cycleInfo.cycleStart}</span>
                                        <span>{cycleInfo.cycleEnd}</span>
                                      </div>
                                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-purple-500 rounded-full transition-all"
                                          style={{ width: `${Math.min(progress, 100)}%` }}
                                        />
                                      </div>
                                      <p className="text-[10px] text-gray-400 mt-0.5">
                                        Clase {cycleInfo.classesPassed}/{cycleInfo.totalClasses}
                                        {student.next_payment_date && ` • Cobro: ${formatDate(student.next_payment_date)}`}
                                      </p>
                                    </div>
                                  )
                                })()}
                                {student.is_paused && (
                                  <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                                    ⏸ Pausado
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <p className="font-semibold text-gray-800">
                                ${student.monthly_fee}
                                <span className="text-sm font-normal text-gray-500">
                                  /{course?.priceType === 'mes' ? (course?.classesPerCycle ? `${course.classesPerCycle} clases` : 'mes') : course?.priceType === 'clase' ? 'clase' : course?.priceType === 'paquete' ? `${course?.classesPerPackage || 4} clases` : 'programa'}
                                </span>
                              </p>
                              <span className={`inline-block mt-1 px-3 py-1 rounded-full text-xs font-medium ${paymentStatus.color}`}>
                                {paymentStatus.label}
                              </span>
                            </div>

                            <div className="flex gap-1">
                              <button
                                onClick={() => setShowStudentDetail(student)}
                                className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                title="Ver detalle del alumno"
                              >
                                <Eye size={18} />
                              </button>
                              <button
                                onClick={() => openPaymentModal(student)}
                                className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Registrar pago"
                              >
                                <CreditCard size={18} />
                              </button>
                              {(course?.priceType === 'mes' || course?.priceType === 'paquete') && student.next_payment_date && (
                                <button
                                  onClick={() => handlePauseStudent(student)}
                                  className={`p-2 rounded-lg transition-colors ${
                                    student.is_paused
                                      ? 'text-blue-600 bg-blue-50 hover:bg-blue-100'
                                      : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                                  }`}
                                  title={student.is_paused ? 'Reactivar clase' : 'Pausar 1 clase'}
                                >
                                  {student.is_paused ? <Play size={18} /> : <Pause size={18} />}
                                </button>
                              )}
                              <button
                                onClick={() => handleEdit(student)}
                                className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button
                                onClick={() => handleDelete(student)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </>
        )}

        {/* Sales Tab */}
        {activeTab === 'sales' && (
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <div>
                <h2 className="font-semibold text-gray-800">Ventas de Artículos</h2>
                <p className="text-sm text-gray-500">Total vendido: ${totalSalesIncome}</p>
              </div>
            </div>

            {/* Products Available */}
            <div className="p-4 border-b bg-green-50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-green-800 flex items-center gap-2">
                  <Tag size={18} />
                  Artículos Disponibles
                </h3>
                <button
                  onClick={() => setShowManageItems(true)}
                  className="text-sm text-green-600 hover:text-green-700 flex items-center gap-1"
                >
                  <Package size={14} />
                  Gestionar
                </button>
              </div>
              <div className="flex gap-4 flex-wrap">
                {allProducts.map(product => (
                  <div key={product.id} className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="font-medium text-gray-800">{product.name}</p>
                    <p className="text-green-600 font-bold">${product.price}</p>
                  </div>
                ))}
              </div>
            </div>

            {sales.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <ShoppingBag size={48} className="mx-auto mb-4 opacity-50" />
                <p>No hay ventas registradas</p>
                <button
                  onClick={() => setShowSaleForm(true)}
                  className="mt-4 text-green-600 hover:text-green-700 font-medium"
                >
                  Registrar primera venta
                </button>
              </div>
            ) : (
              <div className="divide-y">
                {sales.map(sale => (
                  <div key={sale.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-800">{sale.product_name} x{sale.quantity}</p>
                        <p className="text-sm text-gray-500">Cliente: {sale.customer_name}</p>
                        <p className="text-xs text-gray-400">{formatDate(sale.sale_date)}</p>
                      </div>
                      <div className="flex items-center gap-4">
                        <p className="font-bold text-green-600">${sale.total}</p>
                        <button
                          onClick={() => handleDeleteSale(sale)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <div className="space-y-6">
            {/* Header con botón de gestionar */}
            <div className="flex justify-end">
              <button
                onClick={() => setShowManageItems(true)}
                className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
              >
                <Package size={18} />
                Gestionar Cursos y Productos
              </button>
            </div>

            {/* Regular Classes */}
            <div className="bg-white rounded-xl shadow p-6">
              <h2 className="font-semibold text-gray-800 mb-4">📚 Clases Regulares</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {COURSES.map(course => {
                  const enrolledCount = students.filter(s => s.course_id === course.id).length
                  return (
                    <div key={course.id} className="border rounded-lg p-4 hover:border-purple-300 transition-colors">
                      <h3 className="font-medium text-purple-700">{course.name}</h3>
                      <p className="text-sm text-gray-500">{course.schedule}</p>
                      <p className="text-lg font-bold text-green-600 mt-2">
                        ${course.price}/{course.priceType === 'mes' ? (course.classesPerCycle ? `${course.classesPerCycle} clases` : 'mes') : course.priceType === 'clase' ? 'clase' : course.priceType}
                      </p>
                      <p className="text-sm font-medium text-gray-700 mt-2">
                        {enrolledCount} alumno{enrolledCount !== 1 ? 's' : ''} inscrito{enrolledCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Sábados Intensivos */}
            <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl shadow p-6">
              <h2 className="font-semibold text-orange-800 mb-4">🌟 Sábados Intensivos - $40 por paquete de 4 clases</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {SABADOS_INTENSIVOS.map(course => {
                  const enrolledCount = students.filter(s => s.course_id === course.id).length
                  return (
                    <div key={course.id} className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow">
                      <h3 className="font-medium text-orange-700">{course.name}</h3>
                      <p className="text-sm text-gray-500">Edades: {course.ageMin} - {course.ageMax} años</p>
                      <p className="text-sm text-gray-500">{course.schedule}</p>
                      <p className="text-lg font-bold text-green-600 mt-2">${course.price}</p>
                      <p className="text-xs text-orange-600">Paquete: 4 clases (se renueva al completar)</p>
                      <p className="text-sm font-medium text-gray-700 mt-2">
                        {enrolledCount} inscrito{enrolledCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Dance Camp */}
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-xl shadow p-6">
              <h2 className="font-semibold text-pink-800 mb-4">🎪 Dance Camp 2026 - Programa Completo $99</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {DANCE_CAMP.map(course => {
                  const enrolledCount = students.filter(s => s.course_id === course.id).length
                  return (
                    <div key={course.id} className="bg-white rounded-lg p-4 hover:shadow-md transition-shadow">
                      <h3 className="font-medium text-pink-700">{course.name.replace('Dance Camp 2026 - ', '')}</h3>
                      <p className="text-sm text-gray-500">Edades: {course.ageMin} - {course.ageMax} años</p>
                      <p className="text-sm text-gray-500">{course.schedule}</p>
                      <p className="text-sm font-medium text-gray-700 mt-2">
                        {enrolledCount} inscrito{enrolledCount !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        {/* Expenses Tab */}
        {activeTab === 'expenses' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Egresos del día</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowManageCategories(true)}
                  className="flex items-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded-xl font-medium transition-colors text-sm"
                >
                  <Palette size={16} />
                  Categorías
                </button>
                <button
                  onClick={() => setShowExpenses(true)}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                >
                  <TrendingDown size={18} />
                  Registrar Egreso
                </button>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow p-6 text-center">
              <TrendingDown className="mx-auto text-red-400 mb-3" size={48} />
              <p className="text-3xl font-bold text-red-600 mb-1">-${todayExpensesTotal.toFixed(2)}</p>
              <p className="text-gray-500">Total egresos de hoy</p>
              <button
                onClick={() => setShowExpenses(true)}
                className="mt-4 text-red-600 hover:text-red-700 text-sm font-medium"
              >
                Ver detalle y registrar egresos
              </button>
            </div>
          </div>
        )}

        {/* Report Tab */}
        {activeTab === 'report' && (
          <DailyReport cashRegister={todayRegister} />
        )}

        {/* Modal Form - New/Edit Student */}
        {showForm && (
          <StudentForm
            student={editingStudent}
            onSubmit={handleStudentFormSubmit}
            onClose={() => {
              setShowForm(false)
              setEditingStudent(null)
            }}
          />
        )}

        {/* Quick Payment Modal */}
        {showQuickPayment && (
          <QuickPayment
            onClose={() => setShowQuickPayment(false)}
            onPaymentComplete={handleQuickPayment}
            settings={settings}
          />
        )}

        {/* Modal Form - New Sale */}
        {showSaleForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
              <div className="p-6 border-b flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Nueva Venta</h2>
                <button
                  onClick={() => setShowSaleForm(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre del cliente *
                  </label>
                  <input
                    type="text"
                    required
                    value={saleForm.customerName}
                    onChange={(e) => setSaleForm({...saleForm, customerName: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Nombre"
                    list="students-list"
                  />
                  <datalist id="students-list">
                    {students.map(s => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Artículo *
                  </label>
                  <select
                    required
                    value={saleForm.productId}
                    onChange={(e) => setSaleForm({...saleForm, productId: e.target.value})}
                    className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="">Seleccionar artículo</option>
                    {allProducts.map(product => (
                      <option key={product.id} value={product.id}>
                        {product.name} - ${product.price}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cantidad *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={saleForm.quantity}
                      onChange={(e) => setSaleForm({...saleForm, quantity: parseInt(e.target.value)})}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha
                    </label>
                    <input
                      type="date"
                      value={saleForm.date}
                      onChange={(e) => setSaleForm({...saleForm, date: e.target.value})}
                      className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                  </div>
                </div>

                {saleForm.productId && (
                  <div className="bg-green-50 rounded-lg p-4 text-center">
                    <p className="text-sm text-gray-600">Total:</p>
                    <p className="text-2xl font-bold text-green-600">
                      ${(getProductById(saleForm.productId)?.price || 0) * saleForm.quantity}
                    </p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowSaleForm(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                  >
                    <Check size={20} />
                    Registrar venta
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedStudent && (
          <PaymentModal
            student={selectedStudent}
            onClose={() => {
              setShowPaymentModal(false)
              setSelectedStudent(null)
            }}
            onPaymentComplete={handlePaymentComplete}
          />
        )}

        {/* Receipt Generator */}
        {showReceipt && lastPayment && selectedStudent && (
          <ReceiptGenerator
            payment={lastPayment}
            student={selectedStudent}
            settings={settings}
            onClose={() => {
              setShowReceipt(false)
              setLastPayment(null)
              setSelectedStudent(null)
            }}
          />
        )}

        {/* Settings Modal */}
        {showSettings && (
          <SettingsModal
            settings={settings}
            onClose={() => setShowSettings(false)}
            onSave={updateSettings}
          />
        )}

        {/* Export Modal */}
        {showExport && (
          <ExportStudents
            students={students}
            settings={settings}
            onClose={() => setShowExport(false)}
          />
        )}

        {/* Manage Items Modal */}
        {showManageItems && (
          <ManageItems
            courses={allCourses}
            products={allProducts}
            onSaveCourse={saveCourse}
            onDeleteCourse={deleteCourse}
            onSaveProduct={saveProduct}
            onDeleteProduct={deleteProduct}
            onClose={() => setShowManageItems(false)}
            onRequestPin={(pin) => {
              // Verificar PIN
              if (!settings.security_pin) return true // Si no hay PIN configurado, permitir
              return pin === settings.security_pin
            }}
          />
        )}

        {/* Payment History Modal */}
        {showPaymentHistory && (
          <PaymentHistory
            onClose={() => setShowPaymentHistory(false)}
            onShowReceipt={handleShowReceiptFromHistory}
            onPaymentVoided={() => fetchStudents()}
            settings={settings}
          />
        )}

        {/* Student Detail Modal */}
        {showStudentDetail && (
          <StudentDetail
            student={showStudentDetail}
            onClose={() => setShowStudentDetail(null)}
            onPayment={(student) => {
              setShowStudentDetail(null)
              openPaymentModal(student)
            }}
          />
        )}

        {/* Cash Register Modal */}
        {showCashRegister && (
          <CashRegister
            onClose={() => {
              setShowCashRegister(false)
              refreshCash()
              refreshIncome()
            }}
            settings={settings}
          />
        )}

        {/* Expense Manager Modal */}
        {showExpenses && (
          <ExpenseManager
            onClose={() => {
              setShowExpenses(false)
              refreshExpenses()
              refreshIncome()
            }}
            cashRegisterId={todayRegister?.id}
            settings={settings}
          />
        )}

        {/* Cash Movements Modal */}
        {showCashMovements && (
          <CashMovements
            onClose={() => {
              setShowCashMovements(false)
              refreshIncome()
            }}
            cashRegisterId={todayRegister?.id}
            settings={settings}
          />
        )}

        {/* Manage Categories Modal */}
        {showManageCategories && (
          <ManageCategories
            onClose={() => {
              setShowManageCategories(false)
              refreshExpenses()
            }}
          />
        )}

        {/* Audit Log Modal */}
        {showAuditLog && (
          <AuditLog onClose={() => setShowAuditLog(false)} />
        )}

        {/* Delete Confirmation Modal */}
        <DeleteConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, type: '', id: null, name: '' })}
          onConfirm={executeDelete}
          itemName={deleteModal.name}
          itemType={deleteModal.type}
          requiredPin={settings.security_pin}
        />

        {/* PIN Prompt Modal for Settings Access */}
        <PinPromptModal
          isOpen={showPinPrompt}
          onClose={() => {
            setShowPinPrompt(false)
            setPendingSettingsAccess(false)
          }}
          onSuccess={() => {
            setShowPinPrompt(false)
            if (pendingSettingsAccess) {
              setShowSettings(true)
              setPendingSettingsAccess(false)
            }
          }}
          requiredPin={settings.security_pin}
          title="Acceso a Configuración"
          description="Ingresa el PIN para acceder a la configuración"
        />

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-400">
          💾 Datos en la nube • v3.8
        </div>
      </div>
    </div>
  )
}
