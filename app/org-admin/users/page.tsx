'use client'

import { useState } from 'react'
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
      <div className="container mx-auto px-4 py-8">
        <Alert className="bg-red-500/10 border-red-500/20 text-red-200">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load users: {error.message}
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  const unassignedCount = users.filter(u => !u.area).length
  const inactiveCount = users.filter(u => !u.is_active).length
  const neverLoggedCount = users.filter(u => !u.last_login).length

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Users Management</h1>
          <p className="text-white/60">Manage user accounts and access</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="bg-green-600 hover:bg-green-700">
          <UserPlus className="w-4 h-4 mr-2" />
          Create User
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Total Users</p>
                <p className="text-2xl font-bold text-white">{users.length}</p>
                <p className="text-xs text-green-400 mt-1">
                  {users.filter(u => u.is_active).length} active
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Unassigned</p>
                <p className="text-2xl font-bold text-white">{unassignedCount}</p>
                <p className="text-xs text-yellow-400 mt-1">No area assigned</p>
              </div>
              <Shield className="w-8 h-8 text-yellow-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Inactive</p>
                <p className="text-2xl font-bold text-white">{inactiveCount}</p>
                <p className="text-xs text-red-400 mt-1">Need attention</p>
              </div>
              <XCircle className="w-8 h-8 text-red-400" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5 border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/60">Never Logged</p>
                <p className="text-2xl font-bold text-white">{neverLoggedCount}</p>
                <p className="text-xs text-orange-400 mt-1">Pending first login</p>
              </div>
              <Mail className="w-8 h-8 text-orange-400" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="bg-white/5 border-white/10 mb-6">
        <CardContent className="p-6">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/50 w-4 h-4" />
              <Input
                placeholder="Search users by name, email, or area..."
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
              <option value="all">All Roles</option>
              <option value="CEO">CEO</option>
              <option value="Admin">Admin</option>
              <option value="Manager">Manager</option>
            </select>
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-white/5 border border-white/10 rounded text-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-white/5 border-white/10">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-white/50" />
              <span className="ml-2 text-white/60">Loading users...</span>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-white/10">
                  <TableHead className="text-white/80">User</TableHead>
                  <TableHead className="text-white/80">Role</TableHead>
                  <TableHead className="text-white/80">Area</TableHead>
                  <TableHead className="text-white/80">Status</TableHead>
                  <TableHead className="text-white/80">Last Login</TableHead>
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
                        <span className="text-yellow-400">Unassigned</span>
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
                          {user.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-white/60">
                      {user.last_login ? 
                        new Date(user.last_login).toLocaleDateString() : 
                        'Never'
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
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleToggleUserStatus(user)}
                            className="text-white hover:bg-slate-700"
                          >
                            {user.is_active ? (
                              <>
                                <XCircle className="w-4 h-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-slate-700" />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteUser(user)}
                            className="text-red-400 hover:bg-red-900/20"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete User
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
              <h3 className="text-lg font-semibold text-white mb-2">No users found</h3>
              <p className="text-white/60">
                {searchQuery ? 'No users match your search criteria.' : 'Create your first user to get started.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals would go here if they exist */}
      {/* <UserFormModal /> */}
    </div>
  )
}