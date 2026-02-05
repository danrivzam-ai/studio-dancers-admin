import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Roles disponibles
export const ROLES = {
  ADMIN: 'admin',
  RECEPTIONIST: 'receptionist',
  VIEWER: 'viewer'
}

// Permisos por rol
export const PERMISSIONS = {
  // Admin puede todo
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
  // Recepcionista - operaciones diarias
  [ROLES.RECEPTIONIST]: {
    canDeleteStudents: false,
    canDeleteSales: false,
    canEditSettings: false,
    canViewPin: false,
    canManageUsers: false,
    canManageCourses: false,
    canManageProducts: false,
    canExport: true,
    canRegisterPayments: true,
    canAddStudents: true,
    canEditStudents: true,
    canSell: true,
    canViewHistory: true,
    canOpenCashRegister: true,
    canPauseStudents: true
  },
  // Solo lectura
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
  }
}

export function useAuth() {
  const [user, setUser] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [permissions, setPermissions] = useState(PERMISSIONS[ROLES.VIEWER])
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

  // Obtener rol del usuario
  const fetchUserRole = async (userId, userEmail) => {
    try {
      // Primero intentar por user_id
      let { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', userId)
        .single()

      // Si no existe por user_id, buscar por email
      if (error || !data) {
        const { data: dataByEmail, error: errorByEmail } = await supabase
          .from('user_roles')
          .select('*')
          .eq('email', userEmail)
          .single()

        if (!errorByEmail && dataByEmail) {
          // Actualizar el user_id si encontramos por email
          await supabase
            .from('user_roles')
            .update({ user_id: userId })
            .eq('email', userEmail)

          data = dataByEmail
        }
      }

      if (data) {
        setUserRole(data)
        setPermissions(PERMISSIONS[data.role] || PERMISSIONS[ROLES.VIEWER])
        return data
      } else {
        // Si no hay rol, verificar si es el primer usuario (hacer admin)
        const { count } = await supabase
          .from('user_roles')
          .select('*', { count: 'exact', head: true })

        if (count === 0) {
          // Primer usuario = admin
          const { data: newRole, error: insertError } = await supabase
            .from('user_roles')
            .insert({
              user_id: userId,
              email: userEmail,
              role: ROLES.ADMIN,
              display_name: 'Administrador'
            })
            .select()
            .single()

          if (!insertError && newRole) {
            setUserRole(newRole)
            setPermissions(PERMISSIONS[ROLES.ADMIN])
            return newRole
          }
        }

        // Usuario sin rol asignado - denegar acceso por defecto
        setUserRole({ role: 'unauthorized' })
        setPermissions({})
        return null
      }
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

        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await fetchUserRole(session.user.id, session.user.email)
        }
      } catch (err) {
        console.error('Auth error:', err)
      } finally {
        setLoading(false)
      }
    }

    getSession()

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event)
        setSession(session)
        setUser(session?.user ?? null)

        if (session?.user) {
          await fetchUserRole(session.user.id, session.user.email)
        } else {
          setUserRole(null)
          setPermissions(PERMISSIONS[ROLES.VIEWER])
        }

        setLoading(false)
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

      // Verificar si el usuario tiene rol asignado
      const role = await fetchUserRole(data.user.id, data.user.email)

      if (!role || role.role === 'unauthorized') {
        await supabase.auth.signOut()
        return {
          success: false,
          error: 'No tienes acceso autorizado. Contacta al administrador.'
        }
      }

      return { success: true, user: data.user, role }
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
      setUserRole(null)
      setPermissions(PERMISSIONS[ROLES.VIEWER])
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

  // Función para verificar un permiso específico
  const can = (permission) => {
    return permissions[permission] === true
  }

  // Función para verificar si es admin
  const isAdmin = () => {
    return userRole?.role === ROLES.ADMIN
  }

  return {
    user,
    session,
    userRole,
    permissions,
    loading,
    isAuthenticated: !!user && userRole?.role !== 'unauthorized',
    isAdmin: isAdmin(),
    can,
    signIn,
    signUp,
    signOut,
    resetPassword,
    ROLES,
    PERMISSIONS
  }
}
