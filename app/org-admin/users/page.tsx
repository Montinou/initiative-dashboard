'use client'

import { useState, useEffect } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  UserPlus,
  MoreVertical,
  CheckCircle,
  XCircle,
  Loader2,
  AlertCircle,
  Mail,
  Shield
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

// Fetcher for SWR
const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then(res => {
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
})

interface User {
  id: string
  full_name: string
  email: string
  role: string
  area?: {
    id: string
    name: string
  } | null
  is_active: boolean
  last_login?: string
  created_at: string
}

export default function UsersManagementPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [editingUser, setEditingUser] = useState<User | null>(null)
  const [locale, setLocale] = useState('es')

  useEffect(() => {
    const cookieLocale = document.cookie
      .split('; ')
      .find(row => row.startsWith('NEXT_LOCALE='))
      ?.split('=')[1]
    if (cookieLocale) {
      setLocale(cookieLocale)
    }
  }, [])

  // Fetch users data
  const { data: usersData, error, isLoading, mutate } = useSWR('/api/org-admin/users', fetcher)
  const users: User[] = usersData?.users || []

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.area?.name.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && user.is_active) ||
                         (statusFilter === 'inactive' && !user.is_active)
    
    return matchesSearch && matchesRole && matchesStatus
  })

  const handleSaveUser = async (data: any) => {
    try {
      const url = editingUser ? `/api/org-admin/users/${editingUser.id}` : '/api/org-admin/users'
      const method = editingUser ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      })
      
      if (!response.ok) throw new Error('Failed to save user')
      
      await mutate() // Refresh data
      setEditingUser(null)
      setShowCreateForm(false)
    } catch (error) {
      console.error('Error saving user:', error)
      throw error
    }
  }

  const handleDeleteUser = async (user: User) => {
    if (!confirm(`Are you sure you want to delete user ${user.full_name}?`)) return
    
    try {
      const response = await fetch(`/api/org-admin/users/${user.id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      
      if (!response.ok) throw new Error('Failed to delete user')
      
      await mutate() // Refresh data
    } catch (error) {
      console.error('Error deleting user:', error)
      alert('Failed to delete user')
    }
  }

  const handleToggleUserStatus = async (user: User) => {
    try {
      const response = await fetch(`/api/org-admin/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ is_active: !user.is_active })
      })
      
      if (!response.ok) throw new Error('Failed to update user status')
      
      await mutate() // Refresh data
    } catch (error) {
      console.error('Error updating user status:', error)
      alert('Failed to update user status')
    }
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
        <Alert className="bg-red-500/10 border-red-500/20 text-red-200 backdrop-blur-xl">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {locale === 'es' ? 'Error al cargar usuarios: ' : 'Failed to load users: '}{error.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const unassignedCount = users.filter(u => !u.area).length
  const inactiveCount = users.filter(u => !u.is_active).length
  const neverLoggedCount = users.filter(u => !u.last_login).length

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 p-6">
      <div className="space-y-6 backdrop-blur-xl">
        {/* Header */}
        <div className="backdrop-blur-xl bg-gray-900/50 border border-white/10 rounded-lg p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {locale === 'es' ? 'Gestión de Usuarios' : 'Users Management'}
              </h1>
              <p className="text-gray-400">
                {locale === 'es' ? 'Administra cuentas de usuario y accesos' : 'Manage user accounts and access'}
              </p>
            </div>
            <Button onClick={() => setShowCreateForm(true)} className="bg-primary hover:bg-primary/90">
              <UserPlus className="w-4 h-4 mr-2" />
              {locale === 'es' ? 'Crear Usuario' : 'Create User'}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="backdrop-blur-xl bg-gray-900/50 border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{locale === 'es' ? 'Total Usuarios' : 'Total Users'}</p>
                  <p className="text-2xl font-bold text-white">{users.length}</p>
                  <p className="text-xs text-green-400 mt-1">
                    {users.filter(u => u.is_active).length} {locale === 'es' ? 'activos' : 'active'}
                  </p>
                </div>
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <Users className="w-6 h-6 text-purple-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-gray-900/50 border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{locale === 'es' ? 'Sin Asignar' : 'Unassigned'}</p>
                  <p className="text-2xl font-bold text-white">{unassignedCount}</p>
                  <p className="text-xs text-yellow-400 mt-1">{locale === 'es' ? 'Sin área asignada' : 'No area assigned'}</p>
                </div>
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <Shield className="w-6 h-6 text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-gray-900/50 border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{locale === 'es' ? 'Inactivos' : 'Inactive'}</p>
                  <p className="text-2xl font-bold text-white">{inactiveCount}</p>
                  <p className="text-xs text-red-400 mt-1">{locale === 'es' ? 'Necesitan atención' : 'Need attention'}</p>
                </div>
                <div className="p-3 bg-red-500/20 rounded-lg">
                  <XCircle className="w-6 h-6 text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="backdrop-blur-xl bg-gray-900/50 border border-white/10">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400">{locale === 'es' ? 'Nunca Ingresaron' : 'Never Logged'}</p>
                  <p className="text-2xl font-bold text-white">{neverLoggedCount}</p>
                  <p className="text-xs text-orange-400 mt-1">{locale === 'es' ? 'Primer ingreso pendiente' : 'Pending first login'}</p>
                </div>
                <div className="p-3 bg-orange-500/20 rounded-lg">
                  <Mail className="w-6 h-6 text-orange-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="backdrop-blur-xl bg-gray-900/50 border border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[300px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
                <Input
                  placeholder={locale === 'es' 
                    ? 'Buscar usuarios por nombre, email o área...'
                    : 'Search users by name, email, or area...'
                  }
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10 text-white"
                />
              </div>
              <select 
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded text-white"
              >
                <option value="all">{locale === 'es' ? 'Todos los Roles' : 'All Roles'}</option>
                <option value="CEO">CEO</option>
                <option value="Admin">Admin</option>
                <option value="Manager">Manager</option>
              </select>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 bg-white/5 border border-white/10 rounded text-white"
              >
                <option value="all">{locale === 'es' ? 'Todos los Estados' : 'All Status'}</option>
                <option value="active">{locale === 'es' ? 'Activo' : 'Active'}</option>
                <option value="inactive">{locale === 'es' ? 'Inactivo' : 'Inactive'}</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="backdrop-blur-xl bg-gray-900/50 border border-white/10">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-white/50" />
                <span className="ml-2 text-gray-400">{locale === 'es' ? 'Cargando usuarios...' : 'Loading users...'}</span>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-white/10">
                    <TableHead className="text-white/80">{locale === 'es' ? 'Usuario' : 'User'}</TableHead>
                    <TableHead className="text-white/80">{locale === 'es' ? 'Rol' : 'Role'}</TableHead>
                    <TableHead className="text-white/80">{locale === 'es' ? 'Área' : 'Area'}</TableHead>
                    <TableHead className="text-white/80">{locale === 'es' ? 'Estado' : 'Status'}</TableHead>
                    <TableHead className="text-white/80">{locale === 'es' ? 'Último Ingreso' : 'Last Login'}</TableHead>
                    <TableHead className="text-white/80 w-12"></TableHead>
                  </TableRow>
                </TableHeader>
              <TableBody>
                {filteredUsers.map((user) => (
                  <TableRow key={user.id} className="border-white/10 hover:bg-white/5">
                    <TableCell>
                      <div>
                        <p className="text-white font-medium">{user.full_name}</p>
                        <p className="text-white/60 text-sm">{user.email}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant="outline" 
                        className={
                          user.role === 'CEO' ? "border-purple-400 text-purple-400" :
                          user.role === 'Admin' ? "border-blue-400 text-blue-400" :
                          "border-green-400 text-green-400"
                        }
                      >
                        {user.role}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-white">
                      {user.area ? user.area.name : 
                        <span className="text-yellow-400">{locale === 'es' ? 'Sin asignar' : 'Unassigned'}</span>
                      }
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {user.is_active ? (
                          <CheckCircle className="w-4 h-4 text-green-400" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-400" />
                        )}
                        <span className="text-white">
                          {user.is_active ? (locale === 'es' ? 'Activo' : 'Active') : (locale === 'es' ? 'Inactivo' : 'Inactive')}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-gray-400">
                      {user.last_login ? 
                        new Date(user.last_login).toLocaleDateString() : 
                        (locale === 'es' ? 'Nunca' : 'Never')
                      }
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="w-8 h-8 p-0">
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-slate-800 border-slate-700">
                          <DropdownMenuItem 
                            onClick={() => setEditingUser(user)}
                            className="text-white hover:bg-slate-700"
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            {locale === 'es' ? 'Editar Usuario' : 'Edit User'}
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleToggleUserStatus(user)}
                            className="text-white hover:bg-slate-700"
                          >
                            {user.is_active ? (
                              <>
                                <XCircle className="w-4 h-4 mr-2" />
                                {locale === 'es' ? 'Desactivar' : 'Deactivate'}
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                {locale === 'es' ? 'Activar' : 'Activate'}
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-700" />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-400 hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            {locale === 'es' ? 'Eliminar Usuario' : 'Delete User'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

            {!isLoading && filteredUsers.length === 0 && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-white/20 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">
                  {locale === 'es' ? 'No se encontraron usuarios' : 'No users found'}
                </h3>
                <p className="text-gray-400">
                  {searchQuery 
                    ? (locale === 'es' ? 'No hay usuarios que coincidan con tus criterios de búsqueda.' : 'No users match your search criteria.') 
                    : (locale === 'es' ? 'Crea tu primer usuario para comenzar.' : 'Create your first user to get started.')
                  }
                </p>
              </div>
            )}
        </CardContent>
      </Card>

        {/* Modals would go here if they exist */}
        {/* <UserFormModal /> */}
      </div>
    </div>
  )
}