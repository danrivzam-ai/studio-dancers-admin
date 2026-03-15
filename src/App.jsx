import { useState, useEffect, useRef } from 'react'
import {
  Plus, Users, Calendar, DollarSign, AlertCircle, Trash2, Edit2, X, Check,
  Search, ShoppingBag, Tag, Settings, CreditCard, Download, Package, Zap, ChevronDown, ChevronUp, History, Wallet, Pause, Play, Eye, EyeOff, LogOut, TrendingDown, ArrowLeftRight, Palette, BarChart3, ScrollText, MessageCircle, Images, Megaphone, Pin, Send, GraduationCap, FileText, Monitor, Lock
} from 'lucide-react'
import { supabase } from './lib/supabase'
import { useStudents } from './hooks/useStudents'
import { useSales } from './hooks/useSales'
import { useSchoolSettings } from './hooks/useSchoolSettings'
import { usePayments } from './hooks/usePayments'
import { useItems } from './hooks/useItems'
import { useDailyIncome } from './hooks/useDailyIncome'
import { useCashRegister } from './hooks/useCashRegister'
import { useExpenses } from './hooks/useExpenses'
import { useAuth } from './hooks/useAuth'
// ALL_COURSES se usa como fallback para enriquecer cursos que no tienen classDays en Supabase
import { ALL_COURSES } from './lib/courses'
import { formatDate, getDaysUntilDue, getPaymentStatus, getCycleInfo, getTodayEC } from './lib/dateUtils'
import { syncToMailerLite } from './lib/mailerlite'
import { openWhatsApp, buildReminderMessage, getContactInfo } from './lib/whatsapp'
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
import TransferVerification from './components/TransferVerification'
import SaleReceipt from './components/SaleReceipt'
import SaleInstallments from './components/SaleInstallments'
import { useSalePlans } from './hooks/useSalePlans'
import GalleryManager from './components/GalleryManager'
import InstructorManager from './components/InstructorManager'
import ReportesManager from './components/ReportesManager'
import ClasesAdultasManager from './components/ClasesAdultasManager'
import CobranzaReport from './components/CobranzaReport'
import MonthlyClose from './components/MonthlyClose'
import { useMonthlyClose } from './hooks/useMonthlyClose'
import { useFinancialKPIs } from './hooks/useFinancialKPIs'
import ReceptionistManager from './components/ReceptionistManager'
import { useTransferRequests } from './hooks/useTransferRequests'
import LoginPage from './components/Auth/LoginPage'
import { useToast } from './components/Toast'
import './App.css'

// Mini-component: shows avatar photo from Supabase storage, falls back to initials
function StudentAvatar({ student, isCamp }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const avatarUrl = supabase.storage.from('avatars').getPublicUrl(`${student.id}.jpg`).data?.publicUrl
  const initials = student.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const bgClass = isCamp ? 'bg-pink-100 text-pink-700' : 'bg-purple-100 text-purple-700'
  return (
    <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full shrink-0 overflow-hidden flex items-center justify-center relative ${bgClass}`}>
      <span className="font-bold text-sm absolute select-none">{initials}</span>
      <img
        src={avatarUrl}
        alt=""
        onLoad={() => setImgLoaded(true)}
        onError={() => setImgLoaded(false)}
        className={`w-full h-full object-cover absolute inset-0 transition-opacity ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
      />
    </div>
  )
}

export default function App({ isRecepcion = false, userName: recepcionUserName = '', onLogout } = {}) {
  const { user, userRole, loading: authLoading, signOut, isAuthenticated, isAdmin, can } = useAuth()
  const { students, loading: studentsLoading, fetchStudents, createStudent, updateStudent, deleteStudent, registerPayment, pauseStudent, unpauseStudent, reactivateCycle } = useStudents()
  const { sales, loading: salesLoading, createSale, createSaleGroup, deleteSale, totalSalesIncome } = useSales()
  const { settings, updateSettings } = useSchoolSettings()
  const { generateReceiptNumber } = usePayments()
  const { courses: allCourses, products: allProducts, saveCourse, deleteCourse, saveProduct, deleteProduct, getCourseById, getProductById, adjustStock, getInventoryMovements } = useItems()
  const { todayIncome, todayPaymentsCount, refreshIncome } = useDailyIncome()
  const { isOpen: isCashOpen, notOpened: isCashNotOpened, refresh: refreshCash, todayRegister } = useCashRegister()
  const { todayExpensesTotal, refreshExpenses } = useExpenses()
  const { requests: transferRequests, pendingCount: pendingTransfers, fetchRequests: fetchTransferRequests, approveRequest, rejectRequest, newTransferAlert, setNewTransferAlert, onNewTransferRef } = useTransferRequests()
  const { activePlans, paidPlans, totalDebt, loading: plansLoading, dbError: plansDbError, refresh: refreshPlans, createPlan, registerPayment: registerPlanPayment, cancelPlan, deletePlan, updatePlanTotal, markDelivered } = useSalePlans()
  const { kpis, loading: kpisLoading, fetchKPIs } = useFinancialKPIs()
  const toast = useToast()

  // Helper: enriquecer curso con datos hardcodeados si faltan classDays/classesPerCycle
  // Resuelve el caso donde class_days es NULL en Supabase (migración v14 no ejecutada o datos viejos)
  const enrichCourse = (course) => {
    if (!course) return null
    // Normalizar price_type → priceType si falta
    const base = course.priceType ? course : { ...course, priceType: course.price_type }
    if (base.classDays && base.classDays.length > 0) return base
    // 1. Match exacto por id/code en cursos hardcodeados
    const hardcoded = ALL_COURSES.find(c => c.id === base.code || c.id === base.id)
    if (hardcoded) {
      return { ...base, classDays: hardcoded.classDays, classesPerCycle: hardcoded.classesPerCycle, classesPerPackage: hardcoded.classesPerPackage, priceType: base.priceType || hardcoded.priceType }
    }
    // 2. Match por patrón: cursos custom de sábados (ej: sabados-intensivos-adultos)
    const key = (base.code || base.id || '').toLowerCase()
    const name = (base.name || '').toLowerCase()
    if (key.includes('sabados') || key.includes('sabado') || name.includes('sábado') || name.includes('sabado')) {
      return { ...base, classDays: [6], classesPerPackage: base.classesPerPackage || 4 }
    }
    return base
  }

  const [activeTab, setActiveTab] = useState('students')
  const [activeAcademicTab, setActiveAcademicTab] = useState('instructoras')
  const [hideIncome, setHideIncome] = useState(true)
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
  const [showTransferVerification, setShowTransferVerification] = useState(false)
  const [showStudentDetail, setShowStudentDetail] = useState(null)
  const [showBalanceAlerts, setShowBalanceAlerts] = useState(false)
  const [detailBalanceStudent, setDetailBalanceStudent] = useState(null)
  const [showStudentListModal, setShowStudentListModal] = useState(false)
  const [showCobranzaReport, setShowCobranzaReport]   = useState(false)
  const [showMonthlyClose,  setShowMonthlyClose]      = useState(false)
  const { closes, loading: closesLoading, summaryLoading, summary, fetchCloses, isMonthClosed, getMonthSummary, closeMonth } = useMonthlyClose()
  const globalSearchRef = useRef(null)
  const [saleSubmitting, setSaleSubmitting] = useState(false)

  // Tablón de anuncios
  const [announcements, setAnnouncements] = useState([])
  const [showAnnouncementForm, setShowAnnouncementForm] = useState(false)
  const [editingAnnouncement, setEditingAnnouncement] = useState(null)
  const [announcementForm, setAnnouncementForm] = useState({ title: '', body: '', color: 'purple', pinned: false, expires_at: '' })
  // Recordatorios: sequential WhatsApp mode (index into reminderStudents array, or null)
  const [reminderQueueIdx, setReminderQueueIdx] = useState(null)
  const [showReminders, setShowReminders] = useState(false)

  // Connect notification click to open transfer verification modal
  useEffect(() => {
    onNewTransferRef.current = () => setShowTransferVerification(true)
  }, [onNewTransferRef])

  // Cargar KPIs financieros cuando los alumnos estén disponibles
  useEffect(() => {
    if (students.length > 0) fetchKPIs(students)
  }, [students, fetchKPIs])

  // Cargar tablón de anuncios
  useEffect(() => {
    supabase
      .from('announcements')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .then(({ data }) => { if (data) setAnnouncements(data) })
  }, [])

  // Browser back button closes modals instead of leaving the app
  useEffect(() => {
    const allModals = [
      showForm, showSaleForm, showPaymentModal, showReceipt, showSettings,
      showExport, showManageItems, showQuickPayment, showPaymentHistory,
      showCashRegister, showExpenses, showCashMovements, showManageCategories,
      showAuditLog, showBalanceAlerts, showPinPrompt, deleteModal.isOpen,
      !!showStudentDetail, !!selectedStudent, showStudentListModal, showTransferVerification,
      showCobranzaReport, showMonthlyClose
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
      if (showMonthlyClose) { setShowMonthlyClose(false); return }
      if (showCobranzaReport) { setShowCobranzaReport(false); return }
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
    showStudentDetail, selectedStudent, showStudentListModal, showTransferVerification,
    showCobranzaReport, showMonthlyClose
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
      if (showTransferVerification) { setShowTransferVerification(false); return }
      if (showMonthlyClose) { setShowMonthlyClose(false); return }
      if (showCobranzaReport) { setShowCobranzaReport(false); return }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [
    showForm, showSaleForm, showPaymentModal, showReceipt, showSettings,
    showExport, showManageItems, showQuickPayment, showPaymentHistory,
    showCashRegister, showExpenses, showCashMovements, showManageCategories,
    showAuditLog, showBalanceAlerts, showPinPrompt, deleteModal.isOpen,
    showStudentDetail, selectedStudent, showStudentListModal, showTransferVerification,
    showMonthlyClose, showCobranzaReport
  ])

  // Ctrl+K / Cmd+K focuses global search
  useEffect(() => {
    const handleCtrlK = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        globalSearchRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleCtrlK)
    return () => window.removeEventListener('keydown', handleCtrlK)
  }, [])

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
    paymentMethod: 'cash',
    notes: ''
  })
  const [cartItems, setCartItems] = useState([])
  const [productSearch, setProductSearch] = useState('')
  const [showSaleReceipt, setShowSaleReceipt] = useState(false)
  const [lastSaleReceipt, setLastSaleReceipt] = useState(null)
  const [salesDateFilter, setSalesDateFilter] = useState('today')
  const [newPlanPreselect, setNewPlanPreselect] = useState(null)
  const [collapsedCats, setCollapsedCats] = useState(new Set())
  const [showNewPlan, setShowNewPlan] = useState(false)

  // Configuración de períodos de mora
  const graceDays       = settings.grace_days       ?? 5
  const moraDays        = settings.mora_days        ?? 20
  const autoInactiveDays = settings.auto_inactive_days ?? 60

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
    const absDays   = Math.abs(daysUntil)
    const isRecurring = course?.priceType === 'mes' || course?.priceType === 'paquete'
    const matchesPayment = filterPayment === 'all' ||
      // "Por renovar": gracia + vencidas (pueden asistir, días 1 a moraDays)
      (filterPayment === 'overdue'   && isRecurring && student.payment_status !== 'pending' && daysUntil < 0 && absDays <= moraDays) ||
      // "Suspendidas": mora (no pueden asistir, días moraDays+1 a autoInactiveDays)
      (filterPayment === 'mora'      && isRecurring && student.payment_status !== 'pending' && daysUntil < 0 && absDays > moraDays && absDays <= autoInactiveDays) ||
      // "Inactivas": completamente inactivas (días autoInactiveDays+1 en adelante)
      (filterPayment === 'inactive'  && isRecurring && student.payment_status !== 'pending' && daysUntil < 0 && absDays > autoInactiveDays) ||
      (filterPayment === 'upcoming'  && daysUntil >= 0 && daysUntil <= 5)
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

  // Alumnos en período de gracia (días 1 a graceDays) — pueden asistir
  const graceStudents = recurringStudents.filter(s => {
    if (!s.next_payment_date || s.payment_status === 'pending') return false
    const days = getDaysUntilDue(s.next_payment_date)
    return days < 0 && Math.abs(days) <= graceDays
  })

  // Alumnos con pago vencido (días graceDays+1 a moraDays) — pueden asistir pero deben pagar
  const overduePayments = recurringStudents.filter(s => {
    if (!s.next_payment_date || s.payment_status === 'pending') return false
    const days = getDaysUntilDue(s.next_payment_date)
    const abs  = Math.abs(days)
    return days < 0 && abs > graceDays && abs <= moraDays
  })

  // Alumnos en mora / suspendidas (días moraDays+1 a autoInactiveDays) — NO pueden asistir
  const moraStudents = recurringStudents.filter(s => {
    if (!s.next_payment_date || s.payment_status === 'pending') return false
    const days = getDaysUntilDue(s.next_payment_date)
    const abs  = Math.abs(days)
    return days < 0 && abs > moraDays && abs <= autoInactiveDays
  })

  // Alumnos inactivos definitivos (días autoInactiveDays+1 en adelante)
  const inactiveStudents = recurringStudents.filter(s => {
    if (!s.next_payment_date || s.payment_status === 'pending') return false
    const days = getDaysUntilDue(s.next_payment_date)
    return days < 0 && Math.abs(days) > autoInactiveDays
  })

  // Total de alumnos que necesitan atención urgente (vencidas + mora)
  const urgentCount = overduePayments.length + moraStudents.length

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

  // Sincronizar alumno con MailerLite segmentado por edad (fire-and-forget)
  // Funciona tanto para nuevos alumnos como para actualizaciones de datos
  const syncStudentToMailerLite = (studentData) => {
    if (!settings.mailerlite_api_key) return

    const isMinor = studentData.isMinor
    const extraFields = {
      tipo_alumno: isMinor ? 'menor' : 'mayor',
      nombre_alumno: studentData.name
    }
    if (studentData.age) {
      extraFields.edad_alumno = parseInt(studentData.age, 10)
    }

    if (isMinor) {
      // Menores: usar email del representante
      const email = studentData.parentEmail || studentData.email
      if (email) {
        syncToMailerLite({
          email,
          name: studentData.parentName || studentData.name,
          apiKey: settings.mailerlite_api_key,
          groupId: settings.mailerlite_group_id,
          fields: extraFields
        })
      }
    } else {
      // Adultos: usar email del alumno
      if (studentData.email) {
        syncToMailerLite({
          email: studentData.email,
          name: studentData.name,
          apiKey: settings.mailerlite_api_key,
          groupId: settings.mailerlite_group_id,
          fields: extraFields
        })
      }
    }
  }

  // ── Sincronización masiva única: enviar TODOS los alumnos a MailerLite ──
  // Se ejecuta 1 sola vez (flag en localStorage). No duplica porque MailerLite hace upsert por email.
  useEffect(() => {
    if (!settings.mailerlite_api_key || students.length === 0 || studentsLoading) return
    const flag = localStorage.getItem('ml_bulk_sync_v1')
    if (flag) return // Ya se hizo

    console.log('[MailerLite] Iniciando sincronización masiva de', students.length, 'alumnos...')
    let synced = 0
    students.forEach((s) => {
      const studentData = {
        name: s.name,
        email: s.email || null,
        isMinor: s.is_minor !== false,
        parentEmail: s.parent_email || null,
        parentName: s.parent_name || null,
        age: s.age || null
      }
      // Reusar la misma lógica de sync individual
      const isMinor = studentData.isMinor
      const extraFields = {
        tipo_alumno: isMinor ? 'menor' : 'mayor',
        nombre_alumno: studentData.name
      }
      if (studentData.age) extraFields.edad_alumno = parseInt(studentData.age, 10)

      let email = null
      let name = studentData.name
      if (isMinor) {
        email = studentData.parentEmail || studentData.email
        name = studentData.parentName || studentData.name
      } else {
        email = studentData.email
      }

      if (email) {
        syncToMailerLite({
          email,
          name,
          apiKey: settings.mailerlite_api_key,
          groupId: settings.mailerlite_group_id,
          fields: extraFields
        })
        synced++
      }
    })
    console.log('[MailerLite] Sincronización masiva enviada:', synced, 'de', students.length)
    localStorage.setItem('ml_bulk_sync_v1', Date.now().toString())
  }, [settings.mailerlite_api_key, students, studentsLoading])

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
      syncStudentToMailerLite(formData)
      resetForm()
    } else {
      toast.error(result.error)
    }
  }

  // Agregar ítem al carrito
  const handleAddToCart = () => {
    if (!saleForm.productId) return
    const product = getProductById(saleForm.productId)
    const qty = parseInt(saleForm.quantity) || 1

    // Calcular stock ya comprometido en el carrito para este producto
    const alreadyInCart = cartItems
      .filter(i => i.productId === saleForm.productId)
      .reduce((sum, i) => sum + i.quantity, 0)
    const totalRequested = alreadyInCart + qty

    if (product.stock !== null && product.stock !== undefined && product.stock < totalRequested) {
      toast.warning(`Stock insuficiente. Disponible: ${product.stock}, Ya en carrito: ${alreadyInCart}, Solicitado: ${qty}`)
      return
    }

    setCartItems(prev => [...prev, {
      productId: saleForm.productId,
      productName: product.name,
      quantity: qty,
      unitPrice: product.price
    }])
    setSaleForm(prev => ({ ...prev, productId: '', quantity: 1 }))
  }

  // Registrar venta completa (todos los ítems del carrito)
  const handleSaleSubmit = async (e) => {
    e.preventDefault()
    if (saleSubmitting) return
    if (cartItems.length === 0) {
      toast.warning('Agrega al menos un artículo al carrito')
      return
    }

    setSaleSubmitting(true)
    try {
    const result = await createSaleGroup({
      customerName: saleForm.customerName,
      items: cartItems,
      date: saleForm.date,
      notes: saleForm.notes,
      paymentMethod: saleForm.paymentMethod
    })

    if (result.success) {
      // Descontar stock por cada ítem
      for (const item of cartItems) {
        const product = getProductById(item.productId)
        if (product?.stock !== null && product?.stock !== undefined) {
          const saleRow = result.data?.find(r => r.product_id === item.productId)
          await adjustStock(item.productId, -item.quantity, 'sale', saleRow?.id || null, `Venta a ${saleForm.customerName}`)
        }
      }
      // Mostrar comprobante
      setLastSaleReceipt({
        receiptNumber: result.receiptNumber,
        customerName: saleForm.customerName,
        items: cartItems,
        total: cartItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
        date: saleForm.date,
        paymentMethod: saleForm.paymentMethod
      })
      setShowSaleReceipt(true)
      // Reset
      setCartItems([])
      setProductSearch('')
      setSaleForm({ customerName: '', productId: '', quantity: 1, date: getTodayEC(), paymentMethod: 'cash', notes: '' })
      setShowSaleForm(false)
    } else {
      toast.error(result.error)
    }
    } finally {
      setSaleSubmitting(false)
    }
  }

  // Registrar pago
  const handlePaymentComplete = async (studentId, paymentData) => {
    const result = await registerPayment(studentId, paymentData)

    if (result.success) {
      // Mostrar comprobante (incluir datos actualizados del pago)
      const student = students.find(s => s.id === studentId)
      setSelectedStudent({
        ...student,
        next_payment_date: result.data.next_payment_date ?? student.next_payment_date,
        amount_paid: result.data.newAmountPaid ?? student.amount_paid,
        balance: result.data.newBalance ?? student.balance,
        payment_status: result.data.paymentStatus ?? student.payment_status
      })
      setLastPayment(result.data)
      setShowPaymentModal(false)
      setShowReceipt(true)
      // Actualizar ingresos del día
      refreshIncome()
      // Sincronizar próximo pago a MailerLite para activar recordatorio automático
      if (result.data?.next_payment_date && settings.mailerlite_api_key) {
        const emailToSync = student?.is_minor !== false
          ? (student?.parent_email || student?.email)
          : student?.email
        if (emailToSync) {
          syncToMailerLite({
            email: emailToSync,
            name: student?.is_minor !== false ? (student?.parent_name || student?.name) : student?.name,
            apiKey: settings.mailerlite_api_key,
            groupId: settings.mailerlite_group_id,
            fields: { proximo_pago: result.data.next_payment_date }
          })
        }
      }
    } else {
      toast.error(result.error)
    }
  }

  // ── Tablón de anuncios CRUD ──
  const saveAnnouncement = async () => {
    const record = {
      title: announcementForm.title.trim(),
      body: announcementForm.body.trim(),
      color: announcementForm.color,
      pinned: announcementForm.pinned,
      expires_at: announcementForm.expires_at || null,
      active: true
    }
    if (!record.title || !record.body) return
    if (editingAnnouncement) {
      const { data } = await supabase.from('announcements').update(record).eq('id', editingAnnouncement.id).select().single()
      if (data) setAnnouncements(prev => prev.map(a => a.id === data.id ? data : a))
    } else {
      const { data } = await supabase.from('announcements').insert([record]).select().single()
      if (data) setAnnouncements(prev => [data, ...prev])
    }
    setShowAnnouncementForm(false)
    setEditingAnnouncement(null)
    setAnnouncementForm({ title: '', body: '', color: 'purple', pinned: false, expires_at: '' })
  }

  const toggleAnnouncementActive = async (id, active) => {
    await supabase.from('announcements').update({ active: !active }).eq('id', id)
    setAnnouncements(prev => prev.map(a => a.id === id ? { ...a, active: !active } : a))
  }

  const deleteAnnouncement = async (id) => {
    if (!window.confirm('¿Eliminar este anuncio?')) return
    await supabase.from('announcements').delete().eq('id', id)
    setAnnouncements(prev => prev.filter(a => a.id !== id))
  }

  const openEditAnnouncement = (a) => {
    setEditingAnnouncement(a)
    setAnnouncementForm({ title: a.title, body: a.body, color: a.color || 'purple', pinned: a.pinned || false, expires_at: a.expires_at || '' })
    setShowAnnouncementForm(true)
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
      toast.error(err.message)
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
      syncStudentToMailerLite(formData)
      setShowForm(false)
      setEditingStudent(null)
    } else {
      toast.error(result.error)
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
      name: sale.product_name + ' - ' + sale.customer_name,
      saleData: sale // guardar datos de la venta para restaurar stock
    })
  }

  // Ejecutar eliminación después de confirmar PIN
  const executeDelete = async () => {
    const { type, id, saleData } = deleteModal
    let result

    if (type === 'alumno') {
      result = await deleteStudent(id)
    } else if (type === 'venta') {
      result = await deleteSale(id)
      // Restaurar stock si la venta tenía producto con inventario
      if (result.success && saleData) {
        const product = getProductById(saleData.product_id)
        if (product && product.stock !== null && product.stock !== undefined) {
          await adjustStock(
            saleData.product_id,
            parseInt(saleData.quantity),
            'void_return',
            id,
            `Devolución por eliminación de venta`
          )
        }
      }
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
        toast.error(result.error)
      }
    } else {
      const course = getCourseById(student.course_id)
      if (!course || (course.priceType !== 'mes' && course.priceType !== 'paquete')) {
        toast.warning('Solo se pueden pausar alumnos con clases mensuales o por paquete')
        return
      }
      if (confirm(`¿Pausar 1 clase para ${student.name}?\nSe extenderá la fecha de pago.`)) {
        const result = await pauseStudent(student.id)
        if (result.success) {
          toast.success(`Pausa activada para ${student.name}. Se agregaron ${result.daysAdded} días al ciclo.`)
        } else {
          toast.error(result.error)
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
      <div className="min-h-screen flex items-center justify-center overflow-hidden relative" style={{
        background: 'linear-gradient(135deg, #5a1a3a 0%, #6b21a8 50%, #7e22ce 100%)'
      }}>
        {/* Decorative ambient circles */}
        <div className="absolute w-64 h-64 rounded-full opacity-[0.07]" style={{
          background: 'radial-gradient(circle, white 0%, transparent 70%)',
          top: '10%', left: '-8%',
        }} />
        <div className="absolute w-48 h-48 rounded-full opacity-[0.05]" style={{
          background: 'radial-gradient(circle, white 0%, transparent 70%)',
          bottom: '15%', right: '-5%',
        }} />

        <div className="text-center relative z-10">
          <img
            src="/logo2.png"
            alt="Studio Dancers"
            className="w-40 mx-auto mb-8 animate-splash-reveal animate-splash-glow"
            style={{ opacity: 0.95 }}
          />
          <p className="text-white/50 text-xs mb-6 animate-splash-text tracking-widest uppercase">
            Preparando tu espacio
          </p>
          <div className="animate-splash-bar">
            <div className="loading-bar-container">
              <div className="loading-bar"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Si no está autenticado, mostrar página de login (solo para admin normal)
  if (!isRecepcion && !isAuthenticated) {
    return <LoginPage onLogin={(user) => console.log('Logged in:', user.email)} />
  }

  if (!isRecepcion && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #faf5ff 0%, #fdf2f8 50%, #fff7ed 100%)'
      }}>
        <div className="text-center animate-fade-in">
          <img
            src="/logo2.png"
            alt="Studio Dancers"
            className="w-32 mx-auto mb-5 animate-pulse-slow"
          />
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
        <div className="text-center mb-3 animate-fade-in">
          <img
            src="/logo2.png"
            alt="Studio Dancers"
            className="object-contain mx-auto"
            style={{ width: '160px', maxWidth: '40%', height: 'auto' }}
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

            {/* Centro: Nombre + saludo */}
            <div className="text-center flex-1 min-w-0 px-2">
              <h1 className="text-base sm:text-xl md:text-2xl font-bold text-purple-800 truncate">{settings.name}</h1>
              <p className="text-gray-400 text-xs hidden sm:block truncate">
                {(() => {
                  const h = new Date().getHours()
                  return h < 12 ? 'Buenos días' : h < 18 ? 'Buenas tardes' : 'Buenas noches'
                })()}{user?.email ? ` · ${user.email.split('@')[0]}` : ''}
              </p>
            </div>

            {/* Derecha: Configuración y Logout */}
            <div className="flex items-center gap-1">
              {!isRecepcion && can('canEditSettings') && (
                <button
                  onClick={() => {
                    if (settings.security_pin) {
                      setPendingSettingsAccess(true)
                      setShowPinPrompt(true)
                    } else {
                      setShowSettings(true)
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl active:scale-95 transition-all"
                  title="Configuración"
                  aria-label="Configuración"
                >
                  <Settings size={20} />
                </button>
              )}
              {isRecepcion && (
                <span className="text-xs text-gray-500 mr-1 hidden sm:inline">{recepcionUserName}</span>
              )}
              <button
                onClick={async () => {
                  if (confirm('¿Cerrar sesión?')) {
                    if (isRecepcion && onLogout) {
                      onLogout()
                    } else {
                      await signOut()
                    }
                  }
                }}
                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl active:scale-95 transition-all"
                title={`Cerrar sesión (${isRecepcion ? recepcionUserName : user?.email})`}
                aria-label="Cerrar sesión"
              >
                <LogOut size={20} />
              </button>
            </div>
          </div>

          {/* Fila 2: Acciones principales - grid adaptable */}
          <div className="pt-3 border-t border-gray-100 space-y-5">
            {/* Acciones principales: grid 3 cols en móvil, row en desktop */}
            <div className="grid grid-cols-3 sm:flex sm:flex-wrap gap-2 sm:gap-2.5">
              <button
                onClick={() => setShowForm(true)}
                className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white px-2.5 sm:px-4 py-3 sm:py-2.5 rounded-2xl font-medium transition-all shadow-sm text-xs sm:text-sm"
              >
                <Plus size={18} />
                <span>Alumno</span>
              </button>
              <button
                onClick={() => setShowSaleForm(true)}
                className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 bg-green-600 hover:bg-green-700 active:scale-95 text-white px-2.5 sm:px-4 py-3 sm:py-2.5 rounded-2xl font-medium transition-all shadow-sm text-xs sm:text-sm"
              >
                <ShoppingBag size={18} />
                <span>Venta</span>
              </button>
              <button
                onClick={() => setShowQuickPayment(true)}
                className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white px-2.5 sm:px-4 py-3 sm:py-2.5 rounded-2xl font-medium transition-all shadow-sm text-xs sm:text-sm"
              >
                <Zap size={18} />
                <span>Pago</span>
              </button>
              <button
                onClick={() => setShowExpenses(true)}
                className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 bg-red-600 hover:bg-red-700 active:scale-95 text-white px-2.5 sm:px-4 py-3 sm:py-2.5 rounded-2xl font-medium transition-all shadow-sm text-xs sm:text-sm"
              >
                <TrendingDown size={18} />
                <span>Egreso</span>
              </button>
              <button
                onClick={() => setShowCashMovements(true)}
                className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white px-2.5 sm:px-4 py-3 sm:py-2.5 rounded-2xl font-medium transition-all shadow-sm text-xs sm:text-sm"
              >
                <ArrowLeftRight size={18} />
                <span>Movimiento</span>
              </button>
              <button
                onClick={() => setShowPaymentHistory(true)}
                className="flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 bg-purple-100 hover:bg-purple-200 active:scale-95 text-purple-700 px-2.5 sm:px-4 py-3 sm:py-2.5 rounded-2xl font-medium transition-all shadow-sm text-xs sm:text-sm"
              >
                <History size={18} />
                <span>Historial</span>
              </button>
            </div>

            {/* Herramientas secundarias */}
            <div className="flex items-center justify-center sm:justify-end gap-4 sm:gap-5 flex-wrap pt-2 mt-1 border-t border-gray-100">
              {!isRecepcion && can('canExport') && (
                <button
                  onClick={() => setShowExport(true)}
                  className="flex items-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 px-5 py-2.5 rounded-xl active:scale-95 transition-all text-sm font-medium"
                >
                  <Download size={16} />
                  Exportar
                </button>
              )}
              <button
                onClick={() => setShowTransferVerification(true)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all text-sm font-medium relative active:scale-95 ${
                  pendingTransfers > 0
                    ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg'
                    : 'bg-blue-100 hover:bg-blue-200 text-blue-700'
                }`}
              >
                <DollarSign size={16} />
                Transferencias
                {pendingTransfers > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center animate-pulse">
                    {pendingTransfers}
                  </span>
                )}
              </button>
              {!isRecepcion && isAdmin && (
                <>
                  <button
                    onClick={() => setShowMonthlyClose(true)}
                    className="flex items-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 px-5 py-2.5 rounded-xl active:scale-95 transition-all text-sm font-medium"
                  >
                    <Lock size={16} />
                    Cierre mensual
                  </button>
                  <button
                    onClick={() => setShowAuditLog(true)}
                    className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-5 py-2.5 rounded-xl active:scale-95 transition-all text-sm font-medium"
                  >
                    <ScrollText size={16} />
                    Auditoría
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 overflow-x-auto pb-1 bg-gray-100/80 rounded-2xl p-1.5">
          {[
            { id: 'students', icon: Users, label: 'Alumnos', count: students.length },
            { id: 'sales', icon: ShoppingBag, label: 'Tienda',
              count: allProducts.filter(p => p.stock !== null && p.stock !== undefined && p.stock <= 3 && p.active !== false).length || undefined,
              countColor: 'red' },
            { id: 'courses', icon: Calendar, label: 'Cursos' },
            { id: 'academico', icon: GraduationCap, label: 'Académico' },
            { id: 'expenses', icon: TrendingDown, label: 'Egresos' },
            { id: 'report', icon: BarChart3, label: 'Reporte' },
            { id: 'gallery', icon: Images, label: 'Galería' },
            { id: 'tablon', icon: Megaphone, label: 'Tablón', count: announcements.filter(a => a.active).length || undefined },
            { id: 'recepcionistas', icon: Monitor, label: 'Recepción', adminOnly: true },
          ].filter(tab => !tab.adminOnly || isAdmin)
           .filter(tab => !isRecepcion || ['students', 'sales', 'expenses', 'courses'].includes(tab.id))
          .map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 rounded-xl font-medium transition-all whitespace-nowrap text-xs sm:text-sm shrink-0 ${
                  activeTab === tab.id
                    ? 'bg-white text-purple-700 shadow-md font-semibold'
                    : 'text-gray-500 hover:bg-white/70 hover:text-purple-700 hover:shadow-sm'
                }`}
              >
                <Icon size={15} />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                    tab.countColor === 'red'
                      ? 'bg-red-500 text-white'
                      : activeTab === tab.id ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-2 sm:gap-4 mb-4 sm:mb-6">
          <div
            onClick={() => setShowCashRegister(true)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowCashRegister(true) } }}
            role="button"
            tabIndex={0}
            className="bg-white rounded-2xl shadow-md p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all border-t-2 border-green-400"
            title="Ver cuadre de caja"
            aria-label="Ver cuadre de caja"
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="bg-green-100 p-2 sm:p-3 rounded-xl shrink-0">
                <DollarSign className="text-green-600" size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1">
                  <p className="text-xl sm:text-2xl font-bold text-green-600 truncate">{hideIncome ? '$•••••' : `$${todayIncome.toFixed(2)}`}</p>
                  <button
                    onClick={(e) => { e.stopPropagation(); setHideIncome(!hideIncome) }}
                    className="p-1 text-gray-400 hover:text-gray-600 shrink-0"
                    aria-label={hideIncome ? 'Mostrar ingresos' : 'Ocultar ingresos'}
                  >
                    {hideIncome ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                <p className="text-xs sm:text-sm text-gray-500">Ingresos hoy</p>
              </div>
            </div>
          </div>

          <div
            onClick={() => {
              const target = moraStudents.length > 0 ? 'mora' : urgentCount > 0 ? 'overdue' : 'upcoming'
              setFilterPayment(target)
              setShowStudentListModal(true)
            }}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); const target = moraStudents.length > 0 ? 'mora' : urgentCount > 0 ? 'overdue' : 'upcoming'; setFilterPayment(target); setShowStudentListModal(true) } }}
            role="button"
            tabIndex={0}
            className={`bg-white rounded-2xl shadow-md p-3 sm:p-4 cursor-pointer hover:shadow-lg hover:scale-[1.02] transition-all border-t-2 ${
              moraStudents.length > 0 ? 'border-rose-600' :
              urgentCount > 0 ? 'border-red-500' : 'border-amber-400'
            }`}
            title={moraStudents.length > 0 ? 'Ver alumnas suspendidas' : urgentCount > 0 ? 'Ver alumnas por renovar' : 'Ver próximos cobros'}
          >
            <div className="flex items-center gap-2 sm:gap-3">
              <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${
                moraStudents.length > 0 ? 'bg-rose-100' : urgentCount > 0 ? 'bg-red-100' : 'bg-yellow-100'
              }`}>
                <AlertCircle className={
                  moraStudents.length > 0 ? 'text-rose-700' : urgentCount > 0 ? 'text-red-600' : 'text-yellow-600'
                } size={20} />
              </div>
              <div className="min-w-0">
                {moraStudents.length > 0 ? (
                  <>
                    <p className="text-xl sm:text-2xl font-bold text-rose-700">{moraStudents.length}</p>
                    <p className="text-xs sm:text-sm text-rose-600 font-medium">Suspendidas</p>
                  </>
                ) : urgentCount > 0 ? (
                  <>
                    <p className="text-xl sm:text-2xl font-bold text-red-600">{urgentCount}</p>
                    <p className="text-xs sm:text-sm text-red-500 font-medium">Por renovar</p>
                  </>
                ) : (
                  <>
                    <p className="text-xl sm:text-2xl font-bold text-gray-800">{upcomingPayments.length}</p>
                    <p className="text-xs sm:text-sm text-gray-500">Próximos cobros</p>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* KPI Strip — franja compacta mensual */}
        {kpis && !kpisLoading && (
          <button
            onClick={() => setShowMonthlyClose(true)}
            className="w-full bg-white border border-gray-100 rounded-2xl shadow-sm px-4 py-2.5 mb-3 flex items-center justify-between gap-2 hover:shadow-md hover:border-purple-200 transition-all text-left"
            title="Ver cierre mensual"
          >
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[10px] text-gray-400 font-medium shrink-0">MES</span>
              <span className="text-sm font-bold ml-1 text-gray-800">
                {hideIncome ? '$•••' : `$${kpis.incomeC.toFixed(0)}`}
              </span>
              {kpis.trend !== null && (
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ml-1 shrink-0 ${
                  kpis.trend >= 0
                    ? 'bg-emerald-50 text-emerald-600'
                    : 'bg-red-50 text-red-500'
                }`}>
                  {kpis.trend >= 0 ? '▲' : '▼'}{Math.abs(kpis.trend)}%
                </span>
              )}
            </div>
            <div className="h-4 w-px bg-gray-200 shrink-0" />
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[10px] text-gray-400 font-medium shrink-0">GASTOS</span>
              <span className="text-sm font-bold ml-1 text-gray-700">
                {hideIncome ? '$•••' : `$${kpis.expensesC.toFixed(0)}`}
              </span>
            </div>
            <div className="h-4 w-px bg-gray-200 shrink-0" />
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-[10px] text-gray-400 font-medium shrink-0">COBRO</span>
              {kpis.collectionRate !== null ? (
                <span className={`text-sm font-bold ml-1 ${
                  kpis.collectionRate >= 80 ? 'text-emerald-600'
                  : kpis.collectionRate >= 50 ? 'text-amber-500'
                  : 'text-red-500'
                }`}>
                  {kpis.collectionRate}%
                </span>
              ) : (
                <span className="text-sm font-bold ml-1 text-gray-400">—</span>
              )}
            </div>
            <span className="text-gray-300 text-xs shrink-0">›</span>
          </button>
        )}

        {/* Global Search Bar */}
        <div className="mb-3 sm:mb-4">
          <div className="flex items-center gap-2.5 bg-white border-2 border-gray-200 rounded-2xl shadow-sm px-4 py-2.5 focus-within:border-purple-400 focus-within:ring-2 focus-within:ring-purple-100 focus-within:shadow-md transition-all">
            <Search className="text-purple-400 shrink-0" size={16} />
            <input
              ref={globalSearchRef}
              type="text"
              placeholder="Buscar alumno... (Ctrl+K)"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                if (e.target.value && activeTab !== 'students') {
                  setActiveTab('students')
                }
                if (e.target.value) {
                  setShowStudentListModal(true)
                }
              }}
              className="w-full text-sm outline-none bg-transparent placeholder:text-gray-400"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors shrink-0"
                title="Limpiar búsqueda"
                aria-label="Limpiar búsqueda"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Students Tab - Clean Dashboard */}
        {activeTab === 'students' && (
          <>
            {/* Quick Access Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4 mb-6">
              {/* View Students Button */}
              <button
                onClick={() => setShowStudentListModal(true)}
                className="bg-white rounded-2xl shadow-sm p-3 sm:p-5 hover:shadow-md transition-all border-t-2 border-purple-400"
              >
                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-center sm:text-left">
                  <div className="bg-purple-100 p-2 sm:p-3 rounded-xl shrink-0">
                    <Users className="text-purple-600" size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-lg sm:text-3xl font-bold text-purple-600">{students.length}</p>
                    <p className="text-[10px] sm:text-sm text-gray-500 font-medium truncate">Alumnos</p>
                  </div>
                </div>
              </button>

              {/* Upcoming Payments */}
              <button
                onClick={() => { setFilterPayment('upcoming'); setShowStudentListModal(true) }}
                className="bg-white rounded-2xl shadow-sm p-3 sm:p-5 hover:shadow-md transition-all border-t-2 border-amber-400"
              >
                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-center sm:text-left">
                  <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0).length > 0 ? 'bg-amber-100' : 'bg-gray-100'}`}>
                    <Calendar className={upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0).length > 0 ? 'text-amber-600' : 'text-gray-400'} size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-lg sm:text-3xl font-bold ${upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0).length > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
                      {upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0).length}
                    </p>
                    <p className="text-[10px] sm:text-sm text-gray-500 font-medium truncate">Próximos</p>
                  </div>
                </div>
              </button>

              {/* Balance Alerts */}
              <button
                onClick={() => studentsWithBalance.length > 0 && setShowBalanceAlerts(true)}
                className="bg-white rounded-2xl shadow-sm p-3 sm:p-5 hover:shadow-md transition-all border-t-2 border-orange-400"
              >
                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-center sm:text-left">
                  <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${studentsWithBalance.length > 0 ? 'bg-orange-100' : 'bg-gray-100'}`}>
                    <Wallet className={studentsWithBalance.length > 0 ? 'text-orange-600' : 'text-gray-400'} size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-lg sm:text-3xl font-bold ${studentsWithBalance.length > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
                      {studentsWithBalance.length}
                    </p>
                    <p className="text-[10px] sm:text-sm text-gray-500 font-medium truncate">Saldos</p>
                  </div>
                </div>
              </button>

              {/* Inactive Students */}
              <button
                onClick={() => { setFilterPayment('inactive'); setShowStudentListModal(true) }}
                className="bg-white rounded-2xl shadow-sm p-3 sm:p-5 hover:shadow-md transition-all border-t-2 border-slate-300"
              >
                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-3 text-center sm:text-left">
                  <div className={`p-2 sm:p-3 rounded-xl shrink-0 ${inactiveStudents.length > 0 ? 'bg-slate-200' : 'bg-gray-100'}`}>
                    <Pause className={inactiveStudents.length > 0 ? 'text-slate-600' : 'text-gray-400'} size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className={`text-lg sm:text-3xl font-bold ${inactiveStudents.length > 0 ? 'text-slate-600' : 'text-gray-400'}`}>
                      {inactiveStudents.length}
                    </p>
                    <p className="text-[10px] sm:text-sm text-gray-500 font-medium truncate">Inactivas</p>
                  </div>
                </div>
              </button>
            </div>

            {/* Alumnas Suspendidas Alert — mora, no pueden asistir */}
            {moraStudents.length > 0 && (
              <div
                onClick={() => { setFilterPayment('mora'); setShowStudentListModal(true) }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilterPayment('mora'); setShowStudentListModal(true) } }}
                role="button"
                tabIndex={0}
                className="bg-gradient-to-r from-rose-50 to-pink-50 border border-rose-300 rounded-xl p-4 mb-4 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-rose-800 flex items-center gap-2">
                    <AlertCircle size={18} />
                    Suspendidas — No pueden asistir
                  </h3>
                  <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full text-xs font-bold">
                    {moraStudents.length} alumna{moraStudents.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {moraStudents.slice(0, 3).map(s => {
                    const course = enrichCourse(getCourseById(s.course_id))
                    const days = Math.abs(getDaysUntilDue(s.next_payment_date))
                    const { contactName, contactPhone, contactRelation } = getContactInfo(s)
                    return (
                      <div key={s.id} className="flex items-center gap-2 bg-white/90 border-l-4 border-rose-500 rounded-r-xl pl-3 pr-2 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-800 truncate">{s.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {course?.name || 'Sin curso'}
                            {contactRelation !== 'Alumna' && (
                              <span className="ml-1.5 text-rose-600">· {contactRelation}: {contactName}</span>
                            )}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] font-bold bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full">{days}d mora</span>
                        <button
                          onClick={e => { e.stopPropagation(); if (!contactPhone) { toast.warning('Sin teléfono registrado'); return }; openWhatsApp(contactPhone, buildReminderMessage(s, course?.name || 'N/A', getDaysUntilDue(s.next_payment_date), settings, graceDays, moraDays, (course?.ageMin ?? 0) >= 18)) }}
                          className="shrink-0 p-1.5 text-green-500 hover:bg-green-100 rounded-xl active:scale-95 transition-all"
                          title={`Enviar aviso de suspensión a ${contactRelation}`}
                          aria-label={`Enviar aviso de suspensión a ${contactRelation}`}
                        >
                          <MessageCircle size={13} />
                        </button>
                      </div>
                    )
                  })}
                  {moraStudents.length > 3 && (
                    <p className="text-xs text-rose-600 text-center pt-1">
                      +{moraStudents.length - 3} más · Toca para ver todas
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Cobros Vencidos Alert */}
            {overduePayments.length > 0 && (
              <div
                onClick={() => { setFilterPayment('overdue'); setShowStudentListModal(true) }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilterPayment('overdue'); setShowStudentListModal(true) } }}
                role="button"
                tabIndex={0}
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
                <div className="space-y-1.5">
                  {overduePayments.slice(0, 3).map(s => {
                    const course = enrichCourse(getCourseById(s.course_id))
                    const days = Math.abs(getDaysUntilDue(s.next_payment_date))
                    const { contactName, contactPhone, contactRelation } = getContactInfo(s)
                    return (
                      <div key={s.id} className="flex items-center gap-2 bg-white/90 border-l-4 border-red-400 rounded-r-xl pl-3 pr-2 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-800 truncate">{s.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {course?.name || 'Sin curso'}
                            {contactRelation !== 'Alumna' && (
                              <span className="ml-1.5 text-red-500">· {contactRelation}: {contactName}</span>
                            )}
                          </p>
                        </div>
                        <span className="shrink-0 text-[11px] font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{days}d vencido</span>
                        <button
                          onClick={e => { e.stopPropagation(); const { contactPhone } = getContactInfo(s); if (!contactPhone) { toast.warning('Sin teléfono registrado'); return }; openWhatsApp(contactPhone, buildReminderMessage(s, course?.name || 'N/A', getDaysUntilDue(s.next_payment_date), settings, graceDays, moraDays, (course?.ageMin ?? 0) >= 18)) }}
                          className="shrink-0 p-1.5 text-green-500 hover:bg-green-100 rounded-xl active:scale-95 transition-all"
                          title="Enviar recordatorio WhatsApp"
                          aria-label="Enviar recordatorio WhatsApp"
                        >
                          <MessageCircle size={13} />
                        </button>
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

            {/* Alumnas Inactivas Alert */}
            {inactiveStudents.length > 0 && (
              <div
                onClick={() => { setFilterPayment('inactive'); setShowStudentListModal(true) }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilterPayment('inactive'); setShowStudentListModal(true) } }}
                role="button"
                tabIndex={0}
                className="bg-gradient-to-r from-gray-50 to-slate-50 border border-gray-300 rounded-xl p-4 mb-4 cursor-pointer hover:shadow-md transition-all"
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                    <Pause size={18} />
                    Alumnas Inactivas
                  </h3>
                  <span className="bg-gray-200 text-gray-700 px-2 py-0.5 rounded-full text-xs font-bold">
                    {inactiveStudents.length} alumna{inactiveStudents.length !== 1 ? 's' : ''}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {inactiveStudents.slice(0, 3).map(s => {
                    const course = getCourseById(s.course_id)
                    const days = Math.abs(getDaysUntilDue(s.next_payment_date))
                    return (
                      <div key={s.id} className="flex items-center gap-2 bg-white/90 border-l-4 border-slate-300 rounded-r-xl pl-3 pr-3 py-2.5">
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-800 truncate">{s.name}</p>
                          <p className="text-xs text-gray-500 truncate">{course?.name || 'Sin curso'}</p>
                        </div>
                        <span className="shrink-0 text-[11px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">{days}d sin pagar</span>
                      </div>
                    )
                  })}
                  {inactiveStudents.length > 3 && (
                    <p className="text-xs text-gray-500 text-center pt-1">
                      +{inactiveStudents.length - 3} más · Toca para ver todas
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Cobros Próximos Alert */}
            {upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0).length > 0 && (
              <div
                onClick={() => { setFilterPayment('upcoming'); setShowStudentListModal(true) }}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFilterPayment('upcoming'); setShowStudentListModal(true) } }}
                role="button"
                tabIndex={0}
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
                <div className="space-y-1.5">
                  {upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0).slice(0, 3).map(s => {
                    const course = enrichCourse(getCourseById(s.course_id))
                    const days = getDaysUntilDue(s.next_payment_date)
                    const { contactName, contactRelation } = getContactInfo(s)
                    return (
                      <div key={s.id} className={`flex items-center gap-2 bg-white/90 border-l-4 rounded-r-xl pl-3 pr-2 py-2.5 ${days === 0 ? 'border-orange-400' : 'border-amber-300'}`}>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-800 truncate">{s.name}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {course?.name || 'Sin curso'}
                            {contactRelation !== 'Alumna' && (
                              <span className="ml-1.5 text-amber-600">· {contactRelation}: {contactName}</span>
                            )}
                          </p>
                        </div>
                        <span className={`shrink-0 text-[11px] font-bold px-2 py-0.5 rounded-full ${days === 0 ? 'bg-orange-100 text-orange-700' : 'bg-amber-100 text-amber-700'}`}>
                          {days === 0 ? 'Hoy' : `${days}d`}
                        </span>
                        <button
                          onClick={e => { e.stopPropagation(); const { contactPhone } = getContactInfo(s); if (!contactPhone) { toast.warning('Sin teléfono registrado'); return }; openWhatsApp(contactPhone, buildReminderMessage(s, course?.name || 'N/A', days, settings, graceDays, moraDays, (course?.ageMin ?? 0) >= 18)) }}
                          className="shrink-0 p-1.5 text-green-500 hover:bg-green-100 rounded-xl active:scale-95 transition-all"
                          title="Enviar recordatorio WhatsApp"
                          aria-label="Enviar recordatorio WhatsApp"
                        >
                          <MessageCircle size={13} />
                        </button>
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
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setShowBalanceAlerts(true) } }}
                role="button"
                tabIndex={0}
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
                <div className="space-y-1.5">
                  {studentsWithBalance.slice(0, 3).map(s => (
                    <div key={s.id} className="flex items-center gap-2 bg-white/90 border-l-4 border-orange-300 rounded-r-xl pl-3 pr-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 truncate">{s.name}</p>
                        <p className="text-xs text-gray-500 truncate">{s.courseName}</p>
                      </div>
                      <span className="shrink-0 text-sm font-bold bg-orange-100 text-orange-700 px-2.5 py-0.5 rounded-full">${s.balance.toFixed(2)}</span>
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

            {/* Recordatorios de pago — WhatsApp masivo */}
            {(() => {
              const reminderStudents = [
                ...overduePayments,
                ...upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0)
              ].filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i)
                .sort((a, b) => getDaysUntilDue(a.next_payment_date) - getDaysUntilDue(b.next_payment_date))
              if (reminderStudents.length === 0) return null
              const currentStudentInQueue = reminderQueueIdx !== null ? reminderStudents[reminderQueueIdx] : null
              return (
                <div className="bg-white border border-green-200 rounded-xl overflow-hidden mb-4">
                  <button
                    onClick={() => { setShowReminders(v => !v); setReminderQueueIdx(null) }}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-green-50 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <MessageCircle size={17} className="text-green-600" />
                      <span className="font-semibold text-gray-800 text-sm">Recordatorios de pago</span>
                      <span className="bg-green-100 text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{reminderStudents.length}</span>
                    </div>
                    {showReminders ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </button>

                  {showReminders && (
                    <div className="border-t border-green-100 p-3 space-y-2">
                      {/* Sequential mode banner */}
                      {reminderQueueIdx !== null && currentStudentInQueue && (
                        <div className="bg-green-50 border border-green-200 rounded-xl p-3 mb-2">
                          <p className="text-xs text-green-600 font-medium mb-1">
                            Modo secuencial · {reminderQueueIdx + 1} de {reminderStudents.length}
                          </p>
                          <p className="font-semibold text-gray-800">{currentStudentInQueue.name}</p>
                          <p className="text-xs text-gray-500 mb-3">{enrichCourse(getCourseById(currentStudentInQueue.course_id))?.name}</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                const phone = currentStudentInQueue.payer_phone || currentStudentInQueue.parent_phone || currentStudentInQueue.phone
                                if (!phone) { toast.warning('Sin teléfono registrado'); return }
                                const course = enrichCourse(getCourseById(currentStudentInQueue.course_id))
                                const days = getDaysUntilDue(currentStudentInQueue.next_payment_date)
                                openWhatsApp(phone, buildReminderMessage(currentStudentInQueue, course?.name || 'N/A', days, settings, graceDays, moraDays, (course?.ageMin ?? 0) >= 18))
                                setTimeout(() => setReminderQueueIdx(i => i + 1 < reminderStudents.length ? i + 1 : null), 800)
                              }}
                              className="flex-1 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
                            >
                              <MessageCircle size={15} /> Abrir WhatsApp
                            </button>
                            <button
                              onClick={() => setReminderQueueIdx(i => i + 1 < reminderStudents.length ? i + 1 : null)}
                              className="px-3 py-2.5 rounded-xl border border-gray-200 text-sm text-gray-600 hover:bg-gray-50"
                            >
                              Saltar
                            </button>
                            <button
                              onClick={() => setReminderQueueIdx(null)}
                              className="px-3 py-2.5 rounded-xl border border-red-200 text-sm text-red-500 hover:bg-red-50"
                              aria-label="Detener modo secuencial"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Student list */}
                      {reminderStudents.map((s, idx) => {
                        const course = enrichCourse(getCourseById(s.course_id))
                        const days = getDaysUntilDue(s.next_payment_date)
                        const isOverdue = days < 0
                        const isActive = reminderQueueIdx === idx
                        return (
                          <div key={s.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isActive ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                              <p className="text-xs text-gray-500 truncate">{course?.name || 'Sin curso'}</p>
                            </div>
                            <span className={`text-xs font-bold shrink-0 ${isOverdue ? 'text-red-500' : 'text-amber-500'}`}>
                              {isOverdue ? `${Math.abs(days)}d vencido` : days === 0 ? 'Hoy' : `${days}d`}
                            </span>
                            <button
                              onClick={() => {
                                const phone = s.payer_phone || s.parent_phone || s.phone
                                if (!phone) { toast.warning('Sin teléfono registrado'); return }
                                openWhatsApp(phone, buildReminderMessage(s, course?.name || 'N/A', days, settings, graceDays, moraDays, (course?.ageMin ?? 0) >= 18))
                              }}
                              className="p-1.5 text-green-600 hover:bg-green-100 rounded-xl active:scale-95 transition-all shrink-0"
                              title="Enviar recordatorio"
                              aria-label="Enviar recordatorio WhatsApp"
                            >
                              <MessageCircle size={15} />
                            </button>
                          </div>
                        )
                      })}

                      {/* Send all button */}
                      {reminderQueueIdx === null && (
                        <button
                          onClick={() => setReminderQueueIdx(0)}
                          className="w-full flex items-center justify-center gap-2 mt-1 py-2.5 rounded-xl border border-green-300 text-green-700 text-sm font-medium hover:bg-green-50 transition-colors"
                        >
                          <Send size={14} /> Enviar a todos en secuencia
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )
            })()}

            {/* Empty state when no alerts */}
            {overduePayments.length === 0 && inactiveStudents.length === 0 && upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0).length === 0 && studentsWithBalance.length === 0 && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-6 text-center">
                <Check size={32} className="mx-auto mb-2 text-green-500" />
                <p className="font-medium text-green-800">Todo al día</p>
                <p className="text-sm text-green-600 mt-1">No hay cobros pendientes. Buen trabajo del equipo.</p>
              </div>
            )}
          </>
        )}

        {/* Sales Tab */}
        {activeTab === 'sales' && (() => {
          const todayStr = getTodayEC()
          const todayDate = new Date(todayStr + 'T12:00:00')
          const filteredSales = sales.filter(s => {
            if (salesDateFilter === 'today') return s.sale_date === todayStr
            if (salesDateFilter === 'week') {
              const d = new Date(s.sale_date + 'T12:00:00')
              return (todayDate - d) / 86400000 <= 6
            }
            if (salesDateFilter === 'month') {
              return s.sale_date.startsWith(todayStr.slice(0, 7))
            }
            return true
          })
          const filteredTotal = filteredSales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0)
          const filterLabels = { today: 'Hoy', week: '7 días', month: 'Este mes', all: 'Historial' }
          return (
          <div className="space-y-4">

          {/* Ventas en Abonos — primero porque es gestión diaria */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-800">Ventas en Abonos</h2>
              <p className="text-sm text-gray-500">Planes de pago · uniformes, vestuario, entradas</p>
            </div>
            <div className="p-4">
              <SaleInstallments
                allProducts={allProducts}
                students={students}
                schoolName={settings?.school_name || 'Studio Dancers'}
                activePlans={activePlans}
                paidPlans={paidPlans}
                totalDebt={totalDebt}
                loading={plansLoading}
                dbError={plansDbError}
                onRefresh={refreshPlans}
                onCreatePlan={createPlan}
                onRegisterPayment={registerPlanPayment}
                onCancelPlan={cancelPlan}
                onDeletePlan={deletePlan}
                onUpdatePlanTotal={updatePlanTotal}
                onMarkDelivered={markDelivered}
                externalShowNew={showNewPlan}
                externalPreselect={newPlanPreselect}
                onExternalClose={() => { setShowNewPlan(false); setNewPlanPreselect(null) }}
              />
            </div>
          </div>

          {/* Ventas de Artículos — catálogo + historial */}
          <div className="bg-white rounded-xl shadow overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-semibold text-gray-800">Ventas de Artículos</h2>
                  <p className="text-sm text-gray-500">
                    {filteredSales.length} venta{filteredSales.length !== 1 ? 's' : ''} · Total: <span className="font-semibold text-green-700">${filteredTotal.toFixed(2)}</span>
                    <span className="text-gray-400 ml-1">({filterLabels[salesDateFilter]})</span>
                  </p>
                </div>
              </div>
              <div className="flex gap-1.5 flex-wrap">
                {[
                  { value: 'today', label: 'Hoy' },
                  { value: 'week', label: '7 días' },
                  { value: 'month', label: 'Este mes' },
                  { value: 'all', label: 'Todo' },
                ].map(f => (
                  <button
                    key={f.value}
                    onClick={() => setSalesDateFilter(f.value)}
                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                      salesDateFilter === f.value
                        ? 'bg-green-600 text-white shadow-sm'
                        : 'bg-white text-gray-500 border border-gray-200 hover:border-green-300 hover:text-green-700'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Catálogo por categoría */}
            {(() => {
              const CATS = [
                { key: 'entradas',  label: 'Entradas' },
                { key: 'vestuario', label: 'Vestuario' },
                { key: 'uniformes', label: 'Uniformes' },
                { key: 'bar',       label: 'Bar' },
              ]
              const catKeys = CATS.map(c => c.key)
              const categorized = CATS.map(cat => ({
                ...cat,
                products: allProducts.filter(p => p.category === cat.key)
              })).filter(c => c.products.length > 0)
              const otros = allProducts.filter(p => !catKeys.includes(p.category))
              if (otros.length > 0) categorized.push({ key: 'otros', label: 'Otros', products: otros })

              const toggleCat = (key) => setCollapsedCats(prev => {
                const next = new Set(prev)
                if (next.has(key)) next.delete(key); else next.add(key)
                return next
              })

              return (
                <div className="p-4 border-b space-y-2">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-700 flex items-center gap-2 text-sm">
                      <Tag size={15} /> Catálogo
                    </h3>
                    {isAdmin && (
                      <button onClick={() => setShowManageItems(true)}
                        className="text-xs text-purple-600 hover:text-purple-700 flex items-center gap-1 font-medium">
                        <Package size={13} /> Gestionar
                      </button>
                    )}
                  </div>
                  {categorized.map(cat => {
                    const collapsed = collapsedCats.has(cat.key)
                    return (
                    <div key={cat.key} className="border border-gray-100 rounded-2xl overflow-hidden">
                      <button type="button" onClick={() => toggleCat(cat.key)}
                        className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 transition-colors">
                        <span className="text-sm font-semibold text-gray-700">
                          {cat.label}
                          <span className="ml-2 text-xs font-normal text-gray-400">{cat.products.length} {cat.products.length === 1 ? 'artículo' : 'artículos'}</span>
                        </span>
                        <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`} />
                      </button>
                      {!collapsed && (
                      <div className="p-3">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                        {cat.products.map(product => {
                          const hasStock = product.stock !== null && product.stock !== undefined
                          const outOfStock = hasStock && product.stock === 0
                          const lowStock = hasStock && product.stock > 0 && product.stock <= 3
                          return (
                            <div key={product.id}
                              className={`bg-white rounded-2xl border p-3 shadow-sm flex flex-col gap-2 ${outOfStock ? 'opacity-50' : 'hover:shadow-md transition-shadow'}`}>
                              <div>
                                <p className="text-sm font-semibold text-gray-800 leading-tight">{product.name}</p>
                                <div className="flex items-center gap-1.5 mt-1">
                                  <span className="text-green-600 font-bold text-sm">${product.price}</span>
                                  {hasStock && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                                      outOfStock ? 'bg-red-100 text-red-600' :
                                      lowStock   ? 'bg-amber-100 text-amber-700' :
                                                   'bg-blue-50 text-blue-600'
                                    }`}>
                                      {outOfStock ? 'Agotado' : `${product.stock} ud`}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-1 mt-auto">
                                <button
                                  disabled={outOfStock}
                                  onClick={() => { setSaleForm(f => ({ ...f, productId: product.id })); setShowSaleForm(true) }}
                                  className="flex-1 py-1.5 text-[11px] font-semibold rounded-xl bg-green-600 text-white hover:bg-green-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors">
                                  Vender
                                </button>
                                <button
                                  onClick={() => {
                                    setNewPlanPreselect(product)
                                    setShowNewPlan(true)
                                  }}
                                  className="flex-1 py-1.5 text-[11px] font-semibold rounded-xl border-2 border-purple-300 text-purple-700 hover:bg-purple-50 transition-colors">
                                  Abonar
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      </div>
                      )}
                    </div>
                    )
                  })}
                </div>
              )
            })()}

            {filteredSales.length === 0 ? (
              <div className="p-12 text-center text-gray-500">
                <ShoppingBag size={48} className="mx-auto mb-4 opacity-50" />
                <p>{salesDateFilter === 'today' ? 'Sin ventas hoy' : salesDateFilter === 'week' ? 'Sin ventas esta semana' : salesDateFilter === 'month' ? 'Sin ventas este mes' : 'No hay ventas registradas'}</p>
                <button
                  onClick={() => setShowSaleForm(true)}
                  className="mt-4 text-green-600 hover:text-green-700 font-medium"
                >
                  Registrar primera venta
                </button>
              </div>
            ) : (
              <div className="divide-y">
                {(() => {
                  // Agrupar ventas: agrupadas por sale_group_id, o individuales (null)
                  const groups = []
                  const seen = new Set()
                  for (const sale of filteredSales) {
                    if (sale.sale_group_id) {
                      if (seen.has(sale.sale_group_id)) continue
                      seen.add(sale.sale_group_id)
                      const items = filteredSales.filter(s => s.sale_group_id === sale.sale_group_id)
                      groups.push({ isGroup: true, id: sale.sale_group_id, items, sale })
                    } else {
                      groups.push({ isGroup: false, id: sale.id, items: [sale], sale })
                    }
                  }
                  return groups.map(group => {
                    const groupTotal = group.items.reduce((s, i) => s + parseFloat(i.total || 0), 0)
                    return (
                      <div key={group.id} className="p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            {group.isGroup ? (
                              <div className="space-y-0.5">
                                {group.items.map((item, i) => (
                                  <p key={i} className="text-sm text-gray-800">
                                    {item.product_name} <span className="text-gray-500">×{item.quantity}</span>
                                    <span className="text-gray-500 ml-1">${parseFloat(item.total).toFixed(2)}</span>
                                  </p>
                                ))}
                              </div>
                            ) : (
                              <p className="font-medium text-gray-800">{group.sale.product_name} ×{group.sale.quantity}</p>
                            )}
                            <p className="text-xs text-gray-500 mt-1">Cliente: {group.sale.customer_name}</p>
                            <p className="text-xs text-gray-400">{formatDate(group.sale.sale_date)}{group.sale.receipt_number && <span className="ml-2 text-purple-400">{group.sale.receipt_number}</span>}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <p className="font-bold text-green-600">${groupTotal.toFixed(2)}</p>
                            {group.sale.receipt_number && (
                              <button
                                onClick={() => {
                                  setLastSaleReceipt({
                                    receiptNumber: group.sale.receipt_number,
                                    customerName: group.sale.customer_name,
                                    items: group.items.map(i => ({ productName: i.product_name, quantity: i.quantity, unitPrice: i.unit_price })),
                                    total: groupTotal,
                                    date: group.sale.sale_date,
                                    paymentMethod: group.sale.payment_method || 'cash'
                                  })
                                  setShowSaleReceipt(true)
                                }}
                                className="p-1.5 text-purple-500 hover:text-purple-700 hover:bg-purple-50 rounded-xl active:scale-95 transition-all"
                                title="Ver comprobante"
                                aria-label="Ver comprobante"
                              >
                                <ScrollText size={16} />
                              </button>
                            )}
                            <button
                              onClick={() => group.items.forEach(i => handleDeleteSale(i))}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl active:scale-95 transition-all"
                              title="Anular venta"
                              aria-label="Anular venta"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </div>

          </div>
          )
        })()}

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Cursos y Programas</h2>
                <p className="text-sm text-gray-400">{allCourses.length} curso{allCourses.length !== 1 ? 's' : ''} activo{allCourses.length !== 1 ? 's' : ''}</p>
              </div>
              {isAdmin && (
                <button
                  onClick={() => setShowManageItems(true)}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-2xl font-medium transition-all shadow-sm hover:shadow-md active:scale-95 text-sm"
                >
                  <Package size={16} />
                  Gestionar
                </button>
              )}
            </div>

            {/* All Courses - Dynamic */}
            {(() => {
              const regular = allCourses.filter(c => (c.priceType || c.price_type) === 'mes' || (c.priceType || c.price_type) === 'clase')
              const programs = allCourses.filter(c => (c.priceType || c.price_type) === 'programa' || (c.priceType || c.price_type) === 'paquete')
              return (
                <>
                  {regular.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6">
                      <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-purple-500 inline-block" />
                        Clases Regulares
                      </h2>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {regular.map(course => {
                          const enrolledCount = students.filter(s => s.course_id === (course.id || course.code)).length
                          return (
                            <div key={course.id || course.code} className="border-t-2 border-purple-400 rounded-2xl p-4 bg-gray-50 hover:shadow-md transition-all">
                              <h3 className="font-semibold text-purple-700 leading-tight">{course.name}</h3>
                              <p className="text-xs text-gray-400 mt-0.5">{course.schedule || 'Sin horario definido'}</p>
                              <div className="flex items-center justify-between mt-3">
                                <p className="text-lg font-bold text-emerald-600">
                                  ${course.price}<span className="text-xs font-normal text-gray-400">/{(course.priceType || course.price_type) === 'mes' ? 'mes' : 'clase'}</span>
                                </p>
                                <span className="text-xs font-semibold bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">
                                  {enrolledCount} alumna{enrolledCount !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                  {programs.length > 0 && (
                    <div className="bg-white rounded-2xl shadow-md p-4 sm:p-6">
                      <h2 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
                        Programas
                      </h2>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {programs.map(course => {
                          const enrolledCount = students.filter(s => s.course_id === (course.id || course.code)).length
                          return (
                            <div key={course.id || course.code} className="border-t-2 border-orange-400 rounded-2xl p-4 bg-orange-50/40 hover:shadow-md transition-all">
                              <h3 className="font-semibold text-orange-700 leading-tight">{course.name}</h3>
                              <p className="text-xs text-gray-400 mt-0.5">
                                {(course.ageMin || course.age_min)} - {(course.ageMax || course.age_max)} años
                                {course.schedule && ` · ${course.schedule}`}
                              </p>
                              <div className="flex items-center justify-between mt-3">
                                <div>
                                  <p className="text-lg font-bold text-emerald-600">${course.price}</p>
                                  {(course.allowsInstallments || course.allows_installments) && (
                                    <p className="text-[11px] text-orange-500">{course.installmentCount || course.installment_count || 2} cuotas</p>
                                  )}
                                </div>
                                <span className="text-xs font-semibold bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                                  {enrolledCount} inscrito{enrolledCount !== 1 ? 's' : ''}
                                </span>
                              </div>
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
              <div>
                <h2 className="text-lg font-semibold text-gray-800">Egresos del día</h2>
                <p className="text-sm text-gray-400">{new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              </div>
              <div className="flex items-center gap-2">
                {!isRecepcion && (
                  <button
                    onClick={() => setShowManageCategories(true)}
                    className="flex items-center gap-2 bg-purple-100 hover:bg-purple-200 text-purple-700 px-3 py-2 rounded-xl font-medium transition-colors text-sm"
                  >
                    <Palette size={16} />
                    Categorías
                  </button>
                )}
                <button
                  onClick={() => setShowExpenses(true)}
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-2xl font-medium transition-all shadow-sm hover:shadow-md active:scale-95 text-sm"
                >
                  <TrendingDown size={16} />
                  Registrar Egreso
                </button>
              </div>
            </div>
            <div className="bg-white rounded-2xl shadow-md border-t-2 border-red-400 p-6 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
                <TrendingDown className="text-red-400" size={28} />
              </div>
              <p className="text-3xl font-bold text-red-600 mb-1">-${todayExpensesTotal.toFixed(2)}</p>
              <p className="text-gray-400 text-sm">Total egresos de hoy</p>
              <button
                onClick={() => setShowExpenses(true)}
                className="mt-4 px-4 py-2 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 text-sm font-medium transition-colors"
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

        {/* Gallery Tab */}
        {activeTab === 'gallery' && (
          <div className="bg-white rounded-xl shadow p-4 sm:p-6">
            <GalleryManager />
          </div>
        )}

        {/* ── Área Académica ── */}
        {activeTab === 'academico' && (
          <div>
            {/* Sub-barra académica */}
            <div className="flex gap-1 mb-5 bg-purple-50 rounded-xl p-1 border border-purple-100 overflow-x-auto">
              {[
                { id: 'instructoras',  icon: GraduationCap, label: 'Instructoras' },
                { id: 'ciclos',        icon: History,       label: 'Ciclos' },
                { id: 'reportes',      icon: FileText,      label: 'Reportes de ciclo' },
              ].map(sub => {
                const Icon = sub.icon
                return (
                  <button
                    key={sub.id}
                    onClick={() => setActiveAcademicTab(sub.id)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                      activeAcademicTab === sub.id
                        ? 'bg-purple-600 text-white shadow-sm'
                        : 'text-purple-600 hover:bg-purple-100'
                    }`}
                  >
                    <Icon size={14} />
                    {sub.label}
                  </button>
                )
              })}
            </div>

            {/* Contenido según sub-tab */}
            {activeAcademicTab === 'instructoras' && (
              <InstructorManager allCourses={allCourses} securityPin={settings.security_pin} settings={settings} />
            )}
            {activeAcademicTab === 'ciclos' && (
              <ClasesAdultasManager />
            )}
            {activeAcademicTab === 'reportes' && (
              <ReportesManager />
            )}
          </div>
        )}

        {/* Tablón Tab */}
        {activeTab === 'tablon' && (() => {
          const COLORS = [
            { id: 'purple', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300', label: 'Morado' },
            { id: 'blue',   bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-300',   label: 'Azul' },
            { id: 'green',  bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-300',  label: 'Verde' },
            { id: 'amber',  bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-300',  label: 'Amarillo' },
            { id: 'rose',   bg: 'bg-rose-100',   text: 'text-rose-700',   border: 'border-rose-300',   label: 'Rosa' },
          ]
          const colorCfg = (id) => COLORS.find(c => c.id === id) || COLORS[0]
          return (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Megaphone size={20} className="text-purple-600" />
                  <h2 className="text-lg font-semibold text-gray-800">Tablón de anuncios</h2>
                  <span className="text-xs text-gray-500">{announcements.filter(a => a.active).length} activos</span>
                </div>
                <button
                  onClick={() => { setEditingAnnouncement(null); setAnnouncementForm({ title: '', body: '', color: 'purple', pinned: false, expires_at: '' }); setShowAnnouncementForm(true) }}
                  className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl text-sm font-medium transition-colors"
                >
                  <Plus size={15} /> Nuevo aviso
                </button>
              </div>

              {/* Create/Edit form */}
              {showAnnouncementForm && (
                <div className="bg-white rounded-xl shadow border border-purple-100 p-4 space-y-3">
                  <h3 className="font-semibold text-gray-800 text-sm">{editingAnnouncement ? 'Editar aviso' : 'Nuevo aviso'}</h3>
                  <input
                    type="text"
                    value={announcementForm.title}
                    onChange={e => setAnnouncementForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Título del aviso *"
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-500 outline-none transition-all"
                  />
                  <textarea
                    value={announcementForm.body}
                    onChange={e => setAnnouncementForm(f => ({ ...f, body: e.target.value }))}
                    placeholder="Contenido del aviso *"
                    rows={3}
                    className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-4 focus:ring-purple-100 focus:border-purple-500 resize-none outline-none transition-all"
                  />
                  {/* Color picker */}
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5 font-medium">Color</p>
                    <div className="flex gap-2 flex-wrap">
                      {COLORS.map(c => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => setAnnouncementForm(f => ({ ...f, color: c.id }))}
                          className={`px-3 py-1 rounded-full text-xs font-semibold border-2 transition-all ${c.bg} ${c.text} ${announcementForm.color === c.id ? c.border + ' shadow-sm scale-105' : 'border-transparent'}`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-4 items-center flex-wrap">
                    {/* Pinned toggle */}
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={announcementForm.pinned}
                        onChange={e => setAnnouncementForm(f => ({ ...f, pinned: e.target.checked }))}
                        className="w-4 h-4 accent-purple-600"
                      />
                      <span className="text-sm text-gray-700 flex items-center gap-1"><Pin size={13} /> Fijar al tope</span>
                    </label>
                    {/* Expiry */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-gray-600">Vence:</label>
                      <input
                        type="date"
                        value={announcementForm.expires_at}
                        onChange={e => setAnnouncementForm(f => ({ ...f, expires_at: e.target.value }))}
                        className="px-2 py-1 border-2 border-gray-200 rounded-xl text-xs focus:ring-4 focus:ring-purple-100 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={saveAnnouncement}
                      disabled={!announcementForm.title.trim() || !announcementForm.body.trim()}
                      className="flex-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white py-2 rounded-xl text-sm font-medium transition-colors"
                    >
                      {editingAnnouncement ? 'Guardar cambios' : 'Publicar aviso'}
                    </button>
                    <button
                      onClick={() => { setShowAnnouncementForm(false); setEditingAnnouncement(null) }}
                      className="px-4 py-2 rounded-xl border text-sm text-gray-600 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Announcement list */}
              {announcements.length === 0 && (
                <div className="bg-white rounded-xl shadow p-8 text-center">
                  <Megaphone size={40} className="mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-500">No hay avisos aún. Crea el primero.</p>
                </div>
              )}
              {announcements.map(a => {
                const cfg = colorCfg(a.color)
                return (
                  <div key={a.id} className={`bg-white rounded-xl shadow border overflow-hidden ${!a.active ? 'opacity-50' : ''}`}>
                    <div className={`flex items-center gap-2 px-4 py-2.5 ${cfg.bg}`}>
                      {a.pinned && <Pin size={13} className={cfg.text} />}
                      <span className={`font-semibold text-sm flex-1 ${cfg.text}`}>{a.title}</span>
                      {a.expires_at && <span className="text-xs text-gray-400">Vence: {formatDate(a.expires_at)}</span>}
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${a.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {a.active ? 'Activo' : 'Inactivo'}
                      </span>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{a.body}</p>
                      <div className="flex items-center gap-2 mt-3 pt-2 border-t border-gray-100">
                        <span className="text-xs text-gray-400 flex-1">{formatDate(a.created_at)}</span>
                        <button onClick={() => openEditAnnouncement(a)} className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400 hover:text-purple-600 active:scale-95 transition-all" aria-label="Editar anuncio">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => toggleAnnouncementActive(a.id, a.active)} className={`p-1.5 rounded-xl active:scale-95 transition-all ${a.active ? 'hover:bg-red-50 text-gray-400 hover:text-red-500' : 'hover:bg-green-50 text-gray-400 hover:text-green-600'}`} aria-label={a.active ? 'Desactivar anuncio' : 'Activar anuncio'}>
                          {a.active ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                        <button onClick={() => deleteAnnouncement(a.id)} className="p-1.5 hover:bg-red-50 rounded-xl text-gray-400 hover:text-red-500 active:scale-95 transition-all" aria-label="Eliminar anuncio">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )
        })()}



        {/* Recepcionistas Tab */}
        {activeTab === 'recepcionistas' && (
          <ReceptionistManager />
        )}


        {/* Modal Form - New/Edit Student */}
        {showForm && (
          <StudentForm
            student={editingStudent}
            courses={allCourses}
            allStudents={students}
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
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50" onClick={() => { setShowSaleForm(false); setCartItems([]); setProductSearch('') }}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="p-5 border-b flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={20} className="text-green-600" />
                  <h2 className="text-xl font-semibold text-gray-800">Nueva Venta</h2>
                </div>
                <button onClick={() => { setShowSaleForm(false); setCartItems([]); setProductSearch('') }} className="p-2 hover:bg-gray-100 rounded-xl active:scale-95 transition-all">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSaleSubmit} className="flex flex-col flex-1 overflow-hidden">
                <div className="p-5 space-y-4 overflow-y-auto flex-1">

                  {/* Cliente */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Cliente *</label>
                    <input
                      type="text"
                      required
                      value={saleForm.customerName}
                      onChange={(e) => setSaleForm({...saleForm, customerName: e.target.value})}
                      className="w-full px-4 py-2 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none transition-all"
                      placeholder="Nombre del cliente"
                      list="students-list-sale"
                    />
                    <datalist id="students-list-sale">
                      {students.map(s => <option key={s.id} value={s.name} />)}
                    </datalist>
                  </div>

                  {/* Selector de artículo + cantidad + botón agregar */}
                  <div className="bg-gray-50 rounded-xl p-3 space-y-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Agregar artículo</p>
                    {/* Buscador de producto */}
                    <div className="relative">
                      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => { setProductSearch(e.target.value); setSaleForm(f => ({...f, productId: ''})) }}
                        placeholder="Buscar artículo..."
                        className="w-full pl-10 pr-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white outline-none transition-all"
                      />
                      {productSearch && (
                        <button type="button" onClick={() => { setProductSearch(''); setSaleForm(f => ({...f, productId: ''})) }}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                          <X size={14} />
                        </button>
                      )}
                    </div>
                    {/* Resultados de búsqueda o selector completo */}
                    {productSearch ? (
                      <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden max-h-44 overflow-y-auto">
                        {allProducts.filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase())).length === 0 ? (
                          <p className="px-3 py-3 text-sm text-gray-400 text-center">Sin resultados</p>
                        ) : allProducts
                            .filter(p => p.name.toLowerCase().includes(productSearch.toLowerCase()))
                            .map(product => {
                              const hasStock = product.stock !== null && product.stock !== undefined
                              const outOfStock = hasStock && product.stock === 0
                              const isSelected = saleForm.productId === product.id
                              return (
                                <button
                                  key={product.id}
                                  type="button"
                                  disabled={outOfStock}
                                  onClick={() => { setSaleForm(f => ({...f, productId: product.id})); setProductSearch(product.name) }}
                                  className={`w-full px-3 py-2.5 text-left text-sm border-b last:border-0 flex justify-between items-center transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${isSelected ? 'bg-green-50 text-green-800' : 'hover:bg-gray-50'}`}
                                >
                                  <span className="font-medium">{product.name}</span>
                                  <span className="text-xs text-gray-500 shrink-0 ml-2">
                                    ${product.price}{hasStock ? ` · ${outOfStock ? 'Agotado' : product.stock + ' disp.'}` : ''}
                                  </span>
                                </button>
                              )
                            })
                        }
                      </div>
                    ) : (
                      <select
                        value={saleForm.productId}
                        onChange={(e) => setSaleForm({...saleForm, productId: e.target.value})}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white outline-none transition-all"
                      >
                        <option value="">— Seleccionar —</option>
                        {allProducts.map(product => {
                          const hasStock = product.stock !== null && product.stock !== undefined
                          const outOfStock = hasStock && product.stock === 0
                          return (
                            <option key={product.id} value={product.id} disabled={outOfStock}>
                              {product.name} — ${product.price}{hasStock ? ` (${outOfStock ? 'Agotado' : product.stock + ' disp.'})` : ''}
                            </option>
                          )
                        })}
                      </select>
                    )}
                    {/* Fila 2: stepper cantidad + botón agregar */}
                    <div className="flex gap-2">
                      <div className="flex items-center border rounded-xl bg-white overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setSaleForm(prev => ({ ...prev, quantity: Math.max(1, (prev.quantity || 1) - 1) }))}
                          className="px-3 py-2 text-gray-500 hover:bg-gray-100 transition-colors text-base font-bold"
                        >−</button>
                        <span className="w-8 text-center text-sm font-semibold text-gray-800 select-none">
                          {saleForm.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => setSaleForm(prev => ({ ...prev, quantity: (prev.quantity || 1) + 1 }))}
                          className="px-3 py-2 text-gray-500 hover:bg-gray-100 transition-colors text-base font-bold"
                        >+</button>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddToCart}
                        disabled={!saleForm.productId}
                        className="flex-1 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-xl text-sm font-semibold active:scale-95 transition-all flex items-center justify-center gap-1.5"
                      >
                        <Plus size={15} />
                        Agregar al carrito
                      </button>
                    </div>
                  </div>

                  {/* Carrito */}
                  {cartItems.length > 0 ? (
                    <div className="border rounded-xl overflow-hidden">
                      <div className="bg-green-50 px-4 py-2 flex items-center justify-between border-b">
                        <span className="text-xs font-semibold text-green-700 uppercase tracking-wide">
                          Carrito — {cartItems.length} ítem{cartItems.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="divide-y">
                        {cartItems.map((item, idx) => (
                          <div key={idx} className="flex items-center justify-between px-4 py-2.5">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{item.productName}</p>
                              <p className="text-xs text-gray-500">${item.unitPrice} × {item.quantity}</p>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="text-sm font-bold text-gray-800">
                                ${(item.unitPrice * item.quantity).toFixed(2)}
                              </span>
                              <button
                                type="button"
                                onClick={() => setCartItems(prev => prev.filter((_, i) => i !== idx))}
                                className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between border-t">
                        <span className="text-sm font-semibold text-gray-600">Total</span>
                        <span className="text-xl font-bold text-green-600">
                          ${cartItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed border-gray-200 rounded-xl py-6 text-center text-gray-400 text-sm">
                      Agrega artículos al carrito
                    </div>
                  )}

                  {/* Fecha + Método de pago */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                      <input
                        type="date"
                        value={saleForm.date}
                        onChange={(e) => setSaleForm({...saleForm, date: e.target.value})}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Método de pago</label>
                      <select
                        value={saleForm.paymentMethod}
                        onChange={(e) => setSaleForm({...saleForm, paymentMethod: e.target.value})}
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 outline-none transition-all"
                      >
                        <option value="cash">Efectivo</option>
                        <option value="transfer">Transferencia</option>
                        <option value="card">Tarjeta</option>
                      </select>
                    </div>
                  </div>

                </div>

                {/* Footer con botones */}
                <div className="p-5 border-t flex gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => { setShowSaleForm(false); setCartItems([]); setProductSearch('') }}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={cartItems.length === 0 || !saleForm.customerName || saleSubmitting}
                    className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white rounded-xl transition-colors flex items-center justify-center gap-2 font-semibold"
                  >
                    <Check size={18} />
                    {saleSubmitting ? 'Registrando...' : 'Registrar venta'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Sale Receipt Modal */}
        {showSaleReceipt && lastSaleReceipt && (
          <SaleReceipt
            receipt={lastSaleReceipt}
            schoolName={settings?.school_name || 'Studio Dancers'}
            onClose={() => setShowSaleReceipt(false)}
          />
        )}

        {/* Payment Modal */}
        {showPaymentModal && selectedStudent && (
          <PaymentModal
            student={selectedStudent}
            autoInactiveDays={autoInactiveDays}
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
            onAdjustStock={adjustStock}
            onGetInventoryMovements={getInventoryMovements}
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
            isRecepcion={isRecepcion}
          />
        )}

        {/* Student Detail Modal */}
        {/* Student List Modal */}
        {showStudentListModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50" onClick={() => setShowStudentListModal(false)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="p-3 sm:p-5 border-b bg-purple-700 text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="bg-white/20 p-1.5 sm:p-2 rounded-xl">
                      <Users size={20} />
                    </div>
                    <div>
                      <h2 className="text-base sm:text-lg font-bold">
                        {filteredStudents.length === students.length
                          ? `${students.length} alumnas`
                          : `${filteredStudents.length} de ${students.length} alumnas`}
                      </h2>
                      <p className="text-xs text-white/70">
                        {filterPayment === 'overdue' ? 'Filtro: Por renovar' :
                         filterPayment === 'upcoming' ? 'Filtro: Próximas a vencer' :
                         filterPayment === 'inactive' ? 'Filtro: Inactivas' :
                         filterCourse !== 'all' ? 'Filtro: Por curso' :
                         'Gestiona tu lista de alumnas'}
                      </p>
                    </div>
                  </div>
                  <button onClick={() => setShowStudentListModal(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>

              {/* Search and Filters */}
              <div className="p-3 sm:p-4 border-b bg-gray-50 space-y-2.5">
                {/* Fila 1: Búsqueda + Curso */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1 flex items-center gap-2 border border-gray-200 rounded-xl focus-within:ring-2 focus-within:ring-purple-400 focus-within:border-purple-400 px-3 py-2 bg-white transition-all">
                    <Search className="text-gray-400 shrink-0" size={16} />
                    <input
                      type="text"
                      placeholder="Buscar por nombre o cédula..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full text-sm outline-none bg-transparent"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="p-0.5 text-gray-400 hover:text-red-500 rounded-full transition-colors shrink-0"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <select
                    value={filterCourse}
                    onChange={(e) => setFilterCourse(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-200 rounded-xl focus:ring-4 focus:ring-purple-100 bg-white text-gray-700 w-full sm:max-w-[160px]"
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
                </div>

                {/* Fila 2: Chips de estado de pago */}
                <div className="flex gap-1.5 flex-wrap">
                  {[
                    { value: 'all',      label: 'Todas',         active: 'bg-purple-600 text-white shadow-sm',        inactive: 'bg-white text-gray-500 border border-gray-200 hover:border-purple-300 hover:text-purple-600' },
                    { value: 'overdue',  label: 'Por renovar',   active: 'bg-red-600 text-white shadow-sm',           inactive: 'bg-white text-gray-500 border border-gray-200 hover:border-red-300 hover:text-red-600' },
                    { value: 'mora',     label: 'Suspendidas',   active: 'bg-rose-700 text-white shadow-sm',          inactive: 'bg-white text-gray-500 border border-gray-200 hover:border-rose-400 hover:text-rose-700' },
                    { value: 'upcoming', label: 'Próximas',      active: 'bg-amber-500 text-white shadow-sm',         inactive: 'bg-white text-gray-500 border border-gray-200 hover:border-amber-300 hover:text-amber-600' },
                    { value: 'inactive', label: 'Inactivas',     active: 'bg-slate-500 text-white shadow-sm',         inactive: 'bg-white text-gray-500 border border-gray-200 hover:border-slate-300 hover:text-slate-600' },
                  ].map(chip => (
                    <button
                      key={chip.value}
                      onClick={() => setFilterPayment(chip.value)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        filterPayment === chip.value ? chip.active : chip.inactive
                      }`}
                    >
                      {chip.label}
                      {chip.value === 'overdue' && (graceStudents.length + overduePayments.length) > 0 && (
                        <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${filterPayment === 'overdue' ? 'bg-white/30' : 'bg-red-100 text-red-700'}`}>
                          {graceStudents.length + overduePayments.length}
                        </span>
                      )}
                      {chip.value === 'mora' && moraStudents.length > 0 && (
                        <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${filterPayment === 'mora' ? 'bg-white/30' : 'bg-rose-100 text-rose-700'}`}>
                          {moraStudents.length}
                        </span>
                      )}
                      {chip.value === 'upcoming' && upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0).length > 0 && (
                        <span className={`ml-2 text-[10px] font-bold px-2 py-0.5 rounded-full ${filterPayment === 'upcoming' ? 'bg-white/30' : 'bg-amber-100 text-amber-700'}`}>
                          {upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0).length}
                        </span>
                      )}
                    </button>
                  ))}
                  {(searchTerm || filterCourse !== 'all' || filterPayment !== 'all') && (
                    <button
                      onClick={() => { setSearchTerm(''); setFilterCourse('all'); setFilterPayment('all') }}
                      className="px-3 py-1.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all border border-gray-200"
                    >
                      Limpiar filtros
                    </button>
                  )}
                </div>
              </div>

              {/* Student List */}
              <div className="flex-1 overflow-y-auto">
                {filteredStudents.length === 0 ? (
                  <div className="p-12 text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <Users size={28} className="text-gray-400" />
                    </div>
                    <p className="text-gray-500 font-medium mb-1">
                      {searchTerm || filterCourse !== 'all' || filterPayment !== 'all'
                        ? 'Sin resultados para este filtro'
                        : 'No hay alumnos registrados'}
                    </p>
                    <p className="text-xs text-gray-400 mb-4">
                      {searchTerm || filterCourse !== 'all' || filterPayment !== 'all'
                        ? 'Intenta ajustar los filtros'
                        : 'Agrega tu primera alumna para comenzar'}
                    </p>
                    {!(searchTerm || filterCourse !== 'all' || filterPayment !== 'all') && (
                      <button
                        onClick={() => { setShowStudentListModal(false); setShowForm(true) }}
                        className="px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-colors"
                      >
                        Agregar alumna
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="divide-y">
                    {filteredStudents.map(student => {
                      const course = enrichCourse(getCourseById(student.course_id))
                      const paymentStatus = getPaymentStatus(student, course, autoInactiveDays, graceDays, moraDays)
                      const isCamp = student.course_id?.startsWith('camp-')

                      const rowBg = isCamp
                        ? 'border-l-4 border-pink-400 hover:bg-pink-50/40'
                        : paymentStatus.status === 'mora'
                          ? 'border-l-4 border-rose-600 bg-rose-50/40 hover:bg-rose-50/60'
                          : paymentStatus.status === 'overdue' || paymentStatus.status === 'due_today'
                            ? 'border-l-4 border-red-400 bg-red-50/30 hover:bg-red-50/50'
                            : paymentStatus.status === 'grace'
                              ? 'border-l-4 border-amber-300 bg-amber-50/20 hover:bg-amber-50/40'
                              : paymentStatus.status === 'urgent' || paymentStatus.status === 'upcoming'
                                ? 'border-l-4 border-amber-400 bg-amber-50/30 hover:bg-amber-50/50'
                                : 'hover:bg-gray-50'

                      return (
                        <div key={student.id} className={`p-3 sm:p-4 transition-colors ${rowBg}`}>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                              <StudentAvatar student={student} isCamp={isCamp} />
                              <div className="min-w-0">
                                <h3 className="font-semibold text-gray-800 text-sm sm:text-base truncate">{student.name}</h3>
                                <p className="text-xs sm:text-sm text-gray-500 truncate">
                                  {student.age} años • {course?.name || 'Sin curso'}
                                </p>
                                {searchTerm && student.parent_name && student.parent_name.toLowerCase().includes(searchTerm.toLowerCase()) && (
                                  <p className="text-[10px] text-gray-400 truncate">Representante: {student.parent_name}</p>
                                )}
                                {(course?.priceType === 'mes' || course?.priceType === 'paquete') && (student.last_payment_date || student.enrollment_date) && student.next_payment_date && (() => {
                                  const baseDate = student.last_payment_date || student.enrollment_date
                                  const cycleClasses = course?.classesPerCycle || course?.classesPerPackage || null
                                  const cycleInfo = getCycleInfo(baseDate, student.next_payment_date, course?.classDays, cycleClasses)
                                  if (!cycleInfo || !cycleInfo.totalClasses) return null
                                  return (
                                    <p className="text-[10px] text-purple-600 font-semibold mt-0.5">
                                      Clase {cycleInfo.classesPassed}/{cycleInfo.totalClasses}
                                    </p>
                                  )
                                })()}
                                {student.is_paused && (
                                  <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-medium">Pausado</span>
                                )}
                                {paymentStatus.status === 'mora' && (
                                  <span className="inline-block mt-1 px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full text-[10px] font-semibold">No puede asistir</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 sm:gap-3 shrink-0">
                              <div className="text-right">
                                <p className="font-semibold text-gray-800 text-sm hidden sm:block">${student.monthly_fee}</p>
                                <span className={`inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${paymentStatus.color}`}>
                                  {paymentStatus.label}
                                </span>
                              </div>

                              <div className="flex gap-0.5 sm:gap-1">
                                <button
                                  onClick={() => { setShowStudentListModal(false); setShowStudentDetail(student) }}
                                  className="p-1.5 sm:p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-xl active:scale-95 transition-all"
                                  title="Ver detalle"
                                >
                                  <Eye size={16} />
                                </button>
                                <button
                                  onClick={() => { setShowStudentListModal(false); openPaymentModal(student) }}
                                  className="p-1.5 sm:p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl active:scale-95 transition-all"
                                  title="Registrar pago"
                                >
                                  <CreditCard size={16} />
                                </button>
                                <button
                                  onClick={() => {
                                    const phone = student.payer_phone || student.parent_phone || student.phone
                                    if (!phone) { toast.warning('Este alumno no tiene teléfono registrado'); return }
                                    const courseObj = enrichCourse(getCourseById(student.course_id))
                                    const days = getDaysUntilDue(student.next_payment_date)
                                    const msg = buildReminderMessage(student, courseObj?.name || 'N/A', days, settings, graceDays, moraDays, (courseObj?.ageMin ?? 0) >= 18)
                                    openWhatsApp(phone, msg)
                                  }}
                                  className="p-1.5 sm:p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-xl active:scale-95 transition-all"
                                  title="Recordatorio WhatsApp"
                                >
                                  <MessageCircle size={16} />
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
              <div className="p-3 sm:p-4 border-t bg-gray-50 flex items-center justify-between gap-2">
                <p className="text-xs text-gray-400 hidden sm:block shrink-0">
                  {filteredStudents.length} resultado{filteredStudents.length !== 1 ? 's' : ''}
                </p>
                <div className="flex gap-2 flex-1 sm:flex-none justify-end">
                  <button
                    onClick={() => { setShowStudentListModal(false); setShowCobranzaReport(true) }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 border border-purple-200 text-purple-700 rounded-xl hover:bg-purple-100 transition-colors font-medium text-xs"
                  >
                    <FileText size={13} /> Reporte cobranza
                  </button>
                  <button
                    onClick={() => setShowStudentListModal(false)}
                    className="px-4 py-2 bg-white border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors font-medium text-sm"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showStudentDetail && (
          <StudentDetail
            student={showStudentDetail}
            course={enrichCourse(allCourses.find(c => c.id === showStudentDetail?.course_id) || getCourseById(showStudentDetail?.course_id))}
            onClose={() => setShowStudentDetail(null)}
            onPayment={(student) => {
              setShowStudentDetail(null)
              openPaymentModal(student)
            }}
            onEdit={(student) => {
              setShowStudentDetail(null)
              handleEdit(student)
            }}
            onPause={handlePauseStudent}
            onReactivate={reactivateCycle}
            schoolName={settings?.name}
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

        {showTransferVerification && (
          <TransferVerification
            requests={transferRequests}
            loading={false}
            onApprove={approveRequest}
            onReject={rejectRequest}
            onClose={() => { setShowTransferVerification(false); fetchTransferRequests() }}
            onRegisterPayment={registerPayment}
            getCourseById={getCourseById}
            enrichCourse={enrichCourse}
            students={students}
          />
        )}

        {/* Cierre Mensual */}
        {showMonthlyClose && (
          <MonthlyClose
            onClose={() => setShowMonthlyClose(false)}
            closes={closes}
            loading={closesLoading}
            summaryLoading={summaryLoading}
            summary={summary}
            fetchCloses={fetchCloses}
            getMonthSummary={getMonthSummary}
            closeMonth={closeMonth}
            studentsCount={students.length}
            moraStudentsCount={moraStudents.length}
            inactiveStudentsCount={inactiveStudents.length}
            settings={settings}
            userName={user?.email || 'Admin'}
            userId={user?.id}
          />
        )}

        {/* Reporte de Cobranza */}
        {showCobranzaReport && (
          <CobranzaReport
            students={students}
            courses={allCourses}
            settings={settings}
            graceDays={graceDays}
            moraDays={moraDays}
            autoInactiveDays={autoInactiveDays}
            getCourseById={getCourseById}
            enrichCourse={enrichCourse}
            onClose={() => setShowCobranzaReport(false)}
          />
        )}

        {/* Balance Alerts Modal */}
        {showBalanceAlerts && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-50" onClick={() => setShowBalanceAlerts(false)}>
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
              <div className="p-4 bg-gradient-to-r from-orange-500 to-amber-500">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white/20 rounded-xl">
                      <Wallet className="text-white" size={22} />
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">Saldos Pendientes</h2>
                      <p className="text-white/80 text-sm">{studentsWithBalance.length} alumno{studentsWithBalance.length !== 1 ? 's' : ''} con abonos parciales</p>
                    </div>
                  </div>
                  <button onClick={() => setShowBalanceAlerts(false)} className="p-2 hover:bg-white/20 rounded-xl active:scale-95 transition-all text-white">
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {studentsWithBalance.map(s => {
                  const isMinor = s.is_minor !== false
                  const waPhone = isMinor ? (s.payer_phone || s.parent_phone || s.phone) : s.phone
                  const waContact = isMinor ? (s.payer_name || s.parent_name || s.name) : s.name
                  const waLink = waPhone ? (() => {
                    let msg = `Hola *${waContact}*, le contactamos de *Studio Dancers*.`
                    if (isMinor) msg += `\nSu representada *${s.name}* tiene un saldo pendiente.`
                    msg += `\n\n🎓 *Programa:* ${s.courseName}`
                    msg += `\n💰 *Abono realizado:* $${s.amountPaid.toFixed(2)}`
                    msg += `\n⚠️ *Saldo pendiente:* $${s.balance.toFixed(2)}`
                    msg += `\n\nPor favor coordine el pago del saldo restante. ¡Gracias! 🙏`
                    const raw = waPhone.replace(/\D/g, '')
                    const phone = raw.startsWith('593') ? raw : raw.startsWith('0') ? '593' + raw.slice(1) : '593' + raw
                    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
                  })() : null
                  return (
                  <div
                    key={s.id}
                    className="p-4 rounded-xl border-2 border-orange-200 bg-orange-50 hover:shadow-md transition-all cursor-pointer"
                    onClick={() => {
                      setShowBalanceAlerts(false)
                      openPaymentModal(s)
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-gray-800 truncate">{s.name}</p>
                        <p className="text-sm text-gray-500 truncate">{s.courseName}</p>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <p className="text-lg font-bold text-orange-600">${s.balance.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">pendiente</p>
                      </div>
                    </div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center gap-4 text-xs text-gray-500">
                        <span>Pagado: <strong className="text-green-600">${s.amountPaid.toFixed(2)}</strong></span>
                        <span>Total: <strong>${s.coursePrice.toFixed(2)}</strong></span>
                      </div>
                      <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setDetailBalanceStudent(s)}
                          className="p-1.5 rounded-lg bg-white border border-orange-200 text-orange-500 hover:bg-orange-100 transition-all"
                          title="Ver detalle"
                          aria-label="Ver detalle de saldo">
                          <Eye size={14} />
                        </button>
                        {waLink && (
                          <a href={waLink} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-white border border-green-200 text-green-600 hover:bg-green-50 transition-all"
                            title="Enviar recordatorio por WhatsApp"
                            aria-label="Enviar recordatorio por WhatsApp">
                            <MessageCircle size={14} />
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                  )
                })}
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

        {/* Student Balance Detail Modal */}
        {detailBalanceStudent && (() => {
          const s = detailBalanceStudent
          const isMinor = s.is_minor !== false
          const waPhone = isMinor ? (s.payer_phone || s.parent_phone || s.phone) : s.phone
          const waContact = isMinor ? (s.payer_name || s.parent_name || s.name) : s.name
          const waLink = waPhone ? (() => {
            let msg = `Hola *${waContact}*, le contactamos de *Studio Dancers*.`
            if (isMinor) msg += `\nSu representada *${s.name}* tiene un saldo pendiente.`
            msg += `\n\n🎓 *Programa:* ${s.courseName}`
            msg += `\n💰 *Abono realizado:* $${s.amountPaid.toFixed(2)}`
            msg += `\n⚠️ *Saldo pendiente:* $${s.balance.toFixed(2)}`
            msg += `\n\nPor favor coordine el pago del saldo restante. ¡Gracias! 🙏`
            const raw = waPhone.replace(/\D/g, '')
            const phone = raw.startsWith('593') ? raw : raw.startsWith('0') ? '593' + raw.slice(1) : '593' + raw
            return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`
          })() : null
          return (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-2 sm:p-4 z-[60]"
              onClick={() => setDetailBalanceStudent(null)}>
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden"
                onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white">
                  <p className="font-semibold text-sm">Detalle del alumno</p>
                  <button onClick={() => setDetailBalanceStudent(null)}
                    className="p-1.5 hover:bg-white/20 rounded-xl transition-colors">
                    <X size={16} />
                  </button>
                </div>

                <div className="p-4 space-y-4">
                  {/* Datos alumno */}
                  <div>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Alumno/a</p>
                    <p className="font-bold text-gray-800">{s.name}</p>
                    {s.cedula && <p className="text-sm text-gray-500 mt-0.5">CI: {s.cedula}</p>}
                    {s.phone && <p className="text-sm text-gray-500 mt-0.5">{s.phone}</p>}
                  </div>

                  {/* Representante (si menor) */}
                  {isMinor && (s.parent_name || s.payer_name) && (
                    <div className="border-t pt-3">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Representante</p>
                      <p className="font-semibold text-gray-800">{s.payer_name || s.parent_name}</p>
                      {(s.payer_cedula || s.parent_cedula) && (
                        <p className="text-sm text-gray-500 mt-0.5">CI: {s.payer_cedula || s.parent_cedula}</p>
                      )}
                      {waPhone && <p className="text-sm text-gray-500 mt-0.5">{waPhone}</p>}
                    </div>
                  )}

                  {/* Programa */}
                  <div className="border-t pt-3">
                    <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Programa</p>
                    <p className="font-semibold text-gray-700">{s.courseName}</p>
                  </div>

                  {/* Saldos */}
                  <div className="border-t pt-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total del programa</span>
                      <span className="font-semibold">${s.coursePrice.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total abonado</span>
                      <span className="font-semibold text-green-600">${s.amountPaid.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm bg-orange-50 rounded-xl px-3 py-2">
                      <span className="text-orange-700 font-semibold">Saldo pendiente</span>
                      <span className="font-bold text-orange-700">${s.balance.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t bg-gray-50 space-y-2">
                  {waLink ? (
                    <a href={waLink} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full py-3 bg-green-500 hover:bg-green-600 text-white rounded-xl font-semibold text-sm transition-all active:scale-95">
                      <MessageCircle size={16} />
                      Enviar recordatorio por WhatsApp
                    </a>
                  ) : (
                    <p className="text-xs text-gray-400 text-center">Sin teléfono registrado</p>
                  )}
                  <button
                    onClick={() => { setDetailBalanceStudent(null); setShowBalanceAlerts(false); openPaymentModal(s) }}
                    className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-semibold text-sm transition-all active:scale-95">
                    + Registrar abono
                  </button>
                  <button onClick={() => setDetailBalanceStudent(null)}
                    className="w-full py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-100 transition-all">
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

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
          💾 Datos en la nube • v4.8
        </div>
      </div>

      {/* Toast notification for new transfers */}
      {newTransferAlert && (
        <div
          className="fixed bottom-6 right-6 z-[60] bg-white border-l-4 border-green-500 shadow-xl rounded-xl p-4 max-w-sm animate-bounce-in cursor-pointer"
          onClick={() => { setShowTransferVerification(true); setNewTransferAlert(null) }}
        >
          <div className="flex items-start gap-3">
            <div className="p-2 bg-green-100 rounded-full shrink-0">
              <span className="text-lg">💰</span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-800 text-sm">Nueva solicitud de pago</p>
              <p className="text-xs text-gray-600 mt-0.5">
                {newTransferAlert.studentName} — ${newTransferAlert.amount}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                vía {newTransferAlert.method} • Toque para revisar
              </p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); setNewTransferAlert(null) }}
              className="text-gray-400 hover:text-gray-600 shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
