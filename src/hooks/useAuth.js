import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Roles disponibles
export const ROLES = {
  ADMIN: 'admin',
  SUPERVISOR: 'supervisor',
  RECEPTIONIST: 'receptionist',
  VIEWER: 'viewer',
  CONTADOR: 'contador'
}

// Nombres visibles por rol (para la UI)
const ROLE_DISPLAY_NAMES = {
  [ROLES.ADMIN]: 'Administradora',
  [ROLES.SUPERVISOR]: 'Supervisora',
  [ROLES.RECEPTIONIST]: 'Recepcionista',
  [ROLES.VIEWER]: 'Solo lectura',
  [ROLES.CONTADOR]: 'Contadora'
}

// Matriz de permisos por rol — la fuente de verdad de qué puede hacer cada cuenta.
// IMPORTANTE: cualquier rol o cuenta que no aparezca aquí no recibe NINGÚN permiso
// (deny-by-default). Para dar acceso a alguien, se asigna su rol en `user_roles`.
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: {
    canDeleteStudents: true,
    canDeleteSales: true,
    canEditSettings: true,
    canViewPin: true,
    canManageUsers: true,
    canManageCourses: true,
    canManageProducts: true,
    canExport: true,
    canRegisterPayments: true,
    canAddStudents: true,
    canEditStudents: true,
    canSell: true,
    canViewHistory: true,
    canOpenCashRegister: true,
    canPauseStudents: true
  },
  // Supervisora: opera el día a día igual que recepción, además gestiona
  // catálogo (cursos/productos) y puede exportar reportes. No toca configuración
  // del sistema, usuarios ni datos sensibles (PIN), ni borra registros.
  [ROLES.SUPERVISOR]: {
    canDeleteStudents: false,
    canDeleteSales: false,
    canEditSettings: false,
    canViewPin: false,
    canManageUsers: false,
    canManageCourses: true,
    canManageProducts: true,
    canExport: true,
    canRegisterPayments: true,
    canAddStudents: true,
    canEditStudents: true,
    canSell: true,
    canViewHistory: true,
    canOpenCashRegister: true,
    canPauseStudents: true
  },
  // Recepcionista: operación diaria de mostrador — cobrar, registrar/editar
  // alumnas, vender, abrir caja, pausar. Nada de configuración, borrado,
  // gestión de catálogo/usuarios ni exportación.
  [ROLES.RECEPTIONIST]: {
    canDeleteStudents: false,
    canDeleteSales: false,
    canEditSettings: false,
    canViewPin: false,
    canManageUsers: false,
    canManageCourses: false,
    canManageProducts: false,
    canExport: false,
    canRegisterPayments: true,
    canAddStudents: true,
    canEditStudents: true,
    canSell: true,
    canViewHistory: true,
    canOpenCashRegister: true,
    canPauseStudents: true
  },
  // Solo lectura: puede ver el historial, no puede modificar nada.
  [ROLES.VIEWER]: {
    canDeleteStudents: false,
    canDeleteSales: false,
    canEditSettings: false,
    canViewPin: false,
    canManageUsers: false,
    canManageCourses: false,
    canManageProducts: false,
    canExport: false,
    canRegisterPayments: false,
    canAddStudents: false,
    canEditStudents: false,
    canSell: false,
    canViewHistory: true,
    canOpenCashRegister: false,
    canPauseStudents: false
  },
  // Contadora: usa su propio panel (ContadorDashboard). Solo necesita poder
  // exportar y ver historial dentro del panel principal si llega a entrar a él.
  [ROLES.CONTADOR]: {
    canDeleteStudents: false,
    canDeleteSales: false,
    canEditSettings: false,
    canViewPin: false,
    canManageUsers: false,
    canManageCourses: false,
    canManageProducts: false,
    canExport: true,
    canRegisterPayments: false,
    canAddStudents: false,
    canEditStudents: false,
    canSell: false,
    canViewHistory: true,
    canOpenCashRegister: false,
    canPauseStudents: false
  }
}

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)
  // null = rol aún no determinado (deny-by-default mientras carga o si la
  // cuenta no tiene fila en user_roles). NUNCA asumir admin por defecto.
  const [detectedRole, setDetectedRole] = useState(null)

  // Consultar rol del usuario en la tabla user_roles. Si la cuenta no tiene
  // una fila ahí (o hay un error de red/consulta), se trata como "sin rol":
  // queda autenticada pero sin ningún permiso, hasta que un admin le asigne uno.
  const fetchUserRole = async (userObj) => {
    if (!userObj?.email) return null
    try {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('email', userObj.email)
        .maybeSingle()
      return data?.role ?? null
    } catch (err) {
      console.error('Error fetching user role:', err)
      return null
    }
  }

  useEffect(() => {
    // Obtener sesión actual
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Error getting session:', error)
        }

        // Shadow users del portal de alumnas NO deben acceder al admin
        const isPortalUser = session?.user?.app_metadata?.portal_role === 'alumna'
        const validUser = isPortalUser ? null : session?.user ?? null
        setSession(isPortalUser ? null : session)
        setUser(validUser)

        // Liberar el loading inmediatamente — el rol se carga en paralelo sin bloquear
        setLoading(false)

        if (validUser) {
          fetchUserRole(validUser).then(role => setDetectedRole(role))
        }
      } catch (err) {
        console.error('Auth error:', err)
        setLoading(false)
      }
    }

    getSession()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // Shadow users del portal de alumnas NO deben acceder al admin
        const isPortalUser = session?.user?.app_metadata?.portal_role === 'alumna'
        const validUser = isPortalUser ? null : session?.user ?? null
        setSession(isPortalUser ? null : session)
        setUser(validUser)
        setLoading(false)

        if (validUser) {
          fetchUserRole(validUser).then(role => setDetectedRole(role))
        } else {
          setDetectedRole(null)
        }
      }
    )

    return () => {
      subscription?.unsubscribe()
    }
  }, [])

  const signIn = async (email, password) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      return { success: true, user: data.user }
    } catch (error) {
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const signUp = async (email, password, metadata = {}) => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: metadata
        }
      })

      if (error) throw error

      return { success: true, user: data.user }
    } catch (error) {
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const signOut = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error

      setUser(null)
      setSession(null)
      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    } finally {
      setLoading(false)
    }
  }

  const resetPassword = async (email) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })

      if (error) throw error

      return { success: true }
    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  // Permiso real según el rol detectado en user_roles. Si el rol no existe en
  // la matriz (cuenta sin rol asignado, o valor inesperado en la BD), no se
  // concede ningún permiso — deny-by-default.
  const can = (permission) => {
    if (!user || !detectedRole) return false
    return ROLE_PERMISSIONS[detectedRole]?.[permission] === true
  }

  // Solo es admin quien tiene explícitamente role = 'admin' en user_roles
  const isAdmin = () => {
    return !!user && detectedRole === ROLES.ADMIN
  }

  const isContador = user ? detectedRole === ROLES.CONTADOR : false

  return {
    user,
    session,
    userRole: user ? {
      role: detectedRole,
      display_name: detectedRole ? (ROLE_DISPLAY_NAMES[detectedRole] || detectedRole) : 'Sin rol asignado',
      email: user.email
    } : null,
    permissions: (user && detectedRole) ? (ROLE_PERMISSIONS[detectedRole] || {}) : {},
    loading,
    isAuthenticated: !!user,
    isAdmin: isAdmin(),
    isContador,
    can,
    signIn,
    signUp,
    signOut,
    resetPassword,
    ROLES
  }
}
