import { useState, useEffect } from 'react'
import {
  Plus, Users, Calendar, DollarSign, AlertCircle, Trash2, Edit2, X, Check,
  Search, ShoppingBag, Tag, Settings, CreditCard, Download, Package, Zap, ChevronDown, ChevronUp, History, Wallet, Pause, Play, Eye, LogOut, TrendingDown, ArrowLeftRight, Palette, BarChart3, ScrollText
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
// courses.js static exports no longer used directly - allCourses from useItems() is the single source of truth
import { formatDate, getDaysUntilDue, getPaymentStatus, getCycleInfo, getTodayEC } from './lib/dateUtils'
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
  const { students, loading: studentsLoading, fetchStudents, createStudent, updateStudent, deleteStudent, registerPayment, pauseStudent, unpauseStudent } = useStudents()
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
  // showStudentList and showUpcomingPayments removed - now handled by dashboard cards
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, type: '', id: null, name: '' })
  const [showPinPrompt, setShowPinPrompt] = useState(false)
  const [pendingSettingsAccess, setPendingSettingsAccess] = useState(false)
  const [showCashRegister, setShowCashRegister] = useState(false)
  const [showExpenses, setShowExpenses] = useState(false)
  const [showCashMovements, setShowCashMovements] = useState(false)
  const [showManageCategories, setShowManageCategories] = useState(false)
  const [showAuditLog, setShowAuditLog] = useState(false)
  const [showStudentDetail, setShowStudentDetail] = useState(null)
  const [showBalanceAlerts, setShowBalanceAlerts] = useState(false)
  const [showStudentListModal, setShowStudentListModal] = useState(false)

  // Browser back button closes modals instead of leaving the app
  useEffect(() => {
    const allModals = [
      showForm, showSaleForm, showPaymentModal, showReceipt, showSettings,
      showExport, showManageItems, showQuickPayment, showPaymentHistory,
      showCashRegister, showExpenses, showCashMovements, showManageCategories,
      showAuditLog, showBalanceAlerts, showPinPrompt, deleteModal.isOpen,
      !!showStudentDetail, !!selectedStudent, showStudentListModal
    ]
    const anyModalOpen = allModals.some(Boolean)

    if (anyModalOpen) {
      // Push a state so back button has somewhere to go
      window.history.pushState({ modal: true }, '')
    }

    const handlePopState = (e) => {
      // Close modals in reverse priority order
      if (showPinPrompt) { setShowPinPrompt(false); setPendingSettingsAccess(false); return }
      if (deleteModal.isOpen) { setDeleteModal({ isOpen: false, type: '', id: null, name: '' }); return }
      if (showReceipt) { setShowReceipt(false); return }
      if (showPaymentModal) { setShowPaymentModal(false); return }
      if (showBalanceAlerts) { setShowBalanceAlerts(false); return }
      if (showStudentDetail) { setShowStudentDetail(null); return }
      if (selectedStudent) { setSelectedStudent(null); return }
      if (showStudentListModal) { setShowStudentListModal(false); return }
      if (showForm) { setShowForm(false); setEditingStudent(null); return }
      if (showSaleForm) { setShowSaleForm(false); return }
      if (showQuickPayment) { setShowQuickPayment(false); return }
      if (showPaymentHistory) { setShowPaymentHistory(false); return }
      if (showCashRegister) { setShowCashRegister(false); return }
      if (showExpenses) { setShowExpenses(false); return }
      if (showCashMovements) { setShowCashMovements(false); return }
      if (showManageCategories) { setShowManageCategories(false); return }
      if (showManageItems) { setShowManageItems(false); return }
      if (showExport) { setShowExport(false); return }
      if (showSettings) { setShowSettings(false); return }
      if (showAuditLog) { setShowAuditLog(false); return }
      // No modal open — push state back so we don't leave the app
      window.history.pushState({ app: true }, '')
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [
    showForm, showSaleForm, showPaymentModal, showReceipt, showSettings,
    showExport, showManageItems, showQuickPayment, showPaymentHistory,
    showCashRegister, showExpenses, showCashMovements, showManageCategories,
    showAuditLog, showBalanceAlerts, showPinPrompt, deleteModal.isOpen,
    showStudentDetail, selectedStudent, showStudentListModal
  ])

  // ESC key closes the topmost modal (same priority as back button)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key !== 'Escape') return
      if (showPinPrompt) { setShowPinPrompt(false); setPendingSettingsAccess(false); return }
      if (deleteModal.isOpen) { setDeleteModal({ isOpen: false, type: '', id: null, name: '' }); return }
      if (showReceipt) { setShowReceipt(false); return }
      if (showPaymentModal) { setShowPaymentModal(false); return }
      if (showBalanceAlerts) { setShowBalanceAlerts(false); return }
      if (showStudentDetail) { setShowStudentDetail(null); return }
      if (selectedStudent) { setSelectedStudent(null); return }
      if (showStudentListModal) { setShowStudentListModal(false); return }
      if (showForm) { setShowForm(false); setEditingStudent(null); return }
      if (showSaleForm) { setShowSaleForm(false); return }
      if (showQuickPayment) { setShowQuickPayment(false); return }
      if (showPaymentHistory) { setShowPaymentHistory(false); return }
      if (showCashRegister) { setShowCashRegister(false); return }
      if (showExpenses) { setShowExpenses(false); return }
      if (showCashMovements) { setShowCashMovements(false); return }
      if (showManageCategories) { setShowManageCategories(false); return }
      if (showManageItems) { setShowManageItems(false); return }
      if (showExport) { setShowExport(false); return }
      if (showSettings) { setShowSettings(false); return }
      if (showAuditLog) { setShowAuditLog(false); return }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    showForm, showSaleForm, showPaymentModal, showReceipt, showSettings,
    showExport, showManageItems, showQuickPayment, showPaymentHistory,
    showCashRegister, showExpenses, showCashMovements, showManageCategories,
    showAuditLog, showBalanceAlerts, showPinPrompt, deleteModal.isOpen,
    showStudentDetail, selectedStudent, showStudentListModal
  ])

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
    date: getTodayEC(),
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

  // Alumnos con saldos pendientes (abonos parciales)
  const studentsWithBalance = students.filter(s => {
    if (s.payment_status !== 'partial') return false
    const amountPaid = parseFloat(s.amount_paid || 0)
    return amountPaid > 0 && parseFloat(s.balance || 0) > 0
  }).map(s => {
    const course = getCourseById(s.course_id)
    const amountPaid = parseFloat(s.amount_paid || 0)
    const effectivePrice = parseFloat(s.total_program_price || course?.price || 0)
    return { ...s, courseName: course?.name, amountPaid, coursePrice: effectivePrice, balance: parseFloat(s.balance || 0) }
  })

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
        date: getTodayEC(),
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
            className="object-contain mx-auto"
            style={{ width: '160px', maxWidth: '40%', height: 'auto' }}
          />
        </div>

        {/* Header con controles - Blanco */}
        <div className="bg-white rounded-2xl shadow-lg mb-5 sm:mb-7 p-3 sm:p-4">
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

          {/* Fila 2: Acciones principales - grid adaptable */}
          <div className="pt-4 mt-2 border-t border-gray-100 space-y-3">
            {/* Acciones principales: grid 3 cols en móvil, row en desktop */}
            <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2.5 sm:gap-3">
              <button
                onClick={() => setShowForm(true)}
                className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 bg-purple-600 hover:bg-purple-700 text-white px-2.5 sm:px-4 py-3 sm:py-2.5 rounded-xl font-medium transition-colors shadow-sm text-xs sm:text-sm"
              >
                <Plus size={20} />
                <span>Alumno</span>
              </button>
              <button
                onClick={() => setShowSaleForm(true)}
                className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 bg-green-600 hover:bg-green-700 text-white px-2.5 sm:px-4 py-3 sm:py-2.5 rounded-xl font-medium transition-colors shadow-sm text-xs sm:text-sm"
              >
                <ShoppingBag size={20} />
                <span>Venta</span>
              </button>
              <button
                onClick={() => setShowQuickPayment(true)}
                className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 bg-amber-600 hover:bg-amber-700 text-white px-2.5 sm:px-4 py-3 sm:py-2.5 rounded-xl font-medium transition-colors shadow-sm text-xs sm:text-sm"
              >
                <Zap size={20} />
                <span>Pago</span>
              </button>
              <button
                onClick={() => setShowExpenses(true)}
                className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 bg-red-600 hover:bg-red-700 text-white px-2.5 sm:px-4 py-3 sm:py-2.5 rounded-xl font-medium transition-colors shadow-sm text-xs sm:text-sm"
              >
                <TrendingDown size={20} />
                <span>Egreso</span>
              </button>
              <button
                onClick={() => setShowCashMovements(true)}
                className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 bg-blue-600 hover:bg-blue-700 text-white px-2.5 sm:px-4 py-3 sm:py-2.5 rounded-xl font-medium transition-colors shadow-sm text-xs sm:text-sm"
              >
                <ArrowLeftRight size={20} />
                <span>Movimiento</span>
              </button>
              <button
                onClick={() => setShowPaymentHistory(true)}
                className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 px-2.5 sm:px-4 py-3 sm:py-2.5 rounded-xl font-medium transition-colors text-xs sm:text-sm"
              >
                <History size={20} />
                <span>Historial</span>
              </button>
            </div>

            {/* Herramientas secundarias */}
            <div className="flex items-center justify-center sm:justify-end gap-3 flex-wrap">
              {can('canExport') && (
                <button
                  onClick={() => setShowExport(true)}
                  className="flex items-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                >
                  <Download size={16} />
                  Exportar
                </button>
              )}
              {isAdmin && (
                <button
                  onClick={() => setShowAuditLog(true)}
                  className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg transition-colors text-sm font-medium"
                >
                  <ScrollText size={16} />
                  Auditoría
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Tabs - Siempre con texto visible */}
        <div className="flex gap-1 sm:gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { id: 'students', icon: Users, label: 'Alumnos', count: students.length },
            { id: 'sales', icon: ShoppingBag, label: 'Ventas', count: sales.length },
            { id: 'courses', icon: Calendar, label: 'Cursos' },
            { id: 'expenses', icon: TrendingDown, label: 'Egresos' },
            { id: 'report', icon: BarChart3, label: 'Reporte' },
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-5 py-2.5 rounded-xl font-medium transition-colors whitespace-nowrap text-xs sm:text-sm ${
                  activeTab === tab.id
                    ? 'bg-purple-600 text-white shadow-sm'
                    : 'bg-white text-gray-700 hover:bg-purple-50 border border-gray-200'
                }`}
              >
                <Icon size={15} />
                {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ''}
              </button>
            )
          })}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
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

          <div
            onClick={() => { setFilterPayment(overduePayments.length > 0 ? 'overdue' : 'upcoming'); setShowStudentListModal(true) }}
            className={`bg-white rounded-xl shadow p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:scale-105 transition-all border-2 ${overduePayments.length > 0 ? 'animate-pulse-urgent border-red-300 hover:border-red-400' : 'border-transparent hover:border-yellow-300'}`}
            title={overduePayments.length > 0 ? 'Ver alumnos por renovar' : 'Ver próximos cobros'}
          >
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
                    <p className="text-xs sm:text-sm text-gray-500">Próximos</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Old upcoming payments section removed - now integrated in dashboard cards */}

        {/* Students Tab - Clean Dashboard */}
        {activeTab === 'students' && (
          <>
            {/* Quick Action: Nuevo Alumno */}
            <div className="mb-4">
              <button
                onClick={() => setShowForm(true)}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-md hover:shadow-lg"
              >
                <Plus size={18} />
                Nuevo Alumno
              </button>
            </div>

            {/* Quick Access Cards */}
            <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6">
              {/* View Students Button */}
              <button
                onClick={() => setShowStudentListModal(true)}
                className="bg-white rounded-xl shadow p-4 sm:p-5 hover:shadow-lg hover:scale-[1.02] transition-all border-2 border-transparent hover:border-purple-300 text-left"
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="bg-purple-100 p-2 sm:p-3 rounded-xl shrink-0">
                    <Users className="text-purple-600" size={20} />
                  </div>
                  <div>
                    <p className="text-xl sm:text-3xl font-bold text-purple-600">{students.length}</p>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium">Alumnos</p>
                  </div>
                </div>
              </button>

              {/* Upcoming Payments */}
              <button
                onClick={() => { setFilterPayment('upcoming'); setShowStudentListModal(true) }}
                className={`bg-white rounded-xl shadow p-4 sm:p-5 hover:shadow-lg hover:scale-[1.02] transition-all border-2 text-left ${
                  upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0).length > 0 ? 'border-transparent hover:border-yellow-300' : 'border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0).length > 0 ? 'bg-yellow-100' : 'bg-gray-100'}`}>
                    <Calendar className={upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0).length > 0 ? 'text-yellow-600' : 'text-gray-400'} size={20} />
                  </div>
                  <div>
                    <p className={`text-xl sm:text-3xl font-bold ${upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0).length > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                      {upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0).length}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium">Próximos</p>
                  </div>
                </div>
              </button>

              {/* Balance Alerts */}
              <button
                onClick={() => studentsWithBalance.length > 0 && setShowBalanceAlerts(true)}
                className={`bg-white rounded-xl shadow p-4 sm:p-5 hover:shadow-lg hover:scale-[1.02] transition-all border-2 text-left ${
                  studentsWithBalance.length > 0 ? 'border-transparent hover:border-orange-300' : 'border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${studentsWithBalance.length > 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
                    <Wallet className={studentsWithBalance.length > 0 ? 'text-orange-600' : 'text-gray-400'} size={20} />
                  </div>
                  <div>
                    <p className={`text-xl sm:text-3xl font-bold ${studentsWithBalance.length > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                      {studentsWithBalance.length}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-500 font-medium">Saldos</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Cobros Vencidos Alert */}
            {overduePayments.length > 0 && (
              <div
                onClick={() => { setFilterPayment('overdue'); setShowStudentListModal(true) }}
                className="bg-gradient-to-r from-red-50 to-rose-50 border border-red-200 rounded-xl p-4 mb-4 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-red-800 flex items-center gap-2">
                    <AlertCircle size={18} />
                    Cobros Vencidos
                  </h3>
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full text-xs font-bold">
                    {overduePayments.length} alumno{overduePayments.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-2">
                  {overduePayments.slice(0, 3).map(s => {
                    const course = getCourseById(s.course_id)
                    const days = Math.abs(getDaysUntilDue(s.next_payment_date))
                    return (
                      <div key={s.id} className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2">
                        <div>
                          <p className="font-medium text-sm text-gray-800">{s.name}</p>
                          <p className="text-xs text-gray-500">{course?.name || 'Sin curso'}</p>
                        </div>
                        <span className="text-xs font-bold text-red-600">{days} día{days !== 1 ? 's' : ''} vencido</span>
                      </div>
                    )
                  })}
                  {overduePayments.length > 3 && (
                    <p className="text-xs text-red-600 text-center pt-1">
                      +{overduePayments.length - 3} más · Toca para ver todos
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Cobros Próximos Alert */}
            {upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0).length > 0 && (
              <div
                onClick={() => { setFilterPayment('upcoming'); setShowStudentListModal(true) }}
                className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4 mb-4 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-yellow-800 flex items-center gap-2">
                    <Calendar size={18} />
                    Cobros Próximos (5 días)
                  </h3>
                  <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full text-xs font-bold">
                    {upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0).length} alumno{upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0).length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-2">
                  {upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0).slice(0, 3).map(s => {
                    const course = getCourseById(s.course_id)
                    const days = getDaysUntilDue(s.next_payment_date)
                    return (
                      <div key={s.id} className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2">
                        <div>
                          <p className="font-medium text-sm text-gray-800">{s.name}</p>
                          <p className="text-xs text-gray-500">{course?.name || 'Sin curso'}</p>
                        </div>
                        <span className={`text-xs font-bold ${days === 0 ? 'text-orange-600' : 'text-yellow-600'}`}>
                          {days === 0 ? 'Hoy' : `en ${days} día${days !== 1 ? 's' : ''}`}
                        </span>
                      </div>
                    )
                  })}
                  {upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0).length > 3 && (
                    <p className="text-xs text-yellow-600 text-center pt-1">
                      +{upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0).length - 3} más · Toca para ver todos
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Saldos pendientes resumen */}
            {studentsWithBalance.length > 0 && (
              <div
                onClick={() => setShowBalanceAlerts(true)}
                className="bg-gradient-to-r from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-4 mb-4 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-orange-800 flex items-center gap-2">
                    <Wallet size={18} />
                    Saldos por cobrar
                  </h3>
                  <span className="text-lg font-bold text-orange-600">
                    ${studentsWithBalance.reduce((sum, s) => sum + s.balance, 0).toFixed(2)}
                  </span>
                </div>
                <div className="space-y-2">
                  {studentsWithBalance.slice(0, 3).map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-white/70 rounded-lg px-3 py-2">
                      <div>
                        <p className="font-medium text-sm text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.courseName}</p>
                      </div>
                      <p className="font-bold text-orange-600">${s.balance.toFixed(2)}</p>
                    </div>
                  ))}
                  {studentsWithBalance.length > 3 && (
                    <p className="text-xs text-orange-600 text-center pt-1">
                      +{studentsWithBalance.length - 3} más · Toca para ver todos
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Empty state when no alerts */}
            {overduePayments.length === 0 && upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0).length === 0 && studentsWithBalance.length === 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 text-center">
                <Check size={32} className="mx-auto mb-2 text-green-500" />
                <p className="font-medium text-green-800">¡Todo al día!</p>
                <p className="text-sm text-green-600 mt-1">No hay cobros pendientes ni saldos por cobrar</p>
              </div>
            )}
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

            {/* All Courses - Dynamic */}
            {(() => {
              const regular = allCourses.filter(c => (c.priceType || c.price_type) === 'mes' || (c.priceType || c.price_type) === 'clase')
              const programs = allCourses.filter(c => (c.priceType || c.price_type) === 'programa' || (c.priceType || c.price_type) === 'paquete')
              return (
                <>
                  {regular.length > 0 && (
                    <div className="bg-white rounded-xl shadow p-4 sm:p-6">
                      <h2 className="font-semibold text-gray-800 mb-4">Clases Regulares</h2>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {regular.map(course => {
                          const enrolledCount = students.filter(s => s.course_id === (course.id || course.code)).length
                          return (
                            <div key={course.id || course.code} className="border rounded-xl p-4 hover:border-purple-300 hover:shadow-md transition-all">
                              <h3 className="font-medium text-purple-700">{course.name}</h3>
                              <p className="text-sm text-gray-500 mt-1">{course.schedule || 'Sin horario definido'}</p>
                              <p className="text-lg font-bold text-green-600 mt-2">
                                ${course.price}/{(course.priceType || course.price_type) === 'mes' ? 'mes' : 'clase'}
                              </p>
                              <p className="text-sm font-medium text-gray-700 mt-2">
                                {enrolledCount} alumno{enrolledCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {programs.length > 0 && (
                    <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl shadow p-4 sm:p-6">
                      <h2 className="font-semibold text-orange-800 mb-4">Programas</h2>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {programs.map(course => {
                          const enrolledCount = students.filter(s => s.course_id === (course.id || course.code)).length
                          return (
                            <div key={course.id || course.code} className="bg-white rounded-xl p-4 hover:shadow-md transition-shadow">
                              <h3 className="font-medium text-orange-700">{course.name}</h3>
                              <p className="text-sm text-gray-500 mt-1">
                                {(course.ageMin || course.age_min)} - {(course.ageMax || course.age_max)} años
                                {course.schedule && ` • ${course.schedule}`}
                              </p>
                              <p className="text-lg font-bold text-green-600 mt-2">${course.price}</p>
                              {(course.allowsInstallments || course.allows_installments) && (
                                <p className="text-xs text-orange-600">{course.installmentCount || course.installment_count || 2} cuotas</p>
                              )}
                              <p className="text-sm font-medium text-gray-700 mt-2">
                                {enrolledCount} inscrito{enrolledCount !== 1 ? 's' : ''}
                              </p>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </>
              )
            })()}
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
            courses={allCourses}
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
            students={students}
          />
        )}

        {/* Modal Form - New Sale */}
        {showSaleForm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowSaleForm(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
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
        {/* Student List Modal */}
        {showStudentListModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50" onClick={() => setShowStudentListModal(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="p-3 sm:p-5 border-b bg-gradient-to-r from-purple-600 to-purple-800 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="bg-white/20 p-1.5 sm:p-2 rounded-lg">
                      <Users size={20} />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-xl font-semibold">Alumnos ({filteredStudents.length})</h2>
                      <p className="text-xs sm:text-sm text-white/80 hidden sm:block">Gestiona tu lista de alumnos</p>
                    </div>
                  </div>
                  <button onClick={() => setShowStudentListModal(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="p-3 sm:p-4 border-b bg-gray-50">
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <div className="flex-1 flex items-center gap-2 border rounded-lg focus-within:ring-2 focus-within:ring-purple-500 px-3 py-2 bg-white">
                    <Search className="text-gray-400 shrink-0" size={18} />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o cédula..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full text-sm outline-none bg-transparent"
                    />
                  </div>
                  <select
                    value={filterCourse}
                    onChange={(e) => setFilterCourse(e.target.value)}
                    className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">Todos los cursos</option>
                    {(() => {
                      const regular = allCourses.filter(c => (c.priceType || c.price_type) === 'mes' || (c.priceType || c.price_type) === 'clase')
                      const programs = allCourses.filter(c => (c.priceType || c.price_type) === 'programa' || (c.priceType || c.price_type) === 'paquete')
                      return (
                        <>
                          {regular.length > 0 && (
                            <optgroup label="Clases Regulares">
                              {regular.map(c => (
                                <option key={c.id || c.code} value={c.id || c.code}>{c.name}</option>
                              ))}
                            </optgroup>
                          )}
                          {programs.length > 0 && (
                            <optgroup label="Programas">
                              {programs.map(c => (
                                <option key={c.id || c.code} value={c.id || c.code}>{c.name}</option>
                              ))}
                            </optgroup>
                          )}
                        </>
                      )
                    })()}
                  </select>
                  <select
                    value={filterPayment}
                    onChange={(e) => setFilterPayment(e.target.value)}
                    className="px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="all">Todos</option>
                    <option value="overdue">Por renovar</option>
                    <option value="upcoming">Próximos</option>
                  </select>
                </div>
              </div>

              {/* Student List */}
              <div className="flex-1 overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    <Users size={48} className="mx-auto mb-4 opacity-50" />
                    <p>No hay alumnos registrados</p>
                    <button
                      onClick={() => { setShowStudentListModal(false); setShowForm(true) }}
                      className="mt-4 text-purple-600 hover:text-purple-700 font-medium"
                    >
                      Agregar primer alumno
                    </button>
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredStudents.map(student => {
                      const course = getCourseById(student.course_id)
                      const paymentStatus = getPaymentStatus(student, course)
                      const isCamp = student.course_id?.startsWith('camp-')

                      return (
                        <div key={student.id} className={`p-3 sm:p-4 hover:bg-gray-50 transition-colors ${isCamp ? 'border-l-4 border-pink-400' : ''}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                              <div className={`${isCamp ? 'bg-pink-100 text-pink-700' : 'bg-purple-100 text-purple-700'} w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0`}>
                                {student.name.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">{student.name}</h3>
                                <p className="text-xs sm:text-sm text-gray-500 truncate">
                                  {student.age} años • {course?.name || 'Sin curso'}
                                </p>
                                {(course?.priceType === 'mes' || course?.priceType === 'paquete') && student.last_payment_date && (() => {
                                  const cycleClasses = course?.classesPerCycle || course?.classesPerPackage || null
                                  const cycleInfo = getCycleInfo(student.last_payment_date, student.next_payment_date, course?.classDays, cycleClasses)
                                  if (!cycleInfo) return null
                                  const progress = (cycleInfo.classesPassed / cycleInfo.totalClasses) * 100
                                  return (
                                    <div className="mt-1 max-w-[180px]">
                                      <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-purple-500 rounded-full transition-all" style={{ width: `${Math.min(progress, 100)}%` }} />
                                      </div>
                                      <p className="text-[10px] text-gray-400 mt-0.5">
                                        Clase {cycleInfo.classesPassed}/{cycleInfo.totalClasses}
                                      </p>
                                    </div>
                                  )
                                })()}
                                {student.is_paused && (
                                  <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-medium">Pausado</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 sm:gap-3 shrink-0">
                              <div className="text-right hidden sm:block">
                                <p className="font-semibold text-gray-800 text-sm">${student.monthly_fee}</p>
                                <span className={`inline-block mt-0.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${paymentStatus.color}`}>
                                  {paymentStatus.label}
                                </span>
                              </div>

                              <div className="flex gap-0.5 sm:gap-1">
                                <button
                                  onClick={() => { setShowStudentListModal(false); setShowStudentDetail(student) }}
                                  className="p-1.5 sm:p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                                  title="Ver detalle"
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  onClick={() => { setShowStudentListModal(false); openPaymentModal(student) }}
                                  className="p-1.5 sm:p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                  title="Registrar pago"
                                >
                                  <CreditCard size={16} />
                                </button>
                                <button
                                  onClick={() => { setShowStudentListModal(false); handleEdit(student) }}
                                  className="p-1.5 sm:p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors hidden sm:block"
                                  title="Editar"
                                >
                                  <Edit2 size={16} />
                                </button>
                                <button
                                  onClick={() => handleDelete(student)}
                                  className="p-1.5 sm:p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors hidden sm:block"
                                  title="Eliminar"
                                >
                                  <Trash2 size={16} />
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

              {/* Footer */}
              <div className="p-2 sm:p-4 border-t bg-gray-50">
                <button
                  onClick={() => setShowStudentListModal(false)}
                  className="w-full px-4 py-2 sm:py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

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

        {/* Balance Alerts Modal */}
        {showBalanceAlerts && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50" onClick={() => setShowBalanceAlerts(false)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 bg-gradient-to-r from-orange-500 to-amber-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-lg">
                      <Wallet className="text-white" size={22} />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Saldos Pendientes</h2>
                      <p className="text-white/80 text-sm">{studentsWithBalance.length} alumno{studentsWithBalance.length !== 1 ? 's' : ''} con abonos parciales</p>
                    </div>
                  </div>
                  <button onClick={() => setShowBalanceAlerts(false)} className="p-2 hover:bg-white/20 rounded-lg transition-colors text-white">
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {studentsWithBalance.map(s => (
                  <div
                    key={s.id}
                    className="p-4 rounded-xl border-2 border-orange-200 bg-orange-50 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => {
                      setShowBalanceAlerts(false)
                      openPaymentModal(s)
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-800">{s.name}</p>
                        <p className="text-sm text-gray-500">{s.courseName}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-orange-600">${s.balance.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">pendiente</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                      <span>Pagado: <strong className="text-green-600">${s.amountPaid.toFixed(2)}</strong></span>
                      <span>Total: <strong>${s.coursePrice.toFixed(2)}</strong></span>
                    </div>
                  </div>
                ))}
                {studentsWithBalance.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Check size={48} className="mx-auto mb-3 text-green-400" />
                    <p className="font-medium">No hay saldos pendientes</p>
                  </div>
                )}
              </div>
              <div className="p-4 border-t bg-gray-50 flex justify-between items-center">
                <p className="text-sm text-gray-500">
                  Total por cobrar: <strong className="text-orange-600">${studentsWithBalance.reduce((sum, s) => sum + s.balance, 0).toFixed(2)}</strong>
                </p>
                <button onClick={() => setShowBalanceAlerts(false)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium text-sm">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
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
          💾 Datos en la nube • v4.7
        </div>
      </div>
    </div>
  )
}
