'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Building2, 
  Clock,
  MoreVertical,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Mail,
  Phone,
  Calendar,
  UserPlus
} from 'lucide-react'
import { UserEditModal } from '@/components/org-admin/user-edit-modal'
import { UnassignedUsers } from '@/components/org-admin/unassigned-users'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Mock data - will be replaced with real API calls
const mockUsers = [
  {
    id: 'user1',
    full_name: 'John Smith',
    email: 'john@company.com',
    phone: '+1 (555) 123-4567',
    role: 'CEO',
    area: {
      id: '1',
      name: 'Executive'
    },
    is_active: true,
    last_login: '2024-01-15T14:30:00Z',
    created_at: '2023-12-01T09:00:00Z',
    avatar_url: null
  },
  {
    id: 'user2',
    full_name: 'Sarah Johnson',
    email: 'sarah@company.com',
    phone: '+1 (555) 234-5678',
    role: 'Admin',
    area: {
      id: '2',
      name: 'Technology'
    },
    is_active: true,
    last_login: '2024-01-15T10:15:00Z',
    created_at: '2023-12-05T11:30:00Z',
    avatar_url: null
  },
  {
    id: 'user3',
    full_name: 'Michael Brown',
    email: 'michael@company.com',
    phone: '+1 (555) 345-6789',
    role: 'Manager',
    area: {
      id: '3',
      name: 'Finance'
    },
    is_active: true,
    last_login: '2024-01-14T16:45:00Z',
    created_at: '2023-12-10T08:15:00Z',
    avatar_url: null
  },
  {
    id: 'user4',
    full_name: 'Emily Davis',
    email: 'emily@company.com',
    phone: null,
    role: 'Manager',
    area: null,
    is_active: true,
    last_login: null,
    created_at: '2024-01-12T14:20:00Z',
    avatar_url: null
  },
  {
    id: 'user5',
    full_name: 'Alex Wilson',
    email: 'alex@company.com',
    phone: '+1 (555) 456-7890',
    role: 'Manager',
    area: null,
    is_active: false,
    last_login: '2024-01-10T09:30:00Z',
    created_at: '2024-01-08T13:45:00Z',
    avatar_url: null
  }
]

const roleColors = {
  CEO: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Admin: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Manager: 'bg-green-500/20 text-green-400 border-green-500/30'
}

export default function UsersManagementPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [areaFilter, setAreaFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [editingUser, setEditingUser] = useState<any>(null)
  const [showUnassignedModal, setShowUnassignedModal] = useState(false)

  // Filter users based on search and filters
  const filteredUsers = mockUsers.filter(user => {
    const matchesSearch = 
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.area?.name || '').toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesArea = areaFilter === 'all' || 
      (areaFilter === 'unassigned' && !user.area) ||
      (user.area?.id === areaFilter)
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active) ||
      (statusFilter === 'never-logged' && !user.last_login)

    return matchesSearch && matchesRole && matchesArea && matchesStatus
  })

  // Get unique areas for filter
  const areas = Array.from(new Set(mockUsers.map(u => u.area).filter(Boolean))).map((area: any) => area)

  const handleEditUser = (userId: string) => {
    const user = mockUsers.find(u => u.id === userId)
    if (user) {
      setEditingUser(user)
    }
  }

  const handleSaveUser = async (data: any) => {
    console.log('Save user:', data)
    // TODO: Implement actual API call
    // await saveUserAPI(editingUser.id, data)
    return Promise.resolve()
  }

  const handleAssignUsers = async (assignments: { userId: string; areaId: string }[]) => {
    console.log('Assign users:', assignments)
    // TODO: Implement actual API call
    // await assignUsersAPI(assignments)
    return Promise.resolve()
  }

  const handleDeleteUser = (userId: string) => {
    console.log('Delete user:', userId)
    // TODO: Implement delete with confirmation
  }

  const handleToggleStatus = (userId: string) => {
    console.log('Toggle status for user:', userId)
    // TODO: Implement status toggle
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleBulkAction = (action: string) => {
    console.log('Bulk action:', action, 'for users:', selectedUsers)
    // TODO: Implement bulk actions
    setSelectedUsers([])
  }

  const formatLastLogin = (lastLogin: string | null) => {
    if (!lastLogin) return 'Never'
    const date = new Date(lastLogin)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return '1 day ago'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString()
  }

  const unassignedCount = mockUsers.filter(u => !u.area).length
  const inactiveCount = mockUsers.filter(u => !u.is_active).length
  const neverLoggedCount = mockUsers.filter(u => !u.last_login).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Users Management</h1>
          <p className="text-gray-400 mt-2">
            Manage all users, their roles, area assignments, and access permissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="flex items-center gap-2"
            onClick={() => setShowUnassignedModal(true)}
            disabled={unassignedCount === 0}
          >
            <UserPlus className="h-4 w-4" />
            Manage Unassigned ({unassignedCount})
          </Button>
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Invite User
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Total Users</p>
                <p className="text-2xl font-bold text-white">{mockUsers.length}</p>
                <p className="text-xs text-green-400">
                  {mockUsers.filter(u => u.is_active).length} active
                </p>
              </div>
              <div className="p-3 bg-blue-500/20 rounded-lg">
                <Users className="h-6 w-6 text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Unassigned</p>
                <p className="text-2xl font-bold text-yellow-400">{unassignedCount}</p>
                <p className="text-xs text-gray-400">Need area assignment</p>
              </div>
              <div className="p-3 bg-yellow-500/20 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Inactive</p>
                <p className="text-2xl font-bold text-red-400">{inactiveCount}</p>
                <p className="text-xs text-gray-400">Disabled accounts</p>
              </div>
              <div className="p-3 bg-red-500/20 rounded-lg">
                <XCircle className="h-6 w-6 text-red-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Never Logged</p>
                <p className="text-2xl font-bold text-gray-400">{neverLoggedCount}</p>
                <p className="text-xs text-gray-400">Pending activation</p>
              </div>
              <div className="p-3 bg-gray-500/20 rounded-lg">
                <Clock className="h-6 w-6 text-gray-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users by name, email, or area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white/5 border-white/10"
              />
            </div>
            
            {/* Filters */}
            <div className="flex flex-wrap gap-2">
              <Select value={roleFilter} onValueChange={setRoleFilter}>
                <SelectTrigger className="w-32 bg-white/5 border-white/10">
                  <SelectValue placeholder="Role" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all">All Roles</SelectItem>
                  <SelectItem value="CEO">CEO</SelectItem>
                  <SelectItem value="Admin">Admin</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                </SelectContent>
              </Select>

              <Select value={areaFilter} onValueChange={setAreaFilter}>
                <SelectTrigger className="w-40 bg-white/5 border-white/10">
                  <SelectValue placeholder="Area" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all">All Areas</SelectItem>
                  <SelectItem value="unassigned">Unassigned</SelectItem>
                  {areas.map((area: any) => (
                    <SelectItem key={area.id} value={area.id}>{area.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-36 bg-white/5 border-white/10">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="never-logged">Never Logged</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedUsers.length > 0 && (
            <div className="mt-4 p-3 bg-primary/10 border border-primary/20 rounded-lg flex items-center justify-between">
              <span className="text-primary font-medium">
                {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
              </span>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('assign-area')}>
                  Assign Area
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('change-role')}>
                  Change Role
                </Button>
                <Button size="sm" variant="outline" onClick={() => handleBulkAction('toggle-status')}>
                  Toggle Status
                </Button>
                <Button size="sm" variant="outline" onClick={() => setSelectedUsers([])}>
                  Clear Selection
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Users Table */}
      <Card className="bg-gray-900/50 backdrop-blur-sm border border-white/10">
        <CardHeader>
          <CardTitle className="text-white">
            Users ({filteredUsers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 text-gray-300 font-medium">
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(filteredUsers.map(u => u.id))
                        } else {
                          setSelectedUsers([])
                        }
                      }}
                      className="rounded border-gray-600 bg-gray-700"
                    />
                  </th>
                  <th className="text-left py-3 text-gray-300 font-medium">User</th>
                  <th className="text-left py-3 text-gray-300 font-medium">Role</th>
                  <th className="text-left py-3 text-gray-300 font-medium">Area</th>
                  <th className="text-left py-3 text-gray-300 font-medium">Status</th>
                  <th className="text-left py-3 text-gray-300 font-medium">Last Login</th>
                  <th className="text-center py-3 text-gray-300 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-white/5">
                    <td className="py-3">
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user.id)}
                        onChange={() => toggleUserSelection(user.id)}
                        className="rounded border-gray-600 bg-gray-700"
                      />
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full flex items-center justify-center">
                          <span className="text-sm text-white font-medium">
                            {user.full_name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-white">{user.full_name}</div>
                          <div className="text-sm text-gray-400 flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {user.email}
                          </div>
                          {user.phone && (
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {user.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="py-3">
                      <Badge className={roleColors[user.role]}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="py-3">
                      {user.area ? (
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-blue-400" />
                          <span className="text-white">{user.area.name}</span>
                        </div>
                      ) : (
                        <Badge variant="outline" className="text-yellow-400 border-yellow-400/50">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Unassigned
                        </Badge>
                      )}
                    </td>
                    <td className="py-3">
                      <Badge variant={user.is_active ? "default" : "secondary"}>
                        {user.is_active ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </Badge>
                    </td>
                    <td className="py-3">
                      <div className="flex items-center gap-1 text-sm text-gray-400">
                        <Clock className="h-3 w-3" />
                        {formatLastLogin(user.last_login)}
                      </div>
                    </td>
                    <td className="py-3 text-center">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-gray-800 border-gray-700">
                          <DropdownMenuItem 
                            className="text-white hover:bg-gray-700"
                            onClick={() => handleEditUser(user.id)}
                          >
                            <Edit className="h-4 w-4 mr-2" />
                            Edit User
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-white hover:bg-gray-700"
                            onClick={() => handleToggleStatus(user.id)}
                          >
                            {user.is_active ? (
                              <>
                                <XCircle className="h-4 w-4 mr-2" />
                                Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-gray-700" />
                          <DropdownMenuItem 
                            className="text-red-400 hover:bg-red-500/10"
                            onClick={() => handleDeleteUser(user.id)}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete User
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Empty State */}
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No users found</h3>
              <p className="text-gray-400 mb-6">
                {searchQuery || roleFilter !== 'all' || areaFilter !== 'all' || statusFilter !== 'all'
                  ? "No users match your search criteria"
                  : "No users have been added to the system yet"
                }
              </p>
              {(!searchQuery && roleFilter === 'all' && areaFilter === 'all' && statusFilter === 'all') && (
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Invite First User
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <UserEditModal
        isOpen={!!editingUser}
        onClose={() => setEditingUser(null)}
        user={editingUser}
        onSave={handleSaveUser}
      />

      <UnassignedUsers
        isOpen={showUnassignedModal}
        onClose={() => setShowUnassignedModal(false)}
        onAssignUsers={handleAssignUsers}
      />
    </div>
  )
}