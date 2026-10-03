import { useState, useEffect, useRef } from 'react'
import {
  Plus, Users, Calendar, DollarSign, AlertCircle, Trash2, Edit2, X, Check,
  Search, ShoppingBag, Tag, Settings, ArrowLeft, CreditCard, Download, Package, Zap, ChevronDown, ChevronUp, History, Wallet, Pause, Play, Eye, EyeOff, LogOut, TrendingDown, ArrowLeftRight, Palette, BarChart3, ScrollText, MessageCircle, Megaphone, Pin, Send, GraduationCap, FileText, Monitor, Lock, UserMinus, UserCheck, RefreshCw, Snowflake
} from 'lucide-react'
import { supabase } from './lib/supabase'
import { useStudents } from './hooks/useStudents'
import { useSales } from './hooks/useSales'
import { useSchoolSettings } from './hooks/useSchoolSettings'
import { useItems } from './hooks/useItems'
import { useDailyIncome } from './hooks/useDailyIncome'
import { useCashRegister } from './hooks/useCashRegister'
import { useExpenses } from './hooks/useExpenses'
import { useAuth } from './hooks/useAuth'
// ALL_COURSES se usa como fallback para enriquecer cursos que no tienen classDays en Supabase
import { ALL_COURSES } from './lib/courses'
import { formatDate, getDaysUntilDue, getDaysLate, getPaymentStatus, getCycleInfo, getTodayEC, getNowEC, getNextNClassDays, getNextClassDay, formatDateForInput } from './lib/dateUtils'
import { addDays } from 'date-fns'
import { syncToMailerLite } from './lib/mailerlite'
import { openWhatsApp, buildReminderMessage, getContactInfo } from './lib/whatsapp'
import PaymentModal from './components/PaymentModal'
import ReceiptGenerator from './components/ReceiptGenerator'
import { lazyLoad } from './lib/lazyLoad'
import { getNextReceiptNumber } from './lib/receipts'
import { paymentMethodSalesCode, bankNameById } from './lib/paymentMethods'
import PaymentMethodPicker from './components/ui/PaymentMethodPicker'
import { HomeSection, HomeRow } from './components/home/HomeSection'
import SideNav from './components/SideNav'
import ThemeToggle from './components/ui/ThemeToggle'
import ErrorBoundary from './components/ui/ErrorBoundary'
import StudentForm from './components/StudentForm'
import QuickPayment from './components/QuickPayment'
import StudentDetail from './components/StudentDetail'
import DeleteConfirmModal from './components/DeleteConfirmModal'
import PinPromptModal from './components/PinPromptModal'
import SaleReceipt from './components/SaleReceipt'
import { useSalePlans } from './hooks/useSalePlans'
import { useMonthlyClose } from './hooks/useMonthlyClose'
import { useFinancialKPIs } from './hooks/useFinancialKPIs'
import ScreenLock from './components/ScreenLock'
import { useTransferRequests } from './hooks/useTransferRequests'
import LoginPage from './components/Auth/LoginPage'
import BottomNav from './components/BottomNav'
import './App.css'

// Cargados bajo demanda: ventanas y paneles que solo se muestran al abrirlos
// (xlsx/jspdf incluidos). Lo de uso diario (lista, ficha, cobro, recibo) queda en el paquete principal.
const SettingsModal = lazyLoad(() => import('./components/SettingsModal'))
const ManageItems = lazyLoad(() => import('./components/ManageItems'))
const PaymentHistory = lazyLoad(() => import('./components/PaymentHistory'))
const CashRegister = lazyLoad(() => import('./components/CashRegister'))
const ExpenseManager = lazyLoad(() => import('./components/ExpenseManager'))
const CashMovements = lazyLoad(() => import('./components/CashMovements'))
const ManageCategories = lazyLoad(() => import('./components/ManageCategories'))
const DailyReport = lazyLoad(() => import('./components/DailyReport'))
const AuditLog = lazyLoad(() => import('./components/AuditLog'))
const TransferVerification = lazyLoad(() => import('./components/TransferVerification'))
const InstructorManager = lazyLoad(() => import('./components/InstructorManager'))
const ReportesManager = lazyLoad(() => import('./components/ReportesManager'))
const ClasesAdultasManager = lazyLoad(() => import('./components/ClasesAdultasManager'))
const ReceptionistManager = lazyLoad(() => import('./components/ReceptionistManager'))
const UserManagement = lazyLoad(() => import('./components/UserManagement'))
const ExportStudents = lazyLoad(() => import('./components/ExportStudents'))
const SaleInstallments = lazyLoad(() => import('./components/SaleInstallments'))
const HonorariosPanel = lazyLoad(() => import('./components/HonorariosPanel'))
const CobranzaReport = lazyLoad(() => import('./components/CobranzaReport'))
const MonthlyClose = lazyLoad(() => import('./components/MonthlyClose'))
const ContabilidadPanel = lazyLoad(() => import('./components/Contabilidad/ContabilidadPanel'))
const ContadorDashboard = lazyLoad(() => import('./components/Contabilidad/ContadorDashboard'))

// Mini-component: shows avatar photo from Supabase storage, falls back to initials
function StudentAvatar({ student, isCamp }) {
  const [imgLoaded, setImgLoaded] = useState(false)
  const avatarUrl = supabase.storage.from('avatars').getPublicUrl(`${student.id}.jpg`).data?.publicUrl
  const initials = student.name.split(' ').filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase()
  const bgClass = isCamp ? 'bg-pink-100 text-pink-700' : 'bg-[#f9e8f0] text-[#551735]'
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
  const { user, userRole, loading: authLoading, signOut, isAuthenticated, isAdmin, isContador, can } = useAuth()
  const { students, loading: studentsLoading, fetchStudents, createStudent, updateStudent, deleteStudent, reactivateStudent, fetchInactiveStudents, checkDuplicateStudent, registerPayment, pauseStudent, unpauseStudent, reactivateCycle } = useStudents()
  const { sales, loading: salesLoading, createSaleGroup, deleteSale } = useSales()
  const { settings, updateSettings } = useSchoolSettings()
  const { courses: allCourses, products: allProducts, saveCourse, deleteCourse, saveProduct, deleteProduct, getCourseById, getProductById, adjustStock, fetchCoursePlans, saveCoursePlan, deleteCoursePlan } = useItems()
  const { todayIncome, refreshIncome } = useDailyIncome()
  const { isOpen: isCashOpen, notOpened: isCashNotOpened, refresh: refreshCash, todayRegister } = useCashRegister()
  const { todayExpensesTotal, refreshExpenses } = useExpenses()
  const { requests: transferRequests, pendingCount: pendingTransfers, fetchRequests: fetchTransferRequests, approveRequest, rejectRequest, newTransferAlert, setNewTransferAlert, onNewTransferRef } = useTransferRequests()
  const { activePlans, paidPlans, totalDebt, loading: plansLoading, dbError: plansDbError, refresh: refreshPlans, createPlan, registerPayment: registerPlanPayment, cancelPlan, deletePlan, updatePlanTotal, markDelivered } = useSalePlans()
  const { kpis, loading: kpisLoading, fetchKPIs } = useFinancialKPIs()

  // Helper: enriquecer curso con datos hardcodeados si faltan classDays/classesPerCycle
  // Resuelve el caso donde class_days es NULL en Supabase (migración v14 no ejecutada o datos viejos)
  const enrichCourse = (course) => {
    if (!course) return null
    if (course.classDays && course.classDays.length > 0) return course
    // 1. Match exacto por id/code en cursos hardcodeados
    const hardcoded = ALL_COURSES.find(c => c.id === course.code || c.id === course.id)
    if (hardcoded) {
      return { ...course, classDays: hardcoded.classDays, classesPerCycle: hardcoded.classesPerCycle, classesPerPackage: hardcoded.classesPerPackage }
    }
    // 2. Match por patrón: cursos custom de sábados (ej: sabados-intensivos-adultos)
    const key = (course.code || course.id || '').toLowerCase()
    const name = (course.name || '').toLowerCase()
    if (key.includes('sabados') || key.includes('sabado') || name.includes('sábado') || name.includes('sabado')) {
      return { ...course, classDays: [6], classesPerPackage: course.classesPerPackage || 4 }
    }
    return course
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
  const [showRetiradasModal, setShowRetiradasModal] = useState(false)
  const [retiradasList, setRetiradasList] = useState([])
  const [loadingRetiradas, setLoadingRetiradas] = useState(false)
  const [duplicateWarning, setDuplicateWarning] = useState({ show: false, matches: [], pendingData: null })
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
  const [showContabilidad, setShowContabilidad] = useState(false)
  const [isScreenLocked, setIsScreenLocked] = useState(false)
  const { closes, loading: closesLoading, summaryLoading, summary, fetchCloses, getMonthSummary, closeMonth } = useMonthlyClose()
  const globalSearchRef = useRef(null)

  // Prompt: registrar cobro tras crear alumno nuevo
  const [newStudentPaymentPrompt, setNewStudentPaymentPrompt] = useState(null) // student obj | null

  // Modal de pausa multi-día
  const [pauseDialog, setPauseDialog] = useState(null)   // { student, course } | null
  const [pauseClasses, setPauseClasses] = useState(1)    // cuántas clases a pausar

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

    // Scroll lock — impide que el fondo se mueva con cualquier modal abierto
    document.body.style.overflow = anyModalOpen ? 'hidden' : ''

    if (anyModalOpen) {
      // Push a state so back button has somewhere to go
      window.history.pushState({ modal: true }, '')
    }

    const handlePopState = () => {
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
    return () => {
      window.removeEventListener('popstate', handlePopState)
      document.body.style.overflow = '' // limpiar al desmontar
    }
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
        setActiveTab('students')
        setTimeout(() => globalSearchRef.current?.focus(), 0)
      }
    }
    window.addEventListener('keydown', handleCtrlK)
    return () => window.removeEventListener('keydown', handleCtrlK)
  }, [])

  const [saleForm, setSaleForm] = useState({
    customerName: '',
    program: '',
    productId: '',
    quantity: 1,
    date: getTodayEC(),
    paymentMethod: 'efectivo', // id de PaymentMethodPicker; en sales se guarda como 'cash'/'transfer'/'card'
    bankId: '',
    transferReceipt: '',
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
  // Tienda: una vista a la vez (antes los abonos quedaban al final, bajo el catálogo)
  const [storeView, setStoreView] = useState('ventas')
  const [showUserManagement, setShowUserManagement] = useState(false)
  // Productos: búsqueda por nombre y filtro "por reponer"
  const [catalogSearch, setCatalogSearch] = useState('')
  const [catalogLowOnly, setCatalogLowOnly] = useState(false)

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
  // Excluye adultas — no usan período de gracia
  const graceStudents = recurringStudents.filter(s => {
    if (!s.next_payment_date || s.payment_status === 'pending') return false
    const course = getCourseById(s.course_id)
    if ((course?.ageMin ?? 0) >= 18) return false
    const days = getDaysUntilDue(s.next_payment_date)
    return days < 0 && Math.abs(days) <= graceDays
  })

  // Alumnos con pago vencido (días graceDays+1 a moraDays) — pueden asistir pero deben pagar
  // Excluye adultas — ellas van directo a adultRenewalStudents
  const overduePayments = recurringStudents.filter(s => {
    if (!s.next_payment_date || s.payment_status === 'pending') return false
    const course = getCourseById(s.course_id)
    if ((course?.ageMin ?? 0) >= 18) return false
    const days = getDaysUntilDue(s.next_payment_date)
    const abs  = Math.abs(days)
    return days < 0 && abs > graceDays && abs <= moraDays
  })

  // Alumnos en mora / suspendidas (días moraDays+1 a autoInactiveDays) — NO pueden asistir
  const moraStudents = recurringStudents.filter(s => {
    if (!s.next_payment_date || s.payment_status === 'pending') return false
    const course = getCourseById(s.course_id)
    const isAdult = (course?.ageMin ?? 0) >= 18
    if (isAdult) return false // Adultas se muestran aparte como "por renovar"
    const days = getDaysUntilDue(s.next_payment_date)
    const abs  = Math.abs(days)
    return days < 0 && abs > moraDays && abs <= autoInactiveDays
  })

  // Adultas con ciclo finalizado (vencidas, sin importar días — no usan gracia/mora)
  // Helper: ¿el ciclo escolar del curso ya finalizó?
  // Si sí, la alumna NO debe aparecer en "por renovar" ni "inactivas" — el
  // sistema dejó de pedir cobros automáticos (badge "Ciclo finalizado").
  const isCycleEnded = (courseObj) => {
    const cicloFin = courseObj?.cicloFin || courseObj?.ciclo_fin
    if (!cicloFin) return false
    return getTodayEC() > cicloFin
  }

  const adultRenewalStudents = recurringStudents.filter(s => {
    if (!s.next_payment_date || s.payment_status === 'pending') return false
    const course = getCourseById(s.course_id)
    if (isCycleEnded(course)) return false
    const isAdult = (course?.ageMin ?? 0) >= 18
    if (!isAdult) return false
    const days = getDaysUntilDue(s.next_payment_date)
    return days < 0 && Math.abs(days) <= autoInactiveDays
  })

  // Alumnos inactivos definitivos (días autoInactiveDays+1 en adelante)
  const inactiveStudents = recurringStudents.filter(s => {
    if (!s.next_payment_date || s.payment_status === 'pending') return false
    const course = getCourseById(s.course_id)
    if (isCycleEnded(course)) return false
    const days = getDaysUntilDue(s.next_payment_date)
    return days < 0 && Math.abs(days) > autoInactiveDays
  })


  // Alumnos con saldos pendientes (abonos parciales)
  const studentsWithBalance = students.filter(s => {
    if (s.payment_status !== 'partial') return false
    const amountPaid = parseFloat(s.amount_paid || 0)
    if (!(amountPaid > 0 && parseFloat(s.balance || 0) > 0)) return false
    // Excluir alumnas con ciclo escolar finalizado: si el ciclo terminó,
    // dejamos de empujar el saldo en la UI principal (sigue accesible desde
    // el detalle del alumno si la admin quiere cobrarlo igual).
    const course = getCourseById(s.course_id)
    if (isCycleEnded(course)) return false
    return true
  }).map(s => {
    const course = getCourseById(s.course_id)
    const amountPaid = parseFloat(s.amount_paid || 0)
    const effectivePrice = parseFloat(s.total_program_price || course?.price || 0)
    return { ...s, courseName: course?.name, amountPaid, coursePrice: effectivePrice, balance: parseFloat(s.balance || 0) }
  })

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
  }, [settings.mailerlite_api_key, settings.mailerlite_group_id, students, studentsLoading])

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
      alert(`Stock insuficiente. Disponible: ${product.stock}, Ya en carrito: ${alreadyInCart}, Solicitado: ${qty}`)
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
    if (cartItems.length === 0) {
      alert('Agrega al menos un artículo al carrito')
      return
    }

    const result = await createSaleGroup({
      customerName: saleForm.customerName,
      program: saleForm.program || null,
      items: cartItems,
      date: saleForm.date,
      notes: saleForm.notes,
      paymentMethod: paymentMethodSalesCode(saleForm.paymentMethod),
      bankName: saleForm.paymentMethod === 'transferencia' ? bankNameById(saleForm.bankId) : null,
      transferReceipt: saleForm.paymentMethod === 'transferencia' ? saleForm.transferReceipt.trim() || null : null
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
        program: saleForm.program || null,
        items: cartItems,
        total: cartItems.reduce((s, i) => s + i.unitPrice * i.quantity, 0),
        date: saleForm.date,
        paymentMethod: paymentMethodSalesCode(saleForm.paymentMethod)
      })
      setShowSaleReceipt(true)
      // Reset
      setCartItems([])
      setProductSearch('')
      setSaleForm({ customerName: '', program: '', productId: '', quantity: 1, date: getTodayEC(), paymentMethod: 'efectivo', bankId: '', transferReceipt: '', notes: '' })
      setShowSaleForm(false)
    } else {
      alert('Error: ' + result.error)
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
        last_payment_date: result.data.last_payment_date ?? student.last_payment_date,
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
      alert('Error: ' + result.error)
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

  const handleEdit = (student) => {
    setEditingStudent(student)
    setShowForm(true)
  }

  // Handler para pago rápido (clase diaria)
  const handleQuickPayment = async (paymentData) => {
    try {
      // Guardar en la tabla quick_payments
      const { supabase } = await import('./lib/supabase')
      const receiptNumber = await getNextReceiptNumber()
      const { error } = await supabase
        .from('quick_payments')
        .insert([{
          customer_name: paymentData.customerName,
          customer_cedula: paymentData.customerCedula || null,
          customer_phone: paymentData.customerPhone || null,
          class_type: paymentData.classType,
          class_name: paymentData.className,
          amount: paymentData.amount,
          receipt_number: receiptNumber,
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
        receipt_number: receiptNumber,
        receiptNumber,
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
  const handleStudentFormSubmit = async (formData, forceCreate = false) => {
    // Verificar duplicados SIEMPRE (crear y editar), excluyendo self al editar.
    // El índice único en BD (lower(name), course_id) WHERE active=true falla
    // silenciosamente si no validamos antes. Bug histórico: gente terminaba
    // agregando sufijos como '9:2' al nombre para esquivar el constraint.
    if (!forceCreate) {
      const matches = await checkDuplicateStudent(
        formData.name,
        formData.cedula,
        editingStudent?.id || null
      )
      if (matches.length > 0) {
        // Si el match está ACTIVO y en el MISMO curso, el guardado romperá
        // el índice único. Bloqueamos el "forzar" en ese caso.
        const wouldBreakConstraint = matches.some(
          m => m.active && m.course_id === formData.courseId
        )
        setDuplicateWarning({
          show: true,
          matches,
          pendingData: formData,
          isEditing: !!editingStudent,
          wouldBreakConstraint,
        })
        return
      }
    }

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
      setDuplicateWarning({ show: false, matches: [], pendingData: null })
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
      name: sale.product_name + ' - ' + sale.customer_name,
      saleData: sale // guardar datos de la venta para restaurar stock
    })
  }

  // Ejecutar eliminación después de confirmar PIN
  const executeDelete = async (reason) => {
    const { type, id, saleData } = deleteModal
    let result

    if (type === 'alumno') {
      result = await deleteStudent(id, reason)
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
      if (!result.success) alert('Error: ' + result.error)
    } else {
      const course = getCourseById(student.course_id)
      if (!course || (course.priceType !== 'mes' && course.priceType !== 'paquete')) {
        alert('Solo se pueden pausar alumnos con clases mensuales o por paquete')
        return
      }
      setPauseClasses(1)
      setPauseDialog({ student, course })
    }
  }

  // Confirmar pausa desde el modal
  const handleConfirmPause = async () => {
    if (!pauseDialog) return
    const result = await pauseStudent(pauseDialog.student.id, pauseClasses)
    if (result.success) {
      setPauseDialog(null)
    } else {
      alert('Error: ' + result.error)
    }
  }

  const openPaymentModal = (student) => {
    setSelectedStudent(student)
    setShowPaymentModal(true)
  }

  // Reimprimir último recibo con datos actuales del alumno
  const handleReprint = async (student) => {
    try {
      const { data: payments } = await supabase
        .from('payments')
        .select('*')
        .eq('student_id', student.id)
        .eq('voided', false)
        .order('created_at', { ascending: false })
        .limit(1)
      if (!payments?.length) return
      const payment = payments[0]
      setSelectedStudent(student)
      setLastPayment({
        ...payment,
        // Usar last_payment_date del alumno como ciclo base para mostrar ciclo correcto
        cycle_start_date: student.last_payment_date || payment.cycle_start_date,
        isReprint: true
      })
      setShowStudentDetail(null)
      setShowReceipt(true)
    } catch (err) {
      console.error('Error reimprimir:', err)
    }
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
      <div className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden" style={{
        background: 'linear-gradient(180deg, #0d0206 0%, #1a0509 35%, #220810 65%, #150306 100%)'
      }}>
        {/* Subtle spotlight from top */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 pointer-events-none" style={{
          width: '70%', height: '60%',
          background: 'radial-gradient(ellipse at 50% 0%, rgba(255,230,180,0.08) 0%, transparent 70%)'
        }} />

        {/* Logo */}
        <img
          src="/logo-cream.png"
          alt="Studio Dancers"
          style={{
            width: 'clamp(120px, 22vw, 200px)',
            height: 'auto',
            objectFit: 'contain',
            marginBottom: '1.75rem',
          }}
        />

        {/* Spinner */}
        <div className="mb-4 flex justify-center">
          <div className="w-10 h-10 rounded-full animate-spin" style={{
            border: '3px solid rgba(201,168,76,0.2)',
            borderTopColor: 'rgba(201,168,76,0.75)',
          }} />
        </div>

        {/* Texto */}
        <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '0.8rem', letterSpacing: '0.12em' }}>
          Cargando...
        </p>

        {/* Curtain strips — decorative bottom edge */}
        <div className="absolute bottom-0 left-0 right-0 pointer-events-none" style={{ height: '6px' }}>
          <div style={{ height: '100%', background: 'linear-gradient(90deg, #220810, #551735 30%, #7a1a38 50%, #551735 70%, #220810)', opacity: 0.8 }} />
        </div>
      </div>
    )
  }

  // Si no está autenticado, mostrar página de login (solo para admin normal)
  if (!isRecepcion && !isAuthenticated) {
    return <LoginPage onLogin={(user) => console.log('Logged in:', user.email)} />
  }

  // Contadora: panel simplificado exclusivo
  if (!isRecepcion && isContador) {
    return (
      <ContadorDashboard
        user={user}
        settings={settings}
        onSignOut={signOut}
      />
    )
  }

  if (!isRecepcion && loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #faf5ff 0%, #fdf2f8 50%, #fff7ed 100%)'
      }}>
        <div className="text-center">
          {/* Spinner animado */}
          <div className="mb-5 flex justify-center">
            <div className="w-14 h-14 border-4 border-[#e8b4cc] border-t-[#6b2145] rounded-full animate-spin"></div>
          </div>

          {/* Texto */}
          <h2 className="text-[#441029] text-lg font-semibold mb-1">Cargando datos</h2>
          <p className="text-[#9e4d75] text-sm">Un momento por favor...</p>
        </div>
      </div>
    )
  }

  // ── Acciones de cuenta compartidas por la cabecera (celular) y la barra lateral (PC) ──
  const openSettingsGuarded = () => {
    if (settings.security_pin) {
      setPendingSettingsAccess(true)
      setShowPinPrompt(true)
    } else {
      setShowSettings(true)
    }
  }
  const lockScreen = () => {
    if (!settings.security_pin) {
      alert('Para usar la pantalla de ausencia, primero configura un PIN de seguridad en Configuración.')
      return
    }
    setIsScreenLocked(true)
  }
  const confirmLogout = async () => {
    if (confirm('¿Cerrar sesión?')) {
      if (isRecepcion && onLogout) {
        onLogout()
      } else {
        await signOut()
      }
    }
  }

  // Secciones (pestañas) — mismas reglas de permisos que las pestañas de escritorio
  const navTabs = [
    { id: 'students', icon: Users, label: 'Alumnas', count: students.length },
    { id: 'sales', icon: ShoppingBag, label: 'Tienda' },
    { id: 'courses', icon: Calendar, label: 'Cursos' },
    { id: 'academico', icon: GraduationCap, label: 'Académico' },
    { id: 'expenses', icon: TrendingDown, label: 'Egresos' },
    { id: 'report', icon: BarChart3, label: 'Reporte' },
    { id: 'tablon', icon: Megaphone, label: 'Tablón', count: announcements.filter(a => a.active).length || undefined },
    { id: 'recepcionistas', icon: Monitor, label: 'Recepción', adminOnly: true },
  ].filter(tab => !tab.adminOnly || isAdmin)
   .filter(tab => !isRecepcion || ['students', 'sales', 'expenses', 'courses'].includes(tab.id))

  // Herramientas que abren modales (antes chips en la cabecera)
  const navTools = [
    { id: 'transfers', icon: DollarSign, label: 'Transferencias', onClick: () => setShowTransferVerification(true), badge: pendingTransfers },
    { id: 'history', icon: History, label: 'Historial de pagos', onClick: () => setShowPaymentHistory(true) },
    ...(!isRecepcion && isAdmin ? [
      { id: 'close', icon: Lock, label: 'Cierre mensual', onClick: () => setShowMonthlyClose(true) },
      { id: 'audit', icon: ScrollText, label: 'Auditoría', onClick: () => setShowAuditLog(true) },
      { id: 'users', icon: UserCheck, label: 'Usuarios', onClick: () => setShowUserManagement(true) },
      { id: 'accounting', icon: FileText, label: 'Contabilidad', onClick: () => setShowContabilidad(true) },
    ] : []),
    ...(!isRecepcion && can('canExport') ? [
      { id: 'export', icon: Download, label: 'Exportar', onClick: () => setShowExport(true) },
    ] : []),
  ]

  return (
    <div className="min-h-screen bg-paper px-4 pt-3 pb-4 md:p-6 lg:pl-[17rem] lg:pr-8 lg:pt-6">
      <SideNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabs={navTabs}
        tools={navTools}
        userLabel={isRecepcion ? (recepcionUserName || 'Recepción') : (user?.email || '')}
        roleLabel={isRecepcion ? 'Recepción' : userRole?.display_name}
        onSettings={!isRecepcion && can('canEditSettings') ? openSettingsGuarded : null}
        onLock={lockScreen}
        onLogout={confirmLogout}
      />
      <div className="max-w-6xl mx-auto pb-20 md:pb-0">
        {/* Cabecera compacta: logo, saludo con fecha, caja y controles */}
        {(() => {
          const hourEC = getNowEC().getHours()
          const greeting = hourEC < 12 ? 'Buenos días' : hourEC < 19 ? 'Buenas tardes' : 'Buenas noches'
          const todayLabel = new Date(getTodayEC() + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })
          const firstName = isRecepcion ? (recepcionUserName || '').split(' ')[0] : ''
          const cashLabel = isCashOpen ? 'Caja abierta' : isCashNotOpened ? 'Caja sin abrir' : 'Caja cerrada'
          const isHome = activeTab === 'students'
          const sectionLabel = navTabs.find(t => t.id === activeTab)?.label || ''
          return (
            <header className="mb-4">
              <div className="flex items-center gap-2">
              <img src="/logo2.png" alt="Studio Dancers" className="h-9 w-auto object-contain shrink-0 mr-auto lg:hidden dark:hidden" />
              <img src="/logo-cream.png" alt="Studio Dancers" className="h-9 w-auto object-contain shrink-0 mr-auto hidden dark:block dark:lg:hidden" />
              <span className="hidden lg:block mr-auto" />
              <button
                onClick={() => setShowCashRegister(true)}
                className="sd-chip shrink-0"
                title={cashLabel}
              >
                <span className={`w-2 h-2 rounded-full ${isCashOpen ? 'bg-[#1f7a4d]' : isCashNotOpened ? 'bg-[#d48a1a]' : 'bg-ink-muted'}`} />
                <Wallet size={15} className="sm:hidden" />
                <span className="hidden sm:inline">{cashLabel}</span>
              </button>
              <div className="flex items-center shrink-0 -mr-2 lg:hidden">
                <ThemeToggle className="w-10 h-10 flex items-center justify-center rounded-full text-ink-soft hover:bg-surface hover:text-ink" />
                <button
                  onClick={lockScreen}
                  className="hidden sm:flex w-10 h-10 items-center justify-center rounded-full text-ink-soft hover:bg-surface hover:text-ink"
                  title="Bloquear pantalla"
                  aria-label="Bloquear pantalla"
                >
                  <Lock size={19} />
                </button>
                {!isRecepcion && can('canEditSettings') && (
                  <button
                    onClick={openSettingsGuarded}
                    className="w-10 h-10 flex items-center justify-center rounded-full text-ink-soft hover:bg-surface hover:text-ink"
                    title="Configuración"
                    aria-label="Configuración"
                  >
                    <Settings size={19} />
                  </button>
                )}
                <button
                  onClick={confirmLogout}
                  className="w-10 h-10 flex items-center justify-center rounded-full text-ink-soft hover:bg-surface hover:text-[#b42318]"
                  title={`Cerrar sesión (${isRecepcion ? recepcionUserName : user?.email})`}
                  aria-label="Cerrar sesión"
                >
                  <LogOut size={19} />
                </button>
              </div>
              </div>
              <div className="mt-3 lg:-mt-9 px-0.5">
                {isHome && <p className="text-xs text-ink-muted first-letter:uppercase">{todayLabel}</p>}
                <h1 className="text-2xl font-bold text-brand-ink leading-tight">
                  {isHome ? <>{greeting}{firstName ? `, ${firstName}` : ''}</> : sectionLabel}
                </h1>
              </div>
            </header>
          )
        })()}

        {activeTab === 'students' && (<>
        {/* Acciones: un solo estilo, ícono guinda (sin arcoíris de colores) */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-2 lg:mb-4">
          {[
            { label: 'Alumno', icon: <Plus size={20} strokeWidth={2.4} />, onClick: () => setShowForm(true) },
            { label: 'Venta', icon: <ShoppingBag size={20} />, onClick: () => setShowSaleForm(true) },
            { label: 'Pago rápido', icon: <Zap size={20} />, onClick: () => setShowQuickPayment(true) },
            { label: 'Egreso', icon: <TrendingDown size={20} />, onClick: () => setShowExpenses(true) },
            { label: 'Movimiento', icon: <ArrowLeftRight size={20} />, onClick: () => setShowCashMovements(true) },
            { label: 'Historial', icon: <History size={20} />, onClick: () => setShowPaymentHistory(true) },
          ].map(({ label, icon, onClick }) => (
            <button
              key={label}
              onClick={onClick}
              className="sd-card !shadow-none h-[68px] flex flex-col items-center justify-center gap-1.5 text-ink hover:border-line-strong hover:bg-surface-alt active:scale-95"
            >
              <span className="text-brand-ink">{icon}</span>
              <span className="text-[11px] font-semibold leading-none">{label}</span>
            </button>
          ))}
        </div>

        {/* Accesos secundarios: chips neutros que se acomodan en varias líneas (antes se cortaban) */}
        <div className="relative -mx-4 sm:mx-0 mb-4 lg:hidden">
        <div className="flex sm:flex-wrap gap-2 overflow-x-auto px-4 sm:px-0 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {!isRecepcion && can('canExport') && (
            <button onClick={() => setShowExport(true)} className="sd-chip"><Download size={13} />Exportar</button>
          )}
          <button
            onClick={() => setShowTransferVerification(true)}
            className={`sd-chip ${pendingTransfers > 0 ? 'sd-chip-active' : ''}`}
          >
            <DollarSign size={13} />
            Transferencias
            {pendingTransfers > 0 && (
              <span className="bg-white text-brand-ink text-[10px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center">
                {pendingTransfers}
              </span>
            )}
          </button>
          {!isRecepcion && isAdmin && (
            <>
              <button onClick={() => setShowMonthlyClose(true)} className="sd-chip"><Lock size={13} />Cierre mensual</button>
              <button onClick={() => setShowAuditLog(true)} className="sd-chip"><ScrollText size={13} />Auditoría</button>
              <button onClick={() => setShowUserManagement(true)} className="sd-chip"><UserCheck size={13} />Usuarios</button>
            </>
          )}
          {!isRecepcion && (isAdmin || userRole === 'contador') && (
            <button onClick={() => setShowContabilidad(true)} className="sd-chip"><FileText size={13} />Contabilidad</button>
          )}
          <span className="w-2 shrink-0 sm:hidden" aria-hidden="true" />
        </div>
        {/* Indica que hay más accesos a la derecha (solo celular) */}
        <div className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-paper to-transparent sm:hidden" aria-hidden="true" />
        </div>
        </>)}

        {/* Tabs — ocultos en mobile, la navegación inferior los reemplaza */}
        <div className="hidden md:flex lg:hidden gap-1 mb-6 overflow-x-auto pb-1 bg-gray-100/80 rounded-2xl p-1.5">
          {[
            { id: 'students', icon: Users, label: 'Alumnos', count: students.length },
            { id: 'sales', icon: ShoppingBag, label: 'Tienda' },
            { id: 'courses', icon: Calendar, label: 'Cursos' },
            { id: 'academico', icon: GraduationCap, label: 'Académico' },
            { id: 'expenses', icon: TrendingDown, label: 'Egresos' },
            { id: 'report', icon: BarChart3, label: 'Reporte' },
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
                    ? 'bg-white text-[#551735] shadow-md font-semibold'
                    : 'text-gray-500 hover:bg-white/70 hover:text-[#551735] hover:shadow-sm'
                }`}
              >
                <Icon size={15} />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${
                    activeTab === tab.id ? 'bg-[#f9e8f0] text-[#551735]' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {activeTab === 'students' && (<>
        {/* Resumen del día y del mes en una sola franja */}
        <div className="sd-card grid grid-cols-3 divide-x divide-line mb-3 overflow-hidden">
          <div
            onClick={() => setShowCashRegister(true)}
            className="px-3 py-2.5 cursor-pointer hover:bg-surface-alt"
            title="Ver cuadre de caja"
          >
            <div className="flex items-center justify-between gap-1">
              <p className="sd-section-title !text-[10px]">Hoy</p>
              <button
                onClick={(e) => { e.stopPropagation(); setHideIncome(!hideIncome) }}
                className="-m-1.5 p-1.5 text-ink-muted hover:text-ink"
                title={hideIncome ? 'Mostrar montos' : 'Ocultar montos'}
                aria-label={hideIncome ? 'Mostrar montos' : 'Ocultar montos'}
              >
                {hideIncome ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
            <p className="text-base sm:text-lg font-bold text-ink tabular-nums truncate">
              {hideIncome ? '• • •' : `$${todayIncome.toFixed(2)}`}
            </p>
          </div>
          <div
            onClick={() => setShowMonthlyClose(true)}
            className="px-3 py-2.5 cursor-pointer hover:bg-surface-alt"
            title="Ver cierre mensual"
          >
            <p className="sd-section-title !text-[10px]">Mes</p>
            <p className="text-base sm:text-lg font-bold text-ink tabular-nums truncate">
              {kpis && !kpisLoading ? (hideIncome ? '• • •' : `$${kpis.incomeC.toFixed(0)}`) : '—'}
              {kpis && !kpisLoading && kpis.trend !== null && (
                <span className={`ml-1 text-[11px] font-semibold ${kpis.trend >= 0 ? 'sd-status-ok' : 'sd-status-danger'}`}>
                  {kpis.trend >= 0 ? '▲' : '▼'}{Math.abs(kpis.trend)}%
                </span>
              )}
            </p>
          </div>
          <div
            onClick={() => setShowMonthlyClose(true)}
            className="px-3 py-2.5 cursor-pointer hover:bg-surface-alt"
            title="Tasa de cobro del mes"
          >
            <p className="sd-section-title !text-[10px]">Cobro</p>
            <p className={`text-base sm:text-lg font-bold tabular-nums ${
              kpis?.collectionRate == null ? 'text-ink-muted'
                : kpis.collectionRate >= 80 ? 'sd-status-ok'
                : kpis.collectionRate >= 50 ? 'sd-status-warn'
                : 'sd-status-danger'
            }`}>
              {kpis && !kpisLoading && kpis.collectionRate !== null ? `${kpis.collectionRate}%` : '—'}
            </p>
          </div>
        </div>

        {/* Buscador global */}
        <div className="mb-4">
          <div className="flex items-center gap-3 bg-surface border border-line-strong rounded-xl px-4 h-12 focus-within:border-brand focus-within:ring-4 focus-within:ring-brand-soft transition-all">
            <Search className="text-ink-muted shrink-0" size={18} />
            <input
              ref={globalSearchRef}
              type="text"
              placeholder="Buscar alumna por nombre o cédula"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value)
                if (e.target.value && activeTab !== 'students') {
                  setActiveTab('students')
                }
                if (e.target.value && !showStudentListModal) {
                  // Buscar desde el inicio = buscar entre todas, sin filtros previos
                  setFilterPayment('all')
                  setFilterCourse('all')
                  setShowStudentListModal(true)
                }
              }}
              className="w-full text-base outline-none bg-transparent text-ink placeholder:text-ink-muted"
            />
            {searchTerm ? (
              <button
                onClick={() => setSearchTerm('')}
                className="-mr-2 w-9 h-9 flex items-center justify-center text-ink-muted hover:text-ink rounded-full shrink-0"
                title="Limpiar búsqueda"
                aria-label="Limpiar búsqueda"
              >
                <X size={16} />
              </button>
            ) : (
              <kbd className="hidden md:inline whitespace-nowrap shrink-0 text-[11px] text-ink-muted border border-line rounded px-1.5 py-0.5">Ctrl K</kbd>
            )}
          </div>
        </div>
        </>)}

        {/* Students Tab - Clean Dashboard */}
        {activeTab === 'students' && (
          <>
            {/* Contadores en una sola tarjeta dividida */}
            {(() => {
              const upcomingSoonCount = upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0).length
              const counters = [
                { label: 'Alumnas', value: students.length, tone: 'text-ink', onClick: () => { setFilterPayment('all'); setFilterCourse('all'); setShowStudentListModal(true) } },
                { label: 'Próximos', value: upcomingSoonCount, tone: upcomingSoonCount > 0 ? 'sd-status-warn' : 'text-ink-muted', onClick: () => { setFilterPayment('upcoming'); setShowStudentListModal(true) } },
                { label: 'Saldos', value: studentsWithBalance.length, tone: studentsWithBalance.length > 0 ? 'sd-status-warn' : 'text-ink-muted', onClick: () => studentsWithBalance.length > 0 && setShowBalanceAlerts(true) },
                { label: 'Inactivas', value: inactiveStudents.length, tone: 'text-ink-muted', onClick: () => { setFilterPayment('inactive'); setShowStudentListModal(true) } },
              ]
              return (
                <div className="sd-card grid grid-cols-4 divide-x divide-line mb-5 overflow-hidden">
                  {counters.map(c => (
                    <button key={c.label} onClick={c.onClick} className="py-3 px-1 text-center hover:bg-surface-alt">
                      <p className={`text-xl font-bold tabular-nums leading-tight ${c.tone}`}>{c.value}</p>
                      <p className="text-[11px] text-ink-muted font-medium">{c.label}</p>
                    </button>
                  ))}
                </div>
              )
            })()}

            {/* Requiere atención: mismas tarjetas para todo; el color solo en el estado */}
            {(() => {
              const upcomingSoon = upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0)
              const hasAny = moraStudents.length || overduePayments.length || adultRenewalStudents.length || upcomingSoon.length || studentsWithBalance.length || inactiveStudents.length
              const reminderFor = (s, course, days) => () => {
                const { contactPhone } = getContactInfo(s)
                if (!contactPhone) { alert('Sin teléfono registrado'); return }
                openWhatsApp(contactPhone, buildReminderMessage(s, course?.name || 'N/A', days, settings, graceDays, moraDays, (course?.ageMin ?? 0) >= 18, course, autoInactiveDays))
              }
              const contactDetail = (s, courseName) => {
                const { contactName, contactRelation } = getContactInfo(s)
                return contactRelation !== 'Alumna' ? `${courseName} · ${contactRelation}: ${contactName}` : courseName
              }
              if (!hasAny) return null
              return (
                <>
                  <p className="sd-section-title px-1 mb-2">Requiere atención</p>
                  <div className="lg:grid lg:grid-cols-2 lg:gap-x-4 lg:items-start">

                  {moraStudents.length > 0 && (
                    <HomeSection
                      icon={AlertCircle}
                      title="Suspendidas · no pueden asistir"
                      meta={moraStudents.length}
                      metaTone="danger"
                      onOpen={() => { setFilterPayment('mora'); setShowStudentListModal(true) }}
                      moreCount={Math.max(0, moraStudents.length - 3)}
                    >
                      {moraStudents.slice(0, 3).map(s => {
                        const course = enrichCourse(getCourseById(s.course_id))
                        const daysUntil = getDaysUntilDue(s.next_payment_date)
                        const { contactRelation } = getContactInfo(s)
                        return (
                          <HomeRow
                            key={s.id}
                            name={s.name}
                            detail={contactDetail(s, course?.name || 'Sin curso')}
                            status={`${getDaysLate(s.next_payment_date)}d mora`}
                            tone="danger"
                            onWhatsApp={reminderFor(s, course, daysUntil)}
                            whatsappTitle={`Enviar aviso de suspensión a ${contactRelation}`}
                          />
                        )
                      })}
                    </HomeSection>
                  )}

                  {overduePayments.length > 0 && (
                    <HomeSection
                      icon={AlertCircle}
                      title="Cobros vencidos"
                      meta={overduePayments.length}
                      metaTone="danger"
                      onOpen={() => { setFilterPayment('overdue'); setShowStudentListModal(true) }}
                      moreCount={Math.max(0, overduePayments.length - 3)}
                    >
                      {overduePayments.slice(0, 3).map(s => {
                        const course = enrichCourse(getCourseById(s.course_id))
                        const daysUntil = getDaysUntilDue(s.next_payment_date)
                        return (
                          <HomeRow
                            key={s.id}
                            name={s.name}
                            detail={contactDetail(s, course?.name || 'Sin curso')}
                            status={`${getDaysLate(s.next_payment_date)}d vencido`}
                            tone="danger"
                            onWhatsApp={reminderFor(s, course, daysUntil)}
                          />
                        )
                      })}
                    </HomeSection>
                  )}

                  {adultRenewalStudents.length > 0 && (
                    <HomeSection
                      icon={RefreshCw}
                      title="Ciclos terminados · por renovar"
                      meta={adultRenewalStudents.length}
                      metaTone="warn"
                      onOpen={() => { setFilterPayment('overdue'); setShowStudentListModal(true) }}
                      moreCount={Math.max(0, adultRenewalStudents.length - 3)}
                    >
                      {adultRenewalStudents.slice(0, 3).map(s => {
                        const course = enrichCourse(getCourseById(s.course_id))
                        return (
                          <HomeRow
                            key={s.id}
                            name={s.name}
                            detail={course?.name || 'Sin curso'}
                            status={getDaysLate(s.next_payment_date) === 0 ? 'Renueva hoy' : `Sin renovar · ${getDaysLate(s.next_payment_date)}d`}
                            tone="warn"
                          />
                        )
                      })}
                    </HomeSection>
                  )}

                  {upcomingSoon.length > 0 && (
                    <HomeSection
                      icon={Calendar}
                      title="Cobros próximos · 5 días"
                      meta={upcomingSoon.length}
                      metaTone="warn"
                      onOpen={() => { setFilterPayment('upcoming'); setShowStudentListModal(true) }}
                      moreCount={Math.max(0, upcomingSoon.length - 3)}
                    >
                      {upcomingSoon.slice(0, 3).map(s => {
                        const course = enrichCourse(getCourseById(s.course_id))
                        const days = getDaysUntilDue(s.next_payment_date)
                        return (
                          <HomeRow
                            key={s.id}
                            name={s.name}
                            detail={contactDetail(s, course?.name || 'Sin curso')}
                            status={days === 0 ? 'Mañana' : `en ${days + 1}d`}
                            tone="warn"
                            onWhatsApp={reminderFor(s, course, days)}
                          />
                        )
                      })}
                    </HomeSection>
                  )}

                  {studentsWithBalance.length > 0 && (
                    <HomeSection
                      icon={Wallet}
                      title="Saldos por cobrar"
                      meta={`$${studentsWithBalance.reduce((sum, s) => sum + s.balance, 0).toFixed(2)}`}
                      metaTone="warn"
                      onOpen={() => setShowBalanceAlerts(true)}
                      moreCount={Math.max(0, studentsWithBalance.length - 3)}
                    >
                      {studentsWithBalance.slice(0, 3).map(s => (
                        <HomeRow key={s.id} name={s.name} detail={s.courseName} status={`$${s.balance.toFixed(2)}`} tone="warn" />
                      ))}
                    </HomeSection>
                  )}

                  {inactiveStudents.length > 0 && (
                    <HomeSection
                      icon={Pause}
                      title="Inactivas"
                      meta={inactiveStudents.length}
                      onOpen={() => { setFilterPayment('inactive'); setShowStudentListModal(true) }}
                      moreCount={Math.max(0, inactiveStudents.length - 3)}
                    >
                      {inactiveStudents.slice(0, 3).map(s => (
                        <HomeRow
                          key={s.id}
                          name={s.name}
                          detail={getCourseById(s.course_id)?.name || 'Sin curso'}
                          status={`${getDaysLate(s.next_payment_date)}d sin pagar`}
                          tone="muted"
                        />
                      ))}
                    </HomeSection>
                  )}
                  </div>
                </>
              )
            })()}

            {/* Recordatorios de pago — WhatsApp masivo */}
            {(() => {
              const reminderStudents = [
                ...graceStudents,
                ...overduePayments,
                ...upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0)
              ].filter((s, i, arr) => arr.findIndex(x => x.id === s.id) === i)
                .sort((a, b) => getDaysUntilDue(a.next_payment_date) - getDaysUntilDue(b.next_payment_date))
              if (reminderStudents.length === 0) return null
              const currentStudentInQueue = reminderQueueIdx !== null ? reminderStudents[reminderQueueIdx] : null
              return (
                <div className="sd-card overflow-hidden mb-4">
                  <button
                    onClick={() => { setShowReminders(v => !v); setReminderQueueIdx(null) }}
                    className="w-full flex items-center justify-between px-4 min-h-[52px] hover:bg-surface-alt transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <MessageCircle size={17} className="text-[#1f7a4d]" />
                      <span className="font-semibold text-ink text-sm">Recordatorios de pago</span>
                      <span className="text-xs font-semibold text-ink-muted tabular-nums">{reminderStudents.length}</span>
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
                                const phone = getContactInfo(currentStudentInQueue).contactPhone
                                if (!phone) { alert('Sin teléfono registrado'); return }
                                const course = enrichCourse(getCourseById(currentStudentInQueue.course_id))
                                const days = getDaysUntilDue(currentStudentInQueue.next_payment_date)
                                openWhatsApp(phone, buildReminderMessage(currentStudentInQueue, course?.name || 'N/A', days, settings, graceDays, moraDays, (course?.ageMin ?? 0) >= 18, course, autoInactiveDays))
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
                        const isAdultCycle = (course?.ageMin ?? 0) >= 18 && (course?.priceType === 'mes' || course?.priceType === 'paquete')
                        return (
                          <div key={s.id} className={`flex items-center gap-2 px-3 py-2 rounded-xl ${isActive ? 'bg-green-50 border border-green-200' : 'bg-gray-50'}`}>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{s.name}</p>
                              <p className="text-xs text-gray-500 truncate">{course?.name || 'Sin curso'}</p>
                            </div>
                            <span className={`text-xs font-bold shrink-0 ${isOverdue ? (isAdultCycle ? 'text-sky-600' : 'text-red-500') : 'text-amber-500'}`}>
                              {isOverdue
                                ? (getDaysLate(s.next_payment_date) === 0 ? 'Hoy' : `${getDaysLate(s.next_payment_date)}d ${isAdultCycle ? 'sin renovar' : 'vencido'}`)
                                : days === 0 ? 'Mañana' : `${days + 1}d`}
                            </span>
                            <button
                              onClick={() => {
                                const phone = getContactInfo(s).contactPhone
                                if (!phone) { alert('Sin teléfono registrado'); return }
                                openWhatsApp(phone, buildReminderMessage(s, course?.name || 'N/A', days, settings, graceDays, moraDays, (course?.ageMin ?? 0) >= 18, course, autoInactiveDays))
                              }}
                              className="p-1.5 text-green-600 hover:bg-green-100 rounded-xl active:scale-95 transition-all shrink-0"
                              title="Enviar recordatorio"
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
                <p className="font-medium text-green-800">¡Todo al día!</p>
                <p className="text-sm text-green-600 mt-1">No hay cobros pendientes ni saldos por cobrar</p>
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
          // "Nuevo plan" abierto desde una venta → mostrar la vista de abonos
          const currentStoreView = showNewPlan ? 'abonos' : storeView
          // Productos: catálogo por categoría (antes mezclado con el historial de ventas)
          const CATS = [
            { key: 'entradas',  label: 'Entradas' },
            { key: 'vestuario', label: 'Vestuario' },
            { key: 'uniformes', label: 'Uniformes' },
            { key: 'bar',       label: 'Bar' },
          ]
          const catKeys = CATS.map(c => c.key)
          const categorized = CATS.map(cat => ({ ...cat, products: allProducts.filter(p => p.category === cat.key) }))
            .filter(c => c.products.length > 0)
          const otros = allProducts.filter(p => !catKeys.includes(p.category))
          if (otros.length > 0) categorized.push({ key: 'otros', label: 'Otros', products: otros })
          const hasStockInfo = (p) => p.stock !== null && p.stock !== undefined
          const stockAlerts = allProducts.filter(p => hasStockInfo(p) && p.stock <= 3).length
          // Búsqueda sin tildes ni mayúsculas ("matricula" encuentra "Matrícula")
          const norm = (t) => (t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()
          const catalogQuery = norm(catalogSearch.trim())
          const isFilteringCatalog = catalogQuery.length > 0 || catalogLowOnly
          const visibleCategories = categorized
            .map(cat => ({
              ...cat,
              products: cat.products.filter(p =>
                (!catalogQuery || norm(p.name).includes(catalogQuery)) &&
                (!catalogLowOnly || (hasStockInfo(p) && p.stock <= 3))
              ),
            }))
            .filter(cat => cat.products.length > 0)
          const todaySales = sales.filter(s => s.sale_date === todayStr)
          const todaySalesTotal = todaySales.reduce((sum, s) => sum + (parseFloat(s.total) || 0), 0)
          const METHOD_LABEL = { cash: 'Efectivo', transfer: 'Transferencia', card: 'Tarjeta' }
          const toggleCat = (key) => setCollapsedCats(prev => {
            const next = new Set(prev)
            if (next.has(key)) next.delete(key); else next.add(key)
            return next
          })

          return (
          <div className="space-y-4">
          {/* Selector de vista: Ventas | Abonos | Productos */}
          <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-surface border border-line" role="tablist" aria-label="Vista de tienda">
            {[
              { id: 'ventas', label: 'Ventas', meta: `$${todaySalesTotal.toFixed(0)} hoy` },
              { id: 'abonos', label: 'Abonos', meta: `$${totalDebt.toFixed(0)} por cobrar` },
              { id: 'productos', label: 'Productos', meta: stockAlerts > 0 ? `${stockAlerts} por reponer` : `${allProducts.length} artículos` },
            ].map(v => (
              <button
                key={v.id}
                role="tab"
                aria-selected={currentStoreView === v.id}
                onClick={() => setStoreView(v.id)}
                className={`min-h-[48px] rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                  currentStoreView === v.id ? 'bg-brand text-white' : 'text-ink-soft hover:bg-surface-alt'
                }`}
              >
                <span className="block text-sm font-semibold leading-tight">{v.label}</span>
                <span className={`block text-[11px] tabular-nums truncate ${currentStoreView === v.id ? 'text-white/80' : 'text-ink-muted'}`}>{v.meta}</span>
              </button>
            ))}
          </div>

          {/* ── Ventas: lo vendido en el periodo ── */}
          {currentStoreView === 'ventas' && (
          <div className="space-y-3">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-2xl font-bold text-ink tabular-nums leading-tight">
                  ${filteredTotal.toFixed(2)} <span className="text-sm font-medium text-ink-muted">{filterLabels[salesDateFilter].toLowerCase()}</span>
                </p>
                <p className="text-xs text-ink-muted">{filteredSales.length} artículo{filteredSales.length !== 1 ? 's' : ''} vendido{filteredSales.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setShowSaleForm(true)} className="sd-btn sd-btn-primary sd-btn-sm shrink-0">
                <Plus size={16} /> Nueva venta
              </button>
            </div>

            <div className="flex gap-2 overflow-x-auto -mx-1 px-1 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[
                { value: 'today', label: 'Hoy' },
                { value: 'week', label: '7 días' },
                { value: 'month', label: 'Este mes' },
                { value: 'all', label: 'Todo' },
              ].map(fl => (
                <button key={fl.value} onClick={() => setSalesDateFilter(fl.value)} aria-pressed={salesDateFilter === fl.value} className="sd-chip shrink-0">
                  {fl.label}
                </button>
              ))}
            </div>

            {filteredSales.length === 0 ? (
              <div className="sd-card p-8 text-center">
                <ShoppingBag size={32} className="mx-auto mb-3 text-ink-muted" />
                <p className="text-sm text-ink-soft">{salesDateFilter === 'today' ? 'Sin ventas hoy' : salesDateFilter === 'week' ? 'Sin ventas esta semana' : salesDateFilter === 'month' ? 'Sin ventas este mes' : 'No hay ventas registradas'}</p>
                <button onClick={() => setShowSaleForm(true)} className="sd-btn sd-btn-secondary sd-btn-sm mt-4">Registrar una venta</button>
              </div>
            ) : (
              <div className="sd-card overflow-hidden">
                {(() => {
                  // Agrupar ventas: agrupadas por sale_group_id, o individuales (null)
                  const groups = []
                  const seen = new Set()
                  for (const sale of filteredSales) {
                    if (sale.sale_group_id) {
                      if (seen.has(sale.sale_group_id)) continue
                      seen.add(sale.sale_group_id)
                      const items = filteredSales.filter(x => x.sale_group_id === sale.sale_group_id)
                      groups.push({ isGroup: true, id: sale.sale_group_id, items, sale })
                    } else {
                      groups.push({ isGroup: false, id: sale.id, items: [sale], sale })
                    }
                  }
                  return groups.map(group => {
                    const groupTotal = group.items.reduce((sum, i) => sum + parseFloat(i.total || 0), 0)
                    const first = group.items[0]
                    const extra = group.items.length - 1
                    return (
                      <div key={group.id} className="flex items-start gap-3 px-4 py-3 border-b border-line last:border-b-0">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink leading-snug">
                            {first.product_name} <span className="font-normal text-ink-muted">×{first.quantity}</span>
                            {extra > 0 && <span className="font-normal text-ink-muted"> · +{extra} más</span>}
                          </p>
                          <p className="text-xs text-ink-muted truncate">
                            {group.sale.customer_name}{group.sale.program ? ` · ${group.sale.program}` : ''}
                          </p>
                          <p className="text-[11px] text-ink-muted">
                            {formatDate(group.sale.sale_date)} · {METHOD_LABEL[group.sale.payment_method] || group.sale.payment_method || 'Efectivo'}
                            {group.sale.receipt_number && <span> · {group.sale.receipt_number}</span>}
                          </p>
                        </div>
                        <div className="flex flex-col items-end shrink-0">
                          <p className="text-sm font-bold text-ink tabular-nums">${groupTotal.toFixed(2)}</p>
                          <div className="flex items-center -mr-2">
                          {group.sale.receipt_number && (
                            <button
                              onClick={() => {
                                setLastSaleReceipt({
                                  receiptNumber: group.sale.receipt_number,
                                  customerName: group.sale.customer_name,
                                  program: group.sale.program || null,
                                  items: group.items.map(i => ({ productName: i.product_name, quantity: i.quantity, unitPrice: i.unit_price })),
                                  total: groupTotal,
                                  date: group.sale.sale_date,
                                  paymentMethod: group.sale.payment_method || 'cash'
                                })
                                setShowSaleReceipt(true)
                              }}
                              className="w-9 h-9 flex items-center justify-center rounded-full text-ink-muted hover:text-ink hover:bg-surface-alt"
                              title="Ver comprobante"
                              aria-label="Ver comprobante"
                            >
                              <ScrollText size={16} />
                            </button>
                          )}
                          {!isRecepcion && (
                            <button
                              onClick={() => group.items.forEach(i => handleDeleteSale(i))}
                              className="w-9 h-9 flex items-center justify-center rounded-full text-ink-muted hover:text-[#b42318] hover:bg-surface-alt"
                              title="Eliminar venta"
                              aria-label="Eliminar venta"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                          </div>
                        </div>
                      </div>
                    )
                  })
                })()}
              </div>
            )}
          </div>
          )}

          {/* ── Productos: catálogo con stock ── */}
          {currentStoreView === 'productos' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-ink-muted">
                {allProducts.length} artículo{allProducts.length !== 1 ? 's' : ''}
                {stockAlerts > 0 && <span className="sd-status-warn font-semibold"> · {stockAlerts} con poco stock</span>}
              </p>
              {isAdmin && (
                <button onClick={() => setShowManageItems(true)} className="sd-btn sd-btn-secondary sd-btn-sm shrink-0">
                  <Package size={15} /> Gestionar
                </button>
              )}
            </div>

            {/* Buscar por nombre + ver solo lo que hay que reponer */}
            <div className="flex gap-2">
              <div className="flex-1 flex items-center gap-2 h-11 px-3 bg-surface border border-line-strong rounded-xl focus-within:border-brand focus-within:ring-4 focus-within:ring-brand-soft transition-all">
                <Search size={16} className="text-ink-muted shrink-0" />
                <input
                  type="text"
                  value={catalogSearch}
                  onChange={e => setCatalogSearch(e.target.value)}
                  placeholder="Buscar artículo"
                  className="flex-1 min-w-0 text-base outline-none bg-transparent text-ink placeholder:text-ink-muted"
                />
                {catalogSearch && (
                  <button onClick={() => setCatalogSearch('')} className="-mr-1.5 w-8 h-8 flex items-center justify-center text-ink-muted hover:text-ink rounded-full shrink-0" aria-label="Limpiar búsqueda">
                    <X size={15} />
                  </button>
                )}
              </div>
              {stockAlerts > 0 && (
                <button onClick={() => setCatalogLowOnly(v => !v)} aria-pressed={catalogLowOnly} className="sd-chip shrink-0 !min-h-11">
                  Por reponer <span className="tabular-nums opacity-80">{stockAlerts}</span>
                </button>
              )}
            </div>

            {visibleCategories.length === 0 && (
              <div className="sd-card p-6 text-center">
                <p className="text-sm text-ink-soft">
                  {catalogLowOnly && !catalogQuery ? 'Ningún artículo por reponer' : `Sin artículos para "${catalogSearch.trim()}"`}
                </p>
                <button onClick={() => { setCatalogSearch(''); setCatalogLowOnly(false) }} className="sd-btn sd-btn-ghost sd-btn-sm mt-2">Ver todo el catálogo</button>
              </div>
            )}

            {visibleCategories.map(cat => {
              // Al buscar, las categorías con resultados se muestran abiertas
              const collapsed = !isFilteringCatalog && collapsedCats.has(cat.key)
              return (
                <div key={cat.key} className="sd-card overflow-hidden">
                  <button type="button" onClick={() => !isFilteringCatalog && toggleCat(cat.key)} aria-expanded={!collapsed}
                    className="w-full flex items-center justify-between px-4 min-h-[48px] hover:bg-surface-alt transition-colors">
                    <span className="sd-section-title">
                      {cat.label} <span className="normal-case tracking-normal font-medium">· {cat.products.length}</span>
                    </span>
                    <ChevronDown size={16} className={`text-ink-muted transition-transform duration-200 ${collapsed ? '' : 'rotate-180'}`} />
                  </button>
                  {!collapsed && cat.products.map(product => {
                    const hasStock = hasStockInfo(product)
                    const outOfStock = hasStock && product.stock === 0
                    const lowStock = hasStock && product.stock > 0 && product.stock <= 3
                    return (
                      <div key={product.id} className={`flex items-center gap-3 px-4 py-2.5 border-t border-line ${outOfStock ? 'opacity-60' : ''}`}>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-ink leading-snug">{product.name}</p>
                          <p className="text-xs tabular-nums">
                            <span className="font-semibold text-ink">${product.price}</span>
                            {hasStock && (
                              <span className={outOfStock ? 'sd-status-danger font-semibold' : lowStock ? 'sd-status-warn font-semibold' : 'text-ink-muted'}>
                                {' · '}{outOfStock ? 'Agotado' : `${product.stock} en stock`}
                              </span>
                            )}
                          </p>
                        </div>
                        <button
                          onClick={() => { setNewPlanPreselect(product); setShowNewPlan(true) }}
                          className="sd-btn sd-btn-ghost sd-btn-sm"
                        >
                          Abonar
                        </button>
                        <button
                          disabled={outOfStock}
                          onClick={() => { setSaleForm(fm => ({ ...fm, productId: product.id })); setShowSaleForm(true) }}
                          className="sd-btn sd-btn-secondary sd-btn-sm !text-brand-ink"
                        >
                          Vender
                        </button>
                      </div>
                    )
                  })}
                </div>
              )
            })}
          </div>
          )}

          {/* Ventas en Abonos */}
          {currentStoreView === 'abonos' && (
          <div>
            <p className="text-xs text-ink-muted px-1 mb-3">Planes de pago · uniformes, vestuario, entradas</p>
            <div>
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
                onExternalClose={() => { setShowNewPlan(false); setNewPlanPreselect(null); setStoreView('abonos') }}
              />
            </div>
          </div>
          )}
          </div>
          )
        })()}

        {/* Courses Tab */}
        {activeTab === 'courses' && (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-ink-muted">{allCourses.length} curso{allCourses.length !== 1 ? 's' : ''} activo{allCourses.length !== 1 ? 's' : ''}</p>
              {isAdmin && (
                <button
                  onClick={() => setShowManageItems(true)}
                  className="sd-btn sd-btn-primary sd-btn-sm"
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
                    <div className="sd-card p-4 sm:p-5">
                      <h2 className="sd-section-title mb-3 flex items-center gap-2">
                        Clases regulares
                      </h2>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {regular.map(course => {
                          const enrolledCount = students.filter(s => s.course_id === (course.id || course.code)).length
                          return (
                            <div key={course.id || course.code} className="rounded-xl p-4 bg-surface-alt border border-line">
                              <h3 className="font-semibold text-ink leading-tight">{course.name}</h3>
                              <p className="text-xs text-ink-muted mt-0.5">{course.schedule || 'Sin horario definido'}</p>
                              <div className="flex items-center justify-between mt-3">
                                <p className="text-lg font-bold text-ink tabular-nums">
                                  ${course.price}<span className="text-xs font-normal text-ink-muted">/{(course.priceType || course.price_type) === 'mes' ? 'mes' : 'clase'}</span>
                                </p>
                                <span className="text-xs font-semibold text-ink-soft tabular-nums">
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
                    <div className="sd-card p-4 sm:p-5">
                      <h2 className="sd-section-title mb-3 flex items-center gap-2">
                        Programas
                      </h2>
                      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {programs.map(course => {
                          const enrolledCount = students.filter(s => s.course_id === (course.id || course.code)).length
                          return (
                            <div key={course.id || course.code} className="rounded-xl p-4 bg-surface-alt border border-line">
                              <h3 className="font-semibold text-ink leading-tight">{course.name}</h3>
                              <p className="text-xs text-ink-muted mt-0.5">
                                {(course.ageMin || course.age_min)} - {(course.ageMax || course.age_max)} años
                                {course.schedule && ` · ${course.schedule}`}
                              </p>
                              <div className="flex items-center justify-between mt-3">
                                <div>
                                  <p className="text-lg font-bold text-ink tabular-nums">${course.price}</p>
                                  {(course.allowsInstallments || course.allows_installments) && (
                                    <p className="text-[11px] text-ink-muted">{course.installmentCount || course.installment_count || 2} cuotas</p>
                                  )}
                                </div>
                                <span className="text-xs font-semibold text-ink-soft tabular-nums">
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
          <div className="space-y-3">
            <div className="sd-card p-5">
              <p className="sd-section-title">Egresos de hoy</p>
              <p className="text-xs text-ink-muted first-letter:uppercase mb-2">
                {new Date(getTodayEC() + 'T12:00:00').toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
              <p className="text-3xl font-bold text-ink tabular-nums">−${todayExpensesTotal.toFixed(2)}</p>
              <div className="flex flex-wrap gap-2 mt-4">
                <button onClick={() => setShowExpenses(true)} className="sd-btn sd-btn-primary flex-1 sm:flex-none">
                  <Plus size={16} /> Registrar egreso
                </button>
                <button onClick={() => setShowExpenses(true)} className="sd-btn sd-btn-secondary flex-1 sm:flex-none">
                  Ver detalle
                </button>
              </div>
            </div>
            {!isRecepcion && (
              <button onClick={() => setShowManageCategories(true)} className="sd-card w-full flex items-center gap-3 px-4 min-h-[56px] text-left hover:bg-surface-alt">
                <Palette size={18} className="text-ink-muted shrink-0" />
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-ink">Categorías de egresos</span>
                  <span className="block text-xs text-ink-muted">Ordena en qué se gasta</span>
                </span>
                <ChevronDown size={16} className="text-ink-muted -rotate-90" />
              </button>
            )}
          </div>
        )}

        {/* Report Tab */}
        {activeTab === 'report' && (
          <DailyReport cashRegister={todayRegister} />
        )}

        {/* ── Área Académica ── */}
        {activeTab === 'academico' && (
          <div>
            {/* Sub-barra académica */}
            <div className="flex gap-2 mb-4 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[
                { id: 'instructoras',  icon: GraduationCap, label: 'Instructoras' },
                { id: 'ciclos',        icon: History,       label: 'Ciclos' },
                { id: 'reportes',      icon: FileText,      label: 'Reportes de ciclo' },
                { id: 'honorarios',    icon: DollarSign,    label: 'Honorarios' },
              ].map(sub => {
                const Icon = sub.icon
                return (
                  <button
                    key={sub.id}
                    onClick={() => setActiveAcademicTab(sub.id)}
                    aria-pressed={activeAcademicTab === sub.id}
                    className="sd-chip shrink-0"
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
            {activeAcademicTab === 'honorarios' && (
              <HonorariosPanel />
            )}
          </div>
        )}

        {/* Tablón Tab */}
        {activeTab === 'tablon' && (() => {
          const COLORS = [
            { id: 'purple', bg: 'bg-[#f9e8f0]', text: 'text-[#551735]', border: 'border-[#c98daa]', label: 'Morado' },
            { id: 'blue',   bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-300',   label: 'Azul' },
            { id: 'green',  bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-300',  label: 'Verde' },
            { id: 'amber',  bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-300',  label: 'Amarillo' },
            { id: 'rose',   bg: 'bg-rose-100',   text: 'text-rose-700',   border: 'border-rose-300',   label: 'Rosa' },
          ]
          const colorCfg = (id) => COLORS.find(c => c.id === id) || COLORS[0]
          return (
            <div className="space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-ink-muted">
                  {announcements.filter(a => a.active).length} aviso{announcements.filter(a => a.active).length !== 1 ? 's' : ''} activo{announcements.filter(a => a.active).length !== 1 ? 's' : ''} · los ven las familias en el portal
                </p>
                <button
                  onClick={() => { setEditingAnnouncement(null); setAnnouncementForm({ title: '', body: '', color: 'purple', pinned: false, expires_at: '' }); setShowAnnouncementForm(true) }}
                  className="sd-btn sd-btn-primary sd-btn-sm shrink-0"
                >
                  <Plus size={15} /> Nuevo aviso
                </button>
              </div>

              {/* Create/Edit form */}
              {showAnnouncementForm && (
                <div className="sd-card p-4 space-y-3">
                  <h3 className="font-semibold text-ink text-sm">{editingAnnouncement ? 'Editar aviso' : 'Nuevo aviso'}</h3>
                  <input
                    type="text"
                    value={announcementForm.title}
                    onChange={e => setAnnouncementForm(f => ({ ...f, title: e.target.value }))}
                    placeholder="Título del aviso *"
                    className="w-full px-3 py-2.5 bg-surface border border-line-strong rounded-xl text-base text-ink placeholder:text-ink-muted focus:ring-4 focus:ring-brand-soft focus:border-brand outline-none transition-all"
                  />
                  <textarea
                    value={announcementForm.body}
                    onChange={e => setAnnouncementForm(f => ({ ...f, body: e.target.value }))}
                    placeholder="Contenido del aviso *"
                    rows={3}
                    className="w-full px-3 py-2.5 bg-surface border border-line-strong rounded-xl text-base text-ink placeholder:text-ink-muted focus:ring-4 focus:ring-brand-soft focus:border-brand resize-none outline-none transition-all"
                  />
                  {/* Color picker */}
                  <div>
                    <p className="text-xs text-ink-muted mb-1.5 font-medium">Color del aviso</p>
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
                        className="w-4 h-4 accent-[#6b2145]"
                      />
                      <span className="text-sm text-ink flex items-center gap-1"><Pin size={13} /> Fijar arriba</span>
                    </label>
                    {/* Expiry */}
                    <div className="flex items-center gap-2">
                      <label className="text-sm text-ink-soft">Vence:</label>
                      <input
                        type="date"
                        value={announcementForm.expires_at}
                        onChange={e => setAnnouncementForm(f => ({ ...f, expires_at: e.target.value }))}
                        className="px-2 py-1.5 bg-surface border border-line-strong rounded-xl text-sm text-ink focus:ring-4 focus:ring-brand-soft outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={saveAnnouncement}
                      disabled={!announcementForm.title.trim() || !announcementForm.body.trim()}
                      className="flex-1 sd-btn sd-btn-primary"
                    >
                      {editingAnnouncement ? 'Guardar cambios' : 'Publicar aviso'}
                    </button>
                    <button
                      onClick={() => { setShowAnnouncementForm(false); setEditingAnnouncement(null) }}
                      className="sd-btn sd-btn-secondary"
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}

              {/* Announcement list */}
              {announcements.length === 0 && (
                <div className="sd-card p-8 text-center">
                  <Megaphone size={32} className="mx-auto mb-3 text-ink-muted" />
                  <p className="text-sm text-ink-soft">Todavía no hay avisos. Publica el primero para las familias.</p>
                </div>
              )}
              {announcements.map(a => {
                const cfg = colorCfg(a.color)
                return (
                  <div key={a.id} className={`sd-card overflow-hidden ${!a.active ? 'opacity-60' : ''}`}>
                    <div className={`flex items-center gap-2 px-4 py-2.5 ${cfg.bg}`}>
                      {a.pinned && <Pin size={13} className={cfg.text} />}
                      <span className={`font-semibold text-sm flex-1 ${cfg.text}`}>{a.title}</span>
                      {a.expires_at && <span className={`text-xs ${cfg.text} opacity-80`}>Vence {formatDate(a.expires_at)}</span>}
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-sm text-ink whitespace-pre-wrap leading-relaxed">{a.body}</p>
                      <div className="flex items-center gap-1 mt-3 pt-2 border-t border-line -mr-2">
                        <span className="text-xs text-ink-muted flex-1">
                          {formatDate(a.created_at)} · <span className={a.active ? 'sd-status-ok font-semibold' : ''}>{a.active ? 'Visible' : 'Oculto'}</span>
                        </span>
                        <button onClick={() => openEditAnnouncement(a)} className="w-10 h-10 flex items-center justify-center rounded-full text-ink-muted hover:text-ink hover:bg-surface-alt" title="Editar aviso" aria-label="Editar aviso">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => toggleAnnouncementActive(a.id, a.active)} className="w-10 h-10 flex items-center justify-center rounded-full text-ink-muted hover:text-ink hover:bg-surface-alt" title={a.active ? 'Ocultar del portal' : 'Mostrar en el portal'} aria-label={a.active ? 'Ocultar del portal' : 'Mostrar en el portal'}>
                          {a.active ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <button onClick={() => deleteAnnouncement(a.id)} className="w-10 h-10 flex items-center justify-center rounded-full text-ink-muted hover:text-[#b42318] hover:bg-surface-alt" title="Eliminar aviso" aria-label="Eliminar aviso">
                          <Trash2 size={16} />
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
          <div className="fixed inset-0 bg-[#1a0010]/60 flex items-end sm:items-center justify-center sm:p-4 z-50" onClick={() => { setShowSaleForm(false); setCartItems([]); setProductSearch('') }}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92svh] sm:max-h-[90vh] flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} onClick={(e) => e.stopPropagation()}>
              {/* Header */}
              <div className="border-b shrink-0">
                <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
                  <div className="w-10 h-1 rounded-full bg-gray-300" />
                </div>
                <div className="px-5 pb-4 pt-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingBag size={20} className="text-brand-ink" />
                  <h2 className="text-xl font-semibold text-gray-800">Nueva Venta</h2>
                </div>
                <button onClick={() => { setShowSaleForm(false); setCartItems([]); setProductSearch('') }} className="p-2 hover:bg-gray-100 rounded-xl active:scale-95 transition-all">
                  <X size={20} />
                </button>
                </div>
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

                  {/* Programa (opcional) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Programa <span className="text-gray-400 font-normal">(opcional)</span></label>
                    <select
                      value={saleForm.program}
                      onChange={(e) => setSaleForm({...saleForm, program: e.target.value})}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white outline-none transition-all"
                    >
                      <option value="">— Sin programa —</option>
                      {allCourses.map(c => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                    </select>
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
                        className="w-full pl-10 pr-3 py-2 border-2 border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white outline-none transition-all"
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
                        className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white outline-none transition-all"
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
                        className="flex-1 sd-btn sd-btn-secondary sd-btn-sm !text-brand-ink active:scale-95 transition-all flex items-center justify-center gap-1.5"
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
                          🛒 Carrito — {cartItems.length} ítem{cartItems.length !== 1 ? 's' : ''}
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
                                className="p-1 text-red-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
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

                  {/* Fecha */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fecha</label>
                    <input
                      type="date"
                      value={saleForm.date}
                      onChange={(e) => setSaleForm({...saleForm, date: e.target.value})}
                      className="w-full px-3 py-2 border-2 border-gray-200 rounded-xl text-base focus:ring-2 focus:ring-green-500 outline-none transition-all"
                    />
                  </div>

                  <PaymentMethodPicker
                    paymentMethod={saleForm.paymentMethod}
                    bankId={saleForm.bankId}
                    transferReceipt={saleForm.transferReceipt}
                    onChange={patch => setSaleForm(prev => ({ ...prev, ...patch }))}
                  />

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
                    disabled={cartItems.length === 0 || !saleForm.customerName}
                    className="flex-1 sd-btn sd-btn-primary sd-btn-lg flex items-center justify-center gap-2 font-semibold"
                  >
                    <Check size={18} />
                    Registrar venta
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
            paymentStatus={getPaymentStatus(selectedStudent, enrichCourse(getCourseById(selectedStudent.course_id)), autoInactiveDays, graceDays, moraDays)}
            onClose={() => {
              setShowPaymentModal(false)
              setSelectedStudent(null)
            }}
            onPaymentComplete={handlePaymentComplete}
            onFetchCoursePlans={fetchCoursePlans}
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
        {showUserManagement && isAdmin && (
          <UserManagement isOpen={true} onClose={() => setShowUserManagement(false)} currentUserId={user?.id} />
        )}

        {showSettings && (
          <ErrorBoundary compact>
            <SettingsModal
              settings={settings}
              onClose={() => setShowSettings(false)}
              onSave={updateSettings}
            />
          </ErrorBoundary>
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
            onFetchCoursePlans={fetchCoursePlans}
            onSaveCoursePlan={saveCoursePlan}
            onDeleteCoursePlan={deleteCoursePlan}
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
          <div className="fixed inset-0 bg-[#1a0010]/60 flex items-stretch sm:items-center justify-center sm:p-4 z-50" onClick={() => setShowStudentListModal(false)}>
            {/* Celular: pantalla completa. PC: panel centrado */}
            <div className={`bg-paper sm:bg-surface sm:rounded-2xl shadow-2xl w-full sm:max-w-4xl h-[100svh] sm:h-auto sm:max-h-[90vh] overflow-hidden flex flex-col transition-[margin] ${showStudentDetail ? "lg:mr-[28rem]" : ""}`} style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} onClick={(e) => e.stopPropagation()}>
              {/* Cabecera */}
              <div className="flex items-center gap-2 px-2 sm:px-4 h-14 shrink-0 bg-surface border-b border-line">
                <button
                  onClick={() => setShowStudentListModal(false)}
                  className="w-10 h-10 flex items-center justify-center rounded-full text-ink-soft hover:bg-surface-alt"
                  aria-label="Volver"
                  title="Volver"
                >
                  <ArrowLeft size={20} className="sm:hidden" />
                  <X size={20} className="hidden sm:block" />
                </button>
                <div className="flex-1 min-w-0">
                  <h2 className="text-base font-bold text-brand-ink leading-tight truncate">
                    {filteredStudents.length === students.length
                      ? `${students.length} alumnas`
                      : `${filteredStudents.length} de ${students.length} alumnas`}
                  </h2>
                  <p className="text-xs text-ink-muted truncate">
                    {filterPayment === 'overdue' ? 'Por renovar' :
                     filterPayment === 'mora' ? 'Suspendidas' :
                     filterPayment === 'upcoming' ? 'Próximas a vencer' :
                     filterPayment === 'inactive' ? 'Inactivas' :
                     filterCourse !== 'all' ? 'Filtradas por curso' :
                     'Toca una alumna para ver su ficha'}
                  </p>
                </div>
                <button
                  onClick={() => { setShowStudentListModal(false); setShowForm(true) }}
                  className="sd-btn sd-btn-primary sd-btn-sm"
                >
                  <Plus size={16} />
                  <span>Alumna</span>
                </button>
              </div>

              {/* Búsqueda y filtros */}
              <div className="px-4 pt-3 pb-2 bg-surface border-b border-line space-y-2.5 shrink-0">
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="sm:flex-1 flex items-center gap-2 h-11 px-3 bg-surface border border-line-strong rounded-xl focus-within:border-brand focus-within:ring-4 focus-within:ring-brand-soft transition-all">
                    <Search className="text-ink-muted shrink-0" size={17} />
                    <input
                      type="text"
                      placeholder="Nombre, cédula o representante"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full text-base outline-none bg-transparent text-ink placeholder:text-ink-muted"
                    />
                    {searchTerm && (
                      <button
                        onClick={() => setSearchTerm('')}
                        className="-mr-1.5 w-8 h-8 flex items-center justify-center text-ink-muted hover:text-ink rounded-full shrink-0"
                        aria-label="Limpiar búsqueda"
                      >
                        <X size={15} />
                      </button>
                    )}
                  </div>
                  <select
                    value={filterCourse}
                    onChange={(e) => setFilterCourse(e.target.value)}
                    className="h-11 px-3 text-base border border-line-strong rounded-xl bg-surface text-ink sm:max-w-[200px]"
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

                {/* Filtros de estado: neutros, el activo en guinda; deslizables en celular */}
                <div className="-mx-4 px-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {[
                    { value: 'all', label: 'Todas', count: null },
                    { value: 'overdue', label: 'Por renovar', count: graceStudents.length + overduePayments.length },
                    { value: 'mora', label: 'Suspendidas', count: moraStudents.length },
                    { value: 'upcoming', label: 'Próximas', count: upcomingPayments.filter(s => getDaysUntilDue(s.next_payment_date) >= 0).length },
                    { value: 'inactive', label: 'Inactivas', count: inactiveStudents.length },
                  ].map(chip => (
                    <button
                      key={chip.value}
                      onClick={() => setFilterPayment(chip.value)}
                      aria-pressed={filterPayment === chip.value}
                      className="sd-chip shrink-0"
                    >
                      {chip.label}
                      {chip.count > 0 && <span className="tabular-nums opacity-80">{chip.count}</span>}
                    </button>
                  ))}
                  {(searchTerm || filterCourse !== 'all' || filterPayment !== 'all') && (
                    <button
                      onClick={() => { setSearchTerm(''); setFilterCourse('all'); setFilterPayment('all') }}
                      className="sd-chip shrink-0 !border-transparent !bg-transparent text-brand-ink"
                    >
                      Limpiar
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
                        className="px-4 py-2.5 bg-[#6b2145] text-white rounded-xl text-sm font-medium hover:bg-[#551735] transition-colors"
                      >
                        Agregar alumna
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="bg-surface sm:bg-transparent">
                    {filteredStudents.map(student => {
                      const course = enrichCourse(getCourseById(student.course_id))
                      const paymentStatus = getPaymentStatus(student, course, autoInactiveDays, graceDays, moraDays)
                      const isCamp = student.course_id?.startsWith('camp-')
                      // En PC la lista queda abierta y la ficha se abre al costado
                      const openDetail = () => { if (window.innerWidth < 1024) setShowStudentListModal(false); setShowStudentDetail(student) }

                      return (
                        <div
                          key={student.id}
                          role="button"
                          tabIndex={0}
                          onClick={openDetail}
                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openDetail() } }}
                          className="px-4 py-3 border-b border-line cursor-pointer hover:bg-surface-alt focus-visible:bg-surface-alt transition-colors"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                              <StudentAvatar student={student} isCamp={isCamp} />
                              <div className="min-w-0">
                                <h3 className="font-semibold text-ink text-sm sm:text-base leading-snug line-clamp-2">{student.name}</h3>
                                <p className="text-xs sm:text-sm text-ink-muted truncate">
                                  {student.age ? `${student.age} años · ` : ''}{course?.name || 'Sin curso'}
                                </p>
                                <span className={`sm:hidden inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${paymentStatus.color}`}>
                                  {paymentStatus.label}
                                </span>
                                {searchTerm && student.parent_name && student.parent_name.toLowerCase().includes(searchTerm.toLowerCase()) && (
                                  <p className="text-[10px] text-gray-400 truncate">Representante: {student.parent_name}</p>
                                )}
                                {(course?.priceType === 'mes' || course?.priceType === 'paquete') && (() => {
                                  const cycleClasses = course?.classesPerCycle || course?.classesPerPackage || null
                                  const today = getTodayEC()
                                  // Ciclo escolar definido → respetarlo:
                                  // - Si todavía no inicia: mostrar fecha de inicio en vez del contador
                                  // - Si ya terminó: no mostrar nada (badge "Ciclo finalizado" cubre)
                                  const cicloInicio = course?.cicloInicio || course?.ciclo_inicio
                                  const cicloFin = course?.cicloFin || course?.ciclo_fin
                                  if (cicloFin && today > cicloFin) return null
                                  if (cicloInicio && today < cicloInicio) {
                                    return (
                                      <p className="text-[10px] text-[#6b2145] font-semibold mt-0.5">
                                        Inicia {cicloInicio.split('-').reverse().slice(0, 2).join('/')}
                                      </p>
                                    )
                                  }
                                  // Si pagó anticipado y el nuevo ciclo aún no empieza → mostrar ciclo viejo
                                  const showOldCycle = student.prepaid && student.prepaid_old_start && student.last_payment_date && today < student.last_payment_date
                                  let baseDate = showOldCycle ? student.prepaid_old_start : (student.last_payment_date || student.enrollment_date)
                                  const endDate  = showOldCycle ? student.last_payment_date : student.next_payment_date
                                  // Clamp baseDate al ciclo escolar: si pagó antes del inicio del ciclo,
                                  // el conteo debe empezar desde el inicio del ciclo (no desde el pago).
                                  if (cicloInicio && baseDate && baseDate < cicloInicio) {
                                    baseDate = cicloInicio
                                  }
                                  if (!baseDate || !endDate) return null
                                  const cycleInfo = getCycleInfo(baseDate, endDate, course?.classDays, cycleClasses)
                                  if (!cycleInfo || !cycleInfo.totalClasses) return null
                                  return (
                                    <p className="text-[10px] text-[#6b2145] font-semibold mt-0.5">
                                      Clase {cycleInfo.classesPassed}/{cycleInfo.totalClasses}
                                      {showOldCycle && ' (ciclo actual)'}
                                    </p>
                                  )
                                })()}
                                {student.is_paused && (
                                  <span className="inline-block mt-1 px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-[10px] font-medium">Pausado</span>
                                )}
                                {student.prepaid && (
                                  <span className="inline-block mt-1 px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-[10px] font-semibold">✓ Mes anticipado</span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1 sm:gap-3 shrink-0">
                              <div className="text-right">
                                <p className="font-semibold text-ink text-sm hidden sm:block tabular-nums">
                                  ${student.monthly_fee}
                                  {(() => {
                                    const c = getCourseById(student.course_id)
                                    const fee = parseFloat(student.monthly_fee) || 0
                                    const cPrice = c?.price || 0
                                    return (c?.priceType === 'mes' || c?.priceType === 'paquete') && fee > 0 && fee < cPrice
                                      ? <span className="ml-1 text-[9px] text-amber-600 font-bold">★</span>
                                      : null
                                  })()}
                                </p>
                                <span className={`hidden sm:inline-block mt-0.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide ${paymentStatus.color}`}>
                                  {paymentStatus.label}
                                </span>
                              </div>

                              <div className="flex gap-0.5 sm:gap-1">
                                {!(course?.priceType === 'programa' && (
                                  paymentStatus.status === 'paid' ||
                                  (parseFloat(student.amount_paid || 0) > 0 && parseFloat(student.balance || 0) <= 0)
                                )) && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); setShowStudentListModal(false); openPaymentModal(student) }}
                                    className="w-11 h-11 flex items-center justify-center rounded-full text-brand-ink hover:bg-brand-soft active:scale-95 transition-all"
                                    title="Registrar pago"
                                    aria-label={`Registrar pago de ${student.name}`}
                                  >
                                    <CreditCard size={19} />
                                  </button>
                                )}
                                {/* Acciones secundarias: solo visible en desktop */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    const phone = getContactInfo(student).contactPhone
                                    if (!phone) { alert('Este alumno no tiene teléfono registrado'); return }
                                    const courseObj = enrichCourse(getCourseById(student.course_id))
                                    const days = getDaysUntilDue(student.next_payment_date)
                                    const msg = buildReminderMessage(student, courseObj?.name || 'N/A', days, settings, graceDays, moraDays, (courseObj?.ageMin ?? 0) >= 18, courseObj, autoInactiveDays)
                                    openWhatsApp(phone, msg)
                                  }}
                                  className="hidden sm:flex p-2 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-xl active:scale-95 transition-all"
                                  title="Recordatorio WhatsApp"
                                >
                                  <MessageCircle size={16} />
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); setShowStudentListModal(false); handleEdit(student) }}
                                  className="hidden sm:flex p-2 text-gray-400 hover:text-[#6b2145] hover:bg-[#fdf5f9] rounded-xl active:scale-95 transition-all"
                                  title="Editar"
                                >
                                  <Edit2 size={16} />
                                </button>
                                {!isRecepcion && (
                                  <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(student) }}
                                    className="hidden sm:flex p-2 text-orange-400 hover:text-orange-600 hover:bg-orange-50 rounded-xl active:scale-95 transition-all"
                                    title="Dar de baja"
                                  >
                                    <UserMinus size={16} />
                                  </button>
                                )}
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
              <div className="px-4 py-2.5 border-t border-line bg-surface flex items-center justify-between gap-2 shrink-0">
                <p className="text-xs text-ink-muted hidden sm:block shrink-0">
                  {filteredStudents.length} resultado{filteredStudents.length !== 1 ? 's' : ''}
                </p>
                <div className="flex gap-2 flex-1 sm:flex-none justify-end flex-wrap">
                  {!isRecepcion && (
                    <button
                      onClick={async () => {
                        setLoadingRetiradas(true)
                        const data = await fetchInactiveStudents()
                        setRetiradasList(data)
                        setLoadingRetiradas(false)
                        setShowRetiradasModal(true)
                      }}
                      className="sd-btn sd-btn-ghost sd-btn-sm"
                    >
                      {loadingRetiradas ? <RefreshCw size={14} className="animate-spin" /> : <UserMinus size={14} />}
                      Ver retiradas
                    </button>
                  )}
                  <button
                    onClick={() => { setShowStudentListModal(false); setShowCobranzaReport(true) }}
                    className="sd-btn sd-btn-ghost sd-btn-sm"
                  >
                    <FileText size={14} /> Reporte cobranza
                  </button>
                  <button
                    onClick={() => setShowStudentListModal(false)}
                    className="hidden sm:inline-flex sd-btn sd-btn-secondary sd-btn-sm"
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
            onReactivate={reactivateCycle}
            onPause={(student) => {
              handlePauseStudent(student)
              setShowStudentDetail(null)
            }}
            onEdit={(student) => {
              setShowStudentDetail(null)
              setEditingStudent(student)
              setShowForm(true)
            }}
            onReprint={handleReprint}
            schoolName={settings?.school_name || settings?.name}
            settings={settings}
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
            onPaymentRegistered={(paymentData, student) => {
              const fullStudent = students.find(s => s.id === student?.id) || student
              setSelectedStudent({
                ...fullStudent,
                last_payment_date: paymentData.last_payment_date ?? fullStudent?.last_payment_date,
                next_payment_date: paymentData.next_payment_date ?? fullStudent?.next_payment_date,
                amount_paid: paymentData.newAmountPaid ?? fullStudent?.amount_paid,
                balance: paymentData.newBalance ?? fullStudent?.balance,
                payment_status: paymentData.paymentStatus ?? fullStudent?.payment_status
              })
              setLastPayment(paymentData)
              setShowTransferVerification(false)
              setShowReceipt(true)
              refreshIncome()
              fetchTransferRequests()
            }}
            getCourseById={getCourseById}
            enrichCourse={enrichCourse}
            students={students}
          />
        )}

        {/* Cierre Mensual */}
        {/* ── Modal: Pausa multi-día ───────────────────────────────────── */}
        {pauseDialog && (() => {
          const { student, course } = pauseDialog
          const classDays = course.classDays || []
          const today = new Date(); today.setHours(12,0,0,0)

          // Calcular clases que se saltarán
          const skipped = getNextNClassDays(today, classDays, pauseClasses)

          // Calcular nueva next_payment_date
          // Guardia: next_payment_date puede ser null en alumnas sin ciclo activo
          // (date-fns v4 lanza RangeError con Invalid Date → pantalla blanca)
          const hasNextPayment = !!student.next_payment_date
          let newNextPayment = hasNextPayment
            ? new Date(student.next_payment_date + 'T12:00:00')
            : new Date()   // fallback seguro — solo para render, no se usa si !hasNextPayment
          for (let i = 0; i < pauseClasses; i++) {
            newNextPayment = getNextClassDay(addDays(newNextPayment, 1), classDays)
          }

          const DAY_NAMES = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb']
          const fmtShort = (d) => `${DAY_NAMES[d.getDay()]} ${d.getDate()}/${d.getMonth()+1}`

          return (
            <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-[70]"
              onClick={() => setPauseDialog(null)}>
              <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-2xl w-full sm:max-w-sm overflow-hidden"
                onClick={e => e.stopPropagation()}>

                {/* Handle — solo mobile */}
                <div className="flex justify-center pt-3 pb-1 sm:hidden">
                  <div className="w-9 h-1 rounded-full bg-gray-200" />
                </div>

                {/* Header */}
                <div className="px-5 pt-3 sm:pt-5 pb-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-50 flex items-center justify-center shrink-0">
                    <Snowflake size={18} className="text-sky-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-[15px] leading-tight">Pausar clases</p>
                    <p className="text-xs text-gray-400 truncate mt-0.5">{student.name}</p>
                  </div>
                  <button onClick={() => setPauseDialog(null)}
                    className="w-8 h-8 rounded-full bg-gray-100 active:bg-gray-200 flex items-center justify-center shrink-0">
                    <X size={14} className="text-gray-400" />
                  </button>
                </div>

                {/* Contenido */}
                <div className="px-5 space-y-4">
                  {/* Stepper */}
                  <div className="bg-gray-50 rounded-2xl px-4 py-5">
                    <p className="text-[11px] text-gray-400 text-center mb-4 tracking-wide uppercase">¿Cuántas clases va a faltar?</p>
                    <div className="flex items-center justify-between">
                      <button onClick={() => setPauseClasses(c => Math.max(1, c - 1))}
                        className="w-14 h-14 rounded-2xl bg-white border border-gray-200 text-gray-500 text-2xl flex items-center justify-center active:scale-90 active:bg-gray-50 transition shadow-sm">−</button>
                      <div className="text-center">
                        <span className="text-5xl font-bold text-sky-600 leading-none tabular-nums">{pauseClasses}</span>
                        <p className="text-xs text-gray-400 mt-1.5">{pauseClasses === 1 ? 'clase' : 'clases'}</p>
                      </div>
                      <button onClick={() => setPauseClasses(c => Math.min(8, c + 1))}
                        className="w-14 h-14 rounded-2xl bg-white border border-gray-200 text-gray-500 text-2xl flex items-center justify-center active:scale-90 active:bg-gray-50 transition shadow-sm">+</button>
                    </div>
                  </div>

                  {/* Chips de días saltados */}
                  {skipped.length > 0 && (
                    <div>
                      <p className="text-[11px] text-gray-400 uppercase tracking-wide mb-2.5">Días que se salta</p>
                      <div className="flex flex-wrap gap-2">
                        {skipped.map((d, i) => (
                          <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 text-sky-600 text-xs font-medium">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 shrink-0" />
                            {fmtShort(d)}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Preview vencimiento */}
                  {hasNextPayment ? (
                    <div className="rounded-2xl overflow-hidden border border-gray-100 text-sm">
                      <div className="flex items-center justify-between px-4 py-3.5">
                        <span className="text-gray-400">Vencimiento actual</span>
                        <span className="text-gray-700 font-medium">{formatDate(student.next_payment_date)}</span>
                      </div>
                      <div className="flex items-center justify-between px-4 py-3.5 bg-sky-50">
                        <span className="font-semibold text-sky-700">Nuevo vencimiento</span>
                        <span className="font-bold text-sky-700">{formatDate(formatDateForInput(newNextPayment))}</span>
                      </div>
                      {skipped.length > 0 && (
                        <div className="px-4 py-2.5 bg-gray-50">
                          <span className="text-[11px] text-gray-400">↻ Se reactiva el {fmtShort(addDays(skipped[skipped.length - 1], 1))}</span>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="rounded-2xl bg-amber-50 border border-amber-100 px-4 py-3.5 text-center">
                      <p className="text-xs text-amber-700 leading-relaxed">Sin fecha de vencimiento activa.<br />La pausa se registrará igualmente.</p>
                    </div>
                  )}
                </div>

                {/* Footer — separado del contenido, padding propio garantizado */}
                <div className="px-5 pt-4 pb-5 mt-4 border-t border-gray-100 flex gap-3">
                  <button onClick={() => setPauseDialog(null)}
                    className="flex-1 h-12 rounded-2xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition font-medium">
                    Cancelar
                  </button>
                  <button onClick={handleConfirmPause}
                    className="flex-1 h-12 rounded-2xl bg-sky-600 text-white text-sm font-semibold hover:bg-sky-700 active:scale-[.98] transition flex items-center justify-center gap-2">
                    <Snowflake size={15} />
                    Confirmar
                  </button>
                </div>
              </div>
            </div>
          )
        })()}

        {/* Prompt: ¿Registrar cobro tras crear alumno nuevo? */}
        {newStudentPaymentPrompt && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[70] p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="w-12 h-12 rounded-full bg-[#fdf5f9] flex items-center justify-center">
                  <span className="text-2xl">✓</span>
                </div>
                <p className="font-bold text-gray-800 text-base">
                  {newStudentPaymentPrompt.name} fue registrada
                </p>
                <p className="text-sm text-gray-500">¿Deseas registrar el cobro ahora?</p>
              </div>
              <button
                onClick={() => {
                  const s = newStudentPaymentPrompt
                  setNewStudentPaymentPrompt(null)
                  setSelectedStudent(s)
                  setShowPaymentModal(true)
                }}
                className="w-full py-3 rounded-xl bg-[#7e2d55] text-white font-semibold text-sm hover:bg-[#6b2145] active:scale-[.98] transition"
              >
                Sí, registrar cobro
              </button>
              <button
                onClick={() => setNewStudentPaymentPrompt(null)}
                className="w-full py-2.5 rounded-xl border border-gray-200 text-sm text-gray-500 hover:bg-gray-50 transition"
              >
                No, más tarde
              </button>
            </div>
          </div>
        )}

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

        {/* Panel Contabilidad */}
        {showContabilidad && (
          <ContabilidadPanel
            settings={settings}
            onClose={() => setShowContabilidad(false)}
          />
        )}

        {/* Balance Alerts Modal */}
        {showBalanceAlerts && (
          <div className="fixed inset-0 bg-[#1a0010]/60 flex items-end sm:items-center justify-center sm:p-4 z-50" onClick={() => setShowBalanceAlerts(false)}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-lg max-h-[92svh] sm:max-h-[90vh] overflow-hidden flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} onClick={(e) => e.stopPropagation()}>
              <div className="bg-gradient-to-r from-orange-500 to-amber-500">
                <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
                  <div className="w-10 h-1 rounded-full bg-white/40" />
                </div>
                <div className="px-4 pb-4 pt-2 flex items-center justify-between">
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
                          title="Ver detalle">
                          <Eye size={14} />
                        </button>
                        {waLink && (
                          <a href={waLink} target="_blank" rel="noopener noreferrer"
                            className="p-1.5 rounded-lg bg-white border border-green-200 text-green-600 hover:bg-green-50 transition-all"
                            title="Enviar recordatorio por WhatsApp">
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
            <div className="fixed inset-0 bg-[#1a0010]/60 flex items-center justify-center p-4 z-[60]"
              onClick={() => setDetailBalanceStudent(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden"
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
                    {s.phone && <p className="text-sm text-gray-500 mt-0.5">📱 {s.phone}</p>}
                  </div>

                  {/* Representante (si menor) */}
                  {isMinor && (s.parent_name || s.payer_name) && (
                    <div className="border-t pt-3">
                      <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Representante</p>
                      <p className="font-semibold text-gray-800">{s.payer_name || s.parent_name}</p>
                      {(s.payer_cedula || s.parent_cedula) && (
                        <p className="text-sm text-gray-500 mt-0.5">CI: {s.payer_cedula || s.parent_cedula}</p>
                      )}
                      {waPhone && <p className="text-sm text-gray-500 mt-0.5">📱 {waPhone}</p>}
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

        {/* Modal: Advertencia de alumna duplicada */}
        {duplicateWarning.show && (
          <div className="fixed inset-0 bg-[#1a0010]/60 flex items-center justify-center p-4 z-[60]" onClick={() => setDuplicateWarning({ show: false, matches: [], pendingData: null })}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className={`px-5 py-4 border-b rounded-t-2xl flex items-center justify-between ${duplicateWarning.wouldBreakConstraint ? 'bg-red-50' : 'bg-amber-50'}`}>
                <div className="flex items-center gap-2">
                  <AlertCircle className={duplicateWarning.wouldBreakConstraint ? 'text-red-500' : 'text-amber-500'} size={18} />
                  <span className={`font-semibold text-sm ${duplicateWarning.wouldBreakConstraint ? 'text-red-700' : 'text-amber-700'}`}>
                    {duplicateWarning.wouldBreakConstraint ? 'Conflicto con alumna existente' : 'Posible duplicado'}
                  </span>
                </div>
                <button onClick={() => setDuplicateWarning({ show: false, matches: [], pendingData: null })} className="p-1.5 hover:bg-white/40 rounded-xl transition-colors">
                  <X size={16} className={duplicateWarning.wouldBreakConstraint ? 'text-red-500' : 'text-amber-500'} />
                </button>
              </div>
              <div className="p-5">
                <p className="text-sm text-gray-600 mb-3">
                  {duplicateWarning.wouldBreakConstraint
                    ? 'Ya hay una alumna activa con ese nombre en el mismo curso. No se puede guardar el cambio.'
                    : 'Ya existe una alumna con el mismo nombre o cédula:'}
                </p>
                <div className="space-y-2 mb-4">
                  {duplicateWarning.matches.map(s => {
                    const course = allCourses.find(c => (c.id || c.code) === s.course_id)
                    return (
                      <div key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border ${s.active ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${s.active ? 'bg-green-200 text-green-900' : 'bg-gray-200 text-gray-700'}`}>
                          {s.name?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm text-gray-800 truncate">{s.name}</p>
                          <p className={`text-xs ${s.active ? 'text-green-700' : 'text-gray-500'} truncate`}>{course?.name || s.course_id || '—'}{s.cedula ? ` · CI: ${s.cedula}` : ''}</p>
                        </div>
                        {s.active && (
                          <button
                            onClick={() => {
                              const studentObj = students.find(x => x.id === s.id)
                              if (studentObj) {
                                setDuplicateWarning({ show: false, matches: [], pendingData: null })
                                setShowForm(false)
                                setEditingStudent(null)
                                setShowStudentDetail(studentObj)
                              }
                            }}
                            className="text-[11px] px-2 py-1 rounded-lg bg-white border border-green-200 text-green-700 hover:bg-green-100 font-medium shrink-0"
                          >
                            Ver perfil
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>
                {!duplicateWarning.wouldBreakConstraint && (
                  <p className="text-xs text-gray-400 mb-4">¿Deseas registrarla de todas formas?</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setDuplicateWarning({ show: false, matches: [], pendingData: null })}
                    className="flex-1 py-2.5 border border-gray-200 text-gray-600 rounded-xl hover:bg-gray-50 transition-colors text-sm font-medium"
                  >
                    {duplicateWarning.wouldBreakConstraint ? 'Volver' : 'Cancelar'}
                  </button>
                  {/* "Registrar de todas formas" solo si NO rompería el constraint */}
                  {!duplicateWarning.wouldBreakConstraint && (
                    <button
                      onClick={() => handleStudentFormSubmit(duplicateWarning.pendingData, true)}
                      className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-white rounded-xl transition-colors text-sm font-semibold"
                    >
                      {duplicateWarning.isEditing ? 'Guardar de todas formas' : 'Registrar de todas formas'}
                    </button>
                  )}
                </div>
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

        {/* Modal: Alumnas Retiradas */}
        {showRetiradasModal && (
          <div className="fixed inset-0 bg-[#1a0010]/60 flex items-end sm:items-center justify-center sm:p-4 z-50" onClick={() => setShowRetiradasModal(false)}>
            <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-2xl max-h-[92svh] sm:max-h-[90vh] overflow-hidden flex flex-col" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} onClick={e => e.stopPropagation()}>
              <div className="border-b bg-orange-600 text-white">
                <div className="flex justify-center pt-2.5 pb-1 sm:hidden">
                  <div className="w-10 h-1 rounded-full bg-white/40" />
                </div>
                <div className="px-5 pb-4 pt-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserMinus size={18} />
                  <span className="font-bold">Alumnas retiradas</span>
                  <span className="bg-white/20 text-xs font-bold px-2 py-0.5 rounded-full">{retiradasList.length}</span>
                </div>
                <button onClick={() => setShowRetiradasModal(false)} className="p-2 hover:bg-white/20 rounded-xl transition-colors">
                  <X size={18} />
                </button>
                </div>
              </div>

              <div className="overflow-y-auto flex-1 p-3 sm:p-4 space-y-2">
                {retiradasList.length === 0 ? (
                  <div className="text-center py-10 text-gray-400">
                    <UserCheck size={36} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm">No hay alumnas retiradas</p>
                  </div>
                ) : retiradasList.map(s => {
                  const course = allCourses.find(c => (c.id || c.code) === s.course_id)
                  const withdrawnDate = s.withdrawn_at
                    ? new Date(s.withdrawn_at).toLocaleDateString('es-EC', { day: '2-digit', month: 'short', year: 'numeric' })
                    : null
                  const reasonLabels = { economico: 'Económico', horario: 'Horario', cambio_ciudad: 'Cambio de ciudad/país', salud: 'Salud', personal: 'Personal', otro: 'Otro' }
                  return (
                    <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-orange-50 transition-colors">
                      <div className="w-9 h-9 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
                        <span className="text-orange-600 font-bold text-sm">{s.name?.[0]?.toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm text-gray-800 truncate">{s.name}</p>
                        <p className="text-xs text-gray-500 truncate">{course?.name || s.course_id || '—'}</p>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          {withdrawnDate && <span className="text-xs text-gray-400">{withdrawnDate}</span>}
                          {s.withdrawn_reason && (
                            <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
                              {reasonLabels[s.withdrawn_reason] || s.withdrawn_reason}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={async () => {
                          if (!window.confirm(`¿Reactivar a ${s.name}?`)) return
                          const res = await reactivateStudent(s.id)
                          if (res.success) {
                            setRetiradasList(prev => prev.filter(x => x.id !== s.id))
                            fetchStudents()
                          }
                        }}
                        className="flex items-center gap-1 px-3 py-1.5 bg-white border border-green-200 text-green-700 rounded-xl hover:bg-green-50 hover:border-green-400 transition-all text-xs font-semibold shrink-0"
                      >
                        <UserCheck size={13} /> Reactivar
                      </button>
                    </div>
                  )
                })}
              </div>

              <div className="p-3 border-t bg-gray-50">
                <button onClick={() => setShowRetiradasModal(false)} className="w-full py-2 text-sm text-gray-500 hover:text-gray-700 font-medium transition-colors">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

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

        {/* Pantalla de ausencia */}
        <ScreenLock
          isLocked={isScreenLocked}
          onUnlock={() => setIsScreenLocked(false)}
          schoolName={settings.name || 'Studio Dancers'}
          securityPin={settings.security_pin}
        />

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-gray-400">
          💾 Datos en la nube • v4.8
        </div>
      </div>

      {/* Navegación inferior — solo mobile */}
      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        isAdmin={isAdmin}
        isRecepcion={isRecepcion}
        pendingTransfers={pendingTransfers}
        announcementCount={announcements.filter(a => a.active).length}
      />

      {/* Toast notification for new transfers */}
      {newTransferAlert && (
        <div
          className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[60] bg-green-50 shadow-2xl rounded-xl p-4 max-w-sm animate-bounce-in cursor-pointer"
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
