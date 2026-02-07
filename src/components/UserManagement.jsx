import { useState, useEffect } from 'react'
import { X, UserPlus, Trash2, Shield, User, Eye, Mail, Check, AlertCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { ROLES } from '../hooks/useAuth'

const ROLE_LABELS = {
  admin: { label: 'Administrador', color: 'bg-purple-100 text-purple-700', icon: Shield },
  receptionist: { label: 'Recepcionista', color: 'bg-blue-100 text-blue-700', icon: User },
  viewer: { label: 'Solo Lectura', color: 'bg-gray-100 text-gray-700', icon: Eye }
}

export default function UserManagement({ isOpen, onClose, currentUserId }) {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [newUser, setNewUser] = useState({
    email: '',
    displayName: '',
    role: 'receptionist'
  })

  useEffect(() => {
    if (isOpen) {
      fetchUsers()
    }
  }, [isOpen])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('*')
        .order('created_at', { ascending: true })

      if (error) throw error
      setUsers(data || [])
    } catch (err) {
      console.error('Error fetching users:', err)
      setError('Error al cargar usuarios')
    } finally {
      setLoading(false)
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!newUser.email || !newUser.displayName) {
      setError('Email y nombre son requeridos')
      return
    }

    try {
      // Verificar si ya existe
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('email', newUser.email.toLowerCase())
        .single()

      if (existing) {
        setError('Este email ya tiene acceso')
        return
      }

      // Agregar usuario
      const { error } = await supabase
        .from('user_roles')
        .insert({
          email: newUser.email.toLowerCase(),
          display_name: newUser.displayName,
          role: newUser.role,
          created_by: currentUserId
        })

      if (error) throw error

      setSuccess(`Usuario ${newUser.email} agregado. Debe crear su cuenta en la página de login.`)
      setNewUser({ email: '', displayName: '', role: 'receptionist' })
      setShowAddForm(false)
      fetchUsers()
    } catch (err) {
      console.error('Error adding user:', err)
      setError('Error al agregar usuario: ' + err.message)
    }
  }

  const handleChangeRole = async (userId, newRole) => {
    try {
      const { error } = await supabase
        .from('user_roles')
        .update({ role: newRole, updated_at: new Date().toISOString() })
        .eq('id', userId)

      if (error) throw error

      setUsers(users.map(u =>
        u.id === userId ? { ...u, role: newRole } : u
      ))
      setSuccess('Rol actualizado')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Error al cambiar rol')
    }
  }

  const handleDeleteUser = async (userId, email) => {
    if (!confirm(`¿Eliminar acceso de ${email}?`)) return

    try {
      const { error } = await supabase
        .from('user_roles')
        .delete()
        .eq('id', userId)

      if (error) throw error

      setUsers(users.filter(u => u.id !== userId))
      setSuccess('Usuario eliminado')
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      setError('Error al eliminar usuario')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield size={28} />
              <div>
                <h2 className="text-xl font-bold">Gestión de Usuarios</h2>
                <p className="text-purple-200 text-sm">Administra quién tiene acceso al sistema</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
              <AlertCircle size={18} />
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm flex items-center gap-2">
              <Check size={18} />
              {success}
            </div>
          )}

          {/* Botón agregar */}
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="mb-6 flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-xl font-medium transition-colors"
            >
              <UserPlus size={20} />
              Agregar Usuario
            </button>
          )}

          {/* Formulario agregar */}
          {showAddForm && (
            <form onSubmit={handleAddUser} className="mb-6 bg-purple-50 p-4 rounded-xl border border-purple-200">
              <h3 className="font-semibold text-purple-800 mb-4">Nuevo Usuario</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                    placeholder="usuario@email.com"
                    className="form-input"
                    required
                  />
                </div>
                <div>
                  <label className="form-label">Nombre</label>
                  <input
                    type="text"
                    value={newUser.displayName}
                    onChange={(e) => setNewUser({ ...newUser, displayName: e.target.value })}
                    placeholder="Nombre del usuario"
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="form-label">Rol</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="form-input"
                >
                  <option value="receptionist">Recepcionista - Operaciones diarias</option>
                  <option value="viewer">Solo Lectura - Ver información</option>
                  <option value="admin">Administrador - Acceso total</option>
                </select>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-xl font-medium"
                >
                  <Check size={18} />
                  Agregar
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {/* Lista de usuarios */}
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-700 mb-2">Usuarios con acceso ({users.length})</h3>

            {loading ? (
              <div className="text-center py-8">
                <div className="spinner mx-auto"></div>
                <p className="text-gray-500 mt-2">Cargando usuarios...</p>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay usuarios registrados
              </div>
            ) : (
              users.map((user) => {
                const roleInfo = ROLE_LABELS[user.role] || ROLE_LABELS.viewer
                const RoleIcon = roleInfo.icon
                const isCurrentUser = user.user_id === currentUserId

                return (
                  <div
                    key={user.id}
                    className={`bg-white border rounded-xl p-4 flex items-center justify-between ${
                      isCurrentUser ? 'border-purple-300 bg-purple-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${roleInfo.color}`}>
                        <RoleIcon size={20} />
                      </div>
                      <div>
                        <div className="font-medium text-gray-800">
                          {user.display_name || 'Sin nombre'}
                          {isCurrentUser && (
                            <span className="ml-2 text-xs bg-purple-200 text-purple-700 px-2 py-0.5 rounded-full">
                              Tú
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center gap-1">
                          <Mail size={14} />
                          {user.email}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <select
                        value={user.role}
                        onChange={(e) => handleChangeRole(user.id, e.target.value)}
                        disabled={isCurrentUser}
                        className={`text-sm px-3 py-2 rounded-lg border ${roleInfo.color} ${
                          isCurrentUser ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      >
                        <option value="admin">Admin</option>
                        <option value="receptionist">Recepcionista</option>
                        <option value="viewer">Solo Lectura</option>
                      </select>

                      {!isCurrentUser && (
                        <button
                          onClick={() => handleDeleteUser(user.id, user.email)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                          title="Eliminar acceso"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Leyenda de roles */}
          <div className="mt-6 p-4 bg-gray-50 rounded-xl">
            <h4 className="font-medium text-gray-700 mb-2">Niveles de acceso:</h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
              <div className="flex items-center gap-2">
                <Shield size={16} className="text-purple-600" />
                <span><strong>Admin:</strong> Acceso total</span>
              </div>
              <div className="flex items-center gap-2">
                <User size={16} className="text-blue-600" />
                <span><strong>Recepcionista:</strong> Sin eliminar/config</span>
              </div>
              <div className="flex items-center gap-2">
                <Eye size={16} className="text-gray-600" />
                <span><strong>Lectura:</strong> Solo ver</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
