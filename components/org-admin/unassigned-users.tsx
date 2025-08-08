'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
import { 
  Users, 
  AlertTriangle, 
  Building2, 
  UserPlus,
  Search,
  Filter,
  ArrowRight,
  CheckCircle,
  Clock,
  Mail
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface User {
  id: string
  full_name: string
  email: string
  role: 'CEO' | 'Admin' | 'Manager'
  is_active: boolean
  created_at: string
  last_login?: string
}

interface Area {
  id: string
  name: string
  is_active: boolean
  current_users: number
  max_capacity?: number
}

interface UnassignedUsersProps {
  isOpen: boolean
  onClose: () => void
  onAssignUsers: (assignments: { userId: string; areaId: string }[]) => Promise<void>
}

// Mock data - will be replaced with real API calls
const mockUnassignedUsers: User[] = [
  {
    id: 'user4',
    full_name: 'Emily Davis',
    email: 'emily@company.com',
    role: 'Manager',
    is_active: true,
    created_at: '2024-01-12T14:20:00Z',
    last_login: null
  },
  {
    id: 'user5',
    full_name: 'Alex Wilson',
    email: 'alex@company.com',
    role: 'Manager',
    is_active: false,
    created_at: '2024-01-08T13:45:00Z',
    last_login: '2024-01-10T09:30:00Z'
  },
  {
    id: 'user6',
    full_name: 'Maria Garcia',
    email: 'maria@company.com',
    role: 'Manager',
    is_active: true,
    created_at: '2024-01-14T11:15:00Z',
    last_login: null
  },
  {
    id: 'user7',
    full_name: 'James Rodriguez',
    email: 'james@company.com',
    role: 'Manager',
    is_active: true,
    created_at: '2024-01-16T16:30:00Z',
    last_login: '2024-01-16T16:35:00Z'
  }
]

const mockAreas: Area[] = [
  { id: '1', name: 'Sales & Marketing', is_active: true, current_users: 8, max_capacity: 12 },
  { id: '2', name: 'Technology', is_active: true, current_users: 15, max_capacity: 20 },
  { id: '3', name: 'Finance', is_active: true, current_users: 4, max_capacity: 8 },
  { id: '4', name: 'Human Resources', is_active: true, current_users: 3, max_capacity: 6 },
  { id: '5', name: 'Operations', is_active: true, current_users: 6, max_capacity: 10 }
]

const roleColors = {
  CEO: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Admin: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Manager: 'bg-green-500/20 text-green-400 border-green-500/30'
}

const assignmentReasons = [
  { id: 'skill_match', label: 'Skill Match', description: 'Based on user expertise and area needs' },
  { id: 'workload', label: 'Workload Balance', description: 'Distribute workload evenly across areas' },
  { id: 'manager_request', label: 'Manager Request', description: 'Requested by area manager' },
  { id: 'user_preference', label: 'User Preference', description: 'Based on user expressed interest' },
  { id: 'random', label: 'Random Assignment', description: 'Random distribution for balance' }
]

export function UnassignedUsers({ isOpen, onClose, onAssignUsers }: UnassignedUsersProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [assignments, setAssignments] = useState<{ [userId: string]: string }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)
  const [wizardData, setWizardData] = useState({
    assignmentReason: '',
    targetAreas: [] as string[],
    autoBalance: false
  })

  // Filter users based on search and status
  const filteredUsers = mockUnassignedUsers.filter(user => {
    const matchesSearch = 
      user.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active) ||
      (statusFilter === 'never-logged' && !user.last_login)

    return matchesSearch && matchesStatus
  })

  const toggleUserSelection = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handleSingleAssignment = (userId: string, areaId: string) => {
    setAssignments(prev => ({
      ...prev,
      [userId]: areaId
    }))
  }

  const handleBulkAssignment = (areaId: string) => {
    const newAssignments = { ...assignments }
    selectedUsers.forEach(userId => {
      newAssignments[userId] = areaId
    })
    setAssignments(newAssignments)
    setSelectedUsers([])
  }

  const handleWizardAssignment = () => {
    // Smart assignment algorithm based on wizard criteria
    const availableAreas = mockAreas.filter(area => 
      area.is_active && 
      (wizardData.targetAreas.length === 0 || wizardData.targetAreas.includes(area.id))
    )

    if (wizardData.autoBalance) {
      // Balance workload across areas
      const sortedAreas = availableAreas.sort((a, b) => a.current_users - b.current_users)
      const newAssignments = { ...assignments }
      
      selectedUsers.forEach((userId, index) => {
        const areaIndex = index % sortedAreas.length
        newAssignments[userId] = sortedAreas[areaIndex].id
      })
      
      setAssignments(newAssignments)
    } else {
      // Random assignment to selected areas
      const newAssignments = { ...assignments }
      selectedUsers.forEach(userId => {
        const randomArea = availableAreas[Math.floor(Math.random() * availableAreas.length)]
        newAssignments[userId] = randomArea.id
      })
      setAssignments(newAssignments)
    }
    
    setShowWizard(false)
    setSelectedUsers([])
  }

  const onSubmit = async () => {
    try {
      setIsSubmitting(true)
      const assignmentArray = Object.entries(assignments).map(([userId, areaId]) => ({
        userId,
        areaId
      }))
      await onAssignUsers(assignmentArray)
      onClose()
      setAssignments({})
      setSelectedUsers([])
    } catch (error) {
      console.error('Error assigning users:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getAreaById = (areaId: string) => mockAreas.find(a => a.id === areaId)
  const hasAssignments = Object.keys(assignments).length > 0
  const assignedCount = Object.keys(assignments).length

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-6xl max-h-[90vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-400" />
              Unassigned Users ({mockUnassignedUsers.length})
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Assign users to areas to organize your team structure
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col h-full overflow-hidden">
            {/* Search and Filters */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search unassigned users..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-gray-800 border-gray-600"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40 bg-gray-800 border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-600">
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="never-logged">Never Logged</SelectItem>
                </SelectContent>
              </Select>

              {selectedUsers.length > 0 && (
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setShowWizard(true)}>
                    <Filter className="h-4 w-4 mr-2" />
                    Smart Assign ({selectedUsers.length})
                  </Button>
                  <Select onValueChange={handleBulkAssignment}>
                    <SelectTrigger className="w-48 bg-gray-700 border-gray-600 h-9">
                      <SelectValue placeholder="Assign to..." />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {mockAreas.filter(a => a.is_active).map((area) => (
                        <SelectItem key={area.id} value={area.id} className="text-white">
                          <div className="flex items-center justify-between w-full">
                            <span>{area.name}</span>
                            <span className="text-xs text-gray-400">
                              ({area.current_users}/{area.max_capacity || '∞'})
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Users List */}
            <div className="flex-1 overflow-y-auto">
              <div className="space-y-3">
                {filteredUsers.map((user) => {
                  const isSelected = selectedUsers.includes(user.id)
                  const assignedAreaId = assignments[user.id]
                  const assignedArea = assignedAreaId ? getAreaById(assignedAreaId) : null
                  
                  return (
                    <div 
                      key={user.id} 
                      className={`p-4 rounded-lg border transition-all ${
                        isSelected 
                          ? 'bg-primary/10 border-primary/30' 
                          : assignedArea
                            ? 'bg-green-500/10 border-green-500/30'
                            : 'bg-gray-800 border-gray-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleUserSelection(user.id)}
                            className="rounded border-gray-600 bg-gray-700"
                          />
                          
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
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={roleColors[user.role]}>
                                {user.role}
                              </Badge>
                              <Badge variant={user.is_active ? "default" : "secondary"} className="text-xs">
                                {user.is_active ? 'Active' : 'Inactive'}
                              </Badge>
                              {!user.last_login && (
                                <Badge variant="outline" className="text-yellow-400 border-yellow-400/50 text-xs">
                                  Never logged
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3">
                          {assignedArea && (
                            <div className="flex items-center gap-2 text-green-400">
                              <ArrowRight className="h-4 w-4" />
                              <span className="text-sm font-medium">{assignedArea.name}</span>
                            </div>
                          )}
                          
                          <Select
                            value={assignedAreaId || ''}
                            onValueChange={(value) => handleSingleAssignment(user.id, value)}
                          >
                            <SelectTrigger className="w-48 bg-gray-700 border-gray-600">
                              <SelectValue placeholder="Select area..." />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-600">
                              {mockAreas.filter(a => a.is_active).map((area) => (
                                <SelectItem key={area.id} value={area.id} className="text-white">
                                  <div className="flex items-center justify-between w-full">
                                    <div className="flex items-center gap-2">
                                      <Building2 className="h-4 w-4" />
                                      {area.name}
                                    </div>
                                    <span className="text-xs text-gray-400 ml-2">
                                      {area.current_users}/{area.max_capacity || '∞'}
                                    </span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Empty State */}
              {filteredUsers.length === 0 && (
                <div className="text-center py-12">
                  <CheckCircle className="h-12 w-12 text-green-400 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">All users assigned!</h3>
                  <p className="text-gray-400">
                    {searchQuery || statusFilter !== 'all'
                      ? "No unassigned users match your filters"
                      : "Every user has been assigned to an area"
                    }
                  </p>
                </div>
              )}
            </div>

            {/* Assignment Summary */}
            {hasAssignments && (
              <Alert className="bg-blue-500/10 border-blue-500/20 mt-4">
                <CheckCircle className="h-4 w-4 text-blue-400" />
                <AlertDescription className="text-blue-200">
                  Ready to assign {assignedCount} user{assignedCount !== 1 ? 's' : ''} to their areas. 
                  Users will receive notifications about their new assignments.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="border-t border-gray-700 pt-4">
            <div className="flex items-center justify-between w-full">
              <div className="text-sm text-gray-400">
                {selectedUsers.length > 0 && (
                  <span>{selectedUsers.length} selected for bulk actions</span>
                )}
              </div>
              
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
                  Cancel
                </Button>
                <Button
                  onClick={onSubmit}
                  disabled={isSubmitting || !hasAssignments}
                  className="min-w-[140px]"
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Assigning...
                    </div>
                  ) : (
                    `Assign Users (${assignedCount})`
                  )}
                </Button>
              </div>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Smart Assignment Wizard */}
      <Dialog open={showWizard} onOpenChange={setShowWizard}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              Smart Assignment Wizard
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Configure automatic assignment rules for {selectedUsers.length} selected users
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Assignment Reason */}
            <div>
              <Label className="text-white">Assignment Strategy</Label>
              <p className="text-sm text-gray-400 mb-3">Choose the logic for user assignment</p>
              
              <div className="space-y-2">
                {assignmentReasons.map((reason) => (
                  <label key={reason.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-700 hover:border-gray-600 cursor-pointer">
                    <input
                      type="radio"
                      name="assignmentReason"
                      value={reason.id}
                      checked={wizardData.assignmentReason === reason.id}
                      onChange={(e) => setWizardData(prev => ({ ...prev, assignmentReason: e.target.value }))}
                      className="mt-1"
                    />
                    <div>
                      <div className="text-white font-medium">{reason.label}</div>
                      <div className="text-sm text-gray-400">{reason.description}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Target Areas */}
            <div>
              <Label className="text-white">Target Areas (Optional)</Label>
              <p className="text-sm text-gray-400 mb-3">Select specific areas or leave empty for all areas</p>
              
              <div className="grid grid-cols-2 gap-2">
                {mockAreas.filter(a => a.is_active).map((area) => (
                  <label key={area.id} className="flex items-center gap-2 p-2 rounded border border-gray-700 hover:border-gray-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={wizardData.targetAreas.includes(area.id)}
                      onChange={(e) => {
                        setWizardData(prev => ({
                          ...prev,
                          targetAreas: e.target.checked
                            ? [...prev.targetAreas, area.id]
                            : prev.targetAreas.filter(id => id !== area.id)
                        }))
                      }}
                    />
                    <span className="text-white text-sm">{area.name}</span>
                    <span className="text-xs text-gray-400">({area.current_users}/{area.max_capacity || '∞'})</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Auto Balance */}
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div>
                <div className="text-white font-medium">Auto Balance Workload</div>
                <div className="text-sm text-gray-400">Distribute users to balance team sizes</div>
              </div>
              <input
                type="checkbox"
                checked={wizardData.autoBalance}
                onChange={(e) => setWizardData(prev => ({ ...prev, autoBalance: e.target.checked }))}
                className="rounded border-gray-600 bg-gray-700"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowWizard(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleWizardAssignment}
              disabled={!wizardData.assignmentReason}
            >
              Apply Assignment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function Label({ children, className, ...props }: any) {
  return (
    <label className={`text-sm font-medium ${className || ''}`} {...props}>
      {children}
    </label>
  )
}