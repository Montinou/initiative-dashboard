'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
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
  User, 
  Building2, 
  Shield,
  AlertTriangle,
  CheckCircle,
  Mail,
  Phone,
  Calendar,
  Key
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

// Form validation schema
const userFormSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters').max(100, 'Name too long'),
  email: z.string().email('Invalid email address'),
  phone: z.string().optional(),
  role: z.enum(['CEO', 'Admin', 'Manager']),
  area_id: z.string().optional(),
  is_active: z.boolean().default(true)
})

type UserFormData = z.infer<typeof userFormSchema>

interface User {
  id: string
  full_name: string
  email: string
  phone?: string
  role: 'CEO' | 'Admin' | 'Manager'
  area?: {
    id: string
    name: string
  }
  is_active: boolean
  last_login?: string
  created_at: string
}

interface UserEditModalProps {
  isOpen: boolean
  onClose: () => void
  user: User | null
  onSave: (data: UserFormData) => Promise<void>
}

// Mock data - will be replaced with real API calls
const mockAreas = [
  { id: '1', name: 'Executive', is_active: true },
  { id: '2', name: 'Technology', is_active: true },
  { id: '3', name: 'Sales & Marketing', is_active: true },
  { id: '4', name: 'Finance', is_active: true },
  { id: '5', name: 'Human Resources', is_active: true }
]

const roleHierarchy = {
  CEO: { level: 3, description: 'Full organizational access and control' },
  Admin: { level: 2, description: 'Administrative access to manage organization' },
  Manager: { level: 1, description: 'Area management and team oversight' }
}

const roleColors = {
  CEO: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  Admin: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  Manager: 'bg-green-500/20 text-green-400 border-green-500/30'
}

export function UserEditModal({ isOpen, onClose, user, onSave }: UserEditModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [impactPreview, setImpactPreview] = useState<{
    roleChange: boolean
    areaChange: boolean
    affectedInitiatives?: number
    affectedTeamMembers?: number
  } | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue,
    getValues
  } = useForm<UserFormData>({
    resolver: zodResolver(userFormSchema),
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      role: 'Manager',
      area_id: '',
      is_active: true
    }
  })

  const watchedRole = watch('role')
  const watchedAreaId = watch('area_id')

  // Reset form when user changes or modal opens
  useEffect(() => {
    if (isOpen && user) {
      reset({
        full_name: user.full_name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        area_id: user.area?.id || '',
        is_active: user.is_active
      })
    }
  }, [isOpen, user, reset])

  // Calculate impact preview when changes are made
  useEffect(() => {
    if (user && (watchedRole || watchedAreaId)) {
      const roleChange = watchedRole !== user.role
      const areaChange = watchedAreaId !== (user.area?.id || '')
      
      if (roleChange || areaChange) {
        // Mock calculation - in real app, this would be an API call
        setImpactPreview({
          roleChange,
          areaChange,
          affectedInitiatives: roleChange ? Math.floor(Math.random() * 5) + 1 : 0,
          affectedTeamMembers: areaChange ? Math.floor(Math.random() * 8) + 2 : 0
        })
      } else {
        setImpactPreview(null)
      }
    }
  }, [user, watchedRole, watchedAreaId])

  const onSubmit = async (data: UserFormData) => {
    try {
      setIsSubmitting(true)
      await onSave(data)
      onClose()
    } catch (error) {
      console.error('Error saving user:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      onClose()
      setImpactPreview(null)
    }
  }

  const selectedArea = mockAreas.find(a => a.id === watchedAreaId)
  const canChangeRole = user?.role !== 'CEO' // Prevent changing CEO role in this demo

  if (!user) return null

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-gray-900 border-gray-700 text-white max-w-3xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Edit User - {user.full_name}
          </DialogTitle>
          <DialogDescription className="text-gray-400">
            Update user information, role, and area assignment
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic-info" className="flex-1 overflow-hidden">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800">
            <TabsTrigger value="basic-info">Basic Information</TabsTrigger>
            <TabsTrigger value="role-access">Role & Access</TabsTrigger>
            <TabsTrigger value="activity">Activity & Audit</TabsTrigger>
          </TabsList>

          <form onSubmit={handleSubmit(onSubmit)} className="h-full overflow-y-auto max-h-[60vh]">
            {/* Basic Information Tab */}
            <TabsContent value="basic-info" className="space-y-6 mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name" className="text-white">Full Name *</Label>
                  <Input
                    id="full_name"
                    {...register('full_name')}
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                  {errors.full_name && (
                    <p className="text-red-400 text-sm mt-1">{errors.full_name.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="email" className="text-white">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                  {errors.email && (
                    <p className="text-red-400 text-sm mt-1">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="phone" className="text-white">Phone Number</Label>
                  <Input
                    id="phone"
                    {...register('phone')}
                    placeholder="+1 (555) 123-4567"
                    className="mt-1 bg-gray-800 border-gray-600 text-white"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-white">Account Status</Label>
                    <p className="text-sm text-gray-400">Control user access to the system</p>
                  </div>
                  <Switch
                    checked={getValues('is_active')}
                    onCheckedChange={(checked) => setValue('is_active', checked)}
                  />
                </div>
              </div>

              {/* User Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-gray-400">Joined</span>
                  </div>
                  <p className="text-sm text-white mt-1">
                    {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-green-400" />
                    <span className="text-sm text-gray-400">Last Login</span>
                  </div>
                  <p className="text-sm text-white mt-1">
                    {user.last_login 
                      ? new Date(user.last_login).toLocaleDateString()
                      : 'Never'
                    }
                  </p>
                </div>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-400" />
                    <span className="text-sm text-gray-400">Current Role</span>
                  </div>
                  <Badge className={`${roleColors[user.role]} mt-1`}>
                    {user.role}
                  </Badge>
                </div>
                <div className="p-3 bg-gray-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-blue-400" />
                    <span className="text-sm text-gray-400">Current Area</span>
                  </div>
                  <p className="text-sm text-white mt-1">
                    {user.area?.name || 'Unassigned'}
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* Role & Access Tab */}
            <TabsContent value="role-access" className="space-y-6 mt-6">
              {/* Role Selection */}
              <div>
                <Label className="text-white">User Role *</Label>
                <p className="text-sm text-gray-400 mb-3">
                  Role determines the user's permissions and access level
                </p>
                
                <Select 
                  value={getValues('role')} 
                  onValueChange={(value) => setValue('role', value as 'CEO' | 'Admin' | 'Manager')}
                  disabled={!canChangeRole}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    {Object.entries(roleHierarchy).map(([role, info]) => (
                      <SelectItem key={role} value={role} className="text-white">
                        <div className="flex items-center gap-3">
                          <Badge className={roleColors[role as keyof typeof roleColors]}>
                            {role}
                          </Badge>
                          <span>{info.description}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                {!canChangeRole && (
                  <p className="text-yellow-400 text-sm mt-1">
                    <AlertTriangle className="inline h-3 w-3 mr-1" />
                    CEO role cannot be changed from this interface
                  </p>
                )}
              </div>

              {/* Area Assignment */}
              <div>
                <Label className="text-white">Area Assignment</Label>
                <p className="text-sm text-gray-400 mb-3">
                  Assign user to an organizational area
                </p>
                
                <Select 
                  value={getValues('area_id') || 'none'} 
                  onValueChange={(value) => setValue('area_id', value === 'none' ? '' : value)}
                >
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Select an area (optional)" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600">
                    <SelectItem value="none" className="text-white">No area assigned</SelectItem>
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
                
                {selectedArea && (
                  <div className="mt-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-blue-400" />
                      <span className="text-sm text-blue-400">Will be assigned to: {selectedArea.name}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Permissions Preview */}
              <div className="bg-gray-800 p-4 rounded-lg">
                <h4 className="text-white font-medium mb-3">Permissions Preview</h4>
                <div className="space-y-2">
                  {watchedRole === 'CEO' && (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-400" />
                        <span className="text-white">Full organizational control</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-400" />
                        <span className="text-white">Manage all users and areas</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-400" />
                        <span className="text-white">Access to all reports and analytics</span>
                      </div>
                    </>
                  )}
                  {watchedRole === 'Admin' && (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-400" />
                        <span className="text-white">Manage organization structure</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-400" />
                        <span className="text-white">Invite and manage users</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-400" />
                        <span className="text-white">View organizational reports</span>
                      </div>
                    </>
                  )}
                  {watchedRole === 'Manager' && (
                    <>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-400" />
                        <span className="text-white">Manage assigned area objectives</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-400" />
                        <span className="text-white">View area team performance</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-3 w-3 text-green-400" />
                        <span className="text-white">Create and track initiatives</span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Activity & Audit Tab */}
            <TabsContent value="activity" className="space-y-6 mt-6">
              <div className="space-y-4">
                <h4 className="text-white font-medium">Recent Activity</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                    <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-white text-sm">Logged in to dashboard</p>
                      <p className="text-gray-400 text-xs">2 hours ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                    <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-white text-sm">Updated initiative "Q1 Goals"</p>
                      <p className="text-gray-400 text-xs">1 day ago</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-800 rounded-lg">
                    <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                    <div className="flex-1">
                      <p className="text-white text-sm">Profile updated by admin</p>
                      <p className="text-gray-400 text-xs">3 days ago</p>
                    </div>
                  </div>
                </div>

                <h4 className="text-white font-medium mt-6">Security</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Key className="h-4 w-4 text-blue-400" />
                      <span className="text-sm text-gray-400">Password</span>
                    </div>
                    <p className="text-sm text-white">Last changed 30 days ago</p>
                  </div>
                  <div className="p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="h-4 w-4 text-green-400" />
                      <span className="text-sm text-gray-400">2FA Status</span>
                    </div>
                    <Badge className="bg-green-500/20 text-green-400">Enabled</Badge>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Impact Preview */}
            {impactPreview && (
              <Alert className="bg-yellow-500/10 border-yellow-500/20 mt-6">
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
                <AlertDescription className="text-yellow-200">
                  <strong>Impact Preview:</strong>
                  {impactPreview.roleChange && (
                    <span> Role change will affect {impactPreview.affectedInitiatives} initiatives.</span>
                  )}
                  {impactPreview.areaChange && (
                    <span> Area change will affect {impactPreview.affectedTeamMembers} team collaborations.</span>
                  )}
                  {' '}User will be notified of changes.
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter className="mt-6 pt-6 border-t border-gray-700">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="min-w-[120px]"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </div>
                ) : (
                  'Update User'
                )}
              </Button>
            </DialogFooter>
          </form>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}