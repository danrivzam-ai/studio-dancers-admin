import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

// Roles disponibles (para futuro uso)
export const ROLES = {
  ADMIN: 'admin',
  RECEPTIONIST: 'receptionist',
  VIEWER: 'viewer'
}

// Permisos de Admin (todos los permisos)
const ADMIN_PERMISSIONS = {
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
}

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState(null)

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

  // Cualquier usuario autenticado tiene todos los permisos (admin)
  const can = (permission) => {
    return !!user && ADMIN_PERMISSIONS[permission] === true
  }

  // Cualquier usuario autenticado es admin
  const isAdmin = () => {
    return !!user
  }

  return {
    user,
    session,
    userRole: user ? { role: ROLES.ADMIN, display_name: 'Administrador', email: user.email } : null,
    permissions: user ? ADMIN_PERMISSIONS : {},
    loading,
    isAuthenticated: !!user,
    isAdmin: isAdmin(),
    can,
    signIn,
    signUp,
    signOut,
    resetPassword,
    ROLES
  }
}
