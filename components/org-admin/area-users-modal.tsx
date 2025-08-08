'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Users, 
  UserPlus, 
  UserMinus, 
  Search,
  Building2,
  ArrowRight,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface User {
  id: string
  full_name: string
  email: string
  role: 'CEO' | 'Admin' | 'Manager'
  area_id?: string
  area_name?: string
  is_active: boolean
}

interface Area {
  id: string
  name: string
  is_active: boolean
}

interface AreaUsersModalProps {
  isOpen: boolean
  onClose: () => void
  area: Area | null
  onSave: (assignments: { userId: string; newAreaId: string | null }[]) => Promise<void>
}

// Mock data - will be replaced with real API calls
const mockUsers: User[] = [
  {
    id: 'user1',
    full_name: 'John Smith',
    email: 'john@company.com',
    role: 'Manager',
    area_id: '1',
    area_name: 'Sales & Marketing',
    is_active: true
  },
  {
    id: 'user2',
    full_name: 'Sarah Johnson',
    email: 'sarah@company.com',
    role: 'Manager',
    area_id: '2',
    area_name: 'Technology',
    is_active: true
  },
  {
    id: 'user3',
    full_name: 'Mike Davis',
    email: 'mike@company.com',
    role: 'Manager',
    area_id: '1',
    area_name: 'Sales & Marketing',
    is_active: true
  },
  {
    id: 'user4',
    full_name: 'Emma Wilson',
    email: 'emma@company.com',
    role: 'Manager',
    area_id: null,
    area_name: null,
    is_active: true
  },
  {
    id: 'user5',
    full_name: 'Alex Brown',
    email: 'alex@company.com',
    role: 'Manager',
    area_id: null,
    area_name: null,
    is_active: true
  }
]

const mockAreas: Area[] = [
  { id: '1', name: 'Sales & Marketing', is_active: true },
  { id: '2', name: 'Technology', is_active: true },
  { id: '3', name: 'Human Resources', is_active: true },
  { id: '4', name: 'Finance', is_active: true }
]

export function AreaUsersModal({ isOpen, onClose, area, onSave }: AreaUsersModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [assignments, setAssignments] = useState<{ userId: string; newAreaId: string | null }[]>([])
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])

  // Get users for current area
  const areaUsers = mockUsers.filter(user => user.area_id === area?.id)
  
  // Get unassigned users
  const unassignedUsers = mockUsers.filter(user => !user.area_id)
  
  // Get all users for search
  const allUsers = mockUsers.filter(user =>
    user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setAssignments([])
      setSelectedUsers([])
      setSearchQuery('')
    }
  }, [isOpen])

  const handleAssignUser = (userId: string, newAreaId: string | null) => {
    setAssignments(prev => {
      const existing = prev.find(a => a.userId === userId)
      if (existing) {
        return prev.map(a => a.userId === userId ? { ...a, newAreaId } : a)
      } else {
        return [...prev, { userId, newAreaId }]
      }
    })
  }

  const handleBulkAssign = (targetAreaId: string | null) => {
    const newAssignments = selectedUsers.map(userId => ({ userId, newAreaId: targetAreaId }))
    setAssignments(prev => {
      const filtered = prev.filter(a => !selectedUsers.includes(a.userId))
      return [...filtered, ...newAssignments]
    })
    setSelectedUsers([])
  }

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const getEffectiveAreaId = (userId: string) => {
    const assignment = assignments.find(a => a.userId === userId)
    if (assignment) return assignment.newAreaId
    
    const user = mockUsers.find(u => u.id === userId)
    return user?.area_id || null
  }

  const getEffectiveAreaName = (areaId: string | null) => {
    if (!areaId) return 'Unassigned'
    return mockAreas.find(a => a.id === areaId)?.name || 'Unknown Area'
  }

  const onSubmit = async () => {
    try {
      setIsSubmitting(true)
      await onSave(assignments)
      onClose()
    } catch (error) {
      console.error('Error saving assignments:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const hasChanges = assignments.length > 0

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-4xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Manage Users - {area?.name}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Assign users to areas or manage unassigned users
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="current-users" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800">
            <TabsTrigger value="current-users">Current Users ({areaUsers.length})</TabsTrigger>
            <TabsTrigger value="unassigned">Unassigned ({unassignedUsers.length})</TabsTrigger>
            <TabsTrigger value="all-users">All Users ({allUsers.length})</TabsTrigger>
          </TabsList>

          {/* Current Users Tab */}
          <TabsContent value="current-users" className="space-y-4 overflow-y-auto max-h-96">
            {areaUsers.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No users assigned</h3>
                <p className="text-gray-400">This area doesn't have any users assigned yet.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {areaUsers.map((user) => {
                  const effectiveAreaId = getEffectiveAreaId(user.id)
                  const hasChanges = effectiveAreaId !== user.area_id
                  
                  return (
                    <div key={user.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full flex items-center justify-center">
                          <span className="text-sm text-white font-medium">
                            {user.full_name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-white">{user.full_name}</div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                        </div>
                        <Badge variant="outline">{user.role}</Badge>
                        {hasChanges && (
                          <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400">
                            Will move to {getEffectiveAreaName(effectiveAreaId)}
                          </Badge>
                        )}
                      </div>
                      
                      <Select
                        value={effectiveAreaId || 'unassigned'}
                        onValueChange={(value) => handleAssignUser(user.id, value === 'unassigned' ? null : value)}
                      >
                        <SelectTrigger className="w-48 bg-gray-700 border-gray-600">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          <SelectItem value="unassigned" className="text-white">
                            <div className="flex items-center gap-2">
                              <UserMinus className="h-4 w-4" />
                              Unassigned
                            </div>
                          </SelectItem>
                          {mockAreas.filter(a => a.is_active).map((area) => (
                            <SelectItem key={area.id} value={area.id} className="text-white">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                {area.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* Unassigned Users Tab */}
          <TabsContent value="unassigned" className="space-y-4 overflow-y-auto max-h-96">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-400">
                Users without area assignment - assign them to organize your team
              </p>
              {selectedUsers.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-white">{selectedUsers.length} selected</span>
                  <Select onValueChange={(value) => handleBulkAssign(value === 'unassigned' ? null : value)}>
                    <SelectTrigger className="w-40 bg-gray-700 border-gray-600 h-8">
                      <SelectValue placeholder="Assign to..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {mockAreas.filter(a => a.is_active).map((area) => (
                        <SelectItem key={area.id} value={area.id} className="text-white">
                          {area.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {unassignedUsers.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">All users assigned!</h3>
                <p className="text-gray-400">Every user has been assigned to an area.</p>
              </div>
            ) : (
              <div className="space-y-2">
                {unassignedUsers.map((user) => {
                  const effectiveAreaId = getEffectiveAreaId(user.id)
                  const hasChanges = effectiveAreaId !== user.area_id
                  const isSelected = selectedUsers.includes(user.id)
                  
                  return (
                    <div key={user.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                      isSelected ? 'bg-primary/10 border-primary/30' : 'bg-gray-800 border-gray-700'
                    }`}>
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleUserSelection(user.id)}
                          className="rounded border-gray-600 bg-gray-700"
                        />
                        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full flex items-center justify-center">
                          <span className="text-sm text-white font-medium">
                            {user.full_name.split(' ').map(n => n[0]).join('')}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium text-white">{user.full_name}</div>
                          <div className="text-sm text-gray-400">{user.email}</div>
                        </div>
                        <Badge variant="outline">{user.role}</Badge>
                        {hasChanges && (
                          <Badge variant="secondary" className="bg-green-500/20 text-green-400">
                            Will assign to {getEffectiveAreaName(effectiveAreaId)}
                          </Badge>
                        )}
                      </div>
                      
                      <Select
                        value={effectiveAreaId || 'unassigned'}
                        onValueChange={(value) => handleAssignUser(user.id, value === 'unassigned' ? null : value)}
                      >
                        <SelectTrigger className="w-48 bg-gray-700 border-gray-600">
                          <SelectValue placeholder="Assign to area..." />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          <SelectItem value="unassigned" className="text-white">
                            <div className="flex items-center gap-2">
                              <UserMinus className="h-4 w-4" />
                              Keep Unassigned
                            </div>
                          </SelectItem>
                          {mockAreas.filter(a => a.is_active).map((area) => (
                            <SelectItem key={area.id} value={area.id} className="text-white">
                              <div className="flex items-center gap-2">
                                <Building2 className="h-4 w-4" />
                                {area.name}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                })}
              </div>
            )}
          </TabsContent>

          {/* All Users Tab */}
          <TabsContent value="all-users" className="space-y-4 overflow-y-auto max-h-96">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-600"
              />
            </div>

            <div className="space-y-2">
              {allUsers.map((user) => {
                const effectiveAreaId = getEffectiveAreaId(user.id)
                const hasChanges = effectiveAreaId !== user.area_id
                
                return (
                  <div key={user.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full flex items-center justify-center">
                        <span className="text-sm text-white font-medium">
                          {user.full_name.split(' ').map(n => n[0]).join('')}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-white">{user.full_name}</div>
                        <div className="text-sm text-gray-400">{user.email}</div>
                      </div>
                      <Badge variant="outline">{user.role}</Badge>
                      <div className="text-sm text-gray-400">
                        {user.area_name || 'Unassigned'}
                        {hasChanges && (
                          <>
                            <ArrowRight className="inline h-3 w-3 mx-2" />
                            <span className="text-yellow-400">
                              {getEffectiveAreaName(effectiveAreaId)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <Select
                      value={effectiveAreaId || 'unassigned'}
                      onValueChange={(value) => handleAssignUser(user.id, value === 'unassigned' ? null : value)}
                    >
                      <SelectTrigger className="w-48 bg-gray-700 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="unassigned" className="text-white">
                          <div className="flex items-center gap-2">
                            <UserMinus className="h-4 w-4" />
                            Unassigned
                          </div>
                        </SelectItem>
                        {mockAreas.filter(a => a.is_active).map((area) => (
                          <SelectItem key={area.id} value={area.id} className="text-white">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4" />
                              {area.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )
              })}
            </div>
          </TabsContent>
        </Tabs>

        {/* Changes Summary */}
        {hasChanges && (
          <Alert className="bg-blue-500/10 border-blue-500/20">
            <AlertTriangle className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-200">
              {assignments.length} user assignment{assignments.length !== 1 ? 's' : ''} will be updated. 
              Users will be notified of their new area assignments.
            </AlertDescription>
          </Alert>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={isSubmitting || !hasChanges}
            className="min-w-[120px]"
          >
            {isSubmitting ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </div>
            ) : (
              `Save Changes (${assignments.length})`
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}